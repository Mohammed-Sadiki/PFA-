"""
Cloud-init NoCloud ISO service.
Generates user-data and meta-data, then bundles them into a cidata ISO
using pycdlib (pure Python — no external genisoimage/mkisofs needed).
"""

import os
import logging
from pathlib import Path

import pycdlib
from passlib.hash import sha512_crypt

from app.config import get_settings

settings = get_settings()
log = logging.getLogger(__name__)


def hash_password_sha512(plain: str) -> str:
    """Hash a plaintext password with SHA-512 (used by Linux /etc/shadow and cloud-init)."""
    return sha512_crypt.hash(plain)


def _render_user_data(vm_name: str, username: str, hashed_password: str) -> str:
    return f"""#cloud-config
users:
  - name: {username}
    passwd: {hashed_password}
    lock_passwd: false
    groups: [sudo, adm, audio, video, plugdev]
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']

hostname: {vm_name}
fqdn: {vm_name}.local
manage_etc_hosts: true

package_update: false
package_upgrade: false

packages:
  - curl
  - wget
  - htop
  - openssh-server
  - virtualbox-guest-utils

runcmd:
  - systemctl enable ssh
  - systemctl start ssh

final_message: "Zorin OS Lite ready for {username}"
"""


def _render_meta_data(vm_name: str) -> str:
    return f"instance-id: {vm_name}\nlocal-hostname: {vm_name}\n"


def create_cloud_init_iso(vm_name: str, username: str, password: str) -> str:
    """
    Create a NoCloud cloud-init ISO for the given VM.

    Returns the absolute path to the generated .iso file.
    Raises RuntimeError on failure.
    """
    temp_dir = Path(settings.CLOUD_INIT_TEMP) / vm_name
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Write user-data and meta-data files
    hashed = hash_password_sha512(password)
    user_data_content = _render_user_data(vm_name, username, hashed)
    meta_data_content = _render_meta_data(vm_name)

    user_data_path = temp_dir / "user-data"
    meta_data_path = temp_dir / "meta-data"
    iso_path = temp_dir / f"{vm_name}-cidata.iso"

    user_data_path.write_text(user_data_content, encoding="utf-8")
    meta_data_path.write_text(meta_data_content, encoding="utf-8")

    log.info("Creating cloud-init ISO at %s", iso_path)

    # Build ISO with pycdlib
    iso = pycdlib.PyCdlib()
    iso.new(
        interchange_level=4,
        joliet=True,
        rock_ridge="1.09",
        vol_ident="cidata",
    )

    for filename, path in [("user-data", user_data_path), ("meta-data", meta_data_path)]:
        content = path.read_bytes()
        iso.add_fp(
            fp=__import__("io").BytesIO(content),
            length=len(content),
            iso_path=f"/{filename.upper().replace('-', '_')}.;1",
            joliet_path=f"/{filename}",
            rr_name=filename,
        )

    iso.write(str(iso_path))
    iso.close()

    log.info("Cloud-init ISO created: %s", iso_path)
    return str(iso_path)


def cleanup_cloud_init_temp(vm_name: str) -> None:
    """Remove the temporary cloud-init directory for a VM (optional housekeeping)."""
    import shutil
    temp_dir = Path(settings.CLOUD_INIT_TEMP) / vm_name
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)
        log.info("Cleaned up cloud-init temp dir: %s", temp_dir)
