"""Export service: filtered CSV plus an analysis provenance summary (FR-12)."""

import csv
import io
from datetime import datetime, timezone
from typing import Optional

import rdkit
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.analysis import ExportMetaResponse
from app.services import chemistry
from app.services.molecule_service import list_molecules

EXPORT_COLUMNS = [
    "molecule_id",
    "display_name",
    "formula",
    "original_smiles",
    "canonical_smiles",
    "external_id",
    "source_name",
    "molecular_weight_g_mol",
    "logp_crippen_estimate",
    "hbd_count",
    "hba_count",
    "tpsa_A2",
    "rdkit_version",
]


def build_export(
    db: Session,
    q: Optional[str] = None,
    dataset_id: Optional[int] = None,
    filters: Optional[dict] = None,
    page_size: int = 100000,
) -> tuple[str, int]:
    """Build CSV content for records matching the active filters."""
    page = list_molecules(
        db,
        q=q,
        dataset_id=dataset_id,
        page=1,
        page_size=page_size,
        sort_by="id",
        sort_order="asc",
        filters=filters,
    )

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=EXPORT_COLUMNS)
    writer.writeheader()
    for item in page.items:
        writer.writerow(
            {
                "molecule_id": item.id,
                "display_name": item.display_name,
                "formula": item.formula or "",
                "original_smiles": item.original_smiles,
                "canonical_smiles": item.canonical_smiles or "",
                "external_id": item.external_id or "",
                "source_name": item.source_name or "",
                # Missing values export as empty strings, never zero (PRD 6.3).
                "molecular_weight_g_mol": _fmt(item.molecular_weight),
                "logp_crippen_estimate": _fmt(item.logp),
                "hbd_count": _fmt(item.hbd),
                "hba_count": _fmt(item.hba),
                "tpsa_A2": _fmt(item.tpsa),
                "rdkit_version": rdkit.__version__,
            }
        )
    return buffer.getvalue(), page.total


def _fmt(value: Optional[float]) -> str:
    """Format a numeric value at display precision, or empty when missing."""
    if value is None:
        return ""
    if isinstance(value, int) or float(value).is_integer():
        return str(int(value))
    return f"{value:.4f}"


def export_meta(
    db: Session,
    dataset_id: Optional[int],
    active_filters: dict,
    selected_descriptors: list[str],
) -> ExportMetaResponse:
    """Build the analysis summary accompanying an export."""
    dataset_name = "All molecules"
    dataset_version = "n/a"
    if dataset_id is not None:
        from app.services.dataset_service import get_dataset

        dataset = get_dataset(db, dataset_id)
        if dataset is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "DATASET_NOT_FOUND",
                        "message": f"No dataset exists with id {dataset_id}.",
                        "details": {},
                    }
                },
            )
        dataset_name = dataset.name
        dataset_version = dataset.version_label

    return ExportMetaResponse(
        dataset_name=dataset_name,
        dataset_version=dataset_version,
        active_filters=active_filters,
        selected_descriptors=selected_descriptors,
        export_timestamp=datetime.now(timezone.utc).isoformat(),
        app_version=settings.APP_VERSION,
        rdkit_version=rdkit.__version__,
        calculation_methodology=chemistry.CALCULATION_METHODS,
        warnings=[
            "Descriptors are calculated estimates, not experimental measurements.",
            "Calculated descriptors do not establish biological activity, efficacy, safety, or toxicity.",
        ],
    )
