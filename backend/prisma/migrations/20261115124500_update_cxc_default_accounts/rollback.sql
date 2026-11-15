ALTER TABLE "cxc_configuracion"
  ALTER COLUMN "cuenta_mayor_clientes" SET DEFAULT '110314',
  ALTER COLUMN "cuenta_anticipos_clientes" SET DEFAULT '210601';

UPDATE "cxc_configuracion"
SET "cuenta_mayor_clientes" = '110314'
WHERE "cuenta_mayor_clientes" = '110301';

UPDATE "cxc_configuracion"
SET "cuenta_anticipos_clientes" = '210601'
WHERE "cuenta_anticipos_clientes" = '210409';
