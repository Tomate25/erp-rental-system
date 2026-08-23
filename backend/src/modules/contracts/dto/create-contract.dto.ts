import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ContractItemDto {
  @IsUUID('4')
  @IsOptional()
  equipoId?: string;

  @IsUUID('4')
  @IsOptional()
  productoId?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  cantidad?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  dias?: number;

  @IsNumber()
  @Min(0)
  precioRenta: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horometroInicial?: number;
}

export class CreateContractFromQuotationDto {
  @IsUUID('4', { message: 'El ID de la cotización debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de la cotización es requerido' })
  cotizacionId: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio del alquiler es requerida' })
  fechaInicio: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de fin estimada es requerida' })
  fechaFin: string;

  @IsNumber({}, { message: 'El depósito de garantía debe ser un número' })
  @IsOptional()
  depositoGarantia?: number;

  @IsNumber({}, { message: 'El periodo de días de corte debe ser un número (ej. 15 o 30)' })
  @IsOptional()
  periodoDiasCorte?: number;

  @IsString()
  @IsOptional()
  condiciones?: string;
}

export class CreateDirectContractDto {
  @IsUUID('4', { message: 'El ID del cliente debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El cliente es obligatorio para la creación directa del contrato' })
  clienteId: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio del alquiler es requerida' })
  fechaInicio: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de fin estimada es requerida' })
  fechaFin: string;

  @IsNumber({}, { message: 'El depósito de garantía debe ser un número' })
  @IsOptional()
  depositoGarantia?: number;

  @IsNumber({}, { message: 'El periodo de días de corte debe ser un número (ej. 15 o 30)' })
  @IsOptional()
  periodoDiasCorte?: number;

  @IsString()
  @IsOptional()
  condiciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractItemDto)
  items: ContractItemDto[];
}
