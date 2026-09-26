-- The commission model existed in Prisma and in manually synchronized
-- installations, but was absent from the formal migration history.
CREATE TABLE IF NOT EXISTS "reglas_comision" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "usuario_id" TEXT,
  "nombre_vendedor" TEXT,
  "monto_minimo" DOUBLE PRECISION NOT NULL,
  "monto_maximo" DOUBLE PRECISION,
  "porcentaje" DOUBLE PRECISION NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reglas_comision_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reglas_comision_empresa_id_fkey'
  ) THEN
    ALTER TABLE "reglas_comision"
      ADD CONSTRAINT "reglas_comision_empresa_id_fkey"
      FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reglas_comision_usuario_id_fkey'
  ) THEN
    ALTER TABLE "reglas_comision"
      ADD CONSTRAINT "reglas_comision_usuario_id_fkey"
      FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
