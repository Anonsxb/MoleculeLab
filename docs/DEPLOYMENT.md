# MoleculeLab deployment guide

This repository deploys as **two services** because the chemistry engine (RDKit)
cannot run on Vercel's frontend platform:

| Piece | Host | Folder |
|---|---|---|
| Backend API (FastAPI + RDKit + SQLite) | Render (free tier works) | `backend/` |
| Frontend (Next.js) | Vercel | `frontend/` |

> **Why your Vercel deploy shows nothing loading:** the frontend calls
> `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8000`. A browser
> opening your Vercel URL tries to reach *its own* localhost — where no backend
> exists. You must deploy the backend first, then point the frontend at it.

---

## 1. Push to GitHub

```bash
git add -A
git commit -m "deploy: ready for Render + Vercel"
# create an empty repo on github.com (do NOT add a README there), then:
git remote add origin https://github.com/<you>/MoleculeLab.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `.venv/`, `node_modules/`, `.next/`, `.env`, and `*.db`.

## 2. Deploy the backend on Render

1. Go to [render.com](https://render.com) → **New +** → **Blueprint** → select your repo.
   Render reads `render.yaml` at the repository root.
2. Wait for the first deploy, then open `https://<your-api>.onrender.com/api/health`.
   Expect `{"status":"healthy", ...}`. The bundled datasets seed automatically
   on first startup (takes a minute or two — free tiers are slow).
3. Free-tier note: the SQLite file is ephemeral. Bundled data rebuilds itself on
   every start; **user-imported datasets do not survive restarts**. For a durable
   demo, attach a Render Postgres instance and set `DATABASE_URL` to its internal
   URL instead.

## 3. Point the frontend at the backend (CORS)

In the Render service → **Environment**, set:

```
ALLOWED_ORIGINS=https://<your-frontend>.vercel.app
```

Save (this redeploys). Without this step, browsers block every API call.

## 4. Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New…** → **Project** → import your repo.
2. Set **Root Directory** to `frontend` (Framework Preset: Next.js is auto-detected).
3. Add the environment variable (all environments):

   ```
   NEXT_PUBLIC_API_URL=https://<your-api>.onrender.com
   ```

   No trailing `/api` — the app appends it. Rebuild after changing it
   (`NEXT_PUBLIC_*` values are baked in at build time).
4. Deploy and open your site. The home-page badge should read **Backend Live**.

## 5. Checklist when something looks broken

| Symptom | Fix |
|---|---|
| "Backend Offline" / "not reachable" on every page | `NEXT_PUBLIC_API_URL` wrong or backend asleep (Render free spins down after inactivity — first load takes ~1 min) |
| CORS errors in the browser console | `ALLOWED_ORIGINS` on Render must exactly match your Vercel URL |
| Empty library right after deploy | Seeding is still running — check `/api/datasets` directly, wait, reload |
| Build fails on Vercel | Ensure Root Directory is `frontend`, Node 20+ (default is fine) |

## Alternative hosts

- **Backend:** Railway, Fly.io, or any VPS with Docker + Python 3.10+. Same env vars apply.
- **Frontend:** Netlify or Cloudflare Pages also work (`frontend/` as the base directory,
  same `NEXT_PUBLIC_API_URL` variable).
