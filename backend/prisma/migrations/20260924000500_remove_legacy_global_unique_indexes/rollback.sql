DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM empresas GROUP BY rfc HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM sucursales GROUP BY codigo HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM categorias GROUP BY nombre HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM marcas GROUP BY nombre HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM equipos
    WHERE numero_serie IS NOT NULL
    GROUP BY numero_serie HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Rollback abortado: los índices únicos globales perderían datos o impedirían restaurar el esquema';
  END IF;
END $$;

CREATE UNIQUE INDEX "empresas_rfc_key" ON "empresas"("rfc");
CREATE UNIQUE INDEX "sucursales_codigo_key" ON "sucursales"("codigo");
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");
CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");
CREATE UNIQUE INDEX "equipos_numero_serie_key" ON "equipos"("numero_serie");
