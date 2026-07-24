import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'super-secret-access-token-key-2026',
    });
  }

  async validate(payload: JwtPayload) {
    // Verificar que el usuario exista y siga activo en base de datos
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no autorizado o inactivo');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      empresaId: usuario.empresaId,
      sucursalId: usuario.sucursalId,
      roles: usuario.roles.map((r) => r.rol.nombre),
    };
  }
}
