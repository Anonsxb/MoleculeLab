"""MoleculeLab FastAPI main application entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import init_db
from app.api.health import router as health_router
from app.api.datasets import router as datasets_router
from app.api.molecules import router as molecules_router
from app.api.imports import router as imports_router
from app.api.compare import router as compare_router
from app.api.analytics import router as analytics_router
from app.api.export import router as export_router

logger = logging.getLogger("moleculelab")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create tables and seed the bundled dataset on first startup."""
    init_db()
    try:
        from app.scripts.seed_db import seed

        result = seed()
        logger.info("Dataset seed check: %s", result)
    except Exception as exc:  # noqa: BLE001 - startup must not be fatal
        logger.warning("Dataset seeding skipped: %s", exc)
    yield


app = FastAPI(
    title="MoleculeLab API",
    description="Educational Molecular Structure & Property Exploration Platform API",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standardized error response structure per PRD FR-13
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors consistently without leaking internal details."""
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload.",
                "details": {"validation_errors": exc.errors()},
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle standard HTTP exceptions with structured response format."""
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        code = exc.detail["error"].get("code", "HTTP_ERROR")
        message = exc.detail["error"].get("message", "Request failed.")
        details = exc.detail["error"].get("details", {})
    else:
        code = "HTTP_ERROR"
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            code = "NOT_FOUND"
        elif exc.status_code == status.HTTP_400_BAD_REQUEST:
            code = "BAD_REQUEST"
        elif exc.status_code == status.HTTP_403_FORBIDDEN:
            code = "FORBIDDEN"
        elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
            code = "UNAUTHORIZED"
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        details = {}

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler ensuring no unhandled stack traces are leaked to clients."""
    logger.error("Unhandled server exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing your request.",
                "details": {},
            }
        },
    )


# Mount routers with /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(datasets_router, prefix="/api")
app.include_router(molecules_router, prefix="/api")
app.include_router(imports_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(export_router, prefix="/api")


@app.get("/")
def root():
    """Root redirect / index info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
