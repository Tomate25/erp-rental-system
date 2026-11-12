export type CategoriaInsumo =
  | 'LUBRICANTES'
  | 'FILTROS'
  | 'DESGASTE'
  | 'FERRETERIA'
  | 'COMBUSTIBLE'
  | 'OTROS';

export type UnidadMedidaInsumo =
  | 'GALON'
  | 'LITRO'
  | 'PIEZA'
  | 'UNIDAD'
  | 'PAR'
  | 'KG'
  | 'METRO';

export interface Insumo {
  id: string;
  empresaId: string;
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  categoria: CategoriaInsumo;
  unidadMedida: UnidadMedidaInsumo;
  stockActual: number | string;
  stockMinimo: number | string;
  costoUnitario: number | string;
  costoIncluyeIva: boolean;
  aplicaIva: boolean;
  precioVenta?: number | string | null;
  proveedorId?: string | null;
  proveedor?: {
    id: string;
    nombre: string;
    telefono?: string | null;
  } | null;
  activo: boolean;
  _count?: {
    consumos: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInsumoPayload {
  nombre: string;
  codigo?: string;
  descripcion?: string;
  categoria?: CategoriaInsumo;
  unidadMedida?: UnidadMedidaInsumo;
  stockActual?: number;
  stockMinimo?: number;
  costoUnitario?: number;
  costoIncluyeIva?: boolean;
  aplicaIva?: boolean;
  precioVenta?: number | null;
  proveedorId?: string | null;
  activo?: boolean;
}

export type UpdateInsumoPayload = Partial<CreateInsumoPayload>;

export interface AjustarStockPayload {
  cantidad: number;
  tipoAjuste: 'ENTRADA' | 'SALIDA' | 'AJUSTE_DIRECTO';
  motivo: string;
  costoUnitario?: number;
}
