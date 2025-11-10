#!/bin/bash
set -e

echo "============================================"
echo " 🚀 ELIMS Deployment Starting"
echo "============================================"

# Check docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed. Please install Docker first."
  exit 1
fi

# Check docker compose
if ! command -v docker compose >/dev/null 2>&1; then
  echo "❌ Docker Compose plugin is not installed."
  exit 1
fi

# Copy .env if not exists
if [ ! -f .env ]; then
  echo "📄 Creating .env from template..."
  cp .env.example .env
fi

echo ""
echo "============================================"
echo " ⚙️ Configuration:"
echo "  API URL: $(grep VITE_API_URL .env | cut -d '=' -f2)"
echo "  DATABASE: $(grep DATABASE_URL .env | cut -d '=' -f2 | sed 's/:.*@/:****@/g') (hidden)"
echo "============================================"
echo ""

echo "🐳 Starting Docker services..."
docker compose up -d --build

echo "⏳ Waiting for database to initialize..."
sleep 6

echo "👤 Ensuring Super Admin user exists..."
docker exec -i elims_db psql -U postgres -d postgres < backend/init/create-admin.sql || true

echo ""
echo "============================================"
echo " ✅ Deployment Complete!"
echo "--------------------------------------------"
echo " 🌐 Frontend:  http://localhost:5173"
echo " 🔌 API:       http://localhost:5000"
echo "--------------------------------------------"
echo " Default Login:"
echo "   Email: admin@elims.local"
echo "   Password: admin123"
echo "============================================"
