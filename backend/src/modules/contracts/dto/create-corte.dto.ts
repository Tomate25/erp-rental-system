import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HorasPorDiaItemDto {
  @IsUUID('4')
  detalleContratoId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  horasPorDia: number;
}

export class CreateCorteDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsNumber()
  @Min(1)
  numeroCorte: number;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;

  @IsNumber()
  @Min(0)
  monto: number;
}

export class GenerateCortesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorasPorDiaItemDto)
  @IsOptional()
  horasPorDiaPorItem?: HorasPorDiaItemDto[];
  @IsNumber()
  @Min(1)
  @IsOptional()
  periodoDias?: number; // días entre cortes (ej. 10, 15, 20, 30)

  @IsNumber()
  @Min(1)
  @IsOptional()
  cantidadCortes?: number; // número de cortes deseado (ej. 4)

  @IsDateString()
  @IsOptional()
  fechaInicio?: string; // Fecha de inicio de vigencia del contrato (ej. '2026-03-25')

  @IsDateString()
  @IsOptional()
  fechaFin?: string; // Fecha de finalización del contrato (ej. '2026-05-25')
}

export class CreateManualCorteDto {
  @IsDateString({}, { message: 'La fecha de corte debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de corte es requerida' })
  fechaCorte: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsOptional()
  monto?: number;
}

export class UpdateCorteDto {
  @IsDateString({}, { message: 'La fecha de inicio debe ser válida' })
  @IsOptional()
  fechaInicio?: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser válida' })
  @IsOptional()
  fechaFin?: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  @IsOptional()
  monto?: number;
}
