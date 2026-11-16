"""Computational chemistry service for 3D conformer generation, force-field energy minimization,
molecular graph construction, and quantum/molecular mechanics property inspection (Avogadro/MolView level).

Supports:
- 3D conformer embedding via ETKDGv3 (Experimental-Torsion Knowledge Distance Geometry)
- Force field energy calculation and geometry optimization via MMFF94 / UFF
- Interactive molecular builder graph conversion & valence checking via RDKit RWMol
- Atomic Gasteiger partial charge calculation for electrostatic potential mapping
- Comprehensive molecular descriptors (MW, LogP, HBD, HBA, TPSA, Rotatable Bonds, Lipinski Ro5)
- Standard computational chemistry format exports: PDB, XYZ, SDF/MOL
- File import: SDF, MOL, PDB, XYZ
- Chemical name resolution via local database & PubChem PUG REST
- Direct integration into MoleculeLab / DrugMatch database library
"""

import math
import logging
from typing import Optional, Dict, Any, List, Tuple
import httpx
import rdkit
from rdkit import Chem
from rdkit.Chem import (
    AllChem,
    Descriptors,
    Crippen,
    Lipinski,
    rdMolDescriptors,
    PeriodicTable,
    rdDetermineBonds,
)
from rdkit.Geometry import Point3D
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.molecule import Molecule
from app.models.dataset import Dataset
from app.models.dataset_entry import DatasetEntry

logger = logging.getLogger("moleculelab.studio")

PERIODIC_TABLE = Chem.GetPeriodicTable()

# Standard CPK colors (hex)
CPK_COLORS: Dict[str, str] = {
    "H": "#FFFFFF",
    "C": "#404040",
    "N": "#3050F8",
    "O": "#FF0D0D",
    "F": "#90E050",
    "Cl": "#1FF01F",
    "Br": "#A62929",
    "I": "#940094",
    "P": "#FF8000",
    "S": "#FFFF30",
    "B": "#FFB5B5",
    "Na": "#AB5CF2",
    "K": "#8F40D4",
    "Ca": "#3DFF00",
    "Fe": "#E06633",
    "Zn": "#7D80B0",
    "Cu": "#C88033",
    "Si": "#D9FFFF",
    "Default": "#DD77FF",
}

# Standard covalent radii lookup fallback (Å)
DEFAULT_COVALENT_RADII: Dict[str, float] = {
    "H": 0.31,
    "C": 0.76,
    "N": 0.71,
    "O": 0.66,
    "F": 0.57,
    "P": 1.07,
    "S": 1.05,
    "Cl": 1.02,
    "Br": 1.20,
    "I": 1.39,
}


def _extract_descriptors(mol: Chem.Mol) -> Dict[str, Any]:
    """Calculate standard chemical descriptors and Lipinski Rule of 5 properties."""
    clean_mol = Chem.RemoveHs(mol)
    try:
        mw = float(Descriptors.MolWt(clean_mol))
    except Exception:
        mw = 0.0

    try:
        logp = float(Crippen.MolLogP(clean_mol))
    except Exception:
        logp = 0.0

    try:
        hbd = int(Lipinski.NumHDonors(clean_mol))
    except Exception:
        hbd = 0

    try:
        hba = int(Lipinski.NumHAcceptors(clean_mol))
    except Exception:
        hba = 0

    try:
        tpsa = float(Descriptors.TPSA(clean_mol))
    except Exception:
        tpsa = 0.0

    try:
        rot_bonds = int(rdMolDescriptors.CalcNumRotatableBonds(clean_mol))
    except Exception:
        rot_bonds = 0

    # Lipinski Rule of 5 evaluation (MW <= 500, LogP <= 5, HBD <= 5, HBA <= 10)
    violations = 0
    violation_details = []
    if mw > 500:
        violations += 1
        violation_details.append("Molecular Weight > 500 g/mol")
    if logp > 5.0:
        violations += 1
        violation_details.append("LogP > 5.0")
    if hbd > 5:
        violations += 1
        violation_details.append("H-Bond Donors > 5")
    if hba > 10:
        violations += 1
        violation_details.append("H-Bond Acceptors > 10")

    return {
        "molecular_weight": round(mw, 3),
        "logp": round(logp, 3),
        "hbd": hbd,
        "hba": hba,
        "tpsa": round(tpsa, 2),
        "rotatable_bonds": rot_bonds,
        "lipinski_violations": violations,
        "lipinski_pass": violations <= 1,
        "violation_details": violation_details,
    }


def _mol_to_studio_dict(
    mol_with_coords: Chem.Mol,
    initial_energy: Optional[float] = None,
    final_energy: Optional[float] = None,
    converged: Optional[bool] = None,
    force_field_type: str = "MMFF94",
    input_smiles: str = "",
) -> Dict[str, Any]:
    """Convert an RDKit Mol with 3D coordinates into a structured studio response."""
    conf = mol_with_coords.GetConformer() if mol_with_coords.GetNumConformers() > 0 else None

    # Calculate Gasteiger partial charges
    try:
        AllChem.ComputeGasteigerCharges(mol_with_coords)
    except Exception as exc:
        logger.debug("Gasteiger charges computation failed: %s", exc)

    atoms: List[Dict[str, Any]] = []
    for idx, atom in enumerate(mol_with_coords.GetAtoms()):
        pos_x, pos_y, pos_z = 0.0, 0.0, 0.0
        if conf is not None:
            pos = conf.GetAtomPosition(idx)
            pos_x, pos_y, pos_z = float(pos.x), float(pos.y), float(pos.z)

        sym = atom.GetSymbol()
        charge_val = 0.0
        try:
            val = atom.GetDoubleProp("_GasteigerCharge")
            if not math.isnan(val) and not math.isinf(val):
                charge_val = float(val)
        except Exception:
            charge_val = 0.0

        vdw_radius = 1.70
        cov_radius = DEFAULT_COVALENT_RADII.get(sym, 0.77)
        try:
            vdw_radius = float(PERIODIC_TABLE.GetRvdw(atom.GetAtomicNum()))
            cov_radius = float(PERIODIC_TABLE.GetRcovalent(atom.GetAtomicNum()))
        except Exception:
            pass

        atoms.append({
            "index": idx,
            "symbol": sym,
            "atomic_number": atom.GetAtomicNum(),
            "x": round(pos_x, 4),
            "y": round(pos_y, 4),
            "z": round(pos_z, 4),
            "vdw_radius": round(vdw_radius, 2),
            "covalent_radius": round(cov_radius, 2),
            "gasteiger_charge": round(charge_val, 4),
            "formal_charge": atom.GetFormalCharge(),
            "is_aromatic": atom.GetIsAromatic(),
            "hybridization": str(atom.GetHybridization()),
            "color": CPK_COLORS.get(sym, CPK_COLORS["Default"]),
            "is_hydrogen": sym == "H",
        })

    bonds: List[Dict[str, Any]] = []
    for b_idx, bond in enumerate(mol_with_coords.GetBonds()):
        begin_idx = bond.GetBeginAtomIdx()
        end_idx = bond.GetEndAtomIdx()
        length = 1.45
        if conf is not None:
            p1 = conf.GetAtomPosition(begin_idx)
            p2 = conf.GetAtomPosition(end_idx)
            dx = p1.x - p2.x
            dy = p1.y - p2.y
            dz = p1.z - p2.z
            length = math.sqrt(dx * dx + dy * dy + dz * dz)

        order_val = bond.GetBondTypeAsDouble()
        bonds.append({
            "index": b_idx,
            "atom1": begin_idx,
            "atom2": end_idx,
            "order": float(order_val),
            "is_aromatic": bond.GetIsAromatic(),
            "length": round(length, 3),
        })

    pdb_block = ""
    xyz_block = ""
    mol_block = ""
    if conf is not None:
        try:
            pdb_block = Chem.MolToPDBBlock(mol_with_coords)
            xyz_block = Chem.MolToXYZBlock(mol_with_coords)
            mol_block = Chem.MolToMolBlock(mol_with_coords)
        except Exception as exc:
            logger.debug("Export format generation failed: %s", exc)

    clean_mol = Chem.RemoveHs(mol_with_coords)
    canonical_smiles = Chem.MolToSmiles(clean_mol, canonical=True)
    descriptors = _extract_descriptors(mol_with_coords)

    return {
        "success": True,
        "input_smiles": input_smiles or canonical_smiles,
        "canonical_smiles": canonical_smiles,
        "formula": rdMolDescriptors.CalcMolFormula(mol_with_coords),
        "heavy_atom_count": clean_mol.GetNumHeavyAtoms(),
        "total_atom_count": mol_with_coords.GetNumAtoms(),
        "total_bond_count": mol_with_coords.GetNumBonds(),
        "force_field": force_field_type,
        "initial_energy_kcal_mol": round(initial_energy, 4) if initial_energy is not None else None,
        "final_energy_kcal_mol": round(final_energy, 4) if final_energy is not None else None,
        "energy_delta_kcal_mol": round(final_energy - initial_energy, 4) if (initial_energy is not None and final_energy is not None) else None,
        "converged": converged,
        "atoms": atoms,
        "bonds": bonds,
        "descriptors": descriptors,
        "formats": {
            "pdb": pdb_block,
            "xyz": xyz_block,
            "mol": mol_block,
            "sdf": mol_block,
        },
        "rdkit_version": rdkit.__version__,
    }


def build_3d_conformer(
    smiles: str,
    optimize: bool = True,
    max_iterations: int = 500,
    force_field_type: str = "MMFF94",
) -> Dict[str, Any]:
    """Generate a realistic 3D conformer from a SMILES string, with hydrogen saturation,
    force field geometry optimization (MMFF94 or UFF), and Gasteiger partial charges.
    """
    trimmed = (smiles or "").strip()
    if not trimmed:
        return {
            "success": False,
            "error_code": "EMPTY_SMILES",
            "message": "SMILES string is empty.",
        }

    mol = Chem.MolFromSmiles(trimmed)
    if mol is None:
        return {
            "success": False,
            "error_code": "INVALID_SMILES",
            "message": f"Could not parse SMILES '{trimmed}'. Valence or syntax error.",
        }

    # Add explicit hydrogens for accurate 3D geometry and physical realism
    mol_h = Chem.AddHs(mol)

    # 3D Conformer generation using ETKDGv3 (Distance Geometry)
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    embed_result = AllChem.EmbedMolecule(mol_h, params)
    if embed_result == -1:
        # Fallback to standard ETKDG without random seed
        embed_result = AllChem.EmbedMolecule(mol_h, AllChem.ETKDG())
        if embed_result == -1:
            # Fallback to random coordinates if distance geometry fails
            embed_result = AllChem.EmbedMolecule(mol_h, useRandomCoords=True)
            if embed_result == -1:
                return {
                    "success": False,
                    "error_code": "EMBEDDING_FAILED",
                    "message": "3D conformer embedding failed for this molecular topology.",
                }

    # Force Field energy & optimization
    initial_energy: Optional[float] = None
    final_energy: Optional[float] = None
    converged: Optional[bool] = None
    ff_used = force_field_type.upper()

    try:
        mp = AllChem.MMFFGetMoleculeProperties(mol_h, mmffVariant="MMFF94") if ff_used == "MMFF94" else None
        if mp is not None:
            ff = AllChem.MMFFGetMoleculeForceField(mol_h, mp)
            ff_used = "MMFF94"
        else:
            ff = AllChem.UFFGetMoleculeForceField(mol_h)
            ff_used = "UFF"

        if ff is not None:
            initial_energy = float(ff.CalcEnergy())
            if optimize:
                opt_code = ff.Minimize(maxIts=max_iterations)
                converged = (opt_code == 0)
                final_energy = float(ff.CalcEnergy())
            else:
                final_energy = initial_energy
                converged = True
    except Exception as exc:
        logger.warning("Force field calculation failed: %s", exc)

    return _mol_to_studio_dict(
        mol_with_coords=mol_h,
        initial_energy=initial_energy,
        final_energy=final_energy,
        converged=converged,
        force_field_type=ff_used,
        input_smiles=trimmed,
    )


def build_from_graph(
    atoms_data: List[Dict[str, Any]],
    bonds_data: List[Dict[str, Any]],
    optimize: bool = True,
    max_iterations: int = 500,
    force_field_type: str = "MMFF94",
    use_existing_coords: bool = True,
    add_hydrogens: bool = True,
) -> Dict[str, Any]:
    """Construct an RDKit molecule from an interactive atom/bond graph, validate chemical
    valence, generate/optimize 3D geometry, and return full computational properties.
    """
    if not atoms_data:
        return {
            "success": False,
            "error_code": "EMPTY_GRAPH",
            "message": "The molecular workspace contains no atoms.",
        }

    rw = Chem.RWMol()
    atom_idx_map: Dict[int, int] = {}

    for input_idx, atom in enumerate(atoms_data):
        sym = atom.get("symbol", "C").capitalize().strip()
        try:
            rd_atom = Chem.Atom(sym)
            if "formal_charge" in atom:
                rd_atom.SetFormalCharge(int(atom["formal_charge"]))
            rd_idx = rw.AddAtom(rd_atom)
            atom_idx_map[input_idx] = rd_idx
        except Exception as exc:
            return {
                "success": False,
                "error_code": "INVALID_ELEMENT",
                "message": f"Unsupported or invalid chemical element '{sym}': {exc}",
            }

    for bond in bonds_data:
        a1_in = bond.get("atom1")
        a2_in = bond.get("atom2")
        if a1_in not in atom_idx_map or a2_in not in atom_idx_map:
            continue
        rd_a1 = atom_idx_map[a1_in]
        rd_a2 = atom_idx_map[a2_in]
        if rd_a1 == rd_a2:
            continue

        order_val = float(bond.get("order", 1.0))
        is_aromatic = bool(bond.get("is_aromatic", False))

        bond_type = Chem.BondType.SINGLE
        if is_aromatic or order_val == 1.5:
            bond_type = Chem.BondType.AROMATIC
        elif order_val == 2.0:
            bond_type = Chem.BondType.DOUBLE
        elif order_val == 3.0:
            bond_type = Chem.BondType.TRIPLE

        try:
            rw.AddBond(rd_a1, rd_a2, bond_type)
        except Exception as exc:
            logger.debug("Failed adding bond %s-%s: %s", rd_a1, rd_a2, exc)

    mol = rw.GetMol()

    # Chemical valence and structure validation
    try:
        Chem.SanitizeMol(mol)
    except Exception as val_exc:
        err_msg = str(val_exc)
        return {
            "success": False,
            "error_code": "VALENCE_ERROR",
            "message": f"Chemical valence violation: {err_msg}",
        }

    # Hydrogen handling
    mol_proc = Chem.AddHs(mol) if add_hydrogens else mol

    # Check if we should preserve existing coordinates
    has_valid_coords = use_existing_coords and all(
        "x" in a and "y" in a and "z" in a for a in atoms_data
    )

    embedded = False
    if has_valid_coords and not add_hydrogens:
        # Build conformer from user coordinates
        conf = Chem.Conformer(mol_proc.GetNumAtoms())
        for input_idx, atom in enumerate(atoms_data):
            rd_idx = atom_idx_map[input_idx]
            conf.SetAtomPosition(rd_idx, Point3D(float(atom["x"]), float(atom["y"]), float(atom["z"])))
        conf.Set3D(True)
        mol_proc.AddConformer(conf, assignId=True)
        embedded = True
    else:
        # Distance geometry conformer generation with ETKDGv3
        params = AllChem.ETKDGv3()
        params.randomSeed = 42
        embed_res = AllChem.EmbedMolecule(mol_proc, params)
        if embed_res == -1:
            embed_res = AllChem.EmbedMolecule(mol_proc, AllChem.ETKDG())
            if embed_res == -1:
                embed_res = AllChem.EmbedMolecule(mol_proc, useRandomCoords=True)
        embedded = (embed_res != -1)

    if not embedded:
        return {
            "success": False,
            "error_code": "EMBEDDING_FAILED",
            "message": "Could not generate stable 3D coordinates for this molecular connectivity.",
        }

    # Force Field energy & optimization
    initial_energy: Optional[float] = None
    final_energy: Optional[float] = None
    converged: Optional[bool] = None
    ff_used = force_field_type.upper()

    try:
        mp = AllChem.MMFFGetMoleculeProperties(mol_proc, mmffVariant="MMFF94") if ff_used == "MMFF94" else None
        if mp is not None:
            ff = AllChem.MMFFGetMoleculeForceField(mol_proc, mp)
            ff_used = "MMFF94"
        else:
            ff = AllChem.UFFGetMoleculeForceField(mol_proc)
            ff_used = "UFF"

        if ff is not None:
            initial_energy = float(ff.CalcEnergy())
            if optimize:
                opt_code = ff.Minimize(maxIts=max_iterations)
                converged = (opt_code == 0)
                final_energy = float(ff.CalcEnergy())
            else:
                final_energy = initial_energy
                converged = True
    except Exception as exc:
        logger.warning("Force field calculation failed: %s", exc)

    return _mol_to_studio_dict(
        mol_with_coords=mol_proc,
        initial_energy=initial_energy,
        final_energy=final_energy,
        converged=converged,
        force_field_type=ff_used,
    )


def optimize_existing_geometry(
    atoms_data: List[Dict[str, Any]],
    bonds_data: List[Dict[str, Any]],
    force_field_type: str = "MMFF94",
    max_iterations: int = 300,
) -> Dict[str, Any]:
    """Optimize the current 3D coordinates using MMFF94 / UFF without discarding spatial orientation."""
    return build_from_graph(
        atoms_data=atoms_data,
        bonds_data=bonds_data,
        optimize=True,
        max_iterations=max_iterations,
        force_field_type=force_field_type,
        use_existing_coords=True,
        add_hydrogens=False,
    )


def modify_hydrogens(
    smiles: str,
    action: str = "add",
    force_field_type: str = "MMFF94",
    optimize: bool = True,
) -> Dict[str, Any]:
    """Add or remove explicit hydrogens for a molecule, keeping 3D conformer physically sound."""
    trimmed = (smiles or "").strip()
    if not trimmed:
        return {"success": False, "error_code": "EMPTY_SMILES", "message": "SMILES is empty."}

    mol = Chem.MolFromSmiles(trimmed)
    if mol is None:
        return {"success": False, "error_code": "INVALID_SMILES", "message": "Invalid SMILES."}

    target_mol = Chem.AddHs(mol) if action == "add" else Chem.RemoveHs(mol)
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    AllChem.EmbedMolecule(target_mol, params)

    initial_energy = None
    final_energy = None
    converged = None
    ff_used = force_field_type.upper()

    try:
        mp = AllChem.MMFFGetMoleculeProperties(target_mol, mmffVariant="MMFF94") if ff_used == "MMFF94" else None
        if mp is not None:
            ff = AllChem.MMFFGetMoleculeForceField(target_mol, mp)
            ff_used = "MMFF94"
        else:
            ff = AllChem.UFFGetMoleculeForceField(target_mol)
            ff_used = "UFF"

        if ff is not None:
            initial_energy = float(ff.CalcEnergy())
            if optimize:
                converged = (ff.Minimize(maxIts=300) == 0)
                final_energy = float(ff.CalcEnergy())
            else:
                final_energy = initial_energy
                converged = True
    except Exception as exc:
        logger.warning("Force field minimization failed: %s", exc)

    return _mol_to_studio_dict(
        mol_with_coords=target_mol,
        initial_energy=initial_energy,
        final_energy=final_energy,
        converged=converged,
        force_field_type=ff_used,
        input_smiles=trimmed,
    )


def parse_molecular_file(content: str, filename: str) -> Dict[str, Any]:
    """Parse imported chemical file (MOL, SDF, PDB, XYZ) into 3D Studio conformer."""
    trimmed = (content or "").strip()
    if not trimmed:
        return {"success": False, "error_code": "EMPTY_FILE", "message": "Uploaded file is empty."}

    lower_name = (filename or "").lower()
    mol: Optional[Chem.Mol] = None

    try:
        if lower_name.endswith((".mol", ".sdf")) or "\n  -MOL-" in trimmed or "M  END" in trimmed:
            mol = Chem.MolFromMolBlock(trimmed, removeHs=False)
            if mol is None:
                mol = Chem.MolFromMolBlock(trimmed, removeHs=True)
        elif lower_name.endswith(".pdb") or "COMPND" in trimmed or "HETATM" in trimmed or "ATOM  " in trimmed:
            mol = Chem.MolFromPDBBlock(trimmed, removeHs=False)
            if mol is None:
                mol = Chem.MolFromPDBBlock(trimmed, removeHs=True)
        elif lower_name.endswith(".xyz") or trimmed.split("\n")[0].strip().isdigit():
            mol = Chem.MolFromXYZBlock(trimmed)
            if mol is not None:
                try:
                    rdDetermineBonds.DetermineConnectivity(mol)
                except Exception as exc:
                    logger.debug("XYZ DetermineConnectivity notice: %s", exc)
        else:
            # Try MolBlock first, then PDBBlock
            mol = Chem.MolFromMolBlock(trimmed, removeHs=False)
            if mol is None:
                mol = Chem.MolFromPDBBlock(trimmed, removeHs=False)
    except Exception as exc:
        return {
            "success": False,
            "error_code": "PARSE_EXCEPTION",
            "message": f"Failed parsing file '{filename}': {exc}",
        }

    if mol is None:
        return {
            "success": False,
            "error_code": "PARSE_FAILED",
            "message": f"Unable to parse file '{filename}'. Supported formats: SDF, MOL, PDB, XYZ.",
        }

    # Ensure 3D conformer exists
    if mol.GetNumConformers() == 0:
        params = AllChem.ETKDGv3()
        params.randomSeed = 42
        AllChem.EmbedMolecule(mol, params)

    return _mol_to_studio_dict(
        mol_with_coords=mol,
        force_field_type="MMFF94",
        input_smiles=Chem.MolToSmiles(Chem.RemoveHs(mol), canonical=True),
    )


def search_or_resolve_molecule(query: str, db: Session) -> Dict[str, Any]:
    """Search for a molecule across the local database and chemical resolver (PubChem API fallback)."""
    clean_q = (query or "").strip()
    if not clean_q:
        return {"results": []}

    results: List[Dict[str, Any]] = []

    # 1. Check local MoleculeLab database
    pattern = f"%{clean_q}%"
    db_matches = (
        db.query(Molecule)
        .filter(
            or_(
                Molecule.display_name.ilike(pattern),
                Molecule.canonical_smiles.ilike(pattern),
                Molecule.original_smiles.ilike(pattern),
                Molecule.formula.ilike(pattern),
            )
        )
        .limit(6)
        .all()
    )

    for m in db_matches:
        results.append({
            "id": str(m.id),
            "name": m.display_name,
            "smiles": m.canonical_smiles or m.original_smiles,
            "formula": m.formula,
            "molecular_weight": m.mol_wt,
            "source": m.source_name or "MoleculeLab Library",
            "in_database": True,
        })

    # If user provided a valid SMILES directly, offer it
    direct_mol = Chem.MolFromSmiles(clean_q)
    if direct_mol is not None:
        can_smiles = Chem.MolToSmiles(direct_mol, canonical=True)
        if not any(r["smiles"] == can_smiles for r in results):
            results.insert(0, {
                "id": "direct_smiles",
                "name": f"SMILES: {clean_q}",
                "smiles": can_smiles,
                "formula": rdMolDescriptors.CalcMolFormula(direct_mol),
                "molecular_weight": round(float(Descriptors.MolWt(direct_mol)), 2),
                "source": "Direct SMILES Input",
                "in_database": False,
            })

    # 2. If results are sparse and query looks like a name, query PubChem PUG REST
    if len(results) < 5 and not direct_mol and len(clean_q) >= 2:
        try:
            pubchem_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{clean_q}/property/CanonicalSMILES,Title,MolecularFormula,MolecularWeight/JSON"
            with httpx.Client(timeout=3.0) as client:
                resp = client.get(pubchem_url)
                if resp.status_code == 200:
                    data = resp.json()
                    props = data.get("PropertyTable", {}).get("Properties", [])
                    for p in props[:4]:
                        smi = p.get("CanonicalSMILES") or p.get("ConnectivitySMILES")
                        if smi and not any(r["smiles"] == smi for r in results):
                            results.append({
                                "id": f"pubchem_{p.get('CID')}",
                                "name": p.get("Title") or clean_q.capitalize(),
                                "smiles": smi,
                                "formula": p.get("MolecularFormula"),
                                "molecular_weight": float(p.get("MolecularWeight", 0)) if p.get("MolecularWeight") else None,
                                "source": "PubChem NIH",
                                "in_database": False,
                            })
        except Exception as exc:
            logger.debug("PubChem name lookup skipped or timed out for %r: %s", clean_q, exc)

    return {"results": results}


def save_studio_molecule(
    db: Session,
    name: str,
    smiles: str,
) -> Dict[str, Any]:
    """Save a designed or modified molecule from 3D Studio directly into the MoleculeLab / DrugMatch library."""
    trimmed_smiles = (smiles or "").strip()
    clean_name = (name or "").strip() or "Custom Studio Compound"

    if not trimmed_smiles:
        return {"success": False, "message": "Cannot save empty SMILES structure."}

    mol = Chem.MolFromSmiles(trimmed_smiles)
    if mol is None:
        return {"success": False, "message": "Cannot save chemically invalid SMILES structure."}

    can_smiles = Chem.MolToSmiles(mol, canonical=True)
    formula = rdMolDescriptors.CalcMolFormula(mol)
    descriptors = _extract_descriptors(mol)

    # Check if already exists in molecules table
    existing = db.query(Molecule).filter(Molecule.canonical_smiles == can_smiles).first()
    if existing:
        return {
            "success": True,
            "molecule_id": existing.id,
            "name": existing.display_name,
            "smiles": existing.canonical_smiles,
            "already_existed": True,
            "message": f"Molecule already exists in library as '{existing.display_name}'.",
        }

    # Find or create a Studio Dataset for user-designed molecules
    dataset = db.query(Dataset).filter(Dataset.name == "Studio Designed Molecules").first()
    if not dataset:
        dataset = Dataset(
            name="Studio Designed Molecules",
            description="Molecules created or modified interactively in the MoleculeLab 3D Studio.",
            source_name="MoleculeLab 3D Studio",
            version_label="1.0",
        )
        db.add(dataset)
        db.flush()

    new_mol = Molecule(
        display_name=clean_name,
        formula=formula,
        original_smiles=trimmed_smiles,
        canonical_smiles=can_smiles,
        source_name="MoleculeLab 3D Studio",
        mol_wt=descriptors["molecular_weight"],
        logp=descriptors["logp"],
        hbd=descriptors["hbd"],
        hba=descriptors["hba"],
        tpsa=descriptors["tpsa"],
        calculation_failed=False,
        descriptor_rdkit_version=rdkit.__version__,
    )
    db.add(new_mol)
    db.flush()

    entry = DatasetEntry(
        dataset_id=dataset.id,
        molecule_id=new_mol.id,
        validation_status="valid",
        validation_message="Validated by RDKit during 3D Studio modeling session.",
    )
    db.add(entry)
    db.commit()
    db.refresh(new_mol)

    return {
        "success": True,
        "molecule_id": new_mol.id,
        "name": new_mol.display_name,
        "smiles": new_mol.canonical_smiles,
        "already_existed": False,
        "message": f"Successfully saved '{new_mol.display_name}' to MoleculeLab library for screening.",
    }
