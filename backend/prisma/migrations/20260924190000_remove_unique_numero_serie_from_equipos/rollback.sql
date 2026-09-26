-- Reversión de migración: restaurar restricción de unicidad si no existen duplicados
DO $$
DECLARE
  v_dup_count INT;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT empresa_id, numero_serie
    FROM equipos
    WHERE numero_serie IS NOT NULL
    GROUP BY empresa_id, numero_serie
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'No se puede restaurar la restricción de unicidad equipos_empresa_id_numero_serie_key porque existen % valores duplicados de serie en la base de datos.', v_dup_count;
  END IF;
END $$;

DROP INDEX IF EXISTS "equipos_empresa_id_numero_serie_idx";
CREATE UNIQUE INDEX "equipos_empresa_id_numero_serie_key" ON "equipos"("empresa_id", "numero_serie");
