-- Reversión de migración: 20260924210000_add_rejection_and_notifications_tenant

DROP INDEX IF EXISTS "notificaciones_estado_idx";
DROP INDEX IF EXISTS "notificaciones_empresa_id_idx";

ALTER TABLE "notificaciones"
  DROP COLUMN IF EXISTS "empresa_id";

ALTER TABLE "cotizaciones"
  DROP COLUMN IF EXISTS "fecha_aceptacion",
  DROP COLUMN IF EXISTS "fecha_vista",
  DROP COLUMN IF EXISTS "fecha_envio",
  DROP COLUMN IF EXISTS "motivo_rechazo";
