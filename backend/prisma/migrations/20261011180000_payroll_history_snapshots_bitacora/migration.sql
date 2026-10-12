-- AlterTable
ALTER TABLE "planillas" ADD COLUMN "total_inss_patronal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "total_inatec" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "bloqueada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "creado_por" TEXT,
ADD COLUMN "asiento_devengo_json" JSONB,
ADD COLUMN "asiento_pago_json" JSONB;

-- AlterTable
ALTER TABLE "planillas_empleado" ADD COLUMN "horas_extra" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "comisiones" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "otros_ingresos" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "inss_laboral" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "ir_salarial" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "otras_deducciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "inss_patronal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "inatec" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "provisiones" JSONB,
ADD COLUMN "snapshot_parametros" JSONB,
ADD COLUMN "snapshot_empleado" JSONB;

-- CreateTable
CREATE TABLE "planillas_bitacora" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "planilla_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comentario" TEXT,
    "totales_antes" JSONB,
    "totales_despues" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planillas_bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planillas_bitacora_empresa_id_idx" ON "planillas_bitacora"("empresa_id");

-- CreateIndex
CREATE INDEX "planillas_bitacora_planilla_id_fecha_hora_idx" ON "planillas_bitacora"("planilla_id", "fecha_hora");

-- AddForeignKey
ALTER TABLE "planillas_bitacora" ADD CONSTRAINT "planillas_bitacora_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas_bitacora" ADD CONSTRAINT "planillas_bitacora_planilla_id_fkey" FOREIGN KEY ("planilla_id") REFERENCES "planillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
