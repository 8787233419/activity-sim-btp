"""
ActivitySim Frontend Backend
FastAPI server for ActivitySim web interface
"""

from fastapi import FastAPI, WebSocket, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
import logging
import json
from datetime import datetime
from pathlib import Path
import asyncio
import subprocess
import os
import shutil
import sys
from typing import Optional, List

# Add ActivitySim source to path if not installed
ACTIVITYSIM_SRCDIR = r"c:\Users\ayush\btp\activity-sim-btp\activitysim"
if ACTIVITYSIM_SRCDIR not in sys.path:
    sys.path.append(ACTIVITYSIM_SRCDIR)

# Import our services and models
from validation_service import ValidationService
from simulation_service import SimulationService
from settings_validation_service import SettingsValidationService
from models import (
    ValidationResult,
    UploadResponse,
    UploadFileResponse,
    SimulationExecutionStatus,
    OutputFilesResponse,
    OutputFileInfo,
    ErrorResponse,
    ProjectCreate
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ActivitySim Backend",
    description="Backend API for ActivitySim web interface",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
BASE_DIR = Path(__file__).parent.parent
PROJECTS_DIR = BASE_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)

# Global state
active_runs = {}
websocket_connections = {}
simulation_executions = {}  # Track active simulations
validation_results = {}  # Cache validation results


# ============= ROOT & HEALTH CHECK =============

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": "ActivitySim Backend API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs",
        "endpoints": {
            "projects": "/api/projects",
            "health": "/health",
            "docs": "/docs",
            "redoc": "/redoc"
        },
        "message": "ActivitySim CSV Validation and Simulation API is running. Visit /docs for interactive documentation."
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ============= PROJECT HELPERS =============

def _initialize_project_dir(project_id: str, name: str = "Unknown Project", description: str = ""):
    """Initialize a project directory with all subdirs and metadata"""
    project_dir = PROJECTS_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (project_dir / "configs").mkdir(parents=True, exist_ok=True)
    (project_dir / "data").mkdir(parents=True, exist_ok=True)
    (project_dir / "output").mkdir(parents=True, exist_ok=True)
    (project_dir / "data_model").mkdir(parents=True, exist_ok=True)
    (project_dir / "logs").mkdir(parents=True, exist_ok=True)
    
    # Copy template files from backend
    backend_dir = Path(__file__).parent
    
    # Copy validation schemas
    src_data_model = backend_dir / "data_model"
    dst_data_model = project_dir / "data_model"
    if src_data_model.exists():
        for file in src_data_model.iterdir():
            if file.is_file():
                shutil.copy(file, dst_data_model / file.name)
    
    # Copy config templates
    src_configs = backend_dir / "configs"
    dst_configs = project_dir / "configs"
    if src_configs.exists():
        for file in src_configs.iterdir():
            if file.is_file():
                shutil.copy(file, dst_configs / file.name)
    
    # Create metadata if it doesn't exist
    metadata_file = project_dir / "metadata.json"
    if not metadata_file.exists():
        metadata = {
            "id": project_id,
            "name": name,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "last_run": None,
            "validation_status": "not_started"
        }
        
        with open(metadata_file, "w", encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
    
    return project_dir


# ============= PROJECT MANAGEMENT =============

@app.get("/api/projects")
async def list_projects():
    """List all available projects"""
    try:
        projects = []
        for project_dir in PROJECTS_DIR.iterdir():
            if project_dir.is_dir():
                metadata_file = project_dir / "metadata.json"
                if metadata_file.exists():
                    with open(metadata_file, encoding='utf-8') as f:
                        projects.append(json.load(f))
        return {"projects": projects}
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects_add")
async def create_project(project_data: ProjectCreate):
    """Create a new project"""
    name = project_data.name
    description = project_data.description
    try:
        project_id = f"project_{int(datetime.now().timestamp())}"
        metadata = {
            "id": project_id,
            "name": name,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "last_run": None,
            "validation_status": "not_started"
        }
        
        _initialize_project_dir(project_id, name, description)
        
        logger.info(f"Created project {project_id}: {name}")
        return {"project": metadata}
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details"""
    try:
        metadata_file = PROJECTS_DIR / project_id / "metadata.json"
        if not metadata_file.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        
        with open(metadata_file, encoding='utf-8') as f:
            project = json.load(f)
        
        return {"project": project}
    except Exception as e:
        logger.error(f"Error getting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= SETTINGS MANAGEMENT =============

@app.get("/api/projects/{project_id}/settings")
async def get_settings(project_id: str):
    """Get project settings"""
    try:
        settings_file = PROJECTS_DIR / project_id / "configs" / "settings.yaml"
        if settings_file.exists():
            with open(settings_file, encoding='utf-8') as f:
                content = f.read()
            return {"settings": content}
        return {"settings": "# Default settings\nhouseholds_sample_size: 1000\nchunk_size: 0"}
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/{project_id}/settings")
async def update_settings(project_id: str, settings: str):
    """Update project settings"""
    try:
        settings_file = PROJECTS_DIR / project_id / "configs" / "settings.yaml"
        with open(settings_file, "w", encoding='utf-8') as f:
            f.write(settings)
        return {"message": "Settings updated"}
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}/files")
async def list_files(project_id: str):
    """List project files"""
    try:
        project_dir = PROJECTS_DIR / project_id
        files = {
            "configs": [],
            "data": [],
            "output": [],
            "data_model": []
        }
        
        for folder in ["configs", "data", "output", "data_model"]:
            folder_path = project_dir / folder
            if folder_path.exists():
                files[folder] = [f.name for f in folder_path.iterdir() if f.is_file()]
        
        return files
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= FILE UPLOAD =============

@app.post("/api/projects/{project_id}/upload-csv", response_model=UploadResponse)
async def upload_csv_files(project_id: str, files: List[UploadFile] = File(...)):
    """
    Upload CSV files to project data directory
    
    Args:
        project_id: Project identifier
        files: List of CSV files to upload
        
    Returns:
        UploadResponse with details of uploaded files
    """
    try:
        project_dir = PROJECTS_DIR / project_id
        # Ensure project exists (auto-heal for old profiles)
        if not project_dir.exists():
            _initialize_project_dir(project_id)
            
        data_dir = project_dir / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        
        uploaded_files = []
        
        for file in files:
            # Validate file extension
            if not file.filename.endswith('.csv'):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type: {file.filename}. Only CSV files are allowed."
                )
            
            # Save file
            file_path = data_dir / file.filename
            with open(file_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            uploaded_files.append(UploadFileResponse(
                filename=file.filename,
                size=len(content),
                path=f"data/{file.filename}",
                uploaded_at=datetime.now()
            ))
            
            logger.info(f"Uploaded {file.filename} ({len(content)} bytes) to {project_id}")
        
        return UploadResponse(
            project_id=project_id,
            files=uploaded_files,
            message=f"Successfully uploaded {len(uploaded_files)} file(s)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/projects/{project_id}/upload-configs")
async def upload_config_files(project_id: str, files: List[UploadFile] = File(...)):
    """
    Upload config/data_model files supplied by the user.

    Routing rules:
      - *.yaml / *.yml                 → projects/<id>/configs/
      - *.py                           → projects/<id>/data_model/
      - anything else                  → rejected with HTTP 400

    Uploading a file that already exists silently overwrites it so the
    user can iterate on their schemas without having to delete first.
    """
    try:
        project_dir = PROJECTS_DIR / project_id
        if not project_dir.exists():
            _initialize_project_dir(project_id)

        saved = []
        for file in files:
            suffix = Path(file.filename).suffix.lower()

            # .py files → data_model/, everything else (yaml, csv, etc.) → configs/
            if suffix == ".py":
                dest_dir = project_dir / "data_model"
            else:
                dest_dir = project_dir / "configs"

            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_path = dest_dir / file.filename

            content = await file.read()
            with open(dest_path, "wb") as f:
                f.write(content)

            folder_name = "data_model" if suffix == ".py" else "configs"
            saved.append({
                "filename": file.filename,
                "size": len(content),
                "folder": folder_name
            })
            logger.info(
                f"Config upload: saved '{file.filename}' ({len(content)} B) "
                f"to {folder_name}/ for project {project_id}"
            )

        return {
            "project_id": project_id,
            "uploaded": saved,
            "message": f"Successfully uploaded {len(saved)} config file(s)"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading config files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/{project_id}/validate-settings")
async def validate_settings(project_id: str):
    """Validate project configuration files using ActivitySim settings_checker"""
    try:
        project_dir = PROJECTS_DIR / project_id
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
            
        service = SettingsValidationService(project_dir)
        result = service.validate_settings()
        return result
    except Exception as e:
        logger.error(f"Settings validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============= EXECUTION =============

@app.post("/api/projects/{project_id}/validate", response_model=ValidationResult)
async def validate_project(project_id: str):
    """
    Run validation checks on uploaded CSV files
    
    Args:
        project_id: Project identifier
        
    Returns:
        ValidationResult with detailed validation information
    """
    try:
        project_dir = PROJECTS_DIR / project_id

        print(1)
        
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        
        print(2)
        # Check if data files exist
        data_dir = project_dir / "data"
        if not data_dir.exists() or not any(data_dir.iterdir()):
            raise HTTPException(
                status_code=400,
                detail="No data files found. Please upload CSV files first."
            )
        
        print(3)
        # Initialize validation service
        validation_service = ValidationService(project_dir)
        
        print(4)
        # Run validation
        logger.info(f"Starting validation for project {project_id}")
        result = validation_service.validate_project()
        
        print(5)
        # Cache result
        validation_results[project_id] = result
        
        # Save result to file
        result_file = project_dir / "validation_results.json"
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(result.model_dump(), f, indent=2, default=str)
        
        print(6)
        logger.info(
            f"Validation completed for {project_id}: "
            f"{result.overall_status.value}, "
            f"{result.total_errors} errors, {result.total_warnings} warnings"
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}/validation-results", response_model=ValidationResult)
async def get_validation_results(project_id: str):
    """
    Get latest validation results for a project
    
    Args:
        project_id: Project identifier
        
    Returns:
        ValidationResult from last validation run
    """
    try:
        # Check cache first
        if project_id in validation_results:
            return validation_results[project_id]
        
        # Try to load from file
        result_file = PROJECTS_DIR / project_id / "validation_results.json"
        if result_file.exists():
            with open(result_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                result = ValidationResult(**data)
                validation_results[project_id] = result
                return result
        
        raise HTTPException(
            status_code=404,
            detail="No validation results found. Please run validation first."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving validation results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============= SIMULATION EXECUTION =============

@app.post("/api/projects/{project_id}/execute", response_model=SimulationExecutionStatus)
async def execute_simulation(project_id: str):
    """
    Start ActivitySim simulation execution
    
    Args:
        project_id: Project identifier
        
    Returns:
        SimulationExecutionStatus with execution details
    """
    try:
        project_dir = PROJECTS_DIR / project_id
        
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if validation passed
        if project_id in validation_results:
            if validation_results[project_id].overall_status.value == "failed":
                raise HTTPException(
                    status_code=400,
                    detail="Cannot execute simulation: validation failed. Please fix errors first."
                )
        else:
            logger.warning(f"No validation results found for {project_id}, proceeding anyway")
        
        # Generate execution ID
        execution_id = f"exec_{int(datetime.now().timestamp())}"
        
        # Initialize simulation service
        simulation_service = SimulationService(project_dir)
        
        # Create initial status
        status = SimulationExecutionStatus(
            execution_id=execution_id,
            project_id=project_id,
            status="running",
            progress=0,
            current_step="Starting simulation...",
            start_time=datetime.now(),
            logs=[]
        )
        
        simulation_executions[execution_id] = status
        
        # Define status update callback
        async def update_status(new_status: SimulationExecutionStatus):
            simulation_executions[execution_id] = new_status
            # Notify websocket clients if connected
            if execution_id in websocket_connections:
                try:
                    await websocket_connections[execution_id].send_json(
                        new_status.model_dump(mode='json')
                    )
                except:
                    pass
        
        # Start simulation in background
        asyncio.create_task(simulation_service.run_simulation(execution_id, update_status))
        
        logger.info(f"Started simulation {execution_id} for project {project_id}")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting simulation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}/execution-status/{execution_id}", 
         response_model=SimulationExecutionStatus)
async def get_execution_status(project_id: str, execution_id: str):
    """
    Get status of a simulation execution
    
    Args:
        project_id: Project identifier
        execution_id: Execution identifier
        
    Returns:
        Current SimulationExecutionStatus
    """
    if execution_id not in simulation_executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return simulation_executions[execution_id]


@app.post("/api/projects/{project_id}/execution-stop/{execution_id}")
async def stop_execution(project_id: str, execution_id: str):
    """
    Stop a running simulation
    
    Args:
        project_id: Project identifier
        execution_id: Execution identifier
        
    Returns:
        Success message
    """
    if execution_id not in simulation_executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Update status
    status = simulation_executions[execution_id]
    status.status = "stopped"
    status.end_time = datetime.now()
    
    logger.info(f"Stopped simulation {execution_id}")
    
    return {"message": "Simulation stopped", "execution_id": execution_id}


# ============= OUTPUT FILES =============

@app.get("/api/projects/{project_id}/outputs", response_model=OutputFilesResponse)
async def list_output_files(project_id: str):
    """
    List all output files from simulation
    
    Args:
        project_id: Project identifier
        
    Returns:
        OutputFilesResponse with list of output files
    """
    try:
        output_dir = PROJECTS_DIR / project_id / "output"
        
        if not output_dir.exists():
            return OutputFilesResponse(
                project_id=project_id,
                files=[],
                total_count=0
            )
        
        files = []
        for file_path in output_dir.iterdir():
            if file_path.is_file():
                stat = file_path.stat()
                files.append(OutputFileInfo(
                    filename=file_path.name,
                    size=stat.st_size,
                    modified_at=datetime.fromtimestamp(stat.st_mtime),
                    download_url=f"/api/projects/{project_id}/outputs/{file_path.name}"
                ))
        
        return OutputFilesResponse(
            project_id=project_id,
            files=files,
            total_count=len(files)
        )
        
    except Exception as e:
        logger.error(f"Error listing output files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}/outputs/{filename}")
async def download_output_file(project_id: str, filename: str):
    """
    Download a specific output file
    
    Args:
        project_id: Project identifier
        filename: Name of the file to download
        
    Returns:
        File download response
    """
    try:
        file_path = PROJECTS_DIR / project_id / "output" / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Prevent directory traversal
        if not file_path.resolve().is_relative_to((PROJECTS_DIR / project_id / "output").resolve()):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



# ============= RUN MANAGEMENT =============

@app.post("/api/projects/{project_id}/run")
async def start_run(project_id: str):
    """Start a new ActivitySim run"""
    try:
        project_dir = PROJECTS_DIR / project_id
        
        run_id = f"run_{int(datetime.now().timestamp())}"
        active_runs[run_id] = {
            "project_id": project_id,
            "status": "running",
            "progress": 0,
            "current_step": "Initializing...",
            "start_time": datetime.now().isoformat(),
            "logs": []
        }
        
        # Simulate ActivitySim run (in real implementation, call actual ActivitySim)
        # For now, we'll create a mock run
        asyncio.create_task(simulate_run(run_id, project_dir))
        
        return {"run_id": run_id, "status": "started"}
    except Exception as e:
        logger.error(f"Error starting run: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}/run/status/{run_id}")
async def get_run_status(project_id: str, run_id: str):
    """Get run status"""
    if run_id not in active_runs:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return active_runs[run_id]


@app.post("/api/projects/{project_id}/run/stop/{run_id}")
async def stop_run(project_id: str, run_id: str):
    """Stop a running simulation"""
    if run_id in active_runs:
        active_runs[run_id]["status"] = "stopped"
        return {"message": "Run stopped"}
    raise HTTPException(status_code=404, detail="Run not found")


@app.get("/api/projects/{project_id}/results")
async def get_results(project_id: str):
    """Get project results"""
    try:
        output_dir = PROJECTS_DIR / project_id / "output"
        results = {}
        
        if output_dir.exists():
            results["files"] = [f.name for f in output_dir.iterdir() if f.is_file()]
            results["summary"] = {
                "total_files": len(results["files"]),
                "last_updated": datetime.now().isoformat()
            }
        
        return results
    except Exception as e:
        logger.error(f"Error getting results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= WEBSOCKET =============

@app.websocket("/ws/run/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    """WebSocket for real-time run updates"""
    await websocket.accept()
    websocket_connections[run_id] = websocket
    
    try:
        while True:
            if run_id in active_runs:
                await websocket.send_json(active_runs[run_id])
            await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        websocket_connections.pop(run_id, None)


# ============= HELPER FUNCTIONS =============

async def simulate_run(run_id: str, project_dir: Path):
    """Simulate a run (mock for demonstration)"""
    steps = [
        "Initializing pipeline...",
        "Loading land use...",
        "Loading accessibility...",
        "Sampling households...",
        "Loading persons...",
        "Creating vehicles...",
        "Initializing tours...",
        "Running mode choice...",
        "Running destination choice...",
        "Writing outputs...",
        "Run completed!"
    ]
    
    try:
        for i, step in enumerate(steps):
            if run_id not in active_runs:
                break
            
            active_runs[run_id]["current_step"] = step
            active_runs[run_id]["progress"] = int((i / len(steps)) * 100)
            active_runs[run_id]["logs"].append({
                "timestamp": datetime.now().isoformat(),
                "message": step,
                "level": "INFO"
            })
            
            # Notify websocket clients
            if run_id in websocket_connections:
                try:
                    await websocket_connections[run_id].send_json(active_runs[run_id])
                except:
                    pass
            
            await asyncio.sleep(2)  # Simulate work
        
        active_runs[run_id]["status"] = "completed"
        
    except Exception as e:
        logger.error(f"Error in run: {e}")
        active_runs[run_id]["status"] = "error"
        active_runs[run_id]["logs"].append({
            "timestamp": datetime.now().isoformat(),
            "message": str(e),
            "level": "ERROR"
        })


# ============= HEALTH CHECK =============

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
