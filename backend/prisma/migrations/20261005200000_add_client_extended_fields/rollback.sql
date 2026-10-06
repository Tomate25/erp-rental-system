-- Rollback
ALTER TABLE "clientes" DROP COLUMN IF EXISTS "tipo_cliente",
DROP COLUMN IF EXISTS "nombre_contacto",
DROP COLUMN IF EXISTS "nombre_original",
DROP COLUMN IF EXISTS "departamento",
DROP COLUMN IF EXISTS "observaciones";
