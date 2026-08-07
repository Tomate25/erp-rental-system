import api from '../../../shared/services/api';
import type { Reserva } from '../types/availability.types';

export const getReservations = async (start?: string, end?: string): Promise<Reserva[]> => {
  const params: any = {};
  if (start) params.start = start;
  if (end) params.end = end;
  const response = await api.get('/availability/reservations', { params });
  return response.data.data;
};
