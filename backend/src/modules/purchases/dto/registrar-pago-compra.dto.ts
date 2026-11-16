import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LIMITS } from '../../../common/validation/dto-limits';

export class RegistrarPagoCompraDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'El monto del pago debe ser mayor a cero' })
  monto: number;

  @IsDateString()
  @IsOptional()
  fechaPago?: string;

  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA'])
  @IsOptional()
  metodoPago?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  cuentaPagoCodigo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  referencia?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  observaciones?: string;
}
