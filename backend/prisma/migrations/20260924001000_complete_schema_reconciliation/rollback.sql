DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "productos"
    WHERE "modalidad_renta" <> 'DIA_Y_HORA'
       OR "tipo_medicion_combustible" <> 'PORCENTAJE'
       OR "capacidad_tanque_galones" IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM "equipos"
    WHERE "modalidad_renta" <> 'DIA_Y_HORA'
       OR "tipo_medicion_combustible" <> 'PORCENTAJE'
       OR "capacidad_tanque_galones" IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM "inspecciones_salida" WHERE "nivel_combustible" IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM "detalle_devolucion"
    WHERE "combustible_retorno" IS NOT NULL
       OR "nivel_combustible" IS NOT NULL
       OR "diferencia_combustible" IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM "facturas" WHERE "estado" = 'PAGADA_PARCIAL'
  ) THEN
    RAISE EXCEPTION 'Rollback abortado: las columnas reconciliadas contienen datos';
  END IF;
END $$;

ALTER TABLE "detalle_devolucion"
  DROP COLUMN IF EXISTS "combustible_retorno",
  DROP COLUMN IF EXISTS "nivel_combustible",
  DROP COLUMN IF EXISTS "diferencia_combustible";
ALTER TABLE "inspecciones_salida" DROP COLUMN IF EXISTS "nivel_combustible";
ALTER TABLE "equipos"
  DROP COLUMN IF EXISTS "modalidad_renta",
  DROP COLUMN IF EXISTS "tipo_medicion_combustible",
  DROP COLUMN IF EXISTS "capacidad_tanque_galones";
ALTER TABLE "productos"
  DROP COLUMN IF EXISTS "modalidad_renta",
  DROP COLUMN IF EXISTS "tipo_medicion_combustible",
  DROP COLUMN IF EXISTS "capacidad_tanque_galones";

DROP TYPE IF EXISTS "ModalidadRenta";
DROP TYPE IF EXISTS "TipoMedicionCombustible";

-- PostgreSQL enum values cannot be removed safely in-place. The rollback
-- intentionally retains PAGADA_PARCIAL when it has never been used.
