-- CreateEnum
CREATE TYPE "MetodoCalculoComision" AS ENUM ('TRAMO_UNICO', 'ESCALONADO');

-- CreateEnum
CREATE TYPE "BaseCalculoComision" AS ENUM ('FACTURADO', 'COBRADO');

-- CreateEnum
CREATE TYPE "TratamientoNegativoComision" AS ENUM ('ARRASTRAR', 'RECUPERAR');

-- CreateEnum
CREATE TYPE "EstadoVersionPlan" AS ENUM ('BORRADOR', 'ACTIVA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoPeriodoComision" AS ENUM ('ABIERTO', 'EN_LIQUIDACION', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoLiquidacionComision" AS ENUM ('BORRADOR', 'REVISADO', 'APROBADO', 'PAGADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoDocComision" AS ENUM ('FACTURA', 'NOTA_CREDITO', 'RECIBO', 'ANULACION_POSTERIOR');

-- CreateEnum
CREATE TYPE "MotivoAjusteComision" AS ENUM ('ERROR_VENDEDOR', 'VENTA_ESPECIAL', 'CORRECCION_PERIODO_ANTERIOR', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoAjusteComision" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "AreaContableNomina" AS ENUM ('OPERACION', 'ADMINISTRACION', 'VENTAS');

-- CreateEnum
CREATE TYPE "TipoContratoNomina" AS ENUM ('INDETERMINADO', 'DETERMINADO');

-- CreateEnum
CREATE TYPE "TipoSalarioNomina" AS ENUM ('FIJO', 'VARIABLE', 'MIXTO');

-- CreateEnum
CREATE TYPE "MetodoIrNomina" AS ENUM ('FIJO', 'VARIABLE');

-- CreateEnum
CREATE TYPE "FrecuenciaPagoNomina" AS ENUM ('QUINCENAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "RegimenInssNomina" AS ENUM ('INTEGRAL', 'IVM_RP');

-- CreateEnum
CREATE TYPE "FormaPagoNomina" AS ENUM ('TRANSFERENCIA', 'CHEQUE', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "EstadoEmpleado" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoConceptoNomina" AS ENUM ('DEVENGO', 'DEDUCCION', 'APORTE', 'PROVISION');

-- CreateEnum
CREATE TYPE "MetodoIrConcepto" AS ENUM ('ORDINARIO', 'OCASIONAL', 'EXENTO');

-- CreateEnum
CREATE TYPE "TipoPeriodoNomina" AS ENUM ('ORDINARIA', 'AGUINALDO', 'LIQUIDACION', 'EXTRAORDINARIA');

-- CreateEnum
CREATE TYPE "EstadoPeriodoNomina" AS ENUM ('ABIERTO', 'EN_PROCESO', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoPlanilla" AS ENUM ('BORRADOR', 'CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "OrigenNovedadNomina" AS ENUM ('MANUAL', 'COMISIONES', 'PRESTAMOS', 'VACACIONES');

-- CreateEnum
CREATE TYPE "EstadoNovedadNomina" AS ENUM ('PENDIENTE', 'APLICADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoPrestamoEmpleado" AS ENUM ('PRESTAMO', 'ADELANTO');

-- CreateEnum
CREATE TYPE "EstadoPrestamoEmpleado" AS ENUM ('ACTIVO', 'PAGADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoVacaciones" AS ENUM ('ACUMULACION', 'GOCE', 'PAGO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoProvisionNomina" AS ENUM ('VACACIONES', 'AGUINALDO', 'INDEMNIZACION');

-- CreateEnum
CREATE TYPE "EstadoLiquidacionFinal" AS ENUM ('BORRADOR', 'REVISADA', 'APROBADA', 'PAGADA');

-- AlterTable
ALTER TABLE "cotizaciones" DROP COLUMN "duracion_renta_dias",
ADD COLUMN     "vendedor_id" TEXT;

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "periodo_comision_id" TEXT,
ADD COLUMN     "vendedor_id" TEXT;

-- AlterTable
ALTER TABLE "notificaciones" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "vendedores" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empleado_id" TEXT,
    "nombre_mostrar" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "usuario_id" TEXT,
    "es_comisionable" BOOLEAN NOT NULL DEFAULT true,
    "fecha_alta" TIMESTAMP(3),
    "fecha_baja" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_comision" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_comision_versiones" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "metodo" "MetodoCalculoComision" NOT NULL DEFAULT 'ESCALONADO',
    "base" "BaseCalculoComision" NOT NULL DEFAULT 'FACTURADO',
    "incluye_iva" BOOLEAN NOT NULL DEFAULT false,
    "tratamiento_negativo" "TratamientoNegativoComision" NOT NULL DEFAULT 'ARRASTRAR',
    "meses_max_arrastre" INTEGER NOT NULL DEFAULT 3,
    "estado" "EstadoVersionPlan" NOT NULL DEFAULT 'ACTIVA',
    "aprobado_por" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_comision_versiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramos_comision" (
    "id" TEXT NOT NULL,
    "plan_version_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "desde_excl" DECIMAL(14,2) NOT NULL,
    "hasta_incl" DECIMAL(14,2),
    "porcentaje" DECIMAL(7,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tramos_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_vendedor_plan" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaciones_vendedor_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos_comision" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPeriodoComision" NOT NULL DEFAULT 'ABIERTO',
    "cerrado_por" TEXT,
    "cerrado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones_comision" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "plan_version_id" TEXT NOT NULL,
    "estado" "EstadoLiquidacionComision" NOT NULL DEFAULT 'BORRADOR',
    "snap_metodo" TEXT NOT NULL,
    "snap_base" TEXT NOT NULL,
    "snap_incluye_iva" BOOLEAN NOT NULL,
    "snap_tratamiento_negativo" TEXT NOT NULL,
    "snap_tramos" JSONB NOT NULL,
    "total_ventas" DECIMAL(14,2) NOT NULL,
    "total_nc" DECIMAL(14,2) NOT NULL,
    "arrastre_aplicado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "base_comisionable" DECIMAL(14,2) NOT NULL,
    "comision_calculada" DECIMAL(14,2) NOT NULL,
    "total_ajustes" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "comision_total" DECIMAL(14,2) NOT NULL,
    "arrastre_generado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "desglose_sucursal" JSONB,
    "calculado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "n_recalculos" INTEGER NOT NULL DEFAULT 0,
    "revisado_por" TEXT,
    "revisado_en" TIMESTAMP(3),
    "aprobado_por" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "pagado_en" TIMESTAMP(3),
    "anulado_por" TEXT,
    "anulado_en" TIMESTAMP(3),
    "motivo_anulacion" TEXT,
    "observaciones" TEXT,
    "nomina_periodo_id" TEXT,
    "nomina_linea_id" TEXT,
    "asiento_devengo_id" TEXT,
    "asiento_pago_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidaciones_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones_comision_documentos" (
    "id" TEXT NOT NULL,
    "liquidacion_id" TEXT NOT NULL,
    "tipo_doc" "TipoDocComision" NOT NULL,
    "documento_id" TEXT NOT NULL,
    "serie_numero" TEXT NOT NULL,
    "fecha_doc" TIMESTAMP(3) NOT NULL,
    "sucursal_id" TEXT,
    "cliente_nombre" TEXT,
    "factura_origen_id" TEXT,
    "subtotal_sin_iva" DECIMAL(14,2) NOT NULL,
    "iva" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "proporcion_cobro" DECIMAL(9,6),
    "pct_participacion" DECIMAL(7,4) NOT NULL DEFAULT 100.0000,
    "monto_base" DECIMAL(14,2) NOT NULL,
    "es_tardio" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidaciones_comision_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones_comision_tramos" (
    "id" TEXT NOT NULL,
    "liquidacion_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "desde_excl" DECIMAL(14,2) NOT NULL,
    "hasta_incl" DECIMAL(14,2),
    "porcentaje" DECIMAL(7,4) NOT NULL,
    "monto_en_tramo" DECIMAL(14,2) NOT NULL,
    "comision_tramo" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidaciones_comision_tramos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes_comision" (
    "id" TEXT NOT NULL,
    "liquidacion_id" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "motivo" "MotivoAjusteComision" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "documento_soporte" TEXT,
    "solicitado_por" TEXT NOT NULL,
    "solicitado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoAjusteComision" NOT NULL DEFAULT 'PENDIENTE',
    "aprobado_por" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ajustes_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldos_arrastre_comision" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "periodo_origen_id" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "periodo_aplicado_id" TEXT,
    "extinguido_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldos_arrastre_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "ruc" TEXT,
    "numero_inss" TEXT NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3),
    "sexo" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "sucursal_id" TEXT,
    "centro_costo_id" TEXT,
    "area_contable" "AreaContableNomina" NOT NULL DEFAULT 'OPERACION',
    "cargo" TEXT,
    "tipo_contrato" "TipoContratoNomina" NOT NULL DEFAULT 'INDETERMINADO',
    "fecha_ingreso" TIMESTAMP(3) NOT NULL,
    "fecha_baja" TIMESTAMP(3),
    "causa_baja" TEXT,
    "tipo_salario" "TipoSalarioNomina" NOT NULL DEFAULT 'FIJO',
    "metodo_ir" "MetodoIrNomina" NOT NULL DEFAULT 'FIJO',
    "frecuencia_pago" "FrecuenciaPagoNomina" NOT NULL DEFAULT 'QUINCENAL',
    "jornada_horas_dia" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    "regimen_inss" "RegimenInssNomina" NOT NULL DEFAULT 'INTEGRAL',
    "forma_pago" "FormaPagoNomina" NOT NULL DEFAULT 'TRANSFERENCIA',
    "estado" "EstadoEmpleado" NOT NULL DEFAULT 'ACTIVO',
    "salario_mensual" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados_salario_hist" (
    "id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "salario_mensual" DECIMAL(14,2) NOT NULL,
    "cargo" TEXT,
    "motivo" TEXT,
    "aprobado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleados_salario_hist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados_cuentas_bancarias" (
    "id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "numero_cuenta" TEXT NOT NULL,
    "tipo_cuenta" TEXT NOT NULL DEFAULT 'AHORRO',
    "moneda" TEXT NOT NULL DEFAULT 'NIO',
    "es_principal" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "param_inss" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "regimen" "RegimenInssNomina" NOT NULL DEFAULT 'INTEGRAL',
    "tamano_empleador" TEXT NOT NULL DEFAULT 'PEQUENO',
    "tasa_laboral" DECIMAL(7,4) NOT NULL DEFAULT 7.0000,
    "tasa_patronal" DECIMAL(7,4) NOT NULL DEFAULT 21.5000,
    "techo_mensual" DECIMAL(14,2),
    "base_minima" DECIMAL(14,2),
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "fuente_texto" TEXT,
    "fuente_url" TEXT,
    "aprobado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "param_inss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "param_inatec" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tasa" DECIMAL(7,4) NOT NULL DEFAULT 2.0000,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "fuente_texto" TEXT,
    "fuente_url" TEXT,
    "aprobado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "param_inatec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "param_ir_tramos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "desde_excl" DECIMAL(14,2) NOT NULL,
    "hasta_incl" DECIMAL(14,2),
    "impuesto_base" DECIMAL(14,2) NOT NULL,
    "porcentaje" DECIMAL(7,4) NOT NULL,
    "sobre_exceso" DECIMAL(14,2) NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "fuente_texto" TEXT,
    "fuente_url" TEXT,
    "aprobado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "param_ir_tramos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "param_laborales" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor_numeric" DECIMAL(14,4),
    "valor_string" TEXT,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "fuente_texto" TEXT,
    "fuente_url" TEXT,
    "aprobado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "param_laborales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_indemnizacion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "desde_anio" DECIMAL(6,2) NOT NULL,
    "hasta_anio" DECIMAL(6,2),
    "dias_por_anio" DECIMAL(6,2) NOT NULL,
    "tope_meses" DECIMAL(6,2) NOT NULL DEFAULT 5.00,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_indemnizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptos_nomina" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoConceptoNomina" NOT NULL,
    "afecta_inss" BOOLEAN NOT NULL DEFAULT false,
    "afecta_inatec" BOOLEAN NOT NULL DEFAULT false,
    "afecta_ir" BOOLEAN NOT NULL DEFAULT false,
    "metodo_ir" "MetodoIrConcepto" NOT NULL DEFAULT 'ORDINARIO',
    "afecta_promedio_prestaciones" BOOLEAN NOT NULL DEFAULT false,
    "orden_calculo" INTEGER NOT NULL DEFAULT 1,
    "visible_colilla" BOOLEAN NOT NULL DEFAULT true,
    "cuenta_contable_debe" TEXT,
    "cuenta_contable_haber" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conceptos_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos_nomina" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "quincena" INTEGER,
    "tipo" "TipoPeriodoNomina" NOT NULL DEFAULT 'ORDINARIA',
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPeriodoNomina" NOT NULL DEFAULT 'ABIERTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planillas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "estado" "EstadoPlanilla" NOT NULL DEFAULT 'BORRADOR',
    "total_devengado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_deducciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_neto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_patronal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "calculado_en" TIMESTAMP(3),
    "revisado_por" TEXT,
    "revisado_en" TIMESTAMP(3),
    "aprobado_por" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "pagado_en" TIMESTAMP(3),
    "asiento_devengo_id" TEXT,
    "asiento_pago_id" TEXT,
    "archivo_banco_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planillas_empleado" (
    "id" TEXT NOT NULL,
    "planilla_id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "salario_mensual" DECIMAL(14,2) NOT NULL,
    "sucursal_id" TEXT,
    "centro_costo_id" TEXT,
    "area_contable" "AreaContableNomina" NOT NULL,
    "metodo_ir" "MetodoIrNomina" NOT NULL,
    "dias_trabajados" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "snapshot_tasas" JSONB,
    "total_devengado" DECIMAL(14,2) NOT NULL,
    "total_deducciones" DECIMAL(14,2) NOT NULL,
    "neto_pagar" DECIMAL(14,2) NOT NULL,
    "costo_patronal" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planillas_empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planillas_lineas" (
    "id" TEXT NOT NULL,
    "planilla_empleado_id" TEXT NOT NULL,
    "concepto_id" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2),
    "base" DECIMAL(14,2),
    "tasa" DECIMAL(7,4),
    "monto" DECIMAL(14,2) NOT NULL,
    "referencia_tipo" TEXT,
    "referencia_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planillas_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novedades_nomina" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "periodo_destino_id" TEXT NOT NULL,
    "concepto_id" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2),
    "monto" DECIMAL(14,2) NOT NULL,
    "origen" "OrigenNovedadNomina" NOT NULL DEFAULT 'MANUAL',
    "referencia_id" TEXT,
    "periodo_devengo" TEXT,
    "estado" "EstadoNovedadNomina" NOT NULL DEFAULT 'PENDIENTE',
    "aprobado_por" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "novedades_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acumulados_ir" (
    "id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "renta_bruta" DECIMAL(14,2) NOT NULL,
    "inss_laboral" DECIMAL(14,2) NOT NULL,
    "renta_neta" DECIMAL(14,2) NOT NULL,
    "renta_neta_acumulada" DECIMAL(14,2) NOT NULL,
    "meses_transcurridos" INTEGER NOT NULL,
    "ir_anual_proyectado" DECIMAL(14,2) NOT NULL,
    "ir_retenido_mes" DECIMAL(14,2) NOT NULL,
    "ir_retenido_acumulado" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acumulados_ir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamos_empleados" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "tipo" "TipoPrestamoEmpleado" NOT NULL DEFAULT 'PRESTAMO',
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cuotas" INTEGER NOT NULL,
    "cuota_monto" DECIMAL(14,2) NOT NULL,
    "saldo" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoPrestamoEmpleado" NOT NULL DEFAULT 'ACTIVO',
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestamos_empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamos_cuotas" (
    "id" TEXT NOT NULL,
    "prestamo_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "aplicado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_pago" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prestamos_cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacaciones_movimientos" (
    "id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoMovimientoVacaciones" NOT NULL,
    "dias" DECIMAL(6,2) NOT NULL,
    "referencia" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacaciones_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisiones_saldo" (
    "id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "tipo" "TipoProvisionNomina" NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "base_usada" DECIMAL(14,2) NOT NULL,
    "requerido_acumulado" DECIMAL(14,2) NOT NULL,
    "provision_mes" DECIMAL(14,2) NOT NULL,
    "consumido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provisiones_saldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones_finales" (
    "id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "fecha_baja" TIMESTAMP(3) NOT NULL,
    "causa" TEXT NOT NULL,
    "antiguedad_anios" DECIMAL(6,4) NOT NULL,
    "salario_base_indemnizacion" DECIMAL(14,2) NOT NULL,
    "dias_vacaciones_pendientes" DECIMAL(6,2) NOT NULL,
    "meses_aguinaldo" DECIMAL(6,2) NOT NULL,
    "monto_salario_pendiente" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_vacaciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_aguinaldo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_indemnizacion" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_total_devengado" DECIMAL(14,2) NOT NULL,
    "deduccion_inss" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deduccion_ir" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deduccion_prestamos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_neto_pagar" DECIMAL(14,2) NOT NULL,
    "planilla_id" TEXT,
    "estado" "EstadoLiquidacionFinal" NOT NULL DEFAULT 'BORRADOR',
    "aprobado_por" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "pagado_en" TIMESTAMP(3),
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidaciones_finales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_empleado_id_key" ON "vendedores"("empleado_id");

-- CreateIndex
CREATE INDEX "vendedores_empresa_id_idx" ON "vendedores"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_empresa_id_codigo_key" ON "vendedores"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "planes_comision_empresa_id_idx" ON "planes_comision"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "planes_comision_empresa_id_codigo_key" ON "planes_comision"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "planes_comision_versiones_plan_id_idx" ON "planes_comision_versiones"("plan_id");

-- CreateIndex
CREATE INDEX "tramos_comision_plan_version_id_idx" ON "tramos_comision"("plan_version_id");

-- CreateIndex
CREATE INDEX "asignaciones_vendedor_plan_vendedor_id_idx" ON "asignaciones_vendedor_plan"("vendedor_id");

-- CreateIndex
CREATE INDEX "asignaciones_vendedor_plan_plan_id_idx" ON "asignaciones_vendedor_plan"("plan_id");

-- CreateIndex
CREATE INDEX "periodos_comision_empresa_id_idx" ON "periodos_comision"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_comision_empresa_id_anio_mes_key" ON "periodos_comision"("empresa_id", "anio", "mes");

-- CreateIndex
CREATE INDEX "liquidaciones_comision_empresa_id_idx" ON "liquidaciones_comision"("empresa_id");

-- CreateIndex
CREATE INDEX "liquidaciones_comision_periodo_id_idx" ON "liquidaciones_comision"("periodo_id");

-- CreateIndex
CREATE INDEX "liquidaciones_comision_vendedor_id_idx" ON "liquidaciones_comision"("vendedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_comision_periodo_id_vendedor_id_key" ON "liquidaciones_comision"("periodo_id", "vendedor_id");

-- CreateIndex
CREATE INDEX "liquidaciones_comision_documentos_liquidacion_id_idx" ON "liquidaciones_comision_documentos"("liquidacion_id");

-- CreateIndex
CREATE INDEX "liquidaciones_comision_documentos_tipo_doc_documento_id_idx" ON "liquidaciones_comision_documentos"("tipo_doc", "documento_id");

-- CreateIndex
CREATE INDEX "liquidaciones_comision_tramos_liquidacion_id_idx" ON "liquidaciones_comision_tramos"("liquidacion_id");

-- CreateIndex
CREATE INDEX "ajustes_comision_liquidacion_id_idx" ON "ajustes_comision"("liquidacion_id");

-- CreateIndex
CREATE INDEX "saldos_arrastre_comision_vendedor_id_idx" ON "saldos_arrastre_comision"("vendedor_id");

-- CreateIndex
CREATE INDEX "empleados_empresa_id_idx" ON "empleados"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_empresa_id_codigo_key" ON "empleados"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_empresa_id_cedula_key" ON "empleados"("empresa_id", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_empresa_id_numero_inss_key" ON "empleados"("empresa_id", "numero_inss");

-- CreateIndex
CREATE INDEX "empleados_salario_hist_empleado_id_idx" ON "empleados_salario_hist"("empleado_id");

-- CreateIndex
CREATE INDEX "empleados_cuentas_bancarias_empleado_id_idx" ON "empleados_cuentas_bancarias"("empleado_id");

-- CreateIndex
CREATE INDEX "param_inss_empresa_id_idx" ON "param_inss"("empresa_id");

-- CreateIndex
CREATE INDEX "param_inatec_empresa_id_idx" ON "param_inatec"("empresa_id");

-- CreateIndex
CREATE INDEX "param_ir_tramos_empresa_id_idx" ON "param_ir_tramos"("empresa_id");

-- CreateIndex
CREATE INDEX "param_laborales_empresa_id_idx" ON "param_laborales"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "param_laborales_empresa_id_clave_vigente_desde_key" ON "param_laborales"("empresa_id", "clave", "vigente_desde");

-- CreateIndex
CREATE INDEX "reglas_indemnizacion_empresa_id_idx" ON "reglas_indemnizacion"("empresa_id");

-- CreateIndex
CREATE INDEX "conceptos_nomina_empresa_id_idx" ON "conceptos_nomina"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "conceptos_nomina_empresa_id_codigo_key" ON "conceptos_nomina"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "periodos_nomina_empresa_id_idx" ON "periodos_nomina"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_nomina_empresa_id_anio_mes_quincena_tipo_key" ON "periodos_nomina"("empresa_id", "anio", "mes", "quincena", "tipo");

-- CreateIndex
CREATE INDEX "planillas_empresa_id_idx" ON "planillas"("empresa_id");

-- CreateIndex
CREATE INDEX "planillas_periodo_id_idx" ON "planillas"("periodo_id");

-- CreateIndex
CREATE INDEX "planillas_empleado_planilla_id_idx" ON "planillas_empleado"("planilla_id");

-- CreateIndex
CREATE INDEX "planillas_empleado_empleado_id_idx" ON "planillas_empleado"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "planillas_empleado_planilla_id_empleado_id_key" ON "planillas_empleado"("planilla_id", "empleado_id");

-- CreateIndex
CREATE INDEX "planillas_lineas_planilla_empleado_id_idx" ON "planillas_lineas"("planilla_empleado_id");

-- CreateIndex
CREATE INDEX "planillas_lineas_concepto_id_idx" ON "planillas_lineas"("concepto_id");

-- CreateIndex
CREATE INDEX "novedades_nomina_empleado_id_idx" ON "novedades_nomina"("empleado_id");

-- CreateIndex
CREATE INDEX "novedades_nomina_periodo_destino_id_idx" ON "novedades_nomina"("periodo_destino_id");

-- CreateIndex
CREATE INDEX "novedades_nomina_origen_referencia_id_idx" ON "novedades_nomina"("origen", "referencia_id");

-- CreateIndex
CREATE INDEX "acumulados_ir_empleado_id_idx" ON "acumulados_ir"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "acumulados_ir_empleado_id_anio_mes_key" ON "acumulados_ir"("empleado_id", "anio", "mes");

-- CreateIndex
CREATE INDEX "prestamos_empleados_empleado_id_idx" ON "prestamos_empleados"("empleado_id");

-- CreateIndex
CREATE INDEX "prestamos_cuotas_prestamo_id_idx" ON "prestamos_cuotas"("prestamo_id");

-- CreateIndex
CREATE INDEX "vacaciones_movimientos_empleado_id_idx" ON "vacaciones_movimientos"("empleado_id");

-- CreateIndex
CREATE INDEX "provisiones_saldo_empleado_id_idx" ON "provisiones_saldo"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisiones_saldo_empleado_id_tipo_anio_mes_key" ON "provisiones_saldo"("empleado_id", "tipo", "anio", "mes");

-- CreateIndex
CREATE INDEX "liquidaciones_finales_empleado_id_idx" ON "liquidaciones_finales"("empleado_id");

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_comision" ADD CONSTRAINT "planes_comision_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_comision_versiones" ADD CONSTRAINT "planes_comision_versiones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramos_comision" ADD CONSTRAINT "tramos_comision_plan_version_id_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "planes_comision_versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_vendedor_plan" ADD CONSTRAINT "asignaciones_vendedor_plan_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_vendedor_plan" ADD CONSTRAINT "asignaciones_vendedor_plan_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_comision" ADD CONSTRAINT "periodos_comision_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_comision" ADD CONSTRAINT "liquidaciones_comision_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_comision" ADD CONSTRAINT "liquidaciones_comision_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_comision" ADD CONSTRAINT "liquidaciones_comision_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_comision" ADD CONSTRAINT "liquidaciones_comision_plan_version_id_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "planes_comision_versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_comision_documentos" ADD CONSTRAINT "liquidaciones_comision_documentos_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidaciones_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_comision_tramos" ADD CONSTRAINT "liquidaciones_comision_tramos_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidaciones_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_comision" ADD CONSTRAINT "ajustes_comision_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidaciones_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldos_arrastre_comision" ADD CONSTRAINT "saldos_arrastre_comision_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_salario_hist" ADD CONSTRAINT "empleados_salario_hist_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_cuentas_bancarias" ADD CONSTRAINT "empleados_cuentas_bancarias_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "param_inss" ADD CONSTRAINT "param_inss_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "param_inatec" ADD CONSTRAINT "param_inatec_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "param_ir_tramos" ADD CONSTRAINT "param_ir_tramos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "param_laborales" ADD CONSTRAINT "param_laborales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_indemnizacion" ADD CONSTRAINT "reglas_indemnizacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_nomina" ADD CONSTRAINT "conceptos_nomina_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_nomina" ADD CONSTRAINT "periodos_nomina_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos_nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas_empleado" ADD CONSTRAINT "planillas_empleado_planilla_id_fkey" FOREIGN KEY ("planilla_id") REFERENCES "planillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas_empleado" ADD CONSTRAINT "planillas_empleado_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas_lineas" ADD CONSTRAINT "planillas_lineas_planilla_empleado_id_fkey" FOREIGN KEY ("planilla_empleado_id") REFERENCES "planillas_empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas_lineas" ADD CONSTRAINT "planillas_lineas_concepto_id_fkey" FOREIGN KEY ("concepto_id") REFERENCES "conceptos_nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades_nomina" ADD CONSTRAINT "novedades_nomina_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades_nomina" ADD CONSTRAINT "novedades_nomina_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades_nomina" ADD CONSTRAINT "novedades_nomina_periodo_destino_id_fkey" FOREIGN KEY ("periodo_destino_id") REFERENCES "periodos_nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades_nomina" ADD CONSTRAINT "novedades_nomina_concepto_id_fkey" FOREIGN KEY ("concepto_id") REFERENCES "conceptos_nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acumulados_ir" ADD CONSTRAINT "acumulados_ir_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_empleados" ADD CONSTRAINT "prestamos_empleados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_empleados" ADD CONSTRAINT "prestamos_empleados_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_cuotas" ADD CONSTRAINT "prestamos_cuotas_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos_empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacaciones_movimientos" ADD CONSTRAINT "vacaciones_movimientos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisiones_saldo" ADD CONSTRAINT "provisiones_saldo_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_finales" ADD CONSTRAINT "liquidaciones_finales_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_finales" ADD CONSTRAINT "liquidaciones_finales_planilla_id_fkey" FOREIGN KEY ("planilla_id") REFERENCES "planillas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
