"""Chemistry computation service wrapping RDKit for structure parsing and descriptor derivation.

All chemistry in MoleculeLab runs here, on the backend. This module is the single
authoritative source for SMILES parsing, canonicalisation, formula generation,
descriptor calculation, and 2D depiction.
"""

from typing import Optional, Dict
import logging

import rdkit
from rdkit import Chem
from rdkit.Chem import Descriptors, Crippen, Lipinski, rdMolDescriptors

logger = logging.getLogger("moleculelab.chemistry")

# 2D depiction is imported defensively: some RDKit distributions ship without the
# drawing module. Descriptor calculation must never depend on it.
try:  # pragma: no cover - depends on the installed RDKit distribution
    from rdkit.Chem.Draw import MolDraw2DSVG  # type: ignore

    _DRAW_AVAILABLE = True
except Exception as exc:  # pragma: no cover
    _DRAW_AVAILABLE = False
    logger.warning("2D depiction unavailable in this RDKit build: %s", exc)


CALCULATION_METHODS = {
    "molecular_weight": "rdkit.Chem.Descriptors.MolWt (g/mol)",
    "logp": "rdkit.Chem.Crippen.MolLogP (Crippen contribution estimate, dimensionless)",
    "hbd": "rdkit.Chem.Lipinski.NumHDonors (count)",
    "hba": "rdkit.Chem.Lipinski.NumHAcceptors (count)",
    "tpsa": "rdkit.Chem.Descriptors.TPSA (Å²)",
}

DESCRIPTOR_LABELS = {
    "molecular_weight": "Molecular Weight",
    "logp": "LogP (Crippen estimate)",
    "hbd": "Hydrogen-Bond Donors",
    "hba": "Hydrogen-Bond Acceptors",
    "tpsa": "Topological Polar Surface Area",
}

DESCRIPTOR_UNITS = {
    "molecular_weight": "g/mol",
    "logp": "dimensionless",
    "hbd": "count",
    "hba": "count",
    "tpsa": "Å²",
}


def parse_smiles(raw: str) -> Optional[Chem.Mol]:
    """Parse a SMILES string, returning the molecule or None when invalid."""
    if raw is None:
        return None
    trimmed = raw.strip()
    if not trimmed:
        return None
    try:
        mol = Chem.MolFromSmiles(trimmed)
    except Exception as exc:  # RDKit may raise on malformed grammar
        logger.info("SMILES parse exception for %r: %s", trimmed, exc)
        return None
    return mol


def canonical_smiles(mol: Chem.Mol) -> Optional[str]:
    """Return the canonical SMILES of a parsed molecule."""
    try:
        return Chem.MolToSmiles(mol, canonical=True)
    except Exception:
        return None


def molecular_formula(mol: Chem.Mol) -> Optional[str]:
    """Return the Hill-notation molecular formula of a parsed molecule."""
    try:
        return rdMolDescriptors.CalcMolFormula(mol)
    except Exception:
        return None


def calculate_descriptors(mol: Chem.Mol) -> Dict[str, Optional[float]]:
    """Calculate the five supported descriptors at full precision.

    Individual descriptor failures are isolated so one bad value does not discard
    the others. Missing results are kept as None, never zero (PRD 6.3).
    """
    values: Dict[str, Optional[float]] = {}
    try:
        values["molecular_weight"] = float(Descriptors.MolWt(mol))
    except Exception as exc:
        logger.warning("MolWt failed: %s", exc)
        values["molecular_weight"] = None
    try:
        values["logp"] = float(Crippen.MolLogP(mol))
    except Exception as exc:
        logger.warning("MolLogP failed: %s", exc)
        values["logp"] = None
    try:
        values["hbd"] = int(Lipinski.NumHDonors(mol))
    except Exception as exc:
        logger.warning("NumHDonors failed: %s", exc)
        values["hbd"] = None
    try:
        values["hba"] = int(Lipinski.NumHAcceptors(mol))
    except Exception as exc:
        logger.warning("NumHAcceptors failed: %s", exc)
        values["hba"] = None
    try:
        values["tpsa"] = float(Descriptors.TPSA(mol))
    except Exception as exc:
        logger.warning("TPSA failed: %s", exc)
        values["tpsa"] = None
    return values


def descriptors_complete(values: Dict[str, Optional[float]]) -> bool:
    """True when every supported descriptor produced a value."""
    return all(values.get(key) is not None for key in CALCULATION_METHODS)


def generate_structure_svg(mol: Chem.Mol, width: int = 320, height: int = 240) -> Optional[str]:
    """Render a clean 2D SVG depiction of the parsed molecule."""
    if not _DRAW_AVAILABLE:
        return None
    try:
        mol_copy = Chem.Mol(mol)
        rdMolDraw2D = MolDraw2DSVG  # local alias for clarity
        drawer = rdMolDraw2D(width, height)
        opts = drawer.drawOptions()
        opts.clearBackground = True
        opts.bondLineWidth = 2.0
        opts.minFontSize = 12
        opts.maxFontSize = 24
        drawer.DrawMolecule(mol_copy)
        drawer.FinishDrawing()
        return drawer.GetDrawingText()
    except Exception as exc:
        logger.warning("SVG generation failed: %s", exc)
        return None


def drawing_available() -> bool:
    """Whether 2D depiction is supported by the installed RDKit build."""
    return _DRAW_AVAILABLE


def describe_molecule(raw_smiles: str) -> Dict:
    """Validate and fully analyse a SMILES string.

    Returns a structured dictionary instead of raising: callers map it directly to
    the API response schema (PRD FR-04).
    """
    result: Dict = {
        "valid": False,
        "status": "",
        "original_smiles": raw_smiles,
        "canonical_smiles": None,
        "formula": None,
        "descriptors": None,
        "structure_svg": None,
        "rdkit_version": rdkit.__version__,
        "calculation_methods": dict(CALCULATION_METHODS),
        "error_message": None,
        "error_code": None,
        "details": None,
    }

    if raw_smiles is None or not raw_smiles.strip():
        result.update(
            status="MISSING_INPUT",
            error_code="MISSING_SMILES",
            error_message="No SMILES string was supplied.",
        )
        return result

    mol = parse_smiles(raw_smiles)
    if mol is None:
        result.update(
            status="INVALID_STRUCTURE",
            error_code="INVALID_SMILES",
            error_message=(
                "The supplied molecular structure could not be parsed. The SMILES string "
                "violates chemical valence or grammar rules."
            ),
        )
        return result

    result["canonical_smiles"] = canonical_smiles(mol)
    result["formula"] = molecular_formula(mol)

    values = calculate_descriptors(mol)
    if not descriptors_complete(values):
        result.update(
            status="CALCULATION_FAILURE",
            error_code="CALCULATION_FAILURE",
            error_message="The structure parsed but one or more descriptors could not be calculated.",
        )
        return result

    result.update(
        valid=True,
        status="VALID",
        descriptors=values,
        structure_svg=generate_structure_svg(mol),
    )
    return result
