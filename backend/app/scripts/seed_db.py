"""Seeding of the bundled datasets."""

import json
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, init_db
from app.models.dataset import Dataset
from app.services import dataset_service, molecule_service
from app.services.dataset_service import SEED_DATASETS


def _dataset_exists(db: Session, name: str) -> Optional[Dataset]:
    """Return an existing dataset with this name, if any."""
    return db.execute(select(Dataset).where(Dataset.name == name)).scalars().first()


def seed(force: bool = False) -> dict:
    """Create every bundled dataset that is not already present.

    Idempotent per dataset: re-running only adds datasets whose name is absent,
    and never duplicates records.
    """
    init_db()
    db = SessionLocal()
    try:
        results: list[dict] = []
        for spec in SEED_DATASETS:
            existing = _dataset_exists(db, spec["name"])
            if existing is not None and not force:
                results.append(
                    {"status": "already_seeded", "dataset_id": existing.id, "records": 0}
                )
                continue
            results.append(_seed_one(db, spec))
        db.commit()
        return {"datasets": results}
    finally:
        db.close()


def _seed_one(db: Session, spec: dict) -> dict:
    """Create one bundled dataset from its JSON extract."""
    from rdkit import Chem  # local import keeps startup cost out of the module import

    path = Path(__file__).resolve().parents[2] / spec["file"]
    if not path.exists():
        raise FileNotFoundError(f"Seed data missing at {path}.")

    records = json.loads(path.read_text(encoding="utf-8"))
    dataset = dataset_service.create_dataset(
        db,
        name=spec["name"],
        description=spec["description"],
        source_name=spec["source_name"],
        source_url=spec["source_url"],
        version_label=spec["version_label"],
    )

    created = 0
    skipped = 0
    for index, record in enumerate(records, start=1):
        parsed = Chem.MolFromSmiles(record["smiles"])
        canonical = Chem.MolToSmiles(parsed, canonical=True) if parsed else None
        duplicate = molecule_service.find_duplicate(db, record["smiles"], canonical)
        if duplicate is not None:
            # The identical structure is already represented in this dataset, so the
            # repeat row is skipped and reported rather than re-imported (PRD 6.1/11).
            skipped += 1
            continue

        external_id = record.get(spec["id_field"])
        if external_id and spec["id_prefix"]:
            external_id = f"{spec['id_prefix']}:{external_id}"
        if spec["id_prefix"]:
            molecule_url = f"{spec['source_url']}compound/{record.get(spec['id_field'], '')}"
        else:
            molecule_url = (
                f"https://www.ebi.ac.uk/chembl/compound_report_card/{record.get(spec['id_field'], '')}/"
            )
        molecule, _error = molecule_service.create_molecule_from_smiles(
            db,
            name=record["name"].title(),
            smiles=record["smiles"],
            external_id=external_id,
            source_name=spec["source_name"],
            source_url=molecule_url,
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
