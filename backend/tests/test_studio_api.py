"""Automated tests for 3D Studio computational chemistry endpoints (Avogadro-level features)."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_studio_presets():
    """Verify curated 3D presets endpoint returns valid molecules."""
    response = client.get("/api/studio/presets")
    assert response.status_code == 200
    data = response.json()
    assert "presets" in data
    assert len(data["presets"]) >= 5
    ids = [p["id"] for p in data["presets"]]
    assert "caffeine" in ids
    assert "benzene" in ids
    assert "water" in ids


def test_studio_build_valid_molecule():
    """Verify 3D conformer generation, hydrogen saturation, and force-field optimization."""
    payload = {
        "smiles": "c1ccccc1",
        "optimize": True,
        "max_iterations": 200,
        "force_field": "MMFF94",
    }
    response = client.post("/api/studio/build", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["formula"] == "C6H6"
    assert data["total_atom_count"] == 12  # 6 C + 6 H
    assert data["total_bond_count"] == 12
    assert len(data["atoms"]) == 12
    assert len(data["bonds"]) == 12
    assert data["force_field"] in ("MMFF94", "UFF")
    assert data["initial_energy_kcal_mol"] is not None
    assert data["final_energy_kcal_mol"] is not None
    assert data["converged"] is True
    assert "pdb" in data["formats"]
    assert "xyz" in data["formats"]
    assert "mol" in data["formats"]
    assert "descriptors" in data
    assert data["descriptors"]["molecular_weight"] is not None
    assert data["descriptors"]["logp"] is not None


def test_studio_build_invalid_smiles():
    """Verify structured error when invalid SMILES is submitted."""
    payload = {
        "smiles": "invalid-chemical-syntax-123",
        "optimize": True,
    }
    response = client.post("/api/studio/build", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_SMILES"


def test_studio_build_empty_smiles():
    """Verify error on empty SMILES."""
    payload = {
        "smiles": "   ",
        "optimize": True,
    }
    response = client.post("/api/studio/build", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data


def test_studio_build_from_graph():
    """Verify building a molecule from an interactive atom and bond graph (Ethanol)."""
    payload = {
        "atoms": [
            {"symbol": "C", "x": 0.0, "y": 0.0, "z": 0.0},
            {"symbol": "C", "x": 1.5, "y": 0.0, "z": 0.0},
            {"symbol": "O", "x": 2.2, "y": 1.2, "z": 0.0},
        ],
        "bonds": [
            {"atom1": 0, "atom2": 1, "order": 1.0},
            {"atom1": 1, "atom2": 2, "order": 1.0},
        ],
        "optimize": True,
        "max_iterations": 200,
        "force_field": "MMFF94",
        "add_hydrogens": True,
    }
    response = client.post("/api/studio/build-from-graph", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["canonical_smiles"] == "CCO"
    assert data["formula"] == "C2H6O"
    assert data["total_atom_count"] == 9  # 2C + 1O + 6H
    assert len(data["atoms"]) == 9
    assert data["descriptors"]["molecular_weight"] > 40.0


def test_studio_build_from_graph_valence_error():
    """Verify chemical valence error detection (e.g. pentavalent carbon)."""
    payload = {
        "atoms": [
            {"symbol": "C", "x": 0.0, "y": 0.0, "z": 0.0},
            {"symbol": "H", "x": 1.0, "y": 0.0, "z": 0.0},
            {"symbol": "H", "x": -1.0, "y": 0.0, "z": 0.0},
            {"symbol": "H", "x": 0.0, "y": 1.0, "z": 0.0},
            {"symbol": "H", "x": 0.0, "y": -1.0, "z": 0.0},
            {"symbol": "H", "x": 0.0, "y": 0.0, "z": 1.0},
        ],
        "bonds": [
            {"atom1": 0, "atom2": 1, "order": 1.0},
            {"atom1": 0, "atom2": 2, "order": 1.0},
            {"atom1": 0, "atom2": 3, "order": 1.0},
            {"atom1": 0, "atom2": 4, "order": 1.0},
            {"atom1": 0, "atom2": 5, "order": 1.0},
        ],
        "optimize": False,
        "add_hydrogens": False,
    }
    response = client.post("/api/studio/build-from-graph", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] in ("VALENCE_ERROR", "GRAPH_BUILD_FAILED")
    assert "valence" in data["error"]["message"].lower()


def test_studio_hydrogens():
    """Verify adding and removing explicit hydrogens."""
    # Test remove hydrogens from ethanol
    remove_resp = client.post("/api/studio/hydrogens", json={"smiles": "CCO", "action": "remove"})
    assert remove_resp.status_code == 200
    remove_data = remove_resp.json()
    assert remove_data["total_atom_count"] == 3  # Heavy atoms only

    # Test add hydrogens to ethanol
    add_resp = client.post("/api/studio/hydrogens", json={"smiles": "CCO", "action": "add"})
    assert add_resp.status_code == 200
    add_data = add_resp.json()
    assert add_data["total_atom_count"] == 9  # Explicit Hs included


def test_studio_search():
    """Verify molecular search across database and chemical lookup."""
    response = client.get("/api/studio/search?q=benzene")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) >= 1


def test_studio_import_file():
    """Verify parsing molecular file (XYZ format)."""
    xyz_content = """3
water
O 0.0000 0.0000 0.0000
H 0.0000 0.7570 0.5870
H 0.0000 -0.7570 0.5870
"""
    response = client.post(
        "/api/studio/import-file",
        json={"content": xyz_content, "filename": "water.xyz"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["formula"] == "H2O"
    assert data["total_atom_count"] == 3


def test_studio_save_to_library():
    """Verify saving a novel molecule to the database library for DrugMatch screening."""
    payload = {
        "name": "Novel Studio Lead 101",
        "smiles": "CC(=O)NC1=CC(F)=C(O)C(Cl)=C1",  # Novel fluoro-chloro acetamidophenol derivative
    }
    response = client.post("/api/studio/save-to-library", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "molecule_id" in data
    assert "Novel Studio Lead 101" in data["name"]
