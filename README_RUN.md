# How to run this project (backend + frontend)

This guide shows two ways to run the project locally:

- Recommended: Docker (avoids local native build issues)
- Local: Python virtualenv + npm (may require Python 3.12 or build tools on Windows)

---

## Recommended: Docker (fastest, most reliable)

Prerequisite: Docker Desktop installed and running.

From project root `D:\Code-Compass` run:

```powershell
docker compose up --build
```

This builds and starts two services:
- Backend: http://127.0.0.1:8000 (FastAPI, docs at /docs)
- Frontend: http://localhost:3000 (Next.js)

To stop:

```powershell
docker compose down
```

If you prefer to run detached:

```powershell
docker compose up --build -d
```

Logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Local (Windows) — backend + frontend

I included helper scripts: `start-backend.ps1` and `start-frontend.ps1` in the project root.

Steps (recommended order):

1. Run backend helper (creates venv and installs deps):

```powershell
cd D:\Code-Compass
.\start-backend.ps1
```

Notes:
- The script uses `py -3.12 -m venv` if available, otherwise falls back to `python -m venv`.
- It runs `pip install --prefer-binary -r requirements.txt` which prefers binary wheels and may avoid native builds.
- If `pip` still attempts to compile `numpy` from source, you'll need either Python 3.12 (recommended) or Visual Studio Build Tools installed (Desktop C++ workloads).

2. In a separate terminal run frontend helper:

```powershell
cd D:\Code-Compass
.\start-frontend.ps1
```

That will set `NEXT_PUBLIC_API_BASE_URL` to `http://127.0.0.1:8000/api` if not already set.

3. Open browser:

- Frontend UI: http://localhost:3000
- Backend docs: http://127.0.0.1:8000/docs

---

## Troubleshooting

- If backend `pip install` fails on `numpy` with compiler errors, do one of:
  - Install Python 3.12 and recreate venv
  - Install Visual Studio Build Tools (C++) and retry pip install
  - Use Docker (recommended)

- If frontend shows `Failed to fetch`, check backend is running and reachable at `http://127.0.0.1:8000` and that CORS is enabled (it is by default).

---

If you run any of these commands and paste errors/logs here, I will diagnose and fix them with you.
