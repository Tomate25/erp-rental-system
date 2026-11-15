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
  BANCO_LAFISE: { codigo: '110201', nombre: 'LA FISE 750-100-489' },

  // Activos Circulantes — Cuentas por Cobrar e Impuestos a Favor
  CXC_CLIENTES: { codigo: '110301', nombre: 'CUENTAS POR COBRAR CLIENTES' },
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
