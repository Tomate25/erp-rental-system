import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelQuotationDto {
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio.' })
  @IsString({ message: 'El motivo de cancelación debe ser un texto válido.' })
  @MinLength(5, {
    message: 'El motivo de cancelación debe contener al menos 5 caracteres.',
  })
  @MaxLength(1000, {
    message: 'El motivo de cancelación no puede exceder 1000 caracteres.',
  })
  motivo: string;
}
