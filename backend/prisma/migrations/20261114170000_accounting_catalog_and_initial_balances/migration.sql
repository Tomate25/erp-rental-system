-- CreateTable: cuentas_contables
CREATE TABLE IF NOT EXISTS "cuentas_contables" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 4,
    "mayor_codigo" TEXT,
    "mayor_nombre" TEXT,
    "tipo" TEXT NOT NULL,
    "naturaleza" TEXT NOT NULL,
    "estado_financiero" TEXT,
    "renglon" TEXT,
    "acepta_movimiento" BOOLEAN NOT NULL DEFAULT true,
    "es_control" BOOLEAN NOT NULL DEFAULT false,
    "qb_tipo" TEXT,
    "qb_nombre" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_contables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cuentas_contables_empresa_id_codigo_key" ON "cuentas_contables"("empresa_id", "codigo");
CREATE INDEX IF NOT EXISTS "cuentas_contables_empresa_id_nivel_idx" ON "cuentas_contables"("empresa_id", "nivel");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cuentas_contables_empresa_id_fkey') THEN
        ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_empresa_id_fkey"
        FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: saldos_iniciales_contables
CREATE TABLE IF NOT EXISTS "saldos_iniciales_contables" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "fecha_corte" DATE NOT NULL,
    "cuenta_codigo" TEXT NOT NULL,
    "cuenta_nombre" TEXT NOT NULL,
    "deudor" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "acreedor" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "notas" TEXT,
    "creado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saldos_iniciales_contables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "saldos_iniciales_contables_empresa_id_cuenta_codigo_key" ON "saldos_iniciales_contables"("empresa_id", "cuenta_codigo");
CREATE INDEX IF NOT EXISTS "saldos_iniciales_contables_empresa_id_fecha_corte_idx" ON "saldos_iniciales_contables"("empresa_id", "fecha_corte");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saldos_iniciales_contables_empresa_id_fkey') THEN
        ALTER TABLE "saldos_iniciales_contables" ADD CONSTRAINT "saldos_iniciales_contables_empresa_id_fkey"
        FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: cxc_configuracion defaults & migration of old dotted catalog codes to new BM catalog
ALTER TABLE "cxc_configuracion"
    ALTER COLUMN "cuenta_mayor_clientes" SET DEFAULT '110314',
    ALTER COLUMN "cuenta_anticipos_clientes" SET DEFAULT '210601',
    ALTER COLUMN "cuenta_intereses_moratorios" SET DEFAULT '410401',
    ALTER COLUMN "cuenta_gastos_administrativos" SET DEFAULT '410401',
    ALTER COLUMN "cuenta_retencion_ir_favor" SET DEFAULT '110703',
    ALTER COLUMN "cuenta_retencion_imi_favor" SET DEFAULT '110705',
    ALTER COLUMN "cuenta_diferencial_favor" SET DEFAULT '410301',
    ALTER COLUMN "cuenta_diferencial_gasto" SET DEFAULT '610201';

UPDATE "cxc_configuracion"
SET
    "cuenta_mayor_clientes" = CASE WHEN "cuenta_mayor_clientes" = '1.1.05.001' THEN '110314' ELSE "cuenta_mayor_clientes" END,
    "cuenta_anticipos_clientes" = CASE WHEN "cuenta_anticipos_clientes" = '2.1.06.001' THEN '210601' ELSE "cuenta_anticipos_clientes" END,
    "cuenta_intereses_moratorios" = CASE WHEN "cuenta_intereses_moratorios" = '4.2.01.001' THEN '410401' ELSE "cuenta_intereses_moratorios" END,
    "cuenta_gastos_administrativos" = CASE WHEN "cuenta_gastos_administrativos" = '4.2.01.002' THEN '410401' ELSE "cuenta_gastos_administrativos" END,
    "cuenta_retencion_ir_favor" = CASE WHEN "cuenta_retencion_ir_favor" = '1.1.07.003' THEN '110703' ELSE "cuenta_retencion_ir_favor" END,
    "cuenta_retencion_imi_favor" = CASE WHEN "cuenta_retencion_imi_favor" = '1.1.07.004' THEN '110705' ELSE "cuenta_retencion_imi_favor" END,
    "cuenta_diferencial_favor" = CASE WHEN "cuenta_diferencial_favor" = '4.2.02.001' THEN '410301' ELSE "cuenta_diferencial_favor" END,
    "cuenta_diferencial_gasto" = CASE WHEN "cuenta_diferencial_gasto" = '5.2.02.001' THEN '610201' ELSE "cuenta_diferencial_gasto" END;
