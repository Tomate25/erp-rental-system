import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BaseCalculoComision,
  MetodoCalculoComision,
  MotivoAjusteComision,
  TratamientoNegativoComision,
} from '@prisma/client';

export class TramoInputDto {
  @IsInt()
  @Min(1)
  orden: number;

  @IsNumber()
  @Min(0)
  desdeExcl: number;

  @IsOptional()
  @IsNumber()
  hastaIncl?: number | null;

  @IsNumber()
  @Min(0)
  porcentaje: number;
}

export class CreatePlanComisionDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(MetodoCalculoComision)
  metodo?: MetodoCalculoComision = MetodoCalculoComision.ESCALONADO;

  @IsOptional()
  @IsEnum(BaseCalculoComision)
  base?: BaseCalculoComision = BaseCalculoComision.FACTURADO;

  @IsOptional()
  @IsBoolean()
  incluyeIva?: boolean = false;

  @IsOptional()
  @IsEnum(TratamientoNegativoComision)
  tratamientoNegativo?: TratamientoNegativoComision = TratamientoNegativoComision.ARRASTRAR;

  @IsOptional()
  @IsInt()
  @Min(1)
  mesesMaxArrastre?: number = 3;

  @IsString()
  @IsNotEmpty()
  vigenteDesde: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  vigenteHasta?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TramoInputDto)
  tramos: TramoInputDto[];
}

export class AssignPlanDto {
  @IsString()
  @IsNotEmpty()
  vendedorId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  vigenteDesde: string;

  @IsOptional()
  @IsString()
  vigenteHasta?: string | null;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class SolicitarAjusteDto {
  @IsNumber()
  monto: number;

  @IsEnum(MotivoAjusteComision)
  motivo: MotivoAjusteComision;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsString()
  documentoSoporte?: string;
}

export class SimuladorDto {
  @IsNumber()
  @Min(0)
  monto: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TramoInputDto)
  tramos: TramoInputDto[];
}
