"""Dataset creation, seeding, and quality summaries."""

from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.dataset_entry import DatasetEntry
from app.models.molecule import Molecule
from app.schemas.chemistry import DatasetSummary

SEED_DATASETS = [
    {
        "file": "data/datasets/pubchem_educational.json",
        "name": "Educational Common Compounds Extract",
        "description": (
            "A curated extract of common compounds used in chemistry education. Structures are "
            "immutable public reference records from PubChem (NIH); descriptors are computed "
            "locally by MoleculeLab's RDKit engine and are not experimental measurements."
        ),
        "source_name": "PubChem, National Institutes of Health",
        "source_url": "https://pubchem.ncbi.nlm.nih.gov/",
        "version_label": "1.0",
        "id_field": "cid",
        "id_prefix": "CID",
    },
    {
        "file": "data/datasets/chembl_approved.json",
        "name": "Approved Drugs Extract (ChEMBL)",
        "description": (
            "Approved small-molecule drugs with preferred names from ChEMBL (EMBL-EBI). "
            "Structures are immutable public reference records; descriptors are computed "
            "locally by MoleculeLab's RDKit engine and are not experimental measurements."
        ),
        "source_name": "ChEMBL, EMBL European Bioinformatics Institute",
        "source_url": "https://www.ebi.ac.uk/chembl/",
        "version_label": "web services, October 2026",
        "id_field": "chembl_id",
        "id_prefix": "",
    },
]

# Backwards-compatible alias for the original single-dataset constant.
SEED_FILE = SEED_DATASETS[0]["file"]
SEED_SOURCE = {k: SEED_DATASETS[0][k] for k in ("name", "description", "source_name", "source_url", "version_label")}


def create_dataset(
    db: Session,
    name: str,
    description: str = "",
    source_name: str = "",
    source_url: Optional[str] = None,
    version_label: str = "1.0",
) -> Dataset:
    """Create a dataset record."""
    dataset = Dataset(
        name=name,
        description=description,
        source_name=source_name,
        source_url=source_url,
        version_label=version_label,
    )
    db.add(dataset)
    db.flush()
    return dataset


def dataset_quality(db: Session, dataset_id: int) -> tuple[int, int]:
    """Count valid and invalid entries for a dataset."""
    valid = (
        db.execute(
            select(func.count(DatasetEntry.id)).where(
                DatasetEntry.dataset_id == dataset_id,
                DatasetEntry.validation_status == "valid",
            )
        ).scalar()
        or 0
    )
    invalid = (
        db.execute(
            select(func.count(DatasetEntry.id)).where(
                DatasetEntry.dataset_id == dataset_id,
                DatasetEntry.validation_status != "valid",
            )
        ).scalar()
        or 0
    )
    return valid, invalid


def list_datasets(db: Session) -> tuple[list[DatasetSummary], dict[str, int]]:
    """List all datasets with quality summaries and database-wide totals.

    Totals distinguish unique molecules from dataset entries: the same molecule
    may appear in more than one dataset without being stored twice.
    """
    datasets = list(db.execute(select(Dataset).order_by(Dataset.id)).scalars())
    summaries: list[DatasetSummary] = []
    totals = {
        "total_unique_molecules": 0,
        "total_entries": 0,
        "total_valid_entries": 0,
        "total_invalid_entries": 0,
    }
    for dataset in datasets:
        valid, invalid = dataset_quality(db, dataset.id)
        summaries.append(
            DatasetSummary(
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
        )
        totals["total_entries"] += valid + invalid
        totals["total_valid_entries"] += valid
        totals["total_invalid_entries"] += invalid

    totals["total_unique_molecules"] = (
        db.execute(select(func.count()).select_from(Molecule)).scalar() or 0
    )
    return summaries, totals


def get_dataset(db: Session, dataset_id: int) -> Optional[Dataset]:
    """Fetch one dataset by id."""
    return db.get(Dataset, dataset_id)


def attach_molecule(
    db: Session,
    dataset: Dataset,
    molecule: Molecule,
    row_number: int = 0,
    status: str = "valid",
    message: str = "",
) -> DatasetEntry:
    """Link a molecule into a dataset, returning the created entry."""
    entry = DatasetEntry(
        dataset_id=dataset.id,
        molecule_id=molecule.id,
        row_number=row_number,
        validation_status=status,
        validation_message=message,
    )
    db.add(entry)
    db.flush()
    return entry
