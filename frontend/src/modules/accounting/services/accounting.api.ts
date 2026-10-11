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
  qbTipo?: string;
  qbNombre?: string;
  descripcion?: string;
}

export interface CatalogoRes {
  total: number;
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
  totalDebe: number;
  totalHaber: number;
  cuadrada: boolean;
  cuentas: BalanzaFila[];
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
