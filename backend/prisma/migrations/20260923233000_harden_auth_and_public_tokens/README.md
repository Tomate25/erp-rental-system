# Migración: 20260923233000_harden_auth_and_public_tokens

## Descripción
Esta migración añade dos columnas seguras y retrocompatibles en soporte de **TAREA-AUD-005**:
1. **`usuarios.bloqueado_hasta` (`TIMESTAMP WITH TIME ZONE NULL`):**
   - Registra el instante hasta el cual un usuario queda bloqueado temporalmente por exceder el umbral de intentos fallidos (p. ej. 15 minutos).
   - Previene ataques de denegación de servicio (DoS) dirigidos que antes bloqueaban permanentemente a usuarios legítimos.
   - Si `bloqueado = true` y `bloqueado_hasta IS NULL`, indica un bloqueo administrativo manual.
2. **`cotizaciones.token_publico_revocado` (`BOOLEAN NOT NULL DEFAULT false`):**
   - Permite a los asesores y administradores revocar explícitamente un enlace de cotización pública previo a su fecha de vencimiento natural.
   - Permite rotar el token de acceso público sin alterar la información comercial de la cotización.

## Reversibilidad (`rollback.sql`)
La reversión de esta migración (`DOWN`) elimina limpiamente ambas columnas sin afectar los datos primarios de usuarios ni cotizaciones.
