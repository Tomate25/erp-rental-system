import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { CreateAuditRecordDto } from '../interfaces/audit-context.interface';
import { serializeAuditDetails } from './sanitize-audit.util';
import { normalizeIp } from '../../../common/utils/client-ip.util';
import { getAuditRequestContext } from './audit-request-context';

/**
 * Registra un evento de auditoría forense dentro de una transacción activa de Prisma (tx).
 * Garantiza atomicidad transaccional: si el evento o la transacción fallan, todo revierte.
 * Aplica sanitización automática para nunca fugar contraseñas, hashes, JWT o tokens de sesión.
 */
export async function recordAuditInTx(
  tx: Prisma.TransactionClient,
  dto: CreateAuditRecordDto,
) {
  if (!dto.empresaId) {
    throw new BadRequestException(
      'empresaId es obligatorio para registrar auditoría forense',
    );
  }

  const requestContext = getAuditRequestContext();
  const sanitizedDetalles = serializeAuditDetails(dto.detalles);
  const ipDireccion = normalizeIp(
    dto.ipDireccion ?? requestContext?.ipDireccion,
  );
  const userAgent = (
    dto.userAgent ??
    requestContext?.userAgent ??
    'System'
  ).slice(0, 255);

  return tx.auditoria.create({
    data: {
      empresaId: dto.empresaId,
      usuarioId: dto.usuarioId || null,
      accion: dto.accion,
      entidadTipo: dto.entidadTipo,
      entidadId: dto.entidadId,
      detalles: sanitizedDetalles,
      ipDireccion,
      userAgent,
      requestId: dto.requestId ?? requestContext?.requestId ?? null,
    },
  });
}
