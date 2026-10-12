export type MonedaTipo = 'NIO' | 'USD';

export interface TramoConfig {
  id: string;
  nombre: string;
  min: number;
  max: number;
}

export interface KpiTramoItem {
  tramoId: string;
  nombre: string;
  min: number;
  max: number;
  montoCordobas: number;
  montoVisualizado: number;
  porcentaje: number;
  cantidadDocumentos: number;
}

export interface DocumentoCarteraItem {
  id: string;
  tipoDocumento: 'FACTURA' | 'NOTA_DEBITO' | 'CUOTA_ARREGLO';
  folio: string;
  clienteId: string;
  clienteNombre: string;
  clienteRuc: string;
  fechaEmision: string;
  fechaVence: string;
  monedaOriginal: string;
  montoOriginal: number;
  tipoCambioEmision: number;
  saldoPendienteCordobas: number;
  saldoPendienteVisualizado: number;
  diasMora: number;
  tramoId: string;
  tramoNombre: string;
  estado: string;
  vendedorNombre?: string;
  sucursalNombre?: string;
}

export interface ClienteCarteraGroup {
  clienteId: string;
  clienteNombre: string;
  clienteRuc: string;
  tipoCliente?: string;
  vendedorNombre?: string;
  limiteCredito?: number;
  totalDocumentos: number;
  saldoTotalCordobas: number;
  saldoTotalVisualizado: number;
  tramos: Record<string, number>;
  porcentajeTotal: number;
  documentos: DocumentoCarteraItem[];
}

export interface AntiguedadResponse {
  parametrosActivos: {
    empresaId: string;
    sucursalId: string;
    vendedorId: string;
    tipoCliente: string;
    monedaOriginal: string;
    monedaVisualizacion: MonedaTipo;
    fechaCorte: string;
    criterioFecha: 'VENCIMIENTO' | 'EMISION';
    tipoCambioBcn: number;
    avisoFaltaTasaBcn: boolean;
  };
  resumenGlobal: {
    totalCarteraCordobas: number;
    totalCarteraVisualizada: number;
    totalClientes: number;
    totalDocumentos: number;
  };
  tramosDefinidos: TramoConfig[];
  kpisPorTramo: KpiTramoItem[];
  clientes: ClienteCarteraGroup[];
}

export interface MovimientoEstadoCuenta {
  id: string;
  fecha: string;
  tipoMovimiento: 'FACTURA' | 'NOTA_DEBITO' | 'RECIBO_CAJA' | 'ANTICIPO' | 'ARREGLO_PAGO';
  numeroDocumento: string;
  concepto: string;
  moneda: string;
  montoOriginal: number;
  tipoCambio: number;
  cargo: number;
  abono: number;
  retenciones: number;
  saldoAcumulado: number;
  estado: string;
}

export interface EstadoCuentaResponse {
  cliente: {
    id: string;
    nombre: string;
    razonSocial?: string;
    rfc: string;
    limiteCredito?: number | null;
    diasCredito: number;
    esRetenedor: boolean;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  empresa: {
    nombre: string;
    rfc?: string;
    direccion?: string;
    telefono?: string;
  };
  resumen: {
    saldoActualCordobas: number;
    saldoActualVisualizado: number;
    totalCargos: number;
    totalAbonos: number;
    monedaVisualizacion: MonedaTipo;
    tipoCambioBcn: number;
  };
  movimientos: MovimientoEstadoCuenta[];
}

export interface ReciboCajaItem {
  id: string;
  numeroRecibo: string;
  fechaRecibo: string;
  moneda: string;
  tipoCambioBcn: number;
  montoEfectivoBancos: number;
  montoRetencionIr: number;
  noConstanciaRetencionIr?: string;
  montoRetencionImi: number;
  noConstanciaRetencionImi?: string;
  totalLiquidado: number;
  totalAplicadoDocumentos: number;
  montoExcedenteAnticipo: number;
  metodoPago: string;
  banco?: string;
  numeroTransferenciaReferencia?: string;
  concepto: string;
  estado: 'EMITIDO' | 'ANULADO';
  cliente?: {
    id: string;
    nombre: string;
    rfc?: string;
  };
  sucursal?: {
    id: string;
    nombre: string;
  };
  creadoPor?: {
    nombre: string;
    apellido?: string;
  };
  aplicaciones?: any[];
}

export interface ArregloPagoItem {
  id: string;
  numeroArreglo: string;
  fechaEmision: string;
  estado: 'BORRADOR' | 'SOLICITADO' | 'FORMALIZADO' | 'VIGENTE' | 'INCUMPLIDO' | 'CANCELADO' | 'ANULADO';
  moneda: string;
  tipoCambioEmision: number;
  capitalOriginal: number;
  montoGastosAdmin: number;
  porcentajeGastosAdmin: number;
  tasaInteresAnual: number;
  montoTotalIntereses: number;
  montoTotalArreglo: number;
  saldoPendiente: number;
  numeroCuotas: number;
  frecuencia: string;
  fechaPrimeraCuota: string;
  penalidadIncumplimientoUsd: number;
  cliente?: {
    id: string;
    nombre: string;
  };
  sucursal?: {
    id: string;
    nombre: string;
  };
  cuotas?: Array<{
    id: string;
    numeroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: number;
    gastosAdmin: number;
    totalCuota: number;
    saldoCuota: number;
    estado: string;
  }>;
  documentos?: Array<{
    id: string;
    saldoIncorporado: number;
    factura?: {
      id: string;
      folio: string;
      total: number;
    };
  }>;
}

export interface NotaItem {
  id: string;
  numeroNota: string;
  tipoNota: 'DEBITO' | 'CREDITO';
  fechaEmision: string;
  fechaVence: string;
  subtotal: number;
  iva: number;
  total: number;
  saldoPendiente: number;
  condicionPago: string;
  estado: string;
  origen: string;
  concepto: string;
  cliente?: {
    id: string;
    nombre: string;
    rfc?: string;
  };
  sucursal?: {
    id: string;
    nombre: string;
  };
  facturaReferencia?: {
    id: string;
    folio: string;
    total: number;
  };
}

export interface CxcConfig {
  tramosAntiguedadJson: TramoConfig[];
  metodoAmortizacionDefault: string;
  rolAprobacionArreglo: string;
  diasGraciaAlertaMora: number;
  aplicaIvaIntereses: boolean;
  aplicaIvaGastosAdmin: boolean;
  serieReciboPorSucursal: boolean;
  aplicaRetencionImi: boolean;
  tasaRetencionIrDefault: number;
  tasaRetencionImiDefault: number;
  comisionesSoloFacturasPagadas: boolean;
  cuentaMayorClientes: string;
  cuentaAnticiposClientes: string;
}

export interface SimulacionArregloResponse {
  resumen: {
    capitalOriginal: number;
    montoIntereses: number;
    montoGastosAdmin: number;
    cuotaPromedio: number;
    granTotalArreglo: number;
  };
  tablaAmortizacion: Array<{
    numeroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: number;
    gastosAdmin: number;
    totalCuota: number;
    saldoRestante: number;
  }>;
}
