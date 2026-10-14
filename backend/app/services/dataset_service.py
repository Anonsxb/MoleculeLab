"""Dataset creation, seeding, and quality summaries."""

from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.dataset_entry import DatasetEntry
from app.models.molecule import Molecule
from app.schemas.chemistry import DatasetSummary

SEED_FILE = "data/datasets/pubchem_educational.json"

SEED_SOURCE = {
    "name": "Educational Common Compounds Extract",
    "description": (
        "A curated extract of common compounds used in chemistry education. Structures are "
        "immutable public reference records from PubChem (NIH); descriptors are computed "
        "locally by MoleculeLab's RDKit engine and are not experimental measurements."
    ),
    "source_name": "PubChem, National Institutes of Health",
    "source_url": "https://pubchem.ncbi.nlm.nih.gov/",
    "version_label": "1.0",
}


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


def list_datasets(db: Session) -> list[DatasetSummary]:
    """List all datasets with quality summaries."""
    datasets = list(db.execute(select(Dataset).order_by(Dataset.id)).scalars())
    summaries: list[DatasetSummary] = []
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
    return summaries


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
