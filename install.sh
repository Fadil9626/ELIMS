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

# ============================================
#  ELIMS Automated Installer
# ============================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}     ELIMS AUTOMATED INSTALLER (Smart Check)${NC}"
echo -e "${GREEN}========================================================${NC}"

# --------------------------------------------
# 1. Check Docker & Auto-Install
# --------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}[!] Docker is not found on this system.${NC}"
    read -p "Do you want to install Docker automatically? (y/n): " INSTALL_CONFIRM

    case "$INSTALL_CONFIRM" in
        [yY]|[yY][eE][sS])
            echo -e "${BLUE}[INFO] Downloading and installing Docker...${NC}"
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker "$USER"
            echo -e "${GREEN}[OK] Docker installed successfully!${NC}"
            echo -e "${YELLOW}[IMPORTANT] Log out and log back in to use Docker without sudo.${NC}"
            rm -f get-docker.sh
            ;;
        *)
            echo -e "${RED}[ERROR] Docker is required. Please install it manually.${NC}"
            exit 1
            ;;
    esac
fi

# --------------------------------------------
# 2. Detect docker compose command
# --------------------------------------------
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo -e "${RED}[ERROR] Could not find 'docker compose' or 'docker-compose'.${NC}"
  exit 1
fi

echo -e "${BLUE}[OK] Using compose command: ${COMPOSE_CMD}${NC}"

# --------------------------------------------
# 3. Config Environment (.env)
# --------------------------------------------
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${BLUE}[OK] Created .env from .env.example.${NC}"
    else
        echo -e "${RED}[ERROR] No .env or .env.example file found in current directory.${NC}"
        echo -e "${RED}Run this script from the ELIMS project root.${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}[OK] .env configuration found.${NC}"
fi

# --------------------------------------------
# 4. Clean old containers
# --------------------------------------------
echo -e "${YELLOW}[INFO] Cleaning up old installations (if any)...${NC}"
$COMPOSE_CMD down -v --remove-orphans >/dev/null 2>&1 || true

# --------------------------------------------
# 5. Build and Start
# --------------------------------------------
echo -e "${BLUE}[INFO] Building and starting ELIMS stack...${NC}"
$COMPOSE_CMD up -d --build

if [ $? -ne 0 ]; then
  echo -e "${RED}[ERROR] Failed to start Docker services. Check docker-compose.yml.${NC}"
  exit 1
fi

# --------------------------------------------
# 6. Wait for API container to be running
# --------------------------------------------
API_SERVICE_NAME="elims_api"
MAX_API_RETRIES=20
API_COUNT=0

echo -e "${YELLOW}[INFO] Waiting for API service '${API_SERVICE_NAME}' to be running...${NC}"

until docker inspect -f '{{.State.Running}}' "$API_SERVICE_NAME" 2>/dev/null | grep -q true; do
    echo -n "."
    sleep 3
    API_COUNT=$((API_COUNT+1))
    if [ $API_COUNT -ge $MAX_API_RETRIES ]; then
        echo -e "\n${RED}[ERROR] Timeout waiting for API container to start. Check API logs with:${NC}"
        echo -e "  ${YELLOW}docker logs ${API_SERVICE_NAME}${NC}"
        break
    fi
done
echo -e "\n${GREEN}[OK] API container state check completed.${NC}"

# --------------------------------------------
# 7. Wait for Database (connection check)
# --------------------------------------------
echo -e "${YELLOW}[INFO] Waiting for Database connection (elims_db)...${NC}"
until docker exec elims_db pg_isready -U postgres -d postgres >/dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e "\n${GREEN}[OK] Database connection is up!${NC}"

# --------------------------------------------
# 8. Wait for Tables (check users table)
# --------------------------------------------
echo -e "${YELLOW}[INFO] Waiting for 'users' table to be created (migrations)...${NC}"
MAX_RETRIES=30
COUNT=0

while [ $COUNT -lt $MAX_RETRIES ]; do
  if docker exec elims_db psql -U postgres -d postgres -c "SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}[OK] 'users' table found!${NC}"
    break
  fi
  echo -n "."
  sleep 2
  COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo -e "\n${RED}[ERROR] Timeout waiting for 'users' table. API migrations may have failed.${NC}"
  echo -e "${YELLOW}[INFO] You can check API logs with:${NC}"
  echo -e "  ${YELLOW}docker logs ${API_SERVICE_NAME}${NC}"
fi

# -----------------------------------------------------------------
# 9. Super Admin Creation (Interactive)
# -----------------------------------------------------------------
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}           SUPER ADMIN ACCOUNT SETUP${NC}"
echo -e "${GREEN}========================================================${NC}"

read -p "Do you want to create or update a SuperAdmin user now? (y/n): " CREATE_SUPER
if [[ ! "$CREATE_SUPER" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[INFO] Skipping SuperAdmin creation.${NC}"
else
    # 9.1 Ensure 'users' table exists
    TABLE_EXISTS=$(docker exec elims_db psql -U postgres -d postgres -tAc \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');")

    if [ "$TABLE_EXISTS" != "t" ]; then
        echo -e "${RED}[ERROR] 'users' table does not exist. Migrations may have failed.${NC}"
        echo -e "${RED}Skipping SuperAdmin creation.${NC}"
    else
        # 9.2 Ensure 'roles' table and role_id = 1 exist
        ROLES_TABLE_EXISTS=$(docker exec elims_db psql -U postgres -d postgres -tAc \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'roles');")

        if [ "$ROLES_TABLE_EXISTS" != "t" ]; then
            echo -e "${RED}[ERROR] 'roles' table does not exist. RBAC seed may be missing.${NC}"
        else
            ROLE1_EXISTS=$(docker exec elims_db psql -U postgres -d postgres -tAc \
            "SELECT EXISTS (SELECT 1 FROM roles WHERE id = 1);")

            if [ "$ROLE1_EXISTS" != "t" ]; then
                echo -e "${RED}[ERROR] SuperAdmin role (id = 1) does not exist.${NC}"
                echo -e "${YELLOW}[INFO] Please ensure your RBAC seed data is loaded.${NC}"
            else
                # 9.3 Check if a SuperAdmin already exists
                EXISTING_SUPERADMINS=$(docker exec elims_db psql -U postgres -d postgres -tAc \
                "SELECT COUNT(*) FROM users WHERE role_id = 1;")

                if [ "$EXISTING_SUPERADMINS" -gt 0 ]; then
                    echo -e "${YELLOW}[WARNING] A SuperAdmin already exists in the system.${NC}"
                    echo -e "${YELLOW}Count: $EXISTING_SUPERADMINS${NC}"
                    read -p "Do you still want to create/overwrite a SuperAdmin user? (y/n): " OVERWRITE
                    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
                        echo -e "${GREEN}[INFO] Leaving existing SuperAdmin(s) unchanged.${NC}"
                        CREATE_SUPER="n"
                    fi
                fi

                if [[ "$CREATE_SUPER" =~ ^[Yy]$ ]]; then
                    # 9.4 Prompt for credentials
                    echo -e "${YELLOW}Note: avoid using a single quote (') in the password for this installer run.${NC}"

                    ADMIN_EMAIL=""
                    ADMIN_PASS=""

                    while [[ -z "$ADMIN_EMAIL" ]]; do
                      read -p "Enter SuperAdmin Email: " ADMIN_EMAIL
                    done

                    while [[ -z "$ADMIN_PASS" ]]; do
                      read -s -p "Enter SuperAdmin Password: " ADMIN_PASS
                      echo ""
                    done

                    echo -e "${YELLOW}[INFO] Creating/Updating SuperAdmin for: $ADMIN_EMAIL${NC}"

                    # 9.5 Enable pgcrypto for bcrypt hashing
                    docker exec elims_db psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null 2>&1

                    # 9.6 Insert or update SuperAdmin user
                    docker exec elims_db psql -U postgres -d postgres <<EOF
INSERT INTO users (full_name, email, password_hash, role_id, is_active, created_at)
VALUES ('Super Admin', '$ADMIN_EMAIL', crypt('$ADMIN_PASS', gen_salt('bf')), 1, true, NOW())
ON CONFLICT (email)
DO UPDATE SET 
    password_hash = crypt('$ADMIN_PASS', gen_salt('bf')),
    role_id = 1,
    is_active = true;
EOF

                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}[SUCCESS] SuperAdmin account created/updated successfully!${NC}"
                        echo -e "${BLUE}[INFO] User record:${NC}"
                        docker exec elims_db psql -U postgres -d postgres -c \
                        "SELECT id, full_name, email, role_id, is_active, created_at FROM users WHERE email='$ADMIN_EMAIL';"
                    else
                        echo -e "${RED}[ERROR] Failed to create/update SuperAdmin. Check DB logs.${NC}"
                    fi
                fi
            fi
        fi
    fi
fi

# --------------------------------------------
# 10. Final Info
# --------------------------------------------
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}           INSTALLATION COMPLETE! 🚀${NC}"
echo -e "${GREEN}========================================================${NC}"
echo ""
echo "Access the app in your browser at:  http://YOUR_SERVER_IP:5173"
echo "Login with:  the SuperAdmin email you configured."
echo ""
echo -e "${YELLOW}Tip:${NC} Replace 'YOUR_SERVER_IP' with your server's IP or hostname."
