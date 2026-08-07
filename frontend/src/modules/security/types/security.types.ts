export interface Permission {
  id: string;
  codigo: string;
  descripcion?: string | null;
}

export interface Role {
  id: string;
  nombre: string;
  descripcion?: string | null;
  permisos: Permission[];
  usuarioCount: number;
}

export interface UserDetail {
  id: string;
  empresaId: string;
  sucursalId?: string | null;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  bloqueado: boolean;
  intentosFallidos: number;
  createdAt: string;
  roles: {
    id: string;
    nombre: string;
    descripcion?: string | null;
  }[];
  sucursal?: {
    id: string;
    nombre: string;
    codigo: string;
  } | null;
}
