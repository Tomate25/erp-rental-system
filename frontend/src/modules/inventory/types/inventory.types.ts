import type { EquipmentApiState } from '../constants/equipment-status';

export interface Subcategory {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion?: string | null;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string | null;
  isLineaAmarilla?: boolean;
  subcategorias?: Subcategory[];
}

export interface Brand {
  id: string;
  nombre: string;
}

export interface Product {
  id: string;
  empresaId: string;
  categoriaId: string;
  subcategoriaId?: string | null;
  marcaId: string;
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD';
  precioRentaDia: number;
  precioDiaB?: number | null;
  precioDiaC?: number | null;
  precioRentaHora?: number | null;
  precioHoraB?: number | null;
  precioHoraC?: number | null;
  minimoHoras?: number | null;
  modalidadRenta?: 'SOLO_DIA' | 'SOLO_HORA' | 'DIA_Y_HORA';
  tipoMedicionCombustible?: 'BARRAS' | 'PORCENTAJE' | 'PULGADAS' | null;
  tieneHorometro?: boolean;
  createdAt: string;
  updatedAt: string;
  categoria?: Category;
  subcategoria?: Subcategory | null;
  marca?: Brand;
  equipos?: Equipment[];
}

export interface Equipment {
  id: string;
  empresaId: string;
  sucursalId: string;
  productoId?: string | null;
  categoriaId: string;
  subcategoriaId?: string | null;
  marcaId: string;
  codigo?: string | null;
  modelo: string;
  numeroSerie?: string | null;
  descripcion?: string | null;
  /** Estados vigentes más los heredados (RENTADO, RETORNO, MANTENIMIENTO) que la API aún podría devolver. */
  estado: EquipmentApiState;
  tipoControl?: 'SERIALIZADO' | 'POR_CANTIDAD';
  cantidadTotal: number;
  cantidadDisponible: number;
  cantidadDisponiblePeriodo?: number;
  statusPeriodo?: 'DISPONIBLE' | 'OCUPADO' | 'PARCIAL' | 'MANTENIMIENTO';
  horometro: number;
  precioRentaDia: number;
  precioDiaB?: number | null;
  precioDiaC?: number | null;
  precioRentaHora?: number | null;
  precioHoraB?: number | null;
  precioHoraC?: number | null;
  minimoHoras?: number | null;
  modalidadRenta?: 'SOLO_DIA' | 'SOLO_HORA' | 'DIA_Y_HORA';
  tipoMedicionCombustible?: 'BARRAS' | 'PORCENTAJE' | 'PULGADAS' | null;
  isLineaAmarilla?: boolean;
  tieneHorometro?: boolean;
  costoAdquisicion?: number | null;
  fechaAdquisicion?: string | null;
  createdAt: string;
  updatedAt: string;
  producto?: Product | null;
  sucursal?: {
    id: string;
    nombre: string;
    codigo: string;
  };
  categoria?: {
    id: string;
    nombre: string;
    isLineaAmarilla?: boolean;
    subcategorias?: Subcategory[];
  };
  subcategoria?: Subcategory | null;
  marca?: {
    id: string;
    nombre: string;
  };
}
