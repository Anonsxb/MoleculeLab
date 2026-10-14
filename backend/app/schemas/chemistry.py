"""Pydantic schemas for chemistry validation and descriptor calculations."""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class SMILESValidationRequest(BaseModel):
    """Request payload for validating a SMILES string."""

    smiles: str = Field(..., description="Raw SMILES string submitted by user", min_length=1)


class DescriptorData(BaseModel):
    """Calculated molecular descriptors with explicit metadata and provenance.

    Values are stored at full precision; display rounding happens in the UI.
    """

    molecular_weight: float = Field(..., description="Molecular weight in g/mol")
    logp: float = Field(..., description="Estimated Crippen partition coefficient (dimensionless)")
    hbd: int = Field(..., description="Number of hydrogen-bond donors")
    hba: int = Field(..., description="Number of hydrogen-bond acceptors")
    tpsa: float = Field(..., description="Topological Polar Surface Area in Å²")


class SMILESValidationResponse(BaseModel):
    """Structured response for SMILES validation according to PRD FR-04 and FR-05."""

    valid: bool
    status: str
    original_smiles: str
    canonical_smiles: Optional[str] = None
    formula: Optional[str] = None
    descriptors: Optional[DescriptorData] = None
    structure_svg: Optional[str] = None
    rdkit_version: str
    calculation_methods: Dict[str, str]
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class MoleculeSummary(BaseModel):
    """Molecule record as returned by list endpoints."""

    id: int
    display_name: str
    formula: Optional[str] = None
    original_smiles: str
    canonical_smiles: Optional[str] = None
    external_id: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    molecular_weight: Optional[float] = None
    logp: Optional[float] = None
    hbd: Optional[int] = None
    hba: Optional[int] = None
    tpsa: Optional[float] = None
    validation_status: Optional[str] = None
    dataset_id: Optional[int] = None


class MoleculePage(BaseModel):
    """Paginated molecule list response."""

    items: List[MoleculeSummary]
    total: int
    page: int
    page_size: int
    pages: int
    dataset_id: Optional[int] = None
    query: Optional[str] = None


class DatasetSummary(BaseModel):
    """Dataset metadata and quality summary."""

    id: int
    name: str
    description: str
    source_name: str
    source_url: Optional[str] = None
    version_label: str
    created_at: str
    record_count: int
    valid_count: int
    invalid_count: int


class DatasetList(BaseModel):
    """List of datasets."""

    items: List[DatasetSummary]
    total: int
