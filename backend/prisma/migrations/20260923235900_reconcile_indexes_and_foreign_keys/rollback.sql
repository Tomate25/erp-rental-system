ALTER TABLE "clientes"
  DROP CONSTRAINT IF EXISTS "clientes_vendedor_id_fkey";

DROP INDEX IF EXISTS "equipos_empresa_id_numero_serie_key";
DROP INDEX IF EXISTS "marcas_nombre_idx";
DROP INDEX IF EXISTS "categorias_nombre_idx";
DROP INDEX IF EXISTS "sucursales_empresa_id_codigo_key";
DROP INDEX IF EXISTS "empresas_rfc_idx";

ALTER TABLE "usuarios"
  ALTER COLUMN "bloqueado_hasta" TYPE TIMESTAMP(6);

ALTER TABLE "reglas_comision"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
