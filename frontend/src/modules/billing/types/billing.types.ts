import type { Client } from '../../clients/types/client.types';

export type EstadoFactura = 'PENDIENTE' | 'PAGADA_PARCIAL' | 'PAGADA' | 'VENCIDA' | 'CANCELADA';
export type TipoFactura = 'ESTANDAR' | 'ANTICIPO' | 'RECTIFICATIVA' | 'CARGO_DANOS';
export type CondicionPagoFactura = 'CONTADO' | 'CREDITO';

export interface FacturaPago {
  id: string;
  monto: number;
  metodoPago?: string;
  referencia?: string;
  notas?: string;
  fechaPago: string;
}

export interface Factura {
  id: string;
  clienteId: string;
  contratoId?: string;
  cotizacionId?: string;
  corteId?: string;
  folio: string;
  fechaEmision: string;
  fechaVence: string;
  estado: EstadoFactura;
  tipoFactura: TipoFactura;
  condicionPago: CondicionPagoFactura;
  plazoCreditoDias?: number;
  corteNumero?: number;
  subtotal: number;
  descuentoGlobal: number;
  retencionIva: number;
  iva: number;
  total: number;
  montoPagado?: number;
  saldoPendiente?: number;
  pagos?: FacturaPago[];
  pdfUrl?: string;
  xmlUrl?: string;

  cliente?: Client;
  contrato?: any;
  cotizacion?: any;
  corte?: any;
}
