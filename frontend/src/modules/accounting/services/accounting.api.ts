import api from '../../../shared/services/api';

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export interface CuentaCatalogo {
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: string;
  naturaleza: 'Deudora' | 'Acreedora';
  aceptaMovimiento: boolean;
  esControl: boolean;
  mayorCodigo?: string;
  mayorNombre?: string;
  estado?: string;
  renglon?: string;
  qbTipo?: string;
  qbNombre?: string;
  descripcion?: string;
}

export interface CatalogoRes {
  total: number;
  totalGeneral?: number;
  totalDetalle?: number;
  totalMayor?: number;
  cuentas: CuentaCatalogo[];
}

export interface BalanzaFila {
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: string;
  naturaleza: 'Deudora' | 'Acreedora';
  saldoInicialDebe: number;
  saldoInicialHaber: number;
  movimientoDebe: number;
  movimientoHaber: number;
  saldoFinalDeudor: number;
  saldoFinalAcreedor: number;
  aceptaMovimiento: boolean;
  esControl: boolean;
}

export interface BalanzaComprobacionRes {
  fechaCorte: string;
  totalSaldoInicialDebe?: number;
  totalSaldoInicialHaber?: number;
  totalDebe: number;
  totalHaber: number;
  totalSaldoFinalDeudor?: number;
  totalSaldoFinalAcreedor?: number;
  cuadrada: boolean;
  cuentas: BalanzaFila[];
}

export interface SaldoInicialItem {
  codigo: string;
  nombre: string;
  mayorCodigo: string;
  mayorNombre: string;
  naturaleza: 'Deudora' | 'Acreedora';
  estado: string;
  renglon: string;
  deudor: number;
  acreedor: number;
  notas: string;
  fechaCorte: string | null;
}

export interface SaldosInicialesRes {
  fechaCorte: string;
  totalDeudor: number;
  totalAcreedor: number;
  diferencia: number;
  cuadrado: boolean;
  cuentasConSaldo: number;
  totalCuentasDetalle: number;
  totalCuentasCatalogo: number;
  items: SaldoInicialItem[];
}

export interface CuentaCatalogoInputPayload {
  codigo: string;
  nombre: string;
  mayorCodigo?: string;
  mayorNombre?: string;
  naturaleza: 'Deudora' | 'Acreedora';
  estado?: string;
  renglon?: string;
  qbTipo?: string;
}

export interface ImportarExcelContablePayload {
  fechaCorte: string;
  reemplazarCatalogo?: boolean;
  catalogo?: CuentaCatalogoInputPayload[];
  saldos: Array<{
    codigo: string;
    nombre?: string;
    deudor: number;
    acreedor: number;
    notas?: string;
  }>;
}

export interface LineaPoliza {
  cuentaCodigo: string;
  cuentaNombre: string;
  debe: number;
  haber: number;
  sucursalId?: string;
  equipoId?: string;
  clienteId?: string;
  concepto?: string;
}

export interface PolizaDiario {
  id: string;
  numeroPoliza: string;
  fecha: string | Date;
  tipoPoliza: 'VENTAS' | 'INGRESOS' | 'EGRESOS' | 'DIARIO';
  concepto: string;
  referenciaDoc: string;
  totalDebe: number;
  totalHaber: number;
  cuadrado: boolean;
  lineas: LineaPoliza[];
}

export interface LibroDiarioRes {
  totalPolizas: number;
  polizas: PolizaDiario[];
}

export interface QuickBooksExportRes {
  filename: string;
  mimeType: string;
  content: string;
}

export const getCatalogoCuentas = async (nivel?: number, q?: string): Promise<CatalogoRes> => {
  const params: Record<string, any> = {};
  if (nivel) params.nivel = nivel;
  if (q) params.q = q;
  const response = await api.get('/accounting/catalogo', { params });
  return extractObject<CatalogoRes>(response.data);
};

export const getBalanzaComprobacion = async (sucursalId?: string): Promise<BalanzaComprobacionRes> => {
  const params: Record<string, any> = {};
  if (sucursalId) params.sucursalId = sucursalId;
  const response = await api.get('/accounting/balanza-comprobacion', { params });
  return extractObject<BalanzaComprobacionRes>(response.data);
};

export const getLibroDiario = async (limit?: number): Promise<LibroDiarioRes> => {
  const params: Record<string, any> = {};
  if (limit) params.limit = limit;
  const response = await api.get('/accounting/libro-diario', { params });
  return extractObject<LibroDiarioRes>(response.data);
};

export const exportQuickBooks = async (formato: 'IIF' | 'CSV' = 'IIF'): Promise<QuickBooksExportRes> => {
  const response = await api.get('/accounting/quickbooks-export', { params: { formato } });
  return extractObject<QuickBooksExportRes>(response.data);
};

export const getCuentasPorCobrar = async (): Promise<any> => {
  const response = await api.get('/accounting/cxc');
  return extractObject<any>(response.data);
};

export const getCuentasPorPagar = async (): Promise<any> => {
  const response = await api.get('/accounting/cxp');
  return extractObject<any>(response.data);
};

export const getEstadoResultados = async (): Promise<any> => {
  const response = await api.get('/accounting/estado-resultados');
  return extractObject<any>(response.data);
};

export const getBalanceGeneral = async (): Promise<any> => {
  const response = await api.get('/accounting/balance-general');
  return extractObject<any>(response.data);
};

export const getSaldosIniciales = async (): Promise<SaldosInicialesRes> => {
  const response = await api.get('/accounting/saldos-iniciales');
  return extractObject<SaldosInicialesRes>(response.data);
};

export const guardarSaldosIniciales = async (payload: {
  fechaCorte: string;
  items: Array<{ codigo: string; nombre?: string; deudor: number; acreedor: number; notas?: string }>;
}): Promise<SaldosInicialesRes> => {
  const response = await api.put('/accounting/saldos-iniciales', payload);
  return extractObject<SaldosInicialesRes>(response.data);
};

export const importarExcelContable = async (
  payload: ImportarExcelContablePayload,
): Promise<SaldosInicialesRes> => {
  const response = await api.post('/accounting/saldos-iniciales/importar', payload);
  return extractObject<SaldosInicialesRes>(response.data);
};

export interface AsientoLineaItem {
  id?: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  debe: number;
  haber: number;
  clienteId?: string | null;
  conceptoLinea?: string | null;
}

export interface AsientoContableItem {
  id: string;
  numeroAsiento: string;
  fecha: string;
  tipoAsiento: 'INGRESOS' | 'EGRESOS' | 'DIARIO' | 'AJUSTE' | 'APERTURA' | 'CIERRE';
  origenModulo: 'CXC' | 'FACTURACION' | 'NOMINA' | 'OPERACIONES' | 'MANUAL';
  documentoReferencia?: string | null;
  concepto: string;
  totalDebe: number;
  totalHaber: number;
  cuadrado: boolean;
  estado: 'BORRADOR' | 'PUBLICADO' | 'ANULADO';
  sucursalId?: string | null;
  createdAt?: string;
  lineas: AsientoLineaItem[];
}

export interface CrearAsientoManualPayload {
  fecha: string;
  tipoAsiento: 'INGRESOS' | 'EGRESOS' | 'DIARIO' | 'AJUSTE' | 'APERTURA' | 'CIERRE';
  documentoReferencia?: string;
  concepto: string;
  sucursalId?: string;
  lineas: Array<{
    cuentaCodigo: string;
    debe: number;
    haber: number;
    clienteId?: string;
    conceptoLinea?: string;
  }>;
}

export const restaurarSaldosOficialesBm = async (): Promise<SaldosInicialesRes> => {
  const response = await api.post('/accounting/saldos-iniciales/restaurar-oficial');
  return extractObject<SaldosInicialesRes>(response.data);
};

export const listarAsientosContables = async (filtros?: {
  origenModulo?: string;
  tipoAsiento?: string;
  limit?: number;
}): Promise<{ total: number; asientos: AsientoContableItem[] }> => {
  const params: Record<string, any> = {};
  if (filtros?.origenModulo && filtros.origenModulo !== 'TODOS') {
    params.origenModulo = filtros.origenModulo;
  }
  if (filtros?.tipoAsiento && filtros.tipoAsiento !== 'TODOS') {
    params.tipoAsiento = filtros.tipoAsiento;
  }
  if (filtros?.limit) params.limit = filtros.limit;
  const response = await api.get('/accounting/asientos', { params });
  return extractObject<{ total: number; asientos: AsientoContableItem[] }>(response.data);
};

export const crearAsientoManual = async (
  payload: CrearAsientoManualPayload,
): Promise<AsientoContableItem> => {
  const response = await api.post('/accounting/asientos', payload);
  return extractObject<AsientoContableItem>(response.data);
};

export const anularAsientoManual = async (
  id: string,
  motivo?: string,
): Promise<any> => {
  const response = await api.post(`/accounting/asientos/${id}/anular`, { motivo });
  return extractObject<any>(response.data);
};
