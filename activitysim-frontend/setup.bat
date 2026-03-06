@echo off
REM Setup script for ActivitySim Frontend on Windows

echo.
echo 🚀 ActivitySim Frontend Setup
echo ==============================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    echo    https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install it first.
    echo    https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose found
echo.

REM Create projects directory
if not exist "projects" mkdir projects
echo ✅ Created projects directory
echo.

REM Build images
echo 🔨 Building Docker images...
docker-compose build

if errorlevel 1 (
    echo.
    echo ❌ Build failed. Please check the errors above.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo 🎉 Setup complete! Starting services...
echo.
docker-compose up

pause
