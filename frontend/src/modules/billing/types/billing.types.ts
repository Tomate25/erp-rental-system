import type { Client } from '../../clients/types/client.types';

export type EstadoFactura = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'CANCELADA';
export type TipoFactura = 'ESTANDAR' | 'ANTICIPO' | 'RECTIFICATIVA' | 'CARGO_DANOS';
export type CondicionPagoFactura = 'CONTADO' | 'CREDITO';

export interface Factura {
  id: string;
  clienteId: string;
  contratoId: string;
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
  pdfUrl?: string;
  xmlUrl?: string;

  cliente?: Client;
  contrato?: any;
}
