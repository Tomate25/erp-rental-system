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
  precioRentaHora?: number | null;
  minimoHoras?: number | null;
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
  estado: 'DISPONIBLE' | 'RESERVADO' | 'RENTADO' | 'RETORNO' | 'MANTENIMIENTO' | 'BAJA';
  cantidadTotal: number;
  cantidadDisponible: number;
  horometro: number;
  precioRentaDia: number;
  precioRentaHora?: number | null;
  minimoHoras?: number | null;
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
    subcategorias?: Subcategory[];
  };
  subcategoria?: Subcategory | null;
  marca?: {
    id: string;
    nombre: string;
  };
}
