import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingService } from '../../accounting/services/accounting.service';
import { ReportFilterQueryDto, ReportType } from '../dto/reports.dto';

export type ReportColumnType =
  | 'text'
  | 'currency'
  | 'number'
  | 'percent'
  | 'date'
  | 'badge';

export interface ReportColumnDef {
  key: string;
  label: string;
  type: ReportColumnType;
  sumInTotals?: boolean;
  pivotDimension?: boolean;
  pivotMetric?: boolean;
}

export interface ReportKpiCard {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percent';
  tone?: 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  hint?: string;
}

export interface DynamicSummarySpec {
  id: string;
  titulo: string;
  dimensionKey: string;
  dimensionLabel: string;
  metricKey: string;
  metricLabel: string;
  metricFormat: 'currency' | 'number';
  secondaryMetricKey?: string;
  secondaryMetricLabel?: string;
  secondaryMetricFormat?: 'currency' | 'number';
  crossDimensionKey?: string;
  crossDimensionLabel?: string;
  rows: Array<{
    clave: string;
    cantidad: number;
    metricaPrincipal: number;
    metricaSecundaria?: number;
    participacion: number;
  }>;
}

export interface ExtraReportSheet {
  id: string;
  nombreHoja: string;
  titulo: string;
  subtitulo: string;
  columnas: ReportColumnDef[];
  filas: Array<Record<string, unknown>>;
}

export interface ReportPayload {
  tipo: ReportType;
  titulo: string;
  subtitulo: string;
  modulo: string;
  generadoEn: string;
  filtros: {
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    search?: string;
  };
  kpis: ReportKpiCard[];
  columnas: ReportColumnDef[];
  filas: Array<Record<string, unknown>>;
  resumenesDinamicos: DynamicSummarySpec[];
  hojasAdicionales: ExtraReportSheet[];
  estadosDisponibles: string[];
}

export interface ReportCatalogItem {
  tipo: ReportType;
  titulo: string;
  descripcion: string;
  modulo: string;
  area:
    | 'Comercial'
    | 'Flota y Operaciones'
    | 'Finanzas y Contabilidad'
    | 'Compras y Taller'
    | 'RRHH y Clientes';
  totalRegistros: number;
  hojasExcel: string[];
  destacado?: boolean;
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function toIsoDate(value?: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toYearMonth(value?: Date | string | null): string {
  const iso = toIsoDate(value);
  return iso ? iso.slice(0, 7) : 'Sin Fecha';
}

function parseDateRange(filters?: ReportFilterQueryDto): {
  desde?: Date;
  hasta?: Date;
} {
  let desde: Date | undefined;
  let hasta: Date | undefined;

  if (filters?.fechaDesde) {
    const d = new Date(`${filters.fechaDesde.slice(0, 10)}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) desde = d;
  }
  if (filters?.fechaHasta) {
    const h = new Date(`${filters.fechaHasta.slice(0, 10)}T23:59:59.999Z`);
    if (!Number.isNaN(h.getTime())) hasta = h;
  }
  return { desde, hasta };
}

function matchesSearch(
  row: Record<string, unknown>,
  search?: string,
): boolean {
  if (!search || !search.trim()) return true;
  const term = search.trim().toLowerCase();
  return Object.values(row).some((val) =>
    String(val ?? '')
      .toLowerCase()
      .includes(term),
  );
}

function buildDynamicSummary(
  filas: Array<Record<string, unknown>>,
  config: {
    id: string;
    titulo: string;
    dimensionKey: string;
    dimensionLabel: string;
    metricKey: string;
    metricLabel: string;
    metricFormat: 'currency' | 'number';
    secondaryMetricKey?: string;
    secondaryMetricLabel?: string;
    secondaryMetricFormat?: 'currency' | 'number';
    crossDimensionKey?: string;
    crossDimensionLabel?: string;
  },
): DynamicSummarySpec {
  const map = new Map<
    string,
    { cantidad: number; metricaPrincipal: number; metricaSecundaria: number }
  >();

  let grandMetric = 0;
  for (const row of filas) {
    const rawKey = row[config.dimensionKey];
    const clave =
      rawKey !== null && rawKey !== undefined && String(rawKey).trim()
        ? String(rawKey).trim()
        : 'Sin Clasificar';
    const val1 = Number(row[config.metricKey] || 0);
    const val2 = config.secondaryMetricKey
      ? Number(row[config.secondaryMetricKey] || 0)
      : 0;

    const current = map.get(clave) || {
      cantidad: 0,
      metricaPrincipal: 0,
      metricaSecundaria: 0,
    };
    current.cantidad += 1;
    current.metricaPrincipal = round2(current.metricaPrincipal + val1);
    current.metricaSecundaria = round2(current.metricaSecundaria + val2);
    map.set(clave, current);
    grandMetric = round2(grandMetric + val1);
  }

  const totalCount = filas.length;
  const rows = Array.from(map.entries())
    .map(([clave, agg]) => ({
      clave,
      cantidad: agg.cantidad,
      metricaPrincipal: agg.metricaPrincipal,
      ...(config.secondaryMetricKey
        ? { metricaSecundaria: agg.metricaSecundaria }
        : {}),
      participacion:
        grandMetric > 0
          ? round2((agg.metricaPrincipal / grandMetric) * 100)
          : totalCount > 0
            ? round2((agg.cantidad / totalCount) * 100)
            : 0,
    }))
    .sort((a, b) => b.metricaPrincipal - a.metricaPrincipal || b.cantidad - a.cantidad);

  return {
    ...config,
    rows,
  };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  private requireEmpresa(empresaId: string): void {
    if (!empresaId || typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new ForbiddenException('El usuario no tiene una empresa asignada.');
    }
  }

  async getCatalogoReportes(empresaId: string): Promise<{
    resumenEjecutivo: {
      totalCotizaciones: number;
      totalContratos: number;
      totalEquipos: number;
      totalDespachos: number;
      totalFacturas: number;
      totalCompras: number;
      totalMantenimientos: number;
      totalClientes: number;
      totalAsientos: number;
      totalPlanillas: number;
    };
    reportes: ReportCatalogItem[];
  }> {
    this.requireEmpresa(empresaId);

    const [
      totalCotizaciones,
      totalContratos,
      totalEquipos,
      totalDespachos,
      totalFacturas,
      totalCompras,
      totalMantenimientos,
      totalClientes,
      totalAsientos,
      totalPlanillas,
    ] = await Promise.all([
      this.prisma.cotizacion.count({
        where: { OR: [{ empresaId }, { cliente: { empresaId } }] },
      }),
      this.prisma.contrato.count({
        where: { sucursal: { empresaId } },
      }),
      this.prisma.equipo.count({ where: { empresaId } }),
      this.prisma.despacho.count({
        where: { sucursal: { empresaId } },
      }),
      this.prisma.factura.count({
        where: { OR: [{ empresaId }, { cliente: { empresaId } }] },
      }),
      this.prisma.compraInsumo.count({ where: { empresaId } }),
      this.prisma.mantenimiento.count({
        where: { equipo: { empresaId } },
      }),
      this.prisma.cliente.count({ where: { empresaId } }),
      this.prisma.asientoContable.count({ where: { empresaId } }),
      this.prisma.planilla.count({ where: { empresaId } }),
    ]);

    const reportes: ReportCatalogItem[] = [
      {
        tipo: ReportType.COTIZACIONES,
        titulo: 'Cotizaciones Comerciales',
        descripcion:
          'Presupuestos emitidos, versiones, descuentos, promociones, tasa de conversión por asesor y motivos de rechazo/cancelación.',
        modulo: 'Cotizaciones',
        area: 'Comercial',
        totalRegistros: totalCotizaciones,
        hojasExcel: ['Resumen Dinámico', 'Datos Cotizaciones', 'Matriz Estado x Mes'],
        destacado: true,
      },
      {
        tipo: ReportType.CONTRATOS,
        titulo: 'Contratos y Cortes de Facturación',
        descripcion:
          'Contratos activos, finalizados y cancelados, depósitos en garantía, seguimiento de cortes pactados vs facturados.',
        modulo: 'Contratos',
        area: 'Comercial',
        totalRegistros: totalContratos,
        hojasExcel: ['Resumen Dinámico', 'Datos Contratos', 'Cortes de Facturación'],
        destacado: true,
      },
      {
        tipo: ReportType.INVENTARIO,
        titulo: 'Inventario de Flota, Tarifas y Disponibilidad',
        descripcion:
          'Catálogo completo de maquinaria propia y de proveedor, tarifas A/B/C, ocupación, horómetros y valoración de activos.',
        modulo: 'Inventario y Maquinaria',
        area: 'Flota y Operaciones',
        totalRegistros: totalEquipos,
        hojasExcel: ['Resumen Dinámico', 'Flota Completa', 'Matriz Categoría x Estado'],
        destacado: true,
      },
      {
        tipo: ReportType.MAQUINARIA_USADA,
        titulo: 'Maquinaria Usada, Despachos, Retornos y Horómetros',
        descripcion:
          'Historial detallado de equipos despachados y utilizados en obra, días en campo, horas trabajadas, combustible y daños.',
        modulo: 'Operaciones y Horómetros',
        area: 'Flota y Operaciones',
        totalRegistros: totalDespachos,
        hojasExcel: [
          'Resumen Dinámico',
          'Maquinaria Usada en Campo',
          'Utilización por Equipo',
        ],
        destacado: true,
      },
      {
        tipo: ReportType.FACTURACION_CXC,
        titulo: 'Facturación, Cobranza y Cartera CxC',
        descripcion:
          'Facturas emitidas, antigüedad de saldos (Aging), cobros, retenciones IR/IMI, recibos de caja y estado de mora.',
        modulo: 'Facturación y CxC',
        area: 'Finanzas y Contabilidad',
        totalRegistros: totalFacturas,
        hojasExcel: ['Resumen Dinámico', 'Facturas y Cartera', 'Recibos de Caja'],
        destacado: true,
      },
      {
        tipo: ReportType.COMPRAS_INSUMOS,
        titulo: 'Compras, Maquinaria Externa y Bodega de Insumos',
        descripcion:
          'Órdenes de compra de insumos, subarriendos de maquinaria externa a proveedores, existencias y valorización de bodega.',
        modulo: 'Compras e Insumos',
        area: 'Compras y Taller',
        totalRegistros: totalCompras,
        hojasExcel: [
          'Resumen Dinámico',
          'Compras de Insumos',
          'Subarriendos Externos',
          'Bodega de Insumos',
        ],
      },
      {
        tipo: ReportType.MANTENIMIENTO,
        titulo: 'Taller, Mantenimiento y Consumo de Repuestos',
        descripcion:
          'Órdenes preventivas y correctivas, costos de taller, cargos cobrables a clientes e insumos consumidos por equipo.',
        modulo: 'Taller y Mantenimiento',
        area: 'Compras y Taller',
        totalRegistros: totalMantenimientos,
        hojasExcel: ['Resumen Dinámico', 'Órdenes de Taller', 'Consumo de Insumos'],
      },
      {
        tipo: ReportType.CONTABILIDAD,
        titulo: 'Contabilidad, Libro Diario, Balanza y Bancos',
        descripcion:
          'Pólizas y asientos contables, Balanza de Comprobación con equilibrio Debe/Haber y saldos de cuentas bancarias y caja.',
        modulo: 'Contabilidad & Finanzas',
        area: 'Finanzas y Contabilidad',
        totalRegistros: totalAsientos,
        hojasExcel: [
          'Resumen Dinámico',
          'Libro Diario Detalle',
          'Balanza de Comprobación',
          'Bancos y Caja',
        ],
      },
      {
        tipo: ReportType.NOMINA_COMISIONES,
        titulo: 'Nómina, Planillas y Comisiones de Ventas',
        descripcion:
          'Planillas quincenales/mensuales, aportes INSS/INATEC, IR salarial y liquidaciones de comisiones comerciales.',
        modulo: 'Nómina y Comisiones',
        area: 'RRHH y Clientes',
        totalRegistros: totalPlanillas,
        hojasExcel: ['Resumen Dinámico', 'Planillas de Nómina', 'Comisiones de Ventas'],
      },
      {
        tipo: ReportType.CLIENTES,
        titulo: 'Directorio de Clientes y Comportamiento Comercial',
        descripcion:
          'Padrón de clientes, límites de crédito, volumen cotizado/contratado/facturado y saldo pendiente por cliente.',
        modulo: 'Clientes',
        area: 'RRHH y Clientes',
        totalRegistros: totalClientes,
        hojasExcel: ['Resumen Dinámico', 'Directorio de Clientes'],
      },
    ];

    return {
      resumenEjecutivo: {
        totalCotizaciones,
        totalContratos,
        totalEquipos,
        totalDespachos,
        totalFacturas,
        totalCompras,
        totalMantenimientos,
        totalClientes,
        totalAsientos,
        totalPlanillas,
      },
      reportes,
    };
  }

  async getReportePorTipo(
    empresaId: string,
    tipo: ReportType,
    filters: ReportFilterQueryDto = {},
  ): Promise<ReportPayload> {
    this.requireEmpresa(empresaId);

    switch (tipo) {
      case ReportType.COTIZACIONES:
        return this.buildCotizacionesReport(empresaId, filters);
      case ReportType.CONTRATOS:
        return this.buildContratosReport(empresaId, filters);
      case ReportType.INVENTARIO:
        return this.buildInventarioReport(empresaId, filters);
      case ReportType.MAQUINARIA_USADA:
        return this.buildMaquinariaUsadaReport(empresaId, filters);
      case ReportType.FACTURACION_CXC:
        return this.buildFacturacionCxcReport(empresaId, filters);
      case ReportType.COMPRAS_INSUMOS:
        return this.buildComprasInsumosReport(empresaId, filters);
      case ReportType.MANTENIMIENTO:
        return this.buildMantenimientoReport(empresaId, filters);
      case ReportType.CONTABILIDAD:
        return this.buildContabilidadReport(empresaId, filters);
      case ReportType.NOMINA_COMISIONES:
        return this.buildNominaComisionesReport(empresaId, filters);
      case ReportType.CLIENTES:
        return this.buildClientesReport(empresaId, filters);
      default:
        throw new BadRequestException(`Tipo de reporte no soportado: ${String(tipo)}`);
    }
  }

  async getReporteConsolidado(
    empresaId: string,
    filters: ReportFilterQueryDto = {},
  ) {
    this.requireEmpresa(empresaId);
    const tipos: ReportType[] = [
      ReportType.COTIZACIONES,
      ReportType.CONTRATOS,
      ReportType.INVENTARIO,
      ReportType.MAQUINARIA_USADA,
      ReportType.FACTURACION_CXC,
      ReportType.COMPRAS_INSUMOS,
      ReportType.MANTENIMIENTO,
      ReportType.CONTABILIDAD,
      ReportType.NOMINA_COMISIONES,
      ReportType.CLIENTES,
    ];

    const reportes = await Promise.all(
      tipos.map((t) => this.getReportePorTipo(empresaId, t, filters)),
    );

    return {
      generadoEn: new Date().toISOString(),
      filtros: filters,
      totalReportes: reportes.length,
      reportes,
    };
  }

  // ============================================================================
  // 1. COTIZACIONES
  // ============================================================================
  private async buildCotizacionesReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const { desde, hasta } = parseDateRange(filters);
    const cotizaciones = await this.prisma.cotizacion.findMany({
      where: {
        OR: [{ empresaId }, { cliente: { empresaId } }],
        ...(desde || hasta
          ? {
              fechaEmision: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
        ...(filters.estado ? { estado: filters.estado as any } : {}),
      },
      include: {
        cliente: { select: { nombre: true, rfc: true, cedula: true } },
        asesor: { select: { nombre: true, apellido: true } },
        vendedor: { select: { nombreMostrar: true } },
        items: { select: { id: true, cantidad: true } },
      },
      orderBy: { fechaEmision: 'desc' },
    });

    const allRows = cotizaciones.map((c) => {
      const asesorNombre =
        c.vendedor?.nombreMostrar ||
        (c.asesor ? `${c.asesor.nombre} ${c.asesor.apellido}`.trim() : 'Sin Asignar');
      const totalItems = c.items.reduce((s, it) => s + Number(it.cantidad || 1), 0);
      return {
        numero: c.numeroCotizacion,
        version: c.version,
        fechaEmision: toIsoDate(c.fechaEmision),
        mes: toYearMonth(c.fechaEmision),
        fechaVence: toIsoDate(c.fechaVence),
        inicioRenta: toIsoDate(c.fechaInicioRenta),
        finRenta: toIsoDate(c.fechaFinRenta),
        cliente: c.cliente?.nombre || 'Cliente General',
        identificacion: c.cliente?.rfc || c.cliente?.cedula || '-',
        asesor: asesorNombre,
        proyecto: c.proyecto || '-',
        estado: c.estado,
        cantidadEquipos: totalItems,
        subtotal: round2(Number(c.subtotal || 0)),
        descuento: round2(Number(c.descuento || 0) + Number(c.descuentoPromocional || 0)),
        iva: round2(Number(c.iva || 0)),
        total: round2(Number(c.total || 0)),
        depositoGarantia: round2(Number(c.depositoGarantia || 0)),
        motivo: c.motivoRechazo || '-',
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const totalCotizado = round2(filas.reduce((s, r) => s + r.total, 0));
    const aprobadas = filas.filter((r) =>
      ['ACEPTADA', 'CONVERTIDA_A_CONTRATO', 'FACTURADA'].includes(r.estado),
    );
    const totalAprobado = round2(aprobadas.reduce((s, r) => s + r.total, 0));
    const canceladasORechazadas = filas.filter((r) =>
      ['CANCELADA', 'RECHAZADA'].includes(r.estado),
    ).length;
    const tasaConversion =
      filas.length > 0 ? round2((aprobadas.length / filas.length) * 100) : 0;

    const columnas: ReportColumnDef[] = [
      { key: 'numero', label: 'No. Cotización', type: 'text' },
      { key: 'version', label: 'Ver.', type: 'number' },
      { key: 'fechaEmision', label: 'Fecha Emisión', type: 'date' },
      { key: 'mes', label: 'Mes', type: 'text', pivotDimension: true },
      { key: 'fechaVence', label: 'Vigencia', type: 'date' },
      { key: 'inicioRenta', label: 'Inicio Renta', type: 'date' },
      { key: 'finRenta', label: 'Fin Renta', type: 'date' },
      { key: 'cliente', label: 'Cliente', type: 'text', pivotDimension: true },
      { key: 'identificacion', label: 'RUC / Cédula', type: 'text' },
      { key: 'asesor', label: 'Asesor / Vendedor', type: 'text', pivotDimension: true },
      { key: 'proyecto', label: 'Proyecto / Obra', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'badge', pivotDimension: true },
      { key: 'cantidadEquipos', label: 'Unid. Cotizadas', type: 'number', sumInTotals: true },
      { key: 'subtotal', label: 'Subtotal (C$)', type: 'currency', sumInTotals: true },
      { key: 'descuento', label: 'Descuento (C$)', type: 'currency', sumInTotals: true },
      { key: 'iva', label: 'IVA 15% (C$)', type: 'currency', sumInTotals: true },
      { key: 'total', label: 'Total (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'depositoGarantia', label: 'Depósito (C$)', type: 'currency', sumInTotals: true },
      { key: 'motivo', label: 'Motivo Rechazo / Cancelación', type: 'text' },
    ];

    return {
      tipo: ReportType.COTIZACIONES,
      titulo: 'Reporte de Cotizaciones Comerciales',
      subtitulo:
        'Análisis comercial de presupuestos, versiones, conversión por asesor y estados.',
      modulo: 'Cotizaciones',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Total Cotizaciones', value: filas.length, format: 'number', tone: 'blue' },
        { label: 'Monto Total Cotizado', value: totalCotizado, format: 'currency', tone: 'indigo' },
        { label: 'Monto Aprobado / Contratado', value: totalAprobado, format: 'currency', tone: 'emerald' },
        { label: 'Tasa de Conversión', value: tasaConversion, format: 'percent', tone: 'amber' },
        { label: 'Canceladas / Rechazadas', value: canceladasORechazadas, format: 'number', tone: 'rose' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_estado',
          titulo: 'Resumen Dinámico por Estado',
          dimensionKey: 'estado',
          dimensionLabel: 'Estado',
          metricKey: 'total',
          metricLabel: 'Monto Total (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'cantidadEquipos',
          secondaryMetricLabel: 'Unidades',
          secondaryMetricFormat: 'number',
          crossDimensionKey: 'mes',
          crossDimensionLabel: 'Mes',
        }),
        buildDynamicSummary(filas, {
          id: 'por_asesor',
          titulo: 'Resumen Dinámico por Asesor / Vendedor',
          dimensionKey: 'asesor',
          dimensionLabel: 'Asesor',
          metricKey: 'total',
          metricLabel: 'Monto Cotizado (C$)',
          metricFormat: 'currency',
        }),
        buildDynamicSummary(filas, {
          id: 'por_mes',
          titulo: 'Resumen Dinámico por Mes',
          dimensionKey: 'mes',
          dimensionLabel: 'Mes',
          metricKey: 'total',
          metricLabel: 'Monto Cotizado (C$)',
          metricFormat: 'currency',
        }),
      ],
      hojasAdicionales: [],
      estadosDisponibles: [
        'BORRADOR',
        'PENDIENTE',
        'EN_REVISION',
        'ENVIADA',
        'VISTA',
        'ACEPTADA',
        'CONVERTIDA_A_CONTRATO',
        'FACTURADA',
        'RECHAZADA',
        'VENCIDA',
        'CANCELADA',
      ],
    };
  }

  // ============================================================================
  // 2. CONTRATOS Y CORTES
  // ============================================================================
  private async buildContratosReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const { desde, hasta } = parseDateRange(filters);
    const contratos = await this.prisma.contrato.findMany({
      where: {
        sucursal: { empresaId },
        ...(desde || hasta
          ? {
              fechaInicio: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
        ...(filters.estado ? { estado: filters.estado as any } : {}),
      },
      include: {
        cliente: { select: { nombre: true, rfc: true, cedula: true } },
        sucursal: { select: { nombre: true } },
        cotizacion: { select: { numeroCotizacion: true, total: true } },
        items: { include: { equipo: { select: { codigo: true, modelo: true } } } },
        cortesFacturacion: true,
        facturas: { select: { id: true, total: true, estado: true } },
        despachos: { select: { id: true } },
        devoluciones: { select: { id: true } },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    const cortesRows: Array<Record<string, unknown>> = [];

    const allRows = contratos.map((c) => {
      const totalUnidades = c.items.reduce((s, it) => s + Number(it.cantidad || 1), 0);
      const montoCortesTotal = round2(
        c.cortesFacturacion
          .filter((ct) => ct.estado !== 'ANULADO')
          .reduce((s, ct) => s + Number(ct.monto || 0), 0),
      );
      const montoEstimadoItems = round2(
        c.items.reduce(
          (s, it) =>
            s +
            Number(it.precioRenta || 0) *
              Number(it.cantidad || 1) *
              Number(it.dias || 1),
          0,
        ),
      );
      const montoPactado =
        montoCortesTotal > 0
          ? montoCortesTotal
          : Number(c.cotizacion?.total || montoEstimadoItems || 0);
      const facturasValidas = c.facturas.filter((f) => f.estado !== 'CANCELADA');
      const montoFacturado = round2(
        facturasValidas.reduce((s, f) => s + Number(f.total || 0), 0),
      );
      const saldoPorFacturar = round2(Math.max(0, montoPactado - montoFacturado));
      const cortesPendientes = c.cortesFacturacion.filter(
        (ct) => ct.estado === 'PENDIENTE',
      ).length;
      const cortesFacturados = c.cortesFacturacion.filter(
        (ct) => ct.estado === 'FACTURADO',
      ).length;

      for (const ct of c.cortesFacturacion) {
        cortesRows.push({
          contrato: c.codigo,
          cliente: c.cliente?.nombre || 'Cliente',
          numeroCorte: ct.numeroCorte,
          fechaInicio: toIsoDate(ct.fechaInicio),
          fechaFin: toIsoDate(ct.fechaFin),
          monto: round2(Number(ct.monto || 0)),
          estado: ct.estado,
          estadoContrato: c.estado,
        });
      }

      return {
        codigo: c.codigo,
        cotizacion: c.cotizacion?.numeroCotizacion || '-',
        cliente: c.cliente?.nombre || 'Cliente',
        sucursal: c.sucursal?.nombre || 'Central',
        fechaInicio: toIsoDate(c.fechaInicio),
        mes: toYearMonth(c.fechaInicio),
        fechaFin: toIsoDate(c.fechaFinPactada || c.fechaFin),
        fechaCierreReal: toIsoDate(c.fechaCierreReal),
        tipoCierre: c.tipoCierre || '-',
        estado: c.estado,
        cantidadEquipos: totalUnidades,
        despachos: c.despachos.length,
        devoluciones: c.devoluciones.length,
        depositoGarantia: round2(Number(c.depositoGarantia || 0)),
        montoPactado: round2(montoPactado),
        montoFacturado,
        saldoPorFacturar,
        cortesTotales: c.cortesFacturacion.length,
        cortesFacturados,
        cortesPendientes,
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const totalPactado = round2(filas.reduce((s, r) => s + r.montoPactado, 0));
    const totalFacturado = round2(filas.reduce((s, r) => s + r.montoFacturado, 0));
    const totalDepositos = round2(filas.reduce((s, r) => s + r.depositoGarantia, 0));
    const activos = filas.filter((r) => r.estado === 'ACTIVO').length;

    const columnas: ReportColumnDef[] = [
      { key: 'codigo', label: 'Código Contrato', type: 'text' },
      { key: 'cotizacion', label: 'Cotización', type: 'text' },
      { key: 'cliente', label: 'Cliente', type: 'text', pivotDimension: true },
      { key: 'sucursal', label: 'Sucursal', type: 'text', pivotDimension: true },
      { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date' },
      { key: 'mes', label: 'Mes Inicio', type: 'text', pivotDimension: true },
      { key: 'fechaFin', label: 'Fecha Fin', type: 'date' },
      { key: 'fechaCierreReal', label: 'Cierre Real', type: 'date' },
      { key: 'tipoCierre', label: 'Tipo Cierre', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'badge', pivotDimension: true },
      { key: 'cantidadEquipos', label: 'Equipos', type: 'number', sumInTotals: true },
      { key: 'despachos', label: 'Despachos', type: 'number', sumInTotals: true },
      { key: 'devoluciones', label: 'Retornos', type: 'number', sumInTotals: true },
      { key: 'depositoGarantia', label: 'Depósito (C$)', type: 'currency', sumInTotals: true },
      { key: 'montoPactado', label: 'Monto Pactado (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'montoFacturado', label: 'Facturado (C$)', type: 'currency', sumInTotals: true },
      { key: 'saldoPorFacturar', label: 'Por Facturar (C$)', type: 'currency', sumInTotals: true },
      { key: 'cortesTotales', label: 'Cortes Tot.', type: 'number', sumInTotals: true },
      { key: 'cortesFacturados', label: 'Cortes Fact.', type: 'number', sumInTotals: true },
      { key: 'cortesPendientes', label: 'Cortes Pend.', type: 'number', sumInTotals: true },
    ];

    return {
      tipo: ReportType.CONTRATOS,
      titulo: 'Reporte de Contratos de Arrendamiento y Cortes',
      subtitulo:
        'Control integral de vigencia, depósitos en garantía, cortes programados y avance de facturación.',
      modulo: 'Contratos',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Total Contratos', value: filas.length, format: 'number', tone: 'blue' },
        { label: 'Contratos Activos', value: activos, format: 'number', tone: 'emerald' },
        { label: 'Monto Pactado', value: totalPactado, format: 'currency', tone: 'indigo' },
        { label: 'Monto Facturado', value: totalFacturado, format: 'currency', tone: 'amber' },
        { label: 'Depósitos en Garantía', value: totalDepositos, format: 'currency', tone: 'slate' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_estado',
          titulo: 'Resumen Dinámico por Estado de Contrato',
          dimensionKey: 'estado',
          dimensionLabel: 'Estado',
          metricKey: 'montoPactado',
          metricLabel: 'Monto Pactado (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'montoFacturado',
          secondaryMetricLabel: 'Facturado (C$)',
          secondaryMetricFormat: 'currency',
          crossDimensionKey: 'mes',
          crossDimensionLabel: 'Mes',
        }),
        buildDynamicSummary(filas, {
          id: 'por_cliente',
          titulo: 'Resumen Dinámico por Cliente',
          dimensionKey: 'cliente',
          dimensionLabel: 'Cliente',
          metricKey: 'montoPactado',
          metricLabel: 'Monto Pactado (C$)',
          metricFormat: 'currency',
        }),
      ],
      hojasAdicionales: [
        {
          id: 'cortes_facturacion',
          nombreHoja: 'Cortes de Facturación',
          titulo: 'Detalle de Cortes de Facturación por Contrato',
          subtitulo: 'Plan de cobros periódicos con filtros por estado, contrato y cliente.',
          columnas: [
            { key: 'contrato', label: 'Contrato', type: 'text' },
            { key: 'cliente', label: 'Cliente', type: 'text' },
            { key: 'numeroCorte', label: 'Corte #', type: 'number' },
            { key: 'fechaInicio', label: 'Inicio Corte', type: 'date' },
            { key: 'fechaFin', label: 'Fin Corte', type: 'date' },
            { key: 'monto', label: 'Monto Corte (C$)', type: 'currency', sumInTotals: true },
            { key: 'estado', label: 'Estado Corte', type: 'badge' },
            { key: 'estadoContrato', label: 'Estado Contrato', type: 'badge' },
          ],
          filas: cortesRows.filter((r) => matchesSearch(r, filters.search)),
        },
      ],
      estadosDisponibles: ['SIN_ABRIR', 'ACTIVO', 'FINALIZADO', 'CANCELADO', 'EN_DISPUTA'],
    };
  }

  // ============================================================================
  // 3. INVENTARIO DE FLOTA
  // ============================================================================
  private async buildInventarioReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const equipos = await this.prisma.equipo.findMany({
      where: {
        empresaId,
        ...(filters.estado ? { estado: filters.estado as any } : {}),
        ...(filters.sucursalId ? { sucursalId: filters.sucursalId } : {}),
      },
      include: {
        categoria: { select: { nombre: true } },
        marca: { select: { nombre: true } },
        sucursal: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
      },
      orderBy: [{ categoria: { nombre: 'asc' } }, { modelo: 'asc' }],
    });

    const allRows = equipos.map((e) => {
      const total = Number(e.cantidadTotal || 1);
      const disponible = Number(e.cantidadDisponible || 0);
      const ocupado = Math.max(0, total - disponible);
      const ocupacionPct = total > 0 ? round2((ocupado / total) * 100) : 0;
      const horasDesdeServicio = round2(
        Math.max(0, Number(e.horometro || 0) - Number(e.horometroUltimoServicio || 0)),
      );
      const valorActivo = round2(Number(e.costoAdquisicion || 0) * total);
      return {
        codigo: e.codigo || 'S/C',
        modelo: e.modelo,
        categoria: e.categoria?.nombre || 'General',
        marca: e.marca?.nombre || 'Sin Marca',
        sucursal: e.sucursal?.nombre || 'Central',
        numeroSerie: e.numeroSerie || '-',
        tipoControl: e.tipoControl,
        estado: e.estado,
        origen: e.origenEquipo === 'PROVEEDOR' ? 'PROVEEDOR' : 'PROPIO',
        proveedor: e.proveedor?.nombre || e.proveedorNombre || '-',
        cantidadTotal: total,
        cantidadDisponible: disponible,
        cantidadOcupada: ocupado,
        porcentajeOcupacion: ocupacionPct,
        precioRentaDia: round2(Number(e.precioRentaDia || 0)),
        precioDiaB: round2(Number(e.precioDiaB || 0)),
        precioDiaC: round2(Number(e.precioDiaC || 0)),
        precioRentaHora: round2(Number(e.precioRentaHora || 0)),
        precioProveedor: round2(Number(e.precioProveedor || 0)),
        horometro: round2(Number(e.horometro || 0)),
        horasDesdeServicio,
        valorActivo,
        rentaHabilitada: e.disponibleParaRenta ? 'SÍ' : 'NO',
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const totalUnidades = filas.reduce((s, r) => s + r.cantidadTotal, 0);
    const totalDisponibles = filas.reduce((s, r) => s + r.cantidadDisponible, 0);
    const totalOcupadas = filas.reduce((s, r) => s + r.cantidadOcupada, 0);
    const ocupacionGlobal =
      totalUnidades > 0 ? round2((totalOcupadas / totalUnidades) * 100) : 0;
    const valorFlota = round2(filas.reduce((s, r) => s + r.valorActivo, 0));

    const columnas: ReportColumnDef[] = [
      { key: 'codigo', label: 'Código', type: 'text' },
      { key: 'modelo', label: 'Equipo / Modelo', type: 'text' },
      { key: 'categoria', label: 'Categoría / Familia', type: 'text', pivotDimension: true },
      { key: 'marca', label: 'Marca', type: 'text', pivotDimension: true },
      { key: 'sucursal', label: 'Sucursal', type: 'text', pivotDimension: true },
      { key: 'numeroSerie', label: 'Serie', type: 'text' },
      { key: 'tipoControl', label: 'Control', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'badge', pivotDimension: true },
      { key: 'origen', label: 'Origen', type: 'badge', pivotDimension: true },
      { key: 'proveedor', label: 'Proveedor', type: 'text' },
      { key: 'cantidadTotal', label: 'Stock Total', type: 'number', sumInTotals: true, pivotMetric: true },
      { key: 'cantidadDisponible', label: 'Disponible', type: 'number', sumInTotals: true },
      { key: 'cantidadOcupada', label: 'En Uso / Ocup.', type: 'number', sumInTotals: true },
      { key: 'porcentajeOcupacion', label: '% Ocupación', type: 'percent' },
      { key: 'precioRentaDia', label: 'Tarifa Día A (C$)', type: 'currency' },
      { key: 'precioDiaB', label: 'Tarifa Día B (C$)', type: 'currency' },
      { key: 'precioDiaC', label: 'Tarifa Día C (C$)', type: 'currency' },
      { key: 'precioRentaHora', label: 'Tarifa Hora (C$)', type: 'currency' },
      { key: 'precioProveedor', label: 'Costo Prov. (C$)', type: 'currency' },
      { key: 'horometro', label: 'Horómetro (hrs)', type: 'number' },
      { key: 'horasDesdeServicio', label: 'Hrs Últ. Serv.', type: 'number' },
      { key: 'valorActivo', label: 'Valor Adq. (C$)', type: 'currency', sumInTotals: true },
      { key: 'rentaHabilitada', label: 'Habilitado', type: 'text' },
    ];

    return {
      tipo: ReportType.INVENTARIO,
      titulo: 'Reporte Completo de Inventario y Flota de Maquinaria',
      subtitulo:
        'Existencias, estados de disponibilidad, tarifas oficiales A/B/C, horómetros y propiedad.',
      modulo: 'Inventario y Maquinaria',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Modelos / Fichas', value: filas.length, format: 'number', tone: 'slate' },
        { label: 'Total Unidades', value: totalUnidades, format: 'number', tone: 'blue' },
        { label: 'Disponibles', value: totalDisponibles, format: 'number', tone: 'emerald' },
        { label: 'En Alquiler / Ocupadas', value: totalOcupadas, format: 'number', tone: 'amber' },
        { label: '% Ocupación Flota', value: ocupacionGlobal, format: 'percent', tone: 'indigo' },
        { label: 'Valor Adquisición', value: valorFlota, format: 'currency', tone: 'slate' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_categoria',
          titulo: 'Resumen Dinámico por Categoría / Familia',
          dimensionKey: 'categoria',
          dimensionLabel: 'Categoría',
          metricKey: 'cantidadTotal',
          metricLabel: 'Unidades Totales',
          metricFormat: 'number',
          secondaryMetricKey: 'cantidadDisponible',
          secondaryMetricLabel: 'Disponibles',
          secondaryMetricFormat: 'number',
          crossDimensionKey: 'estado',
          crossDimensionLabel: 'Estado',
        }),
        buildDynamicSummary(filas, {
          id: 'por_estado',
          titulo: 'Resumen Dinámico por Estado Operativo',
          dimensionKey: 'estado',
          dimensionLabel: 'Estado',
          metricKey: 'cantidadTotal',
          metricLabel: 'Unidades',
          metricFormat: 'number',
        }),
        buildDynamicSummary(filas, {
          id: 'por_origen',
          titulo: 'Resumen Dinámico por Origen (Propio vs Proveedor)',
          dimensionKey: 'origen',
          dimensionLabel: 'Origen',
          metricKey: 'cantidadTotal',
          metricLabel: 'Unidades',
          metricFormat: 'number',
        }),
      ],
      hojasAdicionales: [],
      estadosDisponibles: [
        'DISPONIBLE',
        'RESERVADO',
        'RENTADO',
        'DESPACHADO',
        'EN_ALQUILER',
        'EN_MANTENIMIENTO',
        'MANTENIMIENTO',
        'FUERA_DE_SERVICIO',
        'BAJA',
      ],
    };
  }

  // ============================================================================
  // 4. MAQUINARIA USADA, DESPACHOS, RETORNOS Y HORÓMETROS
  // ============================================================================
  private async buildMaquinariaUsadaReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const { desde, hasta } = parseDateRange(filters);
    const despachos = await this.prisma.despacho.findMany({
      where: {
        sucursal: { empresaId },
        ...(desde || hasta
          ? {
              fechaDespacho: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
      },
      include: {
        sucursal: { select: { nombre: true } },
        contrato: {
          include: {
            cliente: { select: { nombre: true } },
            devoluciones: {
              include: {
                items: true,
              },
              orderBy: { fechaDevolucion: 'desc' },
            },
          },
        },
        items: {
          include: {
            equipo: {
              include: {
                categoria: { select: { nombre: true } },
                marca: { select: { nombre: true } },
              },
            },
          },
        },
      },
      orderBy: { fechaDespacho: 'desc' },
    });

    const ahora = new Date();
    const usageByMachine = new Map<
      string,
      {
        codigo: string;
        modelo: string;
        categoria: string;
        marca: string;
        estadoActual: string;
        vecesRentado: number;
        unidadesDespachadas: number;
        diasEnUso: number;
        horasTrabajadas: number;
        daniosDetectados: number;
        cargoCombustible: number;
        horometroActual: number;
      }
    >();

    const allRows: Array<Record<string, unknown>> = [];

    for (const d of despachos) {
      const devItemsContrato = (d.contrato?.devoluciones || []).flatMap((dev) =>
        (dev.items || []).map((it) => ({ ...it, fechaDevolucion: dev.fechaDevolucion })),
      );

      for (const item of d.items) {
        const devMatch = devItemsContrato.find((di) => di.equipoId === item.equipoId);
        const fechaSalida = new Date(d.fechaDespacho);
        const fechaRetorno = devMatch?.fechaDevolucion
          ? new Date(devMatch.fechaDevolucion)
          : null;
        const fechaFinCalc = fechaRetorno || ahora;
        const diasEnUso = Math.max(
          1,
          Math.ceil(
            (fechaFinCalc.getTime() - fechaSalida.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        const horasTrabajadas = round2(
          devMatch
            ? Number(devMatch.horasCalculadas || 0) ||
                Math.max(
                  0,
                  Number(devMatch.horometroFinal || 0) -
                    Number(item.horometroInicial || 0),
                )
            : 0,
        );
        const situacion = fechaRetorno ? 'RETORNADA' : 'EN_CAMPO';
        const danios = devMatch?.daniosDetectados ? 'SÍ' : 'NO';
        const cargoComb = round2(Number(devMatch?.cargoCombustible || 0));

        const row = {
          despacho: d.codigo || d.id.slice(0, 8).toUpperCase(),
          contrato: d.contrato?.codigo || '-',
          cliente: d.contrato?.cliente?.nombre || 'Cliente',
          sucursal: d.sucursal?.nombre || 'Central',
          codigoEquipo: item.equipo?.codigo || 'S/C',
          equipo: item.equipo?.modelo || 'Equipo',
          categoria: item.equipo?.categoria?.nombre || 'General',
          marca: item.equipo?.marca?.nombre || 'Sin Marca',
          serie: item.numeroSerie || item.equipo?.numeroSerie || '-',
          fechaDespacho: toIsoDate(fechaSalida),
          mes: toYearMonth(fechaSalida),
          fechaRetorno: fechaRetorno ? toIsoDate(fechaRetorno) : 'En Campo',
          situacion,
          diasEnUso,
          cantidadDespachada: Number(item.cantidad || 1),
          cantidadRetornada: Number(devMatch?.cantidadRetornada || 0),
          cantidadDanada: Number((devMatch as any)?.cantidadDañada || 0),
          cantidadPerdida: Number(devMatch?.cantidadPerdida || 0),
          horometroInicial: round2(Number(item.horometroInicial || 0)),
          horometroFinal: devMatch ? round2(Number(devMatch.horometroFinal || 0)) : 0,
          horasTrabajadas,
          cargoCombustible: cargoComb,
          daniosDetectados: danios,
          estadoEquipoActual: item.equipo?.estado || 'DISPONIBLE',
          operador: d.operadorNombre || '-',
        };

        if (filters.estado && row.situacion !== filters.estado) continue;
        allRows.push(row);

        const mKey = item.equipoId;
        const agg = usageByMachine.get(mKey) || {
          codigo: row.codigoEquipo,
          modelo: row.equipo,
          categoria: row.categoria,
          marca: row.marca,
          estadoActual: row.estadoEquipoActual,
          vecesRentado: 0,
          unidadesDespachadas: 0,
          diasEnUso: 0,
          horasTrabajadas: 0,
          daniosDetectados: 0,
          cargoCombustible: 0,
          horometroActual: round2(Number(item.equipo?.horometro || 0)),
        };
        agg.vecesRentado += 1;
        agg.unidadesDespachadas += row.cantidadDespachada;
        agg.diasEnUso += diasEnUso;
        agg.horasTrabajadas = round2(agg.horasTrabajadas + horasTrabajadas);
        if (devMatch?.daniosDetectados) agg.daniosDetectados += 1;
        agg.cargoCombustible = round2(agg.cargoCombustible + cargoComb);
        usageByMachine.set(mKey, agg);
      }
    }

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const totalHoras = round2(
      filas.reduce((s, r) => s + Number(r.horasTrabajadas || 0), 0),
    );
    const totalDias = filas.reduce((s, r) => s + Number(r.diasEnUso || 0), 0);
    const enCampo = filas.filter((r) => r.situacion === 'EN_CAMPO').length;
    const conDanios = filas.filter((r) => r.daniosDetectados === 'SÍ').length;

    const columnas: ReportColumnDef[] = [
      { key: 'despacho', label: 'Despacho', type: 'text' },
      { key: 'contrato', label: 'Contrato', type: 'text' },
      { key: 'cliente', label: 'Cliente', type: 'text', pivotDimension: true },
      { key: 'codigoEquipo', label: 'Código Equipo', type: 'text' },
      { key: 'equipo', label: 'Maquinaria / Modelo', type: 'text', pivotDimension: true },
      { key: 'categoria', label: 'Categoría', type: 'text', pivotDimension: true },
      { key: 'marca', label: 'Marca', type: 'text' },
      { key: 'serie', label: 'Serie', type: 'text' },
      { key: 'fechaDespacho', label: 'Fecha Salida', type: 'date' },
      { key: 'mes', label: 'Mes', type: 'text', pivotDimension: true },
      { key: 'fechaRetorno', label: 'Fecha Retorno', type: 'text' },
      { key: 'situacion', label: 'Situación', type: 'badge', pivotDimension: true },
      { key: 'diasEnUso', label: 'Días en Uso', type: 'number', sumInTotals: true, pivotMetric: true },
      { key: 'cantidadDespachada', label: 'Cant. Salida', type: 'number', sumInTotals: true },
      { key: 'cantidadRetornada', label: 'Cant. Retorno', type: 'number', sumInTotals: true },
      { key: 'cantidadDanada', label: 'Dañadas', type: 'number', sumInTotals: true },
      { key: 'cantidadPerdida', label: 'Perdidas', type: 'number', sumInTotals: true },
      { key: 'horometroInicial', label: 'Horóm. Salida', type: 'number' },
      { key: 'horometroFinal', label: 'Horóm. Retorno', type: 'number' },
      { key: 'horasTrabajadas', label: 'Horas Trabajadas', type: 'number', sumInTotals: true },
      { key: 'cargoCombustible', label: 'Cargo Comb. (C$)', type: 'currency', sumInTotals: true },
      { key: 'daniosDetectados', label: 'Daños', type: 'badge' },
      { key: 'estadoEquipoActual', label: 'Estado Actual', type: 'badge' },
    ];

    const utilizacionFilas = Array.from(usageByMachine.values()).sort(
      (a, b) => b.vecesRentado - a.vecesRentado || b.horasTrabajadas - a.horasTrabajadas,
    );

    return {
      tipo: ReportType.MAQUINARIA_USADA,
      titulo: 'Reporte de Maquinaria Usada, Salidas en Campo y Horómetros',
      subtitulo:
        'Trazabilidad completa de utilización real de equipos despachados, días en obra, horas acumuladas e incidencias.',
      modulo: 'Operaciones y Horómetros',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Movimientos de Maquinaria', value: filas.length, format: 'number', tone: 'blue' },
        { label: 'Equipos Actualmente en Campo', value: enCampo, format: 'number', tone: 'amber' },
        { label: 'Total Días de Uso', value: totalDias, format: 'number', tone: 'indigo' },
        { label: 'Total Horas Trabajadas', value: totalHoras, format: 'number', tone: 'emerald' },
        { label: 'Retornos con Daños', value: conDanios, format: 'number', tone: 'rose' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_categoria',
          titulo: 'Resumen Dinámico de Uso por Categoría',
          dimensionKey: 'categoria',
          dimensionLabel: 'Categoría',
          metricKey: 'diasEnUso',
          metricLabel: 'Días en Uso',
          metricFormat: 'number',
          secondaryMetricKey: 'horasTrabajadas',
          secondaryMetricLabel: 'Horas Trabajadas',
          secondaryMetricFormat: 'number',
          crossDimensionKey: 'situacion',
          crossDimensionLabel: 'Situación',
        }),
        buildDynamicSummary(filas, {
          id: 'por_cliente',
          titulo: 'Resumen Dinámico de Maquinaria Usada por Cliente',
          dimensionKey: 'cliente',
          dimensionLabel: 'Cliente',
          metricKey: 'diasEnUso',
          metricLabel: 'Días en Uso',
          metricFormat: 'number',
        }),
        buildDynamicSummary(filas, {
          id: 'por_equipo',
          titulo: 'Ranking de Maquinaria Más Utilizada',
          dimensionKey: 'equipo',
          dimensionLabel: 'Maquinaria',
          metricKey: 'horasTrabajadas',
          metricLabel: 'Horas Trabajadas',
          metricFormat: 'number',
        }),
      ],
      hojasAdicionales: [
        {
          id: 'utilizacion_por_equipo',
          nombreHoja: 'Utilización por Equipo',
          titulo: 'Consolidado Acumulado de Utilización por Maquinaria',
          subtitulo: 'Veces rentada, días acumulados, horas trabajadas y estado actual.',
          columnas: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'modelo', label: 'Equipo / Modelo', type: 'text' },
            { key: 'categoria', label: 'Categoría', type: 'text' },
            { key: 'marca', label: 'Marca', type: 'text' },
            { key: 'estadoActual', label: 'Estado Actual', type: 'badge' },
            { key: 'vecesRentado', label: 'Veces Rentado', type: 'number', sumInTotals: true },
            { key: 'unidadesDespachadas', label: 'Unid. Despachadas', type: 'number', sumInTotals: true },
            { key: 'diasEnUso', label: 'Total Días Uso', type: 'number', sumInTotals: true },
            { key: 'horasTrabajadas', label: 'Horas Trabajadas', type: 'number', sumInTotals: true },
            { key: 'horometroActual', label: 'Horómetro Actual', type: 'number' },
            { key: 'daniosDetectados', label: 'Incidencias Daño', type: 'number', sumInTotals: true },
            { key: 'cargoCombustible', label: 'Cargo Comb. (C$)', type: 'currency', sumInTotals: true },
          ],
          filas: utilizacionFilas,
        },
      ],
      estadosDisponibles: ['EN_CAMPO', 'RETORNADA'],
    };
  }

  // ============================================================================
  // 5. FACTURACIÓN, COBRANZA Y CxC
  // ============================================================================
  private async buildFacturacionCxcReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const { desde, hasta } = parseDateRange(filters);
    const [facturas, recibos] = await Promise.all([
      this.prisma.factura.findMany({
        where: {
          OR: [{ empresaId }, { cliente: { empresaId } }],
          ...(desde || hasta
            ? {
                fechaEmision: {
                  ...(desde ? { gte: desde } : {}),
                  ...(hasta ? { lte: hasta } : {}),
                },
              }
            : {}),
          ...(filters.estado ? { estado: filters.estado as any } : {}),
        },
        include: {
          cliente: { select: { nombre: true, rfc: true, cedula: true } },
          contrato: { select: { codigo: true } },
          cotizacion: { select: { numeroCotizacion: true } },
          pagos: true,
        },
        orderBy: { fechaEmision: 'desc' },
      }),
      this.prisma.reciboCaja.findMany({
        where: {
          empresaId,
          ...(desde || hasta
            ? {
                fechaRecibo: {
                  ...(desde ? { gte: desde } : {}),
                  ...(hasta ? { lte: hasta } : {}),
                },
              }
            : {}),
        },
        include: {
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaRecibo: 'desc' },
      }),
    ]);

    const hoy = new Date();
    const allRows = facturas.map((f) => {
      const total = round2(Number(f.total || 0));
      const pagadoDirecto = round2(
        (f.pagos || []).reduce((s, p) => s + Number(p.monto || 0), 0),
      );
      const saldo =
        f.estado === 'CANCELADA'
          ? 0
          : f.estado === 'PAGADA'
            ? 0
            : round2(
                Number(f.saldoPendiente ?? Math.max(0, total - pagadoDirecto)),
              );
      const cobrado =
        f.estado === 'CANCELADA' ? 0 : round2(Math.max(0, total - saldo));
      const diasVencidos =
        saldo > 0 && f.fechaVence
          ? Math.max(
              0,
              Math.floor(
                (hoy.getTime() - new Date(f.fechaVence).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 0;
      let tramoMora = 'Pagada / Cancelada';
      if (f.estado === 'CANCELADA') tramoMora = 'Anulada';
      else if (saldo <= 0.01) tramoMora = 'Cancelada (Pagada)';
      else if (diasVencidos === 0) tramoMora = 'Corriente';
      else if (diasVencidos <= 30) tramoMora = '1-30 días';
      else if (diasVencidos <= 60) tramoMora = '31-60 días';
      else if (diasVencidos <= 90) tramoMora = '61-90 días';
      else tramoMora = 'Más de 90 días';

      return {
        folio: f.folio,
        fechaEmision: toIsoDate(f.fechaEmision),
        mes: toYearMonth(f.fechaEmision),
        fechaVence: toIsoDate(f.fechaVence),
        cliente: f.cliente?.nombre || 'Cliente',
        ruc: f.cliente?.rfc || f.cliente?.cedula || '-',
        contrato: f.contrato?.codigo || f.cotizacion?.numeroCotizacion || '-',
        tipoFactura: f.tipoFactura,
        condicionPago: f.condicionPago,
        moneda: f.moneda || 'NIO',
        subtotal: round2(Number(f.subtotal || 0)),
        iva: round2(Number(f.iva || 0)),
        retencionIva: round2(Number(f.retencionIva || 0)),
        total,
        cobrado,
        saldoPendiente: saldo,
        diasVencidos,
        tramoMora,
        estado: f.estado,
        estadoCxc: f.estadoCxc,
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const vigentes = filas.filter((r) => r.estado !== 'CANCELADA');
    const totalFacturado = round2(vigentes.reduce((s, r) => s + r.total, 0));
    const totalCobrado = round2(vigentes.reduce((s, r) => s + r.cobrado, 0));
    const totalSaldo = round2(vigentes.reduce((s, r) => s + r.saldoPendiente, 0));
    const totalVencido = round2(
      vigentes
        .filter((r) => r.diasVencidos > 0)
        .reduce((s, r) => s + r.saldoPendiente, 0),
    );
    const anuladas = filas.filter((r) => r.estado === 'CANCELADA').length;

    const recibosRows = recibos
      .map((r) => ({
        numeroRecibo: r.numeroRecibo,
        fechaRecibo: toIsoDate(r.fechaRecibo),
        cliente: r.cliente?.nombre || 'Cliente',
        metodoPago: r.metodoPago,
        banco: r.banco || '-',
        referencia: r.numeroTransferenciaReferencia || '-',
        efectivoBanco: round2(Number(r.montoEfectivoBancos || 0)),
        retencionIr: round2(Number(r.montoRetencionIr || 0)),
        retencionImi: round2(Number(r.montoRetencionImi || 0)),
        totalLiquidado: round2(Number(r.totalLiquidado || 0)),
        estado: r.estado,
        motivoAnulacion: r.motivoAnulacion || '-',
      }))
      .filter((r) => matchesSearch(r, filters.search));

    const columnas: ReportColumnDef[] = [
      { key: 'folio', label: 'Folio', type: 'text' },
      { key: 'fechaEmision', label: 'Emisión', type: 'date' },
      { key: 'mes', label: 'Mes', type: 'text', pivotDimension: true },
      { key: 'fechaVence', label: 'Vencimiento', type: 'date' },
      { key: 'cliente', label: 'Cliente', type: 'text', pivotDimension: true },
      { key: 'ruc', label: 'RUC / Cédula', type: 'text' },
      { key: 'contrato', label: 'Contrato / Cot.', type: 'text' },
      { key: 'tipoFactura', label: 'Tipo', type: 'text', pivotDimension: true },
      { key: 'condicionPago', label: 'Condición', type: 'badge', pivotDimension: true },
      { key: 'subtotal', label: 'Subtotal (C$)', type: 'currency', sumInTotals: true },
      { key: 'iva', label: 'IVA 15% (C$)', type: 'currency', sumInTotals: true },
      { key: 'retencionIva', label: 'Ret. IVA (C$)', type: 'currency', sumInTotals: true },
      { key: 'total', label: 'Total (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'cobrado', label: 'Cobrado (C$)', type: 'currency', sumInTotals: true },
      { key: 'saldoPendiente', label: 'Saldo CxC (C$)', type: 'currency', sumInTotals: true },
      { key: 'diasVencidos', label: 'Días Mora', type: 'number' },
      { key: 'tramoMora', label: 'Antigüedad', type: 'badge', pivotDimension: true },
      { key: 'estado', label: 'Estado', type: 'badge', pivotDimension: true },
    ];

    return {
      tipo: ReportType.FACTURACION_CXC,
      titulo: 'Reporte de Facturación, Cobranza y Cartera CxC',
      subtitulo:
        'Análisis de ventas facturadas, cobros, saldos vencidos por tramo de antigüedad y recibos de caja.',
      modulo: 'Facturación y CxC',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Total Facturado (Vigente)', value: totalFacturado, format: 'currency', tone: 'blue' },
        { label: 'Total Cobrado', value: totalCobrado, format: 'currency', tone: 'emerald' },
        { label: 'Saldo Pendiente CxC', value: totalSaldo, format: 'currency', tone: 'amber' },
        { label: 'Cartera Vencida', value: totalVencido, format: 'currency', tone: 'rose' },
        { label: 'Facturas Anuladas', value: anuladas, format: 'number', tone: 'slate' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_estado',
          titulo: 'Resumen Dinámico por Estado de Factura',
          dimensionKey: 'estado',
          dimensionLabel: 'Estado',
          metricKey: 'total',
          metricLabel: 'Total Facturado (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'saldoPendiente',
          secondaryMetricLabel: 'Saldo Pendiente (C$)',
          secondaryMetricFormat: 'currency',
          crossDimensionKey: 'condicionPago',
          crossDimensionLabel: 'Condición Pago',
        }),
        buildDynamicSummary(filas, {
          id: 'por_antiguedad',
          titulo: 'Resumen Dinámico de Antigüedad de Saldos (Aging)',
          dimensionKey: 'tramoMora',
          dimensionLabel: 'Tramo de Antigüedad',
          metricKey: 'saldoPendiente',
          metricLabel: 'Saldo Pendiente (C$)',
          metricFormat: 'currency',
        }),
        buildDynamicSummary(filas, {
          id: 'por_cliente',
          titulo: 'Resumen Dinámico por Cliente',
          dimensionKey: 'cliente',
          dimensionLabel: 'Cliente',
          metricKey: 'total',
          metricLabel: 'Total Facturado (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'saldoPendiente',
          secondaryMetricLabel: 'Saldo CxC (C$)',
          secondaryMetricFormat: 'currency',
        }),
      ],
      hojasAdicionales: [
        {
          id: 'recibos_caja',
          nombreHoja: 'Recibos de Caja',
          titulo: 'Detalle de Recibos Oficiales de Caja y Retenciones',
          subtitulo: 'Ingresos aplicados, retenciones IR 2% / IMI 1% y estado de anulación.',
          columnas: [
            { key: 'numeroRecibo', label: 'No. Recibo', type: 'text' },
            { key: 'fechaRecibo', label: 'Fecha', type: 'date' },
            { key: 'cliente', label: 'Cliente', type: 'text' },
            { key: 'metodoPago', label: 'Método', type: 'badge' },
            { key: 'banco', label: 'Banco / Caja', type: 'text' },
            { key: 'referencia', label: 'Referencia', type: 'text' },
            { key: 'efectivoBanco', label: 'Efectivo/Banco (C$)', type: 'currency', sumInTotals: true },
            { key: 'retencionIr', label: 'Ret. IR (C$)', type: 'currency', sumInTotals: true },
            { key: 'retencionImi', label: 'Ret. IMI (C$)', type: 'currency', sumInTotals: true },
            { key: 'totalLiquidado', label: 'Total Liquidado (C$)', type: 'currency', sumInTotals: true },
            { key: 'estado', label: 'Estado', type: 'badge' },
            { key: 'motivoAnulacion', label: 'Motivo Anulación', type: 'text' },
          ],
          filas: recibosRows,
        },
      ],
      estadosDisponibles: ['PENDIENTE', 'PAGADA_PARCIAL', 'PAGADA', 'VENCIDA', 'CANCELADA'],
    };
  }

  // ============================================================================
  // 6. COMPRAS, SUBARRIENDOS Y BODEGA DE INSUMOS
  // ============================================================================
  private async buildComprasInsumosReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const { desde, hasta } = parseDateRange(filters);
    const [compras, subarriendos, insumos] = await Promise.all([
      this.prisma.compraInsumo.findMany({
        where: {
          empresaId,
          ...(desde || hasta
            ? {
                fechaCompra: {
                  ...(desde ? { gte: desde } : {}),
                  ...(hasta ? { lte: hasta } : {}),
                },
              }
            : {}),
          ...(filters.estado ? { estado: filters.estado as any } : {}),
        },
        include: { items: true },
        orderBy: { fechaCompra: 'desc' },
      }),
      this.prisma.subarriendoProveedor.findMany({
        where: { empresaId },
        include: { equipo: { select: { codigo: true, modelo: true } } },
        orderBy: { fechaInicio: 'desc' },
      }),
      this.prisma.insumo.findMany({
        where: { empresaId },
        include: { proveedor: { select: { nombre: true } } },
        orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      }),
    ]);

    const allRows = compras.map((c) => {
      const total = round2(Number(c.total || 0));
      const pagado = round2(Number(c.montoPagado || 0));
      const saldo =
        c.estado === 'ANULADA' ? 0 : round2(Math.max(0, total - pagado));
      return {
        codigo: c.codigo,
        fechaCompra: toIsoDate(c.fechaCompra),
        mes: toYearMonth(c.fechaCompra),
        proveedor: c.proveedorNombre,
        numeroFactura: c.numeroFactura || '-',
        condicionPago: c.condicionPago,
        metodoPago: c.metodoPago,
        cuentaPago: c.cuentaPagoCodigo || '-',
        cantidadItems: c.items.length,
        subtotal: round2(Number(c.subtotal || 0)),
        ivaTotal: round2(Number(c.ivaTotal || 0)),
        total,
        montoPagado: pagado,
        saldoCxp: saldo,
        estadoPago: c.estadoPago,
        estado: c.estado,
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const comprasActivas = filas.filter((r) => r.estado !== 'ANULADA');
    const totalComprado = round2(comprasActivas.reduce((s, r) => s + r.total, 0));
    const saldoCxpCompras = round2(comprasActivas.reduce((s, r) => s + r.saldoCxp, 0));

    const subRows = subarriendos.map((s) => {
      const monto = round2(Number(s.montoFinal ?? s.montoEstimado ?? 0));
      const pagado = round2(Number(s.montoPagado || 0));
      return {
        codigo: s.codigo,
        proveedor: s.proveedorNombre,
        equipo: `${s.equipo?.codigo || ''} ${s.equipo?.modelo || ''}`.trim(),
        modalidad: s.modalidad,
        tarifaProveedor: round2(Number(s.tarifaProveedor || 0)),
        cantidadUnidades: s.cantidadUnidades,
        fechaInicio: toIsoDate(s.fechaInicio),
        fechaFinEstimada: toIsoDate(s.fechaFinEstimada),
        fechaDevolucionReal: toIsoDate(s.fechaDevolucionReal),
        montoTotal: monto,
        montoPagado: pagado,
        saldoPendiente: s.estado === 'CANCELADO' ? 0 : round2(Math.max(0, monto - pagado)),
        estadoPago: s.estadoPago,
        estado: s.estado,
      };
    });

    const insumoRows = insumos.map((i) => {
      const stock = round2(Number(i.stockActual || 0));
      const minimo = round2(Number(i.stockMinimo || 0));
      const costo = round2(Number(i.costoUnitario || 0));
      return {
        codigo: i.codigo || '-',
        nombre: i.nombre,
        categoria: i.categoria,
        unidad: i.unidadMedida,
        proveedor: i.proveedor?.nombre || '-',
        stockActual: stock,
        stockMinimo: minimo,
        alerta: stock <= minimo ? 'BAJO MÍNIMO' : 'OK',
        costoUnitario: costo,
        valorInventario: round2(stock * costo),
        activo: i.activo ? 'SÍ' : 'NO',
      };
    });

    const valorBodega = round2(
      insumoRows.reduce((s, i) => s + i.valorInventario, 0),
    );
    const totalSubarriendos = round2(
      subRows
        .filter((s) => s.estado !== 'CANCELADO')
        .reduce((acc, s) => acc + s.montoTotal, 0),
    );

    const columnas: ReportColumnDef[] = [
      { key: 'codigo', label: 'Código OC', type: 'text' },
      { key: 'fechaCompra', label: 'Fecha Compra', type: 'date' },
      { key: 'mes', label: 'Mes', type: 'text', pivotDimension: true },
      { key: 'proveedor', label: 'Proveedor', type: 'text', pivotDimension: true },
      { key: 'numeroFactura', label: 'No. Factura', type: 'text' },
      { key: 'condicionPago', label: 'Condición', type: 'badge', pivotDimension: true },
      { key: 'metodoPago', label: 'Método Pago', type: 'text' },
      { key: 'cuentaPago', label: 'Cuenta Pago', type: 'text' },
      { key: 'cantidadItems', label: 'Líneas', type: 'number', sumInTotals: true },
      { key: 'subtotal', label: 'Subtotal (C$)', type: 'currency', sumInTotals: true },
      { key: 'ivaTotal', label: 'IVA (C$)', type: 'currency', sumInTotals: true },
      { key: 'total', label: 'Total Compra (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'montoPagado', label: 'Pagado (C$)', type: 'currency', sumInTotals: true },
      { key: 'saldoCxp', label: 'Saldo CxP (C$)', type: 'currency', sumInTotals: true },
      { key: 'estadoPago', label: 'Estado Pago', type: 'badge' },
      { key: 'estado', label: 'Estado OC', type: 'badge', pivotDimension: true },
    ];

    return {
      tipo: ReportType.COMPRAS_INSUMOS,
      titulo: 'Reporte de Compras, Maquinaria Externa y Bodega de Insumos',
      subtitulo:
        'Abastecimiento de bodega, subarriendos con proveedores, CxP y valoración de existencias.',
      modulo: 'Compras e Insumos',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Órdenes de Compra', value: filas.length, format: 'number', tone: 'blue' },
        { label: 'Total Comprado Insumos', value: totalComprado, format: 'currency', tone: 'indigo' },
        { label: 'CxP Pendiente Compras', value: saldoCxpCompras, format: 'currency', tone: 'rose' },
        { label: 'Subarriendos Maq. Externa', value: totalSubarriendos, format: 'currency', tone: 'amber' },
        { label: 'Valor Bodega Insumos', value: valorBodega, format: 'currency', tone: 'emerald' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_proveedor',
          titulo: 'Resumen Dinámico de Compras por Proveedor',
          dimensionKey: 'proveedor',
          dimensionLabel: 'Proveedor',
          metricKey: 'total',
          metricLabel: 'Total Comprado (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'saldoCxp',
          secondaryMetricLabel: 'Saldo CxP (C$)',
          secondaryMetricFormat: 'currency',
          crossDimensionKey: 'condicionPago',
          crossDimensionLabel: 'Condición',
        }),
        buildDynamicSummary(filas, {
          id: 'por_estado',
          titulo: 'Resumen Dinámico por Estado de Compra',
          dimensionKey: 'estado',
          dimensionLabel: 'Estado',
          metricKey: 'total',
          metricLabel: 'Total (C$)',
          metricFormat: 'currency',
        }),
      ],
      hojasAdicionales: [
        {
          id: 'subarriendos_externos',
          nombreHoja: 'Subarriendos Externos',
          titulo: 'Maquinaria Externa Subarrendada a Proveedores',
          subtitulo: 'Períodos, costos y pagos de maquinaria de terceros.',
          columnas: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'proveedor', label: 'Proveedor', type: 'text' },
            { key: 'equipo', label: 'Maquinaria', type: 'text' },
            { key: 'modalidad', label: 'Modalidad', type: 'text' },
            { key: 'tarifaProveedor', label: 'Tarifa Prov. (C$)', type: 'currency' },
            { key: 'cantidadUnidades', label: 'Unid.', type: 'number', sumInTotals: true },
            { key: 'fechaInicio', label: 'Inicio', type: 'date' },
            { key: 'fechaFinEstimada', label: 'Fin Est.', type: 'date' },
            { key: 'montoTotal', label: 'Monto (C$)', type: 'currency', sumInTotals: true },
            { key: 'montoPagado', label: 'Pagado (C$)', type: 'currency', sumInTotals: true },
            { key: 'saldoPendiente', label: 'Saldo CxP (C$)', type: 'currency', sumInTotals: true },
            { key: 'estado', label: 'Estado', type: 'badge' },
          ],
          filas: subRows,
        },
        {
          id: 'bodega_insumos',
          nombreHoja: 'Bodega de Insumos',
          titulo: 'Existencias Actuales y Valoración de Bodega de Insumos',
          subtitulo: 'Stock actual vs stock mínimo, costo unitario y valor total.',
          columnas: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'nombre', label: 'Insumo / Repuesto', type: 'text' },
            { key: 'categoria', label: 'Categoría', type: 'text' },
            { key: 'unidad', label: 'Unidad', type: 'text' },
            { key: 'proveedor', label: 'Proveedor', type: 'text' },
            { key: 'stockActual', label: 'Stock Actual', type: 'number', sumInTotals: true },
            { key: 'stockMinimo', label: 'Stock Mínimo', type: 'number' },
            { key: 'alerta', label: 'Estado Stock', type: 'badge' },
            { key: 'costoUnitario', label: 'Costo Unit. (C$)', type: 'currency' },
            { key: 'valorInventario', label: 'Valor Total (C$)', type: 'currency', sumInTotals: true },
          ],
          filas: insumoRows,
        },
      ],
      estadosDisponibles: ['BORRADOR', 'RECIBIDA', 'ANULADA'],
    };
  }

  // ============================================================================
  // 7. TALLER Y MANTENIMIENTO
  // ============================================================================
  private async buildMantenimientoReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const { desde, hasta } = parseDateRange(filters);
    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: {
        equipo: { empresaId },
        ...(desde || hasta
          ? {
              fechaProgramacion: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
        ...(filters.estado ? { estado: filters.estado as any } : {}),
      },
      include: {
        equipo: {
          include: {
            categoria: { select: { nombre: true } },
            marca: { select: { nombre: true } },
          },
        },
        consumosInsumo: {
          include: {
            insumo: { select: { nombre: true, categoria: true, unidadMedida: true } },
          },
        },
      },
      orderBy: { fechaProgramacion: 'desc' },
    });

    const consumosRows: Array<Record<string, unknown>> = [];

    const allRows = mantenimientos.map((m) => {
      for (const ci of m.consumosInsumo || []) {
        consumosRows.push({
          ordenTaller: m.codigo || m.id.slice(0, 8).toUpperCase(),
          equipo: `${m.equipo?.codigo || ''} ${m.equipo?.modelo || ''}`.trim(),
          insumo: ci.insumo?.nombre || 'Insumo',
          categoriaInsumo: ci.insumo?.categoria || 'General',
          unidad: ci.insumo?.unidadMedida || 'UNIDAD',
          cantidad: round2(Number(ci.cantidad || 0)),
          costoUnitario: round2(Number(ci.costoUnitario || 0)),
          total: round2(Number(ci.total || 0)),
          fecha: toIsoDate(ci.createdAt),
        });
      }

      return {
        codigo: m.codigo || `OT-${m.id.slice(0, 6).toUpperCase()}`,
        fechaProgramacion: toIsoDate(m.fechaProgramacion),
        mes: toYearMonth(m.fechaProgramacion),
        fechaEjecucion: toIsoDate(m.fechaEjecucion),
        codigoEquipo: m.equipo?.codigo || 'S/C',
        equipo: m.equipo?.modelo || 'Equipo',
        categoria: m.equipo?.categoria?.nombre || 'General',
        marca: m.equipo?.marca?.nombre || '-',
        tipo: m.tipo,
        estado: m.estado,
        horometroServicio: round2(Number(m.horometroServicio || 0)),
        cobrableCliente: m.cobrableCliente ? 'SÍ' : 'NO',
        costo: round2(Number(m.costo || 0)),
        insumosUtilizados: m.insumosUtilizados || '-',
        descripcion: m.descripcion,
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const costoTotal = round2(filas.reduce((s, r) => s + r.costo, 0));
    const preventivos = filas.filter((r) => r.tipo === 'PREVENTIVO').length;
    const correctivos = filas.filter((r) => r.tipo === 'CORRECTIVO').length;
    const cobrables = round2(
      filas.filter((r) => r.cobrableCliente === 'SÍ').reduce((s, r) => s + r.costo, 0),
    );

    const columnas: ReportColumnDef[] = [
      { key: 'codigo', label: 'Código OT', type: 'text' },
      { key: 'fechaProgramacion', label: 'Programación', type: 'date' },
      { key: 'mes', label: 'Mes', type: 'text', pivotDimension: true },
      { key: 'fechaEjecucion', label: 'Ejecución', type: 'date' },
      { key: 'codigoEquipo', label: 'Cód. Equipo', type: 'text' },
      { key: 'equipo', label: 'Equipo', type: 'text', pivotDimension: true },
      { key: 'categoria', label: 'Categoría', type: 'text', pivotDimension: true },
      { key: 'tipo', label: 'Tipo', type: 'badge', pivotDimension: true },
      { key: 'estado', label: 'Estado', type: 'badge', pivotDimension: true },
      { key: 'horometroServicio', label: 'Horómetro', type: 'number' },
      { key: 'cobrableCliente', label: 'Cobrable Cliente', type: 'badge' },
      { key: 'costo', label: 'Costo Total (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'insumosUtilizados', label: 'Insumos', type: 'text' },
      { key: 'descripcion', label: 'Descripción', type: 'text' },
    ];

    return {
      tipo: ReportType.MANTENIMIENTO,
      titulo: 'Reporte de Taller, Mantenimiento y Repuestos',
      subtitulo:
        'Costos preventivos y correctivos por máquina, cargos a clientes y consumo de bodega.',
      modulo: 'Taller y Mantenimiento',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Total Órdenes Taller', value: filas.length, format: 'number', tone: 'blue' },
        { label: 'Preventivos', value: preventivos, format: 'number', tone: 'emerald' },
        { label: 'Correctivos', value: correctivos, format: 'number', tone: 'amber' },
        { label: 'Costo Total Taller', value: costoTotal, format: 'currency', tone: 'rose' },
        { label: 'Recuperable (Cliente)', value: cobrables, format: 'currency', tone: 'indigo' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_tipo',
          titulo: 'Resumen Dinámico por Tipo de Mantenimiento',
          dimensionKey: 'tipo',
          dimensionLabel: 'Tipo',
          metricKey: 'costo',
          metricLabel: 'Costo Total (C$)',
          metricFormat: 'currency',
          crossDimensionKey: 'estado',
          crossDimensionLabel: 'Estado',
        }),
        buildDynamicSummary(filas, {
          id: 'por_equipo',
          titulo: 'Resumen Dinámico de Costos por Equipo',
          dimensionKey: 'equipo',
          dimensionLabel: 'Equipo',
          metricKey: 'costo',
          metricLabel: 'Costo Acumulado (C$)',
          metricFormat: 'currency',
        }),
      ],
      hojasAdicionales: [
        {
          id: 'consumo_insumos',
          nombreHoja: 'Consumo de Insumos',
          titulo: 'Insumos y Repuestos Consumidos en Taller',
          subtitulo: 'Detalle de salidas de bodega imputadas a órdenes de mantenimiento.',
          columnas: [
            { key: 'ordenTaller', label: 'Orden Taller', type: 'text' },
            { key: 'fecha', label: 'Fecha', type: 'date' },
            { key: 'equipo', label: 'Equipo', type: 'text' },
            { key: 'insumo', label: 'Insumo', type: 'text' },
            { key: 'categoriaInsumo', label: 'Categoría', type: 'text' },
            { key: 'unidad', label: 'Unidad', type: 'text' },
            { key: 'cantidad', label: 'Cantidad', type: 'number', sumInTotals: true },
            { key: 'costoUnitario', label: 'Costo Unit. (C$)', type: 'currency' },
            { key: 'total', label: 'Total (C$)', type: 'currency', sumInTotals: true },
          ],
          filas: consumosRows,
        },
      ],
      estadosDisponibles: ['PROGRAMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'],
    };
  }

  // ============================================================================
  // 8. CONTABILIDAD, LIBRO DIARIO, BALANZA Y BANCOS
  // ============================================================================
  private async buildContabilidadReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const [diario, balanza, bancos] = await Promise.all([
      this.accountingService.getLibroDiario(empresaId, 500),
      this.accountingService.getBalanzaComprobacion(empresaId, filters.sucursalId),
      this.accountingService.getCuentasBancarias(empresaId, filters.sucursalId),
    ]);

    const { desde, hasta } = parseDateRange(filters);
    const allRows: Array<Record<string, unknown>> = [];

    for (const p of diario.polizas || []) {
      const fDate = new Date(p.fecha);
      if (desde && fDate < desde) continue;
      if (hasta && fDate > hasta) continue;
      if (filters.estado && p.tipoPoliza !== filters.estado) continue;

      for (const l of p.lineas || []) {
        allRows.push({
          numeroPoliza: p.numeroPoliza,
          fecha: toIsoDate(p.fecha),
          mes: toYearMonth(p.fecha),
          tipoPoliza: p.tipoPoliza,
          referenciaDoc: p.referenciaDoc,
          cuentaCodigo: l.cuentaCodigo,
          cuentaNombre: l.cuentaNombre,
          concepto: l.concepto || p.concepto,
          debe: round2(Number(l.debe || 0)),
          haber: round2(Number(l.haber || 0)),
        });
      }
    }

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const totalDebe = round2(filas.reduce((s, r) => s + Number(r.debe || 0), 0));
    const totalHaber = round2(filas.reduce((s, r) => s + Number(r.haber || 0), 0));

    const balanzaRows = (balanza.cuentas || [])
      .filter(
        (c) =>
          c.saldoInicialDebe > 0 ||
          c.saldoInicialHaber > 0 ||
          c.movimientoDebe > 0 ||
          c.movimientoHaber > 0,
      )
      .map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        nivel: c.nivel,
        tipo: c.tipo,
        naturaleza: c.naturaleza,
        saldoInicialDebe: round2(c.saldoInicialDebe),
        saldoInicialHaber: round2(c.saldoInicialHaber),
        movimientoDebe: round2(c.movimientoDebe),
        movimientoHaber: round2(c.movimientoHaber),
        saldoFinalDeudor: round2(c.saldoFinalDeudor),
        saldoFinalAcreedor: round2(c.saldoFinalAcreedor),
      }));

    const bancosRows = (bancos?.cuentas || []).map((b: any) => ({
      codigo: b.codigo,
      nombre: b.nombre,
      grupo: b.grupo,
      moneda: b.moneda,
      saldoInicial: round2(Number(b.saldoInicial || 0)),
      ingresos: round2(Number(b.ingresos || 0)),
      egresos: round2(Number(b.egresos || 0)),
      saldoActual: round2(Number(b.saldoActual || 0)),
      movimientosCount: Number(b.movimientosCount || 0),
    }));

    const saldoTotalTesoreria = round2(
      bancosRows.reduce((s: number, b: any) => s + b.saldoActual, 0),
    );

    const columnas: ReportColumnDef[] = [
      { key: 'numeroPoliza', label: 'No. Póliza / Asiento', type: 'text' },
      { key: 'fecha', label: 'Fecha', type: 'date' },
      { key: 'mes', label: 'Mes', type: 'text', pivotDimension: true },
      { key: 'tipoPoliza', label: 'Tipo Póliza', type: 'badge', pivotDimension: true },
      { key: 'referenciaDoc', label: 'Documento Ref.', type: 'text' },
      { key: 'cuentaCodigo', label: 'Cód. Cuenta', type: 'text', pivotDimension: true },
      { key: 'cuentaNombre', label: 'Nombre Cuenta', type: 'text', pivotDimension: true },
      { key: 'concepto', label: 'Concepto / Glosa', type: 'text' },
      { key: 'debe', label: 'Debe (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'haber', label: 'Haber (C$)', type: 'currency', sumInTotals: true },
    ];

    return {
      tipo: ReportType.CONTABILIDAD,
      titulo: 'Reporte Contable: Libro Diario, Balanza y Tesorería',
      subtitulo:
        'Movimientos contables integrados por partida doble, saldos de mayor y disponibilidad bancaria.',
      modulo: 'Contabilidad & Finanzas',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Líneas de Diario', value: filas.length, format: 'number', tone: 'slate' },
        { label: 'Total Debe (Período)', value: totalDebe, format: 'currency', tone: 'blue' },
        { label: 'Total Haber (Período)', value: totalHaber, format: 'currency', tone: 'indigo' },
        { label: 'Saldo Final Deudor Balanza', value: round2(balanza.totalSaldoFinalDeudor), format: 'currency', tone: 'emerald' },
        { label: 'Tesorería (Bancos + Caja)', value: saldoTotalTesoreria, format: 'currency', tone: 'amber' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_cuenta',
          titulo: 'Resumen Dinámico por Cuenta Contable',
          dimensionKey: 'cuentaNombre',
          dimensionLabel: 'Cuenta Contable',
          metricKey: 'debe',
          metricLabel: 'Total Debe (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'haber',
          secondaryMetricLabel: 'Total Haber (C$)',
          secondaryMetricFormat: 'currency',
          crossDimensionKey: 'tipoPoliza',
          crossDimensionLabel: 'Tipo Póliza',
        }),
        buildDynamicSummary(filas, {
          id: 'por_tipo',
          titulo: 'Resumen Dinámico por Tipo de Póliza',
          dimensionKey: 'tipoPoliza',
          dimensionLabel: 'Tipo Póliza',
          metricKey: 'debe',
          metricLabel: 'Total Debe (C$)',
          metricFormat: 'currency',
        }),
      ],
      hojasAdicionales: [
        {
          id: 'balanza_comprobacion',
          nombreHoja: 'Balanza de Comprobación',
          titulo: 'Balanza de Comprobación BM Construcciones',
          subtitulo: `Saldos iniciales, movimientos acumulados y saldos finales (${balanza.cuadrada ? 'CUADRADA' : 'REVISAR DESCUADRE'}).`,
          columnas: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'nombre', label: 'Cuenta', type: 'text' },
            { key: 'nivel', label: 'Nivel', type: 'number' },
            { key: 'tipo', label: 'Tipo', type: 'text' },
            { key: 'naturaleza', label: 'Naturaleza', type: 'text' },
            { key: 'saldoInicialDebe', label: 'SI Debe', type: 'currency', sumInTotals: true },
            { key: 'saldoInicialHaber', label: 'SI Haber', type: 'currency', sumInTotals: true },
            { key: 'movimientoDebe', label: 'Mov. Debe', type: 'currency', sumInTotals: true },
            { key: 'movimientoHaber', label: 'Mov. Haber', type: 'currency', sumInTotals: true },
            { key: 'saldoFinalDeudor', label: 'Saldo Deudor', type: 'currency', sumInTotals: true },
            { key: 'saldoFinalAcreedor', label: 'Saldo Acreedor', type: 'currency', sumInTotals: true },
          ],
          filas: balanzaRows,
        },
        {
          id: 'bancos_caja',
          nombreHoja: 'Bancos y Caja',
          titulo: 'Saldos de Cuentas Bancarias y Caja (1101 / 1102)',
          subtitulo: 'Movimientos de tesorería por cuenta oficial.',
          columnas: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'nombre', label: 'Cuenta', type: 'text' },
            { key: 'grupo', label: 'Grupo', type: 'badge' },
            { key: 'moneda', label: 'Moneda', type: 'text' },
            { key: 'saldoInicial', label: 'Saldo Inicial', type: 'currency', sumInTotals: true },
            { key: 'ingresos', label: 'Ingresos', type: 'currency', sumInTotals: true },
            { key: 'egresos', label: 'Egresos', type: 'currency', sumInTotals: true },
            { key: 'saldoActual', label: 'Saldo Actual', type: 'currency', sumInTotals: true },
            { key: 'movimientosCount', label: 'Movimientos', type: 'number', sumInTotals: true },
          ],
          filas: bancosRows,
        },
      ],
      estadosDisponibles: ['VENTAS', 'INGRESOS', 'EGRESOS', 'DIARIO', 'CXC_COBRO', 'CXC_REVERSION'],
    };
  }

  // ============================================================================
  // 9. NÓMINA Y COMISIONES
  // ============================================================================
  private async buildNominaComisionesReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const [planillas, comisiones] = await Promise.all([
      this.prisma.planilla.findMany({
        where: {
          empresaId,
          ...(filters.estado ? { estado: filters.estado as any } : {}),
        },
        include: {
          periodo: true,
          sucursal: { select: { nombre: true } },
          empleados: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.liquidacionComision.findMany({
        where: { empresaId },
        include: {
          vendedor: { select: { nombreMostrar: true, codigo: true } },
          periodo: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const allRows = planillas.map((p) => {
      const dev = round2(Number(p.totalDevengado || 0));
      const pat = round2(Number(p.totalPatronal || 0));
      const periodoLabel = p.periodo
        ? `${p.periodo.anio}-${String(p.periodo.mes).padStart(2, '0')}${p.periodo.quincena ? `-Q${p.periodo.quincena}` : ''}`
        : 'Sin Período';
      return {
        periodo: periodoLabel,
        tipoPeriodo: p.periodo?.tipo || 'ORDINARIA',
        sucursal: p.sucursal?.nombre || 'General',
        fechaPago: toIsoDate(p.periodo?.fechaPago || p.pagadoEn),
        estado: p.estado,
        empleados: p.empleados.length,
        totalDevengado: dev,
        totalDeducciones: round2(Number(p.totalDeducciones || 0)),
        totalNeto: round2(Number(p.totalNeto || 0)),
        inssPatronal: round2(Number(p.totalInssPatronal || 0)),
        inatec: round2(Number(p.totalInatec || 0)),
        totalPatronal: pat,
        costoTotalEmpresa: round2(dev + pat),
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const totalNeto = round2(filas.reduce((s, r) => s + r.totalNeto, 0));
    const totalCostoEmpresa = round2(filas.reduce((s, r) => s + r.costoTotalEmpresa, 0));

    const comisionesRows = comisiones.map((c) => ({
      numero: c.numero,
      periodo: c.periodo
        ? `${c.periodo.anio}-${String(c.periodo.mes).padStart(2, '0')}`
        : '-',
      vendedor: c.vendedor?.nombreMostrar || 'Vendedor',
      totalVentas: round2(Number(c.totalVentas || 0)),
      totalNc: round2(Number(c.totalNc || 0)),
      baseComisionable: round2(Number(c.baseComisionable || 0)),
      comisionCalculada: round2(Number(c.comisionCalculada || 0)),
      totalAjustes: round2(Number(c.totalAjustes || 0)),
      comisionTotal: round2(Number(c.comisionTotal || 0)),
      estado: c.estado,
    }));

    const totalComisiones = round2(
      comisionesRows
        .filter((c) => c.estado !== 'ANULADO')
        .reduce((s, c) => s + c.comisionTotal, 0),
    );

    const columnas: ReportColumnDef[] = [
      { key: 'periodo', label: 'Período', type: 'text', pivotDimension: true },
      { key: 'tipoPeriodo', label: 'Tipo', type: 'text', pivotDimension: true },
      { key: 'sucursal', label: 'Sucursal', type: 'text' },
      { key: 'fechaPago', label: 'Fecha Pago', type: 'date' },
      { key: 'estado', label: 'Estado', type: 'badge', pivotDimension: true },
      { key: 'empleados', label: 'Colaboradores', type: 'number', sumInTotals: true },
      { key: 'totalDevengado', label: 'Devengado (C$)', type: 'currency', sumInTotals: true },
      { key: 'totalDeducciones', label: 'Deducciones (C$)', type: 'currency', sumInTotals: true },
      { key: 'totalNeto', label: 'Neto a Pagar (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'inssPatronal', label: 'INSS Pat. (C$)', type: 'currency', sumInTotals: true },
      { key: 'inatec', label: 'INATEC (C$)', type: 'currency', sumInTotals: true },
      { key: 'costoTotalEmpresa', label: 'Costo Empresa (C$)', type: 'currency', sumInTotals: true },
    ];

    return {
      tipo: ReportType.NOMINA_COMISIONES,
      titulo: 'Reporte de Nómina, Planillas y Comisiones Comerciales',
      subtitulo:
        'Consolidado de planillas laborales, cargas patronales (INSS/INATEC) y liquidaciones de comisiones.',
      modulo: 'Nómina y Comisiones',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Total Planillas', value: filas.length, format: 'number', tone: 'blue' },
        { label: 'Total Neto Pagado', value: totalNeto, format: 'currency', tone: 'emerald' },
        { label: 'Costo Total Empresa', value: totalCostoEmpresa, format: 'currency', tone: 'indigo' },
        { label: 'Comisiones Liquidadas', value: totalComisiones, format: 'currency', tone: 'amber' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_estado',
          titulo: 'Resumen Dinámico de Planillas por Estado',
          dimensionKey: 'estado',
          dimensionLabel: 'Estado',
          metricKey: 'costoTotalEmpresa',
          metricLabel: 'Costo Empresa (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'totalNeto',
          secondaryMetricLabel: 'Neto (C$)',
          secondaryMetricFormat: 'currency',
          crossDimensionKey: 'tipoPeriodo',
          crossDimensionLabel: 'Tipo Período',
        }),
      ],
      hojasAdicionales: [
        {
          id: 'comisiones_ventas',
          nombreHoja: 'Comisiones de Ventas',
          titulo: 'Liquidaciones de Comisiones por Vendedor',
          subtitulo: 'Ventas comisionables, deducciones por notas de crédito y comisión neta.',
          columnas: [
            { key: 'numero', label: 'No. Liquidación', type: 'text' },
            { key: 'periodo', label: 'Período', type: 'text' },
            { key: 'vendedor', label: 'Vendedor', type: 'text' },
            { key: 'totalVentas', label: 'Ventas (C$)', type: 'currency', sumInTotals: true },
            { key: 'totalNc', label: 'Notas Créd. (C$)', type: 'currency', sumInTotals: true },
            { key: 'baseComisionable', label: 'Base Comis. (C$)', type: 'currency', sumInTotals: true },
            { key: 'comisionCalculada', label: 'Comisión Calc. (C$)', type: 'currency', sumInTotals: true },
            { key: 'totalAjustes', label: 'Ajustes (C$)', type: 'currency', sumInTotals: true },
            { key: 'comisionTotal', label: 'Comisión Total (C$)', type: 'currency', sumInTotals: true },
            { key: 'estado', label: 'Estado', type: 'badge' },
          ],
          filas: comisionesRows,
        },
      ],
      estadosDisponibles: ['BORRADOR', 'CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA', 'ANULADA'],
    };
  }

  // ============================================================================
  // 10. CLIENTES
  // ============================================================================
  private async buildClientesReport(
    empresaId: string,
    filters: ReportFilterQueryDto,
  ): Promise<ReportPayload> {
    const clientes = await this.prisma.cliente.findMany({
      where: { empresaId },
      include: {
        cotizaciones: { select: { id: true } },
        contratos: { select: { id: true, estado: true } },
        facturas: {
          select: { id: true, total: true, saldoPendiente: true, estado: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    const allRows = clientes.map((cl) => {
      const facsValidas = cl.facturas.filter((f) => f.estado !== 'CANCELADA');
      const totalFacturado = round2(
        facsValidas.reduce((s, f) => s + Number(f.total || 0), 0),
      );
      const saldoPendiente = round2(
        facsValidas
          .filter((f) => f.estado !== 'PAGADA')
          .reduce((s, f) => s + Number(f.saldoPendiente || 0), 0),
      );
      return {
        numeroCliente: cl.numeroCliente || '-',
        nombre: cl.nombre,
        razonSocial: cl.razonSocial || cl.nombre,
        identificacion: cl.rfc || cl.cedula || '-',
        tipoCliente: cl.tipoCliente || 'GENERAL',
        departamento: cl.departamento || 'Managua',
        telefono: cl.telefono || cl.telClaro || cl.telMovistar || '-',
        email: cl.emailFacturacion || '-',
        vendedor: cl.vendedor || 'Sin Asignar',
        condicionPago: cl.condicionPago || 'CONTADO',
        limiteCredito: round2(Number(cl.limiteCredito || 0)),
        esRetenedor: cl.esRetenedor ? 'SÍ' : 'NO',
        exentoIva: cl.exentoIva ? 'SÍ' : 'NO',
        cotizaciones: cl.cotizaciones.length,
        contratos: cl.contratos.length,
        facturas: facsValidas.length,
        totalFacturado,
        saldoPendiente,
      };
    });

    const filas = allRows.filter((r) => matchesSearch(r, filters.search));
    const totalFacturado = round2(filas.reduce((s, r) => s + r.totalFacturado, 0));
    const totalCartera = round2(filas.reduce((s, r) => s + r.saldoPendiente, 0));
    const clientesConCredito = filas.filter((r) => r.limiteCredito > 0).length;

    const columnas: ReportColumnDef[] = [
      { key: 'numeroCliente', label: 'No. Cliente', type: 'text' },
      { key: 'nombre', label: 'Nombre Comercial', type: 'text' },
      { key: 'identificacion', label: 'RUC / Cédula', type: 'text' },
      { key: 'tipoCliente', label: 'Tipo Cliente', type: 'badge', pivotDimension: true },
      { key: 'departamento', label: 'Departamento', type: 'text', pivotDimension: true },
      { key: 'telefono', label: 'Teléfono', type: 'text' },
      { key: 'email', label: 'Correo', type: 'text' },
      { key: 'vendedor', label: 'Vendedor', type: 'text', pivotDimension: true },
      { key: 'condicionPago', label: 'Condición', type: 'badge', pivotDimension: true },
      { key: 'limiteCredito', label: 'Límite Crédito (C$)', type: 'currency', sumInTotals: true },
      { key: 'esRetenedor', label: 'Retenedor', type: 'text' },
      { key: 'cotizaciones', label: 'Cotiz.', type: 'number', sumInTotals: true },
      { key: 'contratos', label: 'Contratos', type: 'number', sumInTotals: true },
      { key: 'facturas', label: 'Facturas', type: 'number', sumInTotals: true },
      { key: 'totalFacturado', label: 'Total Facturado (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
      { key: 'saldoPendiente', label: 'Saldo CxC (C$)', type: 'currency', sumInTotals: true },
    ];

    return {
      tipo: ReportType.CLIENTES,
      titulo: 'Directorio de Clientes y Resumen de Cartera',
      subtitulo:
        'Padrón comercial, condiciones crediticias, actividad de renta y saldos pendientes por cliente.',
      modulo: 'Clientes',
      generadoEn: new Date().toISOString(),
      filtros: filters,
      kpis: [
        { label: 'Total Clientes', value: filas.length, format: 'number', tone: 'blue' },
        { label: 'Con Línea de Crédito', value: clientesConCredito, format: 'number', tone: 'indigo' },
        { label: 'Volumen Facturado', value: totalFacturado, format: 'currency', tone: 'emerald' },
        { label: 'Saldo Pendiente Total', value: totalCartera, format: 'currency', tone: 'amber' },
      ],
      columnas,
      filas,
      resumenesDinamicos: [
        buildDynamicSummary(filas, {
          id: 'por_tipo',
          titulo: 'Resumen Dinámico por Tipo de Cliente',
          dimensionKey: 'tipoCliente',
          dimensionLabel: 'Tipo Cliente',
          metricKey: 'totalFacturado',
          metricLabel: 'Facturado (C$)',
          metricFormat: 'currency',
          secondaryMetricKey: 'saldoPendiente',
          secondaryMetricLabel: 'Saldo CxC (C$)',
          secondaryMetricFormat: 'currency',
          crossDimensionKey: 'condicionPago',
          crossDimensionLabel: 'Condición Pago',
        }),
        buildDynamicSummary(filas, {
          id: 'por_departamento',
          titulo: 'Resumen Dinámico por Departamento',
          dimensionKey: 'departamento',
          dimensionLabel: 'Departamento',
          metricKey: 'totalFacturado',
          metricLabel: 'Facturado (C$)',
          metricFormat: 'currency',
        }),
      ],
      hojasAdicionales: [],
      estadosDisponibles: [],
    };
  }
}
