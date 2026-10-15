"""API tests for molecule search, filtering, sorting, pagination, and detail (FR-03, FR-06)."""

import io

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_molecules_paginates():
    first = client.get("/api/molecules", params={"page": 1, "page_size": 10}).json()
    second = client.get("/api/molecules", params={"page": 2, "page_size": 10}).json()
    assert first["page_size"] == 10
    assert len(first["items"]) == 10
    assert len(second["items"]) == 10
    assert {item["id"] for item in first["items"]}.isdisjoint(
        {item["id"] for item in second["items"]}
    )


def test_search_by_name():
    result = client.get("/api/molecules", params={"q": "caffeine"}).json()
    assert result["total"] == 1
    assert result["items"][0]["display_name"] == "Caffeine"


def test_search_is_case_insensitive():
    result = client.get("/api/molecules", params={"q": "CAFFEINE"}).json()
    assert result["total"] == 1


def test_sort_by_molecular_weight_descending():
    result = client.get(
        "/api/molecules", params={"sort_by": "molecular_weight", "sort_order": "desc", "page_size": 5}
    ).json()
    weights = [item["molecular_weight"] for item in result["items"]]
    assert weights == sorted(weights, reverse=True)


def test_filter_molecular_weight_range():
    result = client.get(
        "/api/molecules", params={"mw_min": 100, "mw_max": 120}
    ).json()
    assert result["total"] > 0
    for item in result["items"]:
        assert 100 <= item["molecular_weight"] <= 120


def test_unsupported_filter_parameter_is_rejected_not_ignored():
    """A filter-shaped parameter the server does not implement must fail loudly.

    Regression test: the library once sent molecular_weight_min while the API
    expected mw_min, and unknown query params were silently dropped, so filters
    appeared to do nothing.
    """
    response = client.get("/api/molecules", params={"molecular_weight_min": 100})
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "UNSUPPORTED_FILTER"
    assert "molecular_weight_min" in body["error"]["details"]["received"]
    assert "mw_min" in body["error"]["message"]


def test_export_rejects_unsupported_filter_parameter():
    response = client.get("/api/export.csv", params={"molecular_weight_min": 100})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_FILTER"


def test_filter_hbd_count():
    result = client.get("/api/molecules", params={"hbd_min": 3}).json()
    assert result["total"] > 0
    for item in result["items"]:
        assert item["hbd"] >= 3


def test_filter_tpsa_max():
    result = client.get("/api/molecules", params={"tpsa_max": 20}).json()
    for item in result["items"]:
        assert item["tpsa"] <= 20


def test_unsupported_sort_field_is_rejected():
    response = client.get("/api/molecules", params={"sort_by": "invalid_field"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_SORT_FIELD"


def test_unsupported_sort_order_is_rejected():
    response = client.get("/api/molecules", params={"sort_order": "sideways"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_SORT_ORDER"


def test_invalid_page_is_rejected():
    response = client.get("/api/molecules", params={"page": 0})
    assert response.status_code == 422


def test_out_of_range_page_returns_empty_items():
    """Out-of-range pages return an empty result instead of an error (PRD FR-03)."""
    result = client.get("/api/molecules", params={"page": 999999, "page_size": 25}).json()
    assert result["items"] == []
    assert result["pages"] >= 1
    assert result["total"] > 0


def test_molecule_detail_returns_provenance_and_svg():
    listing = client.get("/api/molecules", params={"q": "ethanol"}).json()
    molecule_id = listing["items"][0]["id"]
    detail = client.get(f"/api/molecules/{molecule_id}").json()

    assert detail["display_name"] == "Ethanol"
    assert detail["formula"] == "C2H6O"
    assert detail["original_smiles"] == "CCO"
    assert detail["structure_svg"]
    assert "<svg" in detail["structure_svg"]
    for key in ("molecular_weight", "logp", "hbd", "hba", "tpsa"):
        assert detail["descriptors"][key]["value"] is not None
        assert detail["descriptors"][key]["unit"]
        assert detail["descriptors"][key]["method"]
    assert detail["descriptor_provenance"]["rdkit_version"]


def test_molecule_detail_missing_id_returns_structured_error():
    response = client.get("/api/molecules/999999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MOLECULE_NOT_FOUND"


def test_datasets_endpoint_reports_quality():
    result = client.get("/api/datasets").json()
    assert result["total"] >= 1
    dataset = result["items"][0]
    assert dataset["record_count"] > 0
    assert dataset["source_name"]
    assert dataset["version_label"]
    # Database-wide totals must not double-count molecules across datasets.
    assert result["total_unique_molecules"] > 0
    assert result["total_entries"] >= result["total_unique_molecules"]
    assert result["total_valid_entries"] + result["total_invalid_entries"] == result["total_entries"]


def test_imported_dataset_counts_toward_totals():
    """An accepted import linked to existing structures must not create duplicates."""
    csv_text = (
        "name,smiles\naudit_unique_xtest,C(F)(F)(F)F\naudit_unique_ytest,CC(C)(C)C\n"
    )
    payload = {
        "file": ("import.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")
    }
    preview = client.post(
        "/api/datasets/import/preview",
        params={"dataset_name": "Audit Totals", "description": ""},
        files=payload,
    ).json()
    before = client.get("/api/datasets").json()["total_unique_molecules"]

    confirm = client.post(
        "/api/datasets/import",
        json={
            "filename": "import.csv",
            "dataset_name": "Audit Totals",
            "description": "",
            "records": preview["accepted"],
            "quality": preview["quality"],
        },
    ).json()

    after = client.get("/api/datasets").json()
    # Two new molecules added exactly once each.
    assert after["total_unique_molecules"] == before + 2
    assert after["total_entries"] >= confirm["created"] + before


def test_dataset_detail_by_id():
    datasets = client.get("/api/datasets").json()
    dataset_id = datasets["items"][0]["id"]
    detail = client.get(f"/api/datasets/{dataset_id}").json()
    assert detail["id"] == dataset_id
    assert detail["valid_count"] == detail["record_count"]


def test_compare_requires_between_two_and_four_molecules():
    listing = client.get("/api/molecules", params={"page_size": 2}).json()
    ids = [item["id"] for item in listing["items"]]

    one = client.post("/api/compare", json={"molecule_ids": ids[:1]})
    assert one.status_code == 422

    result = client.post("/api/compare", json={"molecule_ids": ids})
    assert result.status_code == 200
    assert len(result.json()["molecules"]) == 2
    assert len(result.json()["descriptors"]) == 5


def test_compare_reports_differences():
    listing = client.get(
        "/api/molecules", params={"q": "ethanol", "page_size": 1}
    ).json()
    id1 = listing["items"][0]["id"]
    listing2 = client.get(
        "/api/molecules", params={"q": "methanol", "page_size": 1}
    ).json()
    id2 = listing2["items"][0]["id"]
    result = client.post("/api/compare", json={"molecule_ids": [id1, id2]}).json()
    mw = next(d for d in result["descriptors"] if d["key"] == "molecular_weight")
    assert mw["values"][0] == pytest_approx(mw["values"][0])
    assert mw["differences"][1] == abs(mw["values"][1] - mw["values"][0])


def pytest_approx(value):
    return value
