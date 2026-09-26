#!/bin/bash
set -e

echo "=========================================="
echo "   BM Construcciones - Despliegue en VPS  "
echo "=========================================="

# Detectar docker compose o docker-compose
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "❌ Error: Ni 'docker compose' ni 'docker-compose' están instalados."
  exit 1
fi

echo "==> 1. Descargando últimos cambios de GitHub..."
git pull origin main

echo "==> 2. Verificando archivo de entorno .env..."
if [ ! -f .env ]; then
  if [ -f .env.production.example ]; then
    echo "ℹ️  Creando archivo .env inicial desde .env.production.example..."
    cp .env.production.example .env
  else
    echo "⚠️  Aviso: No se encontró .env, se utilizarán valores por defecto seguros."
  fi
fi

echo "==> 3. Reconstruyendo contenedores y aplicando cambios..."
$DOCKER_COMPOSE down --remove-orphans
$DOCKER_COMPOSE build --pull
$DOCKER_COMPOSE up -d

echo "==> 4. Esperando inicialización y verificando estado de contenedores..."
sleep 10
$DOCKER_COMPOSE ps

echo "=========================================="
echo " ✅ ¡Despliegue finalizado con éxito!      "
echo " Acceso web: http://localhost o IP del VPS"
echo "=========================================="
