import { EstadoEquipo } from '@prisma/client';

export const ESTADOS_EQUIPO_OCUPADO: ReadonlyArray<EstadoEquipo> = [
  EstadoEquipo.DESPACHADO,
  EstadoEquipo.RENTADO,
  EstadoEquipo.EN_ALQUILER,
  EstadoEquipo.RESERVADO,
  EstadoEquipo.RETORNO,
  EstadoEquipo.EN_RETORNO,
];

export const ESTADOS_EQUIPO_TALLER: ReadonlyArray<EstadoEquipo> = [
  EstadoEquipo.EN_MANTENIMIENTO,
  EstadoEquipo.MANTENIMIENTO,
  EstadoEquipo.EN_INSPECCION,
];

export const ESTADOS_EQUIPO_BLOQUEADO: ReadonlyArray<EstadoEquipo> = [
  ...ESTADOS_EQUIPO_OCUPADO,
  ...ESTADOS_EQUIPO_TALLER,
  EstadoEquipo.FUERA_DE_SERVICIO,
  EstadoEquipo.BAJA,
];

export function isOcupado(estado: EstadoEquipo | string | null | undefined): boolean {
  if (!estado) return false;
  return (ESTADOS_EQUIPO_OCUPADO as readonly string[]).includes(estado);
}

export function isEnTaller(estado: EstadoEquipo | string | null | undefined): boolean {
  if (!estado) return false;
  return (ESTADOS_EQUIPO_TALLER as readonly string[]).includes(estado);
}

export function isBloqueado(estado: EstadoEquipo | string | null | undefined): boolean {
  if (!estado) return false;
  return (ESTADOS_EQUIPO_BLOQUEADO as readonly string[]).includes(estado);
}

export const EQUIPMENT_STATE_LABELS: Record<EstadoEquipo, string> = {
  [EstadoEquipo.DISPONIBLE]: 'Disponible',
  [EstadoEquipo.RESERVADO]: 'Reservado',
  [EstadoEquipo.RENTADO]: 'Rentado',
  [EstadoEquipo.RETORNO]: 'En retorno',
  [EstadoEquipo.DESPACHADO]: 'Despachado (en obra)',
  [EstadoEquipo.EN_ALQUILER]: 'En alquiler',
  [EstadoEquipo.EN_RETORNO]: 'En proceso de retorno',
  [EstadoEquipo.EN_INSPECCION]: 'En inspección',
  [EstadoEquipo.EN_MANTENIMIENTO]: 'En mantenimiento',
  [EstadoEquipo.MANTENIMIENTO]: 'En taller / mantenimiento',
  [EstadoEquipo.FUERA_DE_SERVICIO]: 'Fuera de servicio',
  [EstadoEquipo.BAJA]: 'Dado de baja',
};

export function getEquipmentStateLabel(estado: EstadoEquipo | string | null | undefined): string {
  if (!estado) return 'Desconocido';
  return EQUIPMENT_STATE_LABELS[estado as EstadoEquipo] || estado;
}
