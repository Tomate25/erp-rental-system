/**
 * Estados de equipo: única fuente de verdad de etiquetas y de qué estados se pueden elegir a mano.
 *
 * - Editables: se eligen en el formulario (y el zod los acepta).
 * - Sistema: los fijan los flujos del sistema (cotización, despacho, mantenimiento); se muestran con etiqueta pero no se eligen.
 * - Heredados: valores viejos que la API aún pudiera devolver; solo se muestran con una etiqueta neutra.
 */
export const EQUIPMENT_EDITABLE_STATES = ['DISPONIBLE', 'FUERA_DE_SERVICIO', 'BAJA'] as const;
export const EQUIPMENT_SYSTEM_STATES = ['RESERVADO', 'DESPACHADO', 'EN_MANTENIMIENTO'] as const;
export const EQUIPMENT_LEGACY_STATES = ['RENTADO', 'RETORNO', 'MANTENIMIENTO'] as const;

export type EquipmentEditableState = (typeof EQUIPMENT_EDITABLE_STATES)[number];
export type EquipmentSystemState = (typeof EQUIPMENT_SYSTEM_STATES)[number];
export type EquipmentLegacyState = (typeof EQUIPMENT_LEGACY_STATES)[number];
/** Estados vigentes del equipo. */
export type EquipmentState = EquipmentEditableState | EquipmentSystemState;
/** Lo que puede devolver la API: estados vigentes más los heredados. */
export type EquipmentApiState = EquipmentState | EquipmentLegacyState;

export const EQUIPMENT_STATE_LABELS: Record<EquipmentState, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado',
  DESPACHADO: 'Despachado (en poder del cliente)',
  EN_MANTENIMIENTO: 'En mantenimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
  BAJA: 'Dada de baja',
};

/** Etiqueta neutra para estados viejos (RENTADO, RETORNO, MANTENIMIENTO) o desconocidos. */
export const EQUIPMENT_LEGACY_STATE_LABEL = 'Estado heredado';

/** Estado terminal: un equipo dado de baja no puede cambiar de estado. */
export const EQUIPMENT_TERMINAL_STATE: EquipmentState = 'BAJA';

export const isEditableEquipmentState = (estado: string | null | undefined): estado is EquipmentEditableState =>
  (EQUIPMENT_EDITABLE_STATES as readonly string[]).includes(estado ?? '');

export const isCurrentEquipmentState = (estado: string | null | undefined): estado is EquipmentState =>
  estado != null && Object.prototype.hasOwnProperty.call(EQUIPMENT_STATE_LABELS, estado);

/** Etiqueta en español; valores fuera de los estados vigentes muestran "Estado heredado". */
export const getEquipmentStateLabel = (estado: string | null | undefined): string =>
  isCurrentEquipmentState(estado) ? EQUIPMENT_STATE_LABELS[estado] : EQUIPMENT_LEGACY_STATE_LABEL;

/** Opciones del selector del formulario (solo estados que se eligen a mano). */
export const EQUIPMENT_FORM_STATE_OPTIONS: ReadonlyArray<{ value: EquipmentEditableState; label: string }> =
  EQUIPMENT_EDITABLE_STATES.map((value) => ({ value, label: EQUIPMENT_STATE_LABELS[value] }));

/** Opciones del filtro del listado. `EN_USO` es un filtro calculado (despachados o con unidades fuera). */
export const EQUIPMENT_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'DISPONIBLE', label: '🟢 DISPONIBLES' },
  { value: 'RESERVADO', label: 'RESERVADOS' },
  { value: 'EN_USO', label: '🔴 EN USO (Despachados)' },
  { value: 'EN_MANTENIMIENTO', label: '🛠️ EN MANTENIMIENTO' },
  { value: 'FUERA_DE_SERVICIO', label: 'FUERA DE SERVICIO' },
  { value: 'BAJA', label: 'DADOS DE BAJA' },
];
