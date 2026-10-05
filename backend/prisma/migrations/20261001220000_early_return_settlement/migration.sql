CREATE TYPE "TipoCierreContrato" AS ENUM ('NORMAL', 'ANTICIPADO');
CREATE TYPE "EstadoLiquidacionRetorno" AS ENUM ('PENDIENTE_APROBACION', 'APROBADA', 'ANULADA');
CREATE TYPE "DestinoCreditoRetorno" AS ENUM ('REEMBOLSO', 'SALDO_FAVOR');

ALTER TABLE "contratos"
  ADD COLUMN "fecha_fin_pactada" TIMESTAMP(3),
  ADD COLUMN "fecha_cierre_real" TIMESTAMP(3),
  ADD COLUMN "tipo_cierre" "TipoCierreContrato";
UPDATE "contratos" SET "fecha_fin_pactada" = "fecha_fin" WHERE "fecha_fin_pactada" IS NULL;

ALTER TABLE "devoluciones"
  ADD COLUMN "acta_retorno_data" JSONB,
  ADD COLUMN "es_retorno_anticipado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dias_anticipados" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "liquidaciones_retorno" (
  "id" TEXT NOT NULL,
  "contrato_id" TEXT NOT NULL,
  "devolucion_cierre_id" TEXT NOT NULL,
  "estado" "EstadoLiquidacionRetorno" NOT NULL DEFAULT 'PENDIENTE_APROBACION',
  "fecha_inicio_cobro" TIMESTAMP(3) NOT NULL,
  "fecha_recepcion" TIMESTAMP(3) NOT NULL,
  "fecha_fin_pactada" TIMESTAMP(3) NOT NULL,
  "dias_pactados" INTEGER NOT NULL,
  "dias_cobrados" INTEGER NOT NULL,
  "dias_anticipados" INTEGER NOT NULL,
  "monto_pactado" DECIMAL(12,2) NOT NULL,
  "monto_devengado" DECIMAL(12,2) NOT NULL,
  "monto_facturado" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "credito_cliente" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "destino_credito" "DestinoCreditoRetorno",
  "requiere_nota_credito" BOOLEAN NOT NULL DEFAULT false,
  "aprobado_por" TEXT,
  "aprobado_at" TIMESTAMP(3),
  "detalle" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "liquidaciones_retorno_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "liquidaciones_retorno_contrato_id_key" ON "liquidaciones_retorno"("contrato_id");
CREATE UNIQUE INDEX "liquidaciones_retorno_devolucion_cierre_id_key" ON "liquidaciones_retorno"("devolucion_cierre_id");

ALTER TABLE "liquidaciones_retorno" ADD CONSTRAINT "liquidaciones_retorno_contrato_id_fkey"
  FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidaciones_retorno" ADD CONSTRAINT "liquidaciones_retorno_devolucion_cierre_id_fkey"
  FOREIGN KEY ("devolucion_cierre_id") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
