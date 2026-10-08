import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptOnBehalfDto {
  @IsOptional()
  @IsString({ message: 'El medio de confirmación debe ser un texto válido.' })
  @MaxLength(100, {
    message: 'El medio de confirmación no puede exceder 100 caracteres.',
  })
  medioConfirmacion?: string;

  @IsOptional()
  @IsString({ message: 'Las observaciones o notas deben ser un texto válido.' })
  @MaxLength(1000, {
    message: 'Las observaciones no pueden exceder 1000 caracteres.',
  })
  notas?: string;
}
