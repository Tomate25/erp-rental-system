-- ============================================================================
-- MIGRACIÓN CXC: CREACIÓN DEL MÓDULO INDEPENDIENTE DE CUENTAS POR COBRAR (CxC)
-- Y BLINDAJE CONTABLE DE LA CUENTA MAYOR 1.1.05.001 CLIENTES
-- ============================================================================

-- 1. Crear Nuevos Enums de CxC y Contabilidad
DO $$ BEGIN
  CREATE TYPE "EstadoCxcFactura" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADA', 'EN_ARREGLO', 'NO_APLICA', 'ANULADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoNotaCxc" AS ENUM ('DEBITO', 'CREDITO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoNotaCxc" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADA', 'EN_ARREGLO', 'ANULADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CondicionPagoNota" AS ENUM ('CREDITO', 'CONTADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OrigenNotaCxc" AS ENUM ('RETORNO_DANO', 'PENALIDAD_ARREGLO', 'INTERES_MORA', 'AJUSTE', 'DEVOLUCION_EQUIPO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoArregloPago" AS ENUM ('BORRADOR', 'SOLICITADO', 'APROBADO', 'FORMALIZADO', 'VIGENTE', 'INCUMPLIDO', 'FINALIZADO', 'ANULADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "FrecuenciaArreglo" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "MetodoAmortizacion" AS ENUM ('CUOTA_NIVELADA', 'CAPITAL_CONSTANTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoCuotaArreglo" AS ENUM ('PENDIENTE', 'PAGADA', 'PARCIAL', 'VENCIDA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoReciboCaja" AS ENUM ('EMITIDO', 'ANULADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "MetodoPagoRecibo" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'ANTICIPO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoDocAplicacionCxc" AS ENUM ('FACTURA', 'NOTA_DEBITO', 'CUOTA_ARREGLO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoAnticipoCliente" AS ENUM ('DISPONIBLE', 'APLICADO_PARCIAL', 'AGOTADO', 'DEVUELTO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoAsientoContable" AS ENUM ('VENTAS', 'INGRESOS', 'EGRESOS', 'DIARIO', 'CXC_COBRO', 'CXC_ARREGLO', 'CXC_REVERSION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OrigenModuloAsiento" AS ENUM ('CXC', 'FACTURACION', 'NOMINA', 'OPERACIONES', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoAsientoContable" AS ENUM ('PUBLICADO', 'ANULADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Modificaciones Aditivas a Tablas Existentes
ALTER TABLE "clientes"
  ADD COLUMN IF NOT EXISTS "es_retenedor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "exento_iva" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tipo_identificacion" VARCHAR(20) NOT NULL DEFAULT 'RUC',
  ADD COLUMN IF NOT EXISTS "dias_credito_pactados" INT DEFAULT 30;

ALTER TABLE "facturas"
  ADD COLUMN IF NOT EXISTS "moneda" VARCHAR(5) NOT NULL DEFAULT 'NIO',
  ADD COLUMN IF NOT EXISTS "monto_moneda_origen" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "tipo_cambio_emision" DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS "saldo_pendiente" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "estado_cxc" "EstadoCxcFactura" NOT NULL DEFAULT 'NO_APLICA',
  ADD COLUMN IF NOT EXISTS "fecha_ultimo_pago" TIMESTAMPTZ;

-- 3. Crear Nuevas Tablas de CxC

-- 3.1 Tipo de Cambio BCN
CREATE TABLE IF NOT EXISTS "tipo_cambio_bcn" (
  "id" TEXT PRIMARY KEY,
  "fecha" DATE NOT NULL UNIQUE,
  "tasa" DECIMAL(10, 4) NOT NULL,
  "fuente" TEXT NOT NULL DEFAULT 'BCN',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "tipo_cambio_bcn_fecha_idx" ON "tipo_cambio_bcn"("fecha" DESC);

-- 3.2 Configuración de CxC
CREATE TABLE IF NOT EXISTS "cxc_configuracion" (
  "id" TEXT PRIMARY KEY,
  "empresa_id" TEXT NOT NULL UNIQUE REFERENCES "empresas"("id") ON DELETE CASCADE,
  "tramos_antiguedad_json" JSONB NOT NULL DEFAULT '[{"id":"corriente","nombre":"Corriente","min":0,"max":0},{"id":"1_30","nombre":"1-30 días","min":1,"max":30},{"id":"31_60","nombre":"31-60 días","min":31,"max":60},{"id":"61_90","nombre":"61-90 días","min":61,"max":90},{"id":"90_mas","nombre":"Más de 90 días","min":91,"max":99999}]',
  "metodo_amortizacion_default" "MetodoAmortizacion" NOT NULL DEFAULT 'CUOTA_NIVELADA',
  "rol_aprobacion_arreglo" TEXT NOT NULL DEFAULT 'GERENTE',
  "dias_gracia_alerta_mora" INT NOT NULL DEFAULT 5,
  "aplica_iva_intereses" BOOLEAN NOT NULL DEFAULT false,
  "tasa_iva_intereses" DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  "aplica_iva_gastos_admin" BOOLEAN NOT NULL DEFAULT true,
  "tasa_iva_gastos_admin" DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  "serie_recibo_por_sucursal" BOOLEAN NOT NULL DEFAULT true,
  "aplica_retencion_imi" BOOLEAN NOT NULL DEFAULT true,
  "tasa_retencion_ir_default" DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
  "tasa_retencion_imi_default" DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  "comisiones_solo_facturas_pagadas" BOOLEAN NOT NULL DEFAULT true,
  "cuenta_mayor_clientes" TEXT NOT NULL DEFAULT '1.1.05.001',
  "cuenta_anticipos_clientes" TEXT NOT NULL DEFAULT '2.1.06.001',
  "cuenta_intereses_moratorios" TEXT NOT NULL DEFAULT '4.2.01.001',
  "cuenta_gastos_administrativos" TEXT NOT NULL DEFAULT '4.2.01.002',
  "cuenta_retencion_ir_favor" TEXT NOT NULL DEFAULT '1.1.07.003',
  "cuenta_retencion_imi_favor" TEXT NOT NULL DEFAULT '1.1.07.004',
  "cuenta_diferencial_favor" TEXT NOT NULL DEFAULT '4.2.02.001',
  "cuenta_diferencial_gasto" TEXT NOT NULL DEFAULT '5.2.02.001',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Notas de Débito
CREATE TABLE IF NOT EXISTS "notas_debito" (
  "id" TEXT PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
  "sucursal_id" TEXT NOT NULL REFERENCES "sucursales"("id") ON DELETE RESTRICT,
  "cliente_id" TEXT NOT NULL REFERENCES "clientes"("id") ON DELETE RESTRICT,
  "tipo_nota" "TipoNotaCxc" NOT NULL DEFAULT 'DEBITO',
  "numero_nota" TEXT NOT NULL UNIQUE,
  "fecha_emision" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "fecha_vence" TIMESTAMPTZ NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'NIO',
  "monto_moneda_origen" DECIMAL(12, 2) NOT NULL,
  "tipo_cambio_emision" DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
  "subtotal" DECIMAL(12, 2) NOT NULL,
  "iva" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "total" DECIMAL(12, 2) NOT NULL,
  "saldo_pendiente" DECIMAL(12, 2) NOT NULL,
  "condicion_pago" "CondicionPagoNota" NOT NULL DEFAULT 'CREDITO',
  "estado" "EstadoNotaCxc" NOT NULL DEFAULT 'PENDIENTE',
  "origen" "OrigenNotaCxc" NOT NULL,
  "concepto" TEXT NOT NULL,
  "devolucion_id" TEXT REFERENCES "devoluciones"("id") ON DELETE SET NULL,
  "factura_referencia_id" TEXT REFERENCES "facturas"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notas_debito_cliente_id_fecha_vence_saldo_pendiente_idx" ON "notas_debito"("cliente_id", "fecha_vence", "saldo_pendiente");

-- 3.4 Arreglos de Pago
CREATE TABLE IF NOT EXISTS "arreglos_pago" (
  "id" TEXT PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
  "sucursal_id" TEXT NOT NULL REFERENCES "sucursales"("id") ON DELETE RESTRICT,
  "cliente_id" TEXT NOT NULL REFERENCES "clientes"("id") ON DELETE RESTRICT,
  "numero_arreglo" TEXT NOT NULL UNIQUE,
  "fecha_emision" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "estado" "EstadoArregloPago" NOT NULL DEFAULT 'BORRADOR',
  "moneda" TEXT NOT NULL DEFAULT 'NIO',
  "tipo_cambio_emision" DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
  "capital_original" DECIMAL(12, 2) NOT NULL,
  "porcentaje_gastos_admin" DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  "monto_gastos_admin" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "tasa_interes_anual" DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  "monto_total_intereses" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "monto_total_arreglo" DECIMAL(12, 2) NOT NULL,
  "saldo_pendiente" DECIMAL(12, 2) NOT NULL,
  "numero_cuotas" INT NOT NULL,
  "frecuencia" "FrecuenciaArreglo" NOT NULL DEFAULT 'MENSUAL',
  "fecha_primera_cuota" DATE NOT NULL,
  "metodo_amortizacion" "MetodoAmortizacion" NOT NULL DEFAULT 'CUOTA_NIVELADA',
  "penalidad_incumplimiento_usd" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "solicitado_por_id" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "aprobado_por_id" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "fecha_aprobacion" TIMESTAMPTZ,
  "fecha_formalizacion" TIMESTAMPTZ,
  "motivo_anulacion" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "arreglo_pago_documentos" (
  "id" TEXT PRIMARY KEY,
  "arreglo_id" TEXT NOT NULL REFERENCES "arreglos_pago"("id") ON DELETE CASCADE,
  "factura_id" TEXT REFERENCES "facturas"("id") ON DELETE RESTRICT,
  "nota_debito_id" TEXT REFERENCES "notas_debito"("id") ON DELETE RESTRICT,
  "saldo_incorporado" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "arreglo_pago_cuotas" (
  "id" TEXT PRIMARY KEY,
  "arreglo_id" TEXT NOT NULL REFERENCES "arreglos_pago"("id") ON DELETE CASCADE,
  "numero_cuota" INT NOT NULL,
  "fecha_vencimiento" DATE NOT NULL,
  "capital" DECIMAL(12, 2) NOT NULL,
  "interes" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "gastos_admin" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "iva" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "total_cuota" DECIMAL(12, 2) NOT NULL,
  "saldo_cuota" DECIMAL(12, 2) NOT NULL,
  "estado" "EstadoCuotaArreglo" NOT NULL DEFAULT 'PENDIENTE',
  "fecha_pago_total" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("arreglo_id", "numero_cuota")
);
CREATE INDEX IF NOT EXISTS "arreglo_pago_cuotas_fecha_vencimiento_saldo_cuota_idx" ON "arreglo_pago_cuotas"("fecha_vencimiento", "saldo_cuota");

-- 3.5 Recibos de Caja y Aplicaciones
CREATE TABLE IF NOT EXISTS "recibos_caja" (
  "id" TEXT PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
  "sucursal_id" TEXT NOT NULL REFERENCES "sucursales"("id") ON DELETE RESTRICT,
  "cliente_id" TEXT NOT NULL REFERENCES "clientes"("id") ON DELETE RESTRICT,
  "numero_recibo" TEXT NOT NULL UNIQUE,
  "fecha_recibo" DATE NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'NIO',
  "tipo_cambio_bcn" DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
  "monto_efectivo_bancos" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "monto_retencion_ir" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "no_constancia_retencion_ir" TEXT,
  "monto_retencion_imi" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "no_constancia_retencion_imi" TEXT,
  "otras_retenciones" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "total_liquidado" DECIMAL(12, 2) NOT NULL,
  "total_aplicado_documentos" DECIMAL(12, 2) NOT NULL,
  "monto_excedente_anticipo" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "metodo_pago" "MetodoPagoRecibo" NOT NULL,
  "banco" TEXT,
  "numero_transferencia_referencia" TEXT,
  "concepto" TEXT NOT NULL,
  "estado" "EstadoReciboCaja" NOT NULL DEFAULT 'EMITIDO',
  "motivo_anulacion" TEXT,
  "anulado_por_id" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "fecha_anulacion" TIMESTAMPTZ,
  "creado_por_id" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "recibo_caja_aplicaciones" (
  "id" TEXT PRIMARY KEY,
  "recibo_caja_id" TEXT NOT NULL REFERENCES "recibos_caja"("id") ON DELETE CASCADE,
  "tipo_documento" "TipoDocAplicacionCxc" NOT NULL,
  "factura_id" TEXT REFERENCES "facturas"("id") ON DELETE RESTRICT,
  "nota_debito_id" TEXT REFERENCES "notas_debito"("id") ON DELETE RESTRICT,
  "cuota_arreglo_id" TEXT REFERENCES "arreglo_pago_cuotas"("id") ON DELETE RESTRICT,
  "monto_capital_aplicado" DECIMAL(12, 2) NOT NULL,
  "monto_retencion_ir_aplicado" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "monto_retencion_imi_aplicado" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "diferencial_cambiario" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "saldo_anterior" DECIMAL(12, 2) NOT NULL,
  "saldo_restante" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 Anticipos de Clientes (Pasivo 2.1.06.001)
CREATE TABLE IF NOT EXISTS "anticipos_clientes" (
  "id" TEXT PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
  "cliente_id" TEXT NOT NULL REFERENCES "clientes"("id") ON DELETE RESTRICT,
  "recibo_caja_origen_id" TEXT REFERENCES "recibos_caja"("id") ON DELETE RESTRICT,
  "monto_original" DECIMAL(12, 2) NOT NULL,
  "saldo_disponible" DECIMAL(12, 2) NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'NIO',
  "tipo_cambio_origen" DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
  "estado" "EstadoAnticipoCliente" NOT NULL DEFAULT 'DISPONIBLE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.7 Asientos Contables Persistidos
CREATE TABLE IF NOT EXISTS "asientos_contables" (
  "id" TEXT PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
  "sucursal_id" TEXT REFERENCES "sucursales"("id") ON DELETE SET NULL,
  "numero_asiento" TEXT NOT NULL UNIQUE,
  "fecha" DATE NOT NULL,
  "tipo_asiento" "TipoAsientoContable" NOT NULL,
  "origen_modulo" "OrigenModuloAsiento" NOT NULL,
  "documento_referencia" TEXT,
  "concepto" TEXT NOT NULL,
  "total_debe" DECIMAL(14, 2) NOT NULL,
  "total_haber" DECIMAL(14, 2) NOT NULL,
  "cuadrado" BOOLEAN NOT NULL DEFAULT true,
  "estado" "EstadoAsientoContable" NOT NULL DEFAULT 'PUBLICADO',
  "creado_por_id" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "asientos_lineas" (
  "id" TEXT PRIMARY KEY,
  "asiento_id" TEXT NOT NULL REFERENCES "asientos_contables"("id") ON DELETE CASCADE,
  "cuenta_codigo" TEXT NOT NULL,
  "cuenta_nombre" TEXT NOT NULL,
  "debe" DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  "haber" DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  "cliente_id" TEXT REFERENCES "clientes"("id") ON DELETE SET NULL,
  "concepto_linea" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "asientos_lineas_cuenta_codigo_idx" ON "asientos_lineas"("cuenta_codigo");

-- 4. Blindaje Contable: Prohibición de Asientos Manuales a 1.1.05.001 Clientes
CREATE OR REPLACE FUNCTION check_no_manual_cxc_account()
RETURNS TRIGGER AS $$
DECLARE
  v_origen "OrigenModuloAsiento";
BEGIN
  IF NEW.cuenta_codigo = '1.1.05.001' THEN
    SELECT origen_modulo INTO v_origen FROM asientos_contables WHERE id = NEW.asiento_id;
    IF v_origen = 'MANUAL' THEN
      RAISE EXCEPTION 'Regla Contable BM: Prohibido asentar manualmente a la cuenta 1.1.05.001 Clientes. Esta cuenta de mayor se alimenta exclusivamente por el subsistema de CxC.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_manual_1_1_05_001 ON asientos_lineas;
CREATE TRIGGER trg_bloquear_manual_1_1_05_001
BEFORE INSERT OR UPDATE ON asientos_lineas
FOR EACH ROW EXECUTE FUNCTION check_no_manual_cxc_account();

-- 5. Backfill Idempotente de Datos Existentes
DO $$
DECLARE
  r_fac RECORD;
  v_pagos_sum DECIMAL(12, 2);
  v_saldo DECIMAL(12, 2);
  v_estado "EstadoCxcFactura";
BEGIN
  -- 5.1 Sembrar configuración por defecto para todas las empresas existentes
  INSERT INTO "cxc_configuracion" ("id", "empresa_id")
  SELECT gen_random_uuid(), id FROM "empresas"
  ON CONFLICT ("empresa_id") DO NOTHING;

  -- 5.2 Sembrar tipo de cambio inicial BCN si no existe para hoy
  INSERT INTO "tipo_cambio_bcn" ("id", "fecha", "tasa", "fuente")
  VALUES (gen_random_uuid(), CURRENT_DATE, 36.6243, 'BCN')
  ON CONFLICT ("fecha") DO NOTHING;

  -- 5.3 Actualizar campos de facturas existentes
  FOR r_fac IN SELECT * FROM "facturas" LOOP
    SELECT COALESCE(SUM("monto"), 0) INTO v_pagos_sum 
    FROM "pagos" WHERE "factura_id" = r_fac.id;

    IF r_fac.condicion_pago = 'CONTADO' THEN
      v_saldo := 0.00;
      v_estado := 'NO_APLICA';
    ELSE
      v_saldo := GREATEST(0.00, r_fac.total - v_pagos_sum);
      IF v_saldo = 0.00 THEN
        v_estado := 'PAGADA';
      ELSIF v_pagos_sum > 0 THEN
        v_estado := 'PARCIAL';
      ELSE
        v_estado := 'PENDIENTE';
      END IF;
    END IF;

    UPDATE "facturas"
    SET "saldo_pendiente" = v_saldo,
        "estado_cxc" = v_estado,
        "monto_moneda_origen" = r_fac.total,
        "moneda" = 'NIO',
        "tipo_cambio_emision" = 1.0000
    WHERE id = r_fac.id;
  END LOOP;
END $$;
