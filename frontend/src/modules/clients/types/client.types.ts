export interface Contacto {
  id: string;
  clienteId: string;
  nombre: string;
  puesto?: string | null;
  email: string;
  telefono: string;
  activo: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  empresaId: string;
  numeroCliente?: string | null;
  nombre: string;
  razonSocial?: string | null;
  rfc?: string | null;
  cedula?: string | null;
  direccion?: string | null;
  emailFacturacion?: string | null;
  telefono?: string | null;
  telMovistar?: string | null;
  telClaro?: string | null;
  telConvencional?: string | null;
  vendedor?: string | null;
  limiteCredito?: number | null;
  condicionPago?: string | null;
  whatsappHabilitado: boolean;
  whatsappNumero?: string | null;
  createdAt: string;
  updatedAt: string;
  contactos?: Contacto[];
}
