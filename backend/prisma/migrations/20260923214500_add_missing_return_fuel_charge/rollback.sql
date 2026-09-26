DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "detalle_devolucion"
    WHERE "cargo_combustible" IS DISTINCT FROM 0.0
  ) THEN
    RAISE EXCEPTION 'Rollback abortado: cargo_combustible contiene datos';
  END IF;
END $$;

ALTER TABLE "detalle_devolucion"
  DROP COLUMN IF EXISTS "cargo_combustible";
