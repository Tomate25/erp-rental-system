ALTER TABLE "notificaciones"
  ADD COLUMN IF NOT EXISTS "clave_idempotencia" TEXT,
  ADD COLUMN IF NOT EXISTS "intentos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "procesando" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ultimo_intento" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "notificaciones"
  ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "notificaciones_clave_idempotencia_key"
  ON "notificaciones"("clave_idempotencia");
CREATE INDEX IF NOT EXISTS "notificaciones_estado_procesando_created_at_idx"
  ON "notificaciones"("estado", "procesando", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "contratos_cotizacion_id_key"
  ON "contratos"("cotizacion_id") WHERE "cotizacion_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "cotizaciones_empresa_numero_version_key"
  ON "cotizaciones"("empresa_id", "numero_cotizacion", "version")
  WHERE "empresa_id" IS NOT NULL;
