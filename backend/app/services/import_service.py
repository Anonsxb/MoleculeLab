"""CSV dataset import: parsing, validation, quality reporting, and persistence (FR-10, FR-11)."""

import csv
import io
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.dataset import Dataset
from app.models.dataset_entry import DatasetEntry
from app.models.import_job import ImportJob
from app.models.molecule import Molecule
from app.schemas.analysis import (
    DuplicateRow,
    ImportPreview,
    ImportResult,
    ImportedRecord,
    QualityReport,
    RejectedRow,
)
from app.services import chemistry, dataset_service, molecule_service

REQUIRED_COLUMNS = ["name", "smiles"]
OPTIONAL_COLUMNS = ["external_id", "source", "notes"]


def _read_csv(content: str) -> tuple[list[dict], int]:
    """Parse CSV text into raw row dictionaries, returning rows and a truncation count."""
    reader = csv.DictReader(io.StringIO(content))
    rows: list[dict] = []
    for row in reader:
        # Skip completely empty lines.
        if not any((value or "").strip() for value in row.values()):
            continue
        rows.append({(k or "").strip(): (v or "").strip() for k, v in row.items()})
    truncated = 0
    if len(rows) > settings.MAX_IMPORT_ROWS:
        truncated = len(rows) - settings.MAX_IMPORT_ROWS
        rows = rows[: settings.MAX_IMPORT_ROWS]
    return rows, truncated


def _validate_row(row: dict) -> tuple[Optional[dict], Optional[tuple[str, str]]]:
    """Validate one raw row.

    Returns (analysis, None) on success, or (None, (reason_code, detail)) on failure
    where reason_code is either "missing_field" or "invalid_structure".
    """
    for column in REQUIRED_COLUMNS:
        if not row.get(column):
            return None, ("missing_field", f"Missing value in required column '{column}'.")
    analysis = chemistry.describe_molecule(row["smiles"])
    if not analysis["valid"]:
        return None, (
            "invalid_structure",
            analysis["error_message"] or "Invalid molecular structure.",
        )
    return analysis, None


def _rejection_for(reason: str, detail: str, row_number: int, row: dict) -> RejectedRow:
    return RejectedRow(
        row_number=row_number,
        reason=reason,
        detail=detail,
        raw=row,
    )


def analyze_import(content: str, filename: str, dataset_name: str, description: str) -> ImportPreview:
    """Parse and validate CSV content without persisting anything (review step)."""
    rows, truncated = _read_csv(content)

    accepted: list[ImportedRecord] = []
    rejected: list[RejectedRow] = []
    duplicates: list[DuplicateRow] = []
    invalid_structures = 0
    missing_fields = 0

    for index, row in enumerate(rows, start=2):  # row 1 is the header
        analysis, failure = _validate_row(row)
        if analysis is None:
            reason, detail = failure or ("invalid_structure", "Unknown validation error.")
            if reason == "missing_field":
                missing_fields += 1
            else:
                invalid_structures += 1
            rejected.append(_rejection_for(reason, detail, index, row))
            continue

        duplicate = _detect_duplicate_row(accepted, analysis, row)
        if duplicate is not None:
            duplicates.append(
                DuplicateRow(
                    row_number=index,
                    reason=duplicate,
                    detail=(
                        "Identical input record already present in this file."
                        if duplicate == "exact_input_duplicate"
                        else "Identical canonical structure already present in this file."
                    ),
                    raw=row,
                )
            )
            continue

        values = analysis["descriptors"] or {}
        accepted.append(
            ImportedRecord(
                name=row["name"],
                smiles=row["smiles"],
                external_id=row.get("external_id") or None,
                source=row.get("source") or None,
                notes=row.get("notes") or None,
                formula=analysis.get("formula"),
                canonical_smiles=analysis.get("canonical_smiles"),
                molecular_weight=values.get("molecular_weight"),
                logp=values.get("logp"),
                hbd=values.get("hbd"),
                hba=values.get("hba"),
                tpsa=values.get("tpsa"),
            )
        )

    quality = QualityReport(
        total_rows_read=len(rows),
        accepted_rows=len(accepted),
        rejected_rows=len(rejected),
        invalid_structures=invalid_structures,
        missing_required_fields=missing_fields,
        duplicate_records=len(duplicates),
        calculation_failures=0,
    )

    return ImportPreview(
        filename=filename,
        dataset_name=dataset_name,
        description=description,
        quality=quality,
        accepted=accepted,
        rejected=rejected,
        duplicates=duplicates,
        truncated_rows=truncated,
    )


def _detect_duplicate_row(accepted: list[ImportedRecord], analysis: dict, row: dict) -> Optional[str]:
    """Distinguish exact duplicate inputs from identical canonical structures."""
    for existing in accepted:
        if existing.smiles == row["smiles"]:
            return "exact_input_duplicate"
        if (
            existing.canonical_smiles
            and analysis.get("canonical_smiles")
            and existing.canonical_smiles == analysis["canonical_smiles"]
        ):
            return "identical_canonical_structure"
    return None


def confirm_import(
    db: Session,
    records: list[ImportedRecord],
    quality: QualityReport,
    filename: str,
    dataset_name: str,
    description: str,
    source_name: str = "",
    source_url: Optional[str] = None,
) -> ImportResult:
    """Persist reviewed records, creating a dataset with provenance."""
    existing = db.execute(select(Dataset).where(Dataset.name == dataset_name)).scalars().first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "DATASET_NAME_EXISTS",
                    "message": f"A dataset named '{dataset_name}' already exists (id {existing.id}).",
                    "details": {"dataset_id": existing.id},
                }
            },
        )

    dataset = dataset_service.create_dataset(
        db,
        name=dataset_name,
        description=description or "Imported via CSV upload.",
        source_name=source_name or "CSV import",
        source_url=source_url,
        version_label="1.0",
    )

    job = ImportJob(
        dataset_id=dataset.id,
        filename=filename,
        status="completed",
        rows_read=quality.total_rows_read,
        rows_accepted=quality.accepted_rows,
        rows_rejected=quality.rejected_rows,
        invalid_structures=quality.invalid_structures,
        missing_fields=quality.missing_required_fields,
        duplicates=quality.duplicate_records,
        calculation_failures=quality.calculation_failures,
        error_summary="",
    )
    db.add(job)

    created = 0
    skipped_duplicates = 0
    for index, record in enumerate(records, start=2):
        duplicate = molecule_service.find_duplicate(db, record.smiles, record.canonical_smiles)
        if duplicate is not None:
            skipped_duplicates += 1
            entry = DatasetEntry(
                dataset_id=dataset.id,
                molecule_id=duplicate.id,
                row_number=index,
                validation_status="valid",
                validation_message=f"Linked to existing molecule (row {index}).",
            )
            db.add(entry)
            continue
        molecule, error = molecule_service.create_molecule_from_smiles(
            db,
            name=record.name,
            smiles=record.smiles,
            external_id=record.external_id,
            source_name=record.source or (source_name or "CSV import"),
            source_url=source_url,
        )
        if molecule is None:
            continue
        created += 1
        db.add(
            DatasetEntry(
                dataset_id=dataset.id,
                molecule_id=molecule.id,
                row_number=index,
                validation_status="valid",
                validation_message="",
            )
        )

    db.commit()
    db.refresh(dataset)

    return ImportResult(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        created=created,
        linked=skipped_duplicates,
        skipped_duplicates=skipped_duplicates,
        quality=quality,
    )
