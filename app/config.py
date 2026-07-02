from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Zorin VM Automation"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite:///./zorin_vm_platform.db"

    # JWT Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    LOGIN_RATE_LIMIT: str = "5/15minute"
    LOG_LEVEL: str = "INFO"
    LOG_MAX_BYTES: int = 10485760  # 10 MB
    LOG_BACKUP_COUNT: int = 5



    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v:
            raise ValueError("SECRET_KEY is missing from environment/dotenv file.")
        
        # Check minimum length of 64 characters
        if len(v) < 64:
            raise ValueError(f"SECRET_KEY must be at least 64 characters long (currently {len(v)}).")

        # Reject common placeholder values
        placeholders = [
            "change-me-in-production",
            "change-me-to-a-random-64-char-secret-in-production-never-commit",
            "change-me-to-a-random-64-char-secret-in-production"
        ]
        if any(p in v.lower() for p in placeholders):
            raise ValueError("SECRET_KEY cannot use default placeholder value.")
            
        return v

    # VirtualBox
    VBOXMANAGE_PATH: str = r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
    VM_BASE_DIR: str = r"C:\VMs\vms"
    GOLDEN_MASTER_DIR: str = r"C:\VMs\golden-masters"
    CLOUD_INIT_TEMP: str = r"C:\VMs\cloud-init-temp"
    GOLDEN_MASTER_NAME: str = "zorin-lite-master"
    VM_START_TYPE: str = "headless"  # "headless" or "gui"

    # VM Defaults / Limits
    DEFAULT_VCPU: int = 1
    DEFAULT_RAM_MB: int = 1024
    DEFAULT_DISK_GB: int = 15
    DEFAULT_DISTRO: str = "zorin-lite"
    AVAILABLE_DISTROS: List[str] = ["zorin-lite"]

    MIN_VCPU: int = 1
    MAX_VCPU: int = 4
    MIN_RAM_MB: int = 512
    MAX_RAM_MB: int = 4096
    MIN_DISK_GB: int = 10
    MAX_DISK_GB: int = 50

    # SSH port range for NAT forwarding
    SSH_PORT_MIN: int = 22000
    SSH_PORT_MAX: int = 22999

    # SMTP / Email Verification
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@zorinvm.local"
    EMAIL_VERIFICATION_REQUIRED: bool = True
    EMAIL_SIMULATION_MODE: bool = True
    APP_BASE_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
