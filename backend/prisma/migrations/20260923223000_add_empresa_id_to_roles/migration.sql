-- AlterTable: Agregar columna empresa_id opcional a roles para soporte multi-tenant
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "empresa_id" text;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_empresa_id_fkey'
  ) THEN
    ALTER TABLE "roles" ADD CONSTRAINT "roles_empresa_id_fkey" 
      FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- DropIndex: Eliminar restricción de unicidad global estricta sobre nombre
DROP INDEX IF EXISTS "roles_nombre_key";

-- CreateIndex: Unicidad de nombre por empresa para roles personalizados
CREATE UNIQUE INDEX IF NOT EXISTS "roles_empresa_id_nombre_key" ON "roles"("empresa_id", "nombre");

-- CreateIndex: Unicidad de nombre para roles globales del sistema (donde empresa_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "roles_nombre_null_empresa_key" ON "roles"("nombre") WHERE "empresa_id" IS NULL;
