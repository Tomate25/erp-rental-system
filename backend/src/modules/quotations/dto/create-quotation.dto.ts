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
import {
  IsDiasPorTarifa,
  IsHorasPorTarifa,
} from '../../../common/validation/dias-horas.validator';
import { Type } from 'class-transformer';
import { EstadoCotizacion, NivelPrecio, TipoCobro } from '@prisma/client';

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

  // DIA: entero 1-3650. HORA: horas totales decimales 0,01-87600 (ver dias-horas.validator).
  @IsDiasPorTarifa()
  dias: number;

  @IsEnum(TipoCobro)
  @IsOptional()
  tipoCobro?: TipoCobro;

  @IsString()
  @IsOptional()
  @IsIn(['DIA', 'HORA'])
  tipoTarifa?: string;

  @IsHorasPorTarifa()
  @IsOptional()
  horas?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @IsOptional()
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioUnitario?: number;

  @IsEnum(NivelPrecio)
  @IsOptional()
  nivelPrecio?: NivelPrecio;

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
