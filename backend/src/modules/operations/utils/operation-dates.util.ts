import { BadRequestException } from '@nestjs/common';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tolerancia por desfase de reloj entre cliente y servidor al registrar una recepción. */
export const RECEPTION_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
/** Máximo de anticipación al programar una solicitud operativa. */
export const SCHEDULE_MAX_AHEAD_MS = 365 * DAY_MS;

export function parseValidDate(
  value: string | Date | null | undefined,
  campo: string,
): Date {
  const fecha = value instanceof Date ? value : new Date(String(value ?? ''));
  if (Number.isNaN(fecha.getTime())) {
    throw new BadRequestException(`${campo} no es una fecha válida`);
  }
  return fecha;
}

/**
 * Fecha de recepción física de un retorno: no puede ser futura (más allá de la
 * tolerancia de reloj) ni anterior al primer despacho / inicio del contrato.
 * Esta fecha fija el cese de cobro, por lo que no debe aceptarse sin límites.
 */
export function assertReceptionDate(
  value: string | Date,
  opts: {
    ahora?: Date;
    desde?: Date | null;
    campo?: string;
  } = {},
): Date {
  const campo = opts.campo ?? 'La fecha de recepción';
  const ahora = opts.ahora ?? new Date();
  const fecha = parseValidDate(value, campo);
  if (fecha.getTime() > ahora.getTime() + RECEPTION_FUTURE_TOLERANCE_MS) {
    throw new BadRequestException(`${campo} no puede ser futura`);
  }
  if (opts.desde && fecha.getTime() < opts.desde.getTime()) {
    throw new BadRequestException(
      `${campo} no puede ser anterior al primer despacho o inicio del contrato`,
    );
  }
  return fecha;
}

/**
 * Fecha programada de una solicitud operativa: válida, no anterior a `desde`
 * (si se indica) y no más de un año hacia adelante.
 */
export function assertScheduledDate(
  value: string | Date,
  opts: { ahora?: Date; desde?: Date | null; campo?: string } = {},
): Date {
  const campo = opts.campo ?? 'La fecha programada';
  const ahora = opts.ahora ?? new Date();
  const fecha = parseValidDate(value, campo);
  if (opts.desde && fecha.getTime() < opts.desde.getTime()) {
    throw new BadRequestException(
      `${campo} no puede ser anterior al inicio del contrato`,
    );
  }
  if (fecha.getTime() > ahora.getTime() + SCHEDULE_MAX_AHEAD_MS) {
    throw new BadRequestException(
      `${campo} no puede exceder un año hacia adelante`,
    );
  }
  return fecha;
}