import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDespachoDto,
  CreateRetornoDto,
  CreateSolicitudDespachoDto,
  ScheduleSolicitudDespachoDto,
  CreateSolicitudRetornoDto,
  UpdateEstadoSolicitudDto,
} from '../dto/create-operations.dto';
import {
  EstadoEquipo,
  TipoControlEquipo,
  SeveridadDano,
  EstadoSolicitudOperativa,
  EstadoCorteFacturacion,
  OrigenLecturaHorometro,
  TipoMantenimiento,
  EstadoMantenimiento,
  Prisma,
} from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';
import {
  assertScheduledDate,
  parseValidDate,
} from '../utils/operation-dates.util';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- SOLICITUDES DE DESPACHO ---

  async createSolicitudDespacho(
    dto: CreateSolicitudDespachoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      contratoId,
      solicitadoPor,
      fechaProgramada,
      direccionEntrega,
      comentarios,
    } = dto;

    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, sucursal: { empresaId } },
      include: { sucursal: true, cliente: true },
    });

    if (!contrato)
      throw new NotFoundException(
        `No se encontró el contrato con ID: ${contratoId}`,
      );

    const fechaProgramadaValida = parseValidDate(
      fechaProgramada,
      'La fecha programada',
    );

    const count = await this.prisma.solicitudDespacho.count({
      where: { empresaId },
    });
    const codigo = `SOL-DESP-${(count + 1).toString().padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitudDespacho.create({
        data: {
          codigo,
          empresaId,
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitadoPor,
          fechaProgramada: fechaProgramadaValida,
          direccionEntrega: direccionEntrega || contrato.cliente.direccion,
          comentarios,
          estado: EstadoSolicitudOperativa.PENDIENTE,
        },
        include: {
          contrato: { include: { cliente: true } },
          sucursal: true,
          despachos: true,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'SOLICITUD_DESPACHO_CREADA',
        entidadTipo: 'SOLICITUD_DESPACHO',
        entidadId: solicitud.id,
        detalles: { contratoId, codigo, fechaProgramada },
      });
      return solicitud;
    });
  }

  async findAllSolicitudesDespacho(
    empresaId: string,
    estado?: EstadoSolicitudOperativa,
  ) {
    const whereClause: Prisma.SolicitudDespachoWhereInput = { empresaId };
    if (estado) whereClause.estado = estado;

    return this.prisma.solicitudDespacho.findMany({
      where: whereClause,
      include: {
        contrato: { include: { cliente: true } },
        sucursal: true,
        despachos: { include: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async scheduleSolicitudDespacho(
    id: string,
    dto: ScheduleSolicitudDespachoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const solicitud = await this.prisma.solicitudDespacho.findFirst({
      where: { id, empresaId },
    });
    if (!solicitud)
      throw new NotFoundException(`Solicitud de despacho no encontrada: ${id}`);
    if (['COMPLETADA', 'CANCELADA', 'RECHAZADA'].includes(solicitud.estado)) {
      throw new BadRequestException(
        'Solo se pueden programar solicitudes de despacho pendientes',
      );
    }
    const fechaProgramada = parseValidDate(dto.fechaProgramada, 'La fecha programada');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.solicitudDespacho.update({
        where: { id },
        data: { fechaProgramada },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'SOLICITUD_DESPACHO_REPROGRAMADA',
        entidadTipo: 'SOLICITUD_DESPACHO',
        entidadId: id,
        detalles: {
          contratoId: solicitud.contratoId,
          fechaAnterior: solicitud.fechaProgramada,
          fechaProgramada,
        },
      });
      return updated;
    });
  }

  async updateEstadoSolicitudDespacho(
    id: string,
    dto: UpdateEstadoSolicitudDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const solicitud = await this.prisma.solicitudDespacho.findFirst({
      where: { id, empresaId },
    });

    if (!solicitud)
      throw new NotFoundException(`Solicitud de despacho no encontrada: ${id}`);

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.solicitudDespacho.update({
        where: { id },
        data: {
          estado: dto.estado,
          comentarios: dto.comentarios || solicitud.comentarios,
        },
        include: { contrato: true },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: `SOLICITUD_DESPACHO_${dto.estado}`,
        entidadTipo: 'SOLICITUD_DESPACHO',
        entidadId: id,
        detalles: {
          estadoAnterior: solicitud.estado,
          estadoNuevo: dto.estado,
          contratoId: solicitud.contratoId,
        },
      });
      return actualizada;
    });
  }

  // --- SOLICITUDES DE RETORNO ---

  async createSolicitudRetorno(
    dto: CreateSolicitudRetornoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      contratoId,
      solicitadoPor,
      fechaProgramada,
      lugarRecoleccion,
      comentarios,
    } = dto;

    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, sucursal: { empresaId } },
      include: { sucursal: true, cliente: true },
    });

    if (!contrato)
      throw new NotFoundException(
        `No se encontró el contrato con ID: ${contratoId}`,
      );

    // Fecha programada válida, no anterior al inicio del contrato ni > 1 año adelante.
    const fechaProgramadaValida = assertScheduledDate(fechaProgramada, {
      desde: contrato.fechaInicio,
      campo: 'La fecha programada de retorno',
    });

    const count = await this.prisma.solicitudRetorno.count({
      where: { empresaId },
    });
    const codigo = `SOL-RET-${(count + 1).toString().padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitudRetorno.create({
        data: {
          codigo,
          empresaId,
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitadoPor,
          fechaProgramada: fechaProgramadaValida,
          lugarRecoleccion: lugarRecoleccion || contrato.cliente.direccion,
          comentarios,
          estado: EstadoSolicitudOperativa.PENDIENTE,
        },
        include: {
          contrato: { include: { cliente: true } },
          sucursal: true,
          devoluciones: true,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'SOLICITUD_RETORNO_CREADA',
        entidadTipo: 'SOLICITUD_RETORNO',
        entidadId: solicitud.id,
        detalles: { contratoId, codigo, fechaProgramada },
      });
      return solicitud;
    });
  }

  async findAllSolicitudesRetorno(
    empresaId: string,
    estado?: EstadoSolicitudOperativa,
  ) {
    const whereClause: Prisma.SolicitudRetornoWhereInput = { empresaId };
    if (estado) whereClause.estado = estado;

    return this.prisma.solicitudRetorno.findMany({
      where: whereClause,
      include: {
        contrato: { include: { cliente: true } },
        sucursal: true,
        devoluciones: { include: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEstadoSolicitudRetorno(
    id: string,
    dto: UpdateEstadoSolicitudDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const solicitud = await this.prisma.solicitudRetorno.findFirst({
      where: { id, empresaId },
    });

    if (!solicitud)
      throw new NotFoundException(`Solicitud de retorno no encontrada: ${id}`);

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.solicitudRetorno.update({
        where: { id },
        data: {
          estado: dto.estado,
          comentarios: dto.comentarios || solicitud.comentarios,
        },
        include: { contrato: true },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: `SOLICITUD_RETORNO_${dto.estado}`,
        entidadTipo: 'SOLICITUD_RETORNO',
        entidadId: id,
        detalles: {
          estadoAnterior: solicitud.estado,
          estadoNuevo: dto.estado,
          contratoId: solicitud.contratoId,
        },
      });
      return actualizada;
    });
  }

  // --- EJECUCIÓN FÍSICA: DESPACHO E INSPECCIÓN DE SALIDA ---

  // --- EJECUCIÓN FÍSICA: DESPACHO E INSPECCIÓN DE SALIDA ---

  async createDespacho(
    dto: CreateDespachoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      contratoId,
      solicitudDespachoId,
      operadorNombre,
      vehiculoEnvio,
      comentarios,
      items,
    } = dto;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const contrato = await tx.contrato.findFirst({
        where: {
          id: contratoId,
          sucursal: { empresaId },
        },
        include: { sucursal: true, cliente: true, items: true },
      });

      if (!contrato) {
        throw new NotFoundException(
          `No se encontró el contrato con ID: ${contratoId}`,
        );
      }

      if (contrato.estado && contrato.estado !== 'ACTIVO') {
        throw new BadRequestException(
          `Solo se pueden realizar despachos sobre contratos en estado ACTIVO. Estado actual: ${contrato.estado}`,
        );
      }

      if (solicitudDespachoId) {
        const solicitud = await tx.solicitudDespacho.findFirst({
          where: {
            id: solicitudDespachoId,
            empresaId,
            contratoId: contrato.id,
          },
          select: { id: true },
        });
        if (!solicitud) {
          throw new BadRequestException(
            'La solicitud de despacho no pertenece a la empresa o al contrato indicado',
          );
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
            detallesContrato: { some: { contratoId: contrato.id } },
          },
        });
        if (!equipo) {
          throw new BadRequestException(
            'El equipo no pertenece a la empresa o al contrato indicado',
          );
        }

        const cantDespachada = item.cantidad !== undefined ? item.cantidad : 1;
        if (!Number.isInteger(cantDespachada) || cantDespachada < 1) {
          throw new BadRequestException(
            'La cantidad a despachar debe ser un entero mayor a cero.',
          );
        }

        if (tx.detalleDespacho?.findMany) {
          const despachosPrevios = await tx.detalleDespacho.findMany({
            where: {
              despacho: { contratoId: contrato.id },
              equipoId: equipo.id,
            },
            select: { cantidad: true },
          });
          const totalPrevio = (despachosPrevios || []).reduce(
            (acc: number, d) => acc + d.cantidad,
            0,
          );

          const detalleContrato = (contrato.items || []).find(
            (it) => it.equipoId === equipo.id,
          );
          if (
            detalleContrato &&
            totalPrevio + cantDespachada > detalleContrato.cantidad
          ) {
            throw new BadRequestException(
              `Sobredespacho rechazado: ya se han despachado ${totalPrevio} de ${detalleContrato.cantidad} unidades contratadas.`,
            );
          }

          if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
            if (cantDespachada !== 1) {
              throw new BadRequestException(
                `El equipo serializado ${equipo.modelo} solo puede despacharse en cantidad 1.`,
              );
            }
            if (totalPrevio >= 1) {
              throw new BadRequestException(
                `Doble despacho rechazado: el equipo serializado ${equipo.modelo} ya fue despachado para este contrato.`,
              );
            }
          }
        }
      }

      // La renta diaria comienza en la primera entrega física. Si todavía no
      // hay cortes facturados, desplazar el calendario proyectado completo.
      const fechaDespacho = new Date();
      if (
        contrato.items?.length &&
        contrato.items.every((item) => item.tipoTarifa !== 'HORA') &&
        tx.despacho.count &&
        (await tx.despacho.count({ where: { contratoId: contrato.id } })) === 0
      ) {
        const cortes = await tx.corteFacturacion.findMany({ where: { contratoId: contrato.id } });
        if (cortes.every((corte) => corte.estado !== EstadoCorteFacturacion.FACTURADO)) {
          const dayKey = (date: Date) => {
            const parts = new Intl.DateTimeFormat('en-US', {
              timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit',
            }).formatToParts(date);
            const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
            return Date.UTC(get('year'), get('month') - 1, get('day'));
          };
          const deltaDays = Math.round((dayKey(fechaDespacho) - dayKey(contrato.fechaInicio)) / 86400000);
          if (deltaDays !== 0) {
            const shift = (date: Date) => new Date(date.getTime() + deltaDays * 86400000);
            await tx.contrato.update({
              where: { id: contrato.id },
              data: { fechaInicio: shift(contrato.fechaInicio), fechaFin: shift(contrato.fechaFin) },
            });
            for (const corte of cortes) {
              await tx.corteFacturacion.update({
                where: { id: corte.id },
                data: { fechaInicio: shift(corte.fechaInicio), fechaFin: shift(corte.fechaFin) },
              });
            }
            await tx.reserva.updateMany({
              where: { contratoId: contrato.id },
              data: { fechaInicio: shift(contrato.fechaInicio), fechaFin: shift(contrato.fechaFin) },
            });
          }
        }
      }

      // Registrar Orden de Despacho
      const despacho = await tx.despacho.create({
        data: {
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          fechaDespacho,
          solicitudDespachoId: solicitudDespachoId || undefined,
          operadorNombre,
          vehiculoEnvio,
          comentarios,
          actaEntregaData: dto.actaEntregaData
            ? (dto.actaEntregaData as Prisma.InputJsonObject)
            : undefined,
          items: {
            create: items.map((item) => ({
              equipoId: item.equipoId,
              numeroSerie: item.numeroSerie,
              cantidad: item.cantidad || 1,
              horometroInicial: item.horometroInicial || 0.0,
              estadoSalida: item.estadoSalida || 'BUENO',
              checklistOk: item.checklistOk ?? true,
              observaciones: item.observaciones,
              inspeccionesSalida: item.inspeccionSalida
                ? {
                    create: {
                      combustible: item.inspeccionSalida.combustible ?? null,
                      nivelCombustible:
                        item.inspeccionSalida.nivelCombustible ?? null,
                      aceiteOk: item.inspeccionSalida.aceiteOk ?? true,
                      llantasOk: item.inspeccionSalida.llantasOk ?? true,
                      hidraulicoOk: item.inspeccionSalida.hidraulicoOk ?? true,
                      motorOk: item.inspeccionSalida.motorOk ?? true,
                      fugasDetectadas:
                        item.inspeccionSalida.fugasDetectadas ?? false,
                      observaciones: item.inspeccionSalida.observaciones,
                    },
                  }
                : undefined,
            })),
          },
        },
        include: {
          contrato: { include: { cliente: true } },
          items: {
            include: { equipo: true, inspeccionesSalida: true },
          },
        },
      });

      // Si viene de una solicitud de despacho, marcarla como completada
      if (solicitudDespachoId) {
        await tx.solicitudDespacho.update({
          where: { id: solicitudDespachoId },
          data: { estado: EstadoSolicitudOperativa.COMPLETADA },
        });
      }

      // Actualizar estados de equipos e insertar lectura histórica de horómetro
      for (const item of items) {
        const equipo = await tx.equipo.findFirst({
          where: {
            id: item.equipoId,
            empresaId,
            detallesContrato: { some: { contratoId: contrato.id } },
          },
        });
        if (equipo) {
          const horometroDespacho =
            item.horometroInicial && item.horometroInicial > equipo.horometro
              ? item.horometroInicial
              : equipo.horometro;

          await tx.equipo.update({
            where: { id: equipo.id },
            data: {
              estado: EstadoEquipo.DESPACHADO,
              ...(equipo.tipoControl === TipoControlEquipo.SERIALIZADO
                ? { cantidadDisponible: 0 }
                : {}),
              horometro: horometroDespacho,
            },
          });

          // Registrar lectura histórica de horómetro al despacho
          if (
            item.horometroInicial !== undefined &&
            item.horometroInicial !== null
          ) {
            await tx.lecturaHorometro.create({
              data: {
                equipoId: equipo.id,
                horometroAnterior: equipo.horometro,
                horometroNuevo: horometroDespacho,
                horasTrabajadas: Math.max(
                  0,
                  horometroDespacho - equipo.horometro,
                ),
                origen: OrigenLecturaHorometro.DESPACHO,
                registradoPor: operadorNombre || 'Operador Despacho',
                observaciones: `Despacho de contrato ${contrato.codigo} (Remisión: ${despacho.id})`,
              },
            });
          }
        }
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'DESPACHO_REGISTRADO',
        entidadTipo: 'DESPACHO',
        entidadId: despacho.id,
        detalles: {
          contratoId: contrato.id,
          codigoContrato: contrato.codigo,
          operadorNombre,
          itemsCount: items.length,
        },
      });

      return despacho;
    });
  }

  // --- EJECUCIÓN FÍSICA: RETORNO E INSPECCIÓN DE DAÑOS ---

  async createRetorno(
    dto: CreateRetornoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const { contratoId, solicitudRetornoId, recibidoPor, entregadoPor, cedulaEntregante, items } = dto;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const contrato = await tx.contrato.findFirst({
        where: {
          id: contratoId,
          sucursal: { empresaId },
        },
      });

      if (!contrato) {
        throw new NotFoundException(
          `No se encontró el contrato con ID: ${contratoId}`,
        );
      }

      if (solicitudRetornoId) {
        const solicitud = await tx.solicitudRetorno.findFirst({
          where: {
            id: solicitudRetornoId,
            empresaId,
            contratoId: contrato.id,
          },
          select: { id: true },
        });
        if (!solicitud) {
          throw new BadRequestException(
            'La solicitud de retorno no pertenece a la empresa o al contrato indicado',
          );
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
              detallesContrato: { some: { contratoId: contrato.id } },
            },
          });
          if (!equipo) {
            throw new BadRequestException(
              'El equipo no pertenece a la empresa o al contrato indicado',
            );
          }

          const cantRetornada =
            item.cantidadRetornada !== undefined ? item.cantidadRetornada : 1;
          const cantPerdida = item.cantidadPerdida || 0;
          const cantDanada = item.cantidadDañada || 0;
          if (!Number.isInteger(cantRetornada) || cantRetornada < 0 ||
              !Number.isInteger(cantPerdida) || cantPerdida < 0 ||
              !Number.isInteger(cantDanada) || cantDanada < 0 ||
              cantRetornada + cantPerdida < 1) {
            throw new BadRequestException(
              'Las cantidades recibidas, dañadas y perdidas deben ser enteros válidos.',
            );
          }
          if (cantDanada > cantRetornada) {
            throw new BadRequestException('Las unidades dañadas no pueden superar las unidades recibidas.');
          }
          const hayDanio = Boolean(
            item.daniosDetectados || item.danios?.length ||
            item.inspeccionEstado?.estadoFisico === 'DANADO' ||
            item.inspeccionEstado?.funcionamiento === 'NO_FUNCIONA' ||
            item.inspeccionEstado?.accesoriosCompletos === false,
          );
          if (equipo.tipoControl === TipoControlEquipo.POR_CANTIDAD && hayDanio && cantDanada === 0) {
            throw new BadRequestException(
              'Indique cuántas unidades del lote retornaron dañadas para separar el inventario sano.',
            );
          }

          if (tx.detalleDespacho?.findMany && tx.detalleDevolucion?.findMany) {
            const despachosEquipo = await tx.detalleDespacho.findMany({
              where: {
                despacho: { contratoId: contrato.id },
                equipoId: equipo.id,
              },
              select: { cantidad: true },
            });
            const totalDespachado = (despachosEquipo || []).reduce(
              (acc: number, d) => acc + d.cantidad,
              0,
            );

            const retornosPrevios = await tx.detalleDevolucion.findMany({
              where: {
                devolucion: { contratoId: contrato.id },
                equipoId: equipo.id,
              },
              select: { cantidadRetornada: true, cantidadPerdida: true },
            });
            const totalRetornado = (retornosPrevios || []).reduce(
              (acc: number, r) => acc + r.cantidadRetornada + (r.cantidadPerdida || 0),
              0,
            );

            const pendienteRetorno = totalDespachado - totalRetornado;
            if (totalDespachado > 0 && pendienteRetorno <= 0) {
              throw new BadRequestException(
                `Doble retorno rechazado: el equipo ya fue devuelto en su totalidad para este contrato (${totalRetornado}/${totalDespachado}).`,
              );
            }
            if (totalDespachado > 0 && cantRetornada + cantPerdida > pendienteRetorno) {
              throw new BadRequestException(
                `Retorno excesivo rechazado: se intentan procesar ${cantRetornada + cantPerdida} unidades, pero solo hay ${pendienteRetorno} pendientes de retorno.`,
              );
            }
          }

          const horoAnterior = equipo ? equipo.horometro : 0;
          const horoFinal = item.horometroFinal || 0.0;
          if (item.horometroFinal !== undefined && item.horometroFinal < horoAnterior) {
            throw new BadRequestException(
              `El horómetro final del equipo ${equipo.modelo} no puede ser menor que la lectura registrada (${horoAnterior}).`,
            );
          }
          const horasCalc = Math.max(0, horoFinal - horoAnterior);
          return { item, equipo, horoAnterior, horoFinal, horasCalc };
        }),
      );

      const retorno = await tx.devolucion.create({
        data: {
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitudRetornoId: solicitudRetornoId || undefined,
          recibidoPor,
          entregadoPor,
          cedulaEntregante,
          items: {
            create: itemsConHoras.map(({ item, horasCalc }) => ({
              equipoId: item.equipoId,
              numeroSerie: item.numeroSerie,
              cantidadRetornada: item.cantidadRetornada ?? 1,
              cantidadDañada: item.cantidadDañada || 0,
              cantidadPerdida: item.cantidadPerdida || 0,
              horometroFinal: item.horometroFinal || 0.0,
              horasCalculadas: horasCalc,
              combustibleRetorno: item.combustibleRetorno,
              nivelCombustible: item.nivelCombustible,
              cargoCombustible: item.cargoCombustible || 0.0,
              daniosDetectados:
                item.daniosDetectados ||
                (item.danios && item.danios.length > 0) ||
                item.inspeccionEstado?.estadoFisico === 'DANADO' ||
                item.inspeccionEstado?.funcionamiento === 'NO_FUNCIONA' ||
                false,
              descripcionDanios: item.descripcionDanios,
              inspeccionEstado: item.inspeccionEstado as Prisma.InputJsonValue | undefined,
              fotosUrls: item.inspeccionEstado?.fotosUrls || [],
              inspeccionesDanio: item.danios
                ? {
                    create: item.danios.map((d) => ({
                      componente: d.componente,
                      tipoDano: d.tipoDano,
                      severidad:
                        (d.severidad as SeveridadDano) || SeveridadDano.MEDIA,
                      cobrable: d.cobrable ?? true,
                      costoEstimado: d.costoEstimado || 0.0,
                      observaciones: d.observaciones,
                    })),
                  }
                : undefined,
            })),
          },
        },
        include: {
          contrato: { include: { cliente: true } },
          items: {
            include: { equipo: true, inspeccionesDanio: true },
          },
        },
      });

      // Si viene de una solicitud de retorno, marcarla como completada
      if (solicitudRetornoId) {
        await tx.solicitudRetorno.update({
          where: { id: solicitudRetornoId },
          data: { estado: EstadoSolicitudOperativa.COMPLETADA },
        });
      }

      // Actualizar estados de equipos, devolver stock de unidades sanas y registrar lectura de horómetro
      for (const {
        item,
        equipo,
        horoAnterior,
        horoFinal,
        horasCalc,
      } of itemsConHoras) {
        if (equipo) {
          const cantRetornada = item.cantidadRetornada ?? 1;
          const nuevoHorometro = Math.max(horoAnterior, horoFinal);

          if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
            const conDanio =
              item.daniosDetectados ||
              (item.cantidadDañada && item.cantidadDañada > 0) ||
              (item.danios && item.danios.length > 0) ||
              item.inspeccionEstado?.estadoFisico === 'DANADO' ||
              item.inspeccionEstado?.funcionamiento === 'NO_FUNCIONA';
            await tx.equipo.update({
              where: { id: equipo.id },
              data: {
                cantidadDisponible: item.cantidadPerdida ? 0 : conDanio ? 0 : 1,
                estado: item.cantidadPerdida
                  ? EstadoEquipo.FUERA_DE_SERVICIO
                  : conDanio
                  ? EstadoEquipo.EN_MANTENIMIENTO
                  : EstadoEquipo.DISPONIBLE,
                horometro: nuevoHorometro,
              },
            });
          } else {
            // POR_CANTIDAD: No poner todo el lote en mantenimiento si solo una unidad se dañó
            const unidadesSanas = Math.max(
              0,
              cantRetornada - (item.cantidadDañada || 0),
            );
            const newDisp = Math.min(
              equipo.cantidadTotal,
              equipo.cantidadDisponible + unidadesSanas,
            );

            await tx.equipo.update({
              where: { id: equipo.id },
              data: {
                cantidadDisponible: newDisp,
                estado: newDisp > 0 ? EstadoEquipo.DISPONIBLE : equipo.estado,
                horometro: nuevoHorometro,
              },
            });
          }

          const requiereReparacion =
            (item.cantidadDañada || 0) > 0 ||
            item.daniosDetectados ||
            Boolean(item.danios?.length) ||
            item.inspeccionEstado?.estadoFisico === 'DANADO' ||
            item.inspeccionEstado?.funcionamiento === 'NO_FUNCIONA';
          const detalle = retorno.items?.find((detail) => detail.equipoId === equipo.id);
          if (requiereReparacion && detalle) {
            await tx.mantenimiento.create({
              data: {
                equipoId: equipo.id,
                detalleDevolucionId: detalle.id,
                tipo: TipoMantenimiento.CORRECTIVO,
                estado: EstadoMantenimiento.EN_PROCESO,
                fechaProgramacion: new Date(),
                horometroServicio: nuevoHorometro,
                descripcion: item.descripcionDanios || `Reparación por retorno del contrato ${contrato.codigo}`,
                costo: 0,
                cobrableCliente: Boolean(item.danios?.some((d) => d.cobrable === true)),
              },
            });
          }

          // Registrar lectura histórica de horómetro al retorno
          if (
            item.horometroFinal !== undefined &&
            item.horometroFinal !== null
          ) {
            await tx.lecturaHorometro.create({
              data: {
                equipoId: equipo.id,
                horometroAnterior: horoAnterior,
                horometroNuevo: nuevoHorometro,
                horasTrabajadas: horasCalc,
                origen: OrigenLecturaHorometro.RETORNO,
                registradoPor: recibidoPor || 'Receptor Devolución',
                observaciones: `Retorno de contrato ${contrato.codigo} (Devolución: ${retorno.id})`,
              },
            });
          }
        }
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'RETORNO_REGISTRADO',
        entidadTipo: 'DEVOLUCION',
        entidadId: retorno.id,
        detalles: {
          contratoId: contrato.id,
          codigoContrato: contrato.codigo,
          recibidoPor,
          itemsCount: items.length,
        },
      });

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
        items: { include: { equipo: true, inspeccionesSalida: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllRetornos(empresaId: string) {
    return this.prisma.devolucion.findMany({
      where: { sucursal: { empresaId } },
      include: {
        contrato: { include: { cliente: true } },
        solicitudRetorno: true,
        items: { include: { equipo: true, inspeccionesDanio: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
