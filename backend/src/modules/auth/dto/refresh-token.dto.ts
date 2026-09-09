import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'El refreshToken es requerido' })
  @IsString({ message: 'El refreshToken debe ser una cadena de texto' })
  refreshToken: string;
}
