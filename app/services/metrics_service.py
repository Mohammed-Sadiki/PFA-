import logging
import subprocess
import time
import threading
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.vm import VM, VMStatus

settings = get_settings()
logger = logging.getLogger("app")

# In-memory metrics cache. Keys: vm_name, values: {"timestamp": float, "data": dict}
_metrics_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 5.0  # 5 seconds TTL

# Track previous values to check for changes and broadcast via WS
_last_known_values: Dict[str, Dict[str, Any]] = {}

_monitoring_thread: Optional[threading.Thread] = None
_monitoring_active = False


class MetricsService:
    @staticmethod
    def _run_vbox(args: list[str]) -> tuple[str, str, int]:
        vbox_path = settings.VBOXMANAGE_PATH
        cmd = [vbox_path] + args
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            return res.stdout, res.stderr, res.returncode
        except Exception as e:
            logger.error("Error running VBoxManage metrics command %s: %s", cmd, e)
            return "", str(e), -1

    @classmethod
    def invalidate_cache(cls, vm_name: str) -> None:
        """Invalidate the cached metrics for a specific VM."""
        if vm_name in _metrics_cache:
            _metrics_cache.pop(vm_name, None)
            logger.info("Metrics cache invalidated for VM: %s", vm_name)

    @classmethod
    def get_real_metrics(cls, vm: VM, db: Session) -> Dict[str, Any]:
        """
        Retrieve real metrics for a VM, using a 5-second TTL cache.
        If VBoxManage fails or VM is stopped, returns gracefully structured metrics.
        """
        now = time.time()
        cached = _metrics_cache.get(vm.name)
        if cached and (now - cached["timestamp"]) < CACHE_TTL:
            return cached["data"]

        metrics = cls._fetch_raw_metrics(vm)
        
        # Check and broadcast changes
        cls._check_and_broadcast(vm, metrics, db)

        _metrics_cache[vm.name] = {
            "timestamp": now,
            "data": metrics
        }
        return metrics

    @classmethod
    def _check_and_broadcast(cls, vm: VM, metrics: Dict[str, Any], db: Session) -> None:
        """Check for major metrics changes and broadcast via WebSockets."""
        from app.services.websocket_manager import manager
        prev = _last_known_values.get(vm.name)

        if not prev:
            _last_known_values[vm.name] = {
                "status": metrics["status"],
                "ip_address": metrics["ip_address"],
                "cpu_usage_percent": metrics["cpu_usage_percent"],
                "ram_usage_mb": metrics["ram_usage_mb"]
            }
            return

        # Check conditions
        status_changed = prev["status"] != metrics["status"]
        ip_changed = prev["ip_address"] != metrics["ip_address"]
        # Significant changes for resource usage (avoid noise)
        cpu_changed = abs(prev["cpu_usage_percent"] - metrics["cpu_usage_percent"]) > 5.0
        ram_changed = abs(prev["ram_usage_mb"] - metrics["ram_usage_mb"]) > 10.0

        if status_changed or ip_changed or cpu_changed or ram_changed:
            _last_known_values[vm.name] = {
                "status": metrics["status"],
                "ip_address": metrics["ip_address"],
                "cpu_usage_percent": metrics["cpu_usage_percent"],
                "ram_usage_mb": metrics["ram_usage_mb"]
            }
            
            logger.info(
                "Metric change detected for %s (Status: %s, IP: %s, CPU: %.1f%%, RAM: %.1fMB). Broadcasting.",
                vm.name, metrics["status"], metrics["ip_address"], metrics["cpu_usage_percent"], metrics["ram_usage_mb"]
            )

            # Sync database status if it differs from live state
            live_status_enum = None
            if metrics["status"] == "RUNNING":
                live_status_enum = VMStatus.RUNNING
            elif metrics["status"] == "STOPPED":
                live_status_enum = VMStatus.STOPPED
            elif metrics["status"] == "PAUSED":
                live_status_enum = VMStatus.STOPPED  # Map paused to stopped/paused for simplicity
            elif metrics["status"] == "ERROR":
                live_status_enum = VMStatus.ERROR

            if live_status_enum and vm.status != live_status_enum:
                vm.status = live_status_enum
                db.commit()

            # Broadcast WS event
            ws_data = {
                "id": vm.id,
                "name": vm.name,
                "status": metrics["status"],
                "vcpus": metrics["vcpus"],
                "ram_mb": metrics["ram_mb"],
                "disk_gb": metrics["disk_gb"],
                "ip_address": metrics["ip_address"],
                "ssh_port": metrics["ssh_port"],
                "cpu_usage_percent": metrics["cpu_usage_percent"],
                "ram_usage_mb": metrics["ram_usage_mb"],
                "uptime_seconds": metrics["uptime_seconds"],
                "last_updated": metrics["last_updated"]
            }
            manager.sync_broadcast_user(vm.owner_id, {"event": "VM_STATUS_UPDATED", "data": ws_data})
            manager.sync_broadcast_admins({"event": "VM_STATUS_UPDATED", "data": ws_data})
            manager.sync_broadcast_stats_update(db)

    @classmethod
    def _fetch_raw_metrics(cls, vm: VM) -> Dict[str, Any]:
        """Query VirtualBox directly for live properties."""
        metrics = {
            "name": vm.name,
            "status": "STOPPED",
            "vcpus": vm.vcpu,
            "ram_mb": vm.ram_mb,
            "disk_gb": vm.disk_gb,
            "uptime_seconds": 0,
            "ip_address": vm.ip_address or "10.0.2.15",
            "ssh_port": vm.ssh_port or 0,
            "cpu_usage_percent": 0.0,
            "ram_usage_mb": 0.0,
            "last_updated": time.time()
        }

        # 1. State, memory, CPU allocations and SSH port from showvminfo
        stdout, _, rc = cls._run_vbox(["showvminfo", vm.name, "--machinereadable"])
        if rc != 0:
            return metrics

        # Parse key=value output
        info: Dict[str, str] = {}
        for line in stdout.splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                info[k.strip()] = v.strip().strip('"')

        # Map state
        raw_state = info.get("VMState", "poweroff").lower()
        if raw_state == "running":
            metrics["status"] = "RUNNING"
        elif raw_state in ("paused", "saved"):
            metrics["status"] = "PAUSED"
        elif raw_state in ("restoring", "creating"):
            metrics["status"] = "CREATING"
        elif raw_state == "aborted":
            metrics["status"] = "ERROR"
        else:
            metrics["status"] = "STOPPED"

        metrics["vcpus"] = int(info.get("cpus", vm.vcpu))
        metrics["ram_mb"] = int(info.get("memory", vm.ram_mb))

        # Retrieve SSH port from NAT forwarding rule
        for k, v in info.items():
            if k.startswith("Forwarding") and "guestssh" in v:
                try:
                    parts = v.split(",")
                    metrics["ssh_port"] = int(parts[3])
                except (IndexError, ValueError):
                    pass

        # Calculate uptime
        if metrics["status"] == "RUNNING" and "VMStateChangeTime" in info:
            try:
                change_time_str = info["VMStateChangeTime"].split(".")[0]
                dt = time.strptime(change_time_str, "%Y-%m-%dT%H:%M:%S")
                uptime = int(time.time() - time.mktime(dt))
                metrics["uptime_seconds"] = max(0, uptime)
            except Exception as e:
                logger.debug("Could not calculate uptime for %s: %s", vm.name, e)

        # 2. Get IP address and CPU/RAM metrics
        if metrics["status"] == "RUNNING":
            ip_out, _, ip_rc = cls._run_vbox(["guestproperty", "get", vm.name, "/VirtualBox/GuestInfo/Net/0/V4/IP"])
            if ip_rc == 0 and "Value:" in ip_out:
                ip_val = ip_out.split("Value:", 1)[1].strip()
                if ip_val and ip_val.lower() != "no value":
                    metrics["ip_address"] = ip_val

            # Setup and query metrics
            cls._run_vbox(["metrics", "setup", "--period", "1", "--samples", "2", vm.name])
            query_out, _, q_rc = cls._run_vbox(["metrics", "query", vm.name, "CPU/Load/User,RAM/Usage/Used"])
            if q_rc == 0:
                for line in query_out.splitlines():
                    parts = line.split()
                    if len(parts) >= 3:
                        metric_name = parts[1]
                        val_str = parts[2]
                        if "CPU/Load/User" in metric_name:
                            try:
                                metrics["cpu_usage_percent"] = float(val_str.replace("%", ""))
                            except ValueError:
                                pass
                        elif "RAM/Usage/Used" in metric_name:
                            try:
                                metrics["ram_usage_mb"] = float(val_str.replace("kB", "").strip()) / 1024.0
                            except ValueError:
                                pass
        return metrics

    @classmethod
    def start_monitoring(cls, db_session_factory) -> None:
        """Start the background thread that refreshes and broadcasts VM metrics."""
        global _monitoring_thread, _monitoring_active
        if _monitoring_thread is not None and _monitoring_thread.is_alive():
            return

        _monitoring_active = True
        _monitoring_thread = threading.Thread(
            target=cls._monitor_loop,
            args=(db_session_factory,),
            name="ZVM-MetricsMonitor",
            daemon=True
        )
        _monitoring_thread.start()
        logger.info("Background VM Metrics Monitor started.")

    @classmethod
    def stop_monitoring(cls) -> None:
        """Stop the background metrics monitoring thread."""
        global _monitoring_active
        _monitoring_active = False
        logger.info("Background VM Metrics Monitor stopping.")

    @classmethod
    def _monitor_loop(cls, db_session_factory) -> None:
        while _monitoring_active:
            db = None
            try:
                db = db_session_factory()
                vms = db.query(VM).all()
                for vm in vms:
                    if not _monitoring_active:
                        break
                    # Fetch real metrics (calls get_real_metrics which triggers _check_and_broadcast)
                    cls.get_real_metrics(vm, db)
            except Exception as e:
                logger.error("Error in background metrics monitor loop: %s", e)
            finally:
                if db:
                    db.close()
            # Wait 3 seconds before next iteration
            time.sleep(3)
