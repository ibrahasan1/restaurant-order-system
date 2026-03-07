#!/bin/bash
# Datenbank-Backup mit Datumsstempel
# Einrichten als Cron-Job: crontab -e
# 0 3 * * * /pfad/zum/projekt/scripts/backup.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
DB_PATH="${PROJECT_DIR}/data/restaurant.sqlite"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/restaurant_${TIMESTAMP}.sqlite"

if [ -f "$DB_PATH" ]; then
  sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
  gzip "$BACKUP_FILE"
  echo "✅ Backup erstellt: ${BACKUP_FILE}.gz"
else
  echo "❌ Datenbank nicht gefunden: $DB_PATH"
  exit 1
fi

# Alte Backups löschen
find "$BACKUP_DIR" -name "restaurant_*.sqlite.gz" -mtime +${RETENTION_DAYS} -delete
echo "🧹 Backups älter als ${RETENTION_DAYS} Tage gelöscht"
