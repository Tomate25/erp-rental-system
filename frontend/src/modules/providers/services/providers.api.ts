import api from '../../../shared/services/api';
import type {
  Provider,
  CreateProviderPayload,
  UpdateProviderPayload,
  TipoProveedor,
} from '../types/provider.types';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getProviders = async (params?: {
  tipo?: TipoProveedor;
  activo?: boolean;
  search?: string;
}): Promise<Provider[]> => {
  const response = await api.get('/providers', { params });
  return extractArray<Provider>(response.data);
};

export const getProviderById = async (id: string): Promise<Provider> => {
  const response = await api.get(`/providers/${id}`);
  return extractObject<Provider>(response.data);
};

export const createProvider = async (data: CreateProviderPayload): Promise<Provider> => {
  const response = await api.post('/providers', data);
  return extractObject<Provider>(response.data);
};

export const updateProvider = async (
  id: string,
  data: UpdateProviderPayload,
): Promise<Provider> => {
  const response = await api.put(`/providers/${id}`, data);
  return extractObject<Provider>(response.data);
};

export const deleteProvider = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/providers/${id}`);
  return response.data;
};
