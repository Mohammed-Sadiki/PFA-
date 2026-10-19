"""
Guacamole Reverse Proxy — ASGI Middleware for FastAPI (Production Mode).

In development, Vite dev server proxies /guacamole/* to the Docker container.
In production (FastAPI serves the built SPA), this middleware intercepts all
requests whose path starts with /guacamole/ and forwards them to the container.

This middleware approach avoids FastAPI routing priority issues (the SPA
catch-all route would otherwise intercept Guacamole requests first).

Supports:
  - Standard HTTP requests  (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
  - WebSocket upgrade        (/guacamole/websocket-tunnel)
"""

import asyncio
import logging
import urllib.parse
from typing import Callable

import httpx
import websockets
import websockets.exceptions

log = logging.getLogger(__name__)

_GUAC_HTTP = "http://127.0.0.1:8081"
_GUAC_WS   = "ws://127.0.0.1:8081"

# Hop-by-hop headers that must not be forwarded
_HOP_BY_HOP = frozenset({
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
})


class GuacamoleProxyMiddleware:
    """ASGI middleware that proxies /guacamole/* to the pfa-guacamole container."""

    def __init__(self, app: Callable) -> None:
        self.app = app
        self._http: httpx.AsyncClient | None = None

    def _get_http(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                base_url=_GUAC_HTTP,
                follow_redirects=True,
                timeout=httpx.Timeout(30.0, connect=10.0),
            )
        return self._http

    async def __call__(self, scope, receive, send) -> None:
        path: str = scope.get("path", "")

        if not path.startswith("/guacamole"):
            # Not a Guacamole request — pass through to the FastAPI app
            await self.app(scope, receive, send)
            return

        if scope["type"] == "websocket":
            await self._proxy_websocket(scope, receive, send)
        elif scope["type"] == "http":
            await self._proxy_http(scope, receive, send)
        else:
            await self.app(scope, receive, send)

    # ── HTTP proxy ─────────────────────────────────────────────────────────────

    async def _proxy_http(self, scope, receive, send) -> None:
        path = scope["path"]
        qs   = scope.get("query_string", b"").decode()
        url  = f"{path}?{qs}" if qs else path

        # Read full request body
        body_parts = []
        more = True
        while more:
            msg = await receive()
            body_parts.append(msg.get("body", b""))
            more = msg.get("more_body", False)
        body = b"".join(body_parts)

        # Forward headers (strip hop-by-hop)
        headers = {
            k.decode(): v.decode()
            for k, v in scope.get("headers", [])
            if k.decode().lower() not in _HOP_BY_HOP | {"host"}
        }

        method = scope.get("method", "GET")
        try:
            resp = await self._get_http().request(
                method=method,
                url=url,
                headers=headers,
                content=body,
            )
        except httpx.RequestError as exc:
            log.error("Guacamole HTTP proxy error: %s", exc)
            await send({"type": "http.response.start", "status": 502,
                        "headers": [[b"content-type", b"text/plain"]]})
            await send({"type": "http.response.body",
                        "body": f"Guacamole gateway unreachable: {exc}".encode()})
            return

        resp_headers = [
            [k.lower().encode(), v.encode()]
            for k, v in resp.headers.items()
            if k.lower() not in _HOP_BY_HOP
        ]

        await send({"type": "http.response.start", "status": resp.status_code,
                    "headers": resp_headers})
        await send({"type": "http.response.body", "body": resp.content})

    # ── WebSocket proxy ────────────────────────────────────────────────────────

    async def _proxy_websocket(self, scope, receive, send) -> None:
        path = scope["path"]
        qs   = scope.get("query_string", b"").decode()
        ws_url = f"{_GUAC_WS}{path}"
        if qs:
            ws_url = f"{ws_url}?{qs}"

        # Accept the client WebSocket handshake
        await send({"type": "websocket.accept"})

        # Forward subprotocol if requested
        extra_headers = {}
        for k, v in scope.get("headers", []):
            if k.lower() == b"sec-websocket-protocol":
                extra_headers["Sec-WebSocket-Protocol"] = v.decode()

        log.info("WS proxy: %s → %s", path, ws_url)

        try:
            async with websockets.connect(
                ws_url,
                additional_headers=extra_headers,
                ping_interval=20,
                ping_timeout=20,
                close_timeout=5,
                max_size=10 * 1024 * 1024,
            ) as upstream:

                async def client_to_upstream():
                    while True:
                        msg = await receive()
                        if msg["type"] == "websocket.disconnect":
                            break
                        data = msg.get("bytes") or msg.get("text", "").encode()
                        if data:
                            await upstream.send(data)

                async def upstream_to_client():
                    async for message in upstream:
                        if isinstance(message, bytes):
                            await send({"type": "websocket.send", "bytes": message})
                        else:
                            await send({"type": "websocket.send", "text": message})

                done, pending = await asyncio.wait(
                    [
                        asyncio.create_task(client_to_upstream()),
                        asyncio.create_task(upstream_to_client()),
                    ],
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for t in pending:
                    t.cancel()

        except websockets.exceptions.WebSocketException as exc:
            log.warning("Guacamole WS upstream closed: %s", exc)
        except Exception as exc:
            log.error("Guacamole WS proxy error: %s", exc)
        finally:
            try:
                await send({"type": "websocket.close", "code": 1000})
            except Exception:
                pass
