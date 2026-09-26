export interface AuditContext {
  empresaId: string;
  usuarioId?: string | null;
  ipDireccion?: string;
  userAgent?: string;
  requestId?: string | null;
}

export interface CreateAuditRecordDto {
  empresaId: string;
  usuarioId?: string | null;
  accion: string;
  entidadTipo: string;
  entidadId: string;
  detalles?: Record<string, unknown> | string | null;
  ipDireccion?: string;
  userAgent?: string;
  requestId?: string | null;
}
