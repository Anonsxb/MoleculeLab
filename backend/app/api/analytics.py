"""Analytics endpoints: distributions and scatter data (FR-09)."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analysis import DistributionResponse, ScatterResponse, SummaryResponse
from app.services import analytics_service

router = APIRouter(tags=["Analytics"])


@router.get("/analytics/distribution", response_model=DistributionResponse)
def distribution(
    descriptor: str = Query(default="molecular_weight"),
    dataset_id: Optional[int] = Query(default=None),
    bins: int = Query(default=20, ge=2, le=60),
    db: Session = Depends(get_db),
) -> DistributionResponse:
    """Histogram-ready distribution for one descriptor across a dataset."""
    return analytics_service.distribution(db, descriptor, dataset_id, bins)


@router.get("/analytics/summary", response_model=SummaryResponse)
def summary(
    dataset_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> SummaryResponse:
    """Reference statistics for every descriptor across a dataset."""
    return analytics_service.summary(db, dataset_id)


@router.get("/analytics/scatter", response_model=ScatterResponse)
def scatter(
    x: str = Query(default="molecular_weight"),
    y: str = Query(default="logp"),
    dataset_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> ScatterResponse:
    """Scatter-ready points for two descriptors across a dataset."""
    return analytics_service.scatter(db, x, y, dataset_id)
