import api from '../../../shared/services/api';
import type {
  Promocion,
  CreatePromocionPayload,
  UpdatePromocionPayload,
} from '../types/promotion.types';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getPromotions = async (params?: {
  activo?: boolean;
  search?: string;
}): Promise<Promocion[]> => {
  const response = await api.get('/promotions', { params });
  return extractArray<Promocion>(response.data);
};

export const getPromotionById = async (id: string): Promise<Promocion> => {
  const response = await api.get(`/promotions/${id}`);
  return extractObject<Promocion>(response.data);
};

export const createPromotion = async (
  data: CreatePromocionPayload,
): Promise<Promocion> => {
  const response = await api.post('/promotions', data);
  return extractObject<Promocion>(response.data);
};

export const updatePromotion = async (
  id: string,
  data: UpdatePromocionPayload,
): Promise<Promocion> => {
  const response = await api.put(`/promotions/${id}`, data);
  return extractObject<Promocion>(response.data);
};

export const deletePromotion = async (
  id: string,
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/promotions/${id}`);
  return response.data;
};
