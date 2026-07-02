"""
Admin router — aggregated statistics and user management.
Endpoints:
  GET  /admin/stats       — Global platform stats (VMs count, users count)
  GET  /admin/vms         — All VMs across all users (admin only)
  GET  /admin/users       — All registered users
  DELETE /admin/users/{user_id}  — Delete a user (and their VMs)
"""

import logging
import asyncio
from datetime import datetime
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vm import VM, VMStatus
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.audit_service import AuditService
from app.routers.auth import get_current_user
from app.schemas.user import UserOut
from app.schemas.vm import VMOut
from app.services.metrics_service import MetricsService
from pydantic import BaseModel



router = APIRouter(prefix="/admin", tags=["Admin"])
log = logging.getLogger(__name__)
security_log = logging.getLogger("app.security")



# ─── Schemas ──────────────────────────────────────────────────────────────────

class PlatformStats(BaseModel):
    total_vms: int
    running_vms: int
    stopped_vms: int
    error_vms: int
    total_users: int


class AdminVMOut(BaseModel):
    id: int
    name: str
    owner_username: str
    distro: str
    vcpu: int
    ram_mb: int
    disk_gb: int
    status: VMStatus
    ssh_port: int | None = None
    ip_address: str | None = None
    error_message: str | None = None
    created_at: str
    started_at: str | None = None

    model_config = {"from_attributes": True}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _require_admin(current_user: User) -> User:
    """Ensure that the current user is an administrator."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès interdit. Vous devez être administrateur.",
        )
    return current_user


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStats)
def get_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return aggregated platform statistics."""
    _require_admin(current_user)

    total_vms   = db.query(VM).filter(VM.status != VMStatus.DELETED).count()
    running_vms = db.query(VM).filter(VM.status == VMStatus.RUNNING).count()
    stopped_vms = db.query(VM).filter(VM.status == VMStatus.STOPPED).count()
    error_vms   = db.query(VM).filter(VM.status == VMStatus.ERROR).count()
    total_users = db.query(User).count()

    return PlatformStats(
        total_vms=total_vms,
        running_vms=running_vms,
        stopped_vms=stopped_vms,
        error_vms=error_vms,
        total_users=total_users,
    )


@router.get("/vms", response_model=List[AdminVMOut])
def list_all_vms(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return all VMs across all users with owner information."""
    _require_admin(current_user)

    vms = db.query(VM).filter(VM.status != VMStatus.DELETED).all()
    result = []
    for vm in vms:
        owner = db.get(User, vm.owner_id)
        result.append(AdminVMOut(
            id=vm.id,
            name=vm.name,
            owner_username=owner.username if owner else "unknown",
            distro=vm.distro,
            vcpu=vm.vcpu,
            ram_mb=vm.ram_mb,
            disk_gb=vm.disk_gb,
            status=vm.status,
            ssh_port=vm.ssh_port,
            ip_address=vm.ip_address,
            error_message=vm.error_message,
            created_at=vm.created_at.isoformat() if vm.created_at else None,
            started_at=vm.started_at.isoformat() if vm.started_at else None,
        ))
    return result


@router.get("/users", response_model=List[UserOut])
def list_all_users(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return all registered users."""
    _require_admin(current_user)
    return db.query(User).all()


@router.get("/pending-users", response_model=List[UserOut])
def list_pending_users(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Return all users with is_verified = False (pending approval)."""
    _require_admin(current_user)
    return db.query(User).filter(User.is_verified == False).all()


@router.post("/users/{user_id}/approve", response_model=dict)
def approve_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Approve a pending user registration."""
    _require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        security_log.warning("Action: Approbation de l'utilisateur ID %d | Résultat: Échec (Utilisateur non trouvé)", user_id)
        AuditService.log_event(
            db=db,
            action="USER_APPROVE",
            resource_type="user",
            resource_id=user_id,
            status="FAILED",
            details={"reason": "User not found"}
        )
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = True
    db.commit()
    security_log.info("Action: Approbation de l'utilisateur '%s' | Résultat: Réussite", user.username)
    AuditService.log_event(
        db=db,
        action="USER_APPROVE",
        resource_type="user",
        resource_id=user.id,
        status="SUCCESS",
        details={"approved_username": user.username}
    )
    from app.services.websocket_manager import manager
    manager.sync_broadcast_admins({"event": "USER_APPROVED", "data": {"id": user.id, "username": user.username}})
    manager.sync_broadcast_stats_update(db)
    return {"status": "approved", "username": user.username}


@router.post("/users/{user_id}/reject", response_model=dict)
def reject_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Reject a pending user registration by deleting the account."""
    _require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        security_log.warning("Action: Rejet de l'utilisateur ID %d | Résultat: Échec (Utilisateur non trouvé)", user_id)
        AuditService.log_event(
            db=db,
            action="USER_REJECT",
            resource_type="user",
            resource_id=user_id,
            status="FAILED",
            details={"reason": "User not found"}
        )
        raise HTTPException(status_code=404, detail="User not found")
    username = user.username
    db.delete(user)
    db.commit()
    security_log.info("Action: Rejet de l'utilisateur '%s' | Résultat: Réussite", username)
    AuditService.log_event(
        db=db,
        action="USER_REJECT",
        resource_type="user",
        resource_id=user_id,
        status="SUCCESS",
        details={"rejected_username": username}
    )
    from app.services.websocket_manager import manager
    manager.sync_broadcast_admins({"event": "USER_REJECTED", "data": {"username": username}})
    manager.sync_broadcast_stats_update(db)
    return {"status": "rejected", "username": username}


@router.patch("/users/{user_id}/role", response_model=dict)
def update_user_role(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Toggle admin role for a user."""
    _require_admin(current_user)

    if user_id == current_user.id:
        security_log.warning("Action: Changement de rôle de l'utilisateur ID %d | Résultat: Échec (Tentative de modification de son propre rôle)", user_id)
        AuditService.log_event(
            db=db,
            action="USER_ROLE_CHANGE",
            resource_type="user",
            resource_id=user_id,
            status="FAILED",
            details={"reason": "Cannot change your own role"}
        )
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user = db.get(User, user_id)
    if not user:
        security_log.warning("Action: Changement de rôle de l'utilisateur ID %d | Résultat: Échec (Utilisateur non trouvé)", user_id)
        AuditService.log_event(
            db=db,
            action="USER_ROLE_CHANGE",
            resource_type="user",
            resource_id=user_id,
            status="FAILED",
            details={"reason": "User not found"}
        )
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = not user.is_admin
    db.commit()
    security_log.info("Action: Changement de rôle de l'utilisateur '%s' (is_admin: %s) | Résultat: Réussite", user.username, user.is_admin)
    
    action = "USER_PROMOTE" if user.is_admin else "USER_DEMOTE"
    AuditService.log_event(
        db=db,
        action=action,
        resource_type="user",
        resource_id=user.id,
        status="SUCCESS",
        details={"username": user.username}
    )
    from app.services.websocket_manager import manager
    manager.sync_broadcast_admins({"event": "USER_ROLE_UPDATED", "data": {"id": user.id, "username": user.username, "is_admin": user.is_admin}})
    return {"status": "updated", "username": user.username, "is_admin": user.is_admin}


@router.delete("/users/{user_id}", response_model=dict)
def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Delete a user account and all their VMs."""
    _require_admin(current_user)

    if user_id == current_user.id:
        security_log.warning("Action: Suppression de l'utilisateur ID %d | Résultat: Échec (Tentative de suppression de son propre compte)", user_id)
        AuditService.log_event(
            db=db,
            action="USER_DELETE",
            resource_type="user",
            resource_id=user_id,
            status="FAILED",
            details={"reason": "Cannot delete your own account"}
        )
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.get(User, user_id)
    if not user:
        security_log.warning("Action: Suppression de l'utilisateur ID %d | Résultat: Échec (Utilisateur non trouvé)", user_id)
        AuditService.log_event(
            db=db,
            action="USER_DELETE",
            resource_type="user",
            resource_id=user_id,
            status="FAILED",
            details={"reason": "User not found"}
        )
        raise HTTPException(status_code=404, detail="User not found")

    username = user.username
    user_id_logged = user.id
    db.delete(user)
    db.commit()
    security_log.info("Action: Suppression de l'utilisateur '%s' | Résultat: Réussite", username)
    AuditService.log_event(
        db=db,
        action="USER_DELETE",
        resource_type="user",
        resource_id=user_id_logged,
        status="SUCCESS",
        details={"deleted_username": username}
    )
    from app.services.websocket_manager import manager
    manager.sync_broadcast_admins({"event": "USER_DELETED", "data": {"username": username}})
    manager.sync_broadcast_stats_update(db)
    return {"status": "deleted", "username": username}


# ─── Audit Log Schemas & Endpoints ──────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    created_at: datetime
    user_id: int | None
    username: str | None
    action: str
    resource_type: str | None
    resource_id: str | None
    status: str
    ip_address: str | None
    details: str | None

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    items: List[AuditLogOut]
    total: int


@router.get("/audit-logs", response_model=AuditLogResponse)
def get_audit_logs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    username: str | None = None,
    action: str | None = None,
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """Retrieve filtered and paginated audit logs for administrators."""
    _require_admin(current_user)

    query = db.query(AuditLog)

    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))
    if action:
        query = query.filter(AuditLog.action == action)
    if status:
        query = query.filter(AuditLog.status == status)
    if start_date:
        try:
            # Handle possible date-time formats
            dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            query = query.filter(AuditLog.created_at >= dt)
        except ValueError:
            pass
    if end_date:
        try:
            dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query = query.filter(AuditLog.created_at <= dt)
        except ValueError:
            pass

    total = query.count()
    items = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return AuditLogResponse(items=items, total=total)


@router.get("/metrics", response_model=List[dict])
def get_all_vm_metrics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Retrieve real-time metrics for all VMs, including owner names."""
    _require_admin(current_user)
    vms = db.query(VM).all()
    
    results = []
    for vm in vms:
        metrics = MetricsService.get_real_metrics(vm, db)
        # Add owner information
        owner = db.get(User, vm.owner_id)
        metrics["owner_username"] = owner.username if owner else "Inconnu"
        results.append(metrics)
        
    return results



