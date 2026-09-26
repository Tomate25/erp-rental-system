DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "reglas_comision") THEN
    RAISE EXCEPTION 'Rollback abortado: reglas_comision contiene datos';
  END IF;
END $$;

DROP TABLE IF EXISTS "reglas_comision";
