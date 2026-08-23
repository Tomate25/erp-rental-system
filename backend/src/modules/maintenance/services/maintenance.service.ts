import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMaintenanceDto } from '../dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from '../dto/update-maintenance.dto';
import { EstadoEquipo, EstadoMantenimiento } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateMaintenanceDto, empresaId: string) {
    const { equipoId, tipo, estado, fechaProgramacion, fechaEjecucion, horometroServicio, descripcion, costo, insumosUtilizados } = createDto;

    const equipo = await this.prisma.equipo.findFirst({
      where: { id: equipoId, empresaId },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID: ${equipoId}`);
    }

    const estadoInicial = estado || EstadoMantenimiento.PROGRAMADO;
    const horometerVal = horometroServicio !== undefined ? horometroServicio : equipo.horometro;

    const mantenimiento = await this.prisma.mantenimiento.create({
      data: {
        equipoId,
        tipo,
        estado: estadoInicial,
        fechaProgramacion: new Date(fechaProgramacion),
        fechaEjecucion: fechaEjecucion ? new Date(fechaEjecucion) : (estadoInicial === EstadoMantenimiento.COMPLETADO ? new Date() : null),
        horometroServicio: horometerVal,
        descripcion,
        costo: costo || 0.0,
        insumosUtilizados,
      },
      include: {
        equipo: {
          include: { categoria: true, subcategoria: true, marca: true }
        }
      }
    });

    // Si entra directamente en proceso, cambiar estado de equipo
    if (estadoInicial === EstadoMantenimiento.EN_PROCESO) {
      await this.prisma.equipo.update({
        where: { id: equipoId },
        data: { estado: EstadoEquipo.EN_MANTENIMIENTO }
      });
    } else if (estadoInicial === EstadoMantenimiento.COMPLETADO) {
      await this.prisma.equipo.update({
        where: { id: equipoId },
        data: {
          estado: EstadoEquipo.DISPONIBLE,
          horometroUltimoServicio: horometerVal
        }
      });
    }

    return mantenimiento;
  }

  async findAll(empresaId: string, estado?: EstadoMantenimiento, equipoId?: string) {
    const whereClause: any = {
      equipo: { empresaId }
    };

    if (estado) whereClause.estado = estado;
    if (equipoId) whereClause.equipoId = equipoId;

    return this.prisma.mantenimiento.findMany({
      where: whereClause,
      include: {
        equipo: {
          include: { categoria: true, subcategoria: true, marca: true, sucursal: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, empresaId: string) {
    const mantenimiento = await this.prisma.mantenimiento.findFirst({
      where: {
        id,
        equipo: { empresaId }
      },
      include: {
        equipo: {
          include: { categoria: true, subcategoria: true, marca: true, sucursal: true }
        }
      }
    });

    if (!mantenimiento) {
      throw new NotFoundException(`No se encontró el registro de mantenimiento con ID: ${id}`);
    }

    return mantenimiento;
  }

  async update(id: string, updateDto: UpdateMaintenanceDto, empresaId: string) {
    const existing = await this.findOne(id, empresaId);

    const updated = await this.prisma.mantenimiento.update({
      where: { id },
      data: {
        tipo: updateDto.tipo,
        estado: updateDto.estado,
        fechaProgramacion: updateDto.fechaProgramacion ? new Date(updateDto.fechaProgramacion) : undefined,
        fechaEjecucion: updateDto.fechaEjecucion ? new Date(updateDto.fechaEjecucion) : (updateDto.estado === EstadoMantenimiento.COMPLETADO ? new Date() : undefined),
        horometroServicio: updateDto.horometroServicio,
        descripcion: updateDto.descripcion,
        costo: updateDto.costo,
        insumosUtilizados: updateDto.insumosUtilizados,
      },
      include: {
        equipo: {
          include: { categoria: true, subcategoria: true, marca: true, sucursal: true }
        }
      }
    });

    // Actualizar estado del equipo si el estado del mantenimiento cambió
    if (updateDto.estado && updateDto.estado !== existing.estado) {
      if (updateDto.estado === EstadoMantenimiento.EN_PROCESO) {
        await this.prisma.equipo.update({
          where: { id: existing.equipoId },
          data: { estado: EstadoEquipo.EN_MANTENIMIENTO }
        });
      } else if (updateDto.estado === EstadoMantenimiento.COMPLETADO) {
        await this.prisma.equipo.update({
          where: { id: existing.equipoId },
          data: {
            estado: EstadoEquipo.DISPONIBLE,
            horometroUltimoServicio: updated.horometroServicio
          }
        });
      } else if (updateDto.estado === EstadoMantenimiento.CANCELADO && existing.estado === EstadoMantenimiento.EN_PROCESO) {
        await this.prisma.equipo.update({
          where: { id: existing.equipoId },
          data: { estado: EstadoEquipo.DISPONIBLE }
        });
      }
    }

    return updated;
  }

  async remove(id: string, empresaId: string) {
    const existing = await this.findOne(id, empresaId);
    await this.prisma.mantenimiento.delete({ where: { id: existing.id } });
    return { success: true, message: 'Registro de mantenimiento eliminado exitosamente' };
  }
}
