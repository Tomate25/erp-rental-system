export interface PromocionItem {
  id?: string;
  promocionId?: string;
  productoId?: string;
  equipoId?: string;
  producto?: {
    id: string;
    nombre: string;
    codigo?: string | null;
    precioRentaDia: number | string;
    categoria?: {
      nombre: string;
    } | null;
  } | null;
  equipo?: {
    id: string;
    descripcion?: string | null;
    codigo?: string | null;
    modelo?: string | null;
    precioRentaDia: number | string;
    categoria?: {
      nombre: string;
    } | null;
  } | null;
  cantidad: number;
  precioUnitarioSugerido?: number | string | null;
  notas?: string | null;
}

export interface Promocion {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  precioCombo: number | string;
  tipoCobro: 'POR_DIA' | 'POR_HORA';
  diasMinimos: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  items: PromocionItem[];
  cotizaciones?: Array<{
    id: string;
    numeroCotizacion: string;
    fechaEmision: string;
    total: number | string;
    estado: string;
    cliente?: {
      nombre: string;
    } | null;
  }>;
}

export interface CreatePromocionPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioCombo: number;
  tipoCobro?: 'POR_DIA' | 'POR_HORA';
  diasMinimos?: number;
  fechaInicio?: string;
  fechaFin?: string;
  activo?: boolean;
  items?: Array<{
    productoId?: string;
    equipoId?: string;
    cantidad: number;
    precioUnitarioSugerido?: number;
    notas?: string;
  }>;
}

export type UpdatePromocionPayload = Partial<CreatePromocionPayload>;
