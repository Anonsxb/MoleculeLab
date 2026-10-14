"""Health check API endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    rdkit_version: str
    environment: str


def get_rdkit_version() -> str:
    """Safely obtain installed RDKit version."""
    try:
        import rdkit
        return getattr(rdkit, "__version__", "unknown")
    except ImportError:
        return "not installed"


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return application health, version, and chemistry engine status."""
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        rdkit_version=get_rdkit_version(),
        environment=settings.ENVIRONMENT,
    )
