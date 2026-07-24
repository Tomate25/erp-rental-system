# Diseño de la API REST y Endpoints

Este documento define la estructura inicial de la API REST del **ERP Rental Management System**. Todas las rutas del backend (NestJS) seguirán los estándares HTTP, devolverán respuestas formateadas en JSON y requerirán validación y autorización previa de acuerdo con el sistema RBAC (Role-Based Access Control).

---

## 1. Configuración Global de la API

- **Prefijo Global**: `/api/v1`
- **Cabeceras de Seguridad**: Helmet habilitado en la raíz de NestJS.
- **CORS**: Configurado dinámicamente para permitir solicitudes únicamente desde el dominio del frontend y del portal del cliente.
- **Rate Limiting**: 100 peticiones por minuto por dirección IP, utilizando almacenamiento temporal en Redis.

---

## 2. Endpoints Principales y Seguridad

### A. Módulo: Autenticación (`/api/v1/auth`)

| Endpoint | Método | Descripción | Permiso Requerido | Payload (Request Body) |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | `POST` | Iniciar sesión y obtener Access & Refresh Tokens | Público | `{ email, password }` |
| `/refresh` | `POST` | Intercambiar Refresh Token para obtener nuevo Access Token | Público | `{ refreshToken }` |
| `/logout` | `POST` | Invalidar tokens de sesión activos en Redis | Autenticado | `{}` |
| `/me` | `GET` | Obtener datos del perfil del usuario autenticado | Autenticado | N/A |

### B. Módulo: Clientes (`/api/v1/clients`)

| Endpoint | Método | Descripción | Permiso Requerido |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Listar todos los clientes (con paginación y filtros) | `CLIENT.VIEW` |
| `/` | `POST` | Crear un nuevo cliente | `CLIENT.CREATE` |
| `/:id` | `GET` | Obtener detalles completos de un cliente | `CLIENT.VIEW` |
| `/:id` | `PUT` | Actualizar información de un cliente | `CLIENT.UPDATE` |
| `/:id` | `DELETE` | Eliminación lógica (soft-delete) de un cliente | `CLIENT.DELETE` |

### C. Módulo: Inventario y Equipos (`/api/v1/inventory`)

| Endpoint | Método | Descripción | Permiso Requerido |
| :--- | :--- | :--- | :--- |
| `/equipos` | `GET` | Consultar catálogo de equipos (por sucursal, categoría y estado) | `INVENTORY.VIEW` |
| `/equipos` | `POST` | Dar de alta un nuevo equipo de maquinaria | `INVENTORY.CREATE` |
| `/equipos/:id` | `GET` | Ver historial, horómetros y estado de un equipo | `INVENTORY.VIEW` |
| `/equipos/:id` | `PUT` | Editar detalles del equipo (precio de renta, horómetro) | `INVENTORY.UPDATE` |
| `/equipos/:id/estado`| `PATCH` | Cambiar manualmente el estado (ej. Mantenimiento) | `INVENTORY.STATE` |

### D. Módulo: Disponibilidad (`/api/v1/availability`)

| Endpoint | Método | Descripción | Permiso Requerido | Payload / Parámetros |
| :--- | :--- | :--- | :--- | :--- |
| `/check` | `GET` | Verificar disponibilidad de un equipo en un rango de fechas | `AVAILABILITY.CHECK` | `?equipoId=x&inicio=y&fin=z` |
| `/calendar` | `GET` | Obtener matriz de reservas de sucursal para vista de calendario | `AVAILABILITY.VIEW` | `?mes=2026-07` |

### E. Módulo: Proceso Comercial (`/api/v1/commercial`)

| Endpoint | Método | Descripción | Permiso Requerido |
| :--- | :--- | :--- | :--- |
| `/solicitudes` | `GET` | Listar solicitudes del portal de clientes | `REQUEST.VIEW` |
| `/solicitudes` | `POST` | Crear una nueva solicitud de cotización | `REQUEST.CREATE` |
| `/cotizaciones`| `POST` | Generar una cotización borrador para un cliente | `QUOTE.CREATE` |
| `/cotizaciones/:id/enviar`| `POST` | Enviar cotización al cliente (Email/WhatsApp) y cambiar a `ENVIADA` | `QUOTE.SEND` |
| `/cotizaciones/public/:token`| `GET` | Acceso público sin auth (para el portal del cliente) | Público |
| `/cotizaciones/public/:token/responder`| `POST` | Aceptar, solicitar cambios o rechazar cotización | Público |
| `/contratos` | `POST` | Convertir cotización aprobada en Contrato Formal | `CONTRACT.CREATE` |

### F. Módulo: Operaciones y Control de Renta (`/api/v1/operations`)

| Endpoint | Método | Descripción | Permiso Requerido |
| :--- | :--- | :--- | :--- |
| `/despachos` | `POST` | Registrar salida de equipos (incluye carga de fotos y checklist) | `DISPATCH.CREATE` |
| `/devoluciones`| `POST` | Registrar retorno de equipos, horómetros finales e inspección | `RETURN.CREATE` |

### G. Módulo: Financiero (`/api/v1/financial`)

| Endpoint | Método | Descripción | Permiso Requerido |
| :--- | :--- | :--- | :--- |
| `/facturas` | `GET` | Listar facturas emitidas y pendientes de cobro | `INVOICE.VIEW` |
| `/facturas/:id/pagar`| `POST` | Registrar un pago recibido (voucher de transferencia, tarjeta) | `INVOICE.PAY` |

---

## 3. Formato Estándar de Respuesta de la API

Para facilitar el consumo de la API en el frontend con Axios y TypeScript, todas las respuestas exitosas y de error tendrán una estructura uniforme.

### Respuesta Exitosa (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operación realizada con éxito",
  "data": {
    "id": "8c59345d-7521-4fbd-8ee4-2a6d482ee4b8",
    "nombre": "Excavadora Caterpillar 320"
  }
}
```

### Respuesta de Error (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`):
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "numeroSerie no debe estar vacío",
    "precioRentaDia debe ser un número positivo"
  ],
  "timestamp": "2026-07-23T19:04:00.000Z",
  "path": "/api/v1/inventory/equipos"
}
```
*Nota:* En NestJS, esta estructura de error se implementará globalmente a través de un **HttpExceptionFilter** y las validaciones de los DTOs con **ValidationPipe** utilizando `class-validator`.
