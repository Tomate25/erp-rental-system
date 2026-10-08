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
  SwapEquipmentDto,
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
  EstadoLiquidacionRetorno,
  TipoCierreContrato,
  Prisma,
} from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';
import {
  assertScheduledDate,
  parseValidDate,
} from '../utils/operation-dates.util';
import { rentalCalendarDay, rentalCutUsage } from '../../billing/daily-usage';

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
        await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${item.equipoId} FOR UPDATE`;

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
      const esPrimerDespacho = tx.despacho.count
        ? (await tx.despacho.count({ where: { contratoId: contrato.id } })) ===
          0
        : false;
      if (esPrimerDespacho && !contrato.fechaFinPactada) {
        await tx.contrato.update({
          where: { id: contrato.id },
          data: { fechaFinPactada: contrato.fechaFin },
        });
      }
      if (
        contrato.items?.length &&
        contrato.items.every((item) => item.tipoTarifa !== 'HORA') &&
        esPrimerDespacho
      ) {
        const cortes = await tx.corteFacturacion.findMany({
          where: { contratoId: contrato.id },
        });
        if (
          cortes.every(
            (corte) => corte.estado !== EstadoCorteFacturacion.FACTURADO,
          )
        ) {
          const dayKey = (date: Date) => {
            const parts = new Intl.DateTimeFormat('en-US', {
              timeZone: 'America/Managua',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).formatToParts(date);
            const get = (type: string) =>
              Number(parts.find((part) => part.type === type)?.value);
            return Date.UTC(get('year'), get('month') - 1, get('day'));
          };
          const deltaDays = Math.round(
            (dayKey(fechaDespacho) - dayKey(contrato.fechaInicio)) / 86400000,
          );
          if (deltaDays !== 0) {
            const shift = (date: Date) =>
              new Date(date.getTime() + deltaDays * 86400000);
            await tx.contrato.update({
              where: { id: contrato.id },
              data: {
                fechaInicio: shift(contrato.fechaInicio),
                fechaFin: shift(contrato.fechaFin),
                fechaFinPactada: shift(contrato.fechaFin),
              },
            });
            for (const corte of cortes) {
              await tx.corteFacturacion.update({
                where: { id: corte.id },
                data: {
                  fechaInicio: shift(corte.fechaInicio),
                  fechaFin: shift(corte.fechaFin),
                },
              });
            }
            await tx.reserva.updateMany({
              where: { contratoId: contrato.id },
              data: {
                fechaInicio: shift(contrato.fechaInicio),
                fechaFin: shift(contrato.fechaFin),
              },
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
          // El DTO es una instancia de clase: se guarda como JSON plano.
          actaEntregaData: dto.actaEntregaData
            ? (JSON.parse(
                JSON.stringify(dto.actaEntregaData),
              ) as Prisma.InputJsonObject)
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
    const {
      contratoId,
      solicitudRetornoId,
      recibidoPor,
      entregadoPor,
      cedulaEntregante,
      actaRetornoData,
      fechaDevolucion,
      items,
    } = dto;

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
      // Serializa retornos parciales concurrentes y la creación 1:1 de la liquidación.
      await tx.$executeRaw`SELECT id FROM "contratos" WHERE id = ${contrato.id} FOR UPDATE`;

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
          await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${item.equipoId} FOR UPDATE`;

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
          if (!item.inspeccionEstado) {
            throw new BadRequestException(
              `Debe completar la inspección física del equipo ${equipo.modelo || equipo.id} antes de recibirlo`,
            );
          }
          const requiereHorometro =
            equipo.tieneHorometro === true ||
            (equipo.tieneHorometro === undefined &&
              (equipo.horometro > 0 ||
                equipo.tipoControl === TipoControlEquipo.SERIALIZADO));

          if (
            equipo.tipoControl === TipoControlEquipo.SERIALIZADO &&
            requiereHorometro &&
            item.horometroFinal === undefined
          ) {
            throw new BadRequestException(
              `Debe registrar el horómetro final del equipo ${equipo.modelo}`,
            );
          }

          const cantRetornada =
            item.cantidadRetornada !== undefined ? item.cantidadRetornada : 1;
          const cantPerdida = item.cantidadPerdida || 0;
          const cantDanada = item.cantidadDañada || 0;
          if (
            !Number.isInteger(cantRetornada) ||
            cantRetornada < 0 ||
            !Number.isInteger(cantPerdida) ||
            cantPerdida < 0 ||
            !Number.isInteger(cantDanada) ||
            cantDanada < 0 ||
            cantRetornada + cantPerdida < 1
          ) {
            throw new BadRequestException(
              'Las cantidades recibidas, dañadas y perdidas deben ser enteros válidos.',
            );
          }
          if (cantDanada > cantRetornada) {
            throw new BadRequestException(
              'Las unidades dañadas no pueden superar las unidades recibidas.',
            );
          }
          const hayDanio = Boolean(
            item.daniosDetectados ||
            item.danios?.length ||
            item.inspeccionEstado?.estadoFisico === 'DANADO' ||
            item.inspeccionEstado?.funcionamiento === 'NO_FUNCIONA' ||
            item.inspeccionEstado?.accesoriosCompletos === false,
          );
          if (
            equipo.tipoControl === TipoControlEquipo.POR_CANTIDAD &&
            hayDanio &&
            cantDanada === 0
          ) {
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
              (acc: number, r) =>
                acc + r.cantidadRetornada + (r.cantidadPerdida || 0),
              0,
            );

            const pendienteRetorno = totalDespachado - totalRetornado;
            if (totalDespachado > 0 && pendienteRetorno <= 0) {
              throw new BadRequestException(
                `Doble retorno rechazado: el equipo ya fue devuelto en su totalidad para este contrato (${totalRetornado}/${totalDespachado}).`,
              );
            }
            if (
              totalDespachado > 0 &&
              cantRetornada + cantPerdida > pendienteRetorno
            ) {
              throw new BadRequestException(
                `Retorno excesivo rechazado: se intentan procesar ${cantRetornada + cantPerdida} unidades, pero solo hay ${pendienteRetorno} pendientes de retorno.`,
              );
            }
          }

          const horoAnterior = equipo ? equipo.horometro : 0;
          const horoFinal = item.horometroFinal || 0.0;
          if (
            requiereHorometro &&
            item.horometroFinal !== undefined &&
            item.horometroFinal < horoAnterior
          ) {
            throw new BadRequestException(
              `El horómetro final del equipo ${equipo.modelo} no puede ser menor que la lectura registrada (${horoAnterior}).`,
            );
          }
          const horasCalc = Math.max(0, horoFinal - horoAnterior);
          return { item, equipo, horoAnterior, horoFinal, horasCalc, requiereHorometro };
        }),
      );

      const fechaRecepcionFisica = fechaDevolucion
        ? new Date(fechaDevolucion)
        : actaRetornoData &&
            typeof actaRetornoData.fechaRecepcionFisica === 'string'
          ? new Date(String(actaRetornoData.fechaRecepcionFisica))
          : new Date();

      const retorno = await tx.devolucion.create({
        data: {
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          fechaDevolucion: fechaRecepcionFisica,
          solicitudRetornoId: solicitudRetornoId || undefined,
          recibidoPor,
          entregadoPor,
          cedulaEntregante,
          actaRetornoData: actaRetornoData
            ? (actaRetornoData as Prisma.InputJsonObject)
            : undefined,
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
              inspeccionEstado:
                item.inspeccionEstado as unknown as Prisma.InputJsonValue,
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
        requiereHorometro,
      } of itemsConHoras) {
        if (equipo) {
          const cantRetornada = item.cantidadRetornada ?? 1;
          const nuevoHorometro = requiereHorometro ? Math.max(horoAnterior, horoFinal) : horoAnterior;

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
          const detalle = retorno.items?.find(
            (detail) => detail.equipoId === equipo.id,
          );
          if (requiereReparacion && detalle) {
            await tx.mantenimiento.create({
              data: {
                equipoId: equipo.id,
                detalleDevolucionId: detalle.id,
                tipo: TipoMantenimiento.CORRECTIVO,
                estado: EstadoMantenimiento.EN_PROCESO,
                fechaProgramacion: new Date(),
                horometroServicio: nuevoHorometro,
                descripcion:
                  item.descripcionDanios ||
                  `Reparación por retorno del contrato ${contrato.codigo}`,
                costo: 0,
                cobrableCliente: Boolean(
                  item.danios?.some((d) => d.cobrable === true),
                ),
              },
            });
          }

          // Registrar lectura histórica de horómetro al retorno
          if (
            requiereHorometro &&
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

      const liquidacionRetorno =
        await this.createEarlyReturnSettlementIfComplete(
          tx,
          contrato.id,
          retorno.id,
        );

      return liquidacionRetorno ? { ...retorno, liquidacionRetorno } : retorno;
    });
  }

  private async createEarlyReturnSettlementIfComplete(
    tx: Prisma.TransactionClient,
    contratoId: string,
    devolucionCierreId: string,
  ) {
    // La comprobación defensiva mantiene compatibles dobles de prueba antiguos.
    if (!tx.liquidacionRetorno || !tx.contrato.findUnique) return null;

    const contrato = await tx.contrato.findUnique({
      where: { id: contratoId },
      include: {
        items: { include: { equipo: true } },
        cotizacion: { include: { items: true } },
        despachos: { include: { items: true } },
        devoluciones: { include: { items: true } },
        cortesFacturacion: true,
        liquidacionRetorno: true,
      },
    });
    if (!contrato || contrato.liquidacionRetorno) {
      return contrato?.liquidacionRetorno ?? null;
    }

    const totalDespachado = contrato.despachos.reduce(
      (sum, despacho) =>
        sum + despacho.items.reduce((acc, item) => acc + item.cantidad, 0),
      0,
    );
    const totalRetornado = contrato.devoluciones.reduce(
      (sum, devolucion) =>
        sum +
        devolucion.items.reduce(
          (acc, item) => acc + item.cantidadRetornada + item.cantidadPerdida,
          0,
        ),
      0,
    );
    if (totalDespachado === 0 || totalRetornado < totalDespachado) return null;

    const devolucionCierre = contrato.devoluciones.find(
      (item) => item.id === devolucionCierreId,
    );
    if (!devolucionCierre) return null;
    const fechaRecepcion = devolucionCierre.fechaDevolucion;
    const recepcionDay = rentalCalendarDay(fechaRecepcion);
    const fechaFinPactada = contrato.fechaFinPactada ?? contrato.fechaFin;
    const finPactadoDay = rentalCalendarDay(fechaFinPactada);
    const diasAnticipados = Math.max(
      0,
      Math.round((finPactadoDay - recepcionDay) / 86400000),
    );
    if (diasAnticipados < 1) return null;

    const firstDispatch = contrato.despachos.reduce<Date | null>(
      (earliest, despacho) =>
        !earliest || despacho.fechaDespacho < earliest
          ? despacho.fechaDespacho
          : earliest,
      null,
    );
    if (!firstDispatch) return null;
    const diasPactados = Math.max(
      0,
      Math.round((finPactadoDay - rentalCalendarDay(firstDispatch)) / 86400000),
    );
    // El día de recepción no se cobra: [primer despacho, recepción física).
    const diasCobrados = Math.max(
      0,
      Math.round((recepcionDay - rentalCalendarDay(firstDispatch)) / 86400000),
    );
    const usage = rentalCutUsage(contrato, firstDispatch, fechaFinPactada);
    const montoDevengado = usage?.total ?? 0;
    const montoCortes = contrato.cortesFacturacion
      .filter((corte) => corte.estado !== EstadoCorteFacturacion.ANULADO)
      .reduce((sum, corte) => sum + Number(corte.monto), 0);
    const montoPactado =
      montoCortes > 0
        ? montoCortes
        : contrato.cotizacion
          ? Number(contrato.cotizacion.total)
          : contrato.items.reduce(
              (sum, item) =>
                sum +
                Number(item.precioRenta) *
                  item.cantidad *
                  Number(
                    item.tipoTarifa === 'HORA'
                      ? (item.horasPactadas ?? item.dias ?? 1)
                      : (item.dias ?? 1),
                  ),
              0,
            );
    // Incluye anticipos/facturas de cotización y facturas del contrato. El estado
    // FACTURADO del corte no demuestra por sí solo cuánto se documentó fiscalmente.
    const facturas = await tx.factura.findMany({
      where: {
        OR: [
          { contratoId },
          ...(contrato.cotizacionId
            ? [{ cotizacionId: contrato.cotizacionId }]
            : []),
        ],
        estado: { not: 'CANCELADA' },
        tipoFactura: { in: ['ESTANDAR', 'ANTICIPO'] },
      },
      select: { total: true },
    });
    const montoFacturado = facturas.reduce(
      (sum, factura) => sum + Number(factura.total),
      0,
    );
    const creditoCliente = Math.max(
      0,
      Math.round((montoFacturado - montoDevengado) * 100) / 100,
    );

    await tx.devolucion.update({
      where: { id: devolucionCierreId },
      data: { esRetornoAnticipado: true, diasAnticipados },
    });
    return tx.liquidacionRetorno.create({
      data: {
        contratoId,
        devolucionCierreId,
        fechaInicioCobro: firstDispatch,
        fechaRecepcion,
        fechaFinPactada,
        diasPactados,
        diasCobrados,
        diasAnticipados,
        montoPactado,
        montoDevengado,
        montoFacturado,
        creditoCliente,
        requiereNotaCredito: creditoCliente > 0,
        detalle: {
          politica: 'TIEMPO_EFECTIVO_TARIFA_PACTADA',
          diaDevolucionCobrado: false,
          ceseCobro: 'RECEPCION_FISICA',
          lineas: usage?.lines ?? [],
        },
      },
    });
  }

  async findReturnSettlement(retornoId: string, empresaId: string) {
    const liquidacion = await this.prisma.liquidacionRetorno.findFirst({
      where: {
        devolucionCierreId: retornoId,
        contrato: { sucursal: { empresaId } },
      },
      include: { contrato: true, devolucionCierre: true },
    });
    if (!liquidacion) {
      throw new NotFoundException(
        'No existe una liquidación anticipada para este retorno',
      );
    }
    return liquidacion;
  }

  async approveReturnSettlement(
    retornoId: string,
    empresaId: string,
    usuarioId?: string,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let liquidacion = await tx.liquidacionRetorno.findFirst({
        where: {
          devolucionCierreId: retornoId,
          contrato: { sucursal: { empresaId } },
        },
      });
      if (!liquidacion) {
        throw new NotFoundException(
          'No existe una liquidación anticipada para este retorno',
        );
      }
      await tx.$executeRaw`SELECT id FROM "contratos" WHERE id = ${liquidacion.contratoId} FOR UPDATE`;
      await tx.$executeRaw`SELECT id FROM "liquidaciones_retorno" WHERE id = ${liquidacion.id} FOR UPDATE`;
      await tx.$executeRaw`SELECT id FROM "cortes_facturacion" WHERE contrato_id = ${liquidacion.contratoId} FOR UPDATE`;
      // Releer después de los locks: una aprobación concurrente puede haber
      // finalizado el contrato mientras esta transacción esperaba.
      const lockedLiquidacion = await tx.liquidacionRetorno.findFirst({
        where: {
          id: liquidacion.id,
          contrato: { sucursal: { empresaId } },
        },
      });
      if (!lockedLiquidacion)
        throw new NotFoundException('Liquidación anticipada no encontrada');
      liquidacion = lockedLiquidacion;
      if (liquidacion.estado === EstadoLiquidacionRetorno.APROBADA)
        return liquidacion;
      if (
        liquidacion.estado !== EstadoLiquidacionRetorno.PENDIENTE_APROBACION
      ) {
        throw new BadRequestException(
          `La liquidación está en estado ${liquidacion.estado}`,
        );
      }
      const contrato = await tx.contrato.findUnique({
        where: { id: liquidacion.contratoId },
        include: {
          items: { include: { equipo: true } },
          cotizacion: { include: { items: true } },
          despachos: { include: { items: true } },
          devoluciones: { include: { items: true } },
          cortesFacturacion: { orderBy: { numeroCorte: 'asc' } },
        },
      });
      if (!contrato || contrato.estado !== 'ACTIVO') {
        throw new BadRequestException(
          'El contrato debe estar ACTIVO para aprobar la liquidación',
        );
      }

      const totalDespachado = contrato.despachos.reduce(
        (sum, despacho) =>
          sum + despacho.items.reduce((acc, item) => acc + item.cantidad, 0),
        0,
      );
      const totalRetornado = contrato.devoluciones.reduce(
        (sum, devolucion) =>
          sum +
          devolucion.items.reduce(
            (acc, item) => acc + item.cantidadRetornada + item.cantidadPerdida,
            0,
          ),
        0,
      );
      if (totalRetornado < totalDespachado) {
        throw new BadRequestException(
          'No se puede aprobar: todavía existen unidades pendientes de retorno',
        );
      }

      // El monto de la creación es preliminar. Se recalcula bajo lock al aprobar
      // para incorporar anticipos o facturas emitidas después de la recepción.
      const facturasActuales = await tx.factura.findMany({
        where: {
          OR: [
            { contratoId: contrato.id },
            ...(contrato.cotizacionId
              ? [{ cotizacionId: contrato.cotizacionId }]
              : []),
          ],
          estado: { not: 'CANCELADA' },
          tipoFactura: { in: ['ESTANDAR', 'ANTICIPO'] },
        },
        select: { total: true },
      });
      const montoFacturadoActual = facturasActuales.reduce(
        (sum, factura) => sum + Number(factura.total),
        0,
      );
      const creditoActual = Math.max(
        0,
        Math.round(
          (montoFacturadoActual - Number(liquidacion.montoDevengado)) * 100,
        ) / 100,
      );

      for (const corte of contrato.cortesFacturacion) {
        // Lo ya facturado es evidencia fiscal y nunca se modifica.
        if (corte.estado === EstadoCorteFacturacion.FACTURADO) continue;
        if (corte.estado !== EstadoCorteFacturacion.PENDIENTE) continue;
        if (
          rentalCalendarDay(corte.fechaInicio) >=
          rentalCalendarDay(liquidacion.fechaRecepcion)
        ) {
          await tx.corteFacturacion.update({
            where: { id: corte.id },
            data: { estado: EstadoCorteFacturacion.ANULADO },
          });
          continue;
        }
        const fechaFin =
          rentalCalendarDay(corte.fechaFin) >
          rentalCalendarDay(liquidacion.fechaRecepcion)
            ? liquidacion.fechaRecepcion
            : corte.fechaFin;
        const usage = rentalCutUsage(contrato, corte.fechaInicio, fechaFin);
        if (!usage || usage.total <= 0) {
          await tx.corteFacturacion.update({
            where: { id: corte.id },
            data: { estado: EstadoCorteFacturacion.ANULADO },
          });
        } else {
          await tx.corteFacturacion.update({
            where: { id: corte.id },
            data: { fechaFin, monto: usage.total },
          });
        }
      }

      await tx.reserva.updateMany({
        where: { contratoId: contrato.id },
        data: { estado: 'CANCELADA' },
      });
      await tx.contrato.update({
        where: { id: contrato.id },
        data: {
          estado: 'FINALIZADO',
          fechaCierreReal: liquidacion.fechaRecepcion,
          tipoCierre: TipoCierreContrato.ANTICIPADO,
        },
      });
      const aprobada = await tx.liquidacionRetorno.update({
        where: { id: liquidacion.id },
        data: {
          estado: EstadoLiquidacionRetorno.APROBADA,
          aprobadoPor: usuarioId,
          aprobadoAt: new Date(),
          montoFacturado: montoFacturadoActual,
          creditoCliente: creditoActual,
          requiereNotaCredito: creditoActual > 0,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'LIQUIDACION_RETORNO_ANTICIPADO_APROBADA',
        entidadTipo: 'LIQUIDACION_RETORNO',
        entidadId: liquidacion.id,
        detalles: {
          contratoId: contrato.id,
          retornoId,
          diasCobrados: liquidacion.diasCobrados,
          montoDevengado: Number(liquidacion.montoDevengado),
        },
      });
      return aprobada;
    });
  }

  async selectReturnCreditDestination(
    retornoId: string,
    destinoCredito: 'REEMBOLSO' | 'SALDO_FAVOR',
    empresaId: string,
    usuarioId?: string,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const liquidacion = await tx.liquidacionRetorno.findFirst({
        where: {
          devolucionCierreId: retornoId,
          contrato: { sucursal: { empresaId } },
        },
      });
      if (!liquidacion)
        throw new NotFoundException('Liquidación anticipada no encontrada');
      if (liquidacion.estado !== EstadoLiquidacionRetorno.APROBADA) {
        throw new BadRequestException(
          'Primero debe aprobarse manualmente la liquidación',
        );
      }
      if (Number(liquidacion.creditoCliente) <= 0) {
        throw new BadRequestException(
          'La liquidación no genera crédito para el cliente',
        );
      }
      const updated = await tx.liquidacionRetorno.update({
        where: { id: liquidacion.id },
        data: { destinoCredito: destinoCredito },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'DESTINO_CREDITO_RETORNO_SELECCIONADO',
        entidadTipo: 'LIQUIDACION_RETORNO',
        entidadId: liquidacion.id,
        detalles: { destinoCredito },
      });
      return updated;
    });
  }

  // --- SUSTITUCIÓN DE EQUIPO POR AVERÍA (EQUIPMENT SWAP) ---

  async getCompatibleReplacements(
    contratoId: string,
    equipoId: string,
    empresaId: string,
  ) {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: contratoId, sucursal: { empresaId } },
      include: {
        cliente: true,
        items: { include: { equipo: true } },
      },
    });

    if (!contrato) {
      throw new NotFoundException(
        `No se encontró el contrato con ID: ${contratoId}`,
      );
    }

    const equipoActual = await this.prisma.equipo.findFirst({
      where: { id: equipoId, empresaId },
      include: { categoria: true, subcategoria: true, marca: true },
    });

    if (!equipoActual) {
      throw new NotFoundException(
        `No se encontró el equipo a sustituir con ID: ${equipoId}`,
      );
    }

    // Buscar equipos disponibles en la sucursal o empresa
    const equiposDisponibles = await this.prisma.equipo.findMany({
      where: {
        empresaId,
        id: { not: equipoId },
        estado: EstadoEquipo.DISPONIBLE,
        cantidadDisponible: { gt: 0 },
      },
      include: { categoria: true, subcategoria: true, marca: true },
      orderBy: [{ categoriaId: 'asc' }, { modelo: 'asc' }],
    });

    // Clasificar: compatible directa (misma categoría / subcategoría / modelo) vs otros disponibles
    const compatibles = equiposDisponibles.map((eq) => {
      const mismaCategoria = eq.categoriaId === equipoActual.categoriaId;
      const mismaSubcategoria = Boolean(
        eq.subcategoriaId && eq.subcategoriaId === equipoActual.subcategoriaId,
      );
      const mismoModelo =
        eq.modelo.trim().toLowerCase() === equipoActual.modelo.trim().toLowerCase();

      return {
        ...eq,
        esReemplazoDirecto: mismoModelo || mismaSubcategoria,
        mismaCategoria,
      };
    });

    // Ordenar poniendo primero los reemplazos directos
    compatibles.sort((a, b) => {
      if (a.esReemplazoDirecto && !b.esReemplazoDirecto) return -1;
      if (!a.esReemplazoDirecto && b.esReemplazoDirecto) return 1;
      if (a.mismaCategoria && !b.mismaCategoria) return -1;
      if (!a.mismaCategoria && b.mismaCategoria) return 1;
      return 0;
    });

    return {
      contrato: {
        id: contrato.id,
        codigo: contrato.codigo,
        cliente: contrato.cliente,
      },
      equipoActual,
      reemplazosDisponibles: compatibles,
    };
  }

  async swapEquipment(
    dto: SwapEquipmentDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      contratoId,
      equipoActualId,
      equipoNuevoId,
      motivo,
      horometroFinalActual,
      combustibleRetornoActual,
      observaciones,
      responsableEntrega,
      responsableRecepcion,
      cedulaReceptor,
    } = dto;

    if (equipoActualId === equipoNuevoId) {
      throw new BadRequestException(
        'El equipo sustituto debe ser diferente al equipo actual averiado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validar y bloquear el Contrato
      await tx.$executeRaw`SELECT id FROM "contratos" WHERE id = ${contratoId} FOR UPDATE`;
      const contrato = await tx.contrato.findFirst({
        where: { id: contratoId, sucursal: { empresaId } },
        include: {
          cliente: true,
          items: { include: { equipo: true } },
        },
      });

      if (!contrato) {
        throw new NotFoundException(
          `No se encontró el contrato con ID: ${contratoId}`,
        );
      }

      if (['FINALIZADO', 'CANCELADO'].includes(contrato.estado)) {
        throw new BadRequestException(
          `No se puede sustituir equipo en un contrato en estado ${contrato.estado}.`,
        );
      }

      // 2. Validar que el equipo actual pertenezca al contrato
      const detalleActual = contrato.items.find(
        (it) => it.equipoId === equipoActualId,
      );
      if (!detalleActual) {
        throw new BadRequestException(
          'El equipo averiado a retirar no forma parte de los ítems del contrato.',
        );
      }

      // 3. Validar y bloquear equipo actual
      await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${equipoActualId} FOR UPDATE`;
      const equipoActual = await tx.equipo.findFirst({
        where: { id: equipoActualId, empresaId },
      });
      if (!equipoActual) {
        throw new NotFoundException('No se encontró el equipo averiado a retirar.');
      }

      // 4. Validar y bloquear equipo nuevo
      await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${equipoNuevoId} FOR UPDATE`;
      const equipoNuevo = await tx.equipo.findFirst({
        where: { id: equipoNuevoId, empresaId },
      });
      if (!equipoNuevo) {
        throw new NotFoundException('No se encontró el equipo sustituto seleccionado.');
      }
      if (equipoNuevo.estado !== EstadoEquipo.DISPONIBLE) {
        throw new BadRequestException(
          `El equipo sustituto ${equipoNuevo.modelo} no está disponible (estado actual: ${equipoNuevo.estado}).`,
        );
      }
      if (equipoNuevo.cantidadDisponible <= 0) {
        throw new BadRequestException(
          `El equipo sustituto ${equipoNuevo.modelo} no tiene existencias disponibles en almacén.`,
        );
      }

      // 5. Retirar equipo averiado:
      const horoActual = equipoActual.horometro || 0;
      const nuevoHoroActual =
        horometroFinalActual !== undefined && horometroFinalActual >= horoActual
          ? horometroFinalActual
          : horoActual;

      await tx.equipo.update({
        where: { id: equipoActual.id },
        data: {
          estado: EstadoEquipo.EN_MANTENIMIENTO,
          cantidadDisponible: 0,
          horometro: nuevoHoroActual,
        },
      });

      if (nuevoHoroActual > horoActual || equipoActual.tieneHorometro) {
        await tx.lecturaHorometro.create({
          data: {
            equipoId: equipoActual.id,
            horometroAnterior: horoActual,
            horometroNuevo: nuevoHoroActual,
            horasTrabajadas: Math.max(0, nuevoHoroActual - horoActual),
            origen: OrigenLecturaHorometro.RETORNO,
            registradoPor: responsableEntrega || 'Operador de Patio',
            observaciones: `Retiro por sustitución en contrato ${contrato.codigo}. Motivo: ${motivo}`,
          },
        });
      }

      // Crear Orden de Mantenimiento Correctivo sin costo para el cliente
      const mantenimiento = await tx.mantenimiento.create({
        data: {
          equipoId: equipoActual.id,
          tipo: TipoMantenimiento.CORRECTIVO,
          estado: EstadoMantenimiento.EN_PROCESO,
          fechaProgramacion: new Date(),
          horometroServicio: nuevoHoroActual,
          descripcion: `Avería en obra - Sustitución de contrato ${contrato.codigo}: ${motivo}.`,
          costo: 0.0,
        },
      });

      // 6. Asignar equipo sustituto al contrato:
      await tx.detalleContrato.update({
        where: { id: detalleActual.id },
        data: {
          equipoId: equipoNuevo.id,
          tipoControl: equipoNuevo.tipoControl,
          horometroInicial: equipoNuevo.horometro,
        },
      });

      // Reasignar reservas si existen
      await tx.reserva.updateMany({
        where: {
          contratoId: contrato.id,
          equipoId: equipoActual.id,
          estado: { not: 'CANCELADA' },
        },
        data: {
          equipoId: equipoNuevo.id,
        },
      });

      // Poner equipo nuevo en estado DESPACHADO
      await tx.equipo.update({
        where: { id: equipoNuevo.id },
        data: {
          estado: EstadoEquipo.DESPACHADO,
          cantidadDisponible:
            equipoNuevo.tipoControl === TipoControlEquipo.SERIALIZADO
              ? 0
              : Math.max(0, equipoNuevo.cantidadDisponible - 1),
        },
      });

      // 7. Generar Despacho Oficial con Acta de Sustitución
      const ahora = new Date();
      const horaStr = ahora.toLocaleTimeString('es-NI', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const ampm = ahora.getHours() >= 12 ? 'PM' : 'AM';

      const actaData = {
        tipoActa: 'SUSTITUCION',
        titulo: 'ACTA OFICIAL DE SUSTITUCIÓN Y ENTREGA DE EQUIPO REEMPLAZO',
        fecha: ahora.toLocaleDateString('es-NI'),
        hora: horaStr,
        ampm,
        contratoNo: contrato.codigo,
        fechaInicioPactada: contrato.fechaInicio.toISOString(),
        fechaFinPactada: (contrato.fechaFinPactada || contrato.fechaFin).toISOString(),
        entregadoPor: responsableEntrega || 'BM Construcciones / Logística',
        recibidoPor: responsableRecepcion || contrato.cliente?.nombre || 'Cliente',
        cedula: cedulaReceptor || contrato.cliente?.rfc || contrato.cliente?.cedula || '',
        observaciones: `Sustitución por avería en obra. Equipo Retirado: ${equipoActual.modelo} (Serie: ${equipoActual.numeroSerie || 'N/A'}, Horómetro: ${nuevoHoroActual} hrs). Equipo Entregado: ${equipoNuevo.modelo} (Serie: ${equipoNuevo.numeroSerie || 'N/A'}, Horómetro: ${equipoNuevo.horometro} hrs). Motivo: ${motivo}. ${observaciones || ''}`.trim(),
        items: [
          {
            itemNum: '01',
            cant: 1,
            descripcion: `${equipoNuevo.modelo}${equipoNuevo.numeroSerie ? ` (Serie: ${equipoNuevo.numeroSerie})` : ''} [EQUIPO DE SUSTITUCIÓN]`,
            horas: equipoNuevo.tieneHorometro ? String(equipoNuevo.horometro) : 'N/A',
            combustible: combustibleRetornoActual || '100%',
          },
        ],
      };

      const despacho = await tx.despacho.create({
        data: {
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          operadorNombre: responsableEntrega || 'Operador Despacho',
          comentarios: `Despacho de sustitución por avería del equipo ${equipoActual.modelo}. Motivo: ${motivo}`,
          actaEntregaData: actaData as Prisma.InputJsonObject,
          items: {
            create: [
              {
                equipoId: equipoNuevo.id,
                numeroSerie: equipoNuevo.numeroSerie,
                cantidad: 1,
                horometroInicial: equipoNuevo.horometro,
                estadoSalida: 'BUENO',
                checklistOk: true,
                observaciones: `Sustitución de equipo ${equipoActual.modelo} por avería: ${motivo}`,
              },
            ],
          },
        },
        include: {
          items: { include: { equipo: true } },
        },
      });

      // 8. Auditoría Forense
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'EQUIPO_SUSTITUIDO_POR_AVERIA',
        entidadTipo: 'CONTRATO',
        entidadId: contrato.id,
        detalles: {
          contratoId: contrato.id,
          codigoContrato: contrato.codigo,
          equipoSalienteId: equipoActual.id,
          equipoSalienteModelo: equipoActual.modelo,
          equipoEntranteId: equipoNuevo.id,
          equipoEntranteModelo: equipoNuevo.modelo,
          motivo,
          mantenimientoId: mantenimiento.id,
          despachoId: despacho.id,
        },
      });

      return {
        contratoId: contrato.id,
        codigoContrato: contrato.codigo,
        equipoSaliente: {
          id: equipoActual.id,
          modelo: equipoActual.modelo,
          estado: EstadoEquipo.EN_MANTENIMIENTO,
          mantenimientoId: mantenimiento.id,
        },
        equipoEntrante: {
          id: equipoNuevo.id,
          modelo: equipoNuevo.modelo,
          estado: EstadoEquipo.DESPACHADO,
          despachoId: despacho.id,
        },
        despacho,
      };
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
    const retornos = await this.prisma.devolucion.findMany({
      where: { sucursal: { empresaId } },
      include: {
        contrato: {
          include: {
            cliente: true,
            items: { include: { equipo: true } },
            cotizacion: { include: { items: true } },
          },
        },
        solicitudRetorno: true,
        items: { include: { equipo: true, inspeccionesDanio: true } },
        liquidacionCierre: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Alias estable de API; `liquidacionCierre` es el nombre interno de Prisma.
    return retornos.map((retorno) => ({
      ...retorno,
      liquidacionRetorno: retorno.liquidacionCierre,
    }));
  }
}
