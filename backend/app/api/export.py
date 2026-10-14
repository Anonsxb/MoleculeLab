"""Export endpoints: filtered CSV plus analysis provenance (FR-12)."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analysis import ExportMetaResponse
from app.services import export_service

router = APIRouter(tags=["Export"])

DESCRIPTORS = ["molecular_weight", "logp", "hbd", "hba", "tpsa"]


@router.get("/export.csv", response_class=PlainTextResponse)
def export_csv(
    q: Optional[str] = Query(default=None),
    dataset_id: Optional[int] = Query(default=None),
    mw_min: Optional[float] = None,
    mw_max: Optional[float] = None,
    logp_min: Optional[float] = None,
    logp_max: Optional[float] = None,
    hbd_min: Optional[int] = None,
    hbd_max: Optional[int] = None,
    hba_min: Optional[int] = None,
    hba_max: Optional[int] = None,
    tpsa_min: Optional[float] = None,
    tpsa_max: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """Export records matching the active filters as CSV."""
    filters = {
        key: value
        for key, value in {
            "mw_min": mw_min,
            "mw_max": mw_max,
            "logp_min": logp_min,
            "logp_max": logp_max,
            "hbd_min": hbd_min,
            "hbd_max": hbd_max,
            "hba_min": hba_min,
            "hba_max": hba_max,
            "tpsa_min": tpsa_min,
            "tpsa_max": tpsa_max,
        }.items()
        if value is not None
    }
    content, total = export_service.build_export(
        db, q=q, dataset_id=dataset_id, filters=filters
    )
    return PlainTextResponse(
        content=content,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="moleculelab_export.csv"',
            "X-Record-Count": str(total),
        },
    )


@router.get("/export/meta", response_model=ExportMetaResponse)
def export_meta(
    dataset_id: Optional[int] = Query(default=None),
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> ExportMetaResponse:
    """Analysis summary describing how an export was produced."""
    filters = {"q": q} if q else {}
    return export_service.export_meta(db, dataset_id, filters, DESCRIPTORS)
