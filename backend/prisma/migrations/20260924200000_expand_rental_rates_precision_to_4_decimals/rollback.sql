-- Reversión de migración: volver a DECIMAL(12, 2)
ALTER TABLE "productos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DECIMAL(12, 2);

ALTER TABLE "equipos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DECIMAL(12, 2);

ALTER TABLE "detalle_cotizacion"
  ALTER COLUMN "precio_unitario" SET DATA TYPE DECIMAL(12, 2);

ALTER TABLE "detalle_contratos"
  ALTER COLUMN "precio_renta" SET DATA TYPE DECIMAL(12, 2);
