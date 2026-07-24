# Especificación de Despliegue y Configuración de Docker

Este documento define la arquitectura de contenedores, la configuración de red y las políticas de copias de seguridad para desplegar el **ERP Rental Management System** en un VPS Ubuntu 24.04 LTS en Hostinger usando **Docker Compose** y **NGINX**.

---

## 1. Arquitectura de Red y Contenedores

Todos los servicios correrán dentro de una red privada virtual de Docker denominada `erp-network`, excepto Nginx, el cual actuará como el único puerto de entrada y salida expuesto al internet público (puertos 80 y 443).

```text
                     INTERNET (Puertos 80/443)
                                │
                                ▼
                       [ Contenedor Nginx ]
                                │ (Red Docker: erp-network)
         ┌──────────────────────┴──────────────────────┐
         ▼                                             ▼
[ Contenedor Frontend ]                       [ Contenedor Backend ]
(React estático, puerto 80)                  (NestJS, puerto 3000)
                                                       │
                                        ┌──────────────┴──────────────┐
                                        ▼                             ▼
                              [ Contenedor Postgres ]       [ Contenedor Redis ]
                              (PostgreSQL 17, puerto 5432)  (Redis Cache, puerto 6379)
```

---

## 2. Docker Compose (Establecido a Nivel Raíz)

El archivo `docker-compose.yml` en la raíz del proyecto orquestará todos estos servicios de la siguiente manera:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: erp-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./frontend/dist:/usr/share/nginx/html # Archivos compilados del frontend
    depends_on:
      - backend
    networks:
      - erp-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: erp-backend
    environment:
      - DATABASE_URL=postgresql://postgres:nata@postgres:5432/erp_prod?schema=public
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    depends_on:
      - postgres
      - redis
    networks:
      - erp-network

  postgres:
    image: postgres:17-alpine
    container_name: erp-postgres
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=nata
      - POSTGRES_DB=erp_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - erp-network

  redis:
    image: redis:7-alpine
    container_name: erp-redis
    volumes:
      - redis_data:/data
    networks:
      - erp-network

networks:
  erp-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

## 3. Configuración de Proxy Inverso Nginx (`nginx/conf.d/default.conf`)

Nginx redirigirá dinámicamente las solicitudes hacia la API de NestJS o servirá los archivos estáticos del frontend de React construidos con Vite.

```nginx
server {
    listen 80;
    server_name erp.tudominio.com;
    
    # Redirigir todo el tráfico HTTP a HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name erp.tudominio.com;

    # Certificados SSL/TLS (Ej. Generados con Certbot/Let's Encrypt)
    ssl_certificate /etc/nginx/ssl/live/erp.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/erp.tudominio.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend (Archivos estáticos de React)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Gateway
    location /api/v1 {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Estrategia de Backups Automatizados

Para garantizar la seguridad de los datos ante fallos del hardware o problemas lógicos, configuraremos una tarea de cron semanal en el VPS Ubuntu para ejecutar copias de seguridad de la base de datos PostgreSQL.

### Script de Respaldos de PostgreSQL (`scripts/backup-db.sh`)

```bash
#!/bin/bash

# Configuración
BACKUP_DIR="/var/backups/erp-postgres"
DB_CONTAINER_NAME="erp-postgres"
DB_USER="postgres"
DB_NAME="erp_prod"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${DATE}.sql.gz"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Ejecutar pg_dump dentro del contenedor de Docker y comprimir
docker exec -t $DB_CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_FILE"

# Eliminar copias de seguridad de más de 30 días de antigüedad
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete

echo "Copia de seguridad completada con éxito en: $BACKUP_FILE"
```

*Automatización:* Esta tarea se programa agregándola al crontab de root del servidor VPS:
```text
0 2 * * * /bin/bash /opt/erp-rental-system/scripts/backup-db.sh
```
Ejecutará el respaldo diariamente a las 2:00 AM, guardará el archivo comprimido y limpiará los respaldos de más de 30 días automáticamente.
