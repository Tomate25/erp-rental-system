import api from '../../../shared/services/api';

export interface LecturaHorometro {
  id: string;
  equipoId: string;
  horometroAnterior: number;
  horometroNuevo: number;
  horasTrabajadas: number;
  origen: 'DESPACHO' | 'RETORNO' | 'INSPECCION_CAMPO' | 'MANTENIMIENTO' | 'AJUSTE_MANUAL';
  registradoPor?: string | null;
  observaciones?: string | null;
  createdAt: string;
  equipo?: {
    id: string;
    modelo: string;
    numeroSerie?: string | null;
    codigo?: string | null;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const getLecturasHorometro = async (equipoId?: string): Promise<LecturaHorometro[]> => {
  const params: any = {};
  if (equipoId) params.equipoId = equipoId;

  const response = await api.get<ApiResponse<LecturaHorometro[]>>('/horometros', { params });
  return response.data.data;
};

export const createLecturaHorometro = async (data: {
  equipoId: string;
  horometroNuevo: number;
  origen?: string;
  observaciones?: string;
}): Promise<LecturaHorometro> => {
  const response = await api.post<ApiResponse<LecturaHorometro>>('/horometros', data);
  return response.data.data;
};
