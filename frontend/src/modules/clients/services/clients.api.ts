import api from '../../../shared/services/api';
import type { Client } from '../types/client.types';
import type { ClientFormValues } from '../validators/client.validator';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getClients = async (): Promise<Client[]> => {
  const response = await api.get('/clients');
  return extractArray<Client>(response.data);
};

export const getClientById = async (id: string): Promise<Client> => {
  const response = await api.get(`/clients/${id}`);
  return extractObject<Client>(response.data);
};

export const createClient = async (data: ClientFormValues): Promise<Client> => {
  const response = await api.post('/clients', data);
  return extractObject<Client>(response.data);
};

export const updateClient = async (id: string, data: Partial<ClientFormValues>): Promise<Client> => {
  const response = await api.put(`/clients/${id}`, data);
  return extractObject<Client>(response.data);
};

export const deleteClient = async (id: string): Promise<void> => {
  await api.delete(`/clients/${id}`);
};
