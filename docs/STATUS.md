# MoleculeLab — Session Handoff

Status date: 2026-10-13
Branch: main (working state, uncommitted)

This file records the exact state of the build so work can continue without
re-investigation. Update it whenever you finish a block of work.

---

## 1. Verified working right now

| Layer | State | Evidence |
|---|---|---|
| Backend API | Running on `http://127.0.0.1:8000` | `/api/health` returns `{"status":"healthy","rdkit_version":"2026.09.1"}` |
| Frontend | Running on `http://127.0.0.1:3000` | `npm run build` succeeds, all routes prerender |
| Database | `backend/moleculelab.db` (SQLite) seeded | 181 real molecules, dataset `Educational Common Compounds Extract` |
| Tests | **41 passed** (`cd backend && pytest tests`) | chemistry, API, import, analytics, export |
| Lint | Clean (`cd frontend && npm run lint`) | 0 errors, 0 warnings |
| Build | Clean (`cd frontend && npm run build`) | 9 routes: `/`, `/dashboard`, `/library`, `/compare`, `/analytics`, `/import`, `/export`, `/docs`, `/molecules/[id]` |
| Migrations | `cd backend && alembic upgrade head` | creates 4 tables + indexes |

### Implemented against the PRD
- FR-01 Dashboard: live dataset/record counts from backend — DONE
- FR-02 Datasets: list + detail with quality summary — DONE
- FR-03 Library: search, 5 descriptor filters, sorting, pagination, dataset select — DONE
- FR-04 SMILES validation: `POST /api/molecules/validate` — DONE
- FR-05 Descriptors: MW, LogP, HBD, HBA, TPSA at full precision + provenance — DONE
- FR-06 Molecule detail: 2D SVG, descriptors, units, methods, source, validation status — DONE
- FR-07 Descriptor education: plain-language explanations on detail page + docs — DONE
- FR-08 Compare: 2–4 molecules, values, units, absolute differences — DONE
- FR-09 Analytics: 5 distributions + 4 scatter relations via Recharts, text summaries — DONE
- FR-10/FR-11 Import: real CSV upload, review step, quality report, duplicate detection — DONE
- FR-12 Export: filtered CSV + provenance metadata — DONE
- FR-13 Errors: structured `{error:{code,message,details}}` everywhere — DONE
- FR-14 Accessibility: skip link, aria labels, focus styles, semantic tables — DONE

### Known good sample data
- `backend/data/samples/sample_import.csv` → 10 rows read, 5 accepted,
  3 rejected (2 invalid structure, 1 missing smiles), 2 duplicates.
- Seed source: `backend/data/datasets/pubchem_educational.json` (183 PubChem records).

---

## 2. Completed (2026-10-14 session)

- [x] **README rewritten** — full FR-15 documentation: architecture, data model,
  API reference (endpoints + filter params), descriptor methodology, dataset
  attribution, migration/seed/testing instructions, troubleshooting.
- [x] **Git initialised and first commit made** — commit `4f95b9e` on branch `main`,
  80 files, `.venv`/`node_modules`/`.next`/`.db` excluded via `.gitignore`.
  Local git binary used: `%LOCALAPPDATA%\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe`
  (git is not on PATH on this machine).
- [x] **Browser-verified flows** — library renders 181 records with pagination,
  dashboard shows live dataset provenance, molecule detail renders the RDKit 2D
  structure (Caffeine, CID:2519), analytics renders all 5 distributions + relation
  charts, `/api/health`, `/api/datasets`, `/api/molecules`, `/api/compare`,
  `/api/analytics/*`, `/api/export.csv` all return 200 with real data.

## 3. Optional next steps (not required for MVP)

1. `docs/` architecture notes and a data dictionary as separate pages.
2. Playwright smoke tests for the four primary flows.
3. PostgreSQL smoke test against `DATABASE_URL` (SQLite is the tested path).

### Commands to resume
```powershell
# Terminal 1 – backend
cd "C:\Users\yurra\OneDrive\Desktop\vibe coding\MoleculeLab"
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000

# Terminal 2 – frontend
cd frontend
npm run dev
```

The app auto-creates tables and seeds the dataset on first backend startup, so
a fresh machine works after cloning.

---

## 3. Environment notes (read before editing)

- Python venv: `backend/.venv` (Python 3.14, RDKit 2026.9.1 from
  `rdkit-pypi`). This RDKit build has **no** `rdkit.Chem.draw` module — the
  2D depiction uses `rdkit.Chem.Draw.MolDraw2DSVG` with a guarded fallback.
- Node 24.16 / npm 11.13, Next.js 16.4 (Turbopack, Cache Components on).
  Next 16 aborts prerendering when a client hook reads `useSearchParams()` /
  `useParams()` / `usePathname()` — all three are wrapped in `<Suspense>`
  (compare, molecule detail) or split into a child component (Navbar).
- ESLint rule `react-hooks/set-state-in-effect` rejects `setState` in an effect
  body; the single suppression lives in `frontend/src/lib/hooks.ts`
  (`useOnMountLoad`).
- PowerShell `Set-Content` writes UTF-16 and corrupted Unicode earlier; if you
  script file edits, write UTF-8 without BOM, or use the edit/write tools.
