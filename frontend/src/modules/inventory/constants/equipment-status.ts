/**
 * Estados de equipo: única fuente de verdad de etiquetas y de qué estados se pueden elegir a mano.
 *
 * - Editables: se eligen en el formulario (y el zod los acepta).
 * - Sistema: los fijan los flujos del sistema (cotización, despacho, mantenimiento); se muestran con etiqueta pero no se eligen.
 * - 12 estados de la base de datos PostgreSQL soportados con etiqueta visible y helpers unificados.
 */
export const EQUIPMENT_EDITABLE_STATES = ['DISPONIBLE', 'FUERA_DE_SERVICIO', 'BAJA'] as const;
export const EQUIPMENT_SYSTEM_STATES = ['RESERVADO', 'DESPACHADO', 'EN_MANTENIMIENTO'] as const;
export const EQUIPMENT_LEGACY_STATES = [
  'RENTADO',
  'RETORNO',
  'EN_ALQUILER',
  'EN_RETORNO',
  'EN_INSPECCION',
  'MANTENIMIENTO',
] as const;

export const EQUIPMENT_ALL_STATES = [
  'DISPONIBLE',
  'RESERVADO',
  'RENTADO',
  'RETORNO',
  'DESPACHADO',
  'EN_ALQUILER',
  'EN_RETORNO',
  'EN_INSPECCION',
  'EN_MANTENIMIENTO',
  'MANTENIMIENTO',
  'FUERA_DE_SERVICIO',
  'BAJA',
] as const;

export type EquipmentEditableState = (typeof EQUIPMENT_EDITABLE_STATES)[number];
export type EquipmentSystemState = (typeof EQUIPMENT_SYSTEM_STATES)[number];
export type EquipmentLegacyState = (typeof EQUIPMENT_LEGACY_STATES)[number];
export type EquipmentAllState = (typeof EQUIPMENT_ALL_STATES)[number];

/** Estados vigentes del equipo. */
export type EquipmentState = EquipmentEditableState | EquipmentSystemState;
/** Lo que puede devolver la API: estados vigentes más los adicionales/heredados. */
export type EquipmentApiState = EquipmentAllState;

export const EQUIPMENT_STATE_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado',
  DESPACHADO: 'Despachado (en poder del cliente)',
  EN_MANTENIMIENTO: 'En mantenimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
  BAJA: 'Dada de baja',
  RENTADO: 'Rentado',
  RETORNO: 'En retorno',
  EN_ALQUILER: 'En alquiler',
  EN_RETORNO: 'En proceso de retorno',
  EN_INSPECCION: 'En inspección',
  MANTENIMIENTO: 'En taller / mantenimiento',
};

/** Etiqueta neutra para estados desconocidos. */
export const EQUIPMENT_LEGACY_STATE_LABEL = 'Estado heredado';

/** Estado terminal: un equipo dado de baja no puede cambiar de estado. */
export const EQUIPMENT_TERMINAL_STATE = 'BAJA';

export const isEditableEquipmentState = (estado: string | null | undefined): estado is EquipmentEditableState =>
  (EQUIPMENT_EDITABLE_STATES as readonly string[]).includes(estado ?? '');

export const isCurrentEquipmentState = (estado: string | null | undefined): estado is string =>
  Boolean(estado && Object.prototype.hasOwnProperty.call(EQUIPMENT_STATE_LABELS, estado));

/** Helpers compartidos de agrupación de estados */
export const isOcupado = (estado: string | null | undefined): boolean => {
  if (!estado) return false;
  return ['DESPACHADO', 'RENTADO', 'EN_ALQUILER', 'RESERVADO', 'RETORNO', 'EN_RETORNO'].includes(estado);
};

export const isEnTaller = (estado: string | null | undefined): boolean => {
  if (!estado) return false;
  return ['EN_MANTENIMIENTO', 'MANTENIMIENTO', 'EN_INSPECCION'].includes(estado);
};

export const isBloqueado = (estado: string | null | undefined): boolean => {
  if (!estado) return false;
  return ['BAJA', 'FUERA_DE_SERVICIO'].includes(estado) || isOcupado(estado) || isEnTaller(estado);
};

/** Etiqueta visible para los 12 estados; valores fuera muestran "Estado heredado". */
export const getEquipmentStateLabel = (estado: string | null | undefined): string =>
  isCurrentEquipmentState(estado) ? EQUIPMENT_STATE_LABELS[estado] : EQUIPMENT_LEGACY_STATE_LABEL;

/** Clase CSS para badges de estado */
export const getEquipmentBadgeClass = (estado: string | null | undefined): string => {
  switch (estado) {
    case 'DISPONIBLE':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    case 'RESERVADO':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'DESPACHADO':
    case 'RENTADO':
    case 'EN_ALQUILER':
      return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'RETORNO':
    case 'EN_RETORNO':
    case 'EN_INSPECCION':
      return 'bg-cyan-50 text-cyan-800 border-cyan-300';
    case 'EN_MANTENIMIENTO':
    case 'MANTENIMIENTO':
      return 'bg-[#C55500] text-white border-[#C55500]';
    case 'FUERA_DE_SERVICIO':
      return 'bg-slate-100 text-slate-800 border-slate-300';
    case 'BAJA':
      return 'bg-red-50 text-red-800 border-red-300';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

/** Opciones del selector del formulario (solo estados que se eligen a mano). */
export const EQUIPMENT_FORM_STATE_OPTIONS: ReadonlyArray<{ value: EquipmentEditableState; label: string }> =
  EQUIPMENT_EDITABLE_STATES.map((value) => ({ value, label: EQUIPMENT_STATE_LABELS[value] }));

/** Opciones del filtro del listado. `EN_USO` es un filtro calculado (despachados o con unidades fuera). */
export const EQUIPMENT_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'DISPONIBLE', label: '🟢 DISPONIBLES' },
  { value: 'RESERVADO', label: '🟡 RESERVADOS' },
  { value: 'EN_USO', label: '🔴 EN USO (Despachados / Rentados)' },
  { value: 'EN_MANTENIMIENTO', label: '🛠️ EN MANTENIMIENTO' },
  { value: 'FUERA_DE_SERVICIO', label: '⚪ FUERA DE SERVICIO' },
  { value: 'BAJA', label: '⚫ DADOS DE BAJA' },
];
