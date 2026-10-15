"""Export endpoints: filtered CSV plus analysis provenance (FR-12)."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analysis import ExportMetaResponse
from app.services import export_service

router = APIRouter(tags=["Export"])

DESCRIPTORS = ["molecular_weight", "logp", "hbd", "hba", "tpsa"]

_FILTER_SHAPE = ("_min", "_max")
_ALLOWED_FILTERS = [
    f"{prefix}_{bound}" for prefix in ("mw", "logp", "hbd", "hba", "tpsa") for bound in ("min", "max")
]


def _reject_unknown_filters(request: Request) -> None:
    """Reject filter-shaped query parameters that the server does not implement."""
    unsupported = [
        key
        for key in request.query_params
        if key.endswith(_FILTER_SHAPE)
        and key not in _ALLOWED_FILTERS
    ]
    if unsupported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "UNSUPPORTED_FILTER",
                    "message": (
                        "Unsupported filter(s): " + ", ".join(sorted(unsupported)) + ". "
                        "Supported: " + ", ".join(sorted(_ALLOWED_FILTERS)) + "."
                    ),
                    "details": {"received": sorted(unsupported)},
                }
            },
        )


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
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Export records matching the active filters as CSV."""
    if request is not None:
        _reject_unknown_filters(request)
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
