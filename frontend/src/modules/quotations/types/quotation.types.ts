import type { Client } from '../../clients/types/client.types';
import type { Equipment } from '../../inventory/types/inventory.types';

export type EstadoCotizacion = 
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'ENVIADA'
  | 'VISTA'
  | 'EN_REVISION'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'VENCIDA'
  | 'CANCELADA';

export const EstadoCotizacionValues: Record<EstadoCotizacion, EstadoCotizacion> = {
  BORRADOR: 'BORRADOR',
  PENDIENTE: 'PENDIENTE',
  ENVIADA: 'ENVIADA',
  VISTA: 'VISTA',
  EN_REVISION: 'EN_REVISION',
  ACEPTADA: 'ACEPTADA',
  RECHAZADA: 'RECHAZADA',
  VENCIDA: 'VENCIDA',
  CANCELADA: 'CANCELADA'
};

export interface DetalleCotizacion {
  id?: string;
  cotizacionId?: string;
  equipoId?: string | null;
  equipo?: Equipment | null;
  descripcion: string;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  version: number;
  clienteId: string;
  cliente?: Client;
  proyecto?: string | null;
  atencion?: string | null;
  telefono?: string | null;
  email?: string | null;
  referencia?: string | null;
  asesorId?: string | null;
  asesor?: { nombre: string; apellido: string; email: string };
  estado: EstadoCotizacion;
  fechaEmision: string;
  fechaVence: string;
  validezDias: number;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  depositoGarantia?: number;
  condiciones?: string | null;
  tokenPublico: string;
  createdAt: string;
  updatedAt: string;
  
  items?: DetalleCotizacion[];
}
