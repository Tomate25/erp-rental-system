import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

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

export const MSG_SUCURSAL_NO_ENCONTRADA = 'Sucursal no encontrada';

/**
 * Verifica que `sucursalId` pertenezca a la empresa autenticada. Una sucursal
 * inexistente o de otra empresa responde igual (404) para no revelar que el
 * id existe en otro tenant. Aceptar un id de sucursal sin esta comprobacion
 * permitiria crear documentos de una empresa colgados de una sucursal ajena.
 */
export async function assertSucursalEnEmpresa(
  db: { sucursal: { findFirst: (args: any) => Promise<unknown> } },
  sucursalId: string,
  empresaId: string | null | undefined,
): Promise<string> {
  const empId = assertEmpresaId(empresaId);
  const sucursal = await db.sucursal.findFirst({
    where: { id: sucursalId, empresaId: empId },
    select: { id: true },
  });
  if (!sucursal) throw new NotFoundException(MSG_SUCURSAL_NO_ENCONTRADA);
  return sucursalId;
}

export const MSG_SIN_SUCURSAL_PARA_CONTRATO =
  'No existe una sucursal disponible para generar el contrato.';

/**
 * Devuelve la sucursal con la que se debe crear un documento: la indicada
 * (validada con `assertSucursalEnEmpresa`) o, si no hay, la primera sucursal
 * de la empresa (la mas antigua). Si la empresa no tiene ninguna responde 400
 * con un mensaje claro; nunca devuelve un id inventado, porque un id
 * inexistente rompe la FK en PostgreSQL y acaba en un 500.
 */
export async function resolveSucursalIdEnEmpresa(
  db: {
    sucursal: {
      findFirst: (args: any) => Promise<{ id: string } | null | undefined>;
    };
  },
  sucursalId: string | null | undefined,
  empresaId: string | null | undefined,
): Promise<string> {
  const empId = assertEmpresaId(empresaId);
  if (sucursalId) return assertSucursalEnEmpresa(db, sucursalId, empId);
  const primera = await db.sucursal.findFirst({
    where: { empresaId: empId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!primera?.id) {
    throw new BadRequestException(MSG_SIN_SUCURSAL_PARA_CONTRATO);
  }
  return primera.id;
}
