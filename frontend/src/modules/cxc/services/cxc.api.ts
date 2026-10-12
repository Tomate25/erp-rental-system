import api from '../../../shared/services/api';
import type {
  AntiguedadResponse,
  EstadoCuentaResponse,
  ReciboCajaItem,
  ArregloPagoItem,
  NotaItem,
  CxcConfig,
  MonedaTipo,
} from '../types/cxc.types';

const extract = <T>(res: any): T => {
  if (res?.data?.data !== undefined) return res.data.data;
  if (res?.data !== undefined) return res.data;
  return res;
};

export const cxcApi = {
  // Antigüedad y KPIs
  async getAntiguedad(params?: {
    sucursalId?: string;
    vendedorId?: string;
    tipoCliente?: string;
    monedaOriginal?: string;
    monedaVisualizacion?: MonedaTipo;
    fechaCorte?: string;
    criterioFecha?: 'VENCIMIENTO' | 'EMISION';
    clienteId?: string;
  }): Promise<AntiguedadResponse> {
    const res = await api.get('/cxc/antiguedad', { params });
    return extract<AntiguedadResponse>(res);
  },

  // Estado de Cuenta
  async getEstadoCuenta(
    clienteId: string,
    params?: {
      moneda?: MonedaTipo;
      fechaDesde?: string;
      fechaHasta?: string;
    },
  ): Promise<EstadoCuentaResponse> {
    const res = await api.get(`/cxc/estado-cuenta/${clienteId}`, { params });
    return extract<EstadoCuentaResponse>(res);
  },

  // Tipo de Cambio BCN
  async getTipoCambioHoy(): Promise<{ fecha: string; tasa: number }> {
    const res = await api.get('/cxc/tipo-cambio/hoy');
    return extract<{ fecha: string; tasa: number }>(res);
  },

  async getTipoCambioFecha(fecha: string): Promise<{ fecha: string; tasa: number }> {
    const res = await api.get(`/cxc/tipo-cambio/${fecha}`);
    return extract<{ fecha: string; tasa: number }>(res);
  },

  async setTipoCambio(fecha: string, tasa: number, fuente?: string) {
    const res = await api.post('/cxc/tipo-cambio', { fecha, tasa, fuente });
    return extract(res);
  },

  // Configuración de CxC
  async getConfiguracion(): Promise<CxcConfig> {
    const res = await api.get('/cxc/configuracion');
    return extract<CxcConfig>(res);
  },

  async updateConfiguracion(dto: Partial<CxcConfig>): Promise<CxcConfig> {
    const res = await api.patch('/cxc/configuracion', dto);
    return extract<CxcConfig>(res);
  },

  // Recibos de Caja
  async getRecibos(params?: {
    clienteId?: string;
    sucursalId?: string;
    estado?: string;
  }): Promise<ReciboCajaItem[]> {
    const res = await api.get('/cxc/recibos', { params });
    return extract<ReciboCajaItem[]>(res);
  },

  async getReciboPorId(id: string): Promise<ReciboCajaItem> {
    const res = await api.get(`/cxc/recibos/${id}`);
    return extract<ReciboCajaItem>(res);
  },

  async crearRecibo(dto: any): Promise<any> {
    const res = await api.post('/cxc/recibos', dto);
    return extract(res);
  },

  async anularRecibo(id: string, motivo: string): Promise<any> {
    const res = await api.post(`/cxc/recibos/${id}/anular`, { motivo });
    return extract(res);
  },

  // Arreglos de Pago
  async simularArreglo(dto: any): Promise<any> {
    const res = await api.post('/cxc/arreglos/simular', dto);
    return extract(res);
  },

  async getArreglos(params?: {
    clienteId?: string;
    estado?: string;
  }): Promise<ArregloPagoItem[]> {
    const res = await api.get('/cxc/arreglos', { params });
    return extract<ArregloPagoItem[]>(res);
  },

  async getArregloPorId(id: string): Promise<ArregloPagoItem> {
    const res = await api.get(`/cxc/arreglos/${id}`);
    return extract<ArregloPagoItem>(res);
  },

  async formalizarArreglo(dto: any): Promise<any> {
    const res = await api.post('/cxc/arreglos', dto);
    return extract(res);
  },

  async crearArreglo(dto: any): Promise<any> {
    return this.formalizarArreglo(dto);
  },

  async anularArreglo(id: string, motivo: string): Promise<any> {
    const res = await api.post(`/cxc/arreglos/${id}/anular`, { motivo });
    return extract(res);
  },

  async aplicarPenalidad(id: string): Promise<any> {
    const res = await api.post(`/cxc/arreglos/${id}/penalidad`, {});
    return extract(res);
  },

  // Notas de Débito y Crédito
  async getNotas(params?: {
    clienteId?: string;
    tipoNota?: string;
    estado?: string;
    sucursalId?: string;
  }): Promise<NotaItem[]> {
    const res = await api.get('/cxc/notas', { params });
    return extract<NotaItem[]>(res);
  },

  async getNotaPorId(id: string): Promise<NotaItem> {
    const res = await api.get(`/cxc/notas/${id}`);
    return extract<NotaItem>(res);
  },

  async crearNota(dto: any): Promise<any> {
    const res = await api.post('/cxc/notas', dto);
    return extract(res);
  },

  async anularNota(id: string, motivo: string): Promise<any> {
    const res = await api.post(`/cxc/notas/${id}/anular`, { motivo });
    return extract(res);
  },
};
