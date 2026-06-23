from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from enum import Enum
from app.database import Base


class VMStatus(str, Enum):
    PENDING  = "PENDING"
    CREATING = "CREATING"
    RUNNING  = "RUNNING"
    STOPPED  = "STOPPED"
    ERROR    = "ERROR"
    DELETED  = "DELETED"


class VM(Base):
    __tablename__ = "vms"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), unique=True, index=True, nullable=False)
    owner_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    distro        = Column(String(50), default="zorin-lite")
    vcpu          = Column(Integer, default=1)
    ram_mb        = Column(Integer, default=1024)
    disk_gb       = Column(Integer, default=15)
    status        = Column(SAEnum(VMStatus), default=VMStatus.PENDING, nullable=False)
    ip_address    = Column(String(45), nullable=True)   # typically 10.0.2.15 (NAT)
    vm_path       = Column(String(500), nullable=True)  # path to .vbox file
    ssh_port      = Column(Integer, nullable=True)       # host-side forwarded port
    error_message = Column(String(1000), nullable=True)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    started_at    = Column(DateTime, nullable=True)

    # Relationship: many VMs → one user
    owner = relationship("User", back_populates="vms")
