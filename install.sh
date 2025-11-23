#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}     ELIMS AUTOMATED INSTALLER (Linux)${NC}"
echo -e "${GREEN}========================================================${NC}"

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    exit 1
fi

# 2. Config Environment
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] Created .env configuration."
else
    echo "[OK] .env configuration found."
fi

# 3. Clean old containers
echo "[INFO] Cleaning up old installations..."
docker-compose down -v --remove-orphans > /dev/null 2>&1

# 4. Build and Start
echo "[INFO] Building and Starting System..."
# Support both 'docker-compose' and 'docker compose'
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

# 5. Wait for Database Import
echo "[INFO] Waiting 15s for Database to Initialize..."
sleep 15

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}      INSTALLATION COMPLETE! 🚀${NC}"
echo -e "${GREEN}========================================================${NC}"
echo "Access the app at: http://YOUR_SERVER_IP:5173"