import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LIMITS } from '../../../common/validation/dto-limits';

export class CreateCompraInsumoItemDto {
  @IsUUID('4', { message: 'El insumo debe ser un UUID válido' })
  insumoId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'La cantidad debe ser numérica' })
  @Min(0.01, { message: 'La cantidad debe ser mayor a cero' })
  cantidad: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'El costo unitario debe ser numérico' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  costoUnitario: number;

  @IsBoolean()
  @IsOptional()
  incluyeIva?: boolean;
}

export class CreateCompraInsumoDto {
  @IsUUID('4')
  @IsOptional()
  proveedorId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  proveedorNombre?: string;

  @IsUUID('4')
  @IsOptional()
  sucursalId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  numeroFactura?: string;

  @IsDateString()
  @IsOptional()
  fechaCompra?: string;

  @IsIn(['CONTADO', 'CREDITO'], {
    message: 'La condición de pago debe ser CONTADO o CREDITO',
  })
  @IsOptional()
  condicionPago?: 'CONTADO' | 'CREDITO';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  plazoCreditoDias?: number;

  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA'])
  @IsOptional()
  metodoPago?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  cuentaPagoCodigo?: string;

  @IsBoolean()
  @IsOptional()
  aplicaIva?: boolean;

  @IsBoolean()
  @IsOptional()
  recibirInmediato?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  notas?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos un insumo a la compra' })
  @ValidateNested({ each: true })
  @Type(() => CreateCompraInsumoItemDto)
  items: CreateCompraInsumoItemDto[];
}
