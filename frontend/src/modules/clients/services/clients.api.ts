import api from '../../../shared/services/api';
import type { Client } from '../types/client.types';
import type { ClientFormValues } from '../validators/client.validator';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const getClients = async (): Promise<Client[]> => {
  const response = await api.get<ApiResponse<Client[]>>('/clients');
  return response.data.data;
};

export const getClientById = async (id: string): Promise<Client> => {
  const response = await api.get<ApiResponse<Client>>(`/clients/${id}`);
  return response.data.data;
};

export const createClient = async (data: ClientFormValues): Promise<Client> => {
  const response = await api.post<ApiResponse<Client>>('/clients', data);
  return response.data.data;
};

export const updateClient = async (id: string, data: Partial<ClientFormValues>): Promise<Client> => {
  const response = await api.put<ApiResponse<Client>>(`/clients/${id}`, data);
  return response.data.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await api.delete<ApiResponse<any>>(`/clients/${id}`);
};
