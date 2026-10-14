"""One-off data collection script: build the bundled educational dataset from PubChem.

Run from the backend directory:

    .venv/Scripts/python.exe scripts/fetch_pubchem.py

Structures are fetched from the PubChem PUG-REST API (public, no API key required).
Only immutable public reference data is stored: name, PubChem CID, isomeric SMILES,
and molecular formula. Descriptors are NOT fetched — MoleculeLab computes them locally
with RDKit so that every number has a single documented calculation method.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "datasets" / "pubchem_educational.json"
BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{name}/property/IsomericSMILES,MolecularFormula,IUPACName/JSON"

# Common compounds used in chemistry education. PubChem resolves each name to a
# unique CID; synonyms are accepted by the API.
COMPOUNDS = [
    "water", "methanol", "ethanol", "isopropanol", "1-propanol", "1-butanol", "2-butanol",
    "tert-butanol", "ethylene glycol", "glycerol", "acetone", "butanone", "formaldehyde",
    "acetaldehyde", "benzaldehyde", "formic acid", "acetic acid", "propionic acid",
    "butyric acid", "oxalic acid", "citric acid", "lactic acid", "tartaric acid",
    "benzoic acid", "salicylic acid", "acetylsalicylic acid", "ibuprofen", "acetaminophen",
    "caffeine", "nicotine", "theobromine", "adenine", "guanine", "cytosine", "uracil",
    "thymine", "glucose", "fructose", "galactose", "sucrose", "lactose", "maltose",
    "ribose", "deoxyribose", "glycine", "alanine", "valine", "leucine", "isoleucine",
    "serine", "threonine", "cysteine", "methionine", "proline", "phenylalanine",
    "tyrosine", "tryptophan", "aspartic acid", "glutamic acid", "lysine", "arginine",
    "histidine", "asparagine", "glutamine", "benzene", "toluene", "ethylbenzene",
    "xylene", "styrene", "naphthalene", "anthracene", "phenol", "aniline", "nitrobenzene",
    "chlorobenzene", "bromobenzene", "benzyl alcohol", "acetophenone", "benzonitrile",
    "biphenyl", "phenanthrene", "pyridine", "pyrimidine", "pyrrole", "furan", "thiophene",
    "imidazole", "indole", "quinoline", "purine", "morphine", "codeine", "menthol",
    "camphor", "limonene", "pinene", "cholesterol", "testosterone", "estradiol",
    "progesterone", "cortisol", "adrenaline", "dopamine", "serotonin", "histamine",
    "penicillin G", "ampicillin", "tetracycline", "chloramphenicol", "sulfanilamide",
    "isoniazid", "aspirin", "paracetamol", "lidocaine", "diazepam", "warfarin",
    "atropine", "ephedrine", "mesitylene", "resorcinol", "hydroquinone", "catechol",
    "phthalic acid", "terephthalic acid", "adipic acid", "succinic acid", "malonic acid",
    "acrylic acid", "methacrylic acid", "acrylamide", "caprolactam", "anethole",
    "vanillin", "eugenol", "thymol", "pinacol", "diethyl ether", "tetrahydrofuran",
    "dioxane", "dimethyl sulfoxide", "acetonitrile", "nitromethane", "carbon disulfide",
    "carbon tetrachloride", "chloroform", "dichloromethane", "1,2-dichloroethane",
    "tetrachloroethylene", "hexane", "cyclohexane", "heptane", "octane", "decane",
    "ethylene", "propylene", "acetylene", "butadiene", "isoprene", "cyclopentane",
    "methylcyclopentane", "ethyl acetate", "methyl salicylate", "methyl benzoate",
    "dimethyl carbonate", "urea", "thiourea", "acetamide", "benzamide", "nicotinamide",
    "aniline", "o-toluidine", "pyrogallol", "gallic acid", "tannic acid", "ascorbic acid",
    "retinol", "beta-carotene", "biotin", "folic acid", "riboflavin", "thiamine",
    "chlorophyll a", "hemoglobin", "naphthol", "allyl alcohol", "propargyl alcohol",
]


def fetch(name: str) -> dict | None:
    url = BASE.format(name=urllib.parse.quote(name))
    request = urllib.request.Request(url, headers={"User-Agent": "MoleculeLab/1.0 (educational)"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 - report and continue
        print(f"  ! {name}: {exc}")
        return None
    try:
        row = payload["PropertyTable"]["Properties"][0]
    except (KeyError, IndexError):
        print(f"  ! {name}: unexpected payload")
        return None
    return {
        "name": name,
        "cid": row.get("CID"),
        "iupac_name": row.get("IUPACName"),
        "smiles": row.get("SMILES"),
        "formula": row.get("MolecularFormula"),
    }


def main() -> int:
    records = []
    seen_names: set[str] = set()
    for i, name in enumerate(COMPOUNDS, start=1):
        key = name.lower()
        if key in seen_names:
            continue
        seen_names.add(key)
        row = fetch(name)
        if row:
            records.append(row)
            print(f"[{i}/{len(COMPOUNDS)}] {name} -> CID {row['cid']}")
        time.sleep(0.15)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"\nWrote {len(records)} records to {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
