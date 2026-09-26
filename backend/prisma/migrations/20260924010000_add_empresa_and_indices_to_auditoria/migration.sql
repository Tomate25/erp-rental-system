-- Add the tenant column as nullable first so installations with historical
-- audit rows can be backfilled deterministically before enforcing NOT NULL.
ALTER TABLE "auditorias" ADD COLUMN "empresa_id" TEXT,
ADD COLUMN "request_id" TEXT;

UPDATE "auditorias" AS audit
SET "empresa_id" = usuario."empresa_id"
FROM "usuarios" AS usuario
WHERE audit."usuario_id" = usuario."id"
  AND audit."empresa_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "auditorias" WHERE "empresa_id" IS NULL) THEN
    RAISE EXCEPTION 'No se puede migrar auditorias: existen registros sin tenant resoluble';
  END IF;
END $$;

ALTER TABLE "auditorias" ALTER COLUMN "empresa_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "auditorias_empresa_id_created_at_idx" ON "auditorias"("empresa_id", "created_at");

-- CreateIndex
CREATE INDEX "auditorias_empresa_id_entidad_tipo_entidad_id_idx" ON "auditorias"("empresa_id", "entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "auditorias_empresa_id_usuario_id_idx" ON "auditorias"("empresa_id", "usuario_id");

-- CreateIndex
CREATE INDEX "auditorias_request_id_idx" ON "auditorias"("request_id");

-- AddForeignKey
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
