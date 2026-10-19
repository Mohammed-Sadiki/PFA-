"""
Console Service for Guacamole integration.
Generates authenticated sessions using Guacamole's encrypted JSON authentication
(guacamole-auth-json extension).
"""

import base64
import hashlib
import hmac
import json
import logging
import time
import urllib.parse
import urllib.request
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class ConsoleService:
    """Service handling session token negotiation with Apache Guacamole."""

    @staticmethod
    def _encrypt_json_payload(payload: dict, secret_hex: str) -> str:
        """
        Encrypts and signs JSON according to guacamole-auth-json specification:
        1. HMAC-SHA256 signature with the 16-byte key prepended to raw JSON bytes.
        2. PKCS7 padding to 16 bytes.
        3. AES-128-CBC encryption with null IV (16 zeros) and 16-byte key.
        4. Base64 encoding.
        """
        secret_bytes = bytes.fromhex(secret_hex)
        json_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')

        # Sign using HMAC-SHA256
        sig = hmac.new(secret_bytes, json_bytes, hashlib.sha256).digest()
        data_to_enc = sig + json_bytes

        # PKCS7 padding
        bs = 16
        pad_len = bs - (len(data_to_enc) % bs)
        padded = data_to_enc + bytes([pad_len] * pad_len)

        # AES-128-CBC encryption with null IV
        null_iv = b'\x00' * 16
        cipher = Cipher(algorithms.AES(secret_bytes), modes.CBC(null_iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted = encryptor.update(padded) + encryptor.finalize()

        return base64.b64encode(encrypted).decode('utf-8')

    @classmethod
    def create_console_session(
        cls,
        vm_id: int,
        vm_name: str,
        username: str,
        vrde_port: int,
        duration_minutes: int = 60,
    ) -> dict:
        """
        Negotiates an ephemeral, authenticated Guacamole session for the specified VM.
        Returns:
            {
                "token": "<authToken>",
                "connection_id": "<id>",
                "client_url": "<relative or absolute URL to iframe/page>",
                "expires_at": <epoch_ms>
            }
        """
        expires_ms = int(time.time() * 1000) + (duration_minutes * 60 * 1000)
        conn_identifier = f"vm-{vm_id}-{int(time.time())}"

        # Connections payload for Guacamole JSON auth
        payload = {
            "username": username,
            "expires": expires_ms,
            "connections": {
                conn_identifier: {
                    "protocol": "rdp",
                    "parameters": {
                        "hostname": "host.docker.internal",
                        "port": str(vrde_port),
                        "ignore-cert": "true",
                        "security": "any",
                        "enable-wallpaper": "true",
                        "enable-theming": "true",
                        "enable-font-smoothing": "true",
                        "color-depth": "24",
                    }
                }
            }
        }

        encrypted_b64 = cls._encrypt_json_payload(payload, settings.GUACAMOLE_JSON_SECRET_KEY)

        # Request Guacamole token from /api/tokens
        tokens_url = f"{settings.GUACAMOLE_INTERNAL_URL}/api/tokens"
        post_data = urllib.parse.urlencode({"data": encrypted_b64}).encode("utf-8")

        req = urllib.request.Request(tokens_url, data=post_data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Guacamole returned HTTP {resp.status}")
                body = json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            log.error("Failed to authenticate with Apache Guacamole: %s", exc)
            raise RuntimeError(f"Guacamole connection failure: {exc}")

        auth_token = body.get("authToken")
        if not auth_token:
            raise RuntimeError("Guacamole did not return an authToken")

        # Encode client URL: /guacamole/#/client/<base64(identifier\0c\0dataSource)>?token=...
        # Standard Guacamole web client format for direct connection
        client_key = f"{conn_identifier}\0c\0json"
        client_key_b64 = base64.b64encode(client_key.encode("utf-8")).decode("utf-8")

        client_url = f"{settings.GUACAMOLE_PUBLIC_URL}/#/client/{client_key_b64}?token={auth_token}"

        return {
            "success": True,
            "token": auth_token,
            "connection_id": conn_identifier,
            "data_source": "json",
            "client_url": client_url,
            "guac_base_url": settings.GUACAMOLE_PUBLIC_URL,
            "expires_at": expires_ms,
        }
