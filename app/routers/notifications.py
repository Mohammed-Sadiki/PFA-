import logging
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.notification import Notification
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])
logger = logging.getLogger("app")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: Optional[int]
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[NotificationOut])
def get_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """Retrieve notifications for the current user. Admins also see global notifications."""
    query = db.query(Notification)
    if current_user.is_admin:
        query = query.filter((Notification.user_id == current_user.id) | (Notification.user_id == None))
    else:
        query = query.filter(Notification.user_id == current_user.id)
        
    return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/unread-count", response_model=dict)
def get_unread_count(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Get the number of unread notifications for the user."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.is_admin:
        query = query.filter((Notification.user_id == current_user.id) | (Notification.user_id == None))
    else:
        query = query.filter(Notification.user_id == current_user.id)
        
    return {"count": query.count()}


@router.patch("/{id}/read", response_model=dict)
def mark_as_read(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read."""
    notif = db.get(Notification, id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    # Check ownership (non-admins can only mark their own notifications)
    if notif.user_id is not None and notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if notif.user_id is None and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    notif.is_read = True
    db.commit()
    return {"status": "success", "message": "Notification marked as read"}


@router.patch("/read-all", response_model=dict)
def mark_all_as_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current user."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.is_admin:
        query = query.filter((Notification.user_id == current_user.id) | (Notification.user_id == None))
    else:
        query = query.filter(Notification.user_id == current_user.id)

    unread_notifs = query.all()
    for notif in unread_notifs:
        notif.is_read = True
    db.commit()
    return {"status": "success", "count_marked": len(unread_notifs)}


@router.delete("/{id}", response_model=dict)
def delete_notification(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Permanently delete a notification."""
    notif = db.get(Notification, id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    # Check ownership
    if notif.user_id is not None and notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if notif.user_id is None and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(notif)
    db.commit()
    return {"status": "success", "message": "Notification deleted"}
