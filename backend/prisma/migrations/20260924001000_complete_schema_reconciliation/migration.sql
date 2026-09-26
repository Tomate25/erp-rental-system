-- Complete fields that existed only in manually synchronized databases.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'TipoMedicionCombustible'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "TipoMedicionCombustible" AS ENUM ('BARRAS', 'PORCENTAJE', 'PULGADAS');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ModalidadRenta'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "ModalidadRenta" AS ENUM ('SOLO_DIA', 'SOLO_HORA', 'DIA_Y_HORA');
  END IF;
END $$;

ALTER TYPE "EstadoFactura" ADD VALUE IF NOT EXISTS 'PAGADA_PARCIAL';

ALTER TABLE "productos"
  ADD COLUMN IF NOT EXISTS "modalidad_renta" "ModalidadRenta" NOT NULL DEFAULT 'DIA_Y_HORA',
  ADD COLUMN IF NOT EXISTS "tipo_medicion_combustible" "TipoMedicionCombustible" DEFAULT 'PORCENTAJE',
  ADD COLUMN IF NOT EXISTS "capacidad_tanque_galones" DOUBLE PRECISION;

ALTER TABLE "equipos"
  ADD COLUMN IF NOT EXISTS "modalidad_renta" "ModalidadRenta" NOT NULL DEFAULT 'DIA_Y_HORA',
  ADD COLUMN IF NOT EXISTS "tipo_medicion_combustible" "TipoMedicionCombustible" DEFAULT 'PORCENTAJE',
  ADD COLUMN IF NOT EXISTS "capacidad_tanque_galones" DOUBLE PRECISION;

ALTER TABLE "inspecciones_salida"
  ADD COLUMN IF NOT EXISTS "nivel_combustible" DOUBLE PRECISION;

ALTER TABLE "detalle_devolucion"
  ADD COLUMN IF NOT EXISTS "combustible_retorno" TEXT,
  ADD COLUMN IF NOT EXISTS "nivel_combustible" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "diferencia_combustible" DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'roles_empresa_id_fkey'
      AND conrelid = 'roles'::regclass
  ) THEN
    ALTER TABLE "roles" ADD CONSTRAINT "roles_empresa_id_fkey"
      FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reglas_comision_empresa_id_fkey'
      AND conrelid = 'reglas_comision'::regclass
  ) THEN
    ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_empresa_id_fkey"
      FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reglas_comision_usuario_id_fkey'
      AND conrelid = 'reglas_comision'::regclass
  ) THEN
    ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_usuario_id_fkey"
      FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
