import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMaintenanceDto } from '../dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from '../dto/update-maintenance.dto';
import { EstadoEquipo, EstadoMantenimiento, Prisma, TipoControlEquipo } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateMaintenanceDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      equipoId,
      tipo,
      estado,
      fechaProgramacion,
      fechaEjecucion,
      horometroServicio,
      descripcion,
      costo,
      insumosUtilizados,
    } = createDto;

    const equipo = await this.prisma.equipo.findFirst({
      where: { id: equipoId, empresaId },
    });

    if (!equipo) {
      throw new NotFoundException(
        `No se encontró el equipo con ID: ${equipoId}`,
      );
    }

    const estadoInicial = estado || EstadoMantenimiento.PROGRAMADO;
    const horometerVal =
      horometroServicio !== undefined ? horometroServicio : equipo.horometro;

    return this.prisma.$transaction(async (tx) => {
      const mantenimiento = await tx.mantenimiento.create({
        data: {
          equipoId,
          tipo,
          estado: estadoInicial,
          fechaProgramacion: new Date(fechaProgramacion),
          fechaEjecucion: fechaEjecucion
            ? new Date(fechaEjecucion)
            : estadoInicial === EstadoMantenimiento.COMPLETADO
              ? new Date()
              : null,
          horometroServicio: horometerVal,
          descripcion,
          costo: costo || 0.0,
          insumosUtilizados,
        },
        include: {
          equipo: {
            include: { categoria: true, subcategoria: true, marca: true },
          },
        },
      });

      if (estadoInicial === EstadoMantenimiento.EN_PROCESO) {
        await tx.equipo.update({
          where: { id: equipoId },
          data: { estado: EstadoEquipo.EN_MANTENIMIENTO },
        });
      } else if (estadoInicial === EstadoMantenimiento.COMPLETADO) {
        await tx.equipo.update({
          where: { id: equipoId },
          data: {
            estado: EstadoEquipo.DISPONIBLE,
            horometroUltimoServicio: horometerVal,
          },
        });
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'MANTENIMIENTO_CREADO',
        entidadTipo: 'MANTENIMIENTO',
        entidadId: mantenimiento.id,
        detalles: {
          equipoId,
          tipo,
          estado: estadoInicial,
          fechaProgramacion,
          costo: costo ?? 0,
        },
      });

      return mantenimiento;
    });
  }

  async findAll(
    empresaId: string,
    estado?: EstadoMantenimiento,
    equipoId?: string,
  ) {
    const whereClause: Prisma.MantenimientoWhereInput = {
      equipo: { empresaId },
    };

    if (estado) whereClause.estado = estado;
    if (equipoId) whereClause.equipoId = equipoId;

    return this.prisma.mantenimiento.findMany({
      where: whereClause,
      include: {
        equipo: {
          include: {
            categoria: true,
            subcategoria: true,
            marca: true,
            sucursal: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, empresaId: string) {
    const mantenimiento = await this.prisma.mantenimiento.findFirst({
      where: {
        id,
        equipo: { empresaId },
      },
      include: {
        detalleDevolucion: { include: { devolucion: { include: { facturaCargo: true } } } },
        equipo: {
          include: {
            categoria: true,
            subcategoria: true,
            marca: true,
            sucursal: true,
          },
        },
      },
    });

    if (!mantenimiento) {
      throw new NotFoundException(
        `No se encontró el registro de mantenimiento con ID: ${id}`,
      );
    }

    return mantenimiento;
  }

  async update(
    id: string,
    updateDto: UpdateMaintenanceDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const existing = await this.findOne(id, empresaId);
    if (existing.detalleDevolucion?.devolucion.facturaCargo) {
      throw new ConflictException('La reparación ya fue facturada y su costo no puede modificarse.');
    }
    if (existing.detalleDevolucionId && updateDto.costo !== undefined && !updateDto.gastos) {
      throw new BadRequestException('Desglose los gastos reales de la reparación antes de establecer su costo.');
    }
    const gastos = updateDto.gastos?.map((gasto) => ({
      tipo: gasto.tipo,
      descripcion: gasto.descripcion.trim(),
      monto: Math.round(Number(gasto.monto) * 100) / 100,
      comprobanteUrl: gasto.comprobanteUrl?.trim() || null,
      cobrableCliente: gasto.cobrableCliente ?? existing.cobrableCliente,
    }));
    if (gastos?.some((gasto) => !gasto.descripcion || !Number.isFinite(gasto.monto) || gasto.monto <= 0)) {
      throw new BadRequestException('Cada gasto debe tener descripción y monto positivo.');
    }
    const costoReal = gastos ? Math.round(gastos.reduce((sum, gasto) => sum + gasto.monto, 0) * 100) / 100 : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.mantenimiento.update({
        where: { id },
        data: {
          tipo: updateDto.tipo,
          estado: updateDto.estado,
          fechaProgramacion: updateDto.fechaProgramacion
            ? new Date(updateDto.fechaProgramacion)
            : undefined,
          fechaEjecucion: updateDto.fechaEjecucion
            ? new Date(updateDto.fechaEjecucion)
            : updateDto.estado === EstadoMantenimiento.COMPLETADO
              ? new Date()
              : undefined,
          horometroServicio: updateDto.horometroServicio,
          descripcion: updateDto.descripcion,
          costo: costoReal ?? updateDto.costo,
          gastos: gastos as Prisma.InputJsonValue | undefined,
          comprobantesUrls: gastos?.flatMap((gasto) => gasto.comprobanteUrl ? [gasto.comprobanteUrl] : []),
          insumosUtilizados: updateDto.insumosUtilizados,
        },
        include: {
          equipo: {
            include: {
              categoria: true,
              subcategoria: true,
              marca: true,
              sucursal: true,
            },
          },
        },
      });

      // Actualizar estado del equipo si el estado del mantenimiento cambió
      if (updateDto.estado && updateDto.estado !== existing.estado) {
        if (updateDto.estado === EstadoMantenimiento.EN_PROCESO) {
          await tx.equipo.update({
            where: { id: existing.equipoId },
            data: { estado: EstadoEquipo.EN_MANTENIMIENTO },
          });
        } else if (updateDto.estado === EstadoMantenimiento.COMPLETADO) {
          const repairedQuantity = existing.detalleDevolucionId
            ? existing.equipo.tipoControl === TipoControlEquipo.SERIALIZADO
              ? 1
              : Number(existing.detalleDevolucion?.cantidadDañada || 0)
            : 0;
          const available = repairedQuantity > 0
            ? Math.min(existing.equipo.cantidadTotal, existing.equipo.cantidadDisponible + repairedQuantity)
            : undefined;
          await tx.equipo.update({
            where: { id: existing.equipoId },
            data: {
              estado: EstadoEquipo.DISPONIBLE,
              ...(available !== undefined ? { cantidadDisponible: available } : {}),
              horometroUltimoServicio: updated.horometroServicio,
            },
          });
        } else if (
          updateDto.estado === EstadoMantenimiento.CANCELADO &&
          existing.estado === EstadoMantenimiento.EN_PROCESO
        ) {
          await tx.equipo.update({
            where: { id: existing.equipoId },
            data: { estado: EstadoEquipo.DISPONIBLE },
          });
        }
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion:
          updateDto.estado && updateDto.estado !== existing.estado
            ? `MANTENIMIENTO_ESTADO_${updateDto.estado}`
            : 'MANTENIMIENTO_ACTUALIZADO',
        entidadTipo: 'MANTENIMIENTO',
        entidadId: id,
        detalles: {
          equipoId: existing.equipoId,
          estadoAnterior: existing.estado,
          estadoNuevo: updated.estado,
          camposModificados: Object.keys(updateDto),
        },
      });

      return updated;
    });
  }

  async remove(id: string, empresaId: string, usuarioId?: string) {
    const existing = await this.findOne(id, empresaId);
    if (existing.detalleDevolucionId) {
      throw new ConflictException('Una reparación vinculada a un retorno no se puede eliminar.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.mantenimiento.delete({ where: { id: existing.id } });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'MANTENIMIENTO_ELIMINADO',
        entidadTipo: 'MANTENIMIENTO',
        entidadId: existing.id,
        detalles: {
          equipoId: existing.equipoId,
          tipo: existing.tipo,
          estado: existing.estado,
        },
      });
      return {
        success: true,
        message: 'Registro de mantenimiento eliminado exitosamente',
      };
    });
  }
}
