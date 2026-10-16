"""One-off data collection script: approved-drug extract from ChEMBL web services.

Run from the backend directory:

    .venv/Scripts/python.exe scripts/fetch_chembl.py

Data comes from the public ChEMBL webresource API (EMBL-EBI, no key required):
only approved small-molecule drugs (max_phase = 4) that have both a preferred
name and a canonical SMILES are kept. Only immutable public reference data is
stored: name, ChEMBL ID, and isomeric SMILES. Descriptors are NOT fetched —
MoleculeLab computes them locally with RDKit so every number has a single
documented calculation method.

Attribution: ChEMBL, EMBL European Bioinformatics Institute.
See https://www.ebi.ac.uk/chembl/ for licence and citation requirements.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "datasets" / "chembl_approved.json"
BASE = "https://www.ebi.ac.uk/chembl/api/data/molecule.json"
PAGE_SIZE = 200
MAX_RECORDS = 1200


def fetch_page(offset: int) -> dict | None:
    params = urllib.parse.urlencode(
        {
            "max_phase": 4,
            "molecule_type": "Small molecule",
            "limit": PAGE_SIZE,
            "offset": offset,
        }
    )
    request = urllib.request.Request(
        f"{BASE}?{params}",
        headers={"User-Agent": "MoleculeLab/1.0 (educational)"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 - report and stop
        print(f"  ! page at offset {offset}: {exc}")
        return None


def main() -> int:
    records: list[dict] = []
    seen: set[str] = set()
    offset = 0
    total = None

    while len(records) < MAX_RECORDS:
        payload = fetch_page(offset)
        if not payload:
            break
        molecules = payload.get("molecules", [])
        if total is None:
            total = payload.get("page_meta", {}).get("total_count", "?")
            print(f"ChEMBL reports {total} approved small molecules; collecting up to {MAX_RECORDS}.")
        if not molecules:
            break

        for molecule in molecules:
            if len(records) >= MAX_RECORDS:
                break
            name = (molecule.get("pref_name") or "").strip()
            structures = molecule.get("molecule_structures") or {}
            smiles = (structures.get("canonical_smiles") or "").strip()
            chembl_id = molecule.get("molecule_chembl_id")
            if not name or not smiles or not chembl_id:
                continue
            key = smiles.lower()
            if key in seen:
                continue
            seen.add(key)
            records.append(
                {
                    "name": name,
                    "chembl_id": chembl_id,
                    "smiles": smiles,
                }
            )

        offset += PAGE_SIZE
        print(f"  ... {len(records)} collected (offset {offset})")
        time.sleep(0.3)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"\nWrote {len(records)} records to {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
