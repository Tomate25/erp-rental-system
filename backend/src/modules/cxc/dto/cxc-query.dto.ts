import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class AntiguedadFiltrosDto {
  @IsOptional()
  @IsString()
  sucursalId?: string;

  @IsOptional()
  @IsString()
  vendedorId?: string;

  @IsOptional()
  @IsString()
  tipoCliente?: string;

  @IsOptional()
  @IsString()
  monedaOriginal?: string; // 'NIO' | 'USD' | 'TODAS'

  @IsOptional()
  @IsDateString()
  fechaCorte?: string; // Antigüedad a cualquier fecha histórica

  @IsOptional()
  @IsString()
  criterioFecha?: 'VENCIMIENTO' | 'EMISION'; // Por defecto VENCIMIENTO

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  monedaVisualizacion?: 'NIO' | 'USD'; // Selector C$ / US$ de 1 clic
}

export { AntiguedadFiltrosDto as CxcQueryDto };
