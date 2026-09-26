-- Migration: 20260924210000_add_rejection_and_notifications_tenant
-- Purpose: Añadir campos de eventos de cliente y motivo de rechazo a cotizaciones, y empresa_id a notificaciones con índices.
-- Reversible: Ver rollback.sql en el mismo directorio.

-- 1. Campos de eventos de cliente en Cotizaciones
ALTER TABLE "cotizaciones" 
  ADD COLUMN IF NOT EXISTS "motivo_rechazo" TEXT,
  ADD COLUMN IF NOT EXISTS "fecha_envio" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fecha_vista" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fecha_aceptacion" TIMESTAMP(3);

-- 2. Empresa e índices en Notificaciones (Outbox)
ALTER TABLE "notificaciones"
  ADD COLUMN IF NOT EXISTS "empresa_id" TEXT REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "notificaciones_empresa_id_idx" ON "notificaciones"("empresa_id");
CREATE INDEX IF NOT EXISTS "notificaciones_estado_idx" ON "notificaciones"("estado");
