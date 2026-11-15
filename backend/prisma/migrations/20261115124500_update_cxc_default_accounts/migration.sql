-- Actualiza las cuentas por defecto de CxC al nuevo catálogo BM (110301 y 210409)
ALTER TABLE "cxc_configuracion"
  ALTER COLUMN "cuenta_mayor_clientes" SET DEFAULT '110301',
  ALTER COLUMN "cuenta_anticipos_clientes" SET DEFAULT '210409';

UPDATE "cxc_configuracion"
SET "cuenta_mayor_clientes" = '110301'
WHERE "cuenta_mayor_clientes" = '110314';

UPDATE "cxc_configuracion"
SET "cuenta_anticipos_clientes" = '210409'
WHERE "cuenta_anticipos_clientes" = '210601';
