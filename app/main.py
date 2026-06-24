"""
FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db
from app.routers import auth, vms, admin

settings = get_settings()
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise DB tables. Shutdown: nothing extra needed."""
    log.info("Initialising database …")
    init_db()
    log.info("Database ready.")
    yield
    log.info("Shutting down.")


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

# ── Static files / SPA ────────────────────────────────────────────────────────
_static_dir = Path(__file__).parent / "static"
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

    @app.get("/", include_in_schema=False)
    def serve_frontend():
        return FileResponse(str(_static_dir / "index.html"))

    @app.get("/admin", include_in_schema=False)
    def serve_admin():
        return FileResponse(str(_static_dir / "admin.html"))

else:
    @app.get("/", include_in_schema=False)
    def root():
        return {
            "app": settings.APP_NAME,
            "docs": "/api/docs",
            "status": "running",
        }
