# GitHub page setup for MoleculeLab

Do this once, right after pushing the repository to GitHub. Takes ~10 minutes.

## 1. About section (repo header)

On the repository page, click the ⚙️ gear next to **About** (top right) and paste:

**Description:**

```
Explore real molecules in your browser — 2D structures, calculated properties (MW, LogP, HBD/HBA, TPSA), comparison, charts, CSV import/export. FastAPI + RDKit backend, Next.js frontend. Educational, not medical advice.
```

**Website:** your Vercel URL (e.g. `https://moleculelab.vercel.app`).

**Topics** (click through suggested ones, add these):

```
chemistry cheminformatics rdkit drug-discovery-education fastapi nextjs
react typescript recharts sqlite alembic pydantic education visualization
smiles molecular-descriptors open-science
```

Check ✅ **Releases**, ✅ **Packages** off — keep it simple.

## 2. Social preview image (the card shown on Twitter/Discord/LinkedIn)

GitHub cannot generate this from repo files — upload it manually:

1. Open the app, capture these 1280×640 screenshots (any screenshot tool):
   - Home hero (`/`)
   - Molecule detail (`/molecules/29`, scroll so the structure shows)
   - Analytics (`/analytics`)
2. Stitch or pick the best single shot and export as PNG (1280×640).
3. Repo → **Settings** → **General** → **Social preview** → **Edit** → upload.

## 3. README screenshots

`README.md` has a **Screenshots** section wired to `docs/screenshots/`. Fill it after
deploy with viewport captures (1440px wide works well):

| File | Capture |
|---|---|
| `01-home.png` | `/` top (hero + status card) |
| `02-library.png` | `/library` with results loaded |
| `03-molecule.png` | `/molecules/29` (structure + descriptors) |
| `04-compare.png` | `/compare?ids=1,2,3` after pressing Compare |
| `05-analytics.png` | `/analytics` charts |
| `06-validate.png` | `/validate` after checking caffeine |

Save them under `docs/screenshots/` with exactly those names, then uncomment the
`<img>` lines in the README gallery (they are already written — just remove the
surrounding `<!-- -->` markers... see note in README).

## 4. Pin the important bits

- Pin the **Live demo** link in a repo **Discussion** or the top of the README (already there).
- Enable **Issues** (Settings → General → Features) so users can report bad structures.
