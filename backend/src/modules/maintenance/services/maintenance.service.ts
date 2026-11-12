import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMaintenanceDto } from '../dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from '../dto/update-maintenance.dto';
import { EstadoContrato, EstadoEquipo, EstadoMantenimiento, Prisma, TipoControlEquipo } from '@prisma/client';
import { isOcupado } from '../../../common/utils/equipment-status.util';
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
    if (estadoInicial === EstadoMantenimiento.EN_PROCESO && isOcupado(equipo.estado)) {
      throw new BadRequestException(
        'No se puede iniciar mantenimiento en proceso para un equipo despachado o reservado.',
      );
    }
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
        if (equipo.tipoControl === TipoControlEquipo.POR_CANTIDAD) {
          const available = equipo.cantidadDisponible ?? 0;
          await tx.equipo.update({
            where: { id: equipoId },
            data: {
              estado: available > 0 ? EstadoEquipo.DISPONIBLE : EstadoEquipo.DESPACHADO,
              horometroUltimoServicio: horometerVal,
            },
          });
        } else {
          const contratoVivo = tx.detalleContrato?.findFirst
            ? await tx.detalleContrato.findFirst({
                where: {
                  equipoId,
                  contrato: {
                    estado: { in: [EstadoContrato.SIN_ABRIR, EstadoContrato.ACTIVO, EstadoContrato.EN_DISPUTA] },
                  },
                },
                include: { contrato: true },
              })
            : null;
          const estadoFinal = contratoVivo
            ? (contratoVivo.contrato.estado === EstadoContrato.ACTIVO ? EstadoEquipo.DESPACHADO : EstadoEquipo.RESERVADO)
            : EstadoEquipo.DISPONIBLE;
          await tx.equipo.update({
            where: { id: equipoId },
            data: {
              estado: estadoFinal,
              ...(contratoVivo ? { cantidadDisponible: 0 } : {}),
              horometroUltimoServicio: horometerVal,
            },
          });
        }
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
      aplicaIva: gasto.aplicaIva || (gasto.tipo === 'MANO_OBRA' ? 'EXENTO' : 'INCLUIDO'),
      insumoId: gasto.insumoId || null,
      cantidad: gasto.cantidad ? Number(gasto.cantidad) : null,
    }));
    if (gastos?.some((gasto) => !gasto.descripcion || !Number.isFinite(gasto.monto) || gasto.monto <= 0)) {
      throw new BadRequestException('Cada gasto debe tener descripción y monto positivo.');
    }
    const costoReal = gastos
      ? Math.round(
          gastos.reduce((sum, gasto) => {
            const m = Number(gasto.monto);
            if (gasto.aplicaIva === 'MAS_IVA') {
              const sub = Math.round(m * 100) / 100;
              const iv = Math.round(sub * 0.15 * 100) / 100;
              return sum + sub + iv;
            }
            return sum + m;
          }, 0) * 100,
        ) / 100
      : undefined;

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

      // Registrar consumos de insumos de bodega y descontar stock al completar
      if (gastos && updateDto.estado === EstadoMantenimiento.COMPLETADO && tx.consumoInsumo && tx.insumo) {
        for (const gasto of gastos) {
          if (gasto.insumoId && gasto.cantidad && Number(gasto.cantidad) > 0) {
            await tx.consumoInsumo.create({
              data: {
                mantenimientoId: id,
                insumoId: gasto.insumoId,
                cantidad: gasto.cantidad,
                costoUnitario: Math.round((gasto.monto / gasto.cantidad) * 100) / 100,
                total: gasto.monto,
              },
            });
            await tx.insumo.update({
              where: { id: gasto.insumoId },
              data: {
                stockActual: {
                  decrement: gasto.cantidad,
                },
              },
            });
          }
        }
      }

      // Actualizar estado del equipo si el estado del mantenimiento cambió
      if (updateDto.estado && updateDto.estado !== existing.estado) {
        const equipoActual =
          existing.equipo ||
          (tx.equipo?.findFirst
            ? await tx.equipo.findFirst({ where: { id: existing.equipoId } })
            : null);
        const tipoControl =
          equipoActual?.tipoControl || TipoControlEquipo.SERIALIZADO;
        const estadoActual = equipoActual?.estado;
        const cantDisp = equipoActual?.cantidadDisponible ?? 0;
        const cantTotal = equipoActual?.cantidadTotal ?? 1;

        if (updateDto.estado === EstadoMantenimiento.EN_PROCESO) {
          if (estadoActual && isOcupado(estadoActual)) {
            throw new BadRequestException(
              'No se puede iniciar mantenimiento en proceso para un equipo despachado o reservado.',
            );
          }
          await tx.equipo.update({
            where: { id: existing.equipoId },
            data: { estado: EstadoEquipo.EN_MANTENIMIENTO },
          });
        } else if (updateDto.estado === EstadoMantenimiento.COMPLETADO) {
          if (tipoControl === TipoControlEquipo.POR_CANTIDAD) {
            const repairedQuantity = existing.detalleDevolucionId
              ? Number(existing.detalleDevolucion?.cantidadDañada || 0)
              : 0;
            const available = Math.min(cantTotal, cantDisp + repairedQuantity);
            await tx.equipo.update({
              where: { id: existing.equipoId },
              data: {
                estado: available > 0 ? EstadoEquipo.DISPONIBLE : EstadoEquipo.DESPACHADO,
                cantidadDisponible: available,
                horometroUltimoServicio: updated.horometroServicio,
              },
            });
          } else {
            let estadoFinal: EstadoEquipo = EstadoEquipo.DISPONIBLE;
            let contratoVivo: any = null;
            if (!existing.detalleDevolucionId && tx.detalleContrato?.findFirst) {
              contratoVivo = await tx.detalleContrato.findFirst({
                where: {
                  equipoId: existing.equipoId,
                  contrato: {
                    estado: { in: [EstadoContrato.SIN_ABRIR, EstadoContrato.ACTIVO, EstadoContrato.EN_DISPUTA] },
                  },
                },
                include: { contrato: true },
              });
              if (contratoVivo) {
                estadoFinal =
                  contratoVivo.contrato.estado === EstadoContrato.ACTIVO
                    ? EstadoEquipo.DESPACHADO
                    : EstadoEquipo.RESERVADO;
              }
            }
            await tx.equipo.update({
              where: { id: existing.equipoId },
              data: {
                estado: estadoFinal,
                ...(existing.detalleDevolucionId ? { cantidadDisponible: 1 } : contratoVivo ? { cantidadDisponible: 0 } : {}),
                horometroUltimoServicio: updated.horometroServicio,
              },
            });
          }
        } else if (
          updateDto.estado === EstadoMantenimiento.CANCELADO &&
          existing.estado === EstadoMantenimiento.EN_PROCESO
        ) {
          if (tipoControl === TipoControlEquipo.POR_CANTIDAD) {
            await tx.equipo.update({
              where: { id: existing.equipoId },
              data: {
                estado: cantDisp > 0 ? EstadoEquipo.DISPONIBLE : EstadoEquipo.DESPACHADO,
              },
            });
          } else {
            let estadoFinal: EstadoEquipo = EstadoEquipo.DISPONIBLE;
            let contratoVivo: any = null;
            if (!existing.detalleDevolucionId && tx.detalleContrato?.findFirst) {
              contratoVivo = await tx.detalleContrato.findFirst({
                where: {
                  equipoId: existing.equipoId,
                  contrato: {
                    estado: { in: [EstadoContrato.SIN_ABRIR, EstadoContrato.ACTIVO, EstadoContrato.EN_DISPUTA] },
                  },
                },
                include: { contrato: true },
              });
              if (contratoVivo) {
                estadoFinal =
                  contratoVivo.contrato.estado === EstadoContrato.ACTIVO
                    ? EstadoEquipo.DESPACHADO
                    : EstadoEquipo.RESERVADO;
              }
            }
            await tx.equipo.update({
              where: { id: existing.equipoId },
              data: {
                estado: estadoFinal,
                ...(contratoVivo ? { cantidadDisponible: 0 } : {}),
              },
            });
          }
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
