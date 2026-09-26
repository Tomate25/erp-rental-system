-- The legacy sync migration omitted this schema column. Add it before the
-- monetary conversion so both existing and freshly created databases follow
-- the same history. IF NOT EXISTS preserves installations patched manually.
ALTER TABLE "detalle_devolucion"
  ADD COLUMN IF NOT EXISTS "cargo_combustible" DOUBLE PRECISION DEFAULT 0.0;
