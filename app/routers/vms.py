"""
VM management router.
Endpoints:
  POST   /vms/              — Create (provision) a new VM  [async background task]
  GET    /vms/              — List all VMs for current user
  GET    /vms/{vm_id}       — Get VM details + live status
  POST   /vms/{vm_id}/start — Start a stopped VM
  POST   /vms/{vm_id}/stop  — Stop a running VM
  DELETE /vms/{vm_id}       — Delete a VM permanently
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vm import VM, VMStatus
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.vm import VMCreate, VMOut, VMStatusOut
from app.services.vm_service import (
    VBoxVMService,
    GoldenMasterNotFoundError,
    GoldenMasterNotReadyError,
    VBoxCommandError,
    PortCollisionError,
)

router = APIRouter(prefix="/vms", tags=["Virtual Machines"])
log = logging.getLogger(__name__)

vm_service = VBoxVMService()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_owned_vm(vm_id: int, current_user: User, db: Session) -> VM:
    """Fetch a VM by ID and verify the current user owns it."""
    vm = db.get(VM, vm_id)
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    if vm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your VM")
    return vm


def _vbox_status_to_enum(raw: str) -> VMStatus:
    mapping = {
        "running":   VMStatus.RUNNING,
        "poweroff":  VMStatus.STOPPED,
        "saved":     VMStatus.STOPPED,
        "aborted":   VMStatus.ERROR,
        "paused":    VMStatus.STOPPED,
        "restoring": VMStatus.CREATING,
    }
    return mapping.get(raw.lower(), VMStatus.ERROR)


# ─── Background task ──────────────────────────────────────────────────────────

def provision_vm_task(vm_id: int, username: str, password: str, db_session_factory) -> None:
    """
    Long-running background task: clone golden master, configure, boot.
    Runs in a thread pool outside the request lifecycle.
    """
    db: Session = db_session_factory()
    try:
        vm = db.get(VM, vm_id)
        if not vm:
            log.error("provision_vm_task: VM %d not found in DB", vm_id)
            return

        vm.status = VMStatus.CREATING
        db.commit()

        result = vm_service.clone_vm(
            vm_name=vm.name,
            username=username,
            password=password,
            vcpu=vm.vcpu,
            ram_mb=vm.ram_mb,
            disk_gb=vm.disk_gb,
            distro=vm.distro,
        )

        vm.status     = VMStatus.RUNNING
        vm.vm_path    = result["vm_path"]
        vm.ip_address = result["ip_address"]
        vm.ssh_port   = result["ssh_port"]
        vm.started_at = datetime.now(timezone.utc)
        db.commit()
        log.info("VM '%s' provisioned successfully (SSH port %d)", vm.name, vm.ssh_port)

    except GoldenMasterNotFoundError as exc:
        log.error("provision_vm_task: golden master missing — %s", exc)
        _mark_error(db, vm_id, str(exc))

    except GoldenMasterNotReadyError as exc:
        log.error("provision_vm_task: golden master not ready — %s", exc)
        _mark_error(db, vm_id, str(exc))

    except (VBoxCommandError, PortCollisionError) as exc:
        log.error("provision_vm_task: VBox error — %s", exc)
        _mark_error(db, vm_id, str(exc))

    except Exception as exc:
        log.exception("provision_vm_task: unexpected error")
        _mark_error(db, vm_id, f"Unexpected error: {exc}")

    finally:
        db.close()


def _mark_error(db: Session, vm_id: int, message: str) -> None:
    vm = db.get(VM, vm_id)
    if vm:
        vm.status = VMStatus.ERROR
        vm.error_message = message[:1000]
        db.commit()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=VMOut, status_code=status.HTTP_202_ACCEPTED)
def create_vm(
    payload: VMCreate,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Submit a new VM provisioning request.
    Returns immediately with status PENDING; provisioning runs in the background.
    """
    vm_name = f"{current_user.username}-{uuid.uuid4().hex[:8]}"

    vm = VM(
        name=vm_name,
        owner_id=current_user.id,
        distro="zorin-lite",
        vcpu=payload.vcpu,
        ram_mb=payload.ram_mb,
        disk_gb=payload.disk_gb,
        status=VMStatus.PENDING,
    )
    db.add(vm)
    db.commit()
    db.refresh(vm)

    from app.database import SessionLocal

    background_tasks.add_task(
        provision_vm_task,
        vm.id,
        current_user.username,
        payload.password,
        SessionLocal,
    )

    return vm


@router.get("/", response_model=List[VMOut])
def list_vms(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return all VMs belonging to the current user."""
    return db.query(VM).filter(VM.owner_id == current_user.id).all()


@router.get("/{vm_id}", response_model=VMOut)
def get_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get full details for a single VM, refreshing live status from VirtualBox."""
    vm = _get_owned_vm(vm_id, current_user, db)

    # Refresh status from VirtualBox if the VM exists in VBox
    if vm.status not in (VMStatus.PENDING, VMStatus.CREATING, VMStatus.DELETED):
        raw = vm_service.get_vm_status(vm.name)
        if raw != "unknown":
            live_status = _vbox_status_to_enum(raw)
            if live_status != vm.status:
                vm.status = live_status
                db.commit()

    return vm


@router.post("/{vm_id}/start", response_model=VMStatusOut)
def start_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Start a stopped VM."""
    vm = _get_owned_vm(vm_id, current_user, db)

    if vm.status in (VMStatus.PENDING, VMStatus.CREATING):
        raise HTTPException(status_code=400, detail="VM is still being provisioned")

    # Sync live VirtualBox state first — VM may already be running
    live_raw = vm_service.get_vm_status(vm.name)
    live_status = _vbox_status_to_enum(live_raw)
    if live_status == VMStatus.RUNNING:
        vm.status = VMStatus.RUNNING
        db.commit()
        ssh_cmd = f"ssh -p {vm.ssh_port} {current_user.username}@127.0.0.1" if vm.ssh_port else None
        return VMStatusOut(id=vm.id, name=vm.name, status=vm.status, ssh_command=ssh_cmd)

    success = vm_service.start_vm(vm.name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start VM")

    vm.status = VMStatus.RUNNING
    vm.started_at = datetime.now(timezone.utc)
    db.commit()

    ssh_cmd = f"ssh -p {vm.ssh_port} {current_user.username}@127.0.0.1" if vm.ssh_port else None
    return VMStatusOut(id=vm.id, name=vm.name, status=vm.status, ssh_command=ssh_cmd)


@router.post("/{vm_id}/stop", response_model=VMStatusOut)
def stop_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Stop a running VM (ACPI graceful shutdown, falls back to poweroff)."""
    vm = _get_owned_vm(vm_id, current_user, db)

    if vm.status not in (VMStatus.RUNNING, VMStatus.ERROR):
        raise HTTPException(status_code=400, detail="VM is not running")

    # Sync live VirtualBox state first — VM may already be stopped
    live_raw = vm_service.get_vm_status(vm.name)
    live_status = _vbox_status_to_enum(live_raw)
    if live_status in (VMStatus.STOPPED, VMStatus.ERROR):
        vm.status = VMStatus.STOPPED
        db.commit()
        return VMStatusOut(id=vm.id, name=vm.name, status=vm.status)

    success = vm_service.stop_vm(vm.name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to stop VM")

    vm.status = VMStatus.STOPPED
    db.commit()

    return VMStatusOut(id=vm.id, name=vm.name, status=vm.status)


@router.delete("/{vm_id}", response_model=dict)
def delete_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Delete a VM permanently (stops it first if running, removes all files)."""
    vm = _get_owned_vm(vm_id, current_user, db)

    if vm.status in (VMStatus.PENDING, VMStatus.CREATING):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a VM that is still being provisioned",
        )

    # Best-effort VBox deletion (may already be gone)
    vm_service.delete_vm(vm.name)

    db.delete(vm)
    db.commit()

    return {"status": "deleted", "name": vm.name}


@router.get("/{vm_id}/logs", response_model=dict)
def get_vm_logs(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Retrieve the live VirtualBox execution log for a VM."""
    vm = _get_owned_vm(vm_id, current_user, db)
    log_content = vm_service.get_vm_log(vm.name)
    return {"logs": log_content}

