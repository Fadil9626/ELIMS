#!/bin/bash
set -e

echo "============================================"
echo " 🚀 ELIMS Automatic Installer"
echo "============================================"

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
      apt-get update
      apt-get install -y ca-certificates curl gnupg lsb-release

      curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
      echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;
    
    rhel|centos|fedora)
      yum install -y yum-utils
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      systemctl enable --now docker
      ;;
    
    *)
      echo "❌ Unsupported Linux Distribution. Install Docker manually."
      exit 1
      ;;
  esac

  echo "✔ Docker Installed"
fi


# ------------------------------
# Ensure Docker Compose plugin exists
# ------------------------------
if ! command -v docker compose >/dev/null 2>&1; then
  echo "❌ Docker Compose plugin missing. Installation failed or unsupported OS."
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
# Start ELIMS
# ------------------------------
echo ""
echo "🐳 Starting ELIMS system..."
docker compose up -d --build

echo "⏳ Allowing database to initialize..."
sleep 10


# ------------------------------
# Detect if core seed file exists
# ------------------------------
SEED_FILE="backups/elims_core_export_v1.sql"

if [ -f "$SEED_FILE" ]; then
    
    DB_COUNT=$(docker exec -i elims_db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM test_catalog;" | tr -d '[:space:]')

    echo ""
    echo "📦 A system configuration file is available:"
    echo "   👉 $SEED_FILE"

    if [ "$DB_COUNT" -gt 0 ]; then
        echo "⚠️ WARNING: Database already contains $DB_COUNT configured tests."
        read -p "➡️ Overwrite existing configuration? (y/n): " CONFIRM
        if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
            echo "⏭️ Skipping import (existing data preserved)."
            SKIP_IMPORT=true
        fi
    fi

    if [ "$SKIP_IMPORT" != true ]; then
        read -p "➡️ Import test catalog, analytes, ranges, roles & permissions? (y/n): " DO_IMPORT

        if [[ "$DO_IMPORT" =~ ^[Yy]$ ]]; then
            echo "📥 Importing core ELIMS configuration..."
            docker cp "$SEED_FILE" elims_db:/tmp/elims_seed.sql
            docker exec -i elims_db psql -U postgres -d postgres < "$SEED_FILE" || true
            echo "✔ Core configuration imported."
        else
            echo "⏭️ Import skipped."
        fi
    fi
else
    echo "⚠️ No core configuration file detected — continuing."
fi


# ------------------------------
# Create System Users
# ------------------------------
echo "👥 Creating default users (Admin, Receptionist, Lab Tech, Pathologist)..."
docker exec -i elims_db psql -U postgres -d postgres < backend/init/create-default-users.sql || true


echo ""
echo "============================================"
echo " 🎉 INSTALLATION COMPLETE!"
echo "--------------------------------------------"
echo " 🌐 Frontend:  http://localhost:8081"
echo " 🔧 API:       http://localhost:5000"
echo "--------------------------------------------"
echo " Default Login:"
echo "   Email: admin@elims.local"
echo "   Password: admin123"
echo ""
echo " Additional Built-In Users:"
echo "   receptionist@elims.local"
echo "   labtech@elims.local"
echo "   pathologist@elims.local"
echo "--------------------------------------------"
echo "If installed on a server, replace 'localhost' with server IP."
echo "============================================"
