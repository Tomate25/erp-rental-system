import { IsNotEmpty, IsOptional, IsUUID, IsNumber, IsDateString, Min } from 'class-validator';

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
  @IsNumber()
  @Min(1)
  @IsOptional()
  periodoDias?: number; // 15 o 30 días
}

export class CreateManualCorteDto {
  @IsDateString({}, { message: 'La fecha de corte debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de corte es requerida' })
  fechaCorte: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsOptional()
  monto?: number;
}
