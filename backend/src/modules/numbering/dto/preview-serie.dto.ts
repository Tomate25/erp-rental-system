import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewSerieDto {
  @IsOptional()
  @IsString()
  prefijo?: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  plantilla?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  relleno?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
