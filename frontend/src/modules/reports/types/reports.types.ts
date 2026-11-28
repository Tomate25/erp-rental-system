export type ReportType =
  | 'cotizaciones'
  | 'contratos'
  | 'inventario'
  | 'maquinaria_usada'
  | 'facturacion_cxc'
  | 'compras_insumos'
  | 'mantenimiento'
  | 'contabilidad'
  | 'nomina_comisiones'
  | 'clientes';

export type TipoDocumentoAnulable =
  | 'FACTURA'
  | 'CONTRATO'
  | 'COTIZACION'
  | 'RECIBO_CAJA'
  | 'COMPRA_INSUMO'
  | 'SUBARRIENDO_PROVEEDOR'
  | 'NOTA_CXC'
  | 'ASIENTO_MANUAL';

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

export interface ReportCatalogResponse {
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
}

export interface ConsolidatedReportResponse {
  generadoEn: string;
  filtros: Record<string, string | undefined>;
  totalReportes: number;
  reportes: ReportPayload[];
}

export interface ReportFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  search?: string;
}

export interface InventoryImpactItem {
  id: string;
  codigo: string;
  nombre: string;
  tipoControl: string;
  estadoActual: string;
  estadoResultante: string;
  stockActual: number;
  cambioStock: number;
  stockResultante: number;
  accion:
    | 'LIBERAR_RESERVA'
    | 'DESCONTAR_ENTRADA_BODEGA'
    | 'DESHABILITAR_EXTERNO'
    | 'SIN_CAMBIO';
  detalle: string;
}

export interface AccountingImpactLine {
  cuentaCodigo: string;
  cuentaNombre: string;
  naturaleza: 'Deudora' | 'Acreedora';
  debe: number;
  haber: number;
  concepto: string;
  saldoAntes: number;
  saldoDespues: number;
}

export interface RelatedDocumentImpact {
  tipo: string;
  codigo: string;
  estadoActual: string;
  estadoResultante: string;
  detalle: string;
}

export interface VoidingImpactPreview {
  tipoDocumento: TipoDocumentoAnulable;
  documentoId: string;
  codigo: string;
  fecha: string;
  tercero: string;
  monto: number;
  estadoActual: string;
  estadoResultante: string;
  puedeAnular: boolean;
  bloqueos: string[];
  advertencias: string[];
  impactoInventario: {
    tieneImpacto: boolean;
    tipoInventario: 'FLOTA_MAQUINARIA' | 'BODEGA_INSUMOS' | 'NINGUNO';
    resumen: string;
    items: InventoryImpactItem[];
  };
  impactoContable: {
    tieneImpacto: boolean;
    mecanismo:
      | 'ASIENTO_REVERSION'
      | 'EXCLUSION_POLIZA_AUTOMATICA'
      | 'ANULACION_ASIENTO'
      | 'SIN_IMPACTO';
    resumen: string;
    efectoBalanceGeneral: string;
    efectoEstadoResultados: string;
    partidasReversion: AccountingImpactLine[];
    totalDebe: number;
    totalHaber: number;
    cuadrado: boolean;
  };
  documentosRelacionados: RelatedDocumentImpact[];
}

export interface VoidingBehaviorMatrixRule {
  tipoDocumento: TipoDocumentoAnulable;
  nombre: string;
  modulo: string;
  afectaInventario: boolean;
  comportamientoInventario: string;
  afectaContabilidad: boolean;
  comportamientoContable: string;
  cuentasAfectadas: string[];
  efectoEstadosFinancieros: string;
  reglasBloqueo: string[];
}

export interface VoidableDocumentRow {
  tipoDocumento: TipoDocumentoAnulable;
  documentoId: string;
  codigo: string;
  fecha: string;
  tercero: string;
  descripcion: string;
  monto: number;
  estado: string;
  estaAnulado: boolean;
  afectaInventario: boolean;
  afectaContabilidad: boolean;
}

export interface VoidingDocumentsListResponse {
  total: number;
  activos: number;
  anulados: number;
  documentos: VoidableDocumentRow[];
}

export interface VoidingHistoryResponse {
  totalDocumentosAnulados: number;
  documentosAnulados: VoidableDocumentRow[];
  bitacoraAnulaciones: Array<{
    id: string;
    fecha: string;
    accion: string;
    entidadTipo: string;
    entidadId: string;
    usuario: string;
    detalles: string;
  }>;
}

export interface ExecuteVoidingResult {
  anulado: boolean;
  tipoDocumento: TipoDocumentoAnulable;
  documentoId: string;
  codigo: string;
  motivo: string;
  fechaAnulacion: string;
  asientoReversionNumero: string | null;
  impactoAplicado: {
    inventario: VoidingImpactPreview['impactoInventario'];
    contabilidad: VoidingImpactPreview['impactoContable'];
    documentosRelacionados: RelatedDocumentImpact[];
  };
}
