#!/bin/bash
set -e

# Script para extraer backup de la base de datos de producción
CONTAINER_NAME="erp-postgres-db"
DB_USER="postgres"
DB_NAME="erp_prod"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/erp_prod_backup_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "==> Generando copia de seguridad de '${DB_NAME}'..."
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > "$BACKUP_FILE"

echo "==> Backup generado con éxito en: $BACKUP_FILE"
