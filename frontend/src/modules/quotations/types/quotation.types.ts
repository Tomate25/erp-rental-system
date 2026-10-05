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
  | 'CANCELADA'
  | 'CONVERTIDA_A_CONTRATO'
  | 'FACTURADA';

export const EstadoCotizacionValues: Record<EstadoCotizacion, EstadoCotizacion> = {
  BORRADOR: 'BORRADOR',
  PENDIENTE: 'PENDIENTE',
  ENVIADA: 'ENVIADA',
  VISTA: 'VISTA',
  EN_REVISION: 'EN_REVISION',
  ACEPTADA: 'ACEPTADA',
  RECHAZADA: 'RECHAZADA',
  VENCIDA: 'VENCIDA',
  CANCELADA: 'CANCELADA',
  CONVERTIDA_A_CONTRATO: 'CONVERTIDA_A_CONTRATO',
  FACTURADA: 'FACTURADA'
};

export interface DetalleCotizacion {
  id?: string;
  cotizacionId?: string;
  equipoId?: string | null;
  equipo?: Equipment | null;
  descripcion: string;
  tipoCobro?: 'POR_DIA' | 'POR_HORA';
  tipoTarifa?: 'DIA' | 'HORA';
  cantidad: number;
  dias: number;
  horas?: number;
  precioUnitario: number;
  descuento: number;
  tipoDescuento?: 'MONTO' | 'PORCENTAJE';
  descuentoInput?: string | number;
  /** Largo original de la descripción del catálogo cuando se recortó a 200; solo para avisar en la línea (no se envía). */
  descripcionRecortada?: number;
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
  asesor?: { id?: string; nombre: string; apellido: string; email: string };
  estado: EstadoCotizacion;
  fechaEmision: string;
  fechaVence: string;
  validezDias: number;
  fechaInicioRenta?: string | null;
  fechaFinRenta?: string | null;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  depositoGarantia?: number;
  condiciones?: string | null;
  notasRevision?: string | null;
  motivoRechazo?: string | null;
  fechaEnvio?: string | null;
  fechaVista?: string | null;
  fechaAceptacion?: string | null;
  tokenPublico: string;
  createdAt: string;
  updatedAt: string;
  
  items?: DetalleCotizacion[];
  contratos?: Array<{ id: string; numeroContrato?: string; codigo?: string; estado: string }>;
  empresa?: { id: string; nombre: string; razonSocial?: string; ruc?: string; email?: string; telefono?: string; direccion?: string; logoUrl?: string };
}
