import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, empresaId: string) {
    const { email, password, nombre, apellido, sucursalId, roles } = createUserDto;

    // 1. Verificar duplicidad de correo
    const userExists = await this.prisma.usuario.findUnique({
      where: { email },
    });
    if (userExists) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // 2. Verificar que la sucursal exista (si se proporciona) y pertenezca a la empresa
    if (sucursalId) {
      const sucursal = await this.prisma.sucursal.findFirst({
        where: { id: sucursalId, empresaId },
      });
      if (!sucursal) {
        throw new BadRequestException('La sucursal seleccionada no existe o no pertenece a tu empresa');
      }
    }

    // 3. Encriptar contraseña con Argon2
    const passwordHash = await argon2.hash(password);

    // 4. Verificar que los roles existan
    const rolesEnDb = await this.prisma.rol.findMany({
      where: {
        id: { in: roles },
      },
    });

    if (rolesEnDb.length === 0) {
      throw new BadRequestException('Ninguno de los roles seleccionados es válido');
    }

    // 5. Crear usuario y asociar roles
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

  async findAll(empresaId: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
        sucursal: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return usuarios.map((user) => {
      const { password: _, ...result } = user;
      return {
        ...result,
        roles: user.roles.map((ur) => ({
          id: ur.rol.id,
          nombre: ur.rol.nombre,
          descripcion: ur.rol.descripcion,
        })),
      };
    });
  }

  async findOne(id: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
        sucursal: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario con ID: ${id}`);
    }

    const { password: _, ...result } = usuario;
    return {
      ...result,
      roles: usuario.roles.map((ur) => ur.rol),
    };
  }

  async updateRoles(id: string, updateDto: UpdateUserRolesDto, empresaId: string) {
    // Verificar existencia del usuario
    await this.findOne(id, empresaId);

    const { rolIds } = updateDto;

    // Verificar que los roles existan en la BD
    const rolesEnDb = await this.prisma.rol.findMany({
      where: { id: { in: rolIds } },
    });

    if (rolesEnDb.length === 0) {
      throw new BadRequestException('Ninguno de los roles seleccionados es válido');
    }

    // Transacción para reemplazar roles
    await this.prisma.$transaction(async (tx) => {
      // Borrar asociaciones previas
      await tx.usuarioRol.deleteMany({
        where: { usuarioId: id },
      });

      // Crear nuevas asociaciones
      await tx.usuarioRol.createMany({
        data: rolesEnDb.map((rol) => ({
          usuarioId: id,
          rolId: rol.id,
        })),
      });
    });

    return {
      success: true,
      message: 'Roles del usuario actualizados con éxito',
    };
  }

  async toggleStatus(id: string, currentUserId: string, empresaId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes desactivarte a ti mismo en el sistema');
    }

    const usuario = await this.findOne(id, empresaId);

    const usuarioActualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        activo: !usuario.activo,
      },
    });

    return {
      success: true,
      message: `Usuario ${usuarioActualizado.activo ? 'activado' : 'desactivado'} con éxito`,
      activo: usuarioActualizado.activo,
    };
  }

  async unlockAndResetPassword(id: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
    });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario con ID: ${id}`);
    }

    // Generar contraseña temporal legible (ej. TEMP-4A2D)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randCode = '';
    for (let i = 0; i < 6; i++) {
      randCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tempPassword = `TEMP-${randCode}`;
    const passwordHash = await argon2.hash(tempPassword);

    await this.prisma.usuario.update({
      where: { id },
      data: {
        password: passwordHash,
        bloqueado: false,
        intentosFallidos: 0,
        requiereCambioPassword: true,
      },
    });

    return {
      success: true,
      message: 'Usuario desbloqueado con éxito y contraseña temporal generada.',
      tempPassword,
    };
  }

  async forceChangePassword(userId: string, newPassword: string) {
    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        requiereCambioPassword: false,
        intentosFallidos: 0,
        bloqueado: false,
      },
    });

    return {
      success: true,
      message: 'Tu contraseña ha sido actualizada con éxito.',
    };
  }
}
