import api from '../../../shared/services/api';
import type {
  Insumo,
  CreateInsumoPayload,
  UpdateInsumoPayload,
  AjustarStockPayload,
  CategoriaInsumo,
} from '../types/insumo.types';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getInsumos = async (params?: {
  categoria?: CategoriaInsumo;
  activo?: boolean;
  search?: string;
  bajoStock?: boolean;
}): Promise<Insumo[]> => {
  const response = await api.get('/insumos', { params });
  return extractArray<Insumo>(response.data);
};

export const getInsumoById = async (id: string): Promise<Insumo> => {
  const response = await api.get(`/insumos/${id}`);
  return extractObject<Insumo>(response.data);
};

export const createInsumo = async (data: CreateInsumoPayload): Promise<Insumo> => {
  const response = await api.post('/insumos', data);
  return extractObject<Insumo>(response.data);
};

export const updateInsumo = async (
  id: string,
  data: UpdateInsumoPayload,
): Promise<Insumo> => {
  const response = await api.put(`/insumos/${id}`, data);
  return extractObject<Insumo>(response.data);
};

export const ajustarStockInsumo = async (
  id: string,
  data: AjustarStockPayload,
): Promise<Insumo> => {
  const response = await api.patch(`/insumos/${id}/ajustar-stock`, data);
  return extractObject<Insumo>(response.data);
};

export const deleteInsumo = async (
  id: string,
): Promise<{ success: boolean; message: string; eliminado?: boolean; activo?: boolean }> => {
  const response = await api.delete(`/insumos/${id}`);
  return response.data;
};
