import api from '../../../shared/services/api';
import type {
  AuditoriaRecord,
  PaginatedAuditoriaResponse,
  AuditoriaQueryParams,
} from '../types/auditoria.types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface UserSummary {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

/**
 * Consulta la bitácora de auditoría forense con paginación y filtros.
 * Exclusivo para usuarios con rol ADMIN.
 */
export const getAuditoria = async (
  params?: AuditoriaQueryParams
): Promise<PaginatedAuditoriaResponse> => {
  // Limpiar parámetros vacíos o indefinidos
  const cleanParams: Record<string, string | number> = {};
  if (params) {
    if (params.page !== undefined) cleanParams.page = params.page;
    if (params.limit !== undefined) cleanParams.limit = params.limit;
    if (params.fechaInicio) cleanParams.fechaInicio = params.fechaInicio;
    if (params.fechaFin) cleanParams.fechaFin = params.fechaFin;
    if (params.accion) cleanParams.accion = params.accion;
    if (params.entidadTipo) cleanParams.entidadTipo = params.entidadTipo;
    if (params.modulo) cleanParams.modulo = params.modulo;
    if (params.tipoEvento && params.tipoEvento !== 'TODOS') cleanParams.tipoEvento = params.tipoEvento;
    if (params.entidadId) cleanParams.entidadId = params.entidadId;
    if (params.usuarioId) cleanParams.usuarioId = params.usuarioId;
    if (params.requestId) cleanParams.requestId = params.requestId;
  }

  const response = await api.get<ApiResponse<PaginatedAuditoriaResponse>>('/auditoria', {
    params: cleanParams,
  });
  return response.data.data;
};

/**
 * Obtiene un evento de auditoría puntual por ID.
 */
export const getAuditoriaById = async (id: string): Promise<AuditoriaRecord> => {
  const response = await api.get<ApiResponse<AuditoriaRecord>>(`/auditoria/${id}`);
  return response.data.data;
};

/**
 * Obtiene lista básica de usuarios para el filtro de auditoría.
 */
export const getAuditoriaUsers = async (): Promise<UserSummary[]> => {
  try {
    const response = await api.get<ApiResponse<UserSummary[]>>('/users');
    return response.data.data || [];
  } catch {
    return [];
  }
};
