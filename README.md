# 🚜 ERP Rental Management System

[![NestJS](https://img.shields.io/badge/NestJS-v11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-v19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v7.9-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-71%2F71%20Passing%20(100%25)-success?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)

Sistema integral de nivel empresarial para la administración, control operativo, facturación, mantenimiento y contabilidad gerencial de alquiler de maquinaria pesada y equipos de construcción (**BM Construcciones**).

---

## 📑 Tabla de Contenidos
1. [Características Principales](#-características-principales)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Módulos del Negocio y Flujo Operativo](#-módulos-del-negocio-y-flujo-operativo)
4. [Seguridad y Aislamiento Multi-Tenant](#-seguridad-y-aislamiento-multi-tenant)
5. [Endpoints de la API REST](#-endpoints-de-la-api-rest)
6. [Estructura del Proyecto](#-estructura-del-proyecto)
7. [Instalación y Configuración](#-instalación-y-configuración)
8. [Despliegue con Docker](#-despliegue-con-docker)
9. [Pruebas Automatizadas y Calidad](#-pruebas-automatizadas-y-calidad)

---

## 🌟 Características Principales

- **Gestión Integral del Ciclo de Renta**: Cotizaciones públicas y privadas, contratos con validación de stock físico, despachos de maquinaria, devoluciones técnicas y facturación periódica.
- **Blindaje contra Concurrencia (Race Conditions)**: Bloqueo pesimista a nivel de fila (`SELECT ... FOR UPDATE`) en contratos y facturación para prevenir dobles aprobaciones simultáneas.
- **Aislamiento Multi-Tenant Estricto**: Filtrado riguroso por `empresaId` en todas las capas de datos (disponibilidad, inventario, clientes, contratos, finanzas y contabilidad).
- **Control de Horómetros y Daños**: Auditoría de lectura de horómetros en despacho y retorno (`LecturaHorometro`) con cálculo automático de horas trabajadas e inspecciones técnicas con cargos cobrables.
- **Tesorería y Contabilidad Gerencial**: Conciliación automática de pagos (`Pago`), Cuentas por Cobrar (CxC), Cuentas por Pagar (CxP), Pérdidas y Ganancias (P&L) y Balance General en tiempo real.
- **Autenticación Resiliente y Seguridad**:
  - Par de tokens JWT (`accessToken` de vida corta y `refreshToken` de 7 días).
  - Renovación transparente de sesión en Axios mediante cola concurrente (`failedQueue`).
  - Control de sesión única por usuario (`sessionToken`).
  - Rate limiting contra ataques de fuerza bruta (5 intentos/minuto en login).
  - CORS restrictivo por lista blanca de dominios y credenciales.
  - Filtro global de excepciones que sanitiza errores 500 evitando fugas de esquemas o rutas internas.
- **Observabilidad Activa**: Endpoint de salud `GET /api/v1/health` que audita latencia a PostgreSQL y consumo de memoria.

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────┐
│                   Cliente Web (Frontend)                 │
│         React 19 + TypeScript + Vite + Tailwind CSS       │
│    (Axios Interceptor con Refresh Token Transparente)    │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS / REST (api/v1)
                             ▼
┌──────────────────────────────────────────────────────────┐
│                     NestJS 11 (Backend)                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Middlewares & Guards: Throttler, CORS, JwtAuthGuard│  │
│  └─────────────────────────┬──────────────────────────┘  │
│  ┌─────────────────────────▼──────────────────────────┐  │
│  │ Módulos: Auth, Quotations, Contracts, Operations,  │  │
│  │          Billing, Accounting, Inventory, Health    │  │
│  └─────────────────────────┬──────────────────────────┘  │
│  ┌─────────────────────────▼──────────────────────────┐  │
│  │ Prisma ORM: Transacciones ACID + FOR UPDATE Locking│  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────┘
                             │ Conexión Nativa PG
                             ▼
┌──────────────────────────────────────────────────────────┐
│               PostgreSQL 18 (Base de Datos)              │
│       Esquema relacional unificado multi-tenant          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Módulos del Negocio y Flujo Operativo

```mermaid
graph TD
    A[Catálogo / Solicitud Pública] -->|Registro automático de prospecto| B[Cotización PENDIENTE]
    B -->|Aprobación Comercial| C[Generación de Contrato]
    C -->|Validación de Stock Real + FOR UPDATE| D[Contrato ACTIVO]
    D -->|Despacho| E[Remisión de Salida + Horómetro Inicial]
    E -->|Operación en Obra| F[Cortes de Facturación Periódica]
    F -->|Emisión de Factura| G[Factura Pendiente]
    G -->|Registro de Pago| H[Pago Conciliado en Tesorería / CXC]
    E -->|Devolución| I[Recepción + Horómetro Final + Inspección de Daños]
    I -->|Cargos Cobrables| G
    I -->|Cierre de Alquiler| J[Contrato FINALIZADO]
```

### 1. Cotizaciones (Públicas y Privadas)
- Los clientes o prospectos pueden solicitar cotizaciones de equipos desde el portal web sin autenticación.
- El sistema crea o asocia automáticamente el registro `Cliente` en base de datos dentro de una transacción segura, emitiendo el número correlativo de cotización.

### 2. Contratos y Control de Stock Físico
- La aprobación de cotizaciones genera un contrato unificado, impidiendo duplicaciones.
- Se valida la existencia física y disponibilidad real del equipo en inventario (`cantidadDisponible >= cantidad`). Se erradicó cualquier creación fantasma de stock.

### 3. Operaciones de Despacho y Devolución
- **Despacho**: Genera la remisión de salida, cambia el estado del equipo a `ALQUILADO` y registra la lectura inicial en `LecturaHorometro`.
- **Devolución**: Registra el horómetro final, calcula las horas efectivas trabajadas (`Math.max(0, horometroFinal - horometroAnterior)`), evalúa inspecciones de daños cobrables y reincorpora el equipo a inventario.

### 4. Facturación y Pagos
- Generación de facturas por anticipos o cortes quincenales/mensuales de contrato.
- Al marcar una factura como pagada (`markAsPaid`), se genera atómicamente el registro `Pago`, actualizando de inmediato los saldos de Cuentas por Cobrar y los saldos bancarios.

### 5. Contabilidad y Reportes Financieros
- **Cuentas por Cobrar (CxC)**: Estado de facturas emitidas, saldos pendientes y antigüedad de saldos filtrados por empresa.
- **Cuentas por Pagar (CxP)**: Gastos y pasivos por mantenimiento de flota y repuestos.
- **Pérdidas y Ganancias (P&L)**: Ingresos brutos por alquileres + cargos por daños evaluados vs. costos directos de mantenimiento.
- **Balance General**: Activos en bancos, cuentas por cobrar, depósitos en garantía custodiados y valorización total de la flota de maquinaria.

---

## 🔒 Seguridad y Aislamiento Multi-Tenant

| Mecanismo de Seguridad | Implementación | Propósito |
| :--- | :--- | :--- |
| **Aislamiento Multi-Tenant** | `@GetUser('empresaId')` obligatorio en controladores | Impide la visibilidad cruzada de información entre distintas empresas o filiales. |
| **Pessimistic Row Locking** | `SELECT ... FOR UPDATE` en Prisma | Evita condiciones de carrera si dos operadores intentan aprobar o facturar el mismo contrato simultáneamente. |
| **Refresh Tokens** | Endpoint `POST /auth/refresh` | Permite sesiones prolongadas y seguras sin forzar re-logins innecesarios al usuario. |
| **Sesión Única** | `sessionToken` validado contra la base de datos | Invalida sesiones anteriores si el usuario inicia sesión desde otro dispositivo. |
| **Rate Limiting** | `@nestjs/throttler` (5 intentos / minuto) | Mitiga ataques de fuerza bruta y DDoS en el endpoint de autenticación `/auth/login`. |
| **CORS Restrictivo** | Orígenes controlados por lista blanca | Permite únicamente peticiones desde dominios autorizados (`localhost`, dominios oficiales). |
| **Filtro Global Sanitizado** | `AllExceptionsFilter` | Captura errores 500 y oculta stack traces o nombres de tablas a atacantes externos. |

---

## 📡 Endpoints de la API REST

Prefijo global: `/api/v1`

### Autenticación (`/auth`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Público (Rate limited) | Autenticación con email y password. Devuelve `accessToken` y `refreshToken`. |
| `POST` | `/auth/refresh` | Público | Renueva el par de tokens utilizando el `refreshToken` vigente. |
| `POST` | `/auth/register` | `ADMIN` | Registra un nuevo colaborador asignando roles y empresa. |
| `GET` | `/auth/me` | Autenticado | Devuelve los datos del perfil y roles del usuario activo. |

### Monitoreo y Salud (`/health`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Público | Retorna estado de salud del sistema, uptime, memoria y latencia a PostgreSQL. |

### Cotizaciones (`/quotations`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/quotations/public` | Público | Solicitud de cotización desde la web con auto-vinculación de cliente. |
| `GET` | `/quotations` | Autenticado | Lista cotizaciones con filtros por empresa y estado. |
| `GET` | `/quotations/:id` | Autenticado | Detalle de cotización y sus partidas cotizadas. |
| `PATCH` | `/quotations/:id/approve` | Comercial / Admin | Aprueba la cotización y genera el contrato con bloqueo concurrente. |

### Contratos (`/contracts`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/contracts/direct` | Comercial / Admin | Creación directa de contrato con verificación de stock disponible. |
| `GET` | `/contracts` | Autenticado | Lista de contratos activos, finalizados o cancelados. |
| `GET` | `/contracts/:id/cortes` | Autenticado | Historial de cortes de facturación generados. |
| `POST` | `/contracts/:id/generate-cortes` | Facturación / Admin | Generación automática de cortes periódicos. |

### Operaciones de Campo (`/operations`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/operations/despachos` | Operaciones | Despacho de equipo, remisión de salida y registro de horómetro. |
| `POST` | `/operations/retornos` | Operaciones | Retorno de maquinaria, cálculo de horas y registro de inspección de daños. |
| `GET` | `/operations/despachos` | Autenticado | Consulta de remisiones y despachos realizados. |

### Facturación y Tesorería (`/billing`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/billing/invoice-quote/:id` | Facturación | Emisión de factura basada en anticipo de cotización. |
| `POST` | `/billing/invoice-corte/:corteId` | Facturación | Emisión de factura por corte de contrato devengado. |
| `GET` | `/billing/invoices` | Autenticado | Listado de facturas emitidas y estados de cobranza. |
| `POST` | `/billing/invoices/:id/pay` | Tesorería / Admin | Registro atómico de pago y conciliación bancaria. |

### Contabilidad Gerencial (`/accounting`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/accounting/cxc` | Gerencia / Admin | Cartera de Cuentas por Cobrar y balance de clientes. |
| `GET` | `/accounting/cxp` | Gerencia / Admin | Cuentas por Pagar generadas por mantenimiento y repuestos. |
| `GET` | `/accounting/estado-resultados` | Gerencia / Admin | Estado de Pérdidas y Ganancias (P&L) consolidado. |
| `GET` | `/accounting/balance-general` | Gerencia / Admin | Balance General (Activos, Pasivos y Capital). |

### Disponibilidad de Maquinaria (`/availability`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/availability/reservations` | Autenticado | Calendario de reservas y ocupación de flota por rangos de fecha. |

---

## 📁 Estructura del Proyecto

```text
erp-rental-system/
├── .github/
│   └── workflows/
│       └── ci-cd.yml                # Pipeline CI/CD con pruebas y migrate deploy
├── backend/
│   ├── prisma/
│   │   ├── migrations/              # Migraciones formales de base de datos SQL
│   │   └── schema.prisma            # Esquema relacional completo
│   ├── src/
│   │   ├── common/
│   │   │   └── filters/             # Filtro de excepciones sanitizado
│   │   ├── modules/
│   │   │   ├── accounting/          # Contabilidad, CxC, CxP, Balance y P&L
│   │   │   ├── auth/                # JWT, Refresh Tokens, RBAC y Throttler
│   │   │   ├── availability/        # Disponibilidad y reservas multi-tenant
│   │   │   ├── billing/             # Facturación, cortes y pagos
│   │   │   ├── clients/             # Directorio de clientes protegidos
│   │   │   ├── contracts/           # Contratos, cortes y resolución de equipos
│   │   │   ├── health/              # Health Check y auditoría de base de datos
│   │   │   ├── horometros/          # Auditoría de lecturas de horómetros
│   │   │   ├── inventory/           # Flota de equipos, categorías y stock
│   │   │   ├── maintenance/         # Órdenes de mantenimiento preventivo
│   │   │   ├── operations/          # Despacho y retorno de maquinaria
│   │   │   ├── quotations/          # Cotizaciones públicas y privadas
│   │   │   ├── roles/               # Control de accesos RBAC
│   │   │   └── users/               # Gestión de usuarios del sistema
│   │   ├── app.module.ts            # Módulo raíz de NestJS
│   │   └── main.ts                  # Punto de entrada de la API
│   ├── Dockerfile                   # Dockerfile multi-stage de producción
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── modules/                 # Módulos de vista (Auth, Quotes, Contracts, etc.)
│   │   ├── shared/
│   │   │   └── services/api.ts      # Axios con cola de reintentos transparentes
│   │   ├── App.tsx                  # Enrutador principal
│   │   └── main.tsx
│   ├── Dockerfile                   # Nginx + SPA production build
│   └── package.json
├── docker-compose.yml               # Orquestador con healthchecks condicionados
├── COORDINATION.md                  # Bitácora de auditoría y tareas completadas
└── README.md                        # Documentación técnica general
```

---

## 🛠️ Instalación y Configuración

### 1. Requisitos Previos
- **Node.js**: v20.x o v22.x LTS
- **PostgreSQL**: v16, v17 o v18
- **Git**
- **Docker** y **Docker Compose** (opcional, para entornos contenerizados)

### 2. Clonar el Repositorio
```bash
git clone https://github.com/Tomate25/erp-rental-system.git
cd erp-rental-system
```

### 3. Configuración de Variables de Entorno
Crea un archivo `.env` en la carpeta `backend/` con los siguientes valores:
```env
# Conexión a Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/erp_dev?schema=public"

# Configuración del Servidor
PORT=3000
NODE_ENV=development

# Seguridad JWT y Tokens
JWT_ACCESS_SECRET="clave-secreta-jwt-super-segura-2026"
JWT_REFRESH_SECRET="clave-secreta-refresh-super-segura-2026"
JWT_ACCESS_EXPIRATION="8h"
JWT_REFRESH_EXPIRATION="7d"

# CORS (dominios permitidos separados por coma)
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
```

### 4. Instalar Dependencias
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Desplegar Migraciones de Base de Datos
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### 6. Ejecutar en Modo Desarrollo
En terminales independientes:
```bash
# Iniciar Backend (puerto 3000)
cd backend
npm run start:dev

# Iniciar Frontend (puerto 5173)
cd frontend
npm run dev
```

El portal estará disponible en `http://localhost:5173` y la API en `http://localhost:3000/api/v1`.

---

## 🐳 Despliegue con Docker

El sistema está configurado con **Docker Compose** para orquestar la aplicación en producción en un solo paso:

```bash
docker compose up -d --build
```

El orquestador:
1. Levanta el contenedor de PostgreSQL con healthcheck activo.
2. Levanta el backend, ejecuta automáticamente `npx prisma migrate deploy` y comprueba su salud mediante `/api/v1/health`.
3. Inicia el frontend web en Nginx una vez que el backend reporta estado `healthy`.

---

## 🧪 Pruebas Automatizadas y Calidad

El sistema cuenta con cobertura de pruebas unitarias y de integración para todas las capas críticas:

```bash
cd backend
npm test
```

### Métricas de Validación:
- **Suites de Pruebas**: **13 / 13 aprobadas (100%)**
- **Pruebas Unitarias**: **71 / 71 exitosas (100%)**
- **Compilación TypeScript**: **0 errores** en Backend (`nest build`) y Frontend (`tsc -b && vite build`).
- **Verificación de Base de Datos**: Integridad de 943 clientes reales preservada en base de datos.

---

## 👥 Desarrollado para BM Construcciones
*Repositorio oficial*: [https://github.com/Tomate25/erp-rental-system.git](https://github.com/Tomate25/erp-rental-system.git)
