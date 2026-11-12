import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePromocionDto } from '../dto/create-promocion.dto';
import { UpdatePromocionDto } from '../dto/update-promocion.dto';
import { Prisma } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreatePromocionDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const codigo = createDto.codigo.trim().toUpperCase();
    const existing = await this.prisma.promocion.findFirst({
      where: {
        empresaId,
        codigo: { equals: codigo, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una promoción con el código "${codigo}".`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const promocion = await tx.promocion.create({
        data: {
          empresaId,
          codigo,
          nombre: createDto.nombre.trim(),
          descripcion: createDto.descripcion?.trim() || null,
          precioCombo: new Prisma.Decimal(createDto.precioCombo),
          tipoCobro: createDto.tipoCobro ?? 'POR_DIA',
          diasMinimos: createDto.diasMinimos ?? 1,
          fechaInicio: createDto.fechaInicio
            ? new Date(createDto.fechaInicio)
            : null,
          fechaFin: createDto.fechaFin ? new Date(createDto.fechaFin) : null,
          activo: createDto.activo ?? true,
        },
      });

      if (createDto.items && createDto.items.length > 0) {
        await tx.promocionItem.createMany({
          data: createDto.items.map((item) => ({
            promocionId: promocion.id,
            productoId: item.productoId || null,
            cantidad: item.cantidad,
            precioUnitarioSugerido:
              item.precioUnitarioSugerido !== undefined &&
              item.precioUnitarioSugerido !== null
                ? new Prisma.Decimal(item.precioUnitarioSugerido)
                : null,
            notas: item.notas?.trim() || null,
          })),
        });
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PROMOCION_CREADA',
        entidadTipo: 'PROMOCION',
        entidadId: promocion.id,
        detalles: {
          codigo: promocion.codigo,
          nombre: promocion.nombre,
          precioCombo: promocion.precioCombo.toString(),
          itemsCount: createDto.items?.length || 0,
        },
      });

      return tx.promocion.findUnique({
        where: { id: promocion.id },
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  codigo: true,
                  precioRentaDia: true,
                  categoria: { select: { nombre: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  async findAll(
    empresaId: string,
    options?: {
      activo?: boolean;
      search?: string;
    },
  ) {
    const where: Prisma.PromocionWhereInput = { empresaId };

    if (options?.activo !== undefined) {
      where.activo = options.activo;
    }

    if (options?.search) {
      const term = options.search.trim();
      where.OR = [
        { nombre: { contains: term, mode: 'insensitive' } },
        { codigo: { contains: term, mode: 'insensitive' } },
        { descripcion: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.promocion.findMany({
      where,
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                precioRentaDia: true,
                categoria: { select: { nombre: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, empresaId: string) {
    const promocion = await this.prisma.promocion.findFirst({
      where: { id, empresaId },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                precioRentaDia: true,
                categoria: { select: { nombre: true } },
              },
            },
          },
        },
        cotizaciones: {
          select: {
            id: true,
            numeroCotizacion: true,
            fechaEmision: true,
            total: true,
            estado: true,
            cliente: { select: { nombre: true } },
          },
          take: 10,
          orderBy: { fechaEmision: 'desc' },
        },
      },
    });

    if (!promocion) {
      throw new NotFoundException(`Promoción no encontrada.`);
    }

    return promocion;
  }

  async update(
    id: string,
    updateDto: UpdatePromocionDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    await this.findOne(id, empresaId);

    if (updateDto.codigo) {
      const codigo = updateDto.codigo.trim().toUpperCase();
      const duplicate = await this.prisma.promocion.findFirst({
        where: {
          empresaId,
          codigo: { equals: codigo, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          `Ya existe otra promoción con el código "${codigo}".`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.PromocionUpdateInput = {};

      if (updateDto.codigo) updateData.codigo = updateDto.codigo.trim().toUpperCase();
      if (updateDto.nombre) updateData.nombre = updateDto.nombre.trim();
      if (updateDto.descripcion !== undefined)
        updateData.descripcion = updateDto.descripcion?.trim() || null;
      if (updateDto.precioCombo !== undefined)
        updateData.precioCombo = new Prisma.Decimal(updateDto.precioCombo);
      if (updateDto.tipoCobro) updateData.tipoCobro = updateDto.tipoCobro;
      if (updateDto.diasMinimos !== undefined)
        updateData.diasMinimos = updateDto.diasMinimos;
      if (updateDto.fechaInicio !== undefined)
        updateData.fechaInicio = updateDto.fechaInicio
          ? new Date(updateDto.fechaInicio)
          : null;
      if (updateDto.fechaFin !== undefined)
        updateData.fechaFin = updateDto.fechaFin
          ? new Date(updateDto.fechaFin)
          : null;
      if (updateDto.activo !== undefined) updateData.activo = updateDto.activo;

      await tx.promocion.update({
        where: { id },
        data: updateData,
      });

      if (updateDto.items !== undefined) {
        await tx.promocionItem.deleteMany({ where: { promocionId: id } });
        if (updateDto.items.length > 0) {
          await tx.promocionItem.createMany({
            data: updateDto.items.map((item) => ({
              promocionId: id,
              productoId: item.productoId || null,
              cantidad: item.cantidad,
              precioUnitarioSugerido:
                item.precioUnitarioSugerido !== undefined &&
                item.precioUnitarioSugerido !== null
                  ? new Prisma.Decimal(item.precioUnitarioSugerido)
                  : null,
              notas: item.notas?.trim() || null,
            })),
          });
        }
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PROMOCION_ACTUALIZADA',
        entidadTipo: 'PROMOCION',
        entidadId: id,
        detalles: { updateFields: Object.keys(updateDto) },
      });

      return tx.promocion.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  codigo: true,
                  precioRentaDia: true,
                  categoria: { select: { nombre: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  async remove(id: string, empresaId: string, usuarioId?: string) {
    const promocion = await this.findOne(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Si tiene cotizaciones asociadas, desactivamos en vez de borrado físico duro
      const countCotizaciones = await tx.cotizacion.count({
        where: { promocionId: id },
      });

      if (countCotizaciones > 0) {
        await tx.promocion.update({
          where: { id },
          data: { activo: false },
        });

        await recordAuditInTx(tx, {
          empresaId,
          usuarioId,
          accion: 'PROMOCION_DESACTIVADA',
          entidadTipo: 'PROMOCION',
          entidadId: id,
          detalles: {
            motivo: 'Desactivada por tener cotizaciones vinculadas',
            cotizacionesVinculadas: countCotizaciones,
          },
        });

        return {
          message:
            'La promoción tiene cotizaciones vinculadas y fue desactivada en el catálogo.',
        };
      }

      await tx.promocionItem.deleteMany({ where: { promocionId: id } });
      await tx.promocion.delete({ where: { id } });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PROMOCION_ELIMINADA',
        entidadTipo: 'PROMOCION',
        entidadId: id,
        detalles: { codigo: promocion.codigo, nombre: promocion.nombre },
      });

      return { message: 'Promoción eliminada con éxito del catálogo.' };
    });
  }
}
