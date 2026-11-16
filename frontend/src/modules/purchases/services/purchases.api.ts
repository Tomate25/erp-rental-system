import api from '../../../shared/services/api';
import type {
  CompraInsumo,
  CreateCompraInsumoPayload,
  CreateSubarriendoPayload,
  DevolverSubarriendoPayload,
  EquipoExternoInventario,
  RegistrarPagoCompraPayload,
  ResumenCompras,
  SubarriendoProveedor,
} from '../types/purchases.types';

export async function getResumenCompras(): Promise<ResumenCompras> {
  const { data } = await api.get('/purchases/resumen');
  return data.data;
}

export async function getComprasInsumos(params?: {
  estado?: string;
  estadoPago?: string;
  proveedorId?: string;
  search?: string;
}): Promise<CompraInsumo[]> {
  const { data } = await api.get('/purchases/insumos', { params });
  return data.data || [];
}

export async function createCompraInsumo(
  payload: CreateCompraInsumoPayload,
): Promise<CompraInsumo> {
  const { data } = await api.post('/purchases/insumos', payload);
  return data.data;
}

export async function recibirCompraInsumo(id: string): Promise<CompraInsumo> {
  const { data } = await api.patch(`/purchases/insumos/${id}/recibir`);
  return data.data;
}

export async function anularCompraInsumo(id: string): Promise<CompraInsumo> {
  const { data } = await api.patch(`/purchases/insumos/${id}/anular`);
  return data.data;
}

export async function registrarPagoCompraInsumo(
  id: string,
  payload: RegistrarPagoCompraPayload,
): Promise<CompraInsumo> {
  const { data } = await api.post(`/purchases/insumos/${id}/pagos`, payload);
  return data.data;
}

export async function getMaquinariaExterna(params?: {
  estado?: string;
  proveedorId?: string;
  search?: string;
}): Promise<{
  equiposExternos: EquipoExternoInventario[];
  equiposInventario: EquipoExternoInventario[];
  subarriendos: SubarriendoProveedor[];
}> {
  const { data } = await api.get('/purchases/maquinaria-externa', { params });
  return (
    data.data || {
      equiposExternos: [],
      equiposInventario: [],
      subarriendos: [],
    }
  );
}

export async function createSubarriendo(
  payload: CreateSubarriendoPayload,
): Promise<SubarriendoProveedor> {
  const { data } = await api.post('/purchases/subarriendos', payload);
  return data.data;
}

export async function devolverSubarriendo(
  id: string,
  payload: DevolverSubarriendoPayload,
): Promise<SubarriendoProveedor> {
  const { data } = await api.patch(`/purchases/subarriendos/${id}/devolver`, payload);
  return data.data;
}

export async function registrarPagoSubarriendo(
  id: string,
  payload: RegistrarPagoCompraPayload,
): Promise<SubarriendoProveedor> {
  const { data } = await api.post(`/purchases/subarriendos/${id}/pagos`, payload);
  return data.data;
}
