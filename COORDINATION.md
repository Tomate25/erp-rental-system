# 🤝 TABLERO DE COORDINACIÓN: ANTIGRAVITY (GEMINI) & CODEX (OPENAI)
**Proyecto**: `C:\Users\abdia\erp-rental-system`  
**Fecha**: 2026-09-08  
**Modo**: Colaboración Multi-Agente en Tiempo Real

---

## 👥 Asignación de Roles y Agentes

| Agente | Entorno / Proceso | Responsabilidad Principal |
| :--- | :--- | :--- |
| **Antigravity (Gemini 3.8 / Pro)** | Antigravity CLI | Orquestación general, Auditoría de integridad, Migraciones Prisma, Tareas 1.1, 1.2, 1.6, 1.7, 1.8 y Concurrencia |
| **Codex (OpenAI)** | PowerShell Window (`abdia`) | Tareas 1.3, 1.4 y 1.5 (Lógica de Contratos, Facturación y Erradicación de Stock Falso) |

---

## 📋 Estado de Tareas - Fase 1 (P0: Integridad y Lógica de Negocio) — ¡FASE COMPLETADA! 🎉

| # | Tarea | Agente Asignado | Estado | Archivos Afectados |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | Migraciones completas de Prisma y ajuste CI/CD | **Antigravity** | ✅ **COMPLETADO** | `prisma/migrations/20260908232345_sync_models/`, `.github/workflows/ci-cd.yml` |
| **1.2** | Corregir cotización pública (eliminar UUID ficticio, auto-crear prospecto) | **Antigravity (DeepCoder)** | ✅ **COMPLETADO** | `frontend/src/modules/quotations/pages/PublicQuotationRequest.tsx`, `backend/src/modules/quotations/` |
| **1.3** | Reparar asignación de IDs de equipos (`item.equipoId \|\| item.id`) | **Codex & DeepCoder** | ✅ **COMPLETADO** | `contracts/utils/resolve-quotation-equipment.ts`, `quotations.service.ts`, `billing.service.ts` |
| **1.4** | Unificar generador de contratos (eliminar duplicación) | **Codex & Antigravity** | ✅ **COMPLETADO** | `quotations.service.ts`, `billing.service.ts`, `contracts.service.ts` |
| **1.5** | Erradicar falsificación de stock (`ensureValidEquipoTx`) | **Codex & Antigravity** | ✅ **COMPLETADO** | `contracts.service.ts` (eliminado método fantasma y conectada validación real) |
| **🛡️** | **Blindaje contra Colisiones Concurrentes (Race Conditions)** | **Antigravity** | ✅ **BLINDADO** | `SELECT ... FOR UPDATE` en Cotizaciones, Contratos y Facturación (`ConflictException`) |
| **1.6** | Transacciones y registro de horómetros en operaciones | **Antigravity** | ✅ **COMPLETADO** | `operations.service.ts` (despacho/retorno transaccionales y registro en `LecturaHorometro`) |
| **1.7** | Persistir registro `Pago` en `markAsPaid` | **Antigravity** | ✅ **COMPLETADO** | `billing.service.ts` (creación de registro `Pago` y coherencia contable) |
| **1.8** | Protección al eliminar clientes con historial | **Antigravity** | ✅ **COMPLETADO** | `clients.service.ts` (validación de relaciones previas antes de eliminación) |

---

## 📋 Estado de Tareas - Fase 2 (P1: Seguridad y Multi-Tenant) — ¡FASE COMPLETADA! 🎉

| # | Tarea | Agente Asignado | Estado | Archivos Afectados |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | Cierre de fugas multi-tenant en disponibilidad y contabilidad | **Codex** | ✅ **COMPLETADO** | `availability.controller.ts`, `availability.service.ts`, `accounting.service.ts`, `availability.tenant.spec.ts` |
| **2.2** | Implementación de Refresh Tokens (`/auth/refresh`) y reintento en Axios | **Antigravity** | ✅ **COMPLETADO** | `auth.controller.ts`, `auth.service.ts`, `refresh-token.dto.ts`, `api.ts`, `auth.service.spec.ts` |
| **2.3** | Hardening: Quitar fallback de claves JWT y restringir CORS | **Antigravity** | ✅ **COMPLETADO** | `auth.module.ts`, `jwt.strategy.ts`, `main.ts` |
| **2.4** | Rate Limiting con `@nestjs/throttler` en `/auth/login` | **Antigravity** | ✅ **COMPLETADO** | `app.module.ts`, `auth.controller.ts`, `package.json` |
| **2.5** | Purgar del repositorio Git los archivos de volcado (`.sql` y `.dump`) | **Codex** | ✅ **COMPLETADO** | `.gitignore`, `git rm --cached` (ambos respaldos conservados físicamente en disco con SHA-256 intactos) |

---

## 📊 Estado de Base de Datos y Calidad
- **Total Clientes Activos**: **943 clientes reales** activos en base de datos.
- **Usuarios Verificados**: `abdiasl085@gmail.com` (Rol ADMIN), `admin@rental.com` (Rol ADMIN).
- **Pruebas Automatizadas**: **13 suites de pruebas aprobadas, 71/71 pruebas unitarias exitosas (100%)**.
- **Compilación General**: `nest build` (Backend: 0 errores), `vite build` (Frontend: 0 errores).

---

## 📋 Estado de Tareas - Fase 3 (P2: Resiliencia, Observabilidad y Despliegue) — ¡FASE COMPLETADA! 🎉

| # | Tarea | Agente Asignado | Estado | Archivos Afectados |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | Endpoint de Health Check Activo (`GET /api/v1/health`) | **Antigravity** | ✅ **COMPLETADO** | `health.controller.ts`, `health.service.ts`, `health.module.ts`, `health.controller.spec.ts` |
| **3.2** | Filtro Global de Excepciones y Sanitización de Errores | **Antigravity** | ✅ **COMPLETADO** | `all-exceptions.filter.ts`, `main.ts` |
| **3.3** | Docker & Deployment Readiness (Auto-migración y Healthchecks) | **Antigravity** | ✅ **COMPLETADO** | `Dockerfile`, `docker-compose.yml` |

---

## 📋 Estado de Tareas - Fase 4 (UX, Limpieza de Navegación, Unificación Visual y Español 100%) — EN CURSO

| # | Tarea | Agente Asignado | Estado | Archivos Afectados |
| :--- | :--- | :--- | :--- | :--- |
| **4.1** | **Erradicación de Enumeración de Pasos y Unificación de Cabecera**: Eliminadas todas las enumeraciones y badges de pasos (`PASO 1`, `PASO 2`, etc.) en todas las definiciones de módulos. Unificada la vista del usuario en la cabecera para que sea **100% idéntica** en el Launcher y dentro de cada Módulo (mismo contenedor, ícono `User`, nombre, rol en naranja `#C55500` y botón directo de `LogOut`). Cabecera izquierda minimalista: botón `Mis Módulos`, separador, título del módulo y `Sucursal Managua`. | **Antigravity** | ✅ **COMPLETADO** | `frontend/src/App.tsx` |
| **4.2** | **Erradicación de Términos en Inglés y Fallbacks**: Reemplazado `Timeline` por `Cronograma`, `user/users` por `usuario/usuarios`, `Email` por `Correo`, `Cell` por `Móvil`, `Precision Enterprise System` por `Sistema de Gestión Empresarial`, `ITEM` por `ÍTEM`, `S/N` por `Serie`, y erradicado el uso de `'N/A'` en toda la interfaz reemplazándolo por textos descriptivos (`Sin Límite`, `Sin Referencia`, `Sin Dirección`, `No Especificado`, `Consumidor Final`, `Sin fecha`). | **Antigravity** | ✅ **COMPLETADO** | `LoginPage.tsx`, `QuotationPrintView.tsx`, `InvoicePrintView.tsx`, `ContractPrintView.tsx`, `ActaEntregaPrintView.tsx`, `ActaRecepcionPrintView.tsx`, `QuotationsPage.tsx`, `BillingDashboard.tsx`, `ClientTable.tsx`, `OperationsPage.tsx`, `AvailabilityPage.tsx`, `CreateContractModal.tsx` |
| **4.3** | **Blindaje y Traducción Automática de Validaciones Backend en Español**: Implementado interceptor y traductor sistemático en `AllExceptionsFilter` que traduce automáticamente todas las restricciones por defecto de `class-validator` y excepciones de NestJS a español formal (`no debe estar vacío`, `debe ser un correo electrónico válido`, `debe ser una cadena de texto`, etc.). Auditoría de subagente completada sobre todos los DTOs y controladores. | **Antigravity & Subagente Auditor** | ✅ **COMPLETADO** | `all-exceptions.filter.ts`, `backend/src/**/*.dto.ts` |

---

## 📢 Registro de Entrega Antigravity — Fase 4 COMPLETADA:
> 1. **Erradicación de Pasos**: Eliminadas todas las propiedades `paso: 'PASO X'` y badges correspondientes. La navegación ya no se presenta como un asistente o wizard lineal.
> 2. **Unificación Visual de Cabecera**: El componente de perfil de usuario (`User` avatar cuadrado, nombre completo, rol en `#C55500` y botón `LogOut`) es idéntico al 100% entre el Launcher y el interior de cualquier módulo.
> 3. **Español 100% Riguroso**: Erradicados todos los términos en inglés (`Timeline`, `Cell`, `Email`, `ITEM`, `S/N`, branding en inglés, y acrónimos `'N/A'`).
> 4. **Traducción Automática Backend**: `AllExceptionsFilter` traduce automáticamente cualquier respuesta o validación DTO a español formal.
> 5. **Pruebas y Compilación**: `nest build` (0 errores), `vite build` (0 errores, 1960 módulos), 13/13 suites de pruebas aprobadas (71/71 tests unitarios al 100%).

---

## 📋 Estado de Tareas - Fase 5 (Auditoría Integral de Seguridad y Pentesting Defensivo Multi-Agente) — ¡FASE COMPLETADA! 🛡️

| # | Tarea | Agente Asignado | Estado | Archivos Afectados / Foco |
| :--- | :--- | :--- | :--- | :--- |
| **5.1** | **Auditoría de Seguridad en API Backend (RBAC, IDOR, Multi-Tenant y Sanitización)**: <br>1. Revisar todos los controladores en `backend/src/modules/` para verificar que toda ruta protegida use `@UseGuards(JwtAuthGuard, RolesGuard)` y los roles requeridos.<br>2. Auditar endpoints con IDs por parámetro (`:id`) para prevenir IDOR y validar pertenencia a la empresa del usuario (`empresaId`).<br>3. Verificar que ninguna consulta SQL use concatenación o `$queryRawUnsafe`.<br>4. Verificar que el campo `password` nunca se devuelva en payloads JSON de usuarios.<br>5. Verificar Throttler / Rate Limiting en endpoints sensibles. | **Codex (PowerShell: abdia)** | ✅ **COMPLETADO** | `backend/src/modules/**/*.controller.ts`, `backend/src/modules/**/*.service.ts`, `backend/src/main.ts` |
| **5.2** | **Auditoría de Frontend, Secretos y Hardening HTTP (SAST Defensivo)**: <br>1. Despliegue de subagente autónomo para escaneo estático de vulnerabilidades.<br>2. Verificar almacenamiento seguro de credenciales y tokens (LocalStorage, Bearer interceptors, refresh cycle).<br>3. Verificar que no existan vectores XSS en vistas de impresión ni uso inseguro de `dangerouslySetInnerHTML`.<br>4. Revisar políticas de CORS, headers de seguridad HTTP y credenciales quemadas. | **Antigravity & Subagente de Seguridad** | ✅ **COMPLETADO (16 HALLAZGOS AUDITADOS)** | `frontend/src/`, `backend/src/main.ts`, `.env*`, configuraciones |

---

## 📢 Instrucciones Directas para Codex (Ventana PowerShell `abdia`):
> **Hola Codex:**
> El usuario ha solicitado que ambos agentes (tú y Antigravity) realicemos un **análisis y auditoría profunda de seguridad** sobre el sistema `erp-rental-system`.
> 
> El subagente de seguridad de Antigravity ha completado el escaneo general y ha detectado los siguientes puntos críticos que requieren atención en el backend:
> 
> **Tu tarea asignada (5.1: Remediación y Hardening Backend):**
> 1. Ejecuta `git pull origin main` en tu ventana de PowerShell.
> 2. **Fuga Multi-Tenant en Facturación**: En `BillingService.getPendingCortes(empresaId?: string)`, `corteFacturacion.findMany` no filtra por `contrato: { sucursal: { empresaId } }`. Agrega el filtro para que una empresa no vea los cortes pendientes de otra.
> 3. **IDOR en Cotizaciones**: En `QuotationsService.create()`, valida que el `createDto.clienteId` pertenezca a la `empresaId` del usuario autenticado antes de asociarlo o asignarle asesor.
> 4. **Aislamiento en Solicitudes Operativas**: En `OperationsService.createDespacho()` y `createRetorno()`, al actualizar `solicitudDespachoId` o `solicitudRetornoId` a `COMPLETADA`, valida que la solicitud pertenezca a la misma `empresaId` y `contratoId`.
> 5. **Registro de Usuarios en `AuthService.register()`**: Valida que un `ADMIN` solo pueda registrar usuarios dentro de su propia `empresaId` (no permitir inyectar una empresa ajena desde el payload).
> 6. **Cambio de Contraseña Seguro**: En `UsersController.changePassword()` / `UsersService.forceChangePassword()`, solicitar la contraseña actual (`oldPassword`), validarla con `argon2.verify`, e implementar validación de complejidad mínima.
> 7. **Sanitización de Queries SQL**: En `quotations.service.ts` (L269), `contracts.service.ts` (L139) y `billing.service.ts` (L93), migrar `$executeRawUnsafe` al tagged template seguro de Prisma `$executeRaw\`SELECT id FROM ... WHERE id = ${id} FOR UPDATE\``.
> 8. **Exclusión de `sessionToken`**: En `UsersService`, omitir `sessionToken` de las respuestas JSON de usuario.
> 9. Al concluir, registra tus hallazgos, correcciones y resultados al final de este archivo `COORDINATION.md` y ejecuta `npm test` para asegurar que las 13 suites sigan al 100%.

---

## 🛡️ Matriz Consolidada de Hallazgos de Seguridad (Antigravity & Subagente)

| ID | Hallazgo | Categoría | Criticidad | Ubicación | Estado / Asignado |
|---|---|---|---|---|---|
| **SEC-01** | Archivo de credenciales en texto plano en la raíz del proyecto | Exposición de Secretos | **ALTA** | `usuarios_credenciales_bmconstrucciones.txt` | Requiere purgar de Git e ignorar |
| **SEC-02** | Secretos de producción quemados en `docker-compose.yml` | Exposición de Secretos | **ALTA** | `docker-compose.yml` | Requiere variables de entorno `.env` |
| **SEC-03** | Endpoints públicos de cotizaciones sin rate-limiting estricto | Control de Acceso | **ALTA** | `quotations.controller.ts:14-31` | Antigravity / Codex |
| **SEC-04** | Creación de cotizaciones vinculadas a clientes de otros tenants (IDOR cross-tenant) | Aislamiento Multi-Tenant | **ALTA** | `quotations.service.ts:41-61` | Codex (Tarea 5.1) |
| **SEC-05** | Modificación de solicitudes operativas ajenas (IDOR) | Aislamiento Multi-Tenant | **ALTA** | `operations.service.ts:211-216, 324-329` | Codex (Tarea 5.1) |
| **SEC-06** | Fuga multi-tenant en `BillingService.getPendingCortes()` | Aislamiento Multi-Tenant | **ALTA** | `billing.service.ts:31-47` | Codex (Tarea 5.1) |
| **SEC-07** | Registro de usuarios en tenants ajenos en `AuthService.register()` | Multi-Tenant / Auth | **ALTA** | `auth.service.ts:183-248` | Codex (Tarea 5.1) |
| **SEC-08** | Cambio de clave sin verificar clave actual | Control de Acceso | **MEDIA** | `users.controller.ts:78-84` | Codex (Tarea 5.1) |
| **SEC-09** | Ausencia de `RolesGuard` en `AvailabilityController` | Control de Acceso | **MEDIA** | `availability.controller.ts` | Codex (Tarea 5.1) |
| **SEC-10** | Uso de `$executeRawUnsafe` para bloqueos de fila | Inyección SQL / Hardening | **MEDIA** | `quotations.service.ts`, `contracts.service.ts`, `billing.service.ts` | Codex (Tarea 5.1) |
| **SEC-11** | Ausencia de Helmet y cabeceras de seguridad HTTP | Hardening HTTP | **MEDIA** | `backend/src/main.ts` | Antigravity |
| **SEC-12** | Exposición de `sessionToken` en respuestas de usuarios | Fuga de Información | **BAJA** | `users.service.ts` | Codex (Tarea 5.1) |
| **SEC-13** | Generador pseudoaleatorio inseguro (`Math.random`) en reset de clave temporal | Criptografía | **BAJA** | `users.service.ts:192` | Codex (Tarea 5.1) |
| **SEC-14** | Vistas de Impresión Frontend (XSS) | Frontend SAST | ✅ **APROBADO (SEGURO)** | `frontend/src/**/components/*PrintView.tsx` | Sin vulnerabilidades XSS |

---

## Codex — Entrega Tareas 2.1 y 2.5 COMPLETADAS
- Disponibilidad: `@GetUser('empresaId')` pasa la empresa autenticada al servicio. Reservas, contratos y despachos quedan limitados por empresa; se filtran también los equipos incluidos en los detalles. Sin empresa válida se devuelve HTTP 403 antes de consultar datos.
- Contabilidad: CxC, CxP, Balance y Estado de Resultados exigen empresa. Facturas por `empresaId` y cliente de la misma empresa; pagos por factura; mantenimiento/equipos por empresa y sucursal; depósitos por contrato; inspecciones por equipo y devolución/contrato de la empresa. Eliminados filtros opcionales y consultas globales. Facturas con `empresaId` nulo o distinto ya no se incorporan por coincidencia de cliente.
- Git: añadidos `*.sql`, `*.dump` y `.env*`. Excepción `!backend/prisma/migrations/**/migration.sql` para conservar migraciones actuales y futuras. Ejecutado `git rm --cached -- backup_erp_dev.sql backup_erp_dev.dump`; ambos archivos permanecen en disco y fuera del índice, con SHA-256 idénticos antes/después. Las bajas están preparadas en el índice; no se reescribió el historial Git.
- Verificación Codex: `npm run build` backend con exit code 0. `npm test -- --runInBand --runTestsByPath src/modules/availability/availability.tenant.spec.ts src/modules/availability/availability.controller.spec.ts src/modules/availability/availability.service.spec.ts src/modules/accounting/services/accounting.service.spec.ts`: 4 suites y 28 pruebas aprobadas. Incluye separación de totales entre dos empresas, factura con propietario/cliente distintos, filtros de todos los orígenes y rechazo de empresa ausente. Pruebas unitarias con Prisma simulado.
- Archivos adicionales de pruebas: `availability/availability.tenant.spec.ts` y `accounting/services/accounting.service.spec.ts`. Los cambios de autenticación de Antigravity se conservaron.



---

## Codex — Entrega Fase 5.1 COMPLETADA (2026-09-09)

- **RBAC y rate limiting**: `AvailabilityController` quedó protegido con `JwtAuthGuard`, `RolesGuard` y roles explícitos. Se confirmó que el resto de controladores privados aplica guardas y roles según su función. Se agregó límite de 10 solicitudes/minuto a `/auth/refresh` y 5 solicitudes/minuto a `/users/change-password`; login y cotizaciones públicas ya tenían límites activos.
- **Aislamiento multi-tenant**: los cortes pendientes de facturación se filtran por `contrato.sucursal.empresaId`. La creación y actualización de cotizaciones valida que cliente y asesor pertenezcan a la empresa autenticada. Despachos y retornos validan que la solicitud corresponda simultáneamente a `empresaId` y `contratoId`; también se impide operar equipos ajenos a la empresa o al contrato.
- **Registro de usuarios**: `/auth/register` pasa la empresa del JWT al servicio y rechaza cualquier `empresaId` diferente. Las sucursales también se validan contra esa misma empresa.
- **Contraseñas y sesiones**: el cambio de contraseña exige la contraseña actual, la verifica con `argon2.verify` y valida un mínimo de 8 caracteres con mayúscula, minúscula, número y carácter especial. La pantalla de cambio obligatorio fue actualizada para enviar la contraseña actual. Las contraseñas temporales ahora usan `crypto.randomInt`.
- **Sanitización de respuestas**: `UsersService` y el registro de autenticación omiten `password` y `sessionToken`. Se detectó y corrigió además que la relación `asesor` completa podía exponer esos campos en cotizaciones públicas; ahora solo selecciona `id`, `nombre`, `apellido` y `email`.
- **SQL seguro**: eliminadas las tres llamadas a `$executeRawUnsafe`; los bloqueos de fila de cotizaciones, contratos y facturación usan tagged templates de Prisma con parámetros. El escaneo final no encontró `$executeRawUnsafe` ni `$queryRawUnsafe` en `backend/src`.
- **Pruebas de regresión**: añadida cobertura para cortes por empresa, clientes/asesores cross-tenant, reasignación de cotizaciones, solicitudes y equipos operativos ajenos, registro cross-tenant, verificación y complejidad de contraseñas, exclusión de tokens y selección segura del asesor.
- **Verificación final**: `npm test -- --runInBand` — **15/15 suites y 84/84 pruebas aprobadas**. `npm run build` backend — **0 errores**. `npm run build` frontend — **0 errores** (1960 módulos).

---

## Fase 5.2 — Gestión y Detección Precisa de Tarifas por Día y por Hora (Cotizaciones y Contratos)

### Diagnóstico de Incidencia
1. En `frontend`, existía una heurística arbitraria `(item as any).tipoTarifa === 'HORA' || (item.precioUnitario && item.precioUnitario < 500)` en `QuotationForm.tsx`, `QuotationPrintView.tsx` y `ContractPrintView.tsx`. Si una tarifa por día era menor a C$ 500 (ej. C$ 45.00/día para BS50-2), se forzaba visualmente a "hrs" y "C$ / hr".
2. `QuotationItemDto` en backend carecía del campo `tipoCobro` (enum `TipoCobro { POR_DIA, POR_HORA }`), perdiéndose la modalidad al enviar o actualizar cotizaciones.
3. `quotations.service.ts` en `update()` omitía `tipoCobro` al recrear los ítems.
4. `resolve-quotation-equipment.ts` al convertir una cotización a contrato omitía propagar `tipoTarifa` a `DetalleContrato` (`tipoTarifa: item.tipoCobro === 'POR_HORA' ? 'HORA' : 'DIA'`), provocando que contratos de equipos por hora volvieran al default 'DIA'.

### División de Tareas Conjuntas:
- **Codex (Backend & Persistencia de Contratos/Cotizaciones)**:
  1. Actualizar `backend/src/modules/quotations/dto/create-quotation.dto.ts` y `update-quotation.dto.ts` agregando `@IsEnum(TipoCobro) @IsOptional() tipoCobro?: TipoCobro;` y `@IsOptional() horas?: number;` a `QuotationItemDto`.
  2. En `backend/src/modules/quotations/services/quotations.service.ts`: asegurar que `tipoCobro` y `horas` se persistan correctamente tanto en `create()` como en `update()`.
  3. En `backend/src/modules/contracts/utils/resolve-quotation-equipment.ts`: mapear `tipoTarifa: (item as any).tipoCobro === 'POR_HORA' ? 'HORA' : 'DIA'` al generar los registros de `DetalleContratoCreateWithoutContratoInput`.
  4. Actualizar las pruebas unitarias pertinentes en backend (`npm test -- --runInBand`) verificando la persistencia de `tipoCobro` y la asignación a `DetalleContrato`.

- **Antigravity (Frontend & UX Dinámica)**:
  1. Actualizar `frontend/src/modules/quotations/types/quotation.types.ts`: agregar `tipoCobro?: 'POR_DIA' | 'POR_HORA'` y `tipoTarifa?: 'DIA' | 'HORA'` a `DetalleCotizacion`.
  2. Eliminar completamente el hack `< 500` en `QuotationForm.tsx`, `QuotationPrintView.tsx` y `ContractPrintView.tsx`.
  3. En `QuotationForm.tsx`: permitir alternar libremente la modalidad [DÍA / HORA] por ítem con un selector/badge interactivo. Si el equipo tiene `precioRentaDia` y `precioRentaHora`, auto-actualizar el `precioUnitario` según la modalidad seleccionada.
  4. Enviar `tipoCobro` en el payload de cotización hacia el backend.
  5. En `ContractForm.tsx`: heredar fielmente `tipoTarifa` desde la cotización aprobada (`it.tipoCobro === 'POR_HORA' ? 'HORA' : 'DIA'`).

### Entrega Backend — Codex (2026-09-09)
- **DTO compartido de ítems**: `QuotationItemDto`, reutilizado por `CreateQuotationDto` y `UpdateQuotationDto`, valida ahora `tipoCobro?: TipoCobro` con `@IsEnum` y `horas?: number` con `@IsNumber`.
- **Persistencia de cotizaciones**: `create()` y `update()` guardan `tipoCobro`, aplican `POR_DIA` por defecto y recuperan `horas` desde `dias` para payloads por hora que no envían el campo explícito.
- **Propagación a contratos**: el resolver compartido conserva `HORA` cuando recibe `tipoCobro: POR_HORA` o `tipoTarifa: HORA`; en los demás casos asigna `DIA`. También propaga `dias` con valor por defecto `1`.
- **Cobertura de regresión**: pruebas de creación y actualización de cotizaciones para modalidad/hora, y verificación de propagación contractual en los flujos de aprobación y facturación. Se ajustó la expectativa diaria del flujo directo de contratos.
- **Verificación final backend**: `npm test -- --runInBand` — **15/15 suites y 86/86 pruebas aprobadas**. `npm run build` — **0 errores**.

---

## Fase 5.3 — Cobertura de Pruebas Unitarias (Clientes e Inventario) y Parametrización de Secretos Docker

### Tareas Asignadas a Codex:
1. **Crear `backend/src/modules/clients/services/clients.service.spec.ts`**:
   - Probar creación de cliente con `empresaId`.
   - Probar `findAll(empresaId)` y `findOne(id, empresaId)` garantizando aislamiento por empresa.
   - Probar `update()` y `remove()` validando que rechacen accesos cross-tenant.
   - Probar protección de borrado si el cliente tiene contratos activos.

2. **Crear `backend/src/modules/inventory/services/inventory.service.spec.ts`**:
   - Probar creación y listado de productos comerciales filtrados por `empresaId`.
   - Probar listado y detalle de equipos físicos garantizando aislamiento multi-tenant.

3. **Parametrizar `docker-compose.yml` (SEC-02)**:
   - Sustituir credenciales quemadas en `docker-compose.yml` por variables con fallbacks (`${DATABASE_URL}`, `${JWT_ACCESS_SECRET}`, `${JWT_REFRESH_SECRET}`, `${POSTGRES_PASSWORD}`).

4. **Verificación**:
   - Ejecutar `npm test -- --runInBand` en backend para asegurar que todas las suites (17 suites) pasen al 100%.
   - Registrar la entrega al final de `COORDINATION.md`.

### Entrega Fase 5.3 — Codex (2026-09-09)
- **Clientes**: creada `clients.service.spec.ts` con cobertura de creación asociada a `empresaId`, listados y detalles filtrados por empresa, actualización autorizada y rechazo de actualización/eliminación cross-tenant. También se verifica que un cliente con historial contractual no pueda eliminarse.
- **Inventario**: creada `inventory.service.spec.ts` con cobertura de creación de productos comerciales dentro de la empresa autenticada, filtros de catálogo por `empresaId` y aislamiento de los detalles de productos. Los listados y detalles de equipos físicos también validan explícitamente el filtro multi-tenant y el rechazo de equipos ajenos.
- **Docker Compose (SEC-02)**: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `POSTGRES_PASSWORD` se obtienen ahora de variables de entorno con valores fallback para desarrollo; se eliminaron las claves JWT de producción que estaban escritas directamente en el archivo.
- **Verificación final backend**: `npm test -- --runInBand` — **17/17 suites y 101/101 pruebas aprobadas**. `npm run build` — **0 errores**.
- **Validación de Compose**: el YAML fue parseado correctamente con el analizador local `js-yaml`. No fue posible ejecutar la validación adicional `docker compose config` porque Docker CLI no está instalado en este entorno; la interpolación utilizada sigue el formato `${VARIABLE:-fallback}` de Docker Compose.

---

## 📋 Estado de Tareas - Fase 5.4 (Auditoría Exhaustiva de DTOs, Whitelist Strict y Blindaje de Cotización/Revisión) — EN EJECUCIÓN 🛡️

### Diagnóstico de la Incidencia Reportada por el Usuario
- **Error presentado al Enviar a Revisión**:  
  `items.0.el campo tipoTarifa no está permitido`  
  `items.1.el campo tipoTarifa no está permitido`
- **Causa Raíz**:  
  En `backend/src/main.ts`, el `ValidationPipe` global tiene habilitadas las banderas `whitelist: true` y `forbidNonWhitelisted: true`. Cualquier propiedad enviada por el frontend que no cuente con un decorador de validación de `class-validator` en el DTO correspondiente es rechazada con un error HTTP 400.  
  1. En `frontend/src/modules/quotations/components/QuotationForm.tsx`, el constructor de items incluye `tipoTarifa: (isHourly ? 'HORA' : 'DIA') as 'HORA' | 'DIA'`.
  2. En `backend/src/modules/quotations/dto/create-quotation.dto.ts`, la clase `QuotationItemDto` (reutilizada por `UpdateQuotationDto`) no tenía decorado el campo `tipoTarifa` ni `productoId`.
  3. Al enviar la cotización a revisión (`updateQuotation` con `estado: EN_REVISION`), el backend rechaza los ítems inmediatamente.

### Auditoría Exhaustiva de DTOs en Todos los Módulos:
1. **Cotizaciones (`backend/src/modules/quotations`)**:
   - `QuotationItemDto`: Agregar `@IsString() @IsOptional() tipoTarifa?: string;` y `@IsString() @IsOptional() productoId?: string;`.
   - `CreateQuotationDto`: Agregar `@IsString() @IsOptional() notasRevision?: string;`.
   - `quotations.service.ts`: En `create()` y `update()`, normalizar para que si se recibe `tipoTarifa === 'HORA'` y no viene `tipoCobro`, se asigne `TipoCobro.POR_HORA`.
2. **Contratos (`backend/src/modules/contracts`)**:
   - `ContractItemDto`: Agregar `@IsString() @IsOptional() modelo?: string;`, `@IsString() @IsOptional() tipoCobro?: string;`, `@IsString() @IsOptional() tipoTarifa?: string;`, `@IsNumber() @IsOptional() horas?: number;`, `@IsNumber() @IsOptional() descuento?: number;`, `@IsNumber() @IsOptional() subtotal?: number;`.
   - `frontend/.../CreateContractModal.tsx`: Mapear explícitamente los campos del ítem al crear contrato directo para no enviar campos innecesarios.
3. **Inventario (`backend/src/modules/inventory`)**:
   - `CreateEquipmentDto` y `UpdateEquipmentDto`: Agregar `@IsNumber() @IsOptional() precioRentaHora?: number;`, `@IsNumber() @IsOptional() minimoHoras?: number;`, `@IsEnum(TipoControlEquipo) @IsOptional() tipoControl?: TipoControlEquipo;`, `@IsNumber() @IsOptional() costoAdquisicion?: number;`, `@IsDateString() @IsOptional() fechaAdquisicion?: string;`.
   - `inventory.service.ts`: Persistir `precioRentaHora`, `minimoHoras`, `tipoControl`, `costoAdquisicion` y `fechaAdquisicion` en Prisma al crear y actualizar equipos.
4. **Operaciones (`backend/src/modules/operations`)**:
   - `ItemDevolucionDto`: Agregar `@IsNumber() @IsOptional() cantidadDanada?: number;` como alias sin tilde para resiliencia ante diferencias de codificación de caracteres.

| # | Tarea | Agente Asignado | Estado | Archivos Afectados |
| :--- | :--- | :--- | :--- | :--- |
| **5.4.1** | Blindar `QuotationItemDto` y `quotations.service.ts` con `tipoTarifa` y `productoId` | **Antigravity & Codex** | 🔄 **EN EJECUCIÓN** | `create-quotation.dto.ts`, `quotations.service.ts` |
| **5.4.2** | Blindar `ContractItemDto` con `modelo`, `tipoTarifa`, `tipoCobro`, `horas` | **Antigravity & Codex** | 🔄 **EN EJECUCIÓN** | `create-contract.dto.ts`, `CreateContractModal.tsx` |
| **5.4.3** | Blindar `CreateEquipmentDto`, `UpdateEquipmentDto` e `inventory.service.ts` con `precioRentaHora` y `minimoHoras` | **Antigravity & Codex** | 🔄 **EN EJECUCIÓN** | `create-equipment.dto.ts`, `update-equipment.dto.ts`, `inventory.service.ts` |
| **5.4.4** | Blindar `ItemDevolucionDto` con alias `cantidadDanada` y verificar suites de tests (17 suites) | **Antigravity & Codex** | 🔄 **EN EJECUCIÓN** | `create-operations.dto.ts`, tests unitarios |

