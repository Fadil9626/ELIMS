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
  echo "❌ Docker Compose is not installed. Please install Docker Compose plugin."
  exit 1
fi

# Copy .env.example → .env if not exists
if [ ! -f .env ]; then
  echo "📄 Creating .env from template..."
  cp .env.example .env
fi

echo ""
echo "============================================"
echo " ⚙️  Using configuration:"
echo "  - FRONTEND_HOST: $(grep FRONTEND_HOST .env | cut -d '=' -f2)"
echo "  - API_HOST: $(grep API_HOST .env | cut -d '=' -f2)"
echo "  - POSTGRES_PASSWORD: (hidden)"
echo "============================================"
echo ""

echo "🐳 Starting Docker services..."
docker compose up -d --build

echo ""
echo "============================================"
echo " ✅ Deployment Complete!"
echo "--------------------------------------------"
echo " 🌐 Visit your ELIMS frontend at: https://your-domain"
echo " 🔌 API available at: https://api.your-domain"
echo "--------------------------------------------"
echo " Default Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "============================================"
