import type { Request, Response } from 'express';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuditRequestMetadata } from './audit-request-context';
import { recordAuditInTx } from './audit-tx.util';

type AuditActor = { id?: string; empresaId?: string };
export type AuditedRequest = Request & { user?: AuditActor };

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export function getAuditRoute(req: Request): { modulo: string; ruta: string } {
  const segments = req.originalUrl?.split('?')[0].split('/').filter(Boolean) || [];
  const offset = segments[0] === 'api' && segments[1] === 'v1' ? 2 : 0;
  const modulo = (segments[offset] || 'SISTEMA').toUpperCase();
  const template = typeof req.route?.path === 'string' ? req.route.path : '';
  // Nunca guardar la URL real: puede contener tokens o identificadores sensibles.
  const ruta = template || `/${modulo.toLowerCase()}`;
  return { modulo, ruta };
}

export async function writeHttpAudit(
  prisma: PrismaService,
  req: AuditedRequest,
  statusCode: number,
  startedAt: number,
  metadata: AuditRequestMetadata,
): Promise<boolean> {
  const actor = req.user;
  const metodo = req.method?.toUpperCase();
  if (!actor?.id || !actor.empresaId || !metodo || !HTTP_METHODS.has(metodo)) {
    return false;
  }

  const { modulo, ruta } = getAuditRoute(req);
  await recordAuditInTx(prisma, {
    empresaId: actor.empresaId,
    usuarioId: actor.id,
    accion: `HTTP_${metodo}`,
    entidadTipo: modulo,
    entidadId: metadata.requestId,
    requestId: metadata.requestId,
    ipDireccion: metadata.ipDireccion,
    userAgent: metadata.userAgent,
    detalles: {
      modulo,
      ruta,
      metodo,
      codigoHttp: statusCode,
      resultado: statusCode < 400 ? 'EXITOSO' : 'FALLIDO',
      duracionMs: Math.max(0, Date.now() - startedAt),
    },
  });
  return true;
}

export function attachHttpAudit(
  prisma: PrismaService,
  req: AuditedRequest,
  res: Response,
  metadata: AuditRequestMetadata,
  onError: (error: unknown) => void,
): void {
  const startedAt = Date.now();
  res.once('finish', () => {
    void writeHttpAudit(prisma, req, res.statusCode, startedAt, metadata).catch(onError);
  });
}
