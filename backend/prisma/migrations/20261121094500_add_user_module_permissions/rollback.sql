-- DropForeignKey
ALTER TABLE "usuario_permisos_modulo" DROP CONSTRAINT IF EXISTS "usuario_permisos_modulo_usuario_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "usuario_permisos_modulo";

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "permisos_modulos_personalizados";

-- DropEnum
DROP TYPE IF EXISTS "NivelAccesoModulo";
