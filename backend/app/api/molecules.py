"""Molecule endpoints: search, filtering, sorting, pagination, and detail (FR-03, FR-06)."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.chemistry import MoleculePage, SMILESValidationRequest
from app.services import chemistry, molecule_service

router = APIRouter(tags=["Molecules"])

# Unknown query params are normally ignored by FastAPI. That would let a client
# send a filter the server silently drops, so any parameter shaped like a numeric
# descriptor filter is validated here instead of being ignored.
_FILTER_SHAPE = ("_min", "_max")


def _reject_unknown_filters(request: Request) -> None:
    """Raise a structured error when a filter-shaped parameter is not allowlisted."""
    unsupported = [
        key
        for key in request.query_params
        if key.endswith(_FILTER_SHAPE) and key not in molecule_service.FILTER_NAMES
    ]
    if unsupported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "UNSUPPORTED_FILTER",
                    "message": (
                        "Unsupported filter(s): " + ", ".join(sorted(unsupported)) + ". "
                        "Supported: " + ", ".join(sorted(molecule_service.FILTER_NAMES)) + "."
                    ),
                    "details": {"received": sorted(unsupported)},
                }
            },
        )


@router.get("/molecules", response_model=MoleculePage)
def list_molecules(
    q: Optional[str] = Query(default=None, description="Search molecule name, SMILES, or external id"),
    dataset_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=25, ge=1, le=200),
    sort_by: str = Query(default="name"),
    sort_order: str = Query(default="asc"),
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
) -> MoleculePage:
    """List molecules with server-side search, filters, sorting, and pagination."""
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
    return molecule_service.list_molecules(
        db,
        q=q,
        dataset_id=dataset_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        filters=filters,
    )


@router.post("/molecules/validate", status_code=status.HTTP_200_OK)
def validate_smiles(payload: SMILESValidationRequest) -> dict:
    """Validate a SMILES string and calculate descriptors when it parses."""
    return chemistry.describe_molecule(payload.smiles)


@router.get("/molecules/{molecule_id}")
def get_molecule(molecule_id: int, db: Session = Depends(get_db)) -> dict:
    """Return molecule detail with 2D structure, descriptors, and provenance."""
    return molecule_service.get_molecule_detail(db, molecule_id)
