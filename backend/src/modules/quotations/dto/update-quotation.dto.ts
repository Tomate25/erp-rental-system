import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
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
import { EstadoCotizacion } from '@prisma/client';
import { QuotationItemDto } from './create-quotation.dto';

export class UpdateQuotationDto {
  @IsEnum(EstadoCotizacion)
  @IsOptional()
  estado?: EstadoCotizacion;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ID)
  clienteId?: string;

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
  @IsOptional()
  @Min(1)
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

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  notasRevision?: string;

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
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  @IsOptional()
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  items?: QuotationItemDto[];
}
