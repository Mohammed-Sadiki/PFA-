import logging
from typing import Annotated
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.services.websocket_manager import manager

settings = get_settings()
logger = logging.getLogger("app")

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = None,
    db: Session = Depends(get_db)
):
    # Authenticate token passed via query parameter
    user = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str | None = payload.get("sub")
            if username:
                user = db.query(User).filter(User.username == username).first()
        except JWTError:
            pass

    if not user or not user.is_verified:
        # Unauthorized or unverified user
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Establish WebSocket connection
    await manager.connect(websocket, user_id=user.id, username=user.username, is_admin=user.is_admin)

    try:
        while True:
            # Keep-alive heartbeat (ping-pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug("WS error for %s: %s", user.username, e)
        manager.disconnect(websocket)
