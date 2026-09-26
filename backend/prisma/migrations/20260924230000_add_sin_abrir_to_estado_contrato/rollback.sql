-- DOWN migration: Revert 'SIN_ABRIR' from EstadoContrato
ALTER TABLE "contratos" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';
UPDATE "contratos" SET "estado" = 'ACTIVO' WHERE "estado"::text = 'SIN_ABRIR';

CREATE TYPE "EstadoContrato_old" AS ENUM ('ACTIVO', 'FINALIZADO', 'CANCELADO', 'EN_DISPUTA');
ALTER TABLE "contratos" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "contratos" ALTER COLUMN "estado" TYPE "EstadoContrato_old" USING ("estado"::text::"EstadoContrato_old");
DROP TYPE "EstadoContrato";
ALTER TYPE "EstadoContrato_old" RENAME TO "EstadoContrato";
ALTER TABLE "contratos" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';
