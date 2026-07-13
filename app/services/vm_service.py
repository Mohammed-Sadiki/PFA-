"""
VirtualBox VM Service.
Wraps VBoxManage CLI calls to clone, configure, start, stop, and delete VMs.
"""

import logging
import os
import random
import subprocess
import time
import traceback
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.services.cloudinit_service import create_cloud_init_iso

settings = get_settings()
log = logging.getLogger(__name__)

# ─── Golden Master mapping ────────────────────────────────────────────────────

# Maps os_type (sent by the frontend) to the corresponding VirtualBox VM name.
OS_TYPE_TO_GOLDEN_MASTER: dict[str, str] = {
    "zorin":     "zorin-lite-master",
    "ubuntu":    "ubuntu-24-master",
    "windows11": "windows11-master",
}


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
        # Note: golden_master is now resolved dynamically per-clone from os_type.
        # settings.GOLDEN_MASTER_NAME is kept as the fallback default only.

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

    def _golden_master_exists(self, master_name: str) -> bool:
        stdout, _, rc = self._run_vbox("showvminfo", master_name, "--machinereadable")
        return rc == 0

    def _get_ide_controller_name(self, vm_name: str) -> str | None:
        """
        Return the name of the first IDE (PIIX3 / PIIX4 / ICH6) storage
        controller found on vm_name, or None if no IDE controller exists.

        Parses `showvminfo --machinereadable` lines such as:
            storagecontrollername0="IDE"
            storagecontrollertype0="PIIX4"
        """
        stdout, _, rc = self._run_vbox("showvminfo", vm_name, "--machinereadable")
        if rc != 0:
            return None

        # Build index → name and index → type maps
        names: dict[str, str] = {}   # "0" -> "IDE"
        types: dict[str, str] = {}   # "0" -> "PIIX4"
        for line in stdout.splitlines():
            line = line.strip()
            if line.startswith("storagecontrollername"):
                # storagecontrollername0="IDE"
                key, _, val = line.partition("=")
                idx = key.replace("storagecontrollername", "")
                names[idx] = val.strip().strip('"')
            elif line.startswith("storagecontrollertype"):
                # storagecontrollertype0="PIIX4"
                key, _, val = line.partition("=")
                idx = key.replace("storagecontrollertype", "")
                types[idx] = val.strip().strip('"')

        IDE_TYPES = {"PIIX3", "PIIX4", "ICH6"}
        for idx, ctrl_type in types.items():
            if ctrl_type in IDE_TYPES and idx in names:
                log.debug(
                    "[%s] Found existing IDE controller '%s' (type=%s)",
                    vm_name, names[idx], ctrl_type,
                )
                return names[idx]
        return None

    def _golden_master_vdi_size(self, master_name: str) -> int:
        """
        Return the logical size in bytes of the VDI attached to master_name.

        Strategy:
          1. Run `VBoxManage showvminfo <master_name> --machinereadable`
          2. Parse lines of the form:
               "SATA-0-0"="/path/to/disk.vdi"
               "IDE-0-0"="/path/to/disk.vdi"
          3. Take the first disk image path found (any controller, port 0, unit 0).
          4. Run `VBoxManage showmediuminfo disk <path>` and parse "Logical size:" line.
          5. Return 0 on any error so the caller's size-guard triggers GoldenMasterNotReadyError.
        """
        stdout, _, rc = self._run_vbox("showvminfo", master_name, "--machinereadable")
        if rc != 0:
            log.warning("[%s] _golden_master_vdi_size: showvminfo failed (rc=%d)", master_name, rc)
            return 0

        # Parse the machinereadable output for attached disk images.
        # Lines look like:  "SATA-0-0"="/absolute/path/to/disk.vdi"
        # or (older style): SATA-ImageUUID-0-0="..."
        vdi_path: str | None = None
        for line in stdout.splitlines():
            line = line.strip()
            # Match controller slot lines that carry a file path (not UUID lines)
            # e.g.  "SATA-0-0"="C:\Users\...\disk.vdi"
            #        IDE-0-0="C:\..."
            if "ImageUUID" in line or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key   = key.strip().strip('"')
            value = value.strip().strip('"')
            # Accept any controller (SATA, IDE, SCSI, NVMe) at any port/unit
            # whose value ends with a known disk extension
            if any(value.lower().endswith(ext) for ext in (".vdi", ".vmdk", ".vhd", ".qcow2")):
                vdi_path = value
                log.info("[%s] _golden_master_vdi_size: found disk at slot '%s': %s", master_name, key, vdi_path)
                break

        if not vdi_path:
            log.warning("[%s] _golden_master_vdi_size: no disk image found in showvminfo output", master_name)
            return 0

        # Ask VBoxManage for the medium info
        med_out, _, med_rc = self._run_vbox("showmediuminfo", "disk", vdi_path)
        if med_rc != 0:
            log.warning(
                "[%s] _golden_master_vdi_size: showmediuminfo failed (rc=%d) for path: %s",
                master_name, med_rc, vdi_path,
            )
            return 0

        log.debug("[%s] _golden_master_vdi_size: showmediuminfo output:\n%s", master_name, med_out)

        # VirtualBox uses different labels depending on the medium format:
        #   VDI / VHD  → "Capacity:      31382 MBytes"
        #   VMDK       → "Logical size:  20480 MBytes"
        # We try both, in priority order.
        SIZE_LABELS = ("capacity", "logical size")
        for line in med_out.splitlines():
            stripped = line.strip().lower()
            for label in SIZE_LABELS:
                if stripped.startswith(label):
                    # Line format: "Capacity:      31382 MBytes"
                    parts = line.split()
                    for part in parts:
                        if part.replace(".", "").isdigit():
                            try:
                                size_mb = float(part)
                                size_bytes = int(size_mb * 1024 * 1024)
                                log.info(
                                    "[%s] _golden_master_vdi_size: '%s' = %.0f MB (%d bytes)",
                                    master_name, label, size_mb, size_bytes,
                                )
                                return size_bytes
                            except ValueError:
                                pass

        log.warning(
            "[%s] _golden_master_vdi_size: could not parse capacity from showmediuminfo output:\n%s",
            master_name, med_out,
        )
        return 0

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
        os_type: str = "zorin",
    ) -> dict:
        """
        Full provisioning flow:
          1. Resolve the correct Golden Master from os_type
          2. Verify golden master exists
          3. Clone it
          4. Resize disk (if needed)
          5. Apply CPU / RAM
          6. Create + attach cloud-init ISO
          7. Configure NAT SSH port forwarding
          8. Boot headless
        Returns: {success, vm_path, ip_address, ssh_port, error}
        """
        log.info("[%s] ════════════════ PROVISIONING START (os_type=%s) ════════════════", vm_name, os_type)

        # ══ STEP 0 — Resolve Golden Master ══════════════════════════════════════
        log.info("[%s] [STEP 0] Resolving Golden Master for os_type='%s' ...", vm_name, os_type)
        try:
            golden_master = OS_TYPE_TO_GOLDEN_MASTER.get(os_type)
            if not golden_master:
                raise GoldenMasterNotFoundError(
                    f"Unknown os_type '{os_type}'. "
                    f"Valid values are: {list(OS_TYPE_TO_GOLDEN_MASTER.keys())}."
                )
            log.info("[%s] [STEP 0] OK — Golden Master resolved: '%s'", vm_name, golden_master)
        except Exception:
            log.error("[%s] [STEP 0] FAILED — Could not resolve Golden Master\n%s", vm_name, traceback.format_exc())
            raise

        # ══ STEP 1 — Verify Golden Master exists in VirtualBox ══════════════════
        log.info("[%s] [STEP 1] Verifying Golden Master '%s' in VirtualBox ...", vm_name, golden_master)
        try:
            if not self._golden_master_exists(golden_master):
                raise GoldenMasterNotFoundError(
                    f"Golden master '{golden_master}' not found in VirtualBox. "
                    "Please run install_golden_master.ps1 then finalize_golden_master.ps1."
                )
            vdi_size = self._golden_master_vdi_size(golden_master)
            MINIMUM_INSTALLED_SIZE = 500 * 1024 * 1024  # 500 MB
            log.info("[%s] [STEP 1] Golden Master VDI size: %d MB", vm_name, vdi_size // (1024 * 1024))
            if vdi_size < MINIMUM_INSTALLED_SIZE:
                raise GoldenMasterNotReadyError(
                    f"Golden master VDI is only {vdi_size // (1024*1024)} MB — OS is not installed. "
                    "Run C:\\VMs\\install_golden_master.ps1, complete the installation, "
                    "then run C:\\VMs\\finalize_golden_master.ps1."
                )
            log.info("[%s] [STEP 1] OK — Golden Master verified (%d MB)", vm_name, vdi_size // (1024 * 1024))
        except (GoldenMasterNotFoundError, GoldenMasterNotReadyError):
            log.error("[%s] [STEP 1] FAILED — Golden Master check\n%s", vm_name, traceback.format_exc())
            raise
        except Exception:
            log.error("[%s] [STEP 1] FAILED — Unexpected error during Golden Master check\n%s", vm_name, traceback.format_exc())
            raise

        # Ensure destination directory exists
        Path(self.vm_base_dir).mkdir(parents=True, exist_ok=True)

        # ══ STEP 2 — Clone VM ═══════════════════════════════════════════════════
        log.info("[%s] [STEP 2] Checking for 'clean-template' snapshot on '%s' ...", vm_name, golden_master)
        try:
            stdout_snap, _, _ = self._run_vbox("snapshot", golden_master, "list")
            has_snapshot = "clean-template" in stdout_snap
            log.info("[%s] [STEP 2] Snapshot 'clean-template' found: %s", vm_name, has_snapshot)

            clone_args = [
                "clonevm", golden_master,
                "--name", vm_name,
                "--mode", "machine",
                "--options", "keepallmacs",
                "--basefolder", self.vm_base_dir,
                "--register"
            ]
            if has_snapshot:
                clone_args.extend(["--snapshot", "clean-template"])

            log.info("[%s] [STEP 2] Running clonevm (timeout=300s) ...", vm_name)
            stdout_clone, stderr_clone, rc = self._run_vbox(*clone_args, timeout=300)
            log.info("[%s] [STEP 2] clonevm stdout: %s", vm_name, stdout_clone.strip() or "(empty)")
            log.info("[%s] [STEP 2] clonevm stderr: %s", vm_name, stderr_clone.strip() or "(empty)")
            log.info("[%s] [STEP 2] clonevm return code: %d", vm_name, rc)
            if rc != 0:
                raise VBoxCommandError(f"clonevm failed for '{vm_name}' (rc={rc})", stderr_clone)
            log.info("[%s] [STEP 2] OK — VM cloned successfully", vm_name)
        except Exception:
            log.error("[%s] [STEP 2] FAILED — Clone VM\n%s", vm_name, traceback.format_exc())
            raise

        vm_path = str(Path(self.vm_base_dir) / vm_name / f"{vm_name}.vbox")
        log.info("[%s] [STEP 2] Expected .vbox path: %s", vm_name, vm_path)

        # ══ STEP 3 — CPU / RAM / Boot order ═════════════════════════════════════
        # After clonevm, VirtualBox may hold an internal write lock on the new VM
        # for a short period.  We wait until the VM is unlocked before calling
        # modifyvm, retrying up to 3 times with a 3-second back-off.
        log.info("[%s] [STEP 3] Waiting for VM lock to release after clone ...", vm_name)
        _MAX_LOCK_RETRIES = 3
        _LOCK_WAIT_SEC    = 3
        for _attempt in range(1, _MAX_LOCK_RETRIES + 2):  # +2 = final raise pass
            stdout_mod, stderr_mod, rc = self._run_vbox(
                "modifyvm", vm_name,
                "--cpus",  str(vcpu),
                "--memory", str(ram_mb),
                "--boot1", "disk",
                "--boot2", "none",
                "--boot3", "none",
                "--boot4", "none",
            )
            log.info("[%s] [STEP 3] modifyvm attempt %d — rc=%d | stderr: %s",
                     vm_name, _attempt, rc, stderr_mod.strip() or "(empty)")
            if rc == 0:
                log.info("[%s] [STEP 3] OK — CPU/RAM/boot configured", vm_name)
                break
            locked = "already locked" in stderr_mod or "being unlocked" in stderr_mod
            if locked and _attempt <= _MAX_LOCK_RETRIES:
                log.warning("[%s] [STEP 3] VM still locked — waiting %ds before retry %d/%d ...",
                            vm_name, _LOCK_WAIT_SEC, _attempt, _MAX_LOCK_RETRIES)
                time.sleep(_LOCK_WAIT_SEC)
            else:
                raise VBoxCommandError(
                    f"modifyvm (cpu/ram/boot) failed for '{vm_name}' (rc={rc})", stderr_mod
                )


        # ══ STEP 4 — Resize disk (if needed) ════════════════════════════════════
        if disk_gb != 15:
            vdi_path = str(Path(self.vm_base_dir) / vm_name / f"{vm_name}.vdi")
            size_mb = disk_gb * 1024
            log.info("[%s] [STEP 4] Resizing disk to %d MB (vdi=%s) ...", vm_name, size_mb, vdi_path)
            try:
                stdout_rsz, stderr_rsz, rc = self._run_vbox(
                    "modifymedium", "disk", vdi_path, "--resize", str(size_mb)
                )
                log.info("[%s] [STEP 4] modifymedium stdout: %s", vm_name, stdout_rsz.strip() or "(empty)")
                log.info("[%s] [STEP 4] modifymedium stderr: %s", vm_name, stderr_rsz.strip() or "(empty)")
                log.info("[%s] [STEP 4] modifymedium return code: %d", vm_name, rc)
                if rc != 0:
                    log.warning("[%s] [STEP 4] WARNING — Disk resize failed (non-fatal, continuing)\n%s", vm_name, traceback.format_exc())
                else:
                    log.info("[%s] [STEP 4] OK — Disk resized to %d MB", vm_name, size_mb)
            except Exception:
                log.warning("[%s] [STEP 4] WARNING — Disk resize exception (non-fatal, continuing)\n%s", vm_name, traceback.format_exc())
        else:
            log.info("[%s] [STEP 4] SKIPPED — disk_gb=%d == default (15), no resize needed", vm_name, disk_gb)

        # ══ STEP 5 — Generate cloud-init ISO ════════════════════════════════════
        log.info("[%s] [STEP 5] Generating cloud-init ISO (username=%s) ...", vm_name, username)
        try:
            iso_path = create_cloud_init_iso(vm_name, username, password)
            log.info("[%s] [STEP 5] OK — ISO generated: %s", vm_name, iso_path)
        except Exception:
            log.error("[%s] [STEP 5] FAILED — cloud-init ISO generation\n%s", vm_name, traceback.format_exc())
            raise

        # ══ STEP 6 — Attach cloud-init ISO ══════════════════════════════════════
        log.info("[%s] [STEP 6] Resolving IDE controller name on cloned VM ...", vm_name)
        try:
            # ── 6a. Detect the IDE controller name inherited from the Golden Master ──
            ide_controller_name = self._get_ide_controller_name(vm_name)

            if ide_controller_name:
                log.info(
                    "[%s] [STEP 6] Found existing IDE controller: '%s' — no storagectl needed",
                    vm_name, ide_controller_name,
                )
            else:
                # No IDE controller exists yet on this VM — create one now.
                ide_controller_name = "IDE Controller"
                log.info(
                    "[%s] [STEP 6] No IDE controller found — creating '%s' ...",
                    vm_name, ide_controller_name,
                )
                stdout_ctl, stderr_ctl, rc_ctl = self._run_vbox(
                    "storagectl", vm_name,
                    "--name",       ide_controller_name,
                    "--add",        "ide",
                    "--controller", "PIIX4",
                    "--bootable",   "off",
                )
                log.info(
                    "[%s] [STEP 6] storagectl create rc=%d | stderr: %s",
                    vm_name, rc_ctl, stderr_ctl.strip() or "(empty)",
                )
                if rc_ctl != 0:
                    raise VBoxCommandError(
                        f"storagectl: failed to create IDE controller for '{vm_name}' (rc={rc_ctl})",
                        stderr_ctl,
                    )

            # ── 6b. Detach any existing medium on port 1, device 0 (safe no-op) ──
            log.info(
                "[%s] [STEP 6] Detaching any existing medium on %s:1:0 ...",
                vm_name, ide_controller_name,
            )
            _, stderr_det, rc_det = self._run_vbox(
                "storageattach", vm_name,
                "--storagectl", ide_controller_name,
                "--port",   "1",
                "--device", "0",
                "--type",   "dvddrive",
                "--medium", "none",
            )
            log.info(
                "[%s] [STEP 6] detach rc=%d | stderr: %s",
                vm_name, rc_det, stderr_det.strip() or "(empty)",
            )

            # ── 6c. Attach the cloud-init ISO ─────────────────────────────────────
            log.info(
                "[%s] [STEP 6] Attaching ISO to %s:1:0 — %s",
                vm_name, ide_controller_name, iso_path,
            )
            _, stderr_att, rc_att = self._run_vbox(
                "storageattach", vm_name,
                "--storagectl", ide_controller_name,
                "--port",   "1",
                "--device", "0",
                "--type",   "dvddrive",
                "--medium", iso_path,
            )
            log.info(
                "[%s] [STEP 6] attach rc=%d | stderr: %s",
                vm_name, rc_att, stderr_att.strip() or "(empty)",
            )
            if rc_att != 0:
                raise VBoxCommandError(
                    f"Failed to attach cloud-init ISO for '{vm_name}' (rc={rc_att})",
                    stderr_att,
                )
            log.info("[%s] [STEP 6] OK — ISO attached at %s:1:0", vm_name, ide_controller_name)

        except Exception:
            log.error("[%s] [STEP 6] FAILED — ISO attachment\n%s", vm_name, traceback.format_exc())
            raise


        # ══ STEP 7 — NAT + SSH port forwarding ══════════════════════════════════
        log.info("[%s] [STEP 7] Picking SSH port and configuring NAT forwarding ...", vm_name)
        try:
            ssh_port = self._pick_ssh_port()
            log.info("[%s] [STEP 7] Selected SSH port: %d", vm_name, ssh_port)
            stdout_nat, stderr_nat, rc_nat = self._run_vbox(
                "modifyvm", vm_name,
                "--natpf1", f"guestssh,tcp,,{ssh_port},,22",
            )
            log.info("[%s] [STEP 7] modifyvm (natpf1) rc=%d | stderr: %s", vm_name, rc_nat, stderr_nat.strip() or "(empty)")
            if rc_nat != 0:
                raise VBoxCommandError(f"NAT port forwarding failed for '{vm_name}' (rc={rc_nat})", stderr_nat)
            log.info("[%s] [STEP 7] OK — NAT rule: host:%d → guest:22", vm_name, ssh_port)
        except Exception:
            log.error("[%s] [STEP 7] FAILED — NAT/SSH configuration\n%s", vm_name, traceback.format_exc())
            raise

        # ══ STEP 8 — Start VM ════════════════════════════════════════════════════
        log.info("[%s] [STEP 8] Starting VM (type=%s) ...", vm_name, settings.VM_START_TYPE)
        try:
            stdout_start, stderr_start, rc_start = self._run_vbox(
                "startvm", vm_name, "--type", settings.VM_START_TYPE
            )
            log.info("[%s] [STEP 8] startvm stdout: %s", vm_name, stdout_start.strip() or "(empty)")
            log.info("[%s] [STEP 8] startvm stderr: %s", vm_name, stderr_start.strip() or "(empty)")
            log.info("[%s] [STEP 8] startvm return code: %d", vm_name, rc_start)
            if rc_start != 0:
                raise VBoxCommandError(f"startvm failed for '{vm_name}' (rc={rc_start})", stderr_start)
            log.info("[%s] [STEP 8] OK — VM started", vm_name)
        except Exception:
            log.error("[%s] [STEP 8] FAILED — VM start\n%s", vm_name, traceback.format_exc())
            raise

        # Allow VM to initialise before marking running
        time.sleep(5)

        log.info("[%s] ════════════════ PROVISIONING COMPLETE (ssh_port=%d) ═══════════════", vm_name, ssh_port)
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
        Falls back to hard poweroff if the VM does not stop within the timeout.
        Returns True if the VM is successfully stopped.
        """
        # If already off, treat as success
        current_state = self.get_vm_status(vm_name)
        if current_state in ("poweroff", "saved", "aborted", "unknown"):
            log.info("[%s] VM is already in state '%s', treating stop as success.", vm_name, current_state)
            return True

        # 1. Try graceful ACPI shutdown
        log.info("[%s] Sending ACPI power button event...", vm_name)
        _, _, rc = self._run_vbox("controlvm", vm_name, "acpipowerbutton")
        
        if rc == 0:
            # Wait up to 10 seconds for the VM to power off
            for _ in range(10):
                time.sleep(1)
                if self.get_vm_status(vm_name) in ("poweroff", "saved", "aborted"):
                    log.info("[%s] VM stopped gracefully via ACPI.", vm_name)
                    return True

        # 2. If still running, force poweroff
        log.warning("[%s] ACPI shutdown timed out or failed. Forcing poweroff...", vm_name)
        _, _, rc2 = self._run_vbox("controlvm", vm_name, "poweroff")
        if rc2 != 0:
            log.error("[%s] Forced poweroff command failed.", vm_name)
            return False

        # Wait up to 5 seconds for the state to transition to poweroff
        for _ in range(5):
            time.sleep(1)
            if self.get_vm_status(vm_name) in ("poweroff", "saved", "aborted"):
                log.info("[%s] VM stopped after forced poweroff.", vm_name)
                return True

        return False

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

