-- Rollback de 20261004140000_dias_horas_decimal (NUMERIC(10,2) -> INTEGER).
-- Revertir el codigo/DTO a la version previa ANTES de ejecutar este script.
-- Aborta (sin cambiar nada) si existe algun valor fraccionario, porque convertirlo a
-- INTEGER perderia informacion (6.5 h -> 7 h). Ejecutar en ventana de mantenimiento.
BEGIN;

DO $$
DECLARE
  fraccionarios bigint;
BEGIN
  SELECT count(*) INTO fraccionarios
  FROM "detalle_cotizacion"
  WHERE "dias" <> trunc("dias") OR "horas" <> trunc("horas");
  IF fraccionarios > 0 THEN
    RAISE EXCEPTION 'Rollback abortado: % fila(s) de detalle_cotizacion tienen dias/horas fraccionarios', fraccionarios;
  END IF;

  SELECT count(*) INTO fraccionarios
  FROM "detalle_contratos"
  WHERE "dias" <> trunc("dias");
  IF fraccionarios > 0 THEN
    RAISE EXCEPTION 'Rollback abortado: % fila(s) de detalle_contratos tienen dias fraccionarios', fraccionarios;
  END IF;
END $$;

ALTER TABLE "detalle_cotizacion"
  ALTER COLUMN "dias" TYPE INTEGER USING "dias"::integer,
  ALTER COLUMN "horas" TYPE INTEGER USING "horas"::integer;

ALTER TABLE "detalle_contratos"
  ALTER COLUMN "dias" TYPE INTEGER USING "dias"::integer;

COMMIT;