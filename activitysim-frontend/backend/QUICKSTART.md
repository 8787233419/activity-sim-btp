# Backend API - Quick Start Guide

## ✅ Installation Complete!

All dependencies have been successfully installed and the server is running.

## 🚀 Server Status

**Server URL**: `http://localhost:8000`
**API Documentation**: `http://localhost:8000/docs`
**Status**: ✅ Running

## 📡 Available Endpoints

### Project Management
- `POST /api/projects_add` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project details

### File Upload & Validation
- `POST /api/projects/{id}/upload-csv` - Upload CSV files
- `POST /api/projects/{id}/validate` - Run validation
- `GET /api/projects/{id}/validation-results` - Get validation results

### Simulation
- `POST /api/projects/{id}/execute` - Start simulation
- `GET /api/projects/{id}/execution-status/{exec_id}` - Check status
- `POST /api/projects/{id}/execution-stop/{exec_id}` - Stop simulation

### Outputs
- `GET /api/projects/{id}/outputs` - List output files
- `GET /api/projects/{id}/outputs/{filename}` - Download file

## 🧪 Testing

### Option 1: Swagger UI (Recommended)
1. Open browser: `http://localhost:8000/docs`
2. Try the endpoints interactively

### Option 2: Test Script
```bash
python test_api.py
```

### Option 3: cURL Examples

**Create Project**:
```bash
curl -X POST "http://localhost:8000/api/projects_add?name=MyProject"
```

**Upload Files**:
```bash
curl -X POST "http://localhost:8000/api/projects/PROJECT_ID/upload-csv" \
  -F "files=@households.csv" \
  -F "files=@persons.csv"
```

**Run Validation**:
```bash
curl -X POST "http://localhost:8000/api/projects/PROJECT_ID/validate"
```

## 📁 Test Data Location

Sample CSV files are available at:
```
c:\Users\ayush\btp\activitysim\activitysim\examples\prototype_mtc_extended\data\
```

Files you can use:
- `households.csv`
- `persons.csv`
- `land_use.csv`

## 🔧 Troubleshooting

**Server not starting?**
- Check if port 8000 is already in use
- Look for error messages in the terminal

**Import errors?**
- Ensure all packages installed: `pip list | findstr "fastapi pandas pandera"`

**Validation fails?**
- Check that CSV files are in the correct format
- Review logs in `projects/{id}/logs/input_checker.log`

## 📚 Full Documentation

See `README.md` for complete API documentation and examples.

## ⚠️ Note

The server is currently running in the terminal. Press `CTRL+C` to stop it.
