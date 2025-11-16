#!/bin/bash
set -e

echo "============================================"
echo " 🚀 ELIMS Automatic Installer (Smart Mode)"
echo "============================================"

# Detect sudo permissions
if [ "$EUID" -ne 0 ]; then
  SUDO="sudo"
else
  SUDO=""
fi

# ------------------------------
# Detect Linux Distribution
# ------------------------------
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
else
    echo "❌ Unable to determine OS."
    exit 1
fi

echo "🧩 Detected OS: $DISTRO"


# ------------------------------
# Install Docker if missing
# ------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Installing Docker..."

  case $DISTRO in
    ubuntu|debian)
      $SUDO apt-get update -y
      $SUDO apt-get install -y ca-certificates curl gnupg lsb-release

      curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/docker.gpg
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] \
        https://download.docker.com/linux/$DISTRO $(lsb_release -cs) stable" |
        $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null

      $SUDO apt-get update -y
      $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      ;;

    rhel|centos|fedora)
      $SUDO yum install -y yum-utils
      $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      $SUDO yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      $SUDO systemctl enable --now docker
      ;;

    *)
      echo "❌ Unsupported Linux Distribution."
      exit 1
      ;;
  esac

  echo "✔ Docker Installed"
fi


# ------------------------------
# Ensure Docker Compose exists
# ------------------------------
if ! command -v docker compose >/dev/null 2>&1; then
  echo "❌ Docker Compose plugin missing."
  exit 1
fi

echo "✔ Docker Compose Found"


# ------------------------------
# Ensure .env exists
# ------------------------------
if [ ! -f .env ]; then
  echo "📄 Creating .env from template..."
  cp .env.example .env
fi


# ------------------------------
# Start ELIMS Services
# ------------------------------
echo ""
echo "🐳 Starting ELIMS system..."
docker compose up -d --build

echo "⏳ Waiting for backend to start..."
sleep 8


# ------------------------------
# Backend API Health Check
# ------------------------------
API_URL="http://localhost:5000"

echo "🔍 Checking API availability..."
if curl -s "$API_URL/api/health" | grep -q "OK"; then
    echo "✔ API validated at $API_URL"
else
    echo "⚠️ API did not respond to /api/health"
    curl -Is "$API_URL" | head -n 1
fi


# ------------------------------
# Fix frontend VITE API URL
# ------------------------------
if [ -f frontend/.env ]; then
  echo "🛠 Updating frontend VITE_API_URL..."
  sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$API_URL|g" frontend/.env
  echo "✔ frontend/.env updated"
fi


# ------------------------------
# Optional: Seed database
# ------------------------------
SEED_FILE="backups/elims_core_export_v1.sql"

if [ -f "$SEED_FILE" ]; then
    DB_COUNT=$(docker exec -i elims_db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM test_catalog;" | tr -d '[:space:]')

    echo ""
    echo "📦 Seed file detected: $SEED_FILE"

    if [ "$DB_COUNT" -gt 0 ]; then
        echo "⚠️ Existing database contains $DB_COUNT records."
        read -p "➡️ Overwrite existing data? (y/n): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
            docker exec -i elims_db psql -U postgres -d postgres < "$SEED_FILE" || true
            echo "✔ Seed imported."
        else
            echo "⏭️ Seed import skipped."
        fi
    else
        docker exec -i elims_db psql -U postgres -d postgres < "$SEED_FILE" || true
        echo "✔ Seed imported."
    fi
else
    echo "⚠️ No seed file found."
fi


# ------------------------------
# Create Default Users
# ------------------------------
if [ -f backend/init/create-default-users.sql ]; then
  echo "👥 Creating default system users..."
  docker exec -i elims_db psql -U postgres -d postgres < backend/init/create-default-users.sql || true
fi


echo ""
echo "============================================"
echo " 🎉 INSTALLATION COMPLETE!"
echo "--------------------------------------------"
echo " 🌐 Frontend:  http://localhost:8081"
echo " 🔧 API:       $API_URL"
echo "--------------------------------------------"
echo " Login:"
echo "   Email: admin@elims.local"
echo "   Password: admin123"
echo "============================================"
