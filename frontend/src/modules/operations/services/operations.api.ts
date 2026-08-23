import api from '../../../shared/services/api';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export interface ContractItem {
  id: string;
  equipoId: string;
  equipo?: {
    id: string;
    modelo: string;
    numeroSerie?: string;
    codigo?: string;
    tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD';
    cantidadTotal: number;
    cantidadDisponible: number;
    horometro: number;
    categoria?: { nombre: string };
    subcategoria?: { nombre: string };
    marca?: { nombre: string };
  };
  tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD';
  cantidad: number;
  precioRenta: number;
  horometroInicial: number;
}

export interface CorteFacturacion {
  id: string;
  contratoId: string;
  numeroCorte: number;
  fechaInicio: string;
  fechaFin: string;
  monto: number;
  estado: 'PENDIENTE' | 'FACTURADO' | 'ANULADO';
  createdAt: string;
  updatedAt: string;
  facturas?: any[];
}

export interface Contract {
  id: string;
  codigo: string;
  clienteId: string;
  cliente?: {
    nombre: string;
    razonSocial?: string;
    emailFacturacion?: string;
    telefono?: string;
  };
  cotizacionId?: string;
  cotizacion?: {
    numeroCotizacion: string;
    total: number;
  };
  fechaInicio: string;
  fechaFin: string;
  estado: 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';
  depositoGarantia: number;
  condiciones: string;
  items: ContractItem[];
  cortesFacturacion?: CorteFacturacion[];
  despachos?: any[];
  devoluciones?: any[];
  createdAt: string;
}

export interface CreateContractFromQuotationPayload {
  cotizacionId: string;
  fechaInicio: string;
  fechaFin: string;
  periodoDiasCorte?: number;
  depositoGarantia?: number;
  condiciones?: string;
}

export interface SolicitudDespacho {
  id: string;
  codigo: string;
  empresaId: string;
  sucursalId: string;
  contratoId: string;
  solicitadoPor?: string;
  fechaProgramada: string;
  direccionEntrega?: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'EN_PROCESO' | 'COMPLETADA' | 'RECHAZADA' | 'CANCELADA';
  comentarios?: string;
  createdAt: string;
  contrato?: Contract;
}

export interface SolicitudRetorno {
  id: string;
  codigo: string;
  empresaId: string;
  sucursalId: string;
  contratoId: string;
  solicitadoPor?: string;
  fechaProgramada: string;
  lugarRecoleccion?: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'EN_PROCESO' | 'COMPLETADA' | 'RECHAZADA' | 'CANCELADA';
  comentarios?: string;
  createdAt: string;
  contrato?: Contract;
}

export interface CreateDespachoPayload {
  contratoId: string;
  solicitudDespachoId?: string;
  operadorNombre?: string;
  vehiculoEnvio?: string;
  comentarios?: string;
  items: {
    equipoId: string;
    numeroSerie?: string;
    cantidad?: number;
    horometroInicial?: number;
    estadoSalida?: string;
    checklistOk?: boolean;
    observaciones?: string;
    inspeccionSalida?: {
      combustible?: string;
      aceiteOk?: boolean;
      llantasOk?: boolean;
      hidraulicoOk?: boolean;
      motorOk?: boolean;
      fugasDetectadas?: boolean;
      observaciones?: string;
    };
  }[];
}

export interface CreateRetornoPayload {
  contratoId: string;
  solicitudRetornoId?: string;
  recibidoPor: string;
  items: {
    equipoId: string;
    numeroSerie?: string;
    cantidadRetornada?: number;
    cantidadDañada?: number;
    cantidadPerdida?: number;
    horometroFinal?: number;
    daniosDetectados?: boolean;
    descripcionDanios?: string;
    danios?: {
      componente: string;
      tipoDano: string;
      severidad?: 'BAJA' | 'MEDIA' | 'ALTA' | 'PERDIDA_TOTAL';
      cobrable?: boolean;
      costoEstimado?: number;
      observaciones?: string;
    }[];
  }[];
}

export const getContracts = async (): Promise<Contract[]> => {
  const response = await api.get('/contracts');
  return extractArray<Contract>(response.data);
};

export const getContractById = async (id: string): Promise<Contract> => {
  const response = await api.get(`/contracts/${id}`);
  return extractObject<Contract>(response.data);
};

export const createContractFromQuotation = async (payload: CreateContractFromQuotationPayload): Promise<Contract> => {
  const response = await api.post('/contracts/from-quotation', payload);
  return extractObject<Contract>(response.data);
};

export const createDirectContract = async (payload: {
  clienteId: string;
  fechaInicio: string;
  fechaFin: string;
  depositoGarantia?: number;
  periodoDiasCorte?: number;
  condiciones?: string;
  items: {
    equipoId?: string;
    productoId?: string;
    descripcion?: string;
    cantidad?: number;
    dias?: number;
    precioRenta: number;
    horometroInicial?: number;
  }[];
}): Promise<Contract> => {
  const response = await api.post('/contracts/direct', payload);
  return extractObject<Contract>(response.data);
};

export const generateCortes = async (contratoId: string, periodoDias: number = 30): Promise<CorteFacturacion[]> => {
  const response = await api.post(`/contracts/${contratoId}/generate-cortes`, { periodoDias });
  return extractArray<CorteFacturacion>(response.data);
};

export const getCortes = async (contratoId: string): Promise<CorteFacturacion[]> => {
  const response = await api.get(`/contracts/${contratoId}/cortes`);
  return extractArray<CorteFacturacion>(response.data);
};

export const createManualCorte = async (contratoId: string, fechaCorte: string, monto?: number): Promise<CorteFacturacion> => {
  const response = await api.post(`/contracts/${contratoId}/manual-corte`, { fechaCorte, monto });
  return extractObject<CorteFacturacion>(response.data);
};

// --- SOLICITUDES OPERATIVAS ---

export const getSolicitudesDespacho = async (estado?: string): Promise<SolicitudDespacho[]> => {
  const response = await api.get('/operations/solicitudes-despacho', { params: { estado } });
  return extractArray<SolicitudDespacho>(response.data);
};

export const createSolicitudDespacho = async (payload: {
  contratoId: string;
  solicitadoPor?: string;
  fechaProgramada: string;
  direccionEntrega?: string;
  comentarios?: string;
}): Promise<SolicitudDespacho> => {
  const response = await api.post('/operations/solicitudes-despacho', payload);
  return extractObject<SolicitudDespacho>(response.data);
};

export const updateEstadoSolicitudDespacho = async (id: string, estado: string, comentarios?: string): Promise<SolicitudDespacho> => {
  const response = await api.patch(`/operations/solicitudes-despacho/${id}/status`, { estado, comentarios });
  return extractObject<SolicitudDespacho>(response.data);
};

export const getSolicitudesRetorno = async (estado?: string): Promise<SolicitudRetorno[]> => {
  const response = await api.get('/operations/solicitudes-retorno', { params: { estado } });
  return extractArray<SolicitudRetorno>(response.data);
};

export const createSolicitudRetorno = async (payload: {
  contratoId: string;
  solicitadoPor?: string;
  fechaProgramada: string;
  lugarRecoleccion?: string;
  comentarios?: string;
}): Promise<SolicitudRetorno> => {
  const response = await api.post('/operations/solicitudes-retorno', payload);
  return extractObject<SolicitudRetorno>(response.data);
};

export const updateEstadoSolicitudRetorno = async (id: string, estado: string, comentarios?: string): Promise<SolicitudRetorno> => {
  const response = await api.patch(`/operations/solicitudes-retorno/${id}/status`, { estado, comentarios });
  return extractObject<SolicitudRetorno>(response.data);
};

// --- EJECUCIÓN OPERATIVA ---

export const getDespachos = async (): Promise<any[]> => {
  const response = await api.get('/operations/despachos');
  return extractArray<any>(response.data);
};

export const createDespacho = async (payload: CreateDespachoPayload): Promise<any> => {
  const response = await api.post('/operations/despachos', payload);
  return extractObject<any>(response.data);
};

export const getRetornos = async (): Promise<any[]> => {
  const response = await api.get('/operations/retornos');
  return extractArray<any>(response.data);
};

export const createRetorno = async (payload: CreateRetornoPayload): Promise<any> => {
  const response = await api.post('/operations/retornos', payload);
  return extractObject<any>(response.data);
};
