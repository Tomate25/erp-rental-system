DROP TABLE IF EXISTS "saldos_iniciales_contables";
DROP TABLE IF EXISTS "cuentas_contables";

ALTER TABLE "cxc_configuracion"
    ALTER COLUMN "cuenta_mayor_clientes" SET DEFAULT '1.1.05.001',
    ALTER COLUMN "cuenta_anticipos_clientes" SET DEFAULT '2.1.06.001',
    ALTER COLUMN "cuenta_intereses_moratorios" SET DEFAULT '4.2.01.001',
    ALTER COLUMN "cuenta_gastos_administrativos" SET DEFAULT '4.2.01.002',
    ALTER COLUMN "cuenta_retencion_ir_favor" SET DEFAULT '1.1.07.003',
    ALTER COLUMN "cuenta_retencion_imi_favor" SET DEFAULT '1.1.07.004',
    ALTER COLUMN "cuenta_diferencial_favor" SET DEFAULT '4.2.02.001',
    ALTER COLUMN "cuenta_diferencial_gasto" SET DEFAULT '5.2.02.001';
