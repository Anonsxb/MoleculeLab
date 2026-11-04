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
