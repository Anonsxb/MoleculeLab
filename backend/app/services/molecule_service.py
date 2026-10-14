"""Molecule persistence, search, filtering, sorting, and pagination (FR-03, FR-06)."""

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.dataset_entry import DatasetEntry
from app.models.molecule import Molecule
from app.services import chemistry
from app.schemas.chemistry import MoleculePage, MoleculeSummary

SORT_FIELDS = {
    "id": Molecule.id,
    "name": Molecule.display_name,
    "molecular_weight": Molecule.mol_wt,
    "logp": Molecule.logp,
    "hbd": Molecule.hbd,
    "hba": Molecule.hba,
    "tpsa": Molecule.tpsa,
}

# Allowlisted numeric filters: (query param, column, type)
FILTER_FIELDS = {
    "mw": Molecule.mol_wt,
    "logp": Molecule.logp,
    "hbd": Molecule.hbd,
    "hba": Molecule.hba,
    "tpsa": Molecule.tpsa,
}


def _apply_dataset_filter(stmt: Select, dataset_id: Optional[int]) -> Select:
    if dataset_id is not None:
        stmt = stmt.join(DatasetEntry, DatasetEntry.molecule_id == Molecule.id).where(
            DatasetEntry.dataset_id == dataset_id,
            DatasetEntry.validation_status == "valid",
        )
    return stmt


def _apply_query(stmt: Select, query: Optional[str]) -> Select:
    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                Molecule.display_name.ilike(pattern),
                Molecule.original_smiles.ilike(pattern),
                Molecule.canonical_smiles.ilike(pattern),
                Molecule.external_id.ilike(pattern),
            )
        )
    return stmt


def _apply_numeric_filters(stmt: Select, filters: dict) -> Select:
    for key, spec in filters.items():
        prefix, _, bound = key.partition("_")
        column = FILTER_FIELDS.get(prefix)
        if column is None:
            continue
        if bound == "min":
            stmt = stmt.where(column.is_not(None)).where(column >= float(spec))
        elif bound == "max":
            stmt = stmt.where(column.is_not(None)).where(column <= float(spec))
    return stmt


def list_molecules(
    db: Session,
    q: Optional[str] = None,
    dataset_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "name",
    sort_order: str = "asc",
    filters: Optional[dict] = None,
) -> MoleculePage:
    """Return a paginated, filtered, sorted page of molecules."""
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_PAGINATION",
                    "message": "page must be a positive integer within the supported range.",
                    "details": {},
                }
            },
        )
    page_size = max(1, min(page_size, 200))

    if sort_by not in SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "UNSUPPORTED_SORT_FIELD",
                    "message": f"sort_by must be one of: {', '.join(sorted(SORT_FIELDS))}",
                    "details": {"received": sort_by},
                }
            },
        )
    if sort_order not in ("asc", "desc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "UNSUPPORTED_SORT_ORDER",
                    "message": "sort_order must be 'asc' or 'desc'.",
                    "details": {"received": sort_order},
                }
            },
        )
    for key in (filters or {}):
        prefix = key.rsplit("_", 1)[0]
        suffix = key.rsplit("_", 1)[-1]
        if prefix not in FILTER_FIELDS or suffix not in ("min", "max"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "UNSUPPORTED_FILTER",
                        "message": f"Unsupported filter '{key}'.",
                        "details": {"received": key},
                    }
                },
            )

    stmt = select(Molecule)
    stmt = _apply_dataset_filter(stmt, dataset_id)
    stmt = _apply_query(stmt, q)
    stmt = _apply_numeric_filters(stmt, filters or {})

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    column = SORT_FIELDS[sort_by]
    stmt = stmt.order_by(column.asc() if sort_order == "asc" else column.desc(), Molecule.id.asc())
    stmt = stmt.limit(page_size).offset((page - 1) * page_size)

    rows = list(db.execute(stmt).scalars())
    items = [_summary(db, m) for m in rows]
    pages = (total + page_size - 1) // page_size if total else 0

    return MoleculePage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
        dataset_id=dataset_id,
        query=q,
    )


def _summary(db: Session, mol: Molecule) -> MoleculeSummary:
    """Map an ORM molecule to its API summary."""
    entry = (
        db.execute(
            select(DatasetEntry)
            .where(DatasetEntry.molecule_id == mol.id)
            .order_by(DatasetEntry.id)
            .limit(1)
        )
        .scalars()
        .first()
    )
    return MoleculeSummary(
        id=mol.id,
        display_name=mol.display_name,
        formula=mol.formula,
        original_smiles=mol.original_smiles,
        canonical_smiles=mol.canonical_smiles,
        external_id=mol.external_id,
        source_name=mol.source_name,
        source_url=mol.source_url,
        molecular_weight=mol.mol_wt,
        logp=mol.logp,
        hbd=mol.hbd,
        hba=mol.hba,
        tpsa=mol.tpsa,
        validation_status=entry.validation_status if entry else None,
        dataset_id=entry.dataset_id if entry else None,
    )


def get_molecule_detail(db: Session, molecule_id: int) -> dict:
    """Return full detail for one molecule with descriptor provenance."""
    mol = db.get(Molecule, molecule_id)
    if mol is None:
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
    summary = _summary(db, mol)
    svg = None
    parsed = chemistry.parse_smiles(mol.canonical_smiles or mol.original_smiles)
    if parsed is not None:
        svg = chemistry.generate_structure_svg(parsed)

    return {
        **summary.model_dump(),
        "structure_svg": svg,
        "descriptor_provenance": {
            "rdkit_version": mol.descriptor_rdkit_version,
            "calculated_at": mol.descriptors_calculated_at.isoformat(),
            "calculation_failed": bool(mol.calculation_failed),
            "methods": chemistry.CALCULATION_METHODS,
        },
        "descriptors": {
            "molecular_weight": {
                "value": mol.mol_wt,
                "unit": "g/mol",
                "method": chemistry.CALCULATION_METHODS["molecular_weight"],
            },
            "logp": {
                "value": mol.logp,
                "unit": "dimensionless",
                "method": chemistry.CALCULATION_METHODS["logp"],
            },
            "hbd": {
                "value": mol.hbd,
                "unit": "count",
                "method": chemistry.CALCULATION_METHODS["hbd"],
            },
            "hba": {
                "value": mol.hba,
                "unit": "count",
                "method": chemistry.CALCULATION_METHODS["hba"],
            },
            "tpsa": {
                "value": mol.tpsa,
                "unit": "Å²",
                "method": chemistry.CALCULATION_METHODS["tpsa"],
            },
        },
    }


def create_molecule_from_smiles(
    db: Session,
    name: str,
    smiles: str,
    external_id: Optional[str] = None,
    source_name: str = "",
    source_url: Optional[str] = None,
) -> tuple[Optional[Molecule], Optional[str]]:
    """Validate a SMILES string and persist the molecule with descriptors.

    Returns (molecule, error_message). When error_message is set, molecule is None.
    """
    analysis = chemistry.describe_molecule(smiles)
    if not analysis["valid"]:
        return None, analysis["error_message"] or "Invalid molecular structure."

    values = analysis["descriptors"]
    import rdkit

    molecule = Molecule(
        display_name=name.strip() or analysis["canonical_smiles"] or "Unnamed",
        formula=analysis["formula"] or "",
        original_smiles=smiles,
        canonical_smiles=analysis["canonical_smiles"],
        external_id=external_id,
        source_name=source_name,
        source_url=source_url,
        mol_wt=values.get("molecular_weight"),
        logp=values.get("logp"),
        hbd=values.get("hbd"),
        hba=values.get("hba"),
        tpsa=values.get("tpsa"),
        calculation_failed=not chemistry.descriptors_complete(values),
        descriptor_rdkit_version=rdkit.__version__,
    )
    db.add(molecule)
    db.flush()
    return molecule, None


def find_duplicate(db: Session, original_smiles: str, canonical: Optional[str]) -> Optional[Molecule]:
    """Find an existing molecule with identical input or canonical structure."""
    exact = (
        db.execute(select(Molecule).where(Molecule.original_smiles == original_smiles))
        .scalars()
        .first()
    )
    if exact:
        return exact
    if canonical:
        return (
            db.execute(select(Molecule).where(Molecule.canonical_smiles == canonical))
            .scalars()
            .first()
        )
    return None
