DROP TABLE IF EXISTS "liquidaciones_retorno";
ALTER TABLE "devoluciones" DROP COLUMN IF EXISTS "acta_retorno_data", DROP COLUMN IF EXISTS "es_retorno_anticipado", DROP COLUMN IF EXISTS "dias_anticipados";
ALTER TABLE "contratos" DROP COLUMN IF EXISTS "fecha_fin_pactada", DROP COLUMN IF EXISTS "fecha_cierre_real", DROP COLUMN IF EXISTS "tipo_cierre";
DROP TYPE IF EXISTS "DestinoCreditoRetorno";
DROP TYPE IF EXISTS "EstadoLiquidacionRetorno";
DROP TYPE IF EXISTS "TipoCierreContrato";
