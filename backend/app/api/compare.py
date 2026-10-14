"""Molecule comparison endpoint (FR-08)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analysis import CompareRequest, CompareResponse, DescriptorDiff
from app.services import chemistry, molecule_service

router = APIRouter(tags=["Comparison"])

DESCRIPTOR_KEYS = ["molecular_weight", "logp", "hbd", "hba", "tpsa"]


@router.post("/compare", response_model=CompareResponse)
def compare_molecules(payload: CompareRequest, db: Session = Depends(get_db)) -> CompareResponse:
    """Compare two to four molecules: values, units, and absolute differences."""
    molecules = []
    for molecule_id in payload.molecule_ids:
        detail = _get_detail(db, molecule_id)
        molecules.append(detail)

    descriptors: list[DescriptorDiff] = []
    for key in DESCRIPTOR_KEYS:
        values = [
            float(m["descriptors"][key]["value"]) if m["descriptors"][key]["value"] is not None else None
            for m in molecules
        ]
        reference = values[0]
        differences = [None if v is None or reference is None else abs(v - reference) for v in values]
        descriptors.append(
            DescriptorDiff(
                key=key,
                label=chemistry.DESCRIPTOR_LABELS[key],
                unit=chemistry.DESCRIPTOR_UNITS[key],
                values=values,
                differences=differences,
            )
        )

    return CompareResponse(molecules=molecules, descriptors=descriptors)


def _get_detail(db: Session, molecule_id: int) -> dict:
    try:
        return molecule_service.get_molecule_detail(db, molecule_id)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "MOLECULE_NOT_FOUND",
                    "message": f"No molecule exists with id {molecule_id}.",
                    "details": {},
                }
            },
        )
