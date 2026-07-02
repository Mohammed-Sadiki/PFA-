"""
WebSocket connection manager.

broadcast_from_sync() is the safe way to fire WS messages from synchronous
FastAPI endpoints (which run in AnyIO worker threads that have no event loop).
It schedules the coroutine on the main asyncio loop captured at startup.
"""

import asyncio
import logging
from typing import Dict, List, Any

from fastapi import WebSocket
from sqlalchemy.orm import Session

logger = logging.getLogger("app")

# Will be set to the running asyncio loop in the lifespan hook (main.py).
_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Call once at startup (from within an async context) to store the loop."""
    global _main_loop
    _main_loop = loop


def _schedule(coro) -> None:
    """
    Thread-safe helper: schedule a coroutine on the main event loop.
    Safe to call from any thread (including AnyIO worker threads).
    No-ops silently if the loop is not yet available.
    """
    if _main_loop is None or _main_loop.is_closed():
        return
    _main_loop.call_soon_threadsafe(asyncio.ensure_future, coro)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[Dict[str, Any]] = []

    # ── Connection lifecycle ────────────────────────────────────────────────

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int | None = None,
        username: str | None = None,
        is_admin: bool = False,
    ):
        await websocket.accept()
        self.active_connections.append(
            {"websocket": websocket, "user_id": user_id, "username": username, "is_admin": is_admin}
        )
        logger.info("WebSocket connected: user=%s, is_admin=%s", username, is_admin)

    def disconnect(self, websocket: WebSocket):
        for conn in self.active_connections:
            if conn["websocket"] == websocket:
                logger.info("WebSocket disconnected: user=%s", conn["username"])
                break
        self.active_connections = [
            conn for conn in self.active_connections if conn["websocket"] != websocket
        ]

    # ── Async broadcast helpers (for async endpoints / background tasks) ────

    async def broadcast_all(self, message: dict):
        for conn in list(self.active_connections):
            try:
                await conn["websocket"].send_json(message)
            except Exception as e:
                logger.debug("WS send failed (%s): %s", conn["username"], e)
                self.disconnect(conn["websocket"])

    async def broadcast_admins(self, message: dict):
        for conn in list(self.active_connections):
            if conn["is_admin"]:
                try:
                    await conn["websocket"].send_json(message)
                except Exception as e:
                    logger.debug("WS admin send failed (%s): %s", conn["username"], e)
                    self.disconnect(conn["websocket"])

    async def broadcast_user(self, user_id: int, message: dict):
        for conn in list(self.active_connections):
            if conn["user_id"] == user_id:
                try:
                    await conn["websocket"].send_json(message)
                except Exception as e:
                    logger.debug("WS user send failed (%s): %s", conn["username"], e)
                    self.disconnect(conn["websocket"])

    async def broadcast_stats_update(self, db: Session):
        try:
            from app.models.vm import VM, VMStatus
            from app.models.user import User

            stats = {
                "total_vms":   db.query(VM).count(),
                "running_vms": db.query(VM).filter(VM.status == VMStatus.RUNNING).count(),
                "stopped_vms": db.query(VM).filter(VM.status == VMStatus.STOPPED).count(),
                "error_vms":   db.query(VM).filter(VM.status == VMStatus.ERROR).count(),
                "total_users": db.query(User).count(),
            }
            await self.broadcast_admins({"event": "STATS_UPDATE", "data": stats})
        except Exception as e:
            logger.error("Failed to broadcast stats update: %s", e)

    # ── Thread-safe wrappers (for sync endpoints running in worker threads) ─

    def sync_broadcast_admins(self, message: dict) -> None:
        """Call from a synchronous FastAPI endpoint."""
        _schedule(self.broadcast_admins(message))

    def sync_broadcast_user(self, user_id: int, message: dict) -> None:
        """Call from a synchronous FastAPI endpoint."""
        _schedule(self.broadcast_user(user_id, message))

    def sync_broadcast_all(self, message: dict) -> None:
        """Call from a synchronous FastAPI endpoint."""
        _schedule(self.broadcast_all(message))

    def sync_broadcast_stats_update(self, db: Session) -> None:
        """Call from a synchronous FastAPI endpoint."""
        _schedule(self.broadcast_stats_update(db))


manager = ConnectionManager()
