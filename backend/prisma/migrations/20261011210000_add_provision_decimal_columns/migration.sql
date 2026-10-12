-- AlterTable
ALTER TABLE "planillas_empleado"
ADD COLUMN IF NOT EXISTS "provision_vacaciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "provision_aguinaldo" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "provision_indemnizacion" DECIMAL(14,2) NOT NULL DEFAULT 0;
