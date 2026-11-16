export type EstadoCompraInsumo = 'BORRADOR' | 'RECIBIDA' | 'ANULADA';
export type EstadoPagoCompra = 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
export type ModalidadSubarriendoProveedor = 'POR_DIA' | 'POR_HORA' | 'POR_MES' | 'MONTO_FIJO';
export type EstadoSubarriendoProveedor = 'ACTIVO' | 'DEVUELTO' | 'CANCELADO';

export interface ResumenCompras {
  totalComprasInsumos: number;
  totalCompradoInsumos: number;
  saldoPendienteCompras: number;
  equiposExternosInventario: number;
  subarriendosActivos: number;
  subarriendosPorVencer: number;
  saldoPendienteSubarriendos: number;
  cxpTotalProveedoresCompras: number;
}

export interface PagoCompraItem {
  id: string;
  fechaPago: string;
  monto: number;
  metodoPago: string;
  cuentaPagoCodigo: string;
  referencia?: string | null;
  observaciones?: string | null;
}

export interface CompraInsumoItemRow {
  id: string;
  insumoId: string;
  cantidad: number;
  costoUnitario: number;
  incluyeIva: boolean;
  ivaMonto: number;
  subtotal: number;
  total: number;
  insumo?: {
    id: string;
    codigo?: string | null;
    nombre: string;
    unidadMedida: string;
    categoria: string;
  };
}

export interface CompraInsumo {
  id: string;
  codigo: string;
  proveedorId?: string | null;
  proveedorNombre: string;
  numeroFactura?: string | null;
  fechaCompra: string;
  condicionPago: 'CONTADO' | 'CREDITO';
  plazoCreditoDias: number;
  fechaVencimiento?: string | null;
  metodoPago: string;
  cuentaPagoCodigo?: string | null;
  aplicaIva: boolean;
  subtotal: number;
  ivaTotal: number;
  total: number;
  estado: EstadoCompraInsumo;
  estadoPago: EstadoPagoCompra;
  montoPagado: number;
  notas?: string | null;
  proveedor?: { id: string; nombre: string; telefono?: string | null } | null;
  items: CompraInsumoItemRow[];
  pagos?: PagoCompraItem[];
}

export interface SubarriendoProveedor {
  id: string;
  codigo: string;
  equipoId: string;
  proveedorId?: string | null;
  proveedorNombre: string;
  modalidad: ModalidadSubarriendoProveedor;
  tarifaProveedor: number;
  cantidadUnidades: number;
  fechaInicio: string;
  fechaFinEstimada: string;
  fechaDevolucionReal?: string | null;
  duracionEstimadaValor: number;
  montoEstimado: number;
  montoFinal?: number | null;
  montoPagado: number;
  estado: EstadoSubarriendoProveedor;
  estadoPago: EstadoPagoCompra;
  referenciaDocumento?: string | null;
  observaciones?: string | null;
  diasRestantes?: number | null;
  vencido?: boolean;
  porVencer?: boolean;
  equipo?: {
    id: string;
    codigo?: string | null;
    modelo: string;
    numeroSerie?: string | null;
    estado: string;
    disponibleParaRenta: boolean;
    sucursal?: { id: string; nombre: string } | null;
    categoria?: { nombre: string } | null;
  };
  proveedor?: { id: string; nombre: string; telefono?: string | null } | null;
  pagos?: PagoCompraItem[];
}

export interface EquipoExternoInventario {
  id: string;
  codigo?: string | null;
  modelo: string;
  numeroSerie?: string | null;
  estado: string;
  origenEquipo: 'PROPIO' | 'PROVEEDOR';
  proveedorId?: string | null;
  proveedorNombre?: string | null;
  precioProveedor?: number | null;
  disponibleParaRenta: boolean;
  categoria?: { id: string; nombre: string } | null;
  marca?: { id: string; nombre: string } | null;
  sucursal?: { id: string; nombre: string } | null;
  proveedor?: { id: string; nombre: string; telefono?: string | null } | null;
  subarriendos?: SubarriendoProveedor[];
  detallesContrato?: Array<{
    id: string;
    cantidad: number;
    contrato: {
      id: string;
      codigo: string;
      fechaInicio: string;
      fechaFin: string;
      cliente: { nombre: string };
    };
  }>;
}

export interface CreateCompraInsumoPayload {
  proveedorId?: string;
  proveedorNombre?: string;
  numeroFactura?: string;
  fechaCompra?: string;
  condicionPago?: 'CONTADO' | 'CREDITO';
  plazoCreditoDias?: number;
  metodoPago?: string;
  cuentaPagoCodigo?: string;
  aplicaIva?: boolean;
  recibirInmediato?: boolean;
  notas?: string;
  items: Array<{
    insumoId: string;
    cantidad: number;
    costoUnitario: number;
    incluyeIva?: boolean;
  }>;
}

export interface CreateSubarriendoPayload {
  equipoId: string;
  proveedorId?: string;
  proveedorNombre?: string;
  modalidad?: ModalidadSubarriendoProveedor;
  tarifaProveedor: number;
  cantidadUnidades?: number;
  fechaInicio: string;
  fechaFinEstimada: string;
  duracionEstimadaValor?: number;
  referenciaDocumento?: string;
  observaciones?: string;
}

export interface DevolverSubarriendoPayload {
  fechaDevolucionReal?: string;
  montoFinal?: number;
  deshabilitarParaRenta?: boolean;
  observaciones?: string;
}

export interface RegistrarPagoCompraPayload {
  monto: number;
  fechaPago?: string;
  metodoPago?: string;
  cuentaPagoCodigo?: string;
  referencia?: string;
  observaciones?: string;
}
