import type { Equipment } from '../types/inventory.types';
import type { EquipmentFormValues } from '../validators/inventory.validator';
import {
  EQUIPMENT_FORM_STATE_OPTIONS,
  EQUIPMENT_TERMINAL_STATE,
  type EquipmentEditableState,
} from '../constants/equipment-status';

/** Roles que pueden dar de baja un equipo. Es solo UX: el backend es quien decide. */
export const EQUIPMENT_BAJA_ROLES = ['ADMIN', 'GERENTE'] as const;

/**
 * Nombres de rol del usuario autenticado. Misma convencion que el resto del front:
 * `roles` puede traer strings o `{ nombre }` / `{ rol: { nombre } }`.
 */
export const getUserRoleNames = (user: unknown): string[] => {
  const roles = (user as { roles?: unknown } | null | undefined)?.roles;
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r: any) => (typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || ''))
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
};

/** Lee solo los roles del usuario guardado en sesion (mismo patron que ContractsPage / QuotationsPage). */
export const readStoredUserRoles = (): string[] => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? getUserRoleNames(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

export const canSetEquipmentBaja = (roles: readonly string[]): boolean =>
  roles.some((role) => (EQUIPMENT_BAJA_ROLES as readonly string[]).includes(role));

/** Opciones de estado del formulario; BAJA solo se ofrece a ADMIN y GERENTE. */
export const getEquipmentFormStateOptions = (
  roles: readonly string[]
): ReadonlyArray<{ value: EquipmentEditableState; label: string }> =>
  canSetEquipmentBaja(roles)
    ? EQUIPMENT_FORM_STATE_OPTIONS
    : EQUIPMENT_FORM_STATE_OPTIONS.filter((option) => option.value !== EQUIPMENT_TERMINAL_STATE);

const isBlank = (value: string | null | undefined): boolean => value == null || value.trim() === '';

/**
 * Arma el payload de escritura de equipos. El backend rechaza '' con 400 (IsUUID / opcionales), asi que:
 * - ALTA: `subcategoriaId`, `codigo` y `numeroSerie` vacios o solo espacios se omiten.
 * - EDICION: `codigo` y `numeroSerie` vacios se omiten (sin semantica de borrado).
 *   `subcategoriaId` vacio => `null` solo si el equipo ya tenia subcategoria (el usuario la quito); si no tenia, se omite.
 */
export const buildEquipmentPayload = (
  data: EquipmentFormValues,
  initialData?: Pick<Equipment, 'subcategoriaId'> | null
): EquipmentFormValues => {
  const { subcategoriaId, codigo, numeroSerie, ...rest } = data;
  const payload: EquipmentFormValues = { ...rest };

  if (!isBlank(codigo)) payload.codigo = codigo;
  if (!isBlank(numeroSerie)) payload.numeroSerie = numeroSerie;

  if (!isBlank(subcategoriaId)) {
    payload.subcategoriaId = subcategoriaId;
  } else if (initialData && !isBlank(initialData.subcategoriaId)) {
    payload.subcategoriaId = null;
  }

  return payload;
};