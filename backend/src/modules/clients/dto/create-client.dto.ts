import {
  IsBoolean,
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
import { Transform } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  numeroCliente?: string;

  @IsString({ message: 'El nombre comercial debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre comercial es requerido' })
  @MaxLength(LIMITS.TEXT.SHORT)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  razonSocial?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  rfc?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  cedula?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ADDRESS)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.TEXT.EMAIL)
  emailFacturacion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  telefono?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  telMovistar?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  telClaro?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  telConvencional?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  vendedor?: string;

  @IsUUID('4', { message: 'El vendedor asignado debe tener un ID válido' })
  @IsOptional()
  vendedorId?: string;

  @Transform(({ value }) =>
    value === '' ||
    value === null ||
    value === undefined ||
    isNaN(Number(value))
      ? undefined
      : Number(value),
  )
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El límite de crédito debe ser un número válido' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  limiteCredito?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  condicionPago?: string;

  @IsBoolean({ message: 'El estado de WhatsApp debe ser un booleano' })
  @IsOptional()
  whatsappHabilitado?: boolean;

  @IsString({ message: 'El número de WhatsApp debe ser un texto' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  whatsappNumero?: string;
}
