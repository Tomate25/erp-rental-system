-- Rollback
ALTER TABLE "equipos" DROP COLUMN IF EXISTS "tiene_horometro";
ALTER TABLE "productos" DROP COLUMN IF EXISTS "tiene_horometro";
