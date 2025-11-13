#!/bin/bash

echo "========================================="
echo "      🚀 Installing ELIMS v1.0.1"
echo "   With FULL database auto-restore"
echo "========================================="

# -----------------------------
# 1. STOP OLD CONTAINERS
# -----------------------------
echo "🛑 Stopping any running ELIMS containers..."
docker compose down --remove-orphans

# -----------------------------
# 2. REBUILD SYSTEM
# -----------------------------
echo "🔧 Building fresh containers..."
docker compose build

echo "🚀 Starting database first..."
docker compose up -d db

echo "⏳ Waiting for PostgreSQL to become healthy..."
sleep 10

# -----------------------------
# 3. RESTORE DATABASE
# -----------------------------
BACKUP_FILE="./elims_backup.sql"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file NOT FOUND: $BACKUP_FILE"
    exit 1
fi

echo "📁 Copying backup into database container..."
docker cp "$BACKUP_FILE" elims_db:/elims_backup.sql

echo "🗄️ Restoring database..."
docker exec -i elims_db sh -c "
    psql -U \$POSTGRES_USER -d \$POSTGRES_DB < /elims_backup.sql
"

echo "✅ Database restore complete!"

# -----------------------------
# 4. START API + FRONTEND
# -----------------------------
echo "🚀 Starting API and frontend..."
docker compose up -d api web

echo "========================================="
echo "🎉 ELIMS Installed Successfully!"
echo "➡️ Login: http://your-server-ip:8081"
echo "========================================="
