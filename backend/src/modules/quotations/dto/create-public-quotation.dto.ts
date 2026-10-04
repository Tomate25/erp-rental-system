import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import {
  IsDiasPorTarifa,
  IsHorasPorTarifa,
} from '../../../common/validation/dias-horas.validator';
import { Type } from 'class-transformer';
import { TipoCobro } from '@prisma/client';

export class PublicQuotationItemDto {
  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  equipoId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  productoId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  descripcion?: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser de al menos 1 unidad' })
  @Max(LIMITS.QTY_MAX)
  cantidad: number;

  // DIA: entero 1-3650. HORA: horas totales decimales 0,01-87600 (ver dias-horas.validator).
  @IsDiasPorTarifa()
  @IsOptional()
  dias?: number;

  @IsEnum(TipoCobro, { message: 'Tipo de cobro no válido' })
  @IsOptional()
  tipoCobro?: TipoCobro;

  @IsString()
  @IsOptional()
  @IsIn(['DIA', 'HORA'])
  tipoTarifa?: string;

  @IsHorasPorTarifa()
  @IsOptional()
  horas?: number;
}

export class CreatePublicQuotationDto {
  @IsEmail(
    {},
    { message: 'Debe ingresar un correo electrónico de contacto válido' },
  )
  @IsNotEmpty({
    message: 'El correo electrónico es requerido para la cotización',
  })
  @MaxLength(LIMITS.TEXT.EMAIL)
  email: string;

  @IsString({ message: 'El nombre o persona de atención debe ser texto' })
  @IsNotEmpty({ message: 'El nombre de atención o contacto es requerido' })
  @MaxLength(LIMITS.TEXT.SHORT)
  atencion: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  telefono?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  proyecto?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  empresaId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  sucursalId?: string;

  @IsInt({ message: 'La validez en días debe ser un número entero' })
  @Min(1, { message: 'La validez de la cotización debe ser de al menos 1 día' })
  @Max(60, {
    message: 'La validez de la cotización pública no puede exceder 60 días',
  })
  @IsOptional()
  validezDias?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  condiciones?: string;

  @IsArray({ message: 'Debe especificar una lista de ítems a cotizar' })
  @ArrayMinSize(1, {
    message: 'Debe incluir al menos un ítem de maquinaria o producto',
  })
  @ValidateNested({ each: true })
  @Type(() => PublicQuotationItemDto)
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  items: PublicQuotationItemDto[];
}
