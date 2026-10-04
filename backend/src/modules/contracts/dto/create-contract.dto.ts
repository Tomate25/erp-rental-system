import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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

export class ContractItemDto {
  @IsUUID('4')
  @IsOptional()
  equipoId?: string;

  @IsUUID('4')
  @IsOptional()
  productoId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  descripcion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  modelo?: string;

  @IsString()
  @IsOptional()
  @IsIn(['POR_DIA', 'POR_HORA'])
  tipoCobro?: string;

  @IsString()
  @IsOptional()
  @IsIn(['DIA', 'HORA'])
  tipoTarifa?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Max(LIMITS.QTY_MAX)
  cantidad?: number;

  // DIA: entero 1-3650. HORA: horas totales decimales 0,01-87600 (ver dias-horas.validator).
  @IsDiasPorTarifa()
  @IsOptional()
  dias?: number;

  @IsHorasPorTarifa()
  @IsOptional()
  horas?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  @Max(24)
  horasPorDia?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioRenta?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  descuento?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  subtotal?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Max(LIMITS.HOROMETRO_MAX)
  horometroInicial?: number;
}

export class CreateContractFromQuotationDto {
  @IsUUID('4', { message: 'El ID de la cotización debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de la cotización es requerido' })
  cotizacionId: string;

  @IsDateString({ strict: true }, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio del alquiler es requerida' })
  fechaInicio: string;

  @IsDateString({ strict: true }, { message: 'La fecha de fin debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de fin estimada es requerida' })
  fechaFin: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El depósito de garantía debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  depositoGarantia?: number;

  @IsInt({ message: 'El periodo de días de corte debe ser un número (ej. 15 o 30)' })
  @IsOptional()
  @Min(1)
  @Max(LIMITS.PERIOD_DAYS_MAX)
  periodoDiasCorte?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  condiciones?: string;
}

export class CreateDirectContractDto {
  @IsUUID('4', { message: 'El ID del cliente debe ser un UUID válido' })
  @IsNotEmpty({
    message: 'El cliente es obligatorio para la creación directa del contrato',
  })
  clienteId: string;

  @IsDateString({ strict: true }, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio del alquiler es requerida' })
  fechaInicio: string;

  @IsDateString({ strict: true }, { message: 'La fecha de fin debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de fin estimada es requerida' })
  fechaFin: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El depósito de garantía debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  depositoGarantia?: number;

  @IsInt({ message: 'El periodo de días de corte debe ser un número (ej. 15 o 30)' })
  @IsOptional()
  @Min(1)
  @Max(LIMITS.PERIOD_DAYS_MAX)
  periodoDiasCorte?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  condiciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractItemDto)
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  items: ContractItemDto[];
}
