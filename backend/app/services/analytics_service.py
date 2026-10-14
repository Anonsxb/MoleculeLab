"""Analytics service: distributions and scatter data computed from dataset records (FR-09)."""

from typing import Optional

import numpy as np
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dataset_entry import DatasetEntry
from app.models.molecule import Molecule
from app.schemas.analysis import DistributionResponse, ScatterResponse
from app.services import chemistry

DESCRIPTOR_COLUMNS = {
    "molecular_weight": Molecule.mol_wt,
    "logp": Molecule.logp,
    "hbd": Molecule.hbd,
    "hba": Molecule.hba,
    "tpsa": Molecule.tpsa,
}


def _molecules_for_dataset(db: Session, dataset_id: Optional[int]) -> tuple[list[Molecule], Optional[str]]:
    """Fetch molecules for a dataset (or all molecules) plus the dataset name."""
    stmt = select(Molecule)
    if dataset_id is not None:
        stmt = stmt.join(DatasetEntry, DatasetEntry.molecule_id == Molecule.id).where(
            DatasetEntry.dataset_id == dataset_id,
            DatasetEntry.validation_status == "valid",
        )
    molecules = list(db.execute(stmt).scalars())
    name = "All molecules"
    if dataset_id is not None:
        from app.models.dataset import Dataset

        dataset = db.get(Dataset, dataset_id)
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
        name = dataset.name
    return molecules, name


def distribution(
    db: Session, descriptor: str, dataset_id: Optional[int] = None, bins: int = 20
) -> DistributionResponse:
    """Compute histogram-ready distribution data for one descriptor."""
    if descriptor not in DESCRIPTOR_COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "UNSUPPORTED_DESCRIPTOR",
                    "message": f"descriptor must be one of: {', '.join(DESCRIPTOR_COLUMNS)}",
                    "details": {"received": descriptor},
                }
            },
        )

    molecules, dataset_name = _molecules_for_dataset(db, dataset_id)
    column = DESCRIPTOR_COLUMNS[descriptor]
    values = [
        float(getattr(m, column.name))
        for m in molecules
        if getattr(m, column.name) is not None
    ]
    missing = len(molecules) - len(values)

    if not values:
        return DistributionResponse(
            descriptor=descriptor,
            label=chemistry.DESCRIPTOR_LABELS[descriptor],
            unit=chemistry.DESCRIPTOR_UNITS[descriptor],
            dataset_name=dataset_name,
            dataset_id=dataset_id,
            record_count=len(molecules),
            included_count=0,
            missing_count=missing,
            bins=[],
            min=None,
            max=None,
            mean=None,
            median=None,
        )

    array = np.asarray(values, dtype=float)
    counts, edges = np.histogram(array, bins=min(bins, max(1, len(set(values)))))
    bin_list = [
        {
            "start": float(edges[i]),
            "end": float(edges[i + 1]),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]

    return DistributionResponse(
        descriptor=descriptor,
        label=chemistry.DESCRIPTOR_LABELS[descriptor],
        unit=chemistry.DESCRIPTOR_UNITS[descriptor],
        dataset_name=dataset_name,
        dataset_id=dataset_id,
        record_count=len(molecules),
        included_count=len(values),
        missing_count=missing,
        bins=bin_list,
        min=float(array.min()),
        max=float(array.max()),
        mean=float(array.mean()),
        median=float(np.median(array)),
    )


def scatter(
    db: Session,
    x: str = "molecular_weight",
    y: str = "logp",
    dataset_id: Optional[int] = None,
    limit: int = 800,
) -> ScatterResponse:
    """Compute scatter-ready points for two descriptors."""
    for key in (x, y):
        if key not in DESCRIPTOR_COLUMNS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "UNSUPPORTED_DESCRIPTOR",
                        "message": f"descriptor must be one of: {', '.join(DESCRIPTOR_COLUMNS)}",
                        "details": {"received": key},
                    }
                },
            )

    molecules, dataset_name = _molecules_for_dataset(db, dataset_id)
    x_column, y_column = DESCRIPTOR_COLUMNS[x], DESCRIPTOR_COLUMNS[y]

    points: list[dict] = []
    for molecule in sorted(molecules, key=lambda m: m.id)[:limit]:
        xv = getattr(molecule, x_column.name)
        yv = getattr(molecule, y_column.name)
        if xv is None or yv is None:
            continue  # never plot missing values as zero
        points.append(
            {
                "id": molecule.id,
                "name": molecule.display_name,
                "x": float(xv),
                "y": float(yv),
            }
        )

    return ScatterResponse(
        dataset_name=dataset_name,
        dataset_id=dataset_id,
        x_descriptor=x,
        y_descriptor=y,
        x_label=chemistry.DESCRIPTOR_LABELS[x],
        y_label=chemistry.DESCRIPTOR_LABELS[y],
        x_unit=chemistry.DESCRIPTOR_UNITS[x],
        y_unit=chemistry.DESCRIPTOR_UNITS[y],
        record_count=len(molecules),
        included_count=len(points),
        points=points,
    )
