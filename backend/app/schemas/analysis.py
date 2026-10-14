"""Schemas for datasets, imports, comparison, analytics, and export."""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Import (FR-10, FR-11)
# --------------------------------------------------------------------------- #

class ImportedRecord(BaseModel):
    """One accepted row from a CSV import."""

    name: str
    smiles: str
    external_id: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    formula: Optional[str] = None
    canonical_smiles: Optional[str] = None
    molecular_weight: Optional[float] = None
    logp: Optional[float] = None
    hbd: Optional[int] = None
    hba: Optional[int] = None
    tpsa: Optional[float] = None


class RejectedRow(BaseModel):
    """One rejected row with the reason and source row number."""

    row_number: int
    reason: str
    detail: str
    raw: Dict[str, str] = Field(default_factory=dict)


class DuplicateRow(BaseModel):
    """A row that duplicates existing data. Duplicates are never silently deleted."""

    row_number: int
    reason: str
    detail: str
    raw: Dict[str, str] = Field(default_factory=dict)


class QualityReport(BaseModel):
    """Data-quality summary for an import (FR-11)."""

    total_rows_read: int
    accepted_rows: int
    rejected_rows: int
    invalid_structures: int
    missing_required_fields: int
    duplicate_records: int
    calculation_failures: int


class ImportPreview(BaseModel):
    """Review payload returned before an import is confirmed."""

    job_id: Optional[int] = None
    filename: str
    dataset_name: str
    description: str
    quality: QualityReport
    accepted: List[ImportedRecord]
    rejected: List[RejectedRow]
    duplicates: List[DuplicateRow]
    truncated_rows: int = 0


class ImportConfirmRequest(BaseModel):
    """Confirmation payload for a reviewed import."""

    filename: str
    dataset_name: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    source_name: str = ""
    source_url: Optional[str] = None
    records: List[ImportedRecord]
    quality: QualityReport


class ImportResult(BaseModel):
    """Result of a confirmed import."""

    dataset_id: int
    dataset_name: str
    created: int
    linked: int
    skipped_duplicates: int
    quality: QualityReport


# --------------------------------------------------------------------------- #
# Comparison (FR-08)
# --------------------------------------------------------------------------- #

class CompareRequest(BaseModel):
    """Request comparing two to four molecules."""

    molecule_ids: List[int] = Field(..., min_length=2, max_length=4)


class DescriptorDiff(BaseModel):
    """Difference of one descriptor between two molecules."""

    key: str
    label: str
    unit: str
    values: List[Optional[float]]
    differences: List[Optional[float]]


class CompareResponse(BaseModel):
    """Comparison payload with per-descriptor differences."""

    molecules: List[Dict]
    descriptors: List[DescriptorDiff]


# --------------------------------------------------------------------------- #
# Analytics (FR-09)
# --------------------------------------------------------------------------- #

class DistributionResponse(BaseModel):
    """Histogram-ready distribution for one descriptor."""

    descriptor: str
    label: str
    unit: str
    dataset_name: str
    dataset_id: Optional[int]
    record_count: int
    included_count: int
    missing_count: int
    bins: List[Dict]
    min: Optional[float]
    max: Optional[float]
    mean: Optional[float]
    median: Optional[float]


class ScatterResponse(BaseModel):
    """Scatter-ready points for two descriptors."""

    dataset_name: str
    dataset_id: Optional[int]
    x_descriptor: str
    y_descriptor: str
    x_label: str
    y_label: str
    x_unit: str
    y_unit: str
    record_count: int
    included_count: int
    points: List[Dict]


# --------------------------------------------------------------------------- #
# Export (FR-12)
# --------------------------------------------------------------------------- #

class ExportMetaResponse(BaseModel):
    """Analysis summary accompanying an export."""

    dataset_name: str
    dataset_version: str
    active_filters: Dict
    selected_descriptors: List[str]
    export_timestamp: str
    app_version: str
    rdkit_version: str
    calculation_methodology: Dict[str, str]
    warnings: List[str]
