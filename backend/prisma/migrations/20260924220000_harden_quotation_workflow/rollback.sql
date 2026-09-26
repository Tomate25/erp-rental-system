DROP INDEX IF EXISTS "cotizaciones_empresa_numero_version_key";
DROP INDEX IF EXISTS "contratos_cotizacion_id_key";
DROP INDEX IF EXISTS "notificaciones_estado_procesando_created_at_idx";
DROP INDEX IF EXISTS "notificaciones_clave_idempotencia_key";

ALTER TABLE "notificaciones"
  DROP COLUMN IF EXISTS "updated_at",
  DROP COLUMN IF EXISTS "ultimo_intento",
  DROP COLUMN IF EXISTS "procesando",
  DROP COLUMN IF EXISTS "intentos",
  DROP COLUMN IF EXISTS "clave_idempotencia";
