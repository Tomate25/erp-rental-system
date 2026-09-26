DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "clientes" WHERE "vendedor_id" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Rollback abortado: vendedor_id contiene asignaciones';
  END IF;
END $$;

ALTER TABLE "clientes" DROP COLUMN IF EXISTS "vendedor_id";
