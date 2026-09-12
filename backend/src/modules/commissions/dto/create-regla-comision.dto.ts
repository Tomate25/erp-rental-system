import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateReglaComisionDto {
  @IsUUID('4', { message: 'El usuario debe tener un ID válido' })
  @IsOptional()
  usuarioId?: string | null;

  @IsString()
  @IsOptional()
  nombreVendedor?: string | null;

  @IsNumber()
  @Min(0)
  montoMinimo: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  montoMaximo?: number | null;

  @IsNumber()
  @Min(0)
  porcentaje: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
