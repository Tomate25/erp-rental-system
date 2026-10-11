import api from '../../../shared/services/api';
import {
  InventorySummarySchema,
  GroupedInventoryResponseSchema,
  ProductUnitsResponseSchema,
  UnitDetailSchema,
  type InventorySummary,
  type GroupedInventoryResponse,
  type ProductUnitsResponse,
  type UnitDetail,
} from '../types/grouped-inventory.types';

export interface GroupedQueryParams {
  tab?: 'todo' | 'amarilla' | 'equipo';
  familia?: string;
  estado?: string;
  marca?: string;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: 'nombre' | 'total' | 'ocupacion';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Obtiene el resumen consolidado de inventario y ocupación general.
 */
export async function getInventorySummary(): Promise<InventorySummary> {
  const response = await api.get('/inventory/summary');
  return InventorySummarySchema.parse(response.data);
}

/**
 * Consulta la lista paginada y filtrada de productos agrupados con desglose por estado.
 */
export async function getGroupedInventory(
  params: GroupedQueryParams = {}
): Promise<GroupedInventoryResponse> {
  const response = await api.get('/inventory/grouped', {
    params: {
      tab: params.tab,
      familia: params.familia || undefined,
      estado: params.estado || undefined,
      marca: params.marca || undefined,
      q: params.q || undefined,
      page: params.page || 1,
      limit: params.limit || 20,
      sortBy: params.sortBy || 'total',
      sortOrder: params.sortOrder || 'desc',
    },
  });
  return GroupedInventoryResponseSchema.parse(response.data);
}

/**
 * Consulta las unidades serializadas o el desglose por lote/cliente de un producto específico.
 */
export async function getProductUnits(productoId: string): Promise<ProductUnitsResponse> {
  const response = await api.get(`/inventory/grouped/${encodeURIComponent(productoId)}/units`);
  return ProductUnitsResponseSchema.parse(response.data);
}

/**
 * Consulta el detalle completo de una unidad individual para el drawer lateral.
 */
export async function getUnitDetail(unitId: string): Promise<UnitDetail> {
  const response = await api.get(`/inventory/units/${encodeURIComponent(unitId)}/detail`);
  return UnitDetailSchema.parse(response.data);
}
