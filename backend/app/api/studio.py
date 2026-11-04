"""API endpoints for the 3D Computational Chemistry Studio (Avogadro-level features)."""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.molecule import Molecule
from app.services.studio_service import build_3d_conformer

router = APIRouter(prefix="/studio", tags=["3D Studio"])


class StudioBuildRequest(BaseModel):
    smiles: str = Field(..., description="SMILES string to embed in 3D and optimize")
    optimize: bool = Field(True, description="Run force-field energy minimization")
    max_iterations: int = Field(500, ge=1, le=2000, description="Max minimization iterations")
    force_field: str = Field("MMFF94", description="Force field: MMFF94 or UFF")


PRESETS = [
    {
        "id": "caffeine",
        "name": "Caffeine",
        "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
        "category": "Bioactive Heterocycles",
        "description": "Central nervous system stimulant; planar bicyclic purine core with methyl substituents.",
    },
    {
        "id": "aspirin",
        "name": "Aspirin (Acetylsalicylic Acid)",
        "smiles": "CC(=O)Oc1ccccc1C(=O)O",
        "category": "Pharmaceuticals",
        "description": "Widely used NSAID; ester group ortho to carboxylic acid on benzene ring.",
    },
    {
        "id": "benzene",
        "name": "Benzene",
        "smiles": "c1ccccc1",
        "category": "Aromatic Hydrocarbons",
        "description": "Archetypal planar aromatic ring with delocalized pi electron system (D6h symmetry).",
    },
    {
        "id": "water",
        "name": "Water",
        "smiles": "O",
        "category": "Inorganics",
        "description": "Fundamental solvent; bent geometry with H-O-H angle approx 104.5 degrees.",
    },
    {
        "id": "glucose",
        "name": "D-Glucose (Pyranose)",
        "smiles": "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O",
        "category": "Carbohydrates",
        "description": "Primary metabolic fuel; adopts a stable 4C1 chair conformation.",
    },
    {
        "id": "atp",
        "name": "Adenosine Triphosphate (ATP)",
        "smiles": "Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]1O",
        "category": "Biochemical Energy",
        "description": "Universal biological energy currency containing high-energy phosphoanhydride bonds.",
    },
    {
        "id": "penicillin",
        "name": "Penicillin G",
        "smiles": "CC1(C)S[C@@H]2[C@H](NC(=O)Cc3ccccc3)C(=O)N2[C@H]1C(=O)O",
        "category": "Antibiotics",
        "description": "Classic beta-lactam antibiotic with fused strained 4-membered lactam ring.",
    },
    {
        "id": "dopamine",
        "name": "Dopamine",
        "smiles": "NCCc1ccc(O)c(O)c1",
        "category": "Neurotransmitters",
        "description": "Key catecholamine neurotransmitter modulating motivation, reward, and motor control.",
    },
]


@router.get("/presets")
def list_presets():
    """Return curated preset molecules for instant 3D exploration and teaching."""
    return {"presets": PRESETS}


@router.post("/build")
def build_conformer(req: StudioBuildRequest):
    """Build a 3D conformer, calculate MMFF94 force field energy, and optimize geometry."""
    result = build_3d_conformer(
        smiles=req.smiles,
        optimize=req.optimize,
        max_iterations=req.max_iterations,
        force_field_type=req.force_field,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": result.get("error_code", "BUILD_FAILED"),
                    "message": result.get("message", "Could not build 3D conformer."),
                }
            },
        )
    return result


@router.get("/molecule/{molecule_id}")
def build_from_database(
    molecule_id: str,
    optimize: bool = Query(True),
    force_field: str = Query("MMFF94"),
    db: Session = Depends(get_db),
):
    """Load a molecule by its ID from the MoleculeLab database and compute its 3D geometry."""
    mol_rec = db.query(Molecule).filter(Molecule.id == molecule_id).first()
    if not mol_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Molecule '{molecule_id}' not found.",
                }
            },
        )

    smiles = mol_rec.canonical_smiles or mol_rec.original_smiles
    result = build_3d_conformer(
        smiles=smiles,
        optimize=optimize,
        force_field_type=force_field,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": result.get("error_code", "BUILD_FAILED"),
                    "message": result.get("message", "Could not build 3D conformer."),
                }
            },
        )
    result["molecule_id"] = mol_rec.id
    result["name"] = mol_rec.name
    return result
