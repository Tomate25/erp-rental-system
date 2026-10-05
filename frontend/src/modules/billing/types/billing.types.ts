import type { Client } from '../../clients/types/client.types';

export type EstadoFactura = 'PENDIENTE' | 'PAGADA_PARCIAL' | 'PAGADA' | 'VENCIDA' | 'CANCELADA';
export type TipoFactura = 'ESTANDAR' | 'ANTICIPO' | 'RECTIFICATIVA' | 'CARGO_DANOS';
export type CondicionPagoFactura = 'CONTADO' | 'CREDITO';

export interface GastoReparacion {
  cobrableCliente?: boolean;
  tipo: 'REPUESTO' | 'MANO_OBRA' | 'TERCERO';
  descripcion: string;
  monto: number;
  comprobanteUrl?: string | null;
}

export interface ReparacionRetorno {
  id: string;
  estado: 'PROGRAMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
  cobrableCliente: boolean;
  costo: number;
  descripcion: string;
  gastos?: GastoReparacion[] | null;
}

export interface RetornoConDanos {
  id: string;
  fechaDevolucion: string;
  contrato: { id: string; codigo: string; cliente: { nombre: string } };
  facturaCargo?: { id: string; folio: string; total: number } | null;
  items: Array<{
    id: string;
    equipoId: string;
    equipo: { modelo: string; codigo: string };
    descripcionDanios?: string | null;
    inspeccionesDanio: Array<{ id: string; componente: string; tipoDano: string; cobrable: boolean; observaciones?: string | null }>;
    reparaciones: ReparacionRetorno[];
  }>;
}

export interface CorteFacturacionResumen {
  id: string;
  contratoId: string;
  numeroCorte: number;
  fechaInicio: string;
  fechaFin: string;
  fechaDisponible: string;
  monto: number;
  detalleProyectado?: Array<{ equipoId: string; descripcion: string; cantidad: number; unidad: 'DIA' | 'HORA'; unidades: number; tarifa: number; importe: number }>;
  estado: 'PENDIENTE' | 'FACTURADO';
  disponibleParaFacturar: boolean;
  motivoBloqueo: string | null;
  factura: { id: string; folio: string; estado: EstadoFactura } | null;
  contrato: { id: string; codigo: string; cliente: { id: string; nombre: string } };
}

export type MetodoPago = 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA' | 'TARJETA';

/** Cuerpo de POST /billing/invoices/:id/payment (`RegisterPaymentDto`): el backend rechaza propiedades que no estén aquí. */
export interface RegisterPaymentPayload {
  monto: number;
  metodo?: MetodoPago;
  referencia?: string;
  banco?: string;
  comprobanteUrl?: string;
}

/**
 * Cuerpo de POST /billing/invoice-quote/:id y /billing/invoice-corte/:corteId (`CreateInvoiceDto`).
 * Todo es opcional y el backend rechaza propiedades que no estén aquí (400, `forbidNonWhitelisted`).
 */
export interface CreateInvoicePayload {
  sucursalId?: string;
  tipoFactura?: TipoFactura;
  condicionPago?: CondicionPagoFactura;
  plazoCreditoDias?: number;
  retencionIva?: number;
  estado?: 'PENDIENTE' | 'PAGADA';
}

export interface FacturaPago {
  id: string;
  monto: number;
  metodo: MetodoPago;
  referencia?: string;
  banco?: string | null;
  fechaPago: string;
}

export interface EmpresaFactura {
  nombre: string;
  rfc: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface ItemFactura {
  id: string;
  descripcion: string;
  cantidad: number;
  dias?: number | null;
  horas?: number | null;
  tipoCobro?: 'POR_DIA' | 'POR_HORA';
  precioUnitario: number;
  descuento: number;
  subtotal: number;
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
  totalPagado?: number;
  saldoPendiente?: number;
  pagos?: FacturaPago[];
  pdfUrl?: string;
  xmlUrl?: string;

  cliente?: Client;
  empresa?: EmpresaFactura;
  contrato?: any;
  cotizacion?: { numeroCotizacion: string; items?: ItemFactura[] } | null;
  corte?: { numeroCorte: number; fechaInicio: string; fechaFin: string; monto: number } | null;
  devolucionId?: string | null;
  detalleCargo?: Array<GastoReparacion & { equipo: string; mantenimientoId: string }> | null;
  detalleCorte?: Array<{ equipoId: string; descripcion: string; cantidad: number; unidad: 'DIA' | 'HORA'; unidades: number; tarifa: number; importe: number }> | null;
}
