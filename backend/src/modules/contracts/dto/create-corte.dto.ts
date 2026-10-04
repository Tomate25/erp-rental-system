import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { Type } from 'class-transformer';

export class HorasPorDiaItemDto {
  @IsUUID('4')
  detalleContratoId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(24)
  horasPorDia: number;
}

export class CreateCorteDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  numeroCorte: number;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaFin: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  monto: number;
}

export class GenerateCortesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorasPorDiaItemDto)
  @IsOptional()
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  horasPorDiaPorItem?: HorasPorDiaItemDto[];
  @IsInt()
  @Min(1)
  @IsOptional()
  @Max(LIMITS.PERIOD_DAYS_MAX)
  periodoDias?: number; // días entre cortes (ej. 10, 15, 20, 30)

  @IsInt()
  @Min(1)
  @IsOptional()
  @Max(120)
  cantidadCortes?: number; // número de cortes deseado (ej. 4)

  @IsDateString({ strict: true })
  @IsOptional()
  fechaInicio?: string; // Fecha de inicio de vigencia del contrato (ej. '2026-03-25')

  @IsDateString({ strict: true })
  @IsOptional()
  fechaFin?: string; // Fecha de finalización del contrato (ej. '2026-05-25')
}

export class CreateManualCorteDto {
  @IsDateString({ strict: true }, { message: 'La fecha de corte debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de corte es requerida' })
  fechaCorte: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  monto?: number;
}

export class UpdateCorteDto {
  @IsDateString({ strict: true }, { message: 'La fecha de inicio debe ser válida' })
  @IsOptional()
  fechaInicio?: string;

  @IsDateString({ strict: true }, { message: 'La fecha de fin debe ser válida' })
  @IsOptional()
  fechaFin?: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  monto?: number;
}
