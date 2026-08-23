import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  CreateDespachoDto, 
  CreateRetornoDto, 
  CreateSolicitudDespachoDto, 
  CreateSolicitudRetornoDto, 
  UpdateEstadoSolicitudDto 
} from '../dto/create-operations.dto';
import { EstadoEquipo, TipoControlEquipo, SeveridadDano, EstadoSolicitudOperativa } from '@prisma/client';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- SOLICITUDES DE DESPACHO ---

  async createSolicitudDespacho(dto: CreateSolicitudDespachoDto, empresaId: string) {
    const { contratoId, solicitadoPor, fechaProgramada, direccionEntrega, comentarios } = dto;

    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, sucursal: { empresaId } },
      include: { sucursal: true, cliente: true }
    });

    if (!contrato) throw new NotFoundException(`No se encontró el contrato con ID: ${contratoId}`);

    const count = await this.prisma.solicitudDespacho.count({ where: { empresaId } });
    const codigo = `SOL-DESP-${(count + 1).toString().padStart(4, '0')}`;

    return this.prisma.solicitudDespacho.create({
      data: {
        codigo,
        empresaId,
        sucursalId: contrato.sucursalId,
        contratoId: contrato.id,
        solicitadoPor,
        fechaProgramada: new Date(fechaProgramada),
        direccionEntrega: direccionEntrega || contrato.cliente.direccion,
        comentarios,
        estado: EstadoSolicitudOperativa.PENDIENTE
      },
      include: {
        contrato: { include: { cliente: true } },
        sucursal: true,
        despachos: true
      }
    });
  }

  async findAllSolicitudesDespacho(empresaId: string, estado?: EstadoSolicitudOperativa) {
    const whereClause: any = { empresaId };
    if (estado) whereClause.estado = estado;

    return this.prisma.solicitudDespacho.findMany({
      where: whereClause,
      include: {
        contrato: { include: { cliente: true } },
        sucursal: true,
        despachos: { include: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateEstadoSolicitudDespacho(id: string, dto: UpdateEstadoSolicitudDto, empresaId: string) {
    const solicitud = await this.prisma.solicitudDespacho.findFirst({
      where: { id, empresaId }
    });

    if (!solicitud) throw new NotFoundException(`Solicitud de despacho no encontrada: ${id}`);

    return this.prisma.solicitudDespacho.update({
      where: { id },
      data: {
        estado: dto.estado,
        comentarios: dto.comentarios || solicitud.comentarios
      },
      include: { contrato: true }
    });
  }

  // --- SOLICITUDES DE RETORNO ---

  async createSolicitudRetorno(dto: CreateSolicitudRetornoDto, empresaId: string) {
    const { contratoId, solicitadoPor, fechaProgramada, lugarRecoleccion, comentarios } = dto;

    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, sucursal: { empresaId } },
      include: { sucursal: true, cliente: true }
    });

    if (!contrato) throw new NotFoundException(`No se encontró el contrato con ID: ${contratoId}`);

    const count = await this.prisma.solicitudRetorno.count({ where: { empresaId } });
    const codigo = `SOL-RET-${(count + 1).toString().padStart(4, '0')}`;

    return this.prisma.solicitudRetorno.create({
      data: {
        codigo,
        empresaId,
        sucursalId: contrato.sucursalId,
        contratoId: contrato.id,
        solicitadoPor,
        fechaProgramada: new Date(fechaProgramada),
        lugarRecoleccion: lugarRecoleccion || contrato.cliente.direccion,
        comentarios,
        estado: EstadoSolicitudOperativa.PENDIENTE
      },
      include: {
        contrato: { include: { cliente: true } },
        sucursal: true,
        devoluciones: true
      }
    });
  }

  async findAllSolicitudesRetorno(empresaId: string, estado?: EstadoSolicitudOperativa) {
    const whereClause: any = { empresaId };
    if (estado) whereClause.estado = estado;

    return this.prisma.solicitudRetorno.findMany({
      where: whereClause,
      include: {
        contrato: { include: { cliente: true } },
        sucursal: true,
        devoluciones: { include: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateEstadoSolicitudRetorno(id: string, dto: UpdateEstadoSolicitudDto, empresaId: string) {
    const solicitud = await this.prisma.solicitudRetorno.findFirst({
      where: { id, empresaId }
    });

    if (!solicitud) throw new NotFoundException(`Solicitud de retorno no encontrada: ${id}`);

    return this.prisma.solicitudRetorno.update({
      where: { id },
      data: {
        estado: dto.estado,
        comentarios: dto.comentarios || solicitud.comentarios
      },
      include: { contrato: true }
    });
  }

  // --- EJECUCIÓN FÍSICA: DESPACHO E INSPECCIÓN DE SALIDA ---

  async createDespacho(dto: CreateDespachoDto, empresaId: string) {
    const { contratoId, solicitudDespachoId, operadorNombre, vehiculoEnvio, comentarios, items } = dto;

    const contrato = await this.prisma.contrato.findFirst({
      where: {
        id: contratoId,
        sucursal: { empresaId }
      },
      include: { sucursal: true, cliente: true }
    });

    if (!contrato) {
      throw new NotFoundException(`No se encontró el contrato con ID: ${contratoId}`);
    }

    // Registrar Orden de Despacho
    const despacho = await this.prisma.despacho.create({
      data: {
        sucursalId: contrato.sucursalId,
        contratoId: contrato.id,
        solicitudDespachoId: solicitudDespachoId || undefined,
        operadorNombre,
        vehiculoEnvio,
        comentarios,
        items: {
          create: items.map(item => ({
            equipoId: item.equipoId,
            numeroSerie: item.numeroSerie,
            cantidad: item.cantidad || 1,
            horometroInicial: item.horometroInicial || 0.0,
            estadoSalida: item.estadoSalida || 'BUENO',
            checklistOk: item.checklistOk ?? true,
            observaciones: item.observaciones,
            inspeccionesSalida: item.inspeccionSalida ? {
              create: {
                combustible: item.inspeccionSalida.combustible || '100%',
                aceiteOk: item.inspeccionSalida.aceiteOk ?? true,
                llantasOk: item.inspeccionSalida.llantasOk ?? true,
                hidraulicoOk: item.inspeccionSalida.hidraulicoOk ?? true,
                motorOk: item.inspeccionSalida.motorOk ?? true,
                fugasDetectadas: item.inspeccionSalida.fugasDetectadas ?? false,
                observaciones: item.inspeccionSalida.observaciones
              }
            } : undefined
          }))
        }
      },
      include: {
        contrato: { include: { cliente: true } },
        items: {
          include: { equipo: true, inspeccionesSalida: true }
        }
      }
    });

    // Si viene de una solicitud de despacho, marcarla como completada
    if (solicitudDespachoId) {
      await this.prisma.solicitudDespacho.update({
        where: { id: solicitudDespachoId },
        data: { estado: EstadoSolicitudOperativa.COMPLETADA }
      });
    }

    // Actualizar estados de equipos y decrementar stock disponible tras el despacho
    for (const item of items) {
      const equipo = await this.prisma.equipo.findUnique({ where: { id: item.equipoId } });
      if (equipo) {
        const cantDespachada = item.cantidad || 1;
        const newDisp = Math.max(0, equipo.cantidadDisponible - cantDespachada);
        const newEstado = newDisp === 0 ? EstadoEquipo.RENTADO : EstadoEquipo.DESPACHADO;

        await this.prisma.equipo.update({
          where: { id: equipo.id },
          data: {
            cantidadDisponible: newDisp,
            estado: newEstado,
            horometro: item.horometroInicial && item.horometroInicial > equipo.horometro ? item.horometroInicial : equipo.horometro
          }
        });
      }
    }

    return despacho;
  }

  // --- EJECUCIÓN FÍSICA: RETORNO E INSPECCIÓN DE DAÑOS ---

  async createRetorno(dto: CreateRetornoDto, empresaId: string) {
    const { contratoId, solicitudRetornoId, recibidoPor, items } = dto;

    const contrato = await this.prisma.contrato.findFirst({
      where: {
        id: contratoId,
        sucursal: { empresaId }
      }
    });

    if (!contrato) {
      throw new NotFoundException(`No se encontró el contrato con ID: ${contratoId}`);
    }

    const retorno = await this.prisma.devolucion.create({
      data: {
        sucursalId: contrato.sucursalId,
        contratoId: contrato.id,
        solicitudRetornoId: solicitudRetornoId || undefined,
        recibidoPor,
        items: {
          create: items.map(item => {
            const horasCalc = item.horometroFinal ? Math.max(0, item.horometroFinal - 0) : 0;
            return {
              equipoId: item.equipoId,
              numeroSerie: item.numeroSerie,
              cantidadRetornada: item.cantidadRetornada || 1,
              cantidadDañada: item.cantidadDañada || 0,
              cantidadPerdida: item.cantidadPerdida || 0,
              horometroFinal: item.horometroFinal || 0.0,
              horasCalculadas: horasCalc,
              daniosDetectados: item.daniosDetectados || (item.danios && item.danios.length > 0) || false,
              descripcionDanios: item.descripcionDanios,
              inspeccionesDanio: item.danios ? {
                create: item.danios.map(d => ({
                  componente: d.componente,
                  tipoDano: d.tipoDano,
                  severidad: (d.severidad as SeveridadDano) || SeveridadDano.MEDIA,
                  cobrable: d.cobrable ?? true,
                  costoEstimado: d.costoEstimado || 0.0,
                  observaciones: d.observaciones
                }))
              } : undefined
            };
          })
        }
      },
      include: {
        contrato: { include: { cliente: true } },
        items: {
          include: { equipo: true, inspeccionesDanio: true }
        }
      }
    });

    // Si viene de una solicitud de retorno, marcarla como completada
    if (solicitudRetornoId) {
      await this.prisma.solicitudRetorno.update({
        where: { id: solicitudRetornoId },
        data: { estado: EstadoSolicitudOperativa.COMPLETADA }
      });
    }

    // Actualizar estados de equipos y devolver stock tras el retorno
    for (const item of items) {
      const equipo = await this.prisma.equipo.findUnique({ where: { id: item.equipoId } });
      if (equipo) {
        const cantRetornada = item.cantidadRetornada || 1;
        const newDisp = Math.min(equipo.cantidadTotal, equipo.cantidadDisponible + cantRetornada);
        const nuevoEstado = item.daniosDetectados 
          ? EstadoEquipo.EN_MANTENIMIENTO 
          : (newDisp === equipo.cantidadTotal ? EstadoEquipo.DISPONIBLE : equipo.estado);

        await this.prisma.equipo.update({
          where: { id: equipo.id },
          data: {
            cantidadDisponible: newDisp,
            estado: nuevoEstado,
            horometro: item.horometroFinal && item.horometroFinal > equipo.horometro ? item.horometroFinal : equipo.horometro
          }
        });
      }
    }

    return retorno;
  }

  // --- CONSULTAS ---

  async findAllDespachos(empresaId: string) {
    return this.prisma.despacho.findMany({
      where: { sucursal: { empresaId } },
      include: {
        contrato: { include: { cliente: true } },
        solicitudDespacho: true,
        items: { include: { equipo: true, inspeccionesSalida: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findAllRetornos(empresaId: string) {
    return this.prisma.devolucion.findMany({
      where: { sucursal: { empresaId } },
      include: {
        contrato: { include: { cliente: true } },
        solicitudRetorno: true,
        items: { include: { equipo: true, inspeccionesDanio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
