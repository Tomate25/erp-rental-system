import api from '../../../shared/services/api';
import type { Cotizacion } from '../types/quotation.types';

export const getQuotations = async (): Promise<Cotizacion[]> => {
  const response = await api.get('/quotations');
  return response.data;
};

export const getQuotationById = async (id: string): Promise<Cotizacion> => {
  const response = await api.get(`/quotations/${id}`);
  return response.data;
};

export const createQuotation = async (data: Partial<Cotizacion>): Promise<Cotizacion> => {
  const response = await api.post('/quotations', data);
  return response.data;
};

export const updateQuotation = async (id: string, data: Partial<Cotizacion>): Promise<Cotizacion> => {
  const response = await api.patch(`/quotations/${id}`, data);
  return response.data;
};

export const createNewVersion = async (id: string): Promise<Cotizacion> => {
  const response = await api.post(`/quotations/${id}/version`);
  return response.data;
};

// For public request via portal (does not require auth token, assuming api interceptor handles public routes or we use axios directly)
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const submitPublicQuotation = async (data: Partial<Cotizacion>): Promise<Cotizacion> => {
  const response = await axios.post(`${API_URL}/quotations`, data);
  return response.data;
};

export const getPublicQuotation = async (token: string): Promise<Cotizacion> => {
  const response = await axios.get(`${API_URL}/quotations/public/${token}`);
  return response.data;
};
