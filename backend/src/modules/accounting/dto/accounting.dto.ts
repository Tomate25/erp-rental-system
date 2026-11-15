import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaldoInicialItemDto {
  @IsString()
  @IsNotEmpty({ message: 'El código de cuenta es requerido' })
  codigo: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El monto deudor debe ser numérico' })
  @Min(0, { message: 'El monto deudor no puede ser negativo' })
  deudor: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'El monto acreedor debe ser numérico' })
  @Min(0, { message: 'El monto acreedor no puede ser negativo' })
  acreedor: number;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class GuardarSaldosInicialesDto {
  @IsString()
  @IsNotEmpty({ message: 'La fecha de corte es requerida' })
  fechaCorte: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaldoInicialItemDto)
  items: SaldoInicialItemDto[];
}

export class CuentaCatalogoInputDto {
  @IsString()
  @IsNotEmpty({ message: 'El código de cuenta es requerido' })
  codigo: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de la cuenta es requerido' })
  nombre: string;

  @IsOptional()
  @IsString()
  mayorCodigo?: string;

  @IsOptional()
  @IsString()
  mayorNombre?: string;

  @IsIn(['Deudora', 'Acreedora'], {
    message: 'La naturaleza debe ser Deudora o Acreedora',
  })
  naturaleza: 'Deudora' | 'Acreedora';

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  renglon?: string;

  @IsOptional()
  @IsString()
  qbTipo?: string;
}

export class ImportarExcelContableDto {
  @IsString()
  @IsNotEmpty({ message: 'La fecha de corte es requerida' })
  fechaCorte: string;

  @IsOptional()
  @IsBoolean()
  reemplazarCatalogo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CuentaCatalogoInputDto)
  catalogo?: CuentaCatalogoInputDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaldoInicialItemDto)
  saldos: SaldoInicialItemDto[];
}

export class CrearAsientoLineaDto {
  @IsString()
  @IsNotEmpty({ message: 'El código de cuenta es requerido' })
  cuentaCodigo: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El monto Debe debe ser numérico' })
  @Min(0, { message: 'El monto Debe no puede ser negativo' })
  debe: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'El monto Haber debe ser numérico' })
  @Min(0, { message: 'El monto Haber no puede ser negativo' })
  haber: number;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  conceptoLinea?: string;
}

export class CrearAsientoManualDto {
  @IsString()
  @IsNotEmpty({ message: 'La fecha contable es requerida' })
  fecha: string;

  @IsIn(['INGRESOS', 'EGRESOS', 'DIARIO', 'AJUSTE', 'APERTURA', 'CIERRE'], {
    message: 'Tipo de asiento inválido',
  })
  tipoAsiento: 'INGRESOS' | 'EGRESOS' | 'DIARIO' | 'AJUSTE' | 'APERTURA' | 'CIERRE';

  @IsOptional()
  @IsString()
  documentoReferencia?: string;

  @IsString()
  @IsNotEmpty({ message: 'El concepto contable es requerido' })
  concepto: string;

  @IsOptional()
  @IsString()
  sucursalId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearAsientoLineaDto)
  lineas: CrearAsientoLineaDto[];
}

export class AnularAsientoDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
