import api from '../../../shared/services/api';
import type { Maintenance } from '../types/maintenance.types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const getMaintenances = async (estado?: string, equipoId?: string): Promise<Maintenance[]> => {
  const params: any = {};
  if (estado) params.estado = estado;
  if (equipoId) params.equipoId = equipoId;

  const response = await api.get<ApiResponse<Maintenance[]>>('/maintenance', { params });
  return response.data.data;
};

export const getMaintenanceById = async (id: string): Promise<Maintenance> => {
  const response = await api.get<ApiResponse<Maintenance>>(`/maintenance/${id}`);
  return response.data.data;
};

export const createMaintenance = async (data: Partial<Maintenance>): Promise<Maintenance> => {
  const response = await api.post<ApiResponse<Maintenance>>('/maintenance', data);
  return response.data.data;
};

export const updateMaintenance = async (id: string, data: Partial<Maintenance>): Promise<Maintenance> => {
  const response = await api.put<ApiResponse<Maintenance>>(`/maintenance/${id}`, data);
  return response.data.data;
};

export const deleteMaintenance = async (id: string): Promise<void> => {
  await api.delete(`/maintenance/${id}`);
};
