ALTER TABLE "auditorias"
DROP CONSTRAINT IF EXISTS "auditorias_empresa_id_fkey";

ALTER TABLE "auditorias"
ADD CONSTRAINT "auditorias_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
