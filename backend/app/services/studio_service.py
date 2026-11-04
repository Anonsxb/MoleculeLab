"""Computational chemistry service for 3D conformer generation, force-field energy minimization,
and quantum/molecular mechanics property inspection (Avogadro-level computational capabilities).

Supports:
- 3D conformer embedding via ETKDGv3 (Experimental-Torsion Knowledge Distance Geometry)
- Force field energy calculation and geometry optimization via MMFF94 / UFF
- Atomic Gasteiger partial charge calculation for electrostatic potential mapping
- Structural geometry derivation (bond lengths, bond angles, dihedral angles)
- Standard computational chemistry format exports: PDB, XYZ, SDF/MOL
"""

import math
import logging
from typing import Optional, Dict, Any, List
import rdkit
from rdkit import Chem
from rdkit.Chem import AllChem, rdMolDescriptors, PeriodicTable

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
    "Default": "#DD77FF",
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

    # Calculate Gasteiger partial charges (electrostatic model)
    try:
        AllChem.ComputeGasteigerCharges(mol_h)
    except Exception as exc:
        logger.warning("Gasteiger charges computation failed: %s", exc)

    # Force Field energy & optimization
    initial_energy: Optional[float] = None
    final_energy: Optional[float] = None
    converged: Optional[bool] = None
    ff_used = force_field_type

    ff = None
    try:
        mp = AllChem.MMFFGetMoleculeProperties(mol_h, mmffVariant="MMFF94") if force_field_type.upper() == "MMFF94" else None
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

    conf = mol_h.GetConformer()

    # Extract atoms
    atoms: List[Dict[str, Any]] = []
    for idx, atom in enumerate(mol_h.GetAtoms()):
        pos = conf.GetAtomPosition(idx)
        sym = atom.GetSymbol()
        charge_val = 0.0
        try:
            val = atom.GetDoubleProp("_GasteigerCharge")
            if not math.isnan(val) and not math.isinf(val):
                charge_val = float(val)
        except Exception:
            charge_val = 0.0

        vdw_radius = 1.70
        cov_radius = 0.77
        try:
            vdw_radius = float(PERIODIC_TABLE.GetRvdw(atom.GetAtomicNum()))
            cov_radius = float(PERIODIC_TABLE.GetRcovalent(atom.GetAtomicNum()))
        except Exception:
            pass

        atoms.append({
            "index": idx,
            "symbol": sym,
            "atomic_number": atom.GetAtomicNum(),
            "x": round(float(pos.x), 4),
            "y": round(float(pos.y), 4),
            "z": round(float(pos.z), 4),
            "vdw_radius": round(vdw_radius, 2),
            "covalent_radius": round(cov_radius, 2),
            "gasteiger_charge": round(charge_val, 4),
            "formal_charge": atom.GetFormalCharge(),
            "is_aromatic": atom.GetIsAromatic(),
            "hybridization": str(atom.GetHybridization()),
            "color": CPK_COLORS.get(sym, CPK_COLORS["Default"]),
            "is_hydrogen": sym == "H",
        })

    # Extract bonds
    bonds: List[Dict[str, Any]] = []
    for bond in mol_h.GetBonds():
        begin_idx = bond.GetBeginAtomIdx()
        end_idx = bond.GetEndAtomIdx()
        pos1 = conf.GetAtomPosition(begin_idx)
        pos2 = conf.GetAtomPosition(end_idx)
        dx = pos1.x - pos2.x
        dy = pos1.y - pos2.y
        dz = pos1.z - pos2.z
        length = math.sqrt(dx * dx + dy * dy + dz * dz)

        order_val = bond.GetBondTypeAsDouble()
        bonds.append({
            "atom1": begin_idx,
            "atom2": end_idx,
            "order": float(order_val),
            "is_aromatic": bond.GetIsAromatic(),
            "length": round(length, 3),
        })

    # Export formats
    pdb_block = ""
    xyz_block = ""
    mol_block = ""
    try:
        pdb_block = Chem.MolToPDBBlock(mol_h)
        xyz_block = Chem.MolToXYZBlock(mol_h)
        mol_block = Chem.MolToMolBlock(mol_h)
    except Exception as exc:
        logger.warning("Export format generation failed: %s", exc)

    return {
        "success": True,
        "input_smiles": trimmed,
        "canonical_smiles": Chem.MolToSmiles(mol, canonical=True),
        "formula": rdMolDescriptors.CalcMolFormula(mol_h),
        "heavy_atom_count": mol.GetNumHeavyAtoms(),
        "total_atom_count": mol_h.GetNumAtoms(),
        "total_bond_count": mol_h.GetNumBonds(),
        "force_field": ff_used,
        "initial_energy_kcal_mol": round(initial_energy, 4) if initial_energy is not None else None,
        "final_energy_kcal_mol": round(final_energy, 4) if final_energy is not None else None,
        "energy_delta_kcal_mol": round(final_energy - initial_energy, 4) if (initial_energy is not None and final_energy is not None) else None,
        "converged": converged,
        "atoms": atoms,
        "bonds": bonds,
        "formats": {
            "pdb": pdb_block,
            "xyz": xyz_block,
            "mol": mol_block,
        },
        "rdkit_version": rdkit.__version__,
    }
