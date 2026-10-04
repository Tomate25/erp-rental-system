import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
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
import { Type } from 'class-transformer';
import { EstadoCotizacion, TipoCobro } from '@prisma/client';

export class QuotationItemDto {
  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  equipoId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  productoId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITS.TEXT.SHORT)
  descripcion: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser de al menos 1 unidad' })
  @Max(LIMITS.QTY_MAX)
  cantidad: number;

  @IsInt()
  @Min(1, { message: 'El número de días debe ser de al menos 1' })
  @Max(LIMITS.DAYS_MAX)
  dias: number;

  @IsEnum(TipoCobro)
  @IsOptional()
  tipoCobro?: TipoCobro;

  @IsString()
  @IsOptional()
  @IsIn(['DIA', 'HORA'])
  tipoTarifa?: string;

  @IsInt()
  @Min(1, { message: 'Las horas deben ser de al menos 1' })
  @IsOptional()
  @Max(LIMITS.HOURS_MAX)
  horas?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @IsOptional()
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioUnitario?: number;

  @IsNumber()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  descuento?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  subtotal?: number;
}

export class CreateQuotationDto {
  @IsEnum(EstadoCotizacion)
  @IsOptional()
  estado?: EstadoCotizacion;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  notasRevision?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITS.TEXT.ID)
  clienteId: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  proyecto?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  atencion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  telefono?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.EMAIL)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  referencia?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  asesorId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Max(LIMITS.PERIOD_DAYS_MAX)
  validezDias?: number;

  @IsDateString({ strict: true })
  @IsOptional()
  fechaInicioRenta?: string;

  @IsDateString({ strict: true })
  @IsOptional()
  fechaFinRenta?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  condiciones?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  subtotal?: number;

  @IsNumber()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  descuento?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  iva?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  total?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El depósito en garantía no puede ser negativo' })
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  depositoGarantia?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'La cotización debe contener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  items: QuotationItemDto[];
}
