import { ForbiddenException } from '@nestjs/common';

/**
 * Garantiza que una operación de servicio recibe un `empresaId` válido.
 *
 * Un `empresaId` `undefined` en un `where` de Prisma equivale a "sin filtro"
 * y expondría datos de todos los tenants, por eso los servicios autenticados
 * deben fallar de forma cerrada en lugar de omitir el filtro.
 *
 * NO usar en flujos públicos por token (cotización pública), que se acotan por
 * el token y no por la sesión del usuario.
 */
export function assertEmpresaId(empresaId: string | null | undefined): string {
  if (typeof empresaId !== 'string' || empresaId.trim() === '') {
    throw new ForbiddenException(
      'No se pudo determinar la empresa del usuario autenticado',
    );
  }
  return empresaId;
}