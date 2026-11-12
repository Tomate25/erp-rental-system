export type CategoriaInsumo = string;

export const CATEGORIAS_SUGERIDAS = [
  'LUBRICANTES',
  'FILTROS',
  'DESGASTE',
  'FERRETERIA',
  'COMBUSTIBLE',
  'ELECTRICO',
  'LLANTAS',
  'MANGUERAS',
  'SEGURIDAD_EPP',
  'HERRAMIENTAS',
  'OTROS',
];

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
  destino?: string;
  referencia?: string;
}

export type TipoMovimientoInsumo = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface InsumoMovimiento {
  id: string;
  empresaId: string;
  insumoId: string;
  tipo: TipoMovimientoInsumo;
  cantidad: number | string;
  stockAnterior: number | string;
  stockNuevo: number | string;
  costoUnitario?: number | string | null;
  costoTotal?: number | string | null;
  motivo: string;
  destino?: string | null;
  referencia?: string | null;
  usuarioId?: string | null;
  createdAt: string;
  insumo?: {
    id: string;
    codigo?: string | null;
    nombre: string;
    unidadMedida: UnidadMedidaInsumo;
    categoria: CategoriaInsumo;
  };
  usuario?: {
    id: string;
    nombre: string;
    apellido: string;
  } | null;
}

export interface RegistrarMovimientoPayload {
  insumoId: string;
  tipo: TipoMovimientoInsumo;
  cantidad: number;
  motivo: string;
  destino?: string;
  referencia?: string;
  costoUnitario?: number;
}

export interface MovimientosListResponse {
  total: number;
  items: InsumoMovimiento[];
}
