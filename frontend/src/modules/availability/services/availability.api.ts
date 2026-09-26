import api from '../../../shared/services/api';
import type { Reserva, EquipmentPeriodStatus } from '../types/availability.types';

export const getReservations = async (start?: string, end?: string): Promise<Reserva[]> => {
  const params: any = {};
  if (start) params.start = start;
  if (end) params.end = end;
  const response = await api.get('/availability/reservations', { params });
  return response.data.data;
};

export const getEquipmentPeriodAvailability = async (
  start: string,
  end: string,
  categoriaId?: string,
): Promise<EquipmentPeriodStatus[]> => {
  const params: any = { start, end };
  if (categoriaId && categoriaId !== 'ALL') params.categoriaId = categoriaId;
  const response = await api.get('/availability/equipment-status', { params });
  return response.data.data;
};
