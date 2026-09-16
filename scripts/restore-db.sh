#!/bin/bash
set -e

# Script para transferir/restaurar los datos en el contenedor PostgreSQL de producción
CONTAINER_NAME="erp-postgres-db"
DB_USER="postgres"
DB_NAME="erp_prod"
SQL_FILE="database/init.sql"

echo "=========================================="
echo "    Restauración de Datos a Producción    "
echo "=========================================="

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: No se encontró el archivo $SQL_FILE"
  exit 1
fi

echo "==> Verificando que el contenedor PostgreSQL esté activo..."
docker compose ps | grep -i erp-postgres || docker ps | grep -i erp-postgres-db

echo "==> Importando $SQL_FILE dentro de la base de datos '$DB_NAME'..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$SQL_FILE"

echo "==> Reiniciando servicios de Docker..."
docker compose up -d

echo "=========================================="
echo " ¡Datos transferidos exitosamente a Producción! "
echo "=========================================="
