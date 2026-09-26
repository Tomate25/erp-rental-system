-- UP migration: Add 'SIN_ABRIR' to EstadoContrato enum and update default
ALTER TYPE "EstadoContrato" ADD VALUE IF NOT EXISTS 'SIN_ABRIR' BEFORE 'ACTIVO';
ALTER TABLE "contratos" ALTER COLUMN "estado" SET DEFAULT 'SIN_ABRIR';
