import {
  nextFromActiveSerieDocumento,
  nextSequenceValue,
} from '../../../common/utils/numbering.util';

/**
 * Catálogo oficial BM Construcciones S.A. — Cuentas de detalle (nivel 4)
 * vinculadas a movimientos sistematizados del ERP.
 */
export const BM_CUENTAS = {
  // Activos Circulantes — Caja y Bancos
  CAJA_GENERAL: { codigo: '110101', nombre: 'Caja General' },
  CAJA_CHICA: { codigo: '110102', nombre: 'Caja Chica' },
  BANCO_LAFISE: { codigo: '110201', nombre: 'LA FISE 750-100-489' },

  // Activos Circulantes — Cuentas por Cobrar e Impuestos a Favor
  CXC_CLIENTES: { codigo: '110314', nombre: 'Otras cuentas por cobrar' },
  RETENCION_IR_FAVOR: { codigo: '110703', nombre: 'Retenciones a cta de IR anual' },
  RETENCION_IMI_FAVOR: { codigo: '110705', nombre: 'Retenciones anticipos Alma' },

  // Activos Fijos e Inventarios
  MAQUINARIA_EQUIPOS: { codigo: '120104', nombre: 'Maquinaria y Equipos' },
  INVENTARIO_INSUMOS_TALLER: {
    codigo: '121002',
    nombre: 'Compra de repuestos para uso de taller',
  },

  // Pasivos Circulantes — Cuentas por Pagar, Impuestos y Nómina
  SUELDOS_POR_PAGAR: { codigo: '210102', nombre: 'Otras cuentas por Pagar' },
  PROVEEDORES_OTROS: { codigo: '210113', nombre: 'Otros proveedores' },
  IVA_POR_PAGAR: { codigo: '210201', nombre: 'IVA 15% por Pagar' },
  RETENCION_IR_POR_PAGAR: {
    codigo: '210301',
    nombre: 'Retenciones serv en general',
  },
  INSS_LABORAL_POR_PAGAR: { codigo: '210302', nombre: 'Inss Laboral' },
  INSS_PATRONAL_POR_PAGAR: { codigo: '210404', nombre: 'Inss Patronal' },
  INATEC_POR_PAGAR: { codigo: '210405', nombre: 'Inatec' },
  OTRAS_ACUMULACIONES_PAGAR: { codigo: '210409', nombre: 'Otros' },
  ANTICIPOS_DEPOSITOS_CLIENTES: { codigo: '210601', nombre: 'Didepsa' },

  // Ingresos
  INGRESO_ALQUILER: {
    codigo: '410101',
    nombre: 'Ingreso Por alquiler de Equipos',
  },
  INGRESO_SERVICIOS_LOCALES: {
    codigo: '410102',
    nombre: 'Ingresos Servicios Locales',
  },
  DESCUENTOS_DEVOLUCIONES_VENTAS: {
    codigo: '410103',
    nombre: 'Descuentos y Devoluciones  Sobre Ventas',
  },
  UTILIDAD_CAMBIARIA: { codigo: '410301', nombre: 'Utilidad Cambiaria' },
  OTROS_INGRESOS: { codigo: '410401', nombre: 'Otros Ingresos' },

  // Costos Operativos (5101)
  COSTO_MATERIALES: { codigo: '510101', nombre: 'Materiales' },
  COSTO_COMBUSTIBLE_LUBRICANTES: {
    codigo: '510104',
    nombre: 'Combustible y Lubricantes',
  },
  COSTO_SUBARRIENDO_MAQUINARIA: {
    codigo: '510106',
    nombre: 'Alquiler de Equipos y maquinarias',
  },
  COSTO_HERRAMIENTAS_PEQUENAS: {
    codigo: '510108',
    nombre: 'Herramientas Pequeñas',
  },
  COSTO_REPUESTOS_ACCESORIOS: {
    codigo: '510111',
    nombre: 'Repuestos y Accesorios',
  },
  COSTO_OTROS: { codigo: '510112', nombre: 'Otros' },
  COSTO_ACEITES_LUBRICANTES: {
    codigo: '510113',
    nombre: 'Aceites y Lubricantes',
  },

  // Gastos de Administración y Operación (6101 / 6102)
  GASTO_SALARIO_ORDINARIO: { codigo: '610101', nombre: 'Salario Ordinario' },
  GASTO_HORAS_EXTRA: { codigo: '6101011', nombre: 'Salario Extraordinario H/E' },
  GASTO_COMISIONES_VENTAS: { codigo: '610107', nombre: 'Comisiones S/Ventas' },
  GASTO_MANTENIMIENTO_MAQUINARIA: {
    codigo: '610112',
    nombre: 'Reparacion y mantenimiento de Maquinarias vehiculos',
  },
  GASTO_INSS_PATRONAL: { codigo: '610119', nombre: 'Inss patronal' },
  GASTO_INATEC: { codigo: '610120', nombre: 'Inatec' },
  GASTO_DIFERENCIAL_CAMBIARIO: {
    codigo: '610201',
    nombre: 'Diferencial Cambiario',
  },
} as const;

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
