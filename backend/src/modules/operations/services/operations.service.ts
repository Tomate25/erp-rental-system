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
        include: { sucursal: true, cliente: true, items: true }
      });

      if (!contrato) {
        throw new NotFoundException(`No se encontró el contrato con ID: ${contratoId}`);
      }

      if (contrato.estado && contrato.estado !== 'ACTIVO') {
        throw new BadRequestException(`Solo se pueden realizar despachos sobre contratos en estado ACTIVO. Estado actual: ${contrato.estado}`);
      }

      if (solicitudDespachoId) {
        const solicitud = await tx.solicitudDespacho.findFirst({
          where: {
            id: solicitudDespachoId,
            empresaId,
            contratoId: contrato.id
          },
          select: { id: true }
        });
        if (!solicitud) {
          throw new BadRequestException('La solicitud de despacho no pertenece a la empresa o al contrato indicado');
        }
      }

      // Validar sobredespacho, doble despacho y pertenencia de cada equipo
      for (const item of items) {
        if (tx.$executeRaw) {
          await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${item.equipoId} FOR UPDATE`;
        }

        const equipo = await tx.equipo.findFirst({
          where: {
            id: item.equipoId,
            empresaId,
            detallesContrato: { some: { contratoId: contrato.id } }
          }
        });
        if (!equipo) {
          throw new BadRequestException('El equipo no pertenece a la empresa o al contrato indicado');
        }

        const cantDespachada = item.cantidad || 1;
        if (!Number.isInteger(cantDespachada) || cantDespachada < 1) {
          throw new BadRequestException('La cantidad a despachar debe ser un entero mayor a cero.');
        }

        if (tx.detalleDespacho?.findMany) {
          const despachosPrevios = await tx.detalleDespacho.findMany({
            where: {
              despacho: { contratoId: contrato.id },
              equipoId: equipo.id
            },
            select: { cantidad: true }
          });
          const totalPrevio = (despachosPrevios || []).reduce((acc: number, d: any) => acc + d.cantidad, 0);

          const detalleContrato = (contrato.items || []).find((it: any) => it.equipoId === equipo.id);
          if (detalleContrato && totalPrevio + cantDespachada > detalleContrato.cantidad) {
            throw new BadRequestException(
              `Sobredespacho rechazado: ya se han despachado ${totalPrevio} de ${detalleContrato.cantidad} unidades contratadas.`
            );
          }

          if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
            if (cantDespachada !== 1) {
              throw new BadRequestException(`El equipo serializado ${equipo.modelo} solo puede despacharse en cantidad 1.`);
            }
            if (totalPrevio >= 1) {
              throw new BadRequestException(`Doble despacho rechazado: el equipo serializado ${equipo.modelo} ya fue despachado para este contrato.`);
            }
          }
        }
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
                  nivelCombustible: item.inspeccionSalida.nivelCombustible ?? null,
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

      // Actualizar estados de equipos e insertar lectura histórica de horómetro
      for (const item of items) {
        const equipo = await tx.equipo.findFirst({
          where: {
            id: item.equipoId,
            empresaId,
            detallesContrato: { some: { contratoId: contrato.id } }
          }
        });
        if (equipo) {
          const horometroDespacho = item.horometroInicial && item.horometroInicial > equipo.horometro ? item.horometroInicial : equipo.horometro;

          await tx.equipo.update({
            where: { id: equipo.id },
            data: {
              estado: EstadoEquipo.DESPACHADO,
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

      if (solicitudRetornoId) {
        const solicitud = await tx.solicitudRetorno.findFirst({
          where: {
            id: solicitudRetornoId,
            empresaId,
            contratoId: contrato.id
          },
          select: { id: true }
        });
        if (!solicitud) {
          throw new BadRequestException('La solicitud de retorno no pertenece a la empresa o al contrato indicado');
        }
      }

      // Validar cantidades contra despachos y retornos previos para prevenir retornos excesivos o dobles
      const itemsConHoras = await Promise.all(
        items.map(async (item) => {
          if (tx.$executeRaw) {
            await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${item.equipoId} FOR UPDATE`;
          }

          const equipo = await tx.equipo.findFirst({
            where: {
              id: item.equipoId,
              empresaId,
              detallesContrato: { some: { contratoId: contrato.id } }
            }
          });
          if (!equipo) {
            throw new BadRequestException('El equipo no pertenece a la empresa o al contrato indicado');
          }

          const cantRetornada = item.cantidadRetornada || 1;
          if (!Number.isInteger(cantRetornada) || cantRetornada < 1) {
            throw new BadRequestException('La cantidad retornada debe ser un entero mayor a cero.');
          }

          if (tx.detalleDespacho?.findMany && tx.detalleDevolucion?.findMany) {
            const despachosEquipo = await tx.detalleDespacho.findMany({
              where: { despacho: { contratoId: contrato.id }, equipoId: equipo.id },
              select: { cantidad: true }
            });
            const totalDespachado = (despachosEquipo || []).reduce((acc: number, d: any) => acc + d.cantidad, 0);

            const retornosPrevios = await tx.detalleDevolucion.findMany({
              where: { devolucion: { contratoId: contrato.id }, equipoId: equipo.id },
              select: { cantidadRetornada: true }
            });
            const totalRetornado = (retornosPrevios || []).reduce((acc: number, r: any) => acc + r.cantidadRetornada, 0);

            const pendienteRetorno = totalDespachado - totalRetornado;
            if (totalDespachado > 0 && pendienteRetorno <= 0) {
              throw new BadRequestException(`Doble retorno rechazado: el equipo ya fue devuelto en su totalidad para este contrato (${totalRetornado}/${totalDespachado}).`);
            }
            if (totalDespachado > 0 && cantRetornada > pendienteRetorno) {
              throw new BadRequestException(`Retorno excesivo rechazado: se intentan retornar ${cantRetornada} unidades, pero solo hay ${pendienteRetorno} pendientes de retorno.`);
            }
          }

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
              combustibleRetorno: item.combustibleRetorno,
              nivelCombustible: item.nivelCombustible,
              cargoCombustible: item.cargoCombustible || 0.0,
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

      // Actualizar estados de equipos, devolver stock de unidades sanas y registrar lectura de horómetro
      for (const { item, equipo, horoAnterior, horoFinal, horasCalc } of itemsConHoras) {
        if (equipo) {
          const cantRetornada = item.cantidadRetornada || 1;
          const nuevoHorometro = Math.max(horoAnterior, horoFinal);

          if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
            const conDanio = item.daniosDetectados || (item.cantidadDañada && item.cantidadDañada > 0) || (item.danios && item.danios.length > 0);
            await tx.equipo.update({
              where: { id: equipo.id },
              data: {
                cantidadDisponible: conDanio ? 0 : 1,
                estado: conDanio ? EstadoEquipo.EN_MANTENIMIENTO : EstadoEquipo.DISPONIBLE,
                horometro: nuevoHorometro
              }
            });
          } else {
            // POR_CANTIDAD: No poner todo el lote en mantenimiento si solo una unidad se dañó
            const unidadesSanas = Math.max(0, cantRetornada - (item.cantidadDañada || 0) - (item.cantidadPerdida || 0));
            const newDisp = Math.min(equipo.cantidadTotal, equipo.cantidadDisponible + unidadesSanas);

            await tx.equipo.update({
              where: { id: equipo.id },
              data: {
                cantidadDisponible: newDisp,
                estado: newDisp > 0 ? EstadoEquipo.DISPONIBLE : equipo.estado,
                horometro: nuevoHorometro
              }
            });
          }

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
