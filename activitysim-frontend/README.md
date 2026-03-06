# ActivitySim Web Frontend

A modern, React-based web interface for ActivitySim - an activity-based travel demand modeling platform.

## 🎯 Features

✅ **Project Management**
- Create and manage multiple ActivitySim projects
- Project metadata and versioning
- Easy project switching

✅ **Settings Configuration**
- YAML settings editor with syntax highlighting
- Real-time validation
- Save and load configurations

✅ **Run Manager**
- Start/Stop/Pause simulation runs
- Real-time progress tracking
- Live logging with WebSocket streaming
- Performance metrics (memory, speed)

✅ **Results Visualization**
- Results dashboard with charts and graphs
- Output file browser and download
- Summary statistics
- Data export options

✅ **File Management**
- Project file explorer (configs, data, output)
- File upload/download
- Organized folder structure

## 📋 Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  React Frontend │         │  FastAPI Backend │
│   (Port 3000)   │◄────────►│   (Port 8000)    │
└─────────────────┘         └──────────────────┘
        │                            │
        │                            ▼
        │                   ┌─────────────────┐
        │                   │  ActivitySim    │
        │                   │  Core (Python)  │
        │                   └─────────────────┘
        │
        ▼
   UI Components:
   - Sidebar (Navigation)
   - ProjectsView
   - SettingsEditor
   - RunManager
   - ResultsPanel
   - FileExplorer
```

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

```bash
# Clone/Navigate to project
cd activitysim-frontend

# Build and run with Docker Compose
docker-compose up --build

# Access in browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
# Or use: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
activitysim-frontend/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile           # Backend Docker config
│   └── projects/            # Projects data directory
│       └── project_*/        # Individual project folders
│           ├── configs/
│           ├── data/
│           ├── output/
│           └── metadata.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ProjectsView.jsx
│   │   │   ├── RunManager.jsx
│   │   │   ├── SettingsEditor.jsx
│   │   │   ├── ResultsPanel.jsx
│   │   │   └── FileExplorer.jsx
│   │   ├── services/        # API client
│   │   │   └── api.js
│   │   ├── App.jsx          # Main app component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── .gitignore
│
├── docker-compose.yml       # Docker Compose config
└── README.md               # This file
```

## 🔗 API Endpoints

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

## 🎨 UI Components

### Sidebar
- Navigation between different views
- Project list and selection
- Create new projects

### RunManager
- Start/Stop/Pause controls
- Progress bar with percentage
- Current step display
- Live logs viewer
- Real-time updates via WebSocket

### SettingsEditor
- YAML text editor
- Syntax highlighting
- Save functionality
- Validation feedback

### ResultsPanel
- Chart visualization (Recharts)
- Output file browser
- Download functionality
- Summary statistics

### FileExplorer
- Hierarchical folder view
- File type icons
- Organized by configs/data/output

## 🔄 Workflow

1. **Create Project**
   - Click "New Project" in sidebar or dashboard
   - Enter project name and description
   - Project folders are auto-created

2. **Configure Settings**
   - Go to Settings tab
   - Edit YAML configuration
   - Save changes

3. **Upload Data**
   - Place input CSV/data files in `data/` folder
   - Place config files in `configs/` folder
   - Files appear in File Explorer

4. **Run Simulation**
   - Click "Start Run" in Dashboard
   - Monitor progress in real-time
   - View logs as they appear

5. **View Results**
   - Go to Results tab
   - View charts and summary
   - Download output files

## 🛠️ Development

### Adding New Components

```jsx
// Create new component in src/components/
export default function NewComponent({ prop1, prop2 }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Component content */}
    </div>
  );
}
```

### Adding New API Endpoints

```python
# In backend/main.py
@app.get("/api/new-endpoint")
async def new_endpoint():
    """Description"""
    try:
        # Your logic
        return {"data": "response"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Calling API from Frontend

```jsx
import { myAPI } from './services/api';

// In component
const data = await myAPI.endpoint();
```

## 🔌 Integrating with ActivitySim

To integrate with actual ActivitySim runs, modify `backend/main.py`:

```python
async def simulate_run(run_id: str, project_dir: Path):
    """Replace the mock run with actual ActivitySim execution"""
    try:
        # Change from mock to real ActivitySim run
        from activitysim.cli.run import run as activitysim_run
        
        # Build ActivitySim arguments
        args = {
            'working_dir': str(project_dir),
            'multiprocess': False,
            # ... other settings
        }
        
        # Run ActivitySim and stream progress
        activitysim_run(args)
        
    except Exception as e:
        active_runs[run_id]['status'] = 'error'
```

## 📊 Data Storage

### Project Structure
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

### Metadata Format
```json
{
  "id": "project_1705000000",
  "name": "Bay Area 2020",
  "description": "ActivitySim model for Bay Area",
  "created_at": "2024-01-12T10:30:00",
  "last_run": "2024-01-12T11:45:00"
}
```

## 🚀 Deployment

### Production Build

```bash
# Frontend
cd frontend
npm run build
# Output in frontend/dist/

# Backend
pip install gunicorn
gunicorn main:app --bind 0.0.0.0:8000
```

### Docker Deployment

```bash
# Build images
docker-compose build

# Run
docker-compose up

# Stop
docker-compose down
```

### Cloud Deployment (AWS/GCP/Azure)

1. Push to container registry
2. Deploy backend on Cloud Run / App Engine / Container Service
3. Deploy frontend on Vercel / Netlify / Cloud Storage + CDN
4. Configure environment variables and cross-origin settings

## 📝 Configuration

### Environment Variables

`.env` (Create in backend/ if needed)
```
ACTIVITYSIM_PATH=/path/to/activitysim
DEBUG=True
LOG_LEVEL=INFO
```

### Settings YAML Example

```yaml
# settings.yaml
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

## 🐛 Troubleshooting

### Frontend not connecting to backend
- Check backend is running on port 8000
- Check CORS is enabled in FastAPI
- Check firewall rules

### Projects not saving
- Check `projects/` folder has write permissions
- Check disk space available

### WebSocket connection fails
- Ensure WebSocket is not blocked by firewall/proxy
- Check browser console for errors

### Memory issues during runs
- Reduce `households_sample_size`
- Enable memory profiling to identify issues
- Use multiprocessing if available

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [ActivitySim Documentation](https://activitysim.github.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the same license as ActivitySim. See LICENSE.txt for details.

## 👥 Support

For issues and questions:
- Check existing issues on GitHub
- Create a new issue with detailed description
- Provide logs and reproduction steps

---

**Happy modeling! 🚀**
