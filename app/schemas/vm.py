from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from app.models.vm import VMStatus
from app.config import get_settings

_s = get_settings()


class VMCreate(BaseModel):
    vcpu: int = _s.DEFAULT_VCPU
    ram_mb: int = _s.DEFAULT_RAM_MB
    disk_gb: int = _s.DEFAULT_DISK_GB
    password: str  # password for the VM guest user account

    @field_validator("vcpu")
    @classmethod
    def vcpu_range(cls, v: int) -> int:
        if not (_s.MIN_VCPU <= v <= _s.MAX_VCPU):
            raise ValueError(f"vCPU must be between {_s.MIN_VCPU} and {_s.MAX_VCPU}")
        return v

    @field_validator("ram_mb")
    @classmethod
    def ram_range(cls, v: int) -> int:
        if not (_s.MIN_RAM_MB <= v <= _s.MAX_RAM_MB):
            raise ValueError(f"RAM must be between {_s.MIN_RAM_MB} and {_s.MAX_RAM_MB} MB")
        return v

    @field_validator("disk_gb")
    @classmethod
    def disk_range(cls, v: int) -> int:
        if not (_s.MIN_DISK_GB <= v <= _s.MAX_DISK_GB):
            raise ValueError(f"Disk must be between {_s.MIN_DISK_GB} and {_s.MAX_DISK_GB} GB")
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("VM password must be at least 8 characters")
        return v


class VMOut(BaseModel):
    id: int
    name: str
    distro: str
    vcpu: int
    ram_mb: int
    disk_gb: int
    status: VMStatus
    ip_address: Optional[str] = None
    ssh_port: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None

    # Computed convenience field
    @property
    def ssh_command(self) -> Optional[str]:
        if self.ssh_port:
            return f"ssh -p {self.ssh_port} <your-username>@127.0.0.1"
        return None

    model_config = {"from_attributes": True}


class VMStatusOut(BaseModel):
    id: int
    name: str
    status: VMStatus
    ssh_command: Optional[str] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}
