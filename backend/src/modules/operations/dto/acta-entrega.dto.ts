import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

/** Tamano maximo del acta serializada a JSON (caracteres). 200 lineas con textos al limite caben holgadas. */
export const ACTA_MAX_JSON_CHARS = 100_000;

/** Valida que el valor serializado a JSON no supere `max` caracteres. */
export function MaxJsonSize(max: number, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'maxJsonSize',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value) => {
          try {
            return JSON.stringify(value ?? null).length <= max;
          } catch {
            return false;
          }
        },
      },
    });
}

/** Texto de hasta `maxText` caracteres o numero finito entre 0 y `maxNumber` (el front tipa `itemNum` y `cant` como string | number). */
export function IsTextOrNumber(
  maxText: number,
  maxNumber: number,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isTextOrNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value) =>
          (typeof value === 'string' && value.length <= maxText) ||
          (typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= 0 &&
            value <= maxNumber),
      },
    });
}

/**
 * NOTA: el ValidationPipe antepone la ruta del padre a cada mensaje de un DTO
 * anidado ("actaEntregaData." / "actaEntregaData.items.0."), por eso estos
 * mensajes solo nombran el campo.
 */
/** Linea del acta impresa (equipo entregado). Claves = las que envia DespachoForm.tsx. */
export class ActaEntregaItemDto {
  @IsOptional()
  @IsTextOrNumber(10, LIMITS.ITEMS_MAX, {
    message:
      'itemNum debe ser texto de hasta 10 caracteres o un número entre 0 y 200',
  })
  itemNum?: string | number;

  @IsOptional()
  @IsTextOrNumber(10, LIMITS.QTY_MAX, {
    message:
      'cant debe ser un número entre 0 y 100000 o texto de hasta 10 caracteres',
  })
  cant?: string | number;

  @IsOptional()
  @IsString({ message: 'descripcion debe ser texto' })
  @MaxLength(LIMITS.TEXT.ADDRESS, {
    message: `descripcion no puede superar ${LIMITS.TEXT.ADDRESS} caracteres`,
  })
  descripcion?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
  @IsString({ message: 'horas debe ser texto' })
  @MaxLength(20, {
    message: 'horas no puede superar 20 caracteres',
  })
  horas?: string;

  @IsOptional()
  @IsString({ message: 'combustible debe ser texto' })
  @MaxLength(LIMITS.TEXT.CODE, {
    message: `combustible no puede superar ${LIMITS.TEXT.CODE} caracteres`,
  })
  combustible?: string;
}

/**
 * Datos del acta de entrega que se guardan en `Despacho.actaEntregaData` (JSON)
 * y que ActaEntregaPrintView imprime. Todos los campos son opcionales porque la
 * vista de impresion tiene valores por defecto para cada uno.
 */
export class ActaEntregaDataDto {
  @IsOptional()
  @IsString({ message: 'fecha debe ser texto' })
  @MaxLength(30, { message: 'fecha no puede superar 30 caracteres' })
  fecha?: string;

  @IsOptional()
  @IsString({ message: 'hora debe ser texto' })
  @MaxLength(10, { message: 'hora no puede superar 10 caracteres' })
  hora?: string;

  @IsOptional()
  @IsIn(['AM', 'PM'], { message: 'ampm debe ser AM o PM' })
  ampm?: 'AM' | 'PM';

  @IsOptional()
  @IsString({ message: 'entregadoPor debe ser texto' })
  @MaxLength(LIMITS.TEXT.NAME, {
    message: `entregadoPor no puede superar ${LIMITS.TEXT.NAME} caracteres`,
  })
  entregadoPor?: string;

  @IsOptional()
  @IsString({ message: 'recibidoPor debe ser texto' })
  @MaxLength(LIMITS.TEXT.NAME, {
    message: `recibidoPor no puede superar ${LIMITS.TEXT.NAME} caracteres`,
  })
  recibidoPor?: string;

  @IsOptional()
  @IsString({ message: 'cedula debe ser texto' })
  @MaxLength(30, { message: 'cedula no puede superar 30 caracteres' })
  cedula?: string;

  @IsOptional()
  @IsString({ message: 'contratoNo debe ser texto' })
  @MaxLength(LIMITS.TEXT.CODE, {
    message: `contratoNo no puede superar ${LIMITS.TEXT.CODE} caracteres`,
  })
  contratoNo?: string;

  @IsOptional()
  @IsString({ message: 'fechaInicioPactada debe ser texto' })
  @MaxLength(60, {
    message: 'fechaInicioPactada no puede superar 60 caracteres',
  })
  fechaInicioPactada?: string;

  @IsOptional()
  @IsString({ message: 'fechaFinPactada debe ser texto' })
  @MaxLength(60, {
    message: 'fechaFinPactada no puede superar 60 caracteres',
  })
  fechaFinPactada?: string;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  @MaxLength(LIMITS.TEXT.NOTES, {
    message: `observaciones no puede superar ${LIMITS.TEXT.NOTES} caracteres`,
  })
  observaciones?: string;

  @IsOptional()
  @IsArray({ message: 'items debe ser una lista' })
  @ArrayMaxSize(LIMITS.ITEMS_MAX, {
    message: `items no puede tener más de ${LIMITS.ITEMS_MAX} líneas`,
  })
  @ValidateNested({ each: true })
  @Type(() => ActaEntregaItemDto)
  items?: ActaEntregaItemDto[];
}
