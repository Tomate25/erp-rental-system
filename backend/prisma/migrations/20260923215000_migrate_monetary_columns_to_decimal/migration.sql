-- Migration: 20260923215000_migrate_monetary_columns_to_decimal
-- Purpose: Convert all floating-point monetary columns to exact NUMERIC/DECIMAL(12, 2)
-- Reversible: See rollback.sql in the same directory for down migration.

-- 1. Clientes
ALTER TABLE "clientes"
  ALTER COLUMN "limite_credito" SET DATA TYPE DECIMAL(12, 2);

-- 2. Productos (Catálogo)
ALTER TABLE "productos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DECIMAL(12, 2);

-- 3. Equipos (Inventario de Maquinaria)
ALTER TABLE "equipos"
  ALTER COLUMN "precio_renta_dia" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "precio_renta_hora" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "costo_adquisicion" SET DATA TYPE DECIMAL(12, 2);

-- 4. Cotizaciones Comerciales
ALTER TABLE "cotizaciones"
  ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "descuento" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "iva" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "total" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "deposito_garantia" SET DATA TYPE DECIMAL(12, 2);

-- 5. Detalle de Cotizaciones
ALTER TABLE "detalle_cotizacion"
  ALTER COLUMN "precio_unitario" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "descuento" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12, 2);

-- 6. Contratos de Alquiler
ALTER TABLE "contratos"
  ALTER COLUMN "deposito_garantia" SET DATA TYPE DECIMAL(12, 2);

-- 7. Detalle de Contratos
ALTER TABLE "detalle_contratos"
  ALTER COLUMN "precio_renta" SET DATA TYPE DECIMAL(12, 2);

-- 8. Detalle de Devoluciones (Cargos de combustible)
ALTER TABLE "detalle_devolucion"
  ALTER COLUMN "cargo_combustible" SET DATA TYPE DECIMAL(12, 2);

-- 9. Inspecciones de Daño
ALTER TABLE "inspecciones_dano"
  ALTER COLUMN "costo_estimado" SET DATA TYPE DECIMAL(12, 2);

-- 10. Mantenimientos
ALTER TABLE "mantenimientos"
  ALTER COLUMN "costo" SET DATA TYPE DECIMAL(12, 2);

-- 11. Cortes de Facturación
ALTER TABLE "cortes_facturacion"
  ALTER COLUMN "monto" SET DATA TYPE DECIMAL(12, 2);

-- 12. Facturación Fiscal
ALTER TABLE "facturas"
  ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "descuento_global" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "retencion_iva" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "iva" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "total" SET DATA TYPE DECIMAL(12, 2);

-- 13. Pagos y Cobros
ALTER TABLE "pagos"
  ALTER COLUMN "monto" SET DATA TYPE DECIMAL(12, 2);

-- 14. Reglas de Comisión
ALTER TABLE "reglas_comision"
  ALTER COLUMN "monto_minimo" SET DATA TYPE DECIMAL(12, 2),
  ALTER COLUMN "monto_maximo" SET DATA TYPE DECIMAL(12, 2);
