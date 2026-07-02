import logging
import os
import contextvars
from logging.handlers import RotatingFileHandler
from app.config import get_settings

# Context Variables for IP and User
client_ip_var = contextvars.ContextVar("client_ip", default="-")
current_user_var = contextvars.ContextVar("current_user", default="-")

class ContextFormatter(logging.Formatter):
    def format(self, record):
        record.ip = client_ip_var.get() or "-"
        record.user = current_user_var.get() or "-"
        return super().format(record)

def setup_logging():
    settings = get_settings()
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    max_bytes = settings.LOG_MAX_BYTES
    backup_count = settings.LOG_BACKUP_COUNT

    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)

    # Common formatter
    formatter = ContextFormatter(
        "%(asctime)s | %(levelname)-8s | IP: %(ip)s | User: %(user)s | %(name)s — %(message)s"
    )

    # 1. Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)

    # 2. General App Log Handler
    app_handler = RotatingFileHandler(
        "logs/app.log", maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
    )
    app_handler.setFormatter(formatter)
    app_handler.setLevel(log_level)

    # 3. Error Log Handler
    error_handler = RotatingFileHandler(
        "logs/error.log", maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
    )
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)

    # Root Logger Setup
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates on re-init
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
        
    root_logger.addHandler(console_handler)
    root_logger.addHandler(app_handler)
    root_logger.addHandler(error_handler)

    # 4. VM Logger Setup (app.vm)
    vm_handler = RotatingFileHandler(
        "logs/vm.log", maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
    )
    vm_handler.setFormatter(formatter)
    vm_handler.setLevel(log_level)
    
    vm_logger = logging.getLogger("app.vm")
    vm_logger.setLevel(log_level)
    vm_logger.propagate = True  # also logs to app.log & error.log
    for h in list(vm_logger.handlers):
        vm_logger.removeHandler(h)
    vm_logger.addHandler(vm_handler)

    # 5. Security Logger Setup (app.security)
    security_handler = RotatingFileHandler(
        "logs/security.log", maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
    )
    security_handler.setFormatter(formatter)
    security_handler.setLevel(log_level)
    
    security_logger = logging.getLogger("app.security")
    security_logger.setLevel(log_level)
    security_logger.propagate = True  # also logs to app.log & error.log
    for h in list(security_logger.handlers):
        security_logger.removeHandler(h)
    security_logger.addHandler(security_handler)
