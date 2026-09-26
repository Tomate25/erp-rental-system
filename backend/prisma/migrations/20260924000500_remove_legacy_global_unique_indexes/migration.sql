-- Fresh databases receive these legacy global indexes from the initial
-- migration. Remove them after the data-preserving tenant-aware replacements
-- have been installed by 20260923235900_reconcile_indexes_and_foreign_keys.
DROP INDEX IF EXISTS "empresas_rfc_key";
DROP INDEX IF EXISTS "sucursales_codigo_key";
DROP INDEX IF EXISTS "categorias_nombre_key";
DROP INDEX IF EXISTS "marcas_nombre_key";
DROP INDEX IF EXISTS "equipos_numero_serie_key";
