"""
VirtualBox VM Service.
Wraps VBoxManage CLI calls to clone, configure, start, stop, and delete VMs.
"""

import logging
import os
import random
import subprocess
import time
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.services.cloudinit_service import create_cloud_init_iso

settings = get_settings()
log = logging.getLogger(__name__)

# ─── Exceptions ───────────────────────────────────────────────────────────────

class GoldenMasterNotFoundError(Exception):
    pass

class GoldenMasterNotReadyError(Exception):
    """Raised when the golden master VDI exists but has no OS installed."""
    pass

class VBoxCommandError(Exception):
    def __init__(self, msg: str, stderr: str = ""):
        super().__init__(msg)
        self.stderr = stderr

class PortCollisionError(Exception):
    pass


# ─── Service ──────────────────────────────────────────────────────────────────

class VBoxVMService:
    """Thin wrapper around VBoxManage CLI for VM lifecycle management."""

    def __init__(self):
        self.vbox = settings.VBOXMANAGE_PATH
        self.vm_base_dir = settings.VM_BASE_DIR
        self.golden_master = settings.GOLDEN_MASTER_NAME

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _run_vbox(self, *args: str, timeout: int = 120) -> tuple[str, str, int]:
        """
        Execute VBoxManage with the given arguments.
        Returns (stdout, stderr, returncode).
        """
        cmd = [self.vbox, *args]
        log.debug("Running: %s", " ".join(cmd))
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            if result.returncode != 0:
                log.warning(
                    "VBoxManage exited %d\nSTDOUT: %s\nSTDERR: %s",
                    result.returncode, result.stdout, result.stderr,
                )
            return result.stdout, result.stderr, result.returncode
        except subprocess.TimeoutExpired:
            raise VBoxCommandError(f"VBoxManage timed out after {timeout}s", "")
        except FileNotFoundError:
            raise VBoxCommandError(
                f"VBoxManage not found at '{self.vbox}'. Is VirtualBox installed?", ""
            )

    def _golden_master_exists(self) -> bool:
        stdout, _, rc = self._run_vbox("showvminfo", self.golden_master, "--machinereadable")
        return rc == 0

    def _golden_master_vdi_size(self) -> int:
        """Return size in bytes of the golden master VDI file. 0 if not found."""
        vdi = Path(settings.GOLDEN_MASTER_DIR) / self.golden_master / f"{self.golden_master}.vdi"
        return vdi.stat().st_size if vdi.exists() else 0

    def _pick_ssh_port(self) -> int:
        """Return a random host port in the configured range that is not yet in use."""
        used = self._get_used_ssh_ports()
        available = [
            p for p in range(settings.SSH_PORT_MIN, settings.SSH_PORT_MAX + 1)
            if p not in used
        ]
        if not available:
            raise PortCollisionError("No free SSH ports available in the configured range")
        return random.choice(available)

    def _get_used_ssh_ports(self) -> set[int]:
        """Scan all registered VMs for NAT forwarding rules and collect host ports."""
        stdout, _, rc = self._run_vbox("list", "vms")
        if rc != 0:
            return set()

        ports: set[int] = set()
        for line in stdout.splitlines():
            # Lines look like: "vm-name" {uuid}
            parts = line.split('"')
            if len(parts) < 2:
                continue
            vm_name = parts[1]
            info_out, _, info_rc = self._run_vbox("showvminfo", vm_name, "--machinereadable")
            if info_rc != 0:
                continue
            for info_line in info_out.splitlines():
                # natpf1="guestssh,tcp,,22222,,22"
                if "natpf" in info_line and "guestssh" in info_line:
                    try:
                        rule = info_line.split('"')[1]  # guestssh,tcp,,22222,,22
                        host_port = int(rule.split(",")[3])
                        ports.add(host_port)
                    except (IndexError, ValueError):
                        pass
        return ports

    # ── Public API ────────────────────────────────────────────────────────────

    def clone_vm(
        self,
        vm_name: str,
        username: str,
        password: str,
        vcpu: int,
        ram_mb: int,
        disk_gb: int,
        distro: str = "zorin-lite",
    ) -> dict:
        """
        Full provisioning flow:
          1. Verify golden master exists
          2. Clone it
          3. Resize disk (if needed)
          4. Apply CPU / RAM
          5. Create + attach cloud-init ISO
          6. Configure NAT SSH port forwarding
          7. Boot headless
        Returns: {success, vm_path, ip_address, ssh_port, error}
        """
        if not self._golden_master_exists():
            raise GoldenMasterNotFoundError(
                f"Golden master '{self.golden_master}' not found in VirtualBox. "
                "Please run install_golden_master.ps1 then finalize_golden_master.ps1."
            )

        # Guard: refuse to clone an empty (un-installed) golden master
        vdi_size = self._golden_master_vdi_size()
        MINIMUM_INSTALLED_SIZE = 500 * 1024 * 1024  # 500 MB
        if vdi_size < MINIMUM_INSTALLED_SIZE:
            raise GoldenMasterNotReadyError(
                f"Golden master VDI is only {vdi_size // (1024*1024)} MB — Zorin OS is not installed. "
                "Run C:\\VMs\\install_golden_master.ps1, complete the installation, "
                "then run C:\\VMs\\finalize_golden_master.ps1."
            )

        # Ensure destination directory exists
        Path(self.vm_base_dir).mkdir(parents=True, exist_ok=True)

        # 1 ── Clone ───────────────────────────────────────────────────────────
        log.info("[%s] Checking for clean-template snapshot...", vm_name)
        stdout_snap, _, _ = self._run_vbox("snapshot", self.golden_master, "list")
        has_snapshot = "clean-template" in stdout_snap

        log.info("[%s] Cloning from %s (snapshot=%s) ...", vm_name, self.golden_master, has_snapshot)
        clone_args = [
            "clonevm", self.golden_master,
            "--name", vm_name,
            "--mode", "machine",
            "--options", "keepallmacs",
            "--basefolder", self.vm_base_dir,
            "--register"
        ]
        if has_snapshot:
            clone_args.extend(["--snapshot", "clean-template"])

        _, stderr, rc = self._run_vbox(*clone_args, timeout=300)
        if rc != 0:
            raise VBoxCommandError(f"clonevm failed for '{vm_name}'", stderr)

        vm_path = str(Path(self.vm_base_dir) / vm_name / f"{vm_name}.vbox")

        # 2 ── CPU / RAM + boot order ────────────────────────────────────────────
        log.info("[%s] Setting %d vCPU, %d MB RAM, boot=disk ...", vm_name, vcpu, ram_mb)
        _, stderr, rc = self._run_vbox(
            "modifyvm", vm_name,
            "--cpus", str(vcpu),
            "--memory", str(ram_mb),
            "--boot1", "disk",
            "--boot2", "none",
            "--boot3", "none",
            "--boot4", "none",
        )
        if rc != 0:
            raise VBoxCommandError(f"modifyvm (cpu/ram/boot) failed for '{vm_name}'", stderr)

        # 3 ── Resize disk if needed ────────────────────────────────────────────
        if disk_gb != 15:
            vdi_path = str(Path(self.vm_base_dir) / vm_name / f"{vm_name}.vdi")
            size_mb = disk_gb * 1024
            log.info("[%s] Resizing disk to %d MB ...", vm_name, size_mb)
            _, stderr, rc = self._run_vbox(
                "modifymedium", "disk", vdi_path, "--resize", str(size_mb)
            )
            if rc != 0:
                log.warning("Disk resize failed (non-fatal): %s", stderr)

        # 4 ── Cloud-init ISO ───────────────────────────────────────────────────
        log.info("[%s] Generating cloud-init ISO ...", vm_name)
        iso_path = create_cloud_init_iso(vm_name, username, password)

        # Ensure IDE controller exists and mark it as NOT bootable
        self._run_vbox(
            "storagectl", vm_name,
            "--name", "IDE Controller",
            "--add", "ide",
            "--controller", "PIIX4",
            "--bootable", "off",   # <-- prevent VirtualBox from ever booting the cloud-init ISO
        )

        # Detach any existing medium on IDE port 1 first (safe no-op if absent)
        self._run_vbox(
            "storageattach", vm_name,
            "--storagectl", "IDE Controller",
            "--port", "1",
            "--device", "0",
            "--type", "dvddrive",
            "--medium", "none",
        )

        _, stderr, rc = self._run_vbox(
            "storageattach", vm_name,
            "--storagectl", "IDE Controller",
            "--port", "1",
            "--device", "0",
            "--type", "dvddrive",
            "--medium", iso_path,
        )
        if rc != 0:
            raise VBoxCommandError(f"Failed to attach cloud-init ISO for '{vm_name}'", stderr)

        # 5 ── NAT + SSH port forwarding ────────────────────────────────────────
        ssh_port = self._pick_ssh_port()
        log.info("[%s] Forwarding host port %d → guest 22 ...", vm_name, ssh_port)
        _, stderr, rc = self._run_vbox(
            "modifyvm", vm_name,
            "--natpf1", f"guestssh,tcp,,{ssh_port},,22",
        )
        if rc != 0:
            raise VBoxCommandError(f"NAT port forwarding failed for '{vm_name}'", stderr)

        # 6 ── Boot VM ──────────────────────────────────────────────────────────
        log.info("[%s] Starting VM with type %s ...", vm_name, settings.VM_START_TYPE)
        _, stderr, rc = self._run_vbox("startvm", vm_name, "--type", settings.VM_START_TYPE)
        if rc != 0:
            raise VBoxCommandError(f"startvm failed for '{vm_name}'", stderr)

        # Allow VM to initialise before marking running
        time.sleep(5)

        return {
            "success": True,
            "vm_path": vm_path,
            "ip_address": "10.0.2.15",  # standard VirtualBox NAT internal IP
            "ssh_port": ssh_port,
            "error": None,
        }

    def get_vm_status(self, vm_name: str) -> str:
        """
        Query the live VirtualBox state for a VM.
        Returns one of: 'running', 'poweroff', 'saved', 'aborted', 'unknown'.
        """
        stdout, _, rc = self._run_vbox("showvminfo", vm_name, "--machinereadable")
        if rc != 0:
            return "unknown"
        for line in stdout.splitlines():
            if line.startswith("VMState="):
                return line.split("=", 1)[1].strip().strip('"')
        return "unknown"

    def start_vm(self, vm_name: str) -> bool:
        """Start a stopped / saved VM. Returns True on success."""
        _, _, rc = self._run_vbox("startvm", vm_name, "--type", settings.VM_START_TYPE)
        return rc == 0

    def stop_vm(self, vm_name: str) -> bool:
        """
        Gracefully shut down the VM via ACPI power button.
        Falls back to hard poweroff if ACPI fails.
        Returns True also if the VM is already powered off.
        """
        # If already off, treat as success
        current_state = self.get_vm_status(vm_name)
        if current_state in ("poweroff", "saved", "aborted", "unknown"):
            log.info("[%s] VM is already in state '%s', treating stop as success.", vm_name, current_state)
            return True

        _, _, rc = self._run_vbox("controlvm", vm_name, "acpipowerbutton")
        if rc == 0:
            return True
        log.warning("[%s] ACPI shutdown failed, forcing poweroff ...", vm_name)
        _, _, rc2 = self._run_vbox("controlvm", vm_name, "poweroff")
        return rc2 == 0

    def delete_vm(self, vm_name: str) -> bool:
        """Stop (if running) then unregister and delete all VM files."""
        state = self.get_vm_status(vm_name)
        if state == "running":
            self.stop_vm(vm_name)
            time.sleep(3)

        _, _, rc = self._run_vbox("unregistervm", vm_name, "--delete")
        return rc == 0

    def get_vm_log(self, vm_name: str, max_lines: int = 150) -> str:
        """Read the last max_lines of VBox.log for the VM."""
        log_path = Path(self.vm_base_dir) / vm_name / "Logs" / "VBox.log"
        if not log_path.exists():
            return "No log file found. VM might not have started yet."
        try:
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
                return "".join(lines[-max_lines:])
        except Exception as e:
            return f"Failed to read log file: {e}"

