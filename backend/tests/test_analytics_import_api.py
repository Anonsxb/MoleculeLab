"""Tests for import validation, quality reporting, analytics, and export (FR-09 to FR-12)."""

import io

from fastapi.testclient import TestClient

from app.main import app
from app.services import import_service

client = TestClient(app)

CSV_CONTENT = (
    "name,smiles,external_id,source,notes\n"
    "methanol,CCO,T-01,test,valid\n"
    "water,O,T-02,test,valid\n"
    "ethanol,CCO,T-03,test,exact duplicate input\n"
    "benzene_a,C1=CC=CC=C1,T-04,test,valid\n"
    "benzene_b,c1ccccc1,T-05,test,same canonical structure\n"
    "broken,NOT_A_SMILES,T-06,test,invalid structure\n"
    ",CCO,T-07,test,missing name\n"
)


def test_preview_reports_quality():
    preview = import_service.analyze_import(CSV_CONTENT, "test.csv", "Preview", "")
    assert preview.quality.total_rows_read == 7
    assert preview.quality.accepted_rows == 3
    assert preview.quality.invalid_structures == 1
    assert preview.quality.missing_required_fields == 1
    assert preview.quality.duplicate_records == 2
    # The invalid structure sits on line 7 of the CSV (line 1 is the header).
    assert preview.rejected[0].row_number == 7


def test_duplicate_detection_distinguishes_kinds():
    preview = import_service.analyze_import(CSV_CONTENT, "test.csv", "Preview", "")
    reasons = {d.reason for d in preview.duplicates}
    assert "exact_input_duplicate" in reasons
    assert "identical_canonical_structure" in reasons


def test_full_import_flow_over_http():
    payload = {
        "file": ("import.csv", io.BytesIO(CSV_CONTENT.encode("utf-8")), "text/csv")
    }
    preview = client.post(
        "/api/datasets/import/preview",
        params={"dataset_name": "Pytest Import Dataset", "description": "test"},
        files=payload,
    )
    assert preview.status_code == 200
    body = preview.json()
    assert body["quality"]["accepted_rows"] == 3

    confirm = client.post(
        "/api/datasets/import",
        json={
            "filename": "import.csv",
            "dataset_name": "Pytest Import Dataset 1",
            "description": "test",
            "source_name": "pytest",
            "records": body["accepted"],
            "quality": body["quality"],
        },
    )
    assert confirm.status_code == 200
    result = confirm.json()
    # Accepted rows either create a molecule or link to an identical existing structure.
    assert result["created"] + result["skipped_duplicates"] == 3

    dataset = client.get(f"/api/datasets/{result['dataset_id']}").json()
    assert dataset["record_count"] == 3
    assert dataset["source_name"] == "pytest"


def test_non_csv_upload_is_rejected():
    payload = {"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}
    response = client.post("/api/datasets/import/preview", files=payload)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_FILE_TYPE"


def test_distribution_endpoint():
    result = client.get(
        "/api/analytics/distribution", params={"descriptor": "logp", "bins": 10}
    ).json()
    assert result["included_count"] > 0
    assert result["missing_count"] == 0
    assert len(result["bins"]) == 10
    assert result["unit"] == "dimensionless"
    assert result["min"] <= result["median"] <= result["max"]


def test_distribution_rejects_unknown_descriptor():
    response = client.get("/api/analytics/distribution", params={"descriptor": "nonsense"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_DESCRIPTOR"


def test_summary_endpoint_reports_reference_values():
    result = client.get("/api/analytics/summary").json()
    assert result["record_count"] > 0
    assert len(result["descriptors"]) == 5
    by_key = {d["key"]: d for d in result["descriptors"]}
    assert by_key["molecular_weight"]["median"] is not None
    assert by_key["molecular_weight"]["min"] <= by_key["molecular_weight"]["median"]
    assert by_key["molecular_weight"]["median"] <= by_key["molecular_weight"]["max"]
    assert by_key["logp"]["unit"] == "dimensionless"


def test_scatter_endpoint():
    result = client.get(
        "/api/analytics/scatter", params={"x": "molecular_weight", "y": "logp"}
    ).json()
    assert result["included_count"] > 0
    for point in result["points"]:
        assert point["x"] is not None and point["y"] is not None


def test_export_respects_filters():
    response = client.get("/api/export.csv", params={"logp_min": 2})
    assert response.status_code == 200
    lines = [line for line in response.text.splitlines() if line.strip()]
    assert len(lines) > 1
    assert "molecule_id" in lines[0]
    assert "logp_crippen_estimate" in lines[0]
    assert "rdkit_version" in lines[0]
    for line in lines[1:]:
        value = float(line.split(",")[8])
        assert value >= 2


def test_export_meta_contains_provenance():
    result = client.get("/api/export/meta").json()
    assert result["rdkit_version"]
    assert result["app_version"]
    assert result["calculation_methodology"]["logp"]
    assert len(result["warnings"]) >= 2


def test_import_job_status_endpoint():
    listing = client.get("/api/datasets").json()
    assert listing["total"] >= 1
    response = client.get("/api/imports/99999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "IMPORT_JOB_NOT_FOUND"
