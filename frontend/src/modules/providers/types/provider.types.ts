export type TipoProveedor =
  | 'MAQUINARIA_EXTERNA'
  | 'INSUMOS_Y_REPUESTOS'
  | 'SERVICIOS_TALLER'
  | 'GENERAL';

export interface Provider {
  id: string;
  empresaId: string;
  nombre: string;
  razonSocial?: string | null;
  identificacion?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  contacto?: string | null;
  tipo: TipoProveedor;
  condicionPago?: string | null;
  plazoCreditoDias?: number | null;
  notas?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    equipos: number;
  };
  equipos?: Array<{
    id: string;
    codigo: string | null;
    modelo: string;
    numeroSerie: string | null;
    estado: string;
    precioProveedor: number | null;
    disponibleParaRenta: boolean;
  }>;
}

export interface CreateProviderPayload {
  nombre: string;
  razonSocial?: string;
  identificacion?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  tipo?: TipoProveedor;
  condicionPago?: string;
  plazoCreditoDias?: number;
  notas?: string;
  activo?: boolean;
}

export type UpdateProviderPayload = Partial<CreateProviderPayload>;
