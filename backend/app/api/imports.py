"""CSV dataset import endpoints with a review step (FR-10, FR-11)."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.analysis import ImportConfirmRequest, ImportPreview, ImportResult
from app.services import import_service

router = APIRouter(tags=["Imports"])


@router.post("/datasets/import/preview", response_model=ImportPreview)
async def preview_import(
    file: UploadFile = File(...),
    dataset_name: str = "Uploaded dataset",
    description: str = "",
    db: Session = Depends(get_db),
) -> ImportPreview:
    """Parse and validate a CSV upload without persisting anything (review step)."""
    _reject_bad_upload(file)
    raw = await file.read()
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_ENCODING",
                    "message": "The file must be UTF-8 encoded CSV text.",
                    "details": {},
                }
            },
        )

    return import_service.analyze_import(content, file.filename or "upload.csv", dataset_name, description)


@router.post("/datasets/import", response_model=ImportResult)
def confirm_import(
    payload: ImportConfirmRequest,
    db: Session = Depends(get_db),
) -> ImportResult:
    """Persist a reviewed import."""
    return import_service.confirm_import(
        db,
        records=payload.records,
        quality=payload.quality,
        filename=payload.filename,
        dataset_name=payload.dataset_name,
        description=payload.description,
        source_name=payload.source_name,
        source_url=payload.source_url,
    )


@router.get("/imports/recent")
def get_recent_import(db: Session = Depends(get_db)) -> dict:
    """Return the most recent import job, or null when no import has run yet."""
    from sqlalchemy import desc, select

    from app.models.import_job import ImportJob

    job = db.execute(select(ImportJob).order_by(desc(ImportJob.id)).limit(1)).scalars().first()
    if job is None:
        return {"job": None}
    return {"job": _job_payload(job)}


@router.get("/imports/{job_id}")
def get_import_job(job_id: int, db: Session = Depends(get_db)) -> dict:
    """Return the status and quality information of an import job."""
    from app.models.import_job import ImportJob

    job = db.get(ImportJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "IMPORT_JOB_NOT_FOUND",
                    "message": f"No import job exists with id {job_id}.",
                    "details": {},
                }
            },
        )
    return _job_payload(job)


def _job_payload(job) -> dict:
    """Map an ImportJob row to its API representation."""
    return {
        "id": job.id,
        "filename": job.filename,
        "status": job.status,
        "dataset_id": job.dataset_id,
        "rows_read": job.rows_read,
        "rows_accepted": job.rows_accepted,
        "rows_rejected": job.rows_rejected,
        "invalid_structures": job.invalid_structures,
        "missing_fields": job.missing_fields,
        "duplicates": job.duplicates,
        "calculation_failures": job.calculation_failures,
        "error_summary": job.error_summary,
        "created_at": job.created_at.isoformat(),
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }


def _reject_bad_upload(file: UploadFile) -> None:
    """Enforce file type and size limits before reading content."""
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_FILE_TYPE",
                    "message": "Only CSV files (.csv) can be imported.",
                    "details": {"filename": file.filename},
                }
            },
        )
    if file.size is not None and file.size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": (
                        f"Uploads are limited to {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
                    ),
                    "details": {},
                }
            },
        )
