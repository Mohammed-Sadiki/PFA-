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

import asyncio
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
from app.services.audit_service import AuditService
from app.services.metrics_service import MetricsService
from app.services.notification_service import NotificationService


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
    from app.logger import current_user_var
    current_user_var.set(username)
    vm_log = logging.getLogger("app.vm")
    
    db: Session = db_session_factory()
    vm = None
    try:
        vm = db.get(VM, vm_id)
        if not vm:
            vm_log.error("Action: Provisioning de la VM ID %d | Résultat: Échec (VM non trouvée en base de données)", vm_id)
            AuditService.log_event(
                db=db,
                action="VM_PROVISION",
                resource_type="vm",
                resource_id=vm_id,
                status="FAILED",
                username=username,
                details={"reason": "VM not found in database"}
            )
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
            os_type=vm.os_type,
        )

        vm.status     = VMStatus.RUNNING
        vm.vm_path    = result["vm_path"]
        vm.ip_address = result["ip_address"]
        vm.ssh_port   = result["ssh_port"]
        vm.started_at = datetime.now(timezone.utc)
        db.commit()
        vm_log.info("Action: Provisioning de la VM '%s' | Résultat: Réussite (SSH port %d)", vm.name, vm.ssh_port)
        
        AuditService.log_event(
            db=db,
            action="VM_PROVISION",
            resource_type="vm",
            resource_id=vm.id,
            status="SUCCESS",
            user_id=vm.owner_id,
            username=username,
            details={"name": vm.name, "ip": vm.ip_address, "ssh_port": vm.ssh_port}
        )
        # Broadcast success to owner and admins (runs in background thread, needs new event loop)
        from app.services.websocket_manager import manager as _mgr
        _vm_data = {"id": vm.id, "name": vm.name, "status": vm.status.value, "ssh_port": vm.ssh_port, "ip_address": vm.ip_address}
        _owner_id = vm.owner_id

        async def _broadcast_provision_success():
            await _mgr.broadcast_user(_owner_id, {"event": "VM_PROVISION_FINISHED", "data": _vm_data})
            await _mgr.broadcast_admins({"event": "VM_STATUS_UPDATED", "data": _vm_data})
            await _mgr.broadcast_stats_update(db)

        import threading
        # Invalidate metrics cache so the next call sees the real running status
        MetricsService.invalidate_cache(vm.name)
        # Notify the owner that their VM is ready
        NotificationService.create_notification(
            db=db,
            user_id=vm.owner_id,
            title="✅ VM Prête",
            message=f"Votre machine virtuelle '{vm.name}' est maintenant opérationnelle (SSH port {vm.ssh_port}).",
            type="success",
            details={"vm_id": vm.id, "ssh_port": vm.ssh_port, "ip_address": vm.ip_address}
        )
        # Notify admins that provisioning is finished
        NotificationService.create_notification(
            db=db,
            user_id=None,
            title="✅ Provisioning terminé",
            message=f"Utilisateur : {username}\nVM : {vm.name}",
            type="success",
            details={"vm_id": vm.id, "owner_username": username}
        )
        threading.Thread(target=lambda: asyncio.run(_broadcast_provision_success()), daemon=True).start()



    except GoldenMasterNotFoundError as exc:
        vm_name = vm.name if vm else f"ID {vm_id}"
        owner_id = vm.owner_id if vm else None
        vm_log.error("Action: Provisioning de la VM '%s' | Résultat: Échec (Master de référence introuvable : %s)", vm_name, exc)
        AuditService.log_event(
            db=db,
            action="VM_PROVISION",
            resource_type="vm",
            resource_id=vm_id,
            status="FAILED",
            user_id=owner_id,
            username=username,
            details={"name": vm_name, "reason": f"GoldenMasterNotFoundError: {exc}"}
        )
        if owner_id:
            NotificationService.create_notification(
                db=db, user_id=owner_id,
                title="❌ Provisioning échoué",
                message=f"La VM '{vm_name}' n'a pas pu être créée : image de référence introuvable.",
                type="error", details={"vm_id": vm_id, "reason": str(exc)}
            )
        NotificationService.create_notification(
            db=db, user_id=None,
            title="⚠️ Provisioning échoué",
            message=f"Utilisateur : {username}\nVM : {vm_name}",
            type="error", details={"vm_id": vm_id, "owner_username": username, "reason": str(exc)}
        )
        _mark_error(db, vm_id, str(exc))

    except GoldenMasterNotReadyError as exc:
        vm_name = vm.name if vm else f"ID {vm_id}"
        owner_id = vm.owner_id if vm else None
        vm_log.error("Action: Provisioning de la VM '%s' | Résultat: Échec (Master de référence non prêt : %s)", vm_name, exc)
        AuditService.log_event(
            db=db,
            action="VM_PROVISION",
            resource_type="vm",
            resource_id=vm_id,
            status="FAILED",
            user_id=owner_id,
            username=username,
            details={"name": vm_name, "reason": f"GoldenMasterNotReadyError: {exc}"}
        )
        if owner_id:
            NotificationService.create_notification(
                db=db, user_id=owner_id,
                title="❌ Provisioning échoué",
                message=f"La VM '{vm_name}' n'a pas pu être créée : image de référence non prête.",
                type="error", details={"vm_id": vm_id, "reason": str(exc)}
            )
        NotificationService.create_notification(
            db=db, user_id=None,
            title="⚠️ Provisioning échoué",
            message=f"Utilisateur : {username}\nVM : {vm_name}",
            type="error", details={"vm_id": vm_id, "owner_username": username, "reason": str(exc)}
        )
        _mark_error(db, vm_id, str(exc))

    except (VBoxCommandError, PortCollisionError) as exc:
        vm_name = vm.name if vm else f"ID {vm_id}"
        owner_id = vm.owner_id if vm else None
        vm_log.error("Action: Provisioning de la VM '%s' | Résultat: Échec (Erreur VirtualBox : %s)", vm_name, exc)
        AuditService.log_event(
            db=db,
            action="VM_PROVISION",
            resource_type="vm",
            resource_id=vm_id,
            status="FAILED",
            user_id=owner_id,
            username=username,
            details={"name": vm_name, "reason": f"VirtualBoxError: {exc}"}
        )
        if owner_id:
            NotificationService.create_notification(
                db=db, user_id=owner_id,
                title="❌ Provisioning échoué",
                message=f"La VM '{vm_name}' n'a pas pu être créée : erreur VirtualBox.",
                type="error", details={"vm_id": vm_id, "reason": str(exc)}
            )
        NotificationService.create_notification(
            db=db, user_id=None,
            title="⚠️ Provisioning échoué",
            message=f"Utilisateur : {username}\nVM : {vm_name}",
            type="error", details={"vm_id": vm_id, "owner_username": username, "reason": str(exc)}
        )
        _mark_error(db, vm_id, str(exc))

    except Exception as exc:
        vm_name = vm.name if vm else f"ID {vm_id}"
        owner_id = vm.owner_id if vm else None
        vm_log.error("Action: Provisioning de la VM '%s' | Résultat: Échec (Erreur inattendue : %s)", vm_name, exc, exc_info=True)
        AuditService.log_event(
            db=db,
            action="VM_PROVISION",
            resource_type="vm",
            resource_id=vm_id,
            status="FAILED",
            user_id=owner_id,
            username=username,
            details={"name": vm_name, "reason": f"UnexpectedError: {exc}"}
        )
        if owner_id:
            NotificationService.create_notification(
                db=db, user_id=owner_id,
                title="❌ Provisioning échoué",
                message=f"La VM '{vm_name}' n'a pas pu être créée : erreur inattendue.",
                type="error", details={"vm_id": vm_id, "reason": str(exc)}
            )
        NotificationService.create_notification(
            db=db, user_id=None,
            title="⚠️ Provisioning échoué",
            message=f"Utilisateur : {username}\nVM : {vm_name}",
            type="error", details={"vm_id": vm_id, "owner_username": username, "reason": str(exc)}
        )
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
    vm_log = logging.getLogger("app.vm")
    vm_name = f"{current_user.username}-{uuid.uuid4().hex[:8]}"

    # Default to "zorin" if no os_type is specified
    os_type = payload.os_type or "zorin"

    vm = VM(
        name=vm_name,
        owner_id=current_user.id,
        distro=os_type,
        vcpu=payload.vcpu,
        ram_mb=payload.ram_mb,
        disk_gb=payload.disk_gb,
        status=VMStatus.PENDING,
        os_type=os_type,  # Save the selected os_type (zorin, ubuntu, or windows11)
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

    vm_log.info("Action: Requête de création de VM | Résultat: Soumis avec succès (Nom de la VM: %s)", vm_name)
    AuditService.log_event(
        db=db,
        action="VM_CREATE",
        resource_type="vm",
        resource_id=vm.id,
        status="SUCCESS",
        details={"name": vm.name, "vcpu": vm.vcpu, "ram_mb": vm.ram_mb, "disk_gb": vm.disk_gb}
    )
    NotificationService.create_notification(
        db=db,
        user_id=current_user.id,
        title="🖥️ VM en cours de création",
        message=f"Votre machine virtuelle '{vm_name}' est en cours de provisioning. Vous serez notifié quand elle sera prête.",
        type="info",
        details={"vm_id": vm.id}
    )
    # Notify all admins that VM creation/provisioning has started
    NotificationService.create_notification(
        db=db,
        user_id=None,
        title="🖥️ Nouvelle VM en cours de création",
        message=f"Utilisateur : {current_user.username}\nVM : {vm_name}",
        type="info",
        details={"vm_id": vm.id, "owner_username": current_user.username}
    )
    from app.services.websocket_manager import manager
    manager.sync_broadcast_admins({"event": "VM_CREATED", "data": {"id": vm.id, "name": vm.name, "owner": current_user.username}})
    manager.sync_broadcast_stats_update(db)
    return vm




@router.get("/", response_model=List[VMOut])
def list_vms(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return all VMs belonging to the current user with real-time metrics."""
    vms = db.query(VM).filter(VM.owner_id == current_user.id).all()
    for vm in vms:
        metrics = MetricsService.get_real_metrics(vm, db)
        vm.cpu_usage_percent = metrics["cpu_usage_percent"]
        vm.ram_usage_mb = metrics["ram_usage_mb"]
        vm.uptime_seconds = metrics["uptime_seconds"]
        vm.ip_address = metrics["ip_address"]
        vm.ssh_port = metrics["ssh_port"]
    return vms


@router.get("/{vm_id}", response_model=VMOut)
def get_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get full details for a single VM, including real-time metrics from VirtualBox."""
    vm = _get_owned_vm(vm_id, current_user, db)
    metrics = MetricsService.get_real_metrics(vm, db)
    vm.cpu_usage_percent = metrics["cpu_usage_percent"]
    vm.ram_usage_mb = metrics["ram_usage_mb"]
    vm.uptime_seconds = metrics["uptime_seconds"]
    vm.ip_address = metrics["ip_address"]
    vm.ssh_port = metrics["ssh_port"]
    return vm


@router.post("/{vm_id}/start", response_model=VMStatusOut)
def start_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Start a stopped VM."""
    vm_log = logging.getLogger("app.vm")
    vm = _get_owned_vm(vm_id, current_user, db)

    if vm.status in (VMStatus.PENDING, VMStatus.CREATING):
        vm_log.warning("Action: Démarrage de la VM '%s' | Résultat: Échec (VM toujours en cours de provisioning)", vm.name)
        raise HTTPException(status_code=400, detail="VM is still being provisioned")

    # Sync live VirtualBox state first — VM may already be running
    live_raw = vm_service.get_vm_status(vm.name)
    live_status = _vbox_status_to_enum(live_raw)
    if live_status == VMStatus.RUNNING:
        vm.status = VMStatus.RUNNING
        db.commit()
        vm_log.info("Action: Démarrage de la VM '%s' | Résultat: Déjà en cours d'exécution", vm.name)
        ssh_cmd = f"ssh -p {vm.ssh_port} {current_user.username}@127.0.0.1" if vm.ssh_port else None
        return VMStatusOut(id=vm.id, name=vm.name, status=vm.status, ssh_command=ssh_cmd)

    success = vm_service.start_vm(vm.name)
    if not success:
        vm_log.error("Action: Démarrage de la VM '%s' | Résultat: Échec (Erreur au démarrage dans VirtualBox)", vm.name)
        AuditService.log_event(
            db=db,
            action="VM_START",
            resource_type="vm",
            resource_id=vm.id,
            status="FAILED",
            details={"name": vm.name, "reason": "VirtualBox start error"}
        )
        raise HTTPException(status_code=500, detail="Failed to start VM")

    vm.status = VMStatus.RUNNING
    vm.started_at = datetime.now(timezone.utc)
    db.commit()
    MetricsService.invalidate_cache(vm.name)
    vm_log.info("Action: Démarrage de la VM '%s' | Résultat: Réussite", vm.name)
    AuditService.log_event(
        db=db,
        action="VM_START",
        resource_type="vm",
        resource_id=vm.id,
        status="SUCCESS",
        details={"name": vm.name}
    )
    NotificationService.create_notification(
        db=db,
        user_id=current_user.id,
        title="▶️ VM Démarrée",
        message=f"La machine virtuelle '{vm.name}' a été démarrée avec succès.",
        type="success",
        details={"vm_id": vm.id}
    )
    # Notify all admins that the VM has started
    NotificationService.create_notification(
        db=db,
        user_id=None,
        title="▶️ VM démarrée",
        message=f"Utilisateur : {current_user.username}\nVM : {vm.name}",
        type="success",
        details={"vm_id": vm.id, "owner_username": current_user.username}
    )
    vm_data = {"id": vm.id, "name": vm.name, "status": vm.status.value}
    from app.services.websocket_manager import manager
    manager.sync_broadcast_user(current_user.id, {"event": "VM_STATUS_UPDATED", "data": vm_data})
    manager.sync_broadcast_admins({"event": "VM_STATUS_UPDATED", "data": vm_data})
    manager.sync_broadcast_stats_update(db)
    ssh_cmd = f"ssh -p {vm.ssh_port} {current_user.username}@127.0.0.1" if vm.ssh_port else None
    return VMStatusOut(id=vm.id, name=vm.name, status=vm.status, ssh_command=ssh_cmd)


@router.post("/{vm_id}/stop", response_model=VMStatusOut)
def stop_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Stop a running VM (ACPI graceful shutdown, falls back to poweroff)."""
    vm_log = logging.getLogger("app.vm")
    vm = _get_owned_vm(vm_id, current_user, db)

    if vm.status not in (VMStatus.RUNNING, VMStatus.ERROR):
        vm_log.warning("Action: Arrêt de la VM '%s' | Résultat: Échec (VM non active / déjà arrêtée)", vm.name)
        raise HTTPException(status_code=400, detail="VM is not running")

    # Sync live VirtualBox state first — VM may already be stopped
    live_raw = vm_service.get_vm_status(vm.name)
    live_status = _vbox_status_to_enum(live_raw)
    if live_status in (VMStatus.STOPPED, VMStatus.ERROR):
        vm.status = VMStatus.STOPPED
        db.commit()
        vm_log.info("Action: Arrêt de la VM '%s' | Résultat: Déjà arrêtée", vm.name)
        return VMStatusOut(id=vm.id, name=vm.name, status=vm.status)

    success = vm_service.stop_vm(vm.name)
    if not success:
        vm_log.error("Action: Arrêt de la VM '%s' | Résultat: Échec (Erreur à l'arrêt dans VirtualBox)", vm.name)
        AuditService.log_event(
            db=db,
            action="VM_STOP",
            resource_type="vm",
            resource_id=vm.id,
            status="FAILED",
            details={"name": vm.name, "reason": "VirtualBox stop error"}
        )
        raise HTTPException(status_code=500, detail="Failed to stop VM")

    vm.status = VMStatus.STOPPED
    db.commit()
    MetricsService.invalidate_cache(vm.name)
    vm_log.info("Action: Arrêt de la VM '%s' | Résultat: Réussite", vm.name)
    AuditService.log_event(
        db=db,
        action="VM_STOP",
        resource_type="vm",
        resource_id=vm.id,
        status="SUCCESS",
        details={"name": vm.name}
    )
    NotificationService.create_notification(
        db=db,
        user_id=current_user.id,
        title="⏹️ VM Arrêtée",
        message=f"La machine virtuelle '{vm.name}' a été arrêtée.",
        type="info",
        details={"vm_id": vm.id}
    )
    # Notify all admins that the VM has stopped
    NotificationService.create_notification(
        db=db,
        user_id=None,
        title="⏹️ VM arrêtée",
        message=f"Utilisateur : {current_user.username}\nVM : {vm.name}",
        type="info",
        details={"vm_id": vm.id, "owner_username": current_user.username}
    )
    vm_data = {"id": vm.id, "name": vm.name, "status": vm.status.value}
    from app.services.websocket_manager import manager
    manager.sync_broadcast_user(current_user.id, {"event": "VM_STATUS_UPDATED", "data": vm_data})
    manager.sync_broadcast_admins({"event": "VM_STATUS_UPDATED", "data": vm_data})
    manager.sync_broadcast_stats_update(db)
    return VMStatusOut(id=vm.id, name=vm.name, status=vm.status)


@router.delete("/{vm_id}", response_model=dict)
def delete_vm(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Delete a VM permanently (stops it first if running, removes all files)."""
    vm_log = logging.getLogger("app.vm")
    vm = _get_owned_vm(vm_id, current_user, db)

    if vm.status in (VMStatus.PENDING, VMStatus.CREATING):
        vm_log.warning("Action: Suppression de la VM '%s' | Résultat: Échec (VM en cours de provisioning)", vm.name)
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a VM that is still being provisioned",
        )

    # Best-effort VBox deletion (may already be gone)
    vm_name_deleted = vm.name
    vm_id_deleted = vm.id
    vm_service.delete_vm(vm.name)

    db.delete(vm)
    db.commit()
    MetricsService.invalidate_cache(vm_name_deleted)
    vm_log.info("Action: Suppression de la VM '%s' | Résultat: Réussite", vm_name_deleted)
    AuditService.log_event(
        db=db,
        action="VM_DELETE",
        resource_type="vm",
        resource_id=vm_id_deleted,
        status="SUCCESS",
        details={"name": vm_name_deleted}
    )
    NotificationService.create_notification(
        db=db,
        user_id=current_user.id,
        title="🗑️ VM Supprimée",
        message=f"La machine virtuelle '{vm_name_deleted}' a été supprimée définitivement.",
        type="warning",
        details={"vm_name": vm_name_deleted}
    )
    # Notify all admins that the VM has been deleted
    NotificationService.create_notification(
        db=db,
        user_id=None,
        title="🗑️ VM supprimée",
        message=f"Utilisateur : {current_user.username}\nVM : {vm_name_deleted}",
        type="warning",
        details={"vm_name": vm_name_deleted, "owner_username": current_user.username}
    )
    from app.services.websocket_manager import manager
    manager.sync_broadcast_user(current_user.id, {"event": "VM_DELETED", "data": {"id": vm_id_deleted, "name": vm_name_deleted}})
    manager.sync_broadcast_admins({"event": "VM_DELETED", "data": {"id": vm_id_deleted, "name": vm_name_deleted, "owner": current_user.username}})
    manager.sync_broadcast_stats_update(db)
    return {"status": "deleted", "name": vm_name_deleted}



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


@router.get("/{vm_id}/metrics", response_model=dict)
def get_vm_metrics(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Retrieve real-time metrics for a single VM, using MetricsService."""
    vm = _get_owned_vm(vm_id, current_user, db)
    metrics = MetricsService.get_real_metrics(vm, db)
    return metrics


