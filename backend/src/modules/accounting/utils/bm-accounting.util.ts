import {
  nextFromActiveSerieDocumento,
  nextSequenceValue,
} from '../../../common/utils/numbering.util';

/**
 * Catálogo oficial BM Construcciones S.A. — Cuentas de detalle (nivel 4)
 * vinculadas a movimientos sistematizados del ERP (nombres en MAYÚSCULA).
 */
export const BM_CUENTAS = {
  // Activos Circulantes — Caja y Bancos
  CAJA_GENERAL: { codigo: '110101', nombre: 'CAJA GENERAL' },
  CAJA_CHICA: { codigo: '110102', nombre: 'CAJA CHICA' },
  EFECTIVO_TRANSITO_CAJA: { codigo: '110103', nombre: 'EFECTIVO EN TRANSITO.' },
  BANCO_LAFISE: { codigo: '110201', nombre: 'LA FISE 750-100-489' },
  BANCO_LAFISE_133: { codigo: '110202', nombre: 'LA FISE 133-023-603' },
  BANCO_BANPRO_701: { codigo: '110203', nombre: 'BANPRO 701-279-700' },
  BANCO_LAFISE_US: { codigo: '110204', nombre: 'LA FISE US 751-100-361' },
  BANCO_BANPRO_US: { codigo: '110205', nombre: 'BANPRO US 711-279-691' },
  CERTIFICADOS: { codigo: '110206', nombre: 'CERTIFICADOS' },
  BANCO_LAFISE_541: { codigo: '110207', nombre: 'LA FISE 541-501-104' },
  EFECTIVO_TRANSITO_BANCO: { codigo: '110208', nombre: 'EFECTIVO EN TRANSITO.' },

  // Activos Circulantes — Cuentas por Cobrar e Impuestos a Favor
  CXC_CLIENTES: { codigo: '110301', nombre: 'CUENTAS POR COBRAR CLIENTES' },
  IVA_PAGADOS_COMPRAS: { codigo: '110702', nombre: 'IVA PAGADOS SOBRE COMPRAS' },
  RETENCION_IR_FAVOR: { codigo: '110703', nombre: 'RETENCIONES A CTA DE IR ANUAL' },
  RETENCION_IMI_FAVOR: { codigo: '110705', nombre: 'RETENCIONES ANTICIPOS ALMA' },

  // Activos Fijos e Inventarios
  MAQUINARIA_EQUIPOS: { codigo: '120104', nombre: 'MAQUINARIA Y EQUIPOS' },
  INVENTARIO_INSUMOS_TALLER: {
    codigo: '121002',
    nombre: 'COMPRA DE REPUESTOS PARA USO DE TALLER',
  },

  // Pasivos Circulantes — Cuentas por Pagar, Impuestos y Nómina
  SUELDOS_POR_PAGAR: { codigo: '210409', nombre: 'OTROS' },
  PROVEEDORES_OTROS: { codigo: '210101', nombre: 'CUENTAS POR PAGAR PROVEEDORES' },
  IVA_POR_PAGAR: { codigo: '210201', nombre: 'IVA 15% POR PAGAR' },
  RETENCION_IR_POR_PAGAR: {
    codigo: '210301',
    nombre: 'RETENCIONES SERV EN GENERAL',
  },
  INSS_LABORAL_POR_PAGAR: { codigo: '210302', nombre: 'INSS LABORAL' },
  INSS_PATRONAL_POR_PAGAR: { codigo: '210404', nombre: 'INSS PATRONAL' },
  INATEC_POR_PAGAR: { codigo: '210405', nombre: 'INATEC' },
  OTRAS_ACUMULACIONES_PAGAR: { codigo: '210409', nombre: 'OTROS' },
  ANTICIPOS_DEPOSITOS_CLIENTES: { codigo: '210409', nombre: 'OTROS' },

  // Ingresos
  INGRESO_ALQUILER: {
    codigo: '410101',
    nombre: 'INGRESO POR ALQUILER DE EQUIPOS',
  },
  INGRESO_SERVICIOS_LOCALES: {
    codigo: '410102',
    nombre: 'INGRESOS SERVICIOS LOCALES',
  },
  DESCUENTOS_DEVOLUCIONES_VENTAS: {
    codigo: '410103',
    nombre: 'DESCUENTOS Y DEVOLUCIONES SOBRE VENTAS',
  },
  UTILIDAD_CAMBIARIA: { codigo: '410301', nombre: 'UTILIDAD CAMBIARIA' },
  OTROS_INGRESOS: { codigo: '410401', nombre: 'OTROS INGRESOS' },

  // Costos Operativos (5101)
  COSTO_MATERIALES: { codigo: '510101', nombre: 'MATERIALES' },
  COSTO_COMBUSTIBLE_LUBRICANTES: {
    codigo: '510104',
    nombre: 'COMBUSTIBLE Y LUBRICANTES',
  },
  COSTO_SUBARRIENDO_MAQUINARIA: {
    codigo: '510106',
    nombre: 'ALQUILER DE EQUIPOS Y MAQUINARIAS',
  },
  COSTO_HERRAMIENTAS_PEQUENAS: {
    codigo: '510108',
    nombre: 'HERRAMIENTAS PEQUEÑAS',
  },
  COSTO_REPUESTOS_ACCESORIOS: {
    codigo: '510111',
    nombre: 'REPUESTOS Y ACCESORIOS',
  },
  COSTO_OTROS: { codigo: '510112', nombre: 'OTROS' },
  COSTO_ACEITES_LUBRICANTES: {
    codigo: '510113',
    nombre: 'ACEITES Y LUBRICANTES',
  },

  // Gastos de Administración y Operación (6101 / 6102)
  GASTO_SALARIO_ORDINARIO: { codigo: '610101', nombre: 'SALARIO ORDINARIO' },
  GASTO_HORAS_EXTRA: { codigo: '6101011', nombre: 'SALARIO EXTRAORDINARIO H/E' },
  GASTO_COMISIONES_VENTAS: { codigo: '610107', nombre: 'COMISIONES S/VENTAS' },
  GASTO_MANTENIMIENTO_MAQUINARIA: {
    codigo: '610112',
    nombre: 'REPARACION Y MANTENIMIENTO DE MAQUINARIAS VEHICULOS',
  },
  GASTO_INSS_PATRONAL: { codigo: '610119', nombre: 'INSS PATRONAL' },
  GASTO_INATEC: { codigo: '610120', nombre: 'INATEC' },
  GASTO_DIFERENCIAL_CAMBIARIO: {
    codigo: '610201',
    nombre: 'DIFERENCIAL CAMBIARIO',
  },
} as const;

export const CUENTAS_TESORERIA_BM: Array<{
  codigo: string;
  nombre: string;
  grupo: 'CAJA' | 'BANCO';
  moneda: 'NIO' | 'USD';
}> = [
  { codigo: '110101', nombre: 'CAJA GENERAL', grupo: 'CAJA', moneda: 'NIO' },
  { codigo: '110102', nombre: 'CAJA CHICA', grupo: 'CAJA', moneda: 'NIO' },
  { codigo: '110103', nombre: 'EFECTIVO EN TRANSITO.', grupo: 'CAJA', moneda: 'NIO' },
  { codigo: '110201', nombre: 'LA FISE 750-100-489', grupo: 'BANCO', moneda: 'NIO' },
  { codigo: '110202', nombre: 'LA FISE 133-023-603', grupo: 'BANCO', moneda: 'NIO' },
  { codigo: '110203', nombre: 'BANPRO 701-279-700', grupo: 'BANCO', moneda: 'NIO' },
  { codigo: '110204', nombre: 'LA FISE US 751-100-361', grupo: 'BANCO', moneda: 'USD' },
  { codigo: '110205', nombre: 'BANPRO US 711-279-691', grupo: 'BANCO', moneda: 'USD' },
  { codigo: '110206', nombre: 'CERTIFICADOS', grupo: 'BANCO', moneda: 'NIO' },
  { codigo: '110207', nombre: 'LA FISE 541-501-104', grupo: 'BANCO', moneda: 'NIO' },
  { codigo: '110208', nombre: 'EFECTIVO EN TRANSITO.', grupo: 'BANCO', moneda: 'NIO' },
];

/**
 * Resuelve la cuenta oficial BM de Caja o Banco (1101xx / 1102xx) a partir
 * del campo `banco` (código explícito o nombre) y del método de pago.
 */
export function resolverCuentaBancariaOCaja(
  bancoRaw?: string | null,
  metodo?: string | null,
): { codigo: string; nombre: string } {
  const texto = String(bancoRaw || '').trim().toUpperCase();
  if (texto) {
    for (const cta of CUENTAS_TESORERIA_BM) {
      if (texto.startsWith(cta.codigo) || texto.includes(cta.codigo)) {
        return { codigo: cta.codigo, nombre: cta.nombre };
      }
    }
    if (texto.includes('CAJA CHICA')) return BM_CUENTAS.CAJA_CHICA;
    if (texto.includes('CAJA GENERAL')) return BM_CUENTAS.CAJA_GENERAL;
    if (texto.includes('711-279-691') || (texto.includes('BANPRO') && (texto.includes('US') || texto.includes('DOLAR')))) {
      return BM_CUENTAS.BANCO_BANPRO_US;
    }
    if (texto.includes('BANPRO') || texto.includes('701-279-700')) {
      return BM_CUENTAS.BANCO_BANPRO_701;
    }
    if (texto.includes('133-023-603')) return BM_CUENTAS.BANCO_LAFISE_133;
    if (texto.includes('541-501-104')) return BM_CUENTAS.BANCO_LAFISE_541;
    if (texto.includes('751-100-361') || (texto.includes('LAFISE') && texto.includes('US')) || (texto.includes('LA FISE') && texto.includes('US'))) {
      return BM_CUENTAS.BANCO_LAFISE_US;
    }
    if (texto.includes('CERTIFICADO')) return BM_CUENTAS.CERTIFICADOS;
    if (texto.includes('LAFISE') || texto.includes('LA FISE') || texto.includes('750-100-489')) {
      return BM_CUENTAS.BANCO_LAFISE;
    }
  }

  if (String(metodo || '').trim().toUpperCase() === 'EFECTIVO') {
    return BM_CUENTAS.CAJA_GENERAL;
  }
  return BM_CUENTAS.BANCO_LAFISE;
}

export interface PartidaAsientoInput {
  cuentaCodigo: string;
  cuentaNombre: string;
  debe: number;
  haber: number;
  clienteId?: string | null;
  conceptoLinea?: string | null;
}

export interface RegistrarAsientoParams {
  empresaId: string;
  sucursalId?: string | null;
  fecha?: Date;
  tipoAsiento: 'INGRESOS' | 'EGRESOS' | 'DIARIO' | 'AJUSTE' | 'APERTURA' | 'CIERRE';
  origenModulo: 'CXC' | 'FACTURACION' | 'NOMINA' | 'OPERACIONES' | 'MANUAL';
  documentoReferencia: string;
  concepto: string;
  creadoPorId?: string | null;
  prefijoNumero?: string;
  partidas: PartidaAsientoInput[];
}

export function round2Accounting(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Resuelve la cuenta de costo operativo BM (5101xx) según categoría del insumo consumido.
 */
export function resolverCuentaConsumoInsumo(categoria?: string | null): {
  codigo: string;
  nombre: string;
} {
  const cat = String(categoria || '').trim().toUpperCase();
  if (cat.includes('ACEITE')) return BM_CUENTAS.COSTO_ACEITES_LUBRICANTES;
  if (cat.includes('COMBUSTIBLE') || cat.includes('LUBRICANTE') || cat.includes('DIESEL') || cat.includes('GASOLINA')) {
    return BM_CUENTAS.COSTO_COMBUSTIBLE_LUBRICANTES;
  }
  if (cat.includes('REPUESTO') || cat.includes('FILTRO') || cat.includes('PIEZA')) {
    return BM_CUENTAS.COSTO_REPUESTOS_ACCESORIOS;
  }
  if (cat.includes('HERRAMIENTA')) return BM_CUENTAS.COSTO_HERRAMIENTAS_PEQUENAS;
  if (cat.includes('MATERIAL')) return BM_CUENTAS.COSTO_MATERIALES;
  return BM_CUENTAS.COSTO_OTROS;
}

/**
 * Registra de forma idempotente un AsientoContable PUBLICADO dentro de una transacción Prisma.
 * Si el delegate `asientoContable` no existe (p. ej. mocks unitarios parciales), retorna null sin fallar.
 */
export async function registrarAsientoAutomaticoInTx(
  tx: any,
  params: RegistrarAsientoParams,
) {
  const delegate = tx?.asientoContable;
  if (!delegate?.create || !delegate?.findFirst) {
    return null;
  }

  const lineasValidas = params.partidas
    .map((p) => ({
      cuentaCodigo: p.cuentaCodigo,
      cuentaNombre: p.cuentaNombre,
      debe: round2Accounting(p.debe || 0),
      haber: round2Accounting(p.haber || 0),
      clienteId: p.clienteId || null,
      conceptoLinea: p.conceptoLinea || null,
    }))
    .filter((l) => l.debe > 0 || l.haber > 0);

  if (lineasValidas.length === 0) {
    return null;
  }

  const existing = await delegate.findFirst({
    where: {
      empresaId: params.empresaId,
      documentoReferencia: params.documentoReferencia,
      tipoAsiento: params.tipoAsiento,
      estado: 'PUBLICADO',
    },
    select: { id: true, numeroAsiento: true },
  });
  if (existing) {
    return existing;
  }

  const totalDebe = round2Accounting(
    lineasValidas.reduce((acc, l) => acc + l.debe, 0),
  );
  const totalHaber = round2Accounting(
    lineasValidas.reduce((acc, l) => acc + l.haber, 0),
  );
  const diff = round2Accounting(totalDebe - totalHaber);
  const cuadrado = Math.abs(diff) <= 0.05;

  const fechaAsiento = params.fecha || new Date();
  const anio = fechaAsiento.getFullYear();
  const prefijo = params.prefijoNumero || params.origenModulo.slice(0, 3);
  const fromSerie = await nextFromActiveSerieDocumento(tx, {
    empresaId: params.empresaId,
    sucursalId: params.sucursalId || null,
    tipoDocumento: 'ASIENTO',
    anio,
    usuarioId: params.creadoPorId || null,
    documentoId: params.documentoReferencia,
    isOccupied: delegate?.findUnique
      ? async (candidato) =>
          Boolean(
            await delegate.findUnique({
              where: { numeroAsiento: candidato },
              select: { id: true },
            }),
          )
      : undefined,
  });

  let numeroAsiento = fromSerie;
  if (!numeroAsiento && tx?.secuenciaNumeracion?.upsert) {
    const seq = await nextSequenceValue(tx, params.empresaId, `ASIENTO:${anio}`);
    numeroAsiento = `AS-${anio}-${String(seq).padStart(5, '0')}`;
  }
  if (!numeroAsiento) {
    numeroAsiento = `AS-${prefijo}-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  }

  return delegate.create({
    data: {
      empresaId: params.empresaId,
      sucursalId: params.sucursalId || null,
      numeroAsiento,
      fecha: params.fecha || new Date(),
      tipoAsiento: params.tipoAsiento,
      origenModulo: params.origenModulo,
      documentoReferencia: params.documentoReferencia,
      concepto: params.concepto,
      totalDebe,
      totalHaber,
      cuadrado,
      estado: 'PUBLICADO',
      creadoPorId: params.creadoPorId || null,
      lineas: {
        create: lineasValidas,
      },
    },
  });
}
