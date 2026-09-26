export interface AuditoriaRecord {
  id: string;
  empresaId: string;
  usuarioId: string | null;
  accion: string;
  entidadTipo: string;
  entidadId: string;
  detalles: any;
  ipDireccion: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
}

export interface PaginatedAuditoriaResponse {
  data: AuditoriaRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditoriaQueryParams {
  page?: number;
  limit?: number;
  fechaInicio?: string;
  fechaFin?: string;
  accion?: string;
  entidadTipo?: string;
  modulo?: string;
  entidadId?: string;
  usuarioId?: string;
  requestId?: string;
  tipoEvento?: 'TODOS' | 'NEGOCIO' | 'HTTP';
}

export interface HttpTraceDetails {
  modulo?: string;
  ruta?: string;
  metodo?: string;
  codigoHttp?: number;
  resultado?: 'EXITO' | 'ERROR' | string;
  duracionMs?: number;
  [key: string]: any;
}
