-- Retirar restricción de unicidad estricta en numero_serie que bloquea etiquetas repetidas en activos
DROP INDEX IF EXISTS "equipos_empresa_id_numero_serie_key";

-- Crear índice no exclusivo para búsquedas de alto rendimiento filtradas por empresa y serie
CREATE INDEX IF NOT EXISTS "equipos_empresa_id_numero_serie_idx" ON "equipos"("empresa_id", "numero_serie");
