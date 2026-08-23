import api from '../../../shared/services/api';
import type { Cotizacion } from '../types/quotation.types';
import axios from 'axios';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getQuotations = async (): Promise<Cotizacion[]> => {
  const response = await api.get('/quotations');
  return extractArray<Cotizacion>(response.data);
};

export const getQuotationById = async (id: string): Promise<Cotizacion> => {
  const response = await api.get(`/quotations/${id}`);
  return extractObject<Cotizacion>(response.data);
};

export const createQuotation = async (data: Partial<Cotizacion>): Promise<Cotizacion> => {
  const response = await api.post('/quotations', data);
  return extractObject<Cotizacion>(response.data);
};

export const updateQuotation = async (id: string, data: Partial<Cotizacion>): Promise<Cotizacion> => {
  const response = await api.patch(`/quotations/${id}`, data);
  return extractObject<Cotizacion>(response.data);
};

export const createNewVersion = async (id: string): Promise<Cotizacion> => {
  const response = await api.post(`/quotations/${id}/version`);
  return extractObject<Cotizacion>(response.data);
};

export const getQuotationVersions = async (numeroCotizacion: string): Promise<Cotizacion[]> => {
  const response = await api.get(`/quotations/number/${numeroCotizacion}`);
  return extractArray<Cotizacion>(response.data);
};

// For public request via portal (does not require auth token)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const submitPublicQuotation = async (data: Partial<Cotizacion>): Promise<Cotizacion> => {
  const response = await axios.post(`${API_URL}/quotations/public-request`, data);
  return extractObject<Cotizacion>(response.data);
};

export const getPublicQuotation = async (token: string): Promise<Cotizacion> => {
  const response = await axios.get(`${API_URL}/quotations/public/${token}`);
  return extractObject<Cotizacion>(response.data);
};
