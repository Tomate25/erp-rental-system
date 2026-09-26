-- Reconcile the production schema without deleting or merging legacy rows.
-- Historical data contains globally duplicated RFC/category/brand values and
-- serial numbers reused by different tenants, so those fields receive indexes
-- that match their real ownership semantics instead of unsafe global uniques.

ALTER TABLE "reglas_comision"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "usuarios"
  ALTER COLUMN "bloqueado_hasta" TYPE TIMESTAMP(3);

CREATE INDEX "empresas_rfc_idx" ON "empresas"("rfc");
CREATE UNIQUE INDEX "sucursales_empresa_id_codigo_key"
  ON "sucursales"("empresa_id", "codigo");
CREATE INDEX "categorias_nombre_idx" ON "categorias"("nombre");
CREATE INDEX "marcas_nombre_idx" ON "marcas"("nombre");
CREATE UNIQUE INDEX "equipos_empresa_id_numero_serie_key"
  ON "equipos"("empresa_id", "numero_serie");

ALTER TABLE "clientes"
  ADD CONSTRAINT "clientes_vendedor_id_fkey"
  FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "clientes" VALIDATE CONSTRAINT "clientes_vendedor_id_fkey";
