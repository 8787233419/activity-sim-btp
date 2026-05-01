# 🚀 Quick Reference - ActivitySim Frontend

## 5-Minute Setup

### Windows
```bash
cd activitysim-app
setup.bat
# Opens http://localhost:3000 automatically
```

### Linux/Mac
```bash
cd activitysim-app
chmod +x setup.sh
./setup.sh
# Opens http://localhost:3000 automatically
```

### Or Use Docker Directly
```bash
cd activitysim-app
docker-compose up --build
```

Then open: **http://localhost:3000**

---

## URL Guide

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | **Main Web App** |
| http://localhost:8000 | Backend API |
| http://localhost:8000/docs | **API Documentation** |
| http://localhost:8000/redoc | Alternative API Docs |

---

## File Locations

| What | Where |
|------|-------|
| Projects | `projects/project_xxx/` |
| Settings | `projects/project_xxx/configs/settings.yaml` |
| Input Data | `projects/project_xxx/data/` |
| Results | `projects/project_xxx/output/` |
| Backend Code | `backend/main.py` |
| Frontend Code | `frontend/src/` |
| Components | `frontend/src/components/` |

---

## First Time Steps

1. **Start App**
   ```bash
   docker-compose up
   ```

2. **Create Project**
   - Click "New Project"
   - Name: "My Model"
   - Description: "Test"
   - Click Create

3. **Configure Settings**
   - Select project
   - Go to "Settings"
   - Edit YAML
   - Click "Save Settings"

4. **Run Simulation**
   - Go to "Dashboard"
   - Click "Start Run"
   - Watch progress

5. **View Results**
   - Go to "Results"
   - See charts and files

---

## Common Commands

```bash
# Start everything
docker-compose up

# Start in background
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Backend logs only
docker-compose logs -f backend

# Frontend logs only
docker-compose logs -f frontend

# Rebuild
docker-compose build

# Delete everything (careful!)
docker-compose down -v

# Manual development (no Docker)

# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
activitysim-app/
├── backend/
│   ├── main.py              ← Edit to add features
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      ← Add new UI components here
│   │   ├── services/api.js  ← API calls
│   │   └── App.jsx          ← Main component
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       ← Configuration
├── README.md                ← Full docs
├── SETUP.md                 ← Setup help
└── BUILD_SUMMARY.md         ← This build info
```

---

## Features Checklist

- ✅ Create projects
- ✅ Edit settings (YAML)
- ✅ Start/Stop runs
- ✅ Real-time progress
- ✅ Live logging
- ✅ View results
- ✅ Download files
- ✅ File explorer
- ✅ WebSocket updates
- ✅ Responsive UI

---

## API Examples

### List Projects
```bash
curl http://localhost:8000/api/projects
```

### Create Project
```bash
curl -X POST "http://localhost:8000/api/projects?name=MyProject&description=Test"
```

### Start Run
```bash
curl -X POST "http://localhost:8000/api/projects/project_123/run"
```

### Get Status
```bash
curl "http://localhost:8000/api/projects/project_123/run/status/run_123"
```

### Health Check
```bash
curl http://localhost:8000/health
```

---

## Customization

### Change Ports
Edit `docker-compose.yml`:
```yaml
backend:
  ports:
    - "8001:8000"  # Changed from 8000:8000
frontend:
  ports:
    - "3001:3000"  # Changed from 3000:3000
```

### Add Components
1. Create `frontend/src/components/MyComponent.jsx`
2. Import in `frontend/src/App.jsx`
3. Use in JSX

### Add API Endpoints
1. Add function to `backend/main.py`
2. Use `@app.get()`, `@app.post()` decorators
3. Call from frontend using `api.js`

### Integrate ActivitySim
Edit `backend/main.py` `simulate_run()` function to call real ActivitySim instead of mock.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port in use | `lsof -i :3000` then `kill <PID>` |
| Docker error | Install Docker Desktop |
| npm not found | Install Node.js |
| Can't connect | Check backend running: `curl localhost:8000/health` |
| Blank page | Check browser console (F12) |
| Settings not saved | Check backend logs |
| WebSocket fails | Check firewall settings |

---

## Deployment

### Docker Hub
```bash
docker build -t myusername/activitysim-app .
docker push myusername/activitysim-app
```

### AWS
```bash
docker-compose push
```

### Heroku
```bash
heroku create
git push heroku main
```

---

## Performance Tips

1. **Reduce sample size** for faster runs
2. **Use multiprocessing** on machines with multiple cores
3. **Enable memory profiling** to find bottlenecks
4. **Clear old projects** to free disk space
5. **Use external storage** for large datasets

---

## File Size Guide

| Component | Size |
|-----------|------|
| Backend code | ~50 KB |
| Frontend code | ~100 KB |
| Dependencies | ~500 MB |
| Docker images | ~200 MB |
| Project data | Varies |

---

## Support Resources

- 📖 Read `README.md` for full documentation
- 🔧 Read `SETUP.md` for setup help
- 📊 Read `FILE_STRUCTURE.md` for file organization
- 📝 Read `BUILD_SUMMARY.md` for technical details
- 🔗 Visit `http://localhost:8000/docs` for API docs

---

## Next Steps

1. ✅ Start the app
2. ✅ Create a project
3. ✅ Run a simulation
4. ✅ View results
5. ✅ Read documentation
6. ✅ Customize for your needs
7. ✅ Integrate with ActivitySim
8. ✅ Deploy to production

---

**You're all set!** 🎉

Just run `docker-compose up` and start modeling! 🚀
