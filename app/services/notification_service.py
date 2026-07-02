import logging
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.services.websocket_manager import manager

logger = logging.getLogger("app")


class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        title: str,
        message: str,
        type: str = "info",  # success, info, warning, error
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        Create, persist and broadcast a new notification via WebSockets in a thread-safe way.
        """
        try:
            details_str = json.dumps(details) if details else None
            notif = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=type,
                details=details_str,
                is_read=False
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)

            # Broadcast via WebSockets
            payload = {
                "event": "NOTIFICATION_NEW",
                "data": {
                    "id": notif.id,
                    "user_id": notif.user_id,
                    "title": notif.title,
                    "message": notif.message,
                    "type": notif.type,
                    "is_read": notif.is_read,
                    "created_at": notif.created_at.isoformat()
                }
            }

            # If targeted to a user, send to them
            if notif.user_id is not None:
                manager.sync_broadcast_user(notif.user_id, payload)
            else:
                # If global/admin notification, broadcast to all administrators
                manager.sync_broadcast_admins(payload)

            logger.info("Notification created: '%s' for user ID %s", title, user_id)
            return notif
        except Exception as e:
            logger.error("Failed to create or broadcast notification: %s", e)
            raise e
