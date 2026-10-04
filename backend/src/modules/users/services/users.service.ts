import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createUserDto: CreateUserDto,
    empresaId: string,
    currentUserId?: string,
  ) {
    const { email, password, nombre, apellido, sucursalId, roles } =
      createUserDto;

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
        throw new BadRequestException(
          'La sucursal seleccionada no existe o no pertenece a tu empresa',
        );
      }
    }

    // 3. Encriptar contraseña con Argon2
    const passwordHash = await argon2.hash(password);

    // 4. Verificar que todos los roles seleccionados existan y sean válidos para el tenant (roles de sistema o de la empresa)
    const rolesEnDb = await this.prisma.rol.findMany({
      where: {
        id: { in: roles },
        OR: [{ empresaId: null }, { empresaId }],
      },
    });

    if (rolesEnDb.length !== roles.length) {
      throw new BadRequestException(
        'Uno o más roles seleccionados no existen o pertenecen a otra empresa',
      );
    }

    // 5. Crear usuario y asociar roles
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
          accion: 'USUARIO_CREADO',
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
      const { password: _, sessionToken: __, ...result } = user;
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

    const { password: _, sessionToken: __, ...result } = usuario;
    return {
      ...result,
      roles: (usuario.roles || []).map((ur) => ur.rol),
    };
  }

  /** Indica si el usuario tiene el rol ADMIN entre sus roles cargados. */
  private esAdministrador(roles: unknown[] | undefined | null): boolean {
    return (roles || []).some((r) => {
      const item = r as {
        nombre?: string;
        rol?: { nombre?: string };
      } | null;
      return Boolean(
        item && (item.rol?.nombre === 'ADMIN' || item.nombre === 'ADMIN'),
      );
    });
  }

  /**
   * Cuenta administradores activos SOLO de la empresa indicada. El rol ADMIN
   * se filtra por tenant (rol propio o de sistema con empresaId null), de modo
   * que un ADMIN de otra empresa jamás cuenta ni se confunde.
   */
  private contarAdminsActivos(
    tx: Prisma.TransactionClient,
    empresaId: string,
  ): Promise<number> {
    return tx.usuario.count({
      where: {
        empresaId,
        activo: true,
        roles: {
          some: {
            rol: {
              nombre: 'ADMIN',
              OR: [{ empresaId }, { empresaId: null }],
            },
          },
        },
      },
    });
  }

  async updateRoles(
    id: string,
    updateDto: UpdateUserRolesDto,
    empresaId: string,
    currentUserId?: string,
  ) {
    const { rolIds } = updateDto;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Bloqueo pesimista exclusivo a nivel de empresa para serializar mutaciones concurrentes de roles
      if (tx.$executeRaw) {
        await tx.$executeRaw`SELECT id FROM "empresas" WHERE id = ${empresaId} FOR UPDATE`;
      }

      // 2. Verificar existencia del usuario dentro del tenant
      const usuario = await tx.usuario.findFirst({
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

      // 3. Verificar que los roles existan en la BD y pertenezcan al tenant o al sistema
      const rolesEnDb = await tx.rol.findMany({
        where: {
          id: { in: rolIds },
          OR: [{ empresaId: null }, { empresaId }],
        },
      });

      if (rolesEnDb.length !== rolIds.length) {
        throw new BadRequestException(
          'Uno o más roles seleccionados no existen o pertenecen a otra empresa',
        );
      }

      // 4. Proteger contra orfandad administrativa atómica del tenant:
      // Si el usuario era ADMIN y la nueva lista de roles no incluye ADMIN,
      // validar bajo bloqueo exclusivo que quede al menos otro administrador activo en la empresa.
      // El rol ADMIN se resuelve SIEMPRE dentro del alcance del tenant (rol propio
      // de la empresa o rol de sistema con empresaId null), nunca el de otra empresa.
      const conservaAdmin = rolesEnDb.some((rol) => rol.nombre === 'ADMIN');
      if (!conservaAdmin && this.esAdministrador(usuario.roles)) {
        const totalAdminsActivos = await this.contarAdminsActivos(
          tx,
          empresaId,
        );
        if (totalAdminsActivos <= 1) {
          throw new BadRequestException(
            'No se puede revocar el rol ADMIN al único administrador activo de la empresa',
          );
        }
      }

      // 5. Reemplazar roles de forma atómica dentro de la transacción
      await tx.usuarioRol.deleteMany({
        where: { usuarioId: id },
      });

      await tx.usuarioRol.createMany({
        data: rolesEnDb.map((rol) => ({
          usuarioId: id,
          rolId: rol.id,
        })),
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: currentUserId ?? null,
        accion: 'USUARIO_ROLES_ACTUALIZADOS',
        entidadTipo: 'USUARIO',
        entidadId: id,
        detalles: {
          rolesAnteriores: (usuario.roles || []).map((item) => {
            const role = item as unknown as {
              rol?: { nombre?: string };
              nombre?: string;
              rolId?: string;
            };
            return role.rol?.nombre ?? role.nombre ?? role.rolId ?? 'UNKNOWN';
          }),
          rolesNuevos: rolesEnDb.map((rol) => rol.nombre),
        },
      });

      return {
        success: true,
        message: 'Roles del usuario actualizados con éxito',
      };
    });
  }

  async toggleStatus(id: string, currentUserId: string, empresaId: string) {
    if (id === currentUserId) {
      throw new BadRequestException(
        'No puedes desactivarte a ti mismo en el sistema',
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Bloqueo pesimista exclusivo a nivel de empresa para serializar desactivaciones concurrentes
      if (tx.$executeRaw) {
        await tx.$executeRaw`SELECT id FROM "empresas" WHERE id = ${empresaId} FOR UPDATE`;
      }

      // 2. Verificar existencia del usuario dentro del tenant
      const usuario = await tx.usuario.findFirst({
        where: { id, empresaId },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      if (!usuario) {
        throw new NotFoundException(`No se encontró el usuario con ID: ${id}`);
      }

      // 3. Si el usuario está activo y se va a desactivar, verificar bajo cerrojo que no sea el único ADMIN activo
      if (usuario.activo && this.esAdministrador(usuario.roles)) {
        const totalAdminsActivos = await this.contarAdminsActivos(
          tx,
          empresaId,
        );
        if (totalAdminsActivos <= 1) {
          throw new BadRequestException(
            'No se puede desactivar al único administrador activo de la empresa',
          );
        }
      }

      const usuarioActualizado = (await tx.usuario.update({
        where: { id },
        data: {
          activo: !usuario.activo,
        },
      })) || { activo: !usuario.activo };

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: currentUserId,
        accion: usuarioActualizado.activo
          ? 'USUARIO_ACTIVADO'
          : 'USUARIO_DESACTIVADO',
        entidadTipo: 'USUARIO',
        entidadId: id,
        detalles: {
          activoAnterior: usuario.activo,
          activoNuevo: usuarioActualizado.activo,
        },
      });

      return {
        success: true,
        message: `Usuario ${usuarioActualizado.activo ? 'activado' : 'desactivado'} con éxito`,
        activo: usuarioActualizado.activo,
      };
    });
  }

  async unlockAndResetPassword(
    id: string,
    empresaId: string,
    currentUserId?: string,
  ) {
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
      randCode += chars.charAt(randomInt(chars.length));
    }
    const tempPassword = `TEMP-${randCode}`;
    const passwordHash = await argon2.hash(tempPassword);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.usuario.update({
        where: { id },
        data: {
          password: passwordHash,
          bloqueado: false,
          bloqueadoHasta: null,
          intentosFallidos: 0,
          requiereCambioPassword: true,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: currentUserId ?? null,
        accion: 'USUARIO_DESBLOQUEADO',
        entidadTipo: 'USUARIO',
        entidadId: id,
        detalles: { requiereCambioPassword: true },
      });
    });

    return {
      success: true,
      message: 'Usuario desbloqueado con éxito y contraseña temporal generada.',
      tempPassword,
    };
  }

  async forceChangePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        password: true,
        bloqueado: true,
        bloqueadoHasta: true,
        empresaId: true,
      },
    });
    if (!usuario || !(await argon2.verify(usuario.password, oldPassword))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (usuario.bloqueado && !usuario.bloqueadoHasta) {
      throw new ForbiddenException(
        'La cuenta está bloqueada por administración y no puede cambiar contraseña.',
      );
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.usuario.update({
        where: { id: userId },
        data: {
          password: passwordHash,
          requiereCambioPassword: false,
          intentosFallidos: 0,
          bloqueado: usuario.bloqueado && !usuario.bloqueadoHasta,
          bloqueadoHasta: null,
        },
      });
      await recordAuditInTx(tx, {
        empresaId: usuario.empresaId,
        usuarioId: userId,
        accion: 'USUARIO_PASSWORD_CAMBIADO',
        entidadTipo: 'USUARIO',
        entidadId: userId,
        detalles: { requiereCambioPassword: false },
      });
    });

    return {
      success: true,
      message: 'Tu contraseña ha sido actualizada con éxito.',
    };
  }
}
