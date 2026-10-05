/** Roles reales del sistema. `TECNICO` y `CLIENTE` NO existen. */
export const SYSTEM_ROLES = [
  'ADMIN',
  'GERENTE',
  'COMERCIAL',
  'OPERACIONES',
  'FACTURACION',
  'CONTABILIDAD',
  'MANTENIMIENTO',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

/**
 * Nombres que un administrador NO puede usar al crear un rol personalizado (el backend responde 409).
 *
 * Copiada TAL CUAL de `SYSTEM_ROLES` en `backend/src/modules/roles/services/roles.service.ts`
 * (líneas 14-27, rama `fix/backend-aislamiento`), que es la lista que `RolesService.create` compara contra
 * `nombre.trim().toUpperCase()`. Incluye roles que el front no asigna a usuarios (`CLIENTE`, `TECNICO`, `INVENTARIO`),
 * por eso es distinta de `SYSTEM_ROLES` de arriba (los 7 asignables). Si el backend cambia su lista, actualizar esta.
 */
export const ROLES_RESERVADOS: readonly string[] = [
  'ADMIN',
  'GERENTE',
  'COMERCIAL',
  'OPERACIONES',
  'FACTURACION',
  'CONTABILIDAD',
  'MANTENIMIENTO',
  'CLIENTE',
  'TECNICO',
  'INVENTARIO',
];

/** `true` si `nombre` es un nombre reservado; compara igual que el backend: recortado y en mayúsculas. */
export function esRolReservado(nombre: string): boolean {
  return ROLES_RESERVADOS.includes(nombre.trim().toUpperCase());
}