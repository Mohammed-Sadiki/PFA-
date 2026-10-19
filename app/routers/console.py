"""
VM Console router for Apache Guacamole integration.
Endpoints:
  GET   /vms/{vm_id}/console/status  — Check console readiness and status
  POST  /vms/{vm_id}/console/session — Generate ephemeral authenticated Guacamole session
"""

import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.vm import VM, VMStatus
from app.routers.auth import get_current_user
from app.services.console_service import ConsoleService
from app.services.vm_service import VBoxVMService

router = APIRouter(prefix="/vms", tags=["VM Console"])
log = logging.getLogger(__name__)
vm_service = VBoxVMService()


def _get_verified_vm(vm_id: int, current_user: User, db: Session) -> VM:
    """Ensure VM exists and current user is owner or admin."""
    vm = db.get(VM, vm_id)
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VM introuvable.")
    if vm.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès interdit. Cette VM ne vous appartient pas."
        )
    return vm


@router.get("/{vm_id}/console/status")
def get_console_status(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Check if the VM is running and if the VRDE console port is active.
    """
    vm = _get_verified_vm(vm_id, current_user, db)
    live_status = vm_service.get_vm_status(vm.name)

    if live_status != "running":
        return {
            "available": False,
            "status": live_status,
            "detail": "La VM doit être démarrée pour accéder à la console."
        }

    # Ensure VRDE port is configured
    vrde_port = vm.vrde_port or vm_service.get_vm_vrde_port(vm.name)
    if not vrde_port:
        try:
            vrde_port = vm_service.ensure_vrde_configured(vm.name)
            vm.vrde_port = vrde_port
            db.commit()
        except Exception as e:
            log.error("Failed to enable VRDE on live VM %s: %s", vm.name, e)
            return {
                "available": False,
                "status": "vrde_error",
                "detail": f"Erreur de configuration de l'écran distant : {e}"
            }

    return {
        "available": True,
        "vm_id": vm.id,
        "vm_name": vm.name,
        "status": "running",
        "has_vrde": True
    }


@router.post("/{vm_id}/console/session")
def create_console_session(
    vm_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Generate an ephemeral, authenticated Guacamole session for this VM.
    The frontend receives a single-use token and client URL.
    Closing this session will never stop the VM.
    """
    vm = _get_verified_vm(vm_id, current_user, db)

    # 1. Verify VM is running
    live_status = vm_service.get_vm_status(vm.name)
    if live_status != "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'ouvrir la console : la machine virtuelle n'est pas démarrée."
        )

    # 2. Ensure VRDE is active
    vrde_port = vm.vrde_port or vm_service.get_vm_vrde_port(vm.name)
    if not vrde_port:
        vrde_port = vm_service.ensure_vrde_configured(vm.name)
        vm.vrde_port = vrde_port
        db.commit()

    # 3. Create authenticated session via ConsoleService
    try:
        session_info = ConsoleService.create_console_session(
            vm_id=vm.id,
            vm_name=vm.name,
            username=current_user.username,
            vrde_port=vrde_port,
            duration_minutes=60,
        )
        log.info(
            "User '%s' opened console session for VM '%s' (ID #%d, VRDE port %d)",
            current_user.username, vm.name, vm.id, vrde_port
        )
        return session_info
    except Exception as exc:
        log.error("Console session creation failed for VM #%d: %s", vm.id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur de communication avec la passerelle Guacamole : {exc}"
        )
