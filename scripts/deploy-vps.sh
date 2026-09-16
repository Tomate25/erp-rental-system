#!/bin/bash
set -e

echo "=========================================="
echo "   Actualización y Despliegue en VPS      "
echo "=========================================="

echo "==> 1. Descargando últimos cambios de GitHub..."
git pull origin main

echo "==> 2. Reconstruyendo imágenes y levantando contenedores..."
docker compose down
docker compose build --pull
docker compose up -d

echo "==> 3. Estado de los contenedores:"
sleep 5
docker compose ps

echo "=========================================="
echo " ¡Despliegue finalizado con éxito!        "
echo "=========================================="
