"""
Admin router — aggregated statistics and user management.
Endpoints:
  GET  /admin/stats       — Global platform stats (VMs count, users count)
  GET  /admin/vms         — All VMs across all users (admin only)
  GET  /admin/users       — All registered users
  DELETE /admin/users/{user_id}  — Delete a user (and their VMs)
"""

import logging
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vm import VM, VMStatus
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.user import UserOut
from app.schemas.vm import VMOut
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin"])
log = logging.getLogger(__name__)


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
    """For now any authenticated user can access admin endpoints (single-tenant).
    Extend this with a role check when roles are added."""
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
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = True
    db.commit()
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
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "rejected", "username": user.username}


@router.patch("/users/{user_id}/role", response_model=dict)
def update_user_role(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Toggle admin role for a user."""
    _require_admin(current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = not user.is_admin
    db.commit()
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
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"status": "deleted", "username": user.username}
