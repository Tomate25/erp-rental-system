-- Rollback Migration (DOWN): 20260923215000_migrate_monetary_columns_to_decimal
-- Purpose: Revert DECIMAL(12, 2) columns back to DOUBLE PRECISION (Float)

-- 1. Clientes
ALTER TABLE "clientes"
  ALTER COLUMN "limite_credito" SET DATA TYPE DOUBLE PRECISION;

-- 2. Productos
ALTER TABLE "productos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DOUBLE PRECISION;

-- 3. Equipos
ALTER TABLE "equipos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "costo_adquisicion" SET DATA TYPE DOUBLE PRECISION;

-- 4. Cotizaciones
ALTER TABLE "cotizaciones"
  ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "descuento" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "iva" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "deposito_garantia" SET DATA TYPE DOUBLE PRECISION;

-- 5. Detalle de Cotizaciones
ALTER TABLE "detalle_cotizacion"
  ALTER COLUMN "precio_unitario" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "descuento" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION;

-- 6. Contratos
ALTER TABLE "contratos"
  ALTER COLUMN "deposito_garantia" SET DATA TYPE DOUBLE PRECISION;

-- 7. Detalle de Contratos
ALTER TABLE "detalle_contratos"
  ALTER COLUMN "precio_renta" SET DATA TYPE DOUBLE PRECISION;

-- 8. Detalle de Devoluciones
ALTER TABLE "detalle_devolucion"
  ALTER COLUMN "cargo_combustible" SET DATA TYPE DOUBLE PRECISION;

-- 9. Inspecciones de Daño
ALTER TABLE "inspecciones_dano"
  ALTER COLUMN "costo_estimado" SET DATA TYPE DOUBLE PRECISION;

-- 10. Mantenimientos
ALTER TABLE "mantenimientos"
  ALTER COLUMN "costo" SET DATA TYPE DOUBLE PRECISION;

-- 11. Cortes de Facturación
ALTER TABLE "cortes_facturacion"
  ALTER COLUMN "monto" SET DATA TYPE DOUBLE PRECISION;

-- 12. Facturas
ALTER TABLE "facturas"
  ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "descuento_global" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "retencion_iva" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "iva" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION;

-- 13. Pagos
ALTER TABLE "pagos"
  ALTER COLUMN "monto" SET DATA TYPE DOUBLE PRECISION;

-- 14. Reglas de Comisión
ALTER TABLE "reglas_comision"
  ALTER COLUMN "monto_minimo" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "monto_maximo" SET DATA TYPE DOUBLE PRECISION;
