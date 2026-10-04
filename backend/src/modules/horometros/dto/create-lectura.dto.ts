import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { OrigenLecturaHorometro } from '@prisma/client';

export class CreateLecturaHorometroDto {
  @IsUUID('4', { message: 'El ID del equipo debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del equipo es requerido' })
  equipoId: string;

  @IsNumber({}, { message: 'El nuevo horómetro debe ser un número' })
  @Min(0, { message: 'El horómetro no puede ser negativo' })
  @IsNotEmpty({ message: 'La nueva lectura del horómetro es requerida' })
  @Max(LIMITS.HOROMETRO_MAX)
  horometroNuevo: number;

  @IsEnum(OrigenLecturaHorometro, { message: 'Origen de lectura inválido' })
  @IsOptional()
  origen?: OrigenLecturaHorometro;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  observaciones?: string;
}
