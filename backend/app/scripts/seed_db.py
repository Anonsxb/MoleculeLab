"""Seeding of the bundled educational dataset."""

import json
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, init_db
from app.models.dataset import Dataset
from app.services import dataset_service, molecule_service
from app.services.dataset_service import SEED_FILE, SEED_SOURCE


def _dataset_exists(db: Session, name: str) -> Optional[Dataset]:
    """Return an existing dataset with this name, if any."""
    return db.execute(select(Dataset).where(Dataset.name == name)).scalars().first()


def seed(force: bool = False) -> dict:
    """Create the bundled educational dataset when it is not present.

    Idempotent: re-running returns the existing dataset instead of duplicating records.
    """
    init_db()
    db = SessionLocal()
    try:
        existing = _dataset_exists(db, SEED_SOURCE["name"])
        if existing is not None and not force:
            return {"status": "already_seeded", "dataset_id": existing.id, "records": 0}

        from pathlib import Path

        path = Path(__file__).resolve().parents[2] / SEED_FILE
        if not path.exists():
            raise FileNotFoundError(
                f"Seed data missing at {path}. Run scripts/fetch_pubchem.py first."
            )
        records = json.loads(path.read_text(encoding="utf-8"))

        dataset = dataset_service.create_dataset(
            db,
            name=SEED_SOURCE["name"],
            description=SEED_SOURCE["description"],
            source_name=SEED_SOURCE["source_name"],
            source_url=SEED_SOURCE["source_url"],
            version_label=SEED_SOURCE["version_label"],
        )

        created = 0
        skipped = 0
        for index, record in enumerate(records, start=1):
            from rdkit import Chem  # local import keeps startup cost out of the module import

            parsed = Chem.MolFromSmiles(record["smiles"])
            canonical = Chem.MolToSmiles(parsed, canonical=True) if parsed else None
            duplicate = molecule_service.find_duplicate(db, record["smiles"], canonical)
            if duplicate is not None:
                # The identical structure is already represented in this dataset, so the
                # repeat row is skipped and reported rather than re-imported (PRD 6.1/11).
                skipped += 1
                continue

            molecule, _error = molecule_service.create_molecule_from_smiles(
                db,
                name=record["name"].title(),
                smiles=record["smiles"],
                external_id=f"CID:{record['cid']}",
                source_name=SEED_SOURCE["source_name"],
                source_url=f"{SEED_SOURCE['source_url']}compound/{record['cid']}",
            )
            if molecule is None:
                skipped += 1
                continue
            created += 1
            dataset_service.attach_molecule(db, dataset, molecule, row_number=index)

        db.commit()
        return {
            "status": "seeded",
            "dataset_id": dataset.id,
            "records": created,
            "skipped": skipped,
        }
    finally:
        db.close()
