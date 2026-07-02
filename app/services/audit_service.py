import json
import logging
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.database import SessionLocal

class AuditService:
    @staticmethod
    def log_event(
        db: Session | None,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        status: str = "SUCCESS",
        user_id: int | None = None,
        username: str | None = None,
        ip_address: str | None = None,
        details: dict | str | None = None
    ) -> AuditLog | None:
        local_db = False
        if db is None:
            db = SessionLocal()
            local_db = True

        try:
            # Try to resolve IP address if not provided
            if not ip_address:
                try:
                    from app.logger import client_ip_var
                    ip_val = client_ip_var.get()
                    ip_address = ip_val if ip_val != "-" else None
                except Exception:
                    pass

            # Try to resolve username if not provided
            if not username:
                try:
                    from app.logger import current_user_var
                    user_val = current_user_var.get()
                    username = user_val if user_val != "-" else None
                except Exception:
                    pass

            # Convert details to JSON string
            details_str = None
            if details is not None:
                if isinstance(details, dict):
                    details_str = json.dumps(details)
                else:
                    details_str = str(details)

            log_entry = AuditLog(
                user_id=user_id,
                username=username,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id is not None else None,
                status=status,
                ip_address=ip_address,
                details=details_str
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            return log_entry
        except Exception as e:
            # Do not block app execution if audit logging fails
            logging.getLogger("app").error("Failed to write audit log entry: %s", e, exc_info=True)
            db.rollback()
            return None
        finally:
            if local_db:
                db.close()
