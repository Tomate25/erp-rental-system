# ERP Rental Management System

## Sistema Integral para Gestión de Renta de Maquinaria y Equipos de Construcción

Este repositorio contiene la arquitectura, el código del backend, el frontend y la infraestructura de contenedores para el **ERP Rental Management System**.

---

## 🚀 Arquitectura General

El sistema se compone de tres partes principales orquestadas por **Docker Compose**:
1. **Frontend**: Aplicación de página única (SPA) construida con React 19, TypeScript, Vite y Tailwind CSS.
2. **Backend**: API RESTful construida con NestJS, Prisma ORM y TypeScript, protegida mediante JWT, Argon2 y un sistema de control de accesos basado en roles (RBAC).
3. **Base de Datos y Caché**: PostgreSQL 17 como motor de persistencia transaccional y Redis como capa de caché y almacenamiento de sesiones rápidas.

---

## 📁 Estructura del Proyecto

```text
erp-rental-system/
├── docs/               # Planos y documentos base de arquitectura
├── frontend/           # Código fuente del Frontend (React + Vite)
├── backend/            # Código fuente del Backend API (NestJS)
├── database/           # Migraciones de base de datos y esquemas Prisma
├── docker/             # Dockerfiles para entornos locales y producción
├── nginx/              # Configuraciones de proxy inverso y seguridad SSL/TLS
├── scripts/            # Scripts automatizados (backups, restauraciones)
├── backups/            # Copias de seguridad de PostgreSQL comprimidas
├── logs/               # Archivos de logs rotativos de Winston o Pino
├── docker-compose.yml  # Orquestador de contenedores Docker
└── .env.example        # Plantilla de variables de entorno del sistema
```

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalados los siguientes componentes en tu entorno de desarrollo:
- [Node.js 22 LTS](https://nodejs.org/) o superior.
- [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/).
- [PostgreSQL](https://www.postgresql.org/) (opcional, si deseas correr la base de datos de manera nativa fuera de Docker).

---

## 🏁 Inicio Rápido (Desarrollo)

### 1. Clonar el repositorio y preparar configuraciones
Copia el archivo de variables de entorno de ejemplo y ajusta los valores para desarrollo local:
```bash
cp .env.example .env
```

### 2. Levantar la infraestructura completa (Docker)
Inicia PostgreSQL, Redis, NestJS API y la compilación de Nginx/React con un solo comando:
```bash
docker compose up -d
```

### 3. Verificar estado de los contenedores
```bash
docker compose ps
```
El sistema estará expuesto localmente:
- **Frontend / Portal**: `http://localhost` (a través de Nginx)
- **Backend API / Swagger**: `http://localhost/api/v1/docs` (documentación autogenerada de Swagger)

---

## 📖 Documentación del Proyecto

Consulta los planos y especificaciones detalladas en el directorio `docs/`:
1. [Análisis de Arquitectura](file:///C:/Users/abdia/erp-rental-system/docs/architecture_analysis.md): Análisis técnico y optimizaciones (Multi-tenancy, FSM, disponibilidad).
2. [Modelo de Base de Datos / ERD](file:///C:/Users/abdia/erp-rental-system/docs/1-db-model-erd.md): Estructura detallada de las tablas y relaciones con Prisma ORM.
3. [Reglas de Negocio](file:///C:/Users/abdia/erp-rental-system/docs/2-business-rules.md): Políticas de cálculo de tarifas, horas extra de motor y mantenimiento.
4. [Diseño de Endpoints de la API](file:///C:/Users/abdia/erp-rental-system/docs/3-api-endpoints.md): Rutas HTTP de la API REST, payloads e integración de permisos.
5. [Especificaciones de Despliegue](file:///C:/Users/abdia/erp-rental-system/docs/4-deployment-docker.md): Red de Docker, Nginx y backups automáticos.
