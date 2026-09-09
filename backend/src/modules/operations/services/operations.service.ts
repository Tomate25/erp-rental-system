import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  CreateDespachoDto, 
  CreateRetornoDto, 
  CreateSolicitudDespachoDto, 
  CreateSolicitudRetornoDto, 
  UpdateEstadoSolicitudDto 
} from '../dto/create-operations.dto';
import { EstadoEquipo, TipoControlEquipo, SeveridadDano, EstadoSolicitudOperativa, OrigenLecturaHorometro } from '@prisma/client';

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

  // --- EJECUCIÓN FÍSICA: DESPACHO E INSPECCIÓN DE SALIDA ---

  async createDespacho(dto: CreateDespachoDto, empresaId: string) {
    const { contratoId, solicitudDespachoId, operadorNombre, vehiculoEnvio, comentarios, items } = dto;

    return this.prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findFirst({
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
      const despacho = await tx.despacho.create({
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
        await tx.solicitudDespacho.update({
          where: { id: solicitudDespachoId },
          data: { estado: EstadoSolicitudOperativa.COMPLETADA }
        });
      }

      // Actualizar estados de equipos, stock disponible e insertar lectura de horómetro
      for (const item of items) {
        const equipo = await tx.equipo.findUnique({ where: { id: item.equipoId } });
        if (equipo) {
          const cantDespachada = item.cantidad || 1;
          const newDisp = Math.max(0, equipo.cantidadDisponible - cantDespachada);
          const newEstado = newDisp === 0 ? EstadoEquipo.RENTADO : EstadoEquipo.DESPACHADO;
          const horometroDespacho = item.horometroInicial && item.horometroInicial > equipo.horometro ? item.horometroInicial : equipo.horometro;

          await tx.equipo.update({
            where: { id: equipo.id },
            data: {
              cantidadDisponible: newDisp,
              estado: newEstado,
              horometro: horometroDespacho
            }
          });

          // Registrar lectura histórica de horómetro al despacho
          if (item.horometroInicial !== undefined && item.horometroInicial !== null) {
            await tx.lecturaHorometro.create({
              data: {
                equipoId: equipo.id,
                horometroAnterior: equipo.horometro,
                horometroNuevo: horometroDespacho,
                horasTrabajadas: Math.max(0, horometroDespacho - equipo.horometro),
                origen: OrigenLecturaHorometro.DESPACHO,
                registradoPor: operadorNombre || 'Operador Despacho',
                observaciones: `Despacho de contrato ${contrato.codigo} (Remisión: ${despacho.id})`
              }
            });
          }
        }
      }

      return despacho;
    });
  }

  // --- EJECUCIÓN FÍSICA: RETORNO E INSPECCIÓN DE DAÑOS ---

  async createRetorno(dto: CreateRetornoDto, empresaId: string) {
    const { contratoId, solicitudRetornoId, recibidoPor, items } = dto;

    return this.prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findFirst({
        where: {
          id: contratoId,
          sucursal: { empresaId }
        }
      });

      if (!contrato) {
        throw new NotFoundException(`No se encontró el contrato con ID: ${contratoId}`);
      }

      // Pre-calcular horas trabajadas con el horómetro real del equipo
      const itemsConHoras = await Promise.all(
        items.map(async (item) => {
          const equipo = await tx.equipo.findUnique({ where: { id: item.equipoId } });
          const horoAnterior = equipo ? equipo.horometro : 0;
          const horoFinal = item.horometroFinal || 0.0;
          const horasCalc = Math.max(0, horoFinal - horoAnterior);
          return { item, equipo, horoAnterior, horoFinal, horasCalc };
        })
      );

      const retorno = await tx.devolucion.create({
        data: {
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitudRetornoId: solicitudRetornoId || undefined,
          recibidoPor,
          items: {
            create: itemsConHoras.map(({ item, horasCalc }) => ({
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
            }))
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
        await tx.solicitudRetorno.update({
          where: { id: solicitudRetornoId },
          data: { estado: EstadoSolicitudOperativa.COMPLETADA }
        });
      }

      // Actualizar estados de equipos, devolver stock y registrar lectura histórica de horómetro
      for (const { item, equipo, horoAnterior, horoFinal, horasCalc } of itemsConHoras) {
        if (equipo) {
          const cantRetornada = item.cantidadRetornada || 1;
          const newDisp = Math.min(equipo.cantidadTotal, equipo.cantidadDisponible + cantRetornada);
          const nuevoEstado = item.daniosDetectados 
            ? EstadoEquipo.EN_MANTENIMIENTO 
            : (newDisp === equipo.cantidadTotal ? EstadoEquipo.DISPONIBLE : equipo.estado);
          const nuevoHorometro = Math.max(horoAnterior, horoFinal);

          await tx.equipo.update({
            where: { id: equipo.id },
            data: {
              cantidadDisponible: newDisp,
              estado: nuevoEstado,
              horometro: nuevoHorometro
            }
          });

          // Registrar lectura histórica de horómetro al retorno
          if (item.horometroFinal !== undefined && item.horometroFinal !== null) {
            await tx.lecturaHorometro.create({
              data: {
                equipoId: equipo.id,
                horometroAnterior: horoAnterior,
                horometroNuevo: nuevoHorometro,
                horasTrabajadas: horasCalc,
                origen: OrigenLecturaHorometro.RETORNO,
                registradoPor: recibidoPor || 'Receptor Devolución',
                observaciones: `Retorno de contrato ${contrato.codigo} (Devolución: ${retorno.id})`
              }
            });
          }
        }
      }

      return retorno;
    });
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
