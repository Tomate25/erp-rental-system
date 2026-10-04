-- dias/horas: INTEGER -> NUMERIC(10,2).
-- Con tarifa HORA el campo "dias" guarda horas totales (p. ej. 6.5 h x 3 dias = 19.5),
-- y "horas" admite fracciones; hasta ahora la columna INTEGER no podia almacenarlas.
--
-- DESPLIEGUE:
--  * Aplicar esta migracion en una VENTANA DE MANTENIMIENTO: ALTER COLUMN TYPE reescribe
--    las tablas y toma ACCESS EXCLUSIVE sobre detalle_cotizacion y detalle_contratos.
--  * Desplegar la migracion ANTES que el DTO que acepta decimales (commit
--    "fix(dto): dias/horas condicionales por tipoTarifa"). Si el DTO sale primero, un
--    valor fraccionario fallaria contra la columna INTEGER.
--  * Los valores existentes se conservan (4 -> 4.00). El DEFAULT 1 se mantiene.
--  * Rollback: rollback.sql (aborta si ya existen valores fraccionarios).
ALTER TABLE "detalle_cotizacion"
  ALTER COLUMN "dias" TYPE NUMERIC(10,2) USING "dias"::numeric,
  ALTER COLUMN "horas" TYPE NUMERIC(10,2) USING "horas"::numeric;

ALTER TABLE "detalle_contratos"
  ALTER COLUMN "dias" TYPE NUMERIC(10,2) USING "dias"::numeric;