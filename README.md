# MoleculeLab 🧪

**Molecular Structure & Property Exploration Platform**
*Educational computational chemistry application — MVP 1.0*

---

## 🔬 What this is

MoleculeLab is a full-stack web application for exploring molecular structures and
calculated molecular properties. It combines a curated molecule database, SMILES
validation, descriptor calculation, filtering and comparison, interactive analytics,
CSV import with data-quality reporting, and reproducible CSV export.

> **Scientific notice & educational scope**
> MoleculeLab is an educational exploration tool. It is **not** a clinical decision
> support system, a drug efficacy predictor, or a therapeutic candidate selection
> platform. Calculated descriptors (Crippen LogP estimates, TPSA, molecular weight,
> HBD/HBA counts) describe *structural and physicochemical models*. They do **not**
> establish biological activity, pharmaceutical efficacy, safety, toxicity, or
> clinical utility.

---

## 🧱 Technology stack

| Layer | Technology | Notes |
|---|---|---|
| **Backend** | Python 3.10+, FastAPI, Pydantic v2 | Typed request/response schemas, structured errors |
| **Chemistry engine** | RDKit 2026.9.1 | Backend-only SMILES parsing, canonicalisation, descriptors, 2D depiction |
| **Database** | SQLAlchemy 2.x, Alembic, SQLite (PostgreSQL-ready) | Relational models with provenance |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Recharts | Responsive, keyboard-accessible UI |
| **Testing** | pytest, httpx | 41 backend tests |

---

## 🚀 Setup

### Prerequisites
- Python 3.10+ (developed on 3.14)
- Node.js 20+ (developed on 24.16) and npm

### 1. Environment variables
```bash
cp .env.example .env
```
All variables have working defaults; editing `.env` is optional for local development.

### 2. Backend
```powershell
# Windows PowerShell
py -3.14 -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Create the schema and seed the bundled dataset (idempotent — safe to re-run):
```powershell
cd backend
..\backend\.venv\Scripts\python.exe -m alembic upgrade head
..\backend\.venv\Scripts\python.exe -c "from app.scripts.seed_db import seed; print(seed())"
```

Run the tests and start the API:
```powershell
cd backend
..\backend\.venv\Scripts\python.exe -m pytest tests -q
..\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir ..\backend --port 8000
```
API root: <http://127.0.0.1:8000> · Swagger docs: <http://127.0.0.1:8000/docs>

### 3. Frontend
```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:3000
npm run lint
npm run build
```

> **RDKit 2D structures:** the RDKit wheel used here (`rdkit-pypi`) exposes the drawing
> API at `rdkit.Chem.Draw` rather than `rdkit.Chem.draw`. The service imports it
> defensively, so a build without drawing support still calculates descriptors and
> reports "structure depiction unavailable" instead of failing.

---

## 🧪 Calculated descriptors

All chemistry runs server-side. Values are stored at full precision and rounded only
for display; missing values are never replaced with zero.

| Descriptor | Unit | RDKit method | Classification |
|---|---|---|---|
| Molecular Weight | g/mol | `rdkit.Chem.Descriptors.MolWt` | Full-precision mass from atomic weights |
| LogP (Crippen estimate) | dimensionless | `rdkit.Chem.Crippen.MolLogP` | Atom-contribution **estimate**, not measured |
| Hydrogen-Bond Donors | count | `rdkit.Chem.Lipinski.NumHDonors` | Structural count |
| Hydrogen-Bond Acceptors | count | `rdkit.Chem.Lipinski.NumHAcceptors` | Structural count |
| TPSA | Å² | `rdkit.Chem.Descriptors.TPSA` | Topological polar surface area |

Each molecule record stores the RDKit version and the calculation timestamp, and the
API returns the method string for every descriptor.

### What descriptors cannot establish
Biological activity, drug efficacy, safety, toxicity, solubility, permeability, and
clinical usefulness. Interpretation of larger or smaller values is context-dependent;
never read a descriptor as a drug-liability score.

---

## 📚 Datasets & provenance

Two bundled datasets ship with the application (1,338 distinct molecules total).
Dataset comprehension features — dashboard metrics, library and analytics dataset
selectors, per-dataset analytics — all read from this same live data.

### 1. Educational Common Compounds Extract — 181 curated common compounds

- **Source:** PubChem, National Institutes of Health — <https://pubchem.ncbi.nlm.nih.gov/>
- **Provenance:** each record stores its PubChem CID as `external_id` and a link back
  to the compound page.
- **Reproducing the extract:** `python backend/scripts/fetch_pubchem.py` re-downloads
  the public reference records into `backend/data/datasets/pubchem_educational.json`.

### 2. Approved Drugs Extract (ChEMBL) — 1,157 approved small-molecule drugs

- **Source:** ChEMBL, EMBL European Bioinformatics Institute — <https://www.ebi.ac.uk/chembl/>
- **Provenance:** approved drugs (`max_phase = 4`) with preferred names; each record
  stores its ChEMBL ID as `external_id` and a link to its ChEMBL report card.
  Structures that already existed from the PubChem extract are linked, never duplicated.
- **Reproducing the extract:** `python backend/scripts/fetch_chembl.py` re-downloads
  the public reference records into `backend/data/datasets/chembl_approved.json`.
  Please follow ChEMBL's licence and citation requirements when reusing the data.

### Shared rules

- **Calculation:** descriptors are computed locally by RDKit for every record; no
  external descriptor values are imported.
- **Missing values, invalid structures, exact duplicate inputs, and identical
  canonical structures are four distinct states** throughout the application —
  duplicates are reported, never silently dropped.

---

## 🗺️ API reference

Base URL `http://127.0.0.1:8000/api`. Interactive docs: `/docs` and `/redoc`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Service status, app version, RDKit version |
| GET | `/datasets` | List datasets with quality summaries |
| GET | `/datasets/{id}` | Dataset detail |
| GET | `/molecules` | Search, filter, sort, paginate molecules |
| GET | `/molecules/{id}` | Molecule detail with structure and provenance |
| POST | `/molecules/validate` | Validate a SMILES string and calculate descriptors |
| POST | `/datasets/import/preview` | Validate a CSV upload and return a quality report (nothing saved) |
| POST | `/datasets/import` | Confirm a reviewed import |
| GET | `/imports/{job_id}` | Import job status |
| GET | `/imports/recent` | Most recent import job (null when none yet) |
| POST | `/compare` | Compare 2–4 molecules with differences |
| GET | `/analytics/distribution` | Histogram data for one descriptor |
| GET | `/analytics/scatter` | Scatter data for two descriptors |
| GET | `/analytics/summary` | Reference statistics (min/max/mean/median) for every descriptor |
| GET | `/export.csv` | Filtered CSV export |
| GET | `/export/meta` | Export provenance summary |

### Filtering, sorting, pagination (`GET /molecules`)
| Parameter | Type | Notes |
|---|---|---|
| `q` | string | Matches name, original/canonical SMILES, external ID |
| `dataset_id` | int | Restrict to one dataset |
| `page`, `page_size` | int | Server-side pagination (page_size 1–200) |
| `sort_by` | enum | `name`, `molecular_weight`, `logp`, `hbd`, `hba`, `tpsa`, `id` |
| `sort_order` | enum | `asc`, `desc` |
| `mw_min`, `mw_max`, `logp_min`, `logp_max`, `hbd_min`, `hbd_max`, `hba_min`, `hba_max`, `tpsa_min`, `tpsa_max` | number | Descriptor range filters (allowlisted) |

### Error format
All errors use a predictable envelope with no stack traces or internal details:
```json
{
  "error": {
    "code": "UNSUPPORTED_SORT_FIELD",
    "message": "sort_by must be one of: hba, hbd, id, logp, molecular_weight, name, tpsa",
    "details": {}
  }
}
```
Stable codes include `INVALID_SMILES`, `CALCULATION_FAILURE`, `MOLECULE_NOT_FOUND`,
`DATASET_NOT_FOUND`, `UNSUPPORTED_FILTER`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`,
`DATASET_NAME_EXISTS`, `VALIDATION_ERROR`.

---

## 🏗️ Architecture

```
MoleculeLab/
├── backend/
│   ├── app/
│   │   ├── main.py               FastAPI app, CORS, structured error handlers, lifespan seed
│   │   ├── core/                 config (Pydantic Settings), database (SQLAlchemy engine/session)
│   │   ├── models/               Dataset, Molecule, DatasetEntry, ImportJob
│   │   ├── schemas/              Pydantic request/response models (chemistry, analysis)
│   │   ├── services/             chemistry, molecule_service, dataset_service,
│   │   │                         import_service, analytics_service, export_service
│   │   ├── api/                  health, datasets, molecules, imports, compare, analytics, export
│   │   └── scripts/seed_db.py    idempotent seed of the bundled dataset
│   ├── alembic/                  migrations (0001_initial)
│   ├── data/
│   │   ├── datasets/             PubChem educational extract (JSON)
│   │   └── samples/              sample_import.csv for import testing
│   └── tests/                    41 tests: chemistry, API, import, analytics, export
└── frontend/
    └── src/
        ├── app/                  routes: /, /dashboard, /library, /compare, /analytics,
        │                         /import, /export, /docs, /molecules/[id]
        ├── components/           Navbar, shared loading/empty/error states, structure SVG
        ├── lib/                  typed API client, data-loading hook
        └── app/subpage.module.css + page.module.css
```

**Separation of concerns:** scientific calculations exist only in
`backend/app/services/chemistry.py`; the frontend never computes descriptors — it
renders what the backend returns, including units, methods, and missing-value markers.

### Data model
| Table | Key fields |
|---|---|
| `datasets` | name, description, source name/URL, version label, created_at |
| `molecules` | display_name, formula, original_smiles, canonical_smiles (unique), external_id, source, mol_wt, logp, hbd, hba, tpsa, descriptor_rdkit_version, descriptors_calculated_at |
| `dataset_entries` | dataset_id, molecule_id, row_number, validation_status, validation_message |
| `import_jobs` | filename, status, rows read/accepted/rejected, invalid structures, missing fields, duplicates, error_summary |

Descriptor values are typed columns on `molecule` rather than a generic key/value
table: the supported descriptor set is fixed, so typed columns keep provenance
explicit without extra complexity. Nullable descriptor columns distinguish "missing"
from a valid zero.

---

## ✅ Testing

```powershell
cd backend
..\backend\.venv\Scripts\python.exe -m pytest tests -q     # 41 passed
```
Covers: descriptor values against known compounds, valid/invalid/missing SMILES,
search/sort/filter/pagination including unsupported-field rejection, dataset and
molecule detail endpoints, comparison limits, distribution and scatter analytics,
CSV export filter correctness, import validation and duplicate classification,
error envelope structure.

```bash
cd frontend
npm run lint && npm run build
```

---

## ⚠️ Known limitations

- SQLite is the default database; PostgreSQL works via `DATABASE_URL` but is not the
  path exercised in tests.
- The bundled dataset is an educational extract (~181 compounds), not a comprehensive
  chemical database.
- Analysis charts sample up to 800 scatter points per request.
- Imports are processed synchronously in the request; very large files will occupy
  the worker until validated.
- 2D depiction depends on the installed RDKit build offering the drawing module;
  descriptors and validation work regardless.
- No user accounts or background processing in the MVP.

---

## 🛠️ Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Frontend shows "Backend unreachable" | Start the backend on port 8000, or set `NEXT_PUBLIC_API_URL` |
| `ModuleNotFoundError: rdkit.Chem.draw` | This RDKit build exposes `rdkit.Chem.Draw`; the service handles both — ensure you are on the current code |
| Import rejected before upload | File must be `.csv`, under 10 MB, with `name` and `smiles` columns |
| Dataset name rejected on import | A dataset with that name already exists; choose a unique name |
| Next 16 prerender error for client hooks | Client components reading `useSearchParams`/`useParams`/`usePathname` must be wrapped in `<Suspense>` |
| Empty library after setup | Run the seed step (Section 2) — the backend also seeds on startup |

See `docs/STATUS.md` for the current implementation checklist.
