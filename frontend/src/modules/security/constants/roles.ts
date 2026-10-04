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
