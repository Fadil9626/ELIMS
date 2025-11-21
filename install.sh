#!/bin/bash

# ==============================================================================
# ELIMS DOCKER INSTALLATION SCRIPT
# Target OS: Ubuntu 20.04 / 22.04 / 24.04 LTS
# ==============================================================================

# --- COLORS & FORMATTING ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- CONFIGURATION ---
APP_NAME="elims"
DB_CONTAINER="elims_db"
API_CONTAINER="elims_api"
WEB_CONTAINER="elims_web"
DB_USER="postgres"
DB_NAME="postgres" # Default for the postgres image unless changed in compose
PROJECT_ROOT=$(pwd)

# --- ERROR HANDLING ---
set -e
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
trap 'echo -e "${RED}❌ Error on line ${LINENO}: Command \"${last_command}\" failed${NC}"' ERR

# --- HELPER FUNCTIONS ---
log() { echo -e "${BLUE}[ELIMS]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# --- ROOT CHECK ---
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo ./install.sh)${NC}"
  exit 1
fi

clear
echo -e "${GREEN}"
echo "=================================================="
echo "   🐳 STARTING ELIMS DOCKER INSTALLATION"
echo "=================================================="
echo -e "${NC}"

# 1. FIND BACKUP FILE
log "Looking for database backup..."
SQL_DUMP=$(ls -t *.sql 2>/dev/null | head -n 1)
if [ -z "$SQL_DUMP" ]; then
    SQL_DUMP=$(ls -t db_backups/*.sql 2>/dev/null | head -n 1)
fi

if [ -n "$SQL_DUMP" ]; then
    success "Found backup file: $SQL_DUMP"
else
    warn "No .sql backup file found. Database will start empty."
fi

# 2. INSTALL DOCKER
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    apt-get update -q
    apt-get install -y -q ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update -q
    apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    success "Docker installed successfully."
else
    log "Docker is already installed."
fi

# 3. CONFIGURE ENVIRONMENT
log "Configuring Environment Variables..."

# Generate Backend .env if missing
if [ ! -f "backend/.env" ]; then
    log "Creating backend/.env..."
    mkdir -p backend
    cat > backend/.env <<EOF
NODE_ENV=production
PORT=5000
# Connect to the 'db' service defined in docker-compose
DATABASE_URL=postgresql://postgres:Database@db:5432/postgres
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=http://localhost:8081
EOF
else
    warn "backend/.env already exists. Keeping existing config."
fi

# 4. START DOCKER CONTAINERS
log "Building and Starting Containers (This may take a while)..."
# Using the 'prod' profile to launch db, api, and web services
docker compose --profile prod up -d --build

# 5. WAIT FOR DATABASE
log "Waiting for Database to be ready..."
until docker exec $DB_CONTAINER pg_isready -U $DB_USER; do
  echo -n "."
  sleep 2
done
echo ""
success "Database is ready."

# 6. RESTORE DATABASE
if [ -n "$SQL_DUMP" ]; then
    log "Restoring database from $SQL_DUMP..."
    
    # Copy dump to container to avoid permission issues with mounting sometimes
    docker cp "$SQL_DUMP" $DB_CONTAINER:/tmp/restore.sql
    
    # Execute restore
    # We use || true to ignore errors if tables already exist (idempotency)
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -f /tmp/restore.sql || true
    
    success "Database restoration process completed."
fi

# 7. FINAL CHECK
log "Checking container status..."
docker compose --profile prod ps

PUBLIC_IP=$(curl -s ifconfig.me || echo "localhost")

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}   ✅ INSTALLATION COMPLETE!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "1.  ${BLUE}Application URL:${NC} http://$PUBLIC_IP:8081"
echo -e "2.  ${BLUE}API Endpoint:${NC}    http://$PUBLIC_IP:5000"
echo -e "3.  ${BLUE}Database:${NC}        Running in container '$DB_CONTAINER'"
echo ""
echo -e "👉 To view logs:  ${YELLOW}docker compose logs -f${NC}"
echo -e "👉 To stop app:   ${YELLOW}docker compose --profile prod down${NC}"
echo ""