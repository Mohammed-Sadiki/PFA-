from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Zorin VM Automation"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite:///./zorin_vm_platform.db"

    # JWT Auth
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

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

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
