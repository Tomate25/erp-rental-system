import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';
import { TipoProveedor } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateProviderDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const nombre = createDto.nombre.trim();
    const existing = await this.prisma.proveedor.findFirst({
      where: {
        empresaId,
        nombre: { equals: nombre, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un proveedor registrado con el nombre "${nombre}".`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const proveedor = await tx.proveedor.create({
        data: {
          empresaId,
          nombre,
          razonSocial: createDto.razonSocial?.trim() || null,
          identificacion: createDto.identificacion?.trim() || null,
          telefono: createDto.telefono?.trim() || null,
          email: createDto.email?.trim() || null,
          direccion: createDto.direccion?.trim() || null,
          contacto: createDto.contacto?.trim() || null,
          tipo: createDto.tipo ?? TipoProveedor.MAQUINARIA_EXTERNA,
          condicionPago: createDto.condicionPago?.trim() || 'CONTADO',
          plazoCreditoDias: createDto.plazoCreditoDias ?? 0,
          notas: createDto.notas?.trim() || null,
          activo: createDto.activo ?? true,
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PROVEEDOR_CREADO',
        entidadTipo: 'PROVEEDOR',
        entidadId: proveedor.id,
        detalles: { nombre: proveedor.nombre, tipo: proveedor.tipo },
      });

      return proveedor;
    });
  }

  async findAll(
    empresaId: string,
    options?: {
      tipo?: TipoProveedor;
      activo?: boolean;
      search?: string;
    },
  ) {
    const where: any = { empresaId };

    if (options?.tipo) {
      where.tipo = options.tipo;
    }

    if (options?.activo !== undefined) {
      where.activo = options.activo;
    }

    if (options?.search) {
      const q = options.search.trim();
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { razonSocial: { contains: q, mode: 'insensitive' } },
        { identificacion: { contains: q, mode: 'insensitive' } },
        { contacto: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.proveedor.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { equipos: true },
        },
      },
    });
  }

  async findOne(id: string, empresaId: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id, empresaId },
      include: {
        equipos: {
          select: {
            id: true,
            codigo: true,
            modelo: true,
            numeroSerie: true,
            estado: true,
            precioProveedor: true,
            disponibleParaRenta: true,
          },
        },
      },
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID "${id}" no encontrado.`);
    }

    return proveedor;
  }

  async update(
    id: string,
    updateDto: UpdateProviderDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    await this.findOne(id, empresaId);

    if (updateDto.nombre) {
      const nombre = updateDto.nombre.trim();
      const duplicate = await this.prisma.proveedor.findFirst({
        where: {
          empresaId,
          nombre: { equals: nombre, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Ya existe otro proveedor registrado con el nombre "${nombre}".`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.proveedor.update({
        where: { id },
        data: {
          nombre: updateDto.nombre ? updateDto.nombre.trim() : undefined,
          razonSocial:
            updateDto.razonSocial !== undefined
              ? updateDto.razonSocial?.trim() || null
              : undefined,
          identificacion:
            updateDto.identificacion !== undefined
              ? updateDto.identificacion?.trim() || null
              : undefined,
          telefono:
            updateDto.telefono !== undefined
              ? updateDto.telefono?.trim() || null
              : undefined,
          email:
            updateDto.email !== undefined
              ? updateDto.email?.trim() || null
              : undefined,
          direccion:
            updateDto.direccion !== undefined
              ? updateDto.direccion?.trim() || null
              : undefined,
          contacto:
            updateDto.contacto !== undefined
              ? updateDto.contacto?.trim() || null
              : undefined,
          tipo: updateDto.tipo,
          condicionPago:
            updateDto.condicionPago !== undefined
              ? updateDto.condicionPago?.trim() || 'CONTADO'
              : undefined,
          plazoCreditoDias: updateDto.plazoCreditoDias,
          notas:
            updateDto.notas !== undefined
              ? updateDto.notas?.trim() || null
              : undefined,
          activo: updateDto.activo,
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PROVEEDOR_ACTUALIZADO',
        entidadTipo: 'PROVEEDOR',
        entidadId: updated.id,
        detalles: { cambios: updateDto },
      });

      return updated;
    });
  }

  async remove(id: string, empresaId: string, usuarioId?: string) {
    const proveedor = await this.findOne(id, empresaId);

    // Si tiene equipos asignados, se desactiva lógicamente en lugar de romper integridad
    if (proveedor.equipos?.length > 0) {
      return this.update(id, { activo: false }, empresaId, usuarioId);
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.proveedor.delete({
        where: { id },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PROVEEDOR_ELIMINADO',
        entidadTipo: 'PROVEEDOR',
        entidadId: id,
        detalles: { nombre: deleted.nombre },
      });

      return { success: true, message: 'Proveedor eliminado correctamente.' };
    });
  }
}
