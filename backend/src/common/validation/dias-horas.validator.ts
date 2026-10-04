import { registerDecorator, ValidationOptions } from 'class-validator';
import { LIMITS } from './dto-limits';

/**
 * Validacion condicional de `dias` / `horas` en las lineas de cotizacion y contrato.
 *
 * Con tarifa HORA el backend interpreta `dias` como horas totales (puede ser
 * decimal, p. ej. 6.5 h x 3 dias = 19.5, y superar 3650); con tarifa DIA es un
 * entero de dias. Una linea es horaria si `tipoTarifa === 'HORA'` o
 * `tipoCobro === 'POR_HORA'` (el mismo criterio que usan los servicios).
 *
 * Se implementa como un validador propio y no con @ValidateIf porque
 * class-validator exige que TODAS las condiciones @ValidateIf de una propiedad
 * se cumplan: no permite dos ramas (DIA / HORA) con reglas y mensajes distintos
 * sobre el mismo campo. Equivale a un @ValidateIf por rama.
 *
 * Para campos opcionales combinar con @IsOptional() (undefined/null se omiten).
 */

export const MSG_DIAS_DIA = 'dias debe ser un entero entre 1 y 3650 para tarifa DIA.';
export const MSG_DIAS_HORA =
  'dias debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.';
export const MSG_HORAS_HORA =
  'horas debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.';
export const MSG_HORAS_DIA =
  'horas debe estar entre 0 y 87600 horas, con máximo 2 decimales.';

export function esLineaHoraria(linea: unknown): boolean {
  const l = linea as { tipoTarifa?: unknown; tipoCobro?: unknown } | null;
  return l?.tipoTarifa === 'HORA' || l?.tipoCobro === 'POR_HORA';
}

function esNumeroFinito(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Maximo 2 decimales, tolerando el ruido binario de la coma flotante (21.900000000000002). */
function tieneMaximoDosDecimales(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

function horasValidas(value: unknown, minimo: number): boolean {
  return (
    esNumeroFinito(value) &&
    value >= minimo &&
    value <= LIMITS.HOURS_TOTAL_MAX &&
    tieneMaximoDosDecimales(value)
  );
}

export function diasValido(value: unknown, horaria: boolean): boolean {
  if (horaria) return horasValidas(value, 0.01);
  return (
    esNumeroFinito(value) &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= LIMITS.DAYS_MAX
  );
}

export function horasValido(value: unknown, horaria: boolean): boolean {
  return horasValidas(value, horaria ? 0.01 : 0);
}

/** `dias`: entero 1-3650 con tarifa DIA; decimal 0,01-87600 (2 decimales) con HORA. */
export function IsDiasPorTarifa(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isDiasPorTarifa',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value, args) => diasValido(value, esLineaHoraria(args?.object)),
        defaultMessage: (args) =>
          esLineaHoraria(args?.object) ? MSG_DIAS_HORA : MSG_DIAS_DIA,
      },
    });
}

/** `horas`: decimal 0,01-87600 (2 decimales) con HORA; 0-87600 (2 decimales) con DIA. */
export function IsHorasPorTarifa(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isHorasPorTarifa',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value, args) => horasValido(value, esLineaHoraria(args?.object)),
        defaultMessage: (args) =>
          esLineaHoraria(args?.object) ? MSG_HORAS_HORA : MSG_HORAS_DIA,
      },
    });
}