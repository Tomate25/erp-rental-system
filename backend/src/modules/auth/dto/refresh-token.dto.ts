import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString({ message: 'El refreshToken debe ser una cadena de texto' })
  refreshToken?: string;
}
