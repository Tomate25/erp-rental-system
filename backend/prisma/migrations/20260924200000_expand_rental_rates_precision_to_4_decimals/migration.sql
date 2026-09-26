-- Migration: 20260924200000_expand_rental_rates_precision_to_4_decimals
-- Purpose: Permitir hasta 4 decimales en tarifas unitarias de renta de productos y equipos (ej. tarifas por hora o día fraccionales como 1.5228, 5.451, 16.898)
-- Reversible: Ver rollback.sql en el mismo directorio.

ALTER TABLE "productos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DECIMAL(14, 4),
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DECIMAL(14, 4);

ALTER TABLE "equipos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DECIMAL(14, 4),
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DECIMAL(14, 4);

ALTER TABLE "detalle_cotizacion"
  ALTER COLUMN "precio_unitario" SET DATA TYPE DECIMAL(14, 4);

ALTER TABLE "detalle_contratos"
  ALTER COLUMN "precio_renta" SET DATA TYPE DECIMAL(14, 4);
