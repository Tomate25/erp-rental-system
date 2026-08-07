export interface Category {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

export interface Brand {
  id: string;
  nombre: string;
}

export interface Equipment {
  id: string;
  empresaId: string;
  sucursalId: string;
  categoriaId: string;
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
  costoAdquisicion?: number | null;
  fechaAdquisicion?: string | null;
  createdAt: string;
  updatedAt: string;
  sucursal?: {
    id: string;
    nombre: string;
    codigo: string;
  };
  categoria?: {
    id: string;
    nombre: string;
  };
  marca?: {
    id: string;
    nombre: string;
  };
}
