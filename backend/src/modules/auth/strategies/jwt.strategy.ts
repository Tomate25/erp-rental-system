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
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Exigir explícitamente el claim sessionToken en el payload (anti bypass de sesión)
    if (!payload || !payload.sessionToken) {
      throw new UnauthorizedException('Token inválido: falta claim de sesión');
    }

    // 2. Verificar que el usuario exista y siga activo en base de datos
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

    // 3. Validar bloqueo administrativo o temporal activo
    if (usuario.bloqueado) {
      if (usuario.bloqueadoHasta) {
        if (new Date() < usuario.bloqueadoHasta) {
          throw new UnauthorizedException(
            'Usuario bloqueado temporalmente por intentos fallidos',
          );
        }
      } else {
        throw new UnauthorizedException(
          'Usuario bloqueado administrativamente',
        );
      }
    }

    // 4. Validar sesión única activa: exigir coincidencia exacta con sessionToken en DB
    if (
      !usuario.sessionToken ||
      usuario.sessionToken !== payload.sessionToken
    ) {
      throw new UnauthorizedException(
        'Sesión inválida, cerrada o iniciada desde otro dispositivo',
      );
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
