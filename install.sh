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
echo -e "${GREEN}     ELIMS AUTOMATED INSTALLER (Linux + Admin Setup)${NC}"
echo -e "${GREEN}========================================================${NC}"

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    exit 1
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
# Check if docker-compose exists, otherwise use 'docker compose'
if command -v docker-compose &> /dev/null; then
    docker-compose down -v --remove-orphans > /dev/null 2>&1
else
    docker compose down -v --remove-orphans > /dev/null 2>&1
fi

# 4. Build and Start
echo -e "${BLUE}[INFO] Building and Starting System...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

# 5. Wait for Database
echo -e "${YELLOW}[INFO] Waiting for Database to be ready...${NC}"
# Loop until the database is ready to accept connections
until docker exec elims_db pg_isready -U postgres > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e "\n${GREEN}[OK] Database is up!${NC}"

# Give it a few more seconds for tables to settle if they are being restored
sleep 5

# 6. CREATE SUPER ADMIN
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}     CREATE SUPER ADMIN ACCOUNT${NC}"
echo -e "${GREEN}========================================================${NC}"

read -p "Enter Admin Email: " ADMIN_EMAIL
read -s -p "Enter Admin Password: " ADMIN_PASS
echo "" # New line after password

echo -e "${YELLOW}[INFO] Creating account for $ADMIN_EMAIL...${NC}"

# We use pgcrypto to generate a bcrypt hash compatible with Node.js
# This command enables the extension and inserts/updates the user
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
    echo -e "${RED}[ERROR] Failed to create user. Check if the database tables exist.${NC}"
fi

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}      INSTALLATION COMPLETE! 🚀${NC}"
echo -e "${GREEN}========================================================${NC}"
echo "Access the app at: http://YOUR_SERVER_IP:5173"
echo "Login with: $ADMIN_EMAIL"