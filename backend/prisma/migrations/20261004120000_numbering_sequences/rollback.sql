-- Rollback de 20261004120000_numbering_sequences.
-- Tras revertir, el código debe volver a la versión previa a esta migración
-- (que no usa la tabla). Los contadores se pierden; no afecta documentos ya emitidos.
DROP INDEX IF EXISTS "secuencias_numeracion_empresa_id_tipo_key";
DROP TABLE IF EXISTS "secuencias_numeracion";