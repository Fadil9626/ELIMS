# #!/bin/bash

# # Colors for output
# GREEN='\033[0;32m'
# NC='\033[0m' # No Color

# echo -e "${GREEN}========================================================${NC}"
# echo -e "${GREEN}     ELIMS AUTOMATED INSTALLER (Linux)${NC}"
# echo -e "${GREEN}========================================================${NC}"

# # 1. Check Docker
# if ! command -v docker &> /dev/null; then
#     echo "Error: Docker is not installed."
#     exit 1
# fi

# # 2. Config Environment
# if [ ! -f .env ]; then
#     cp .env.example .env
#     echo "[OK] Created .env configuration."
# else
#     echo "[OK] .env configuration found."
# fi

# # 3. Clean old containers
# echo "[INFO] Cleaning up old installations..."
# docker-compose down -v --remove-orphans > /dev/null 2>&1

# # 4. Build and Start
# echo "[INFO] Building and Starting System..."
# # Support both 'docker-compose' and 'docker compose'
# if command -v docker-compose &> /dev/null; then
#     docker-compose up -d --build
# else
#     docker compose up -d --build
# fi

# # 5. Wait for Database Import
# echo "[INFO] Waiting 15s for Database to Initialize..."
# sleep 15

# echo -e "${GREEN}========================================================${NC}"
# echo -e "${GREEN}      INSTALLATION COMPLETE! 🚀${NC}"
# echo -e "${GREEN}========================================================${NC}"
# echo "Access the app at: http://YOUR_SERVER_IP:5173"

#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}     ELIMS AUTOMATED INSTALLER (Smart Check)${NC}"
echo -e "${GREEN}========================================================${NC}"

# 1. Check Docker & Auto-Install
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[!] Docker is not found on this system.${NC}"
    read -p "Do you want to install Docker automatically? (y/n): " INSTALL_CONFIRM
    
    case "$INSTALL_CONFIRM" in
        [yY]|[yY][eE][sS])
            echo -e "${BLUE}[INFO] Downloading and installing Docker...${NC}"
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            echo -e "${GREEN}[OK] Docker installed successfully!${NC}"
            echo -e "${YELLOW}[IMPORTANT] Log out and log back in to use Docker without sudo.${NC}"
            rm get-docker.sh
            ;;
        *)
            echo -e "${RED}[ERROR] Docker is required. Please install it manually.${NC}"
            exit 1
            ;;
    esac
fi

# 2. Config Environment
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${BLUE}[OK] Created .env configuration.${NC}"
else
    echo -e "${BLUE}[OK] .env configuration found.${NC}"
fi

# 3. Clean old containers
echo -e "${YELLOW}[INFO] Cleaning up old installations...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose down -v --remove-orphans > /dev/null 2>&1
else
    docker compose down -v --remove-orphans > /dev/null 2>&1
fi

# 4. Build and Start
echo -e "${BLUE}[INFO] Building and Starting System...${NC}"
if docker compose version &> /dev/null; then
    docker compose up -d --build
elif command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    echo -e "${RED}[ERROR] Could not find 'docker compose' or 'docker-compose'.${NC}"
    exit 1
fi

# ==========================================================
# 4.5. Wait for API to be running (Triggers Migrations) - NEW FIX
# ==========================================================
echo -e "${YELLOW}[INFO] Waiting for API service to be running (triggers migrations)...${NC}"
MAX_API_RETRIES=20
API_COUNT=0
API_SERVICE_NAME="elims_api" # Your container name

until docker inspect -f '{{.State.Running}}' "$API_SERVICE_NAME" 2>/dev/null | grep -q true; do
    echo -n "."
    sleep 3
    API_COUNT=$((API_COUNT+1))
    if [ $API_COUNT -ge $MAX_API_RETRIES ]; then
        echo -e "\n${RED}[ERROR] Timeout waiting for API container to start. Check API logs!${NC}"
        # We continue to the DB check, which will likely fail, but gives diagnostic info
        break
    fi
done
echo -e "\n${GREEN}[OK] API Container is running.${NC}"


# 5. Wait for Database (CONNECTION check)
echo -e "${YELLOW}[INFO] Waiting for Database connection...${NC}"
until docker exec elims_db pg_isready -U postgres > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e "\n${GREEN}[OK] Database Connection is up!${NC}"

# 6. Wait for Tables (SCHEMA check)
echo -e "${YELLOW}[INFO] Waiting for database tables to be created (this may take time)...${NC}"
MAX_RETRIES=30
COUNT=0
while [ $COUNT -lt $MAX_RETRIES ]; do
  # Check if the 'users' table exists yet
  if docker exec elims_db psql -U postgres -d postgres -c "SELECT 1 FROM users LIMIT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK] Tables found!${NC}"
    break
  fi
  echo -n "."
  sleep 2
  COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo -e "\n${RED}[ERROR] Timeout waiting for tables. Did your API migrations fail?${NC}"
  # We don't exit here, we let it try (and likely fail) so you see the specific error
fi

# 7. CREATE SUPER ADMIN
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}     CREATE SUPER ADMIN ACCOUNT${NC}"
echo -e "${GREEN}========================================================${NC}"

read -p "Enter Admin Email: " ADMIN_EMAIL
read -s -p "Enter Admin Password: " ADMIN_PASS
echo "" 

echo -e "${YELLOW}[INFO] Creating account for $ADMIN_EMAIL...${NC}"

docker exec elims_db psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" > /dev/null 2>&1

docker exec elims_db psql -U postgres -d postgres -c "
INSERT INTO users (full_name, email, password_hash, role_id, is_active, created_at) 
VALUES ('Super Admin', '$ADMIN_EMAIL', crypt('$ADMIN_PASS', gen_salt('bf')), 1, true, NOW())
ON CONFLICT (email) 
DO UPDATE SET password_hash = crypt('$ADMIN_PASS', gen_salt('bf')), is_active = true;
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS] Super Admin created successfully!${NC}"
else
    echo -e "${RED}[ERROR] Failed to create user. Verify your database tables exist.${NC}"
fi

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}      INSTALLATION COMPLETE! 🚀${NC}"
echo -e "${GREEN}========================================================${NC}"
echo "Access the app at: http://YOUR_SERVER_IP:5173"
echo "Login with: $ADMIN_EMAIL"