#!/bin/bash

# Vatsin Granite ERP - Backup Script
# Backs up SQLite database with timestamp

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_PATH=${DB_PATH:-"./data/vatsingranite.db"}
BACKUP_DIR=${DB_BACKUP_PATH:-"./backups"}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup database
echo "🔄 Creating database backup..."
cp "$DB_PATH" "$BACKUP_DIR/vatsingranite_$TIMESTAMP.db"

# Backup WAL and SHM files if they exist
if [ -f "$DB_PATH-wal" ]; then
  cp "$DB_PATH-wal" "$BACKUP_DIR/vatsingranite_$TIMESTAMP.db-wal"
fi

if [ -f "$DB_PATH-shm" ]; then
  cp "$DB_PATH-shm" "$BACKUP_DIR/vatsingranite_$TIMESTAMP.db-shm"
fi

echo "✅ Backup completed: $BACKUP_DIR/vatsingranite_$TIMESTAMP.db"

# Keep only last 30 backups
echo "🧹 Cleaning old backups (keeping last 30)..."
ls -t "$BACKUP_DIR"/vatsingranite_*.db | tail -n +31 | xargs -r rm --

echo "✅ Backup script completed"
