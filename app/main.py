"""
FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db
from app.routers import auth, vms, admin, ws, notifications
from app.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware


from app.logger import setup_logging
setup_logging()

settings = get_settings()
log = logging.getLogger(__name__)



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise DB tables, capture the event loop, and start metrics monitoring."""
    import asyncio as _asyncio
    from app.services.websocket_manager import set_main_loop
    from app.services.metrics_service import MetricsService
    from app.database import SessionLocal
    set_main_loop(_asyncio.get_event_loop())
    log.info("Initialising database …")
    init_db()
    log.info("Database ready.")
    MetricsService.start_monitoring(SessionLocal)
    yield
    log.info("Shutting down.")
    MetricsService.stop_monitoring()




app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Provision personal Zorin OS Lite VMs on a local VirtualBox host. "
        "Clone from a golden master in ~30 seconds with cloud-init user setup."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Rate Limiter setup
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    security_log = logging.getLogger("app.security")
    security_log.warning("Action: Tentative de connexion bloquée par le Rate Limiter | Résultat: HTTP 429")
    
    # Audit log
    from app.services.audit_service import AuditService
    AuditService.log_event(
        db=None,
        action="LOGIN",
        status="FAILED",
        details={"reason": "Rate limit exceeded (Too many requests)"}
    )

    response = JSONResponse(
        status_code=429,
        content={
            "detail": "Trop de tentatives de connexion répétées. Veuillez réessayer plus tard."
        }
    )
    if hasattr(request.app, "state") and hasattr(request.app.state, "limiter"):
        limiter = request.app.state.limiter
        if hasattr(request.state, "view_rate_limit"):
            response = limiter._inject_headers(response, request.state.view_rate_limit)
    return response



@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    app_log = logging.getLogger("app")
    app_log.error("Action: Traitement de la requête a échoué (Exception non gérée) | Résultat: %s", exc, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne est survenue."}
    )


@app.middleware("http")
async def log_ip_middleware(request: Request, call_next):
    from app.logger import client_ip_var, current_user_var
    ip = request.client.host if request.client else "-"
    client_ip_var.set(ip)
    current_user_var.set("-")
    response = await call_next(request)
    return response






# CORS (allow any origin for local use; lock down for production)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(vms.router)
app.include_router(admin.router)
app.include_router(ws.router)
app.include_router(notifications.router)


# ── Static files / SPA ────────────────────────────────────────────────────────
_static_dir = Path(__file__).parent / "static"

# API path prefixes that should NEVER be caught by the SPA fallback
_API_PREFIXES = ("auth", "vms", "admin", "notifications", "ws", "api")

if _static_dir.exists():
    # Mount /assets and /static directories so the React build chunks are served
    _assets_dir = _static_dir / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    # Mount /static for any legacy static files
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

    @app.get("/favicon.svg", include_in_schema=False)
    def serve_favicon():
        return FileResponse(str(_static_dir / "favicon.svg"))

    @app.get("/", include_in_schema=False)
    def serve_frontend():
        return FileResponse(str(_static_dir / "index.html"))

    # SPA fallback: serve index.html for all non-API client-side routes
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        # Do not intercept API / backend routes
        first_segment = full_path.split("/")[0]
        if first_segment in _API_PREFIXES:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        index = _static_dir / "index.html"
        if index.exists():
            return FileResponse(str(index))
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend not built yet")


else:
    @app.get("/", include_in_schema=False)
    def root():
        return {
            "app": settings.APP_NAME,
            "docs": "/api/docs",
            "status": "running",
        }

# Auto-reload trigger for resetting rate limiter

