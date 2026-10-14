"""Dataset endpoints (FR-02)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.chemistry import DatasetList, DatasetSummary
from app.services import dataset_service

router = APIRouter(tags=["Datasets"])


@router.get("/datasets", response_model=DatasetList)
def list_datasets(db: Session = Depends(get_db)) -> DatasetList:
    """List every dataset with its quality summary."""
    items = dataset_service.list_datasets(db)
    return DatasetList(items=items, total=len(items))


@router.get("/datasets/{dataset_id}", response_model=DatasetSummary)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)) -> DatasetSummary:
    """Return one dataset with valid/invalid record counts."""
    dataset = dataset_service.get_dataset(db, dataset_id)
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
    valid, invalid = dataset_service.dataset_quality(db, dataset.id)
    return DatasetSummary(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        source_name=dataset.source_name,
        source_url=dataset.source_url,
        version_label=dataset.version_label,
        created_at=dataset.created_at.isoformat(),
        record_count=valid + invalid,
        valid_count=valid,
        invalid_count=invalid,
    )
