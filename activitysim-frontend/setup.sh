#!/bin/bash
# Setup script for ActivitySim Frontend

echo "🚀 ActivitySim Frontend Setup"
echo "=============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Create projects directory
mkdir -p projects
echo "✅ Created projects directory"

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Setup complete! Starting services..."
    echo ""
    docker-compose up
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
