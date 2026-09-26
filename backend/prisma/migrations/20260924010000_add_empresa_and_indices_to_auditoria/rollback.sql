-- Rollback para 20260924010000_add_empresa_and_indices_to_auditoria

-- DropForeignKey
ALTER TABLE "auditorias" DROP CONSTRAINT IF EXISTS "auditorias_empresa_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "auditorias_request_id_idx";
DROP INDEX IF EXISTS "auditorias_empresa_id_usuario_id_idx";
DROP INDEX IF EXISTS "auditorias_empresa_id_entidad_tipo_entidad_id_idx";
DROP INDEX IF EXISTS "auditorias_empresa_id_created_at_idx";

-- AlterTable
ALTER TABLE "auditorias" DROP COLUMN IF EXISTS "request_id",
DROP COLUMN IF EXISTS "empresa_id";
