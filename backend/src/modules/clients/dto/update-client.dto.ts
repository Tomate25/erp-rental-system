import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  numeroCliente?: string;

  @IsString({ message: 'El nombre comercial debe ser un texto' })
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  razonSocial?: string;

  @IsString()
  @IsOptional()
  rfc?: string;

  @IsString()
  @IsOptional()
  cedula?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsOptional()
  emailFacturacion?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  telMovistar?: string;

  @IsString()
  @IsOptional()
  telClaro?: string;

  @IsString()
  @IsOptional()
  telConvencional?: string;

  @IsString()
  @IsOptional()
  vendedor?: string;

  @Transform(({ value }) => (value === '' || value === null || value === undefined || isNaN(Number(value)) ? undefined : Number(value)))
  @IsNumber({}, { message: 'El límite de crédito debe ser un número válido' })
  @IsOptional()
  limiteCredito?: number;

  @IsString()
  @IsOptional()
  condicionPago?: string;

  @IsBoolean({ message: 'El estado de WhatsApp debe ser un booleano' })
  @IsOptional()
  whatsappHabilitado?: boolean;

  @IsString({ message: 'El número de WhatsApp debe ser un texto' })
  @IsOptional()
  whatsappNumero?: string;
}
