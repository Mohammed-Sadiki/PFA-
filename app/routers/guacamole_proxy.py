"""
Guacamole Reverse Proxy Router for FastAPI (Production Mode).

In development mode, Vite's dev server proxies /guacamole/* to port 8081.
In production mode (FastAPI serves the built frontend), this router provides
the same HTTP + WebSocket proxy so the frontend Guacamole JS client can reach
the pfa-guacamole container without CORS or cross-origin issues.

Routes proxied:
  - GET/POST /guacamole/*            → http://127.0.0.1:8081/guacamole/*  (HTTP)
  - WebSocket /guacamole/websocket-tunnel  → ws://127.0.0.1:8081/guacamole/websocket-tunnel
"""

import logging
import asyncio
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, Response
import httpx
import websockets
import websockets.exceptions

log = logging.getLogger(__name__)

router = APIRouter(tags=["Guacamole Proxy"])

# Internal Guacamole container URL
_GUAC_HTTP = "http://127.0.0.1:8081"
_GUAC_WS   = "ws://127.0.0.1:8081"

# Shared async HTTP client (reused across requests)
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            base_url=_GUAC_HTTP,
            follow_redirects=True,
            timeout=httpx.Timeout(30.0, connect=10.0),
        )
    return _http_client


# ── HTTP proxy ────────────────────────────────────────────────────────────────

@router.api_route(
    "/guacamole/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    include_in_schema=False,
)
async def guacamole_http_proxy(path: str, request: Request):
    """
    Forward any HTTP request for /guacamole/* to the pfa-guacamole container.
    Preserves query string, headers, and request body.
    """
    client = get_http_client()

    # Reconstruct target URL preserving query string
    target_path = f"/guacamole/{path}"
    query = request.url.query
    if query:
        target_path = f"{target_path}?{query}"

    # Forward request body
    body = await request.body()

    # Forward a safe subset of headers (exclude hop-by-hop and host)
    skip_headers = {
        "host", "transfer-encoding", "connection", "keep-alive",
        "proxy-authenticate", "proxy-authorization", "te", "trailers", "upgrade",
    }
    fwd_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in skip_headers
    }

    try:
        upstream = await client.request(
            method=request.method,
            url=target_path,
            headers=fwd_headers,
            content=body,
        )
    except httpx.RequestError as exc:
        log.error("Guacamole HTTP proxy error: %s", exc)
        return Response(
            content=f"Guacamole gateway unreachable: {exc}",
            status_code=502,
        )

    # Strip hop-by-hop response headers
    resp_headers = {
        k: v for k, v in upstream.headers.items()
        if k.lower() not in {"transfer-encoding", "connection", "keep-alive"}
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )


# ── WebSocket proxy ───────────────────────────────────────────────────────────

@router.websocket("/guacamole/websocket-tunnel")
async def guacamole_ws_proxy(client_ws: WebSocket):
    """
    Bidirectional WebSocket proxy: browser ↔ FastAPI ↔ pfa-guacamole.
    Guacamole's JS client connects here; we relay all frames to the container.
    """
    await client_ws.accept()

    # Build the upstream WebSocket URL (preserve query string for Guacamole token)
    query = client_ws.url.query
    upstream_url = f"{_GUAC_WS}/guacamole/websocket-tunnel"
    if query:
        upstream_url = f"{upstream_url}?{query}"

    # Forward the subprotocol header if present
    subprotocol = client_ws.headers.get("sec-websocket-protocol")
    extra_headers = {}
    if subprotocol:
        extra_headers["Sec-WebSocket-Protocol"] = subprotocol

    log.info("WS proxy: opening upstream connection to Guacamole (%s)", upstream_url)

    try:
        async with websockets.connect(
            upstream_url,
            additional_headers=extra_headers,
            ping_interval=20,
            ping_timeout=20,
            close_timeout=5,
            max_size=10 * 1024 * 1024,  # 10 MB max frame
        ) as upstream_ws:

            async def forward_to_upstream():
                """Read frames from browser WebSocket, send to Guacamole."""
                try:
                    while True:
                        data = await client_ws.receive_bytes()
                        await upstream_ws.send(data)
                except (WebSocketDisconnect, Exception):
                    pass

            async def forward_to_client():
                """Read frames from Guacamole, send to browser WebSocket."""
                try:
                    async for message in upstream_ws:
                        if isinstance(message, bytes):
                            await client_ws.send_bytes(message)
                        else:
                            await client_ws.send_text(message)
                except (WebSocketDisconnect, Exception):
                    pass

            # Run both directions concurrently
            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(forward_to_upstream()),
                    asyncio.create_task(forward_to_client()),
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()

    except websockets.exceptions.WebSocketException as exc:
        log.error("Guacamole WS upstream error: %s", exc)
        try:
            await client_ws.close(code=1011, reason=str(exc))
        except Exception:
            pass
    except Exception as exc:
        log.error("Guacamole WS proxy unexpected error: %s", exc)
        try:
            await client_ws.close(code=1011)
        except Exception:
            pass
