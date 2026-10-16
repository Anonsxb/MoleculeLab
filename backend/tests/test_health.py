"""Tests for health endpoints, chemistry validation, and error response format (FR-04, FR-13)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import chemistry

client = TestClient(app)


# --------------------------------------------------------------------------- #
# Health & API contract
# --------------------------------------------------------------------------- #

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "MoleculeLab"
    assert data["version"] == "1.0.0"
    assert data["rdkit_version"] != "not installed"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["health"] == "/api/health"


def test_not_found_structured_error():
    response = client.get("/api/unknown_route_404")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]
    assert "stack" not in response.text.lower()


# --------------------------------------------------------------------------- #
# SMILES validation (FR-04)
# --------------------------------------------------------------------------- #

def test_valid_ethanol():
    result = chemistry.describe_molecule("CCO")
    assert result["valid"] is True
    assert result["status"] == "VALID"
    assert result["original_smiles"] == "CCO"
    assert result["canonical_smiles"] == "CCO"
    assert result["formula"] == "C2H6O"
    assert result["descriptors"]["molecular_weight"] == pytest.approx(46.069, abs=0.01)
    assert result["descriptors"]["logp"] == pytest.approx(-0.0014, abs=0.01)
    assert result["descriptors"]["hbd"] == 1
    assert result["descriptors"]["hba"] == 1
    assert result["descriptors"]["tpsa"] == pytest.approx(20.23, abs=0.01)
    assert result["structure_svg"] is not None
    assert "<svg" in result["structure_svg"]


def test_valid_caffeine():
    result = chemistry.describe_molecule("CN1C=NC2=C1C(=O)N(C(=O)N2C)C")
    assert result["valid"] is True
    assert result["formula"] == "C8H10N4O2"
    assert result["descriptors"]["logp"] == pytest.approx(-1.0293, abs=0.01)
    assert result["descriptors"]["tpsa"] == pytest.approx(61.82, abs=0.01)
    assert result["descriptors"]["hbd"] == 0
    # RDKit's Lipinski.NumHAcceptors reports 3 acceptors for caffeine.
    assert result["descriptors"]["hba"] == 3
    assert 194.0 < result["descriptors"]["molecular_weight"] < 195.0


def test_invalid_smiles_returns_structured_error():
    result = chemistry.describe_molecule("C1CC111INVALID")
    assert result["valid"] is False
    assert result["status"] == "INVALID_STRUCTURE"
    assert result["error_code"] == "INVALID_SMILES"
    assert result["descriptors"] is None


def test_empty_smiles():
    result = chemistry.describe_molecule("   ")
    assert result["valid"] is False
    assert result["status"] == "MISSING_INPUT"


def test_validate_endpoint_accepts_valid_input():
    response = client.post("/api/molecules/validate", json={"smiles": "CCO"})
    assert response.status_code == 200
    assert response.json()["valid"] is True


def test_validate_endpoint_rejects_broken_input():
    response = client.post("/api/molecules/validate", json={"smiles": "not-a-smiles"})
    assert response.status_code == 200  # validation failure is a result, not a server error
    data = response.json()
    assert data["valid"] is False
    assert data["status"] == "INVALID_STRUCTURE"


def test_validate_endpoint_requires_smiles_field():
    response = client.post("/api/molecules/validate", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_missing_values_are_never_zero():
    """A molecule with no H-bond donors must keep a valid zero (PRD 6.3)."""
    result = chemistry.describe_molecule("CCCCCC")  # hexane: zero donors is real
    assert result["descriptors"]["hbd"] == 0
    assert result["descriptors"]["hba"] == 0


# --------------------------------------------------------------------------- #
# Descriptor coverage (AC-04)
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "smiles,expected",
    [
        ("CCO", {"molecular_weight": pytest.approx(46.069, abs=0.01)}),
        ("c1ccccc1", {"molecular_weight": pytest.approx(78.114, abs=0.01)}),
        ("CC(=O)Oc1ccccc1C(=O)O", {"tpsa": pytest.approx(63.6, abs=0.01)}),
    ],
)
def test_descriptor_calculations(smiles, expected):
    result = chemistry.describe_molecule(smiles)
    assert result["valid"] is True
    for key, value in expected.items():
        assert result["descriptors"][key] == value
