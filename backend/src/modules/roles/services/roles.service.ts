import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const nombreFormateado = createRoleDto.nombre.trim().toUpperCase();

    // 1. Evitar duplicar nombres de roles
    const rolExists = await this.prisma.rol.findUnique({
      where: { nombre: nombreFormateado },
    });

    if (rolExists) {
      throw new ConflictException(`Ya existe un rol con el nombre "${nombreFormateado}"`);
    }

    return this.prisma.rol.create({
      data: {
        nombre: nombreFormateado,
        descripcion: createRoleDto.descripcion,
      },
    });
  }

  async findAll(empresaId: string) {
    const roles = await this.prisma.rol.findMany({
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
        usuarios: {
          where: {
            usuario: {
              empresaId,
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return roles.map((rol) => ({
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      permisos: rol.permisos.map((rp) => ({
        id: rp.permiso.id,
        codigo: rp.permiso.codigo,
        descripcion: rp.permiso.descripcion,
      })),
      usuarioCount: rol.usuarios.length,
    }));
  }

  async findOne(id: string) {
    const rol = await this.prisma.rol.findUnique({
      where: { id },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException(`No se encontró el rol con ID: ${id}`);
    }

    return {
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      permisos: rol.permisos.map((rp) => rp.permiso),
    };
  }

  async findAllPermissions() {
    return this.prisma.permiso.findMany({
      orderBy: { codigo: 'asc' },
    });
  }

  async updatePermissions(id: string, updateDto: UpdateRolePermissionsDto) {
    await this.findOne(id);
    const { permisoIds } = updateDto;

    await this.prisma.$transaction(async (tx) => {
      await tx.rolPermiso.deleteMany({
        where: { rolId: id },
      });

      if (permisoIds.length > 0) {
        await tx.rolPermiso.createMany({
          data: permisoIds.map((permisoId) => ({
            rolId: id,
            permisoId,
          })),
        });
      }
    });

    return {
      success: true,
      message: 'Permisos del rol actualizados con éxito',
    };
  }

  async remove(id: string, empresaId: string) {
    const rol = await this.findOne(id);

    // 1. Impedir eliminar el rol ADMIN
    if (rol.nombre === 'ADMIN') {
      throw new BadRequestException('El rol de administrador principal (ADMIN) no puede ser eliminado');
    }

    // 2. Verificar si hay usuarios asociados a este rol en la empresa
    const usuariosAsociados = await this.prisma.usuarioRol.count({
      where: {
        rolId: id,
        usuario: {
          empresaId,
        },
      },
    });

    if (usuariosAsociados > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rol porque tiene ${usuariosAsociados} usuario(s) asignado(s). Reasigna a los usuarios antes de borrarlo.`,
      );
    }

    // 3. Eliminar relaciones y borrar el rol
    await this.prisma.$transaction(async (tx) => {
      await tx.rolPermiso.deleteMany({ where: { rolId: id } });
      await tx.usuarioRol.deleteMany({ where: { rolId: id } });
      await tx.rol.delete({ where: { id } });
    });

    return {
      success: true,
      message: 'Rol eliminado con éxito',
    };
  }
}
