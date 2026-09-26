import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { recordAuditInTx } from '../auditoria/utils/audit-tx.util';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  apellido?: string | null;
  empresaId: string;
  sucursalId?: string | null;
  roles: Array<{ rol?: { nombre?: string } | string } | string>;
  requiereCambioPassword?: boolean;
}

export interface JwtAuthPayload {
  sub: string;
  email?: string;
  nombre?: string;
  empresaId?: string;
  sucursalId?: string | null;
  roles?: string[];
  requiereCambioPassword?: boolean;
  sessionToken?: string;
  [key: string]: unknown;
}

export const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$2K8bw5mlvUiJuK9/mV0OKw$Ys89LGT0XwCBm2xXzKFQpAZSGcyvDCJnEvPX/4icpF0';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const maxFailedAttempts = parseInt(
      this.configService.get<string>('AUTH_MAX_FAILED_ATTEMPTS') || '5',
      10,
    );
    const lockoutMinutes = parseInt(
      this.configService.get<string>('AUTH_LOCKOUT_MINUTES') || '15',
      10,
    );

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
      },
    });

    // Mitigación estricta de ataques de temporización (timing attack) y enumeración de usuarios:
    // Se ejecuta siempre una verificación Argon2 real (~40ms) incluso ante cuentas inexistentes, inactivas o bloqueadas
    if (!usuario) {
      await argon2.verify(DUMMY_ARGON2_HASH, password).catch(() => false);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      await argon2.verify(DUMMY_ARGON2_HASH, password).catch(() => false);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const now = new Date();

    if (usuario.bloqueado) {
      if (!usuario.bloqueadoHasta || now < usuario.bloqueadoHasta) {
        await argon2.verify(DUMMY_ARGON2_HASH, password).catch(() => false);
        throw new UnauthorizedException('Credenciales inválidas');
      }
    }

    const isPasswordValid = await argon2.verify(usuario.password, password);
    if (!isPasswordValid) {
      // Si la ventana previa de bloqueo expiró, reinicia el ciclo de conteo desde 1
      const isExpiredWindow =
        usuario.bloqueadoHasta && now >= usuario.bloqueadoHasta;
      const nuevosIntentos = isExpiredWindow ? 1 : usuario.intentosFallidos + 1;
      const debeBloquear = nuevosIntentos >= maxFailedAttempts;
      const nuevoBloqueoHasta = debeBloquear
        ? new Date(now.getTime() + lockoutMinutes * 60 * 1000)
        : null;

      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: nuevosIntentos,
          bloqueado: debeBloquear,
          bloqueadoHasta: nuevoBloqueoHasta,
        },
      });

      // Respuesta uniforme: nunca revelar la existencia de la cuenta ni el conteo de intentos fallidos
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Si el login fue exitoso, resetear intentos fallidos y estado de bloqueo
    if (
      usuario.intentosFallidos > 0 ||
      usuario.bloqueado ||
      usuario.bloqueadoHasta
    ) {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: 0,
          bloqueado: false,
          bloqueadoHasta: null,
        },
      });
    }

    // Excluir contraseña y sessionToken de los datos retornados
    const { password: _, sessionToken: __, ...result } = usuario;
    return result;
  }

  async login(user: AuthUser) {
    const sessionToken = crypto.randomUUID();

    // Guardar el token de sesión única en la base de datos para invalidar inicios de sesión previos en otras máquinas
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { sessionToken },
    });

    const rolesList = (user.roles || []).map((r) => {
      if (typeof r === 'string') return r;
      if (typeof r.rol === 'string') return r.rol;
      return r.rol?.nombre || '';
    });

    const payload: JwtAuthPayload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      empresaId: user.empresaId,
      sucursalId: user.sucursalId,
      roles: rolesList,
      requiereCambioPassword: user.requiereCambioPassword,
      sessionToken,
    };

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionToken },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiration as `${number}d`,
      },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        empresaId: user.empresaId,
        sucursalId: user.sucursalId,
        roles: rolesList,
        requiereCambioPassword: user.requiereCambioPassword,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_ACCESS_SECRET');
    let payload: JwtAuthPayload;
    try {
      payload = this.jwtService.verify<JwtAuthPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Token de actualización inválido o expirado',
      );
    }

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
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const now = new Date();
    if (
      usuario.bloqueado &&
      (!usuario.bloqueadoHasta || now < usuario.bloqueadoHasta)
    ) {
      throw new UnauthorizedException('Usuario bloqueado por seguridad');
    }

    if (
      !payload.sessionToken ||
      !usuario.sessionToken ||
      usuario.sessionToken !== payload.sessionToken
    ) {
      throw new UnauthorizedException(
        'Sesión caducada, cerrada o iniciada en otro dispositivo',
      );
    }

    const accessPayload: JwtAuthPayload = {
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      empresaId: usuario.empresaId,
      sucursalId: usuario.sucursalId,
      roles: usuario.roles.map((r) => r.rol.nombre),
      requiereCambioPassword: usuario.requiereCambioPassword,
      sessionToken: usuario.sessionToken,
    };

    const newAccessToken = this.jwtService.sign(accessPayload);
    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const newRefreshToken = this.jwtService.sign(
      { sub: usuario.id, sessionToken: usuario.sessionToken },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiration as `${number}d`,
      },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      auditActor: { id: usuario.id, empresaId: usuario.empresaId },
    };
  }

  async logout(
    userId?: string,
    token?: string,
    sessionToken?: string,
  ): Promise<{ id: string; empresaId: string } | null> {
    let targetId = userId;
    let targetSessionToken = sessionToken;

    if (token) {
      const accessSecret =
        this.configService.get<string>('JWT_ACCESS_SECRET') ||
        this.configService.get<string>('JWT_SECRET');
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') || accessSecret;

      let payload: JwtAuthPayload | null = null;
      // 1. Intentar verificar primero como Refresh Token (flujo cookie preferido)
      try {
        payload = this.jwtService.verify<JwtAuthPayload>(token, {
          secret: refreshSecret,
        });
      } catch {
        // 2. Si falla con refreshSecret, intentar verificar como Access Token
        try {
          payload = this.jwtService.verify<JwtAuthPayload>(token, {
            secret: accessSecret,
          });
        } catch {
          // Token con firma inválida, forjado o alterado: rechazar tajantemente (anti-DoS contra terceros)
          throw new UnauthorizedException(
            'Token inválido para cierre de sesión',
          );
        }
      }

      if (!payload?.sub) {
        throw new UnauthorizedException(
          'Token inválido: falta claim de usuario',
        );
      }
      if (!payload?.sessionToken) {
        throw new UnauthorizedException(
          'Token inválido: falta claim de sesión',
        );
      }

      targetId = payload.sub;
      targetSessionToken = payload.sessionToken;
    }

    if (!targetId) {
      throw new UnauthorizedException(
        'No se especificó un usuario o sesión válida para cerrar',
      );
    }

    // Invalidar atómicamente solo la sesión específica a la que corresponde el token,
    // garantizando que una sesión antigua no pueda revocar la sesión activa más reciente del usuario
    const whereClause: Prisma.UsuarioWhereInput = { id: targetId };
    if (targetSessionToken) {
      whereClause.sessionToken = targetSessionToken;
    }

    const actor = await this.prisma.usuario.findUnique({
      where: { id: targetId },
      select: { id: true, empresaId: true },
    });
    const updated = await this.prisma.usuario.updateMany({
      where: whereClause,
      data: { sessionToken: null },
    });
    return updated.count > 0 && actor ? actor : null;
  }

  async register(
    registerDto: RegisterDto,
    authenticatedEmpresaId: string,
    currentUserId?: string,
  ) {
    const { email, password, nombre, apellido, empresaId, sucursalId, roles } =
      registerDto;

    if (empresaId !== authenticatedEmpresaId) {
      throw new ForbiddenException(
        'No puedes registrar usuarios en otra empresa',
      );
    }

    // 1. Verificar si el usuario ya existe
    const userExists = await this.prisma.usuario.findUnique({
      where: { email },
    });
    if (userExists) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // 2. Verificar que la empresa exista
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa) {
      throw new BadRequestException('La empresa especificada no existe');
    }

    // 3. Verificar que la sucursal exista (si se proporciona)
    if (sucursalId) {
      const sucursal = await this.prisma.sucursal.findFirst({
        where: { id: sucursalId, empresaId: authenticatedEmpresaId },
      });
      if (!sucursal) {
        throw new BadRequestException('La sucursal especificada no existe');
      }
    }

    // 4. Encriptar contraseña
    const passwordHash = await argon2.hash(password);

    // 5. Crear usuario y asignar roles (filtrando por roles globales del sistema o propios de la empresa)
    const rolesEnDb = await this.prisma.rol.findMany({
      where: {
        nombre: { in: roles },
        OR: [{ empresaId: null }, { empresaId }],
      },
    });

    if (rolesEnDb.length !== roles.length) {
      throw new BadRequestException(
        'Uno o más roles especificados no existen o no pertenecen a su empresa',
      );
    }

    const nuevoUsuario = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const created = await tx.usuario.create({
          data: {
            email,
            password: passwordHash,
            nombre,
            apellido,
            empresaId,
            sucursalId,
            roles: {
              create: rolesEnDb.map((rol) => ({
                rolId: rol.id,
              })),
            },
          },
          include: {
            roles: {
              include: {
                rol: true,
              },
            },
          },
        });
        await recordAuditInTx(tx, {
          empresaId,
          usuarioId: currentUserId ?? null,
          accion: 'USUARIO_REGISTRADO',
          entidadTipo: 'USUARIO',
          entidadId: created.id,
          detalles: {
            email: created.email,
            nombre: created.nombre,
            apellido: created.apellido,
            sucursalId: created.sucursalId,
            roles: rolesEnDb.map((rol) => rol.nombre),
          },
        });
        return created;
      },
    );

    const { password: _, sessionToken: __, ...result } = nuevoUsuario;
    return result;
  }
}
