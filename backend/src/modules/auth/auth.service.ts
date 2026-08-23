import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginDto) {
    const { email, password } = loginDto;

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

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('El usuario está inactivo');
    }

    if (usuario.bloqueado) {
      throw new UnauthorizedException('Tu cuenta ha sido bloqueada por seguridad debido a 3 intentos fallidos de inicio de sesión. Por favor contacta al administrador del sistema.');
    }

    const isPasswordValid = await argon2.verify(usuario.password, password);
    if (!isPasswordValid) {
      const nuevosIntentos = usuario.intentosFallidos + 1;
      const debeBloquear = nuevosIntentos >= 3;

      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: nuevosIntentos,
          bloqueado: debeBloquear,
        },
      });

      if (debeBloquear) {
        throw new UnauthorizedException('Tu cuenta ha sido bloqueada por seguridad debido a 3 intentos fallidos de inicio de sesión. Por favor contacta al administrador del sistema.');
      } else {
        throw new UnauthorizedException(`Credenciales inválidas. Intentos fallidos: ${nuevosIntentos}/3`);
      }
    }

    // Si el login fue exitoso, resetear intentos fallidos (si tenía alguno)
    if (usuario.intentosFallidos > 0) {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { intentosFallidos: 0 },
      });
    }

    // Excluir contraseña
    const { password: _, ...result } = usuario;
    return result;
  }

  async login(user: any) {
    const sessionToken = crypto.randomUUID();

    // Guardar el token de sesión única en la base de datos para invalidar inicios de sesión previos en otras máquinas
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { sessionToken },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      empresaId: user.empresaId,
      sucursalId: user.sucursalId,
      roles: user.roles.map((r: any) => r.rol?.nombre || r.rol?.nombre || r.rol),
      requiereCambioPassword: user.requiereCambioPassword,
      sessionToken,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        empresaId: user.empresaId,
        sucursalId: user.sucursalId,
        roles: payload.roles,
        requiereCambioPassword: user.requiereCambioPassword,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, nombre, apellido, empresaId, sucursalId, roles } = registerDto;

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
      const sucursal = await this.prisma.sucursal.findUnique({
        where: { id: sucursalId },
      });
      if (!sucursal) {
        throw new BadRequestException('La sucursal especificada no existe');
      }
    }

    // 4. Encriptar contraseña
    const passwordHash = await argon2.hash(password);

    // 5. Crear usuario y asignar roles
    const rolesEnDb = await this.prisma.rol.findMany({
      where: {
        nombre: { in: roles },
      },
    });

    if (rolesEnDb.length === 0) {
      throw new BadRequestException('Ninguno de los roles especificados es válido');
    }

    const nuevoUsuario = await this.prisma.usuario.create({
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

    const { password: _, ...result } = nuevoUsuario;
    return result;
  }
}
