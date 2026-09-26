import { IsOptional, IsEmail, IsString, MaxLength } from 'class-validator';

export class SendQuotationEmailDto {
  @IsOptional()
  @IsEmail(
    {},
    { message: 'El correo de destino debe tener un formato válido.' },
  )
  emailDestino?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notasAdicionales?: string;
}
