# ActivitySim Web App

A modern, React-based web interface for [ActivitySim](https://github.com/ActivitySim/activitysim) - an activity-based travel demand modeling platform.

## Features

- **Project Management** - Create and manage multiple ActivitySim projects with metadata and versioning
- **Settings Configuration** - YAML editor with syntax highlighting and real-time validation
- **Run Manager** - Start/Stop/Pause runs with progress tracking and live WebSocket logs
- **Results Visualization** - Charts, output file browser, summary stats, and exports
- **File Management** - Project file explorer for configs, data, and output

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  React Frontend │ ◄─────► │  FastAPI Backend │
│   (Port 3000)   │         │   (Port 8000)    │
└─────────────────┘         └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  ActivitySim     │
                            │  Core (Python)   │
                            └──────────────────┘
```

The backend imports ActivitySim from a sibling `activitysim/` folder at the workspace root (resolved at runtime via `Path(__file__).parent.parent.parent / "activitysim"` in `backend/main.py`). That folder is **not** vendored here — you clone it yourself in the next step.

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Git
- [uv](https://docs.astral.sh/uv/) — fast Python package manager. Install with:
  ```bash
  # macOS / Linux
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # Windows (PowerShell)
  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```

## Setup

### 1. Clone this repo

```bash
git clone <this-repo-url>
cd <this-repo>
```

After cloning, your workspace will contain `activitysim-app/` (backend + docs) and `frontend/` (the React UI you'll run in step 5) at the root. You still need the ActivitySim core itself — that's the next step.

### 2. Fork and clone ActivitySim into the workspace

The backend expects `activitysim/` as a **sibling** of `activitysim-app/` (i.e. directly inside the workspace root).

1. Fork [https://github.com/ActivitySim/activitysim](https://github.com/ActivitySim/activitysim) on GitHub.
2. From the workspace root (the folder that contains `activitysim-app/`), clone your fork:
   ```bash
   git clone https://github.com/<your-username>/activitysim.git
   ```
   You should now have:
   ```
   <workspace-root>/
   ├── activitysim/         # ← just cloned (ActivitySim core)
   └── activitysim-app/     # ← this project
   ```

### 3. Install ActivitySim + backend dependencies into one venv

We use a **single virtual environment** for both ActivitySim core and this app's FastAPI backend. `uv` creates and manages it; we then layer the backend's pinned packages on top.

```bash
# Step A — install ActivitySim's locked dependencies (creates activitysim/.venv)
cd activitysim
uv sync --locked

# Step B — add the backend's FastAPI / Uvicorn / pydantic / etc. into the SAME venv
uv pip install -r ../activitysim-app/backend/requirements.txt
```

Why one venv? `backend/main.py` adds `../activitysim` to `sys.path` and imports it directly, so ActivitySim core and the backend both need to be importable from the same interpreter. The two-step install keeps `uv.lock` honest for ActivitySim while letting the backend's `requirements.txt` drive its own pins.

> **Note** — venvs created by `uv sync` ship without `pip` (uv manages packages itself). Use `uv pip install ...` for anything you add later, **not** `pip install ...`. Using plain `pip` will fail with `No module named pip`.

### 4. Run the backend

The cleanest way on Windows (avoids any "wrong venv activated" issues — see Troubleshooting) is to call the venv's Python by full path. From any terminal:

```powershell
# Windows (PowerShell)
& C:\path\to\activity-sim-btp\activitysim\.venv\Scripts\python.exe C:\path\to\activity-sim-btp\activitysim-app\backend\main.py
```

```bash
# macOS / Linux
/path/to/activity-sim-btp/activitysim/.venv/bin/python /path/to/activity-sim-btp/activitysim-app/backend/main.py
```

That works without any activation. If you'd rather activate the venv first (so plain `python main.py` works), do this once per terminal session:

```bash
# macOS / Linux
source activitysim/.venv/bin/activate
# Windows (PowerShell)
activitysim\.venv\Scripts\Activate.ps1
# Windows (cmd)
activitysim\.venv\Scripts\activate.bat
```

Then verify you're in the right venv before running anything:

```bash
python -c "import sys; print(sys.executable)"
# must end in: activitysim/.venv/...   (NOT some other .venv or env folder)
```

If verified, run the backend:

```bash
cd activitysim-app/backend
python main.py
# or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API: http://localhost:8000 — Docs: http://localhost:8000/docs

### 5. Run the frontend

The frontend lives at the workspace root in [frontend/](../frontend/) — **not** inside `activitysim-app/`. In a second terminal, from the workspace root:

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:3000

## Project Structure

```
<workspace-root>/
├── activitysim/                # ActivitySim core (cloned from your fork; not in this repo)
│   └── .venv/                  # shared venv created by `uv sync --locked`
│
├── activitysim-app/            # backend + project docs
│   ├── backend/
│   │   ├── main.py             # FastAPI application
│   │   ├── requirements.txt    # backend Python deps (layered onto the uv venv)
│   │   ├── simulation_service.py
│   │   ├── validation_service.py
│   │   ├── settings_validation_service.py
│   │   ├── models.py
│   │   ├── data_model/
│   │   ├── configs/
│   │   └── projects/           # per-project workspaces (created at runtime)
│   │       └── project_*/
│   │           ├── configs/
│   │           ├── data/
│   │           ├── output/
│   │           └── metadata.json
│   └── README.md
│
└── frontend/                   # React + Vite UI (run from here)
    ├── src/
    │   ├── components/         # Sidebar, ProjectsView, RunManager, SettingsEditor, ResultsPanel, FileExplorer
    │   ├── services/api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## API Endpoints

### Projects
```
GET    /api/projects              # List all projects
POST   /api/projects              # Create new project
GET    /api/projects/{id}         # Get project details
DELETE /api/projects/{id}         # Delete project
```

### Settings
```
GET    /api/projects/{id}/settings      # Get settings
POST   /api/projects/{id}/settings      # Update settings
GET    /api/projects/{id}/files         # List project files
```

### Runs
```
POST   /api/projects/{id}/run                    # Start run
GET    /api/projects/{id}/run/status/{run_id}    # Get run status
POST   /api/projects/{id}/run/stop/{run_id}      # Stop run
```

### Results
```
GET    /api/projects/{id}/results     # Get results
```

### Real-time
```
WebSocket /ws/run/{run_id}            # Stream run updates
```

## UI Components

- **Sidebar** - navigation, project list, create new projects
- **RunManager** - start/stop/pause, progress bar, current step, live logs over WebSocket
- **SettingsEditor** - YAML editor with syntax highlighting, save, validation feedback
- **ResultsPanel** - Recharts visualizations, output file browser, downloads, summary stats
- **FileExplorer** - hierarchical view organized by configs / data / output

## Workflow

1. **Create Project** — name + description in sidebar; folders auto-created
2. **Configure Settings** — edit YAML in Settings tab and save
3. **Upload Data** — drop input CSVs into `data/`, configs into `configs/`
4. **Run Simulation** — start from Dashboard, watch real-time logs
5. **View Results** — charts, summary, and downloads in Results tab

## Development

### Adding a new component

```jsx
// <workspace-root>/frontend/src/components/NewComponent.jsx
export default function NewComponent({ prop1, prop2 }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* content */}
    </div>
  );
}
```

### Adding a new API endpoint

```python
# backend/main.py
@app.get("/api/new-endpoint")
async def new_endpoint():
    try:
        return {"data": "response"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Calling the API from the frontend

```jsx
import { myAPI } from './services/api';

const data = await myAPI.endpoint();
```

## Integrating with ActivitySim

`backend/simulation_service.py` invokes ActivitySim against a project directory. To customize, edit the run logic:

```python
from activitysim.cli.run import run as activitysim_run

args = {
    'working_dir': str(project_dir),
    'multiprocess': False,
    # ... other settings
}
activitysim_run(args)
```

## Data Storage

```
projects/
└── project_1705000000/
    ├── configs/
    │   └── settings.yaml
    ├── data/
    │   ├── households.csv
    │   ├── persons.csv
    │   └── land_use.csv
    ├── output/
    │   ├── tours.csv
    │   └── trips.csv
    └── metadata.json
```

### Metadata format
```json
{
  "id": "project_1705000000",
  "name": "Bay Area 2020",
  "description": "ActivitySim model for Bay Area",
  "created_at": "2024-01-12T10:30:00",
  "last_run": "2024-01-12T11:45:00"
}
```

## Configuration

### Environment variables

Create `backend/.env` if you need overrides:

```
ACTIVITYSIM_PATH=/path/to/activitysim
DEBUG=True
LOG_LEVEL=INFO
```

### Example settings YAML

```yaml
households_sample_size: 1000
chunk_size: 0
chunk_method: "adaptive"
multiprocess: false
num_processes: 1
trace_hh_id: null
memory_profile: false

models:
  - initialize_landuse
  - initialize_households
  - initialize_persons
  - initialize_vehicles
  - initialize_tours
  - mode_choice
```

## Production Build

```bash
# Frontend (from workspace root)
cd frontend
npm run build         # output in frontend/dist/

# Backend
uv pip install gunicorn
gunicorn main:app --bind 0.0.0.0:8000
```

## Troubleshooting

### `No module named pip` when running `python -m pip install ...`
- The venv created by `uv sync --locked` doesn't include `pip`. Use `uv pip install ...` instead of `pip install ...` / `python -m pip install ...`.

### `ModuleNotFoundError: No module named 'fastapi'` (or other backend deps)
- The most common cause is **the wrong venv is active**. If your workspace ever had a `.venv` or `env` folder at its root from a previous setup, your shell may be auto-activating that one instead of `activitysim/.venv`. Verify with:
  ```bash
  python -c "import sys; print(sys.executable)"
  ```
  The path **must** end in `...activitysim/.venv/...`. If it doesn't, either deactivate and re-activate the right one, or skip activation entirely and call the venv's Python by full path (see step 4).
- If the right venv *is* active and FastAPI is still missing, you skipped Step 3-B. From inside `activitysim/`, run:
  ```bash
  uv pip install -r ../activitysim-app/backend/requirements.txt
  ```

### `error: linker 'link.exe' not found` while installing pydantic-core (or any Rust-built wheel)
- This means pip is trying to **compile from source** because no prebuilt wheel matches your Python version. It's almost always a sign you're installing into the wrong venv (often an older `env/` with a Python version pydantic-core no longer ships wheels for). **Don't install Visual Studio Build Tools** — install into `activitysim/.venv` via `uv pip install` instead, where compatible wheels exist.

### `ModuleNotFoundError: activitysim`
- Confirm `activitysim/` sits as a sibling of `activitysim-app/` at the workspace root.
- Confirm you ran `uv sync --locked` inside `activitysim/`.
- Confirm the Python you're running the backend with is `activitysim/.venv/Scripts/python.exe` (Windows) or `activitysim/.venv/bin/python` (macOS/Linux).

### Frontend not connecting to backend
- Backend running on port 8000? CORS enabled? Firewall?

### WebSocket connection fails
- Check the proxy/firewall isn't blocking `/ws/`; check the browser console.

### Memory issues during runs
- Reduce `households_sample_size`; enable memory profiling; use multiprocessing if available.

## Resources

- [ActivitySim](https://github.com/ActivitySim/activitysim) · [docs](https://activitysim.github.io/)
- [uv](https://docs.astral.sh/uv/)
- [FastAPI](https://fastapi.tiangolo.com/) · [React](https://react.dev/) · [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/) · [Tailwind CSS](https://tailwindcss.com/)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Same license as ActivitySim. See LICENSE.txt for details.
