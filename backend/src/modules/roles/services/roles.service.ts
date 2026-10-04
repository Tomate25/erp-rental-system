import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { Prisma } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';
import { assertEmpresaId } from '../../../common/utils/tenant.util';

export const SYSTEM_ROLES: readonly string[] = [
  'ADMIN',
  'GERENTE',
  'COMERCIAL',
  'OPERACIONES',
  'FACTURACION',
  'CONTABILIDAD',
  'MANTENIMIENTO',
  'CLIENTE',
  // Usados en @Roles(...) de controladores (INVENTARIO) o reservados para uso futuro (TECNICO):
  // un admin de empresa no debe poder crear roles personalizados con estos nombres.
  'TECNICO',
  'INVENTARIO',
];

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createRoleDto: CreateRoleDto,
    empresaId: string,
    currentUserId?: string,
  ) {
    const nombreFormateado = createRoleDto.nombre.trim().toUpperCase();

    // 1. Evitar crear roles con nombres reservados del sistema
    if (SYSTEM_ROLES.includes(nombreFormateado)) {
      throw new ConflictException(
        `No se puede crear un rol con el nombre reservado del sistema "${nombreFormateado}"`,
      );
    }

    // 2. Evitar duplicar nombres de roles dentro del mismo tenant (empresa)
    const rolExists = await this.prisma.rol.findFirst({
      where: {
        nombre: nombreFormateado,
        empresaId,
      },
    });

    if (rolExists) {
      throw new ConflictException(
        `Ya existe un rol con el nombre "${nombreFormateado}" en esta empresa`,
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rol = await tx.rol.create({
        data: {
          nombre: nombreFormateado,
          descripcion: createRoleDto.descripcion,
          empresaId,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: currentUserId ?? null,
        accion: 'ROL_CREADO',
        entidadTipo: 'ROL',
        entidadId: rol.id,
        detalles: { nombre: rol.nombre, descripcion: rol.descripcion },
      });
      return rol;
    });
  }

  async findAll(empresaId: string) {
    const roles = await this.prisma.rol.findMany({
      where: {
        OR: [{ empresaId: null }, { empresaId }],
      },
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
      empresaId: rol.empresaId,
      esSistema: !rol.empresaId || SYSTEM_ROLES.includes(rol.nombre),
      permisos: rol.permisos.map((rp) => ({
        id: rp.permiso.id,
        codigo: rp.permiso.codigo,
        descripcion: rp.permiso.descripcion,
      })),
      usuarioCount: rol.usuarios.length,
    }));
  }

  async findOne(id: string, empresaId: string) {
    assertEmpresaId(empresaId);
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

    // Aislamiento multi-tenant: un rol personalizado de otra empresa responde igual que
    // uno inexistente (404) para no revelar que existe en otro tenant.
    if (!rol || (rol.empresaId && rol.empresaId !== empresaId)) {
      throw new NotFoundException(`No se encontró el rol con ID: ${id}`);
    }

    return {
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      empresaId: rol.empresaId,
      esSistema: !rol.empresaId || SYSTEM_ROLES.includes(rol.nombre),
      permisos: rol.permisos.map((rp) => rp.permiso),
    };
  }

  async findAllPermissions() {
    return this.prisma.permiso.findMany({
      orderBy: { codigo: 'asc' },
    });
  }

  async updatePermissions(
    id: string,
    updateDto: UpdateRolePermissionsDto,
    empresaId: string,
    currentUserId?: string,
  ) {
    const rol = await this.findOne(id, empresaId);

    // 1. Impedir alterar los permisos de roles predeterminados del sistema
    if (SYSTEM_ROLES.includes(rol.nombre) || !rol.empresaId) {
      throw new BadRequestException(
        `Los permisos del rol del sistema "${rol.nombre}" son predeterminados e inmutables. No pueden ser modificados por ningún administrador.`,
      );
    }

    // 2. Pertenencia al tenant: findOne() ya respondio 404 para cualquier rol personalizado
    //    de otra empresa y el paso 1 descarta los roles globales (empresaId null), asi que
    //    aqui rol.empresaId === empresaId siempre. (Se elimino una rama Forbidden
    //    inalcanzable; la cobertura A->B esta en roles.service.spec.ts.)

    const { permisoIds } = updateDto;

    // 3. Validar existencia de permisos en catálogo
    if (permisoIds.length > 0) {
      const permisosExistentes = await this.prisma.permiso.findMany({
        where: { id: { in: permisoIds } },
      });
      if (permisosExistentes.length !== permisoIds.length) {
        throw new BadRequestException(
          'Uno o más permisos especificados no existen en el sistema',
        );
      }
    }

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

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: currentUserId ?? null,
        accion: 'ROL_PERMISOS_ACTUALIZADOS',
        entidadTipo: 'ROL',
        entidadId: id,
        detalles: {
          nombre: rol.nombre,
          permisosAnteriores: rol.permisos.map((permiso) => permiso.id),
          permisosNuevos: permisoIds,
        },
      });
    });

    return {
      success: true,
      message: 'Permisos del rol actualizados con éxito',
    };
  }

  async remove(id: string, empresaId: string, currentUserId?: string) {
    const rol = await this.findOne(id, empresaId);

    // 1. Impedir eliminar roles del sistema predeterminados
    if (SYSTEM_ROLES.includes(rol.nombre) || !rol.empresaId) {
      throw new BadRequestException(
        `El rol del sistema "${rol.nombre}" es predeterminado y no puede ser eliminado`,
      );
    }

    // 2. Pertenencia al tenant: igual que en updatePermissions, findOne() + el paso 1
    //    garantizan rol.empresaId === empresaId (rama Forbidden inalcanzable eliminada).

    // 3. Verificar si hay usuarios asociados a este rol en la empresa o globalmente
    const usuariosAsociados = await this.prisma.usuarioRol.count({
      where: {
        rolId: id,
      },
    });

    if (usuariosAsociados > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rol porque tiene ${usuariosAsociados} usuario(s) asignado(s) en el sistema. Reasigna a los usuarios antes de borrarlo.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolPermiso.deleteMany({ where: { rolId: id } });
      await tx.usuarioRol.deleteMany({ where: { rolId: id } });
      await tx.rol.delete({ where: { id } });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: currentUserId ?? null,
        accion: 'ROL_ELIMINADO',
        entidadTipo: 'ROL',
        entidadId: id,
        detalles: {
          nombre: rol.nombre,
          descripcion: rol.descripcion,
          permisos: rol.permisos.map((permiso) => permiso.id),
        },
      });
    });

    return {
      success: true,
      message: `Rol "${rol.nombre}" eliminado con éxito`,
    };
  }
}
