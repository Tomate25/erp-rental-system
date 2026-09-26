-- Rollback: Reversión de aislamiento multi-tenant en tabla roles
-- PRECONDICIÓN DE SEGURIDAD / PROTECCIÓN CONTRA PÉRDIDA DE DATOS:
-- Si existen roles personalizados creados por empresas (empresa_id IS NOT NULL),
-- la reversión queda terminantemente bloqueada para prevenir la pérdida de propiedad,
-- exposición o contaminación cruzada de seguridad entre tenants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "roles" WHERE "empresa_id" IS NOT NULL) THEN
    RAISE EXCEPTION 'ABORTANDO ROLLBACK: Existen roles personalizados asociados a empresas (empresa_id IS NOT NULL). Elimine o desasigne manualmente dichos roles antes de revertir a roles globales.';
  END IF;
END $$;

-- 1. Eliminar índices específicos de soporte multi-tenant
DROP INDEX IF EXISTS "roles_nombre_null_empresa_key";
DROP INDEX IF EXISTS "roles_empresa_id_nombre_key";

-- 2. Restaurar índice de unicidad global sobre nombre (seguro: solo restan roles globales con empresa_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "roles_nombre_key" ON "roles"("nombre");

-- 3. Eliminar restricción de clave foránea y columna empresa_id
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_empresa_id_fkey";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "empresa_id";

