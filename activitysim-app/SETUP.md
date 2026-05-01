# ActivitySim Frontend - Setup Instructions

## Quick Start (3 Steps)

### Step 1: Prerequisites

Make sure you have installed:
- **Docker** - [Download](https://www.docker.com/products/docker-desktop)
- **Docker Compose** - [Download](https://docs.docker.com/compose/install/)

Verify installation:
```bash
docker --version
docker-compose --version
```

### Step 2: Run Setup Script

**On Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**On Windows:**
```bash
setup.bat
```

Or manually:
```bash
docker-compose up --build
```

### Step 3: Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

## Manual Setup (Without Docker)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

---

## Customizing Configuration

### Backend Configuration

Edit `backend/main.py` to customize:
- Port number
- CORS settings
- Project storage location
- ActivitySim integration

### Frontend Configuration

Edit `frontend/vite.config.js` to customize:
- API proxy settings
- Port number
- Build configuration

### Environment Variables

Create `.env` file in backend directory:
```
PYTHONUNBUFFERED=1
LOG_LEVEL=INFO
```

---

## Troubleshooting

### Issue: Port 3000/8000 already in use

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

Or change ports in `docker-compose.yml`:
```yaml
services:
  backend:
    ports:
      - "8001:8000"  # Changed from 8000:8000
  frontend:
    ports:
      - "3001:3000"  # Changed from 3000:3000
```

### Issue: Docker command not found

**Solution:**
- Install Docker Desktop
- Restart your terminal
- Add Docker to PATH (Windows)

### Issue: Frontend can't connect to backend

**Solution:**
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check CORS settings in `backend/main.py`
3. Check firewall settings

### Issue: Projects folder permissions

**Solution:**
```bash
# Linux/macOS
chmod -R 755 projects

# Windows
icacls projects /grant Everyone:F
```

---

## Next Steps

1. **Create a Project**
   - Click "New Project" button
   - Fill in project details
   - Project will be created with all necessary folders

2. **Configure Settings**
   - Go to Settings tab
   - Edit YAML configuration
   - Save settings

3. **Add Input Data**
   - Place CSV files in project's `data/` folder
   - Place config files in project's `configs/` folder
   - Files appear in File Explorer

4. **Run Simulation**
   - Click "Start Run"
   - Monitor progress in Dashboard
   - View results in Results tab

---

## Integration with ActivitySim

To use with actual ActivitySim models:

1. Update `backend/main.py` to call actual ActivitySim core
2. Configure project structure to match ActivitySim requirements
3. Map frontend settings to ActivitySim parameters

See [ActivitySim Documentation](https://activitysim.github.io/) for details.

---

## Health Check

Verify everything is working:

```bash
# Check backend health
curl http://localhost:8000/health

# Response should be:
# {"status":"healthy","timestamp":"2024-01-12T..."}

# Check frontend is accessible
curl http://localhost:3000
```

---

## Common Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild images
docker-compose build

# Remove everything (careful!)
docker-compose down -v
```

---

## Need Help?

1. Check logs: `docker-compose logs`
2. Check API docs: http://localhost:8000/docs
3. Check browser console (F12)
4. Review README.md for more details

Happy modeling! 🚀
