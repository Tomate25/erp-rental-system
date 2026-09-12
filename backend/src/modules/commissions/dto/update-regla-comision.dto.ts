import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateReglaComisionDto {
  @IsUUID('4', { message: 'El usuario debe tener un ID válido' })
  @IsOptional()
  usuarioId?: string | null;

  @IsString()
  @IsOptional()
  nombreVendedor?: string | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  montoMinimo?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  montoMaximo?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  porcentaje?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
