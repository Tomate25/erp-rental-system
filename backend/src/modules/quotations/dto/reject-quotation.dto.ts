import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RejectQuotationDto {
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio.' })
  @IsString({ message: 'El motivo de rechazo debe ser un texto válido.' })
  @MinLength(5, {
    message: 'El motivo de rechazo debe contener al menos 5 caracteres.',
  })
  @MaxLength(1000, {
    message: 'El motivo de rechazo no puede exceder 1000 caracteres.',
  })
  motivo: string;
}
