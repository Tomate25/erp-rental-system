import { IsEmail, IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsOptional()
  numeroCliente?: string;

  @IsString({ message: 'El nombre comercial debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre comercial es requerido' })
  nombre: string;

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

  @IsNumber()
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
