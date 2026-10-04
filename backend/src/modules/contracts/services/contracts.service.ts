import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateContractFromQuotationDto,
  CreateDirectContractDto,
} from '../dto/create-contract.dto';
import { HorasPorDiaItemDto, UpdateCorteDto } from '../dto/create-corte.dto';
import {
  EstadoContrato,
  EstadoCorteFacturacion,
  EstadoCotizacion,
  EstadoEquipo,
  TipoControlEquipo,
  EstadoReserva,
  Prisma,
} from '@prisma/client';
import { resolveQuotationEquipment } from '../utils/resolve-quotation-equipment';
import {
  roundMoney,
  assertNonNegative,
  assertPositive,
} from '../../../common/utils/financial-calculator';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';
import { cutDays, plannedDailyGrossRate, quotationMultiplier } from '../utils/contract-cut-pricing';
import { nextContractCode } from '../../../common/utils/numbering.util';
import { assertEmpresaId } from '../../../common/utils/tenant.util';
import { calcularBalanceRetorno } from '../utils/return-balance';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  // El total cotizado puede incluir IVA/descuentos; conservar esa proporción
  // sobre las tarifas pactadas, sin dividir el total entre el número de cortes.
  private dailyGrossRate(contrato: {
    fechaInicio: Date; fechaFin: Date;
    items: Array<{ equipoId: string; precioRenta: number | Prisma.Decimal; cantidad: number; dias?: number | null; horasPactadas?: number | Prisma.Decimal | null; tipoTarifa?: string | null }>;
    cotizacion?: { total: number | Prisma.Decimal; items?: Array<{ precioUnitario: number | Prisma.Decimal; cantidad: number; dias?: number | null; horas?: number | null; tipoCobro?: string | null }> } | null;
  }): number | null {
    return plannedDailyGrossRate(contrato);
  }

  // 1. Creación Directa de Contrato (Asignando clienteId directamente sin obligar a Cotización previa)
  async createDirect(
    dto: CreateDirectContractDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      clienteId,
      fechaInicio,
      fechaFin,
      depositoGarantia,
      condiciones,
      periodoDiasCorte,
      items,
    } = dto;

    const duracionContratoDias = cutDays(new Date(fechaInicio), new Date(fechaFin));
    if (duracionContratoDias < 1) {
      throw new BadRequestException('La fecha final debe ser posterior a la fecha inicial del contrato.');
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });

    if (!cliente) {
      throw new NotFoundException(
        `No se encontró el cliente con ID: ${clienteId}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const codigoContrato = await nextContractCode(tx);

      const sucursal = await tx.sucursal.findFirst({ where: { empresaId } });
      if (!sucursal) {
        throw new BadRequestException(
          'No hay sucursales registradas para esta empresa.',
        );
      }

      for (const item of items) {
        if (!item.equipoId) {
          throw new BadRequestException(
            'Debe asignar un equipo físico a cada ítem del contrato.',
          );
        }
        const cantidad = item.cantidad ?? 1;
        if (!Number.isInteger(cantidad) || cantidad < 1) {
          throw new BadRequestException(
            'La cantidad de cada equipo debe ser un entero mayor que cero.',
          );
        }
      }

      // Bloqueo pesimista de fila (Row Lock) para cada equipo involucrado
      const uniqueEquipoIds = [...new Set(items.map((item) => item.equipoId!))];
      for (const eqId of uniqueEquipoIds) {
        await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${eqId} FOR UPDATE`;
      }

      const equipos = await tx.equipo.findMany({
        where: {
          id: { in: uniqueEquipoIds },
          empresaId,
        },
      });
      const equiposById = new Map(equipos.map((equipo) => [equipo.id, equipo]));
      const cantidadesSolicitadas = new Map<string, number>();

      const processedItems = items.map((item) => {
        const equipo = equiposById.get(item.equipoId!);
        if (!equipo) {
          throw new BadRequestException(
            `El equipo ${item.equipoId} no existe en la empresa del contrato.`,
          );
        }
        const cantidad = item.cantidad ?? 1;

        if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
          if (cantidad !== 1) {
            throw new BadRequestException(
              `El equipo serializado ${equipo.modelo} (serie: ${equipo.numeroSerie || 'S/N'}) solo puede contratarse en cantidad exactamente 1.`,
            );
          }
          if (
            equipo.cantidadDisponible < 1 ||
            equipo.estado !== EstadoEquipo.DISPONIBLE
          ) {
            throw new BadRequestException(
              `El equipo serializado ${equipo.modelo} (serie: ${equipo.numeroSerie || 'S/N'}) no está disponible para reserva (Estado: ${equipo.estado}).`,
            );
          }
        }

        const cantidadSolicitada =
          (cantidadesSolicitadas.get(equipo.id) ?? 0) + cantidad;
        if (equipo.cantidadDisponible < cantidadSolicitada) {
          throw new BadRequestException(
            `Stock insuficiente para el equipo ${equipo.descripcion || equipo.modelo}. Disponible: ${equipo.cantidadDisponible}`,
          );
        }
        cantidadesSolicitadas.set(equipo.id, cantidadSolicitada);

        const isHourly =
          item.tipoTarifa === 'HORA' || item.tipoCobro === 'POR_HORA';
        const officialRate = isHourly
          ? equipo.precioRentaHora
          : equipo.precioRentaDia;
        if (officialRate === undefined || officialRate === null) {
          throw new BadRequestException(
            `El equipo ${equipo.id} no tiene una tarifa oficial para ${isHourly ? 'hora' : 'día'}.`,
          );
        }
        const precioRenta = assertNonNegative(
          officialRate,
          'tarifa oficial del equipo',
        );
        const horasDiarias = isHourly && item.horasPorDia !== undefined
          ? assertPositive(item.horasPorDia, 'horasPorDia') : null;
        const horasTotales = isHourly
          ? horasDiarias !== null
            ? roundMoney(horasDiarias * duracionContratoDias)
            : assertPositive(item.horas ?? item.dias ?? 1, 'horas')
          : null;
        const unidadesPactadas = isHourly ? horasTotales : duracionContratoDias;
        const dias = unidadesPactadas !== undefined
          ? assertPositive(unidadesPactadas, isHourly ? 'horas' : 'dias')
          : 1;

        return {
          equipoId: equipo.id,
          precioRenta: roundMoney(precioRenta),
          cantidad,
          dias,
          tipoTarifa: isHourly ? 'HORA' : 'DIA',
          horasPorDia: horasDiarias,
          horasPactadas: horasTotales,
          tipoControl: equipo.tipoControl,
          horometroInicial: item.horometroInicial ?? equipo.horometro,
        };
      });
      const totalMonto = roundMoney(
        processedItems.reduce(
          (sum, item) =>
            sum + roundMoney(item.precioRenta * item.cantidad * (item.tipoTarifa === 'HORA' ? item.horasPactadas! : item.dias)),
          0,
        ),
      );

      const contrato = await tx.contrato.create({
        data: {
          codigo: codigoContrato,
          sucursalId: sucursal.id,
          clienteId: cliente.id,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          depositoGarantia: depositoGarantia
            ? assertNonNegative(depositoGarantia, 'depositoGarantia')
            : 0.0,
          condiciones:
            condiciones ||
            'Contrato directo estándar de alquiler de maquinaria.',
          estado: 'ACTIVO',
          items: {
            create: processedItems,
          },
        },
        include: {
          cliente: true,
          cotizacion: true,
          items: { include: { equipo: true } },
        },
      });

      // Reservar inventario real y crear registros en la tabla Reserva
      for (const [equipoId, cantReservada] of cantidadesSolicitadas.entries()) {
        const equipo = equiposById.get(equipoId)!;
        if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
          await tx.equipo.update({
            where: { id: equipoId },
            data: {
              cantidadDisponible: 0,
              estado: EstadoEquipo.RESERVADO,
            },
          });
        } else {
          await tx.equipo.update({
            where: { id: equipoId },
            data: {
              cantidadDisponible: Math.max(
                0,
                equipo.cantidadDisponible - cantReservada,
              ),
            },
          });
        }

        await tx.reserva.create({
          data: {
            contratoId: contrato.id,
            equipoId,
            fechaInicio: contrato.fechaInicio,
            fechaFin: contrato.fechaFin,
            estado: EstadoReserva.CONFIRMADA,
          },
        });
      }

      const diasCorte = periodoDiasCorte || 30;
      await this.generateCortesForContractTx(
        tx,
        contrato.id,
        diasCorte,
        totalMonto,
        contrato.fechaInicio,
        contrato.fechaFin,
        undefined,
        0,
        this.dailyGrossRate(contrato),
      );

      if (usuarioId && tx.usuario?.findUnique && tx.cliente?.update) {
        const asesor = await tx.usuario.findUnique({
          where: { id: usuarioId },
          select: { nombre: true, apellido: true },
        });
        if (asesor) {
          await tx.cliente.update({
            where: { id: cliente.id },
            data: {
              vendedor: `${asesor.nombre} ${asesor.apellido}`.trim(),
              vendedorId: cliente.vendedorId ? undefined : usuarioId,
            },
          });
        }
      }

      // Generar automáticamente Solicitud de Despacho en Módulo de Operaciones
      const countDesp = await tx.solicitudDespacho.count({
        where: { empresaId },
      });
      const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
      await tx.solicitudDespacho.create({
        data: {
          codigo: codigoDesp,
          empresaId,
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitadoPor: 'Sistema (Creación de Contrato)',
          fechaProgramada: contrato.fechaInicio,
          direccionEntrega:
            cliente.direccion || 'Dirección Registrada del Cliente',
          comentarios: `Despacho de equipos programado automáticamente por inicio del contrato ${contrato.codigo}`,
          estado: 'PENDIENTE',
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId || null,
        accion: 'CONTRATO_CREADO',
        entidadTipo: 'CONTRATO',
        entidadId: contrato.id,
        detalles: {
          codigo: contrato.codigo,
          clienteId: contrato.clienteId,
          fechaInicio: contrato.fechaInicio,
          fechaFin: contrato.fechaFin,
          estado: contrato.estado,
        },
      });

      return contrato;
    });
  }

  // 2. Creación desde Cotización Aceptada (Herencia automática de clienteId y bloqueo de cotización)
  async createFromQuotation(
    dto: CreateContractFromQuotationDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      cotizacionId,
      fechaInicio,
      fechaFin,
      depositoGarantia,
      condiciones,
      periodoDiasCorte,
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista a nivel de fila (Row Lock en PostgreSQL) para prevenir solicitudes concurrentes simultáneas
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE id = ${cotizacionId} FOR UPDATE`;

      // Verificar si ya existe un contrato activo/formalizado para esta cotización
      const existingContract = await tx.contrato.findFirst({
        where: { cotizacionId },
      });
      if (existingContract) {
        throw new ConflictException(
          `Ya existe un contrato formalizado (${existingContract.codigo}) para esta cotización.`,
        );
      }

      const cotizacion = await tx.cotizacion.findFirst({
        where: { id: cotizacionId, sucursal: { empresaId } },
        include: {
          cliente: true,
          items: {
            include: { equipo: true },
          },
        },
      });

      if (!cotizacion) {
        throw new NotFoundException(
          `No se encontró la cotización con ID: ${cotizacionId}`,
        );
      }

      if (cotizacion.estado !== EstadoCotizacion.ACEPTADA) {
        throw new BadRequestException(
          `Solo se pueden generar contratos a partir de cotizaciones en estado ACEPTADA. El estado actual es "${cotizacion.estado}"`,
        );
      }

      const codigoContrato = await nextContractCode(tx);

      const sucursalId =
        cotizacion.sucursalId ||
        (await tx.sucursal.findFirst({ where: { empresaId } }))?.id;

      if (!sucursalId) {
        throw new BadRequestException(
          'No se encontró sucursal activa para registrar el contrato',
        );
      }

      const contractItems = await resolveQuotationEquipment(
        tx,
        cotizacion.items,
        empresaId,
        sucursalId,
      );

      // Bloquear equipos y validar disponibilidad
      const uniqueEquipoIds = [
        ...new Set(
          contractItems
            .map((item) => item.equipo?.connect?.id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      for (const eqId of uniqueEquipoIds) {
        await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${eqId} FOR UPDATE`;
      }

      const equipos = await tx.equipo.findMany({
        where: { id: { in: uniqueEquipoIds }, empresaId },
      });
      const equiposById = new Map(equipos.map((eq) => [eq.id, eq]));
      const cantidadesSolicitadas = new Map<string, number>();

      for (const cItem of contractItems) {
        const equipoId = cItem.equipo?.connect?.id;
        if (!equipoId) {
          throw new BadRequestException(
            'El ítem no contiene un equipo válido.',
          );
        }
        const equipo = equiposById.get(equipoId);
        if (!equipo) {
          throw new BadRequestException(
            `El equipo ${equipoId} no fue encontrado.`,
          );
        }
        const cantidad = cItem.cantidad ?? 1;
        if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
          if (cantidad !== 1) {
            throw new BadRequestException(
              `El equipo serializado ${equipo.modelo} solo puede contratarse en cantidad 1.`,
            );
          }
          if (
            equipo.cantidadDisponible < 1 ||
            equipo.estado !== EstadoEquipo.DISPONIBLE
          ) {
            throw new BadRequestException(
              `El equipo serializado ${equipo.modelo} (serie: ${equipo.numeroSerie || 'S/N'}) no está disponible.`,
            );
          }
        }

        const cantidadSolicitada =
          (cantidadesSolicitadas.get(equipoId) ?? 0) + cantidad;
        if (equipo.cantidadDisponible < cantidadSolicitada) {
          throw new BadRequestException(
            `Stock insuficiente para el equipo ${equipo.descripcion || equipo.modelo}. Disponible: ${equipo.cantidadDisponible}`,
          );
        }
        cantidadesSolicitadas.set(equipoId, cantidadSolicitada);
      }

      const contrato = await tx.contrato.create({
        data: {
          codigo: codigoContrato,
          sucursalId,
          clienteId: cotizacion.clienteId, // Herencia automática de clienteId
          cotizacionId: cotizacion.id,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          depositoGarantia:
            depositoGarantia ?? cotizacion.depositoGarantia ?? 0.0,
          condiciones:
            condiciones ||
            cotizacion.condiciones ||
            'Contrato estándar de arrendamiento de equipos.',
          estado: periodoDiasCorte
            ? EstadoContrato.ACTIVO
            : EstadoContrato.SIN_ABRIR,
          items: {
            create: contractItems,
          },
        },
        include: {
          cliente: true,
          cotizacion: true,
          items: { include: { equipo: true } },
        },
      });

      // Reservar inventario real y registrar en Reserva
      for (const [equipoId, cantReservada] of cantidadesSolicitadas.entries()) {
        const equipo = equiposById.get(equipoId)!;
        if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
          await tx.equipo.update({
            where: { id: equipoId },
            data: {
              cantidadDisponible: 0,
              estado: EstadoEquipo.RESERVADO,
            },
          });
        } else {
          await tx.equipo.update({
            where: { id: equipoId },
            data: {
              cantidadDisponible: Math.max(
                0,
                equipo.cantidadDisponible - cantReservada,
              ),
            },
          });
        }

        await tx.reserva.create({
          data: {
            contratoId: contrato.id,
            equipoId,
            fechaInicio: contrato.fechaInicio,
            fechaFin: contrato.fechaFin,
            estado: EstadoReserva.CONFIRMADA,
          },
        });
      }

      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: { estado: EstadoCotizacion.CONVERTIDA_A_CONTRATO },
      });

      const diasCorte = periodoDiasCorte || 30;
      await this.generateCortesForContractTx(
        tx,
        contrato.id,
        diasCorte,
        Number(cotizacion.total),
        contrato.fechaInicio,
        contrato.fechaFin,
        undefined,
        0,
        this.dailyGrossRate({ ...contrato, cotizacion }),
      );

      const effectiveAsesorId = cotizacion.asesorId || usuarioId;
      if (effectiveAsesorId && tx.usuario?.findUnique && tx.cliente?.update) {
        const asesor = await tx.usuario.findUnique({
          where: { id: effectiveAsesorId },
          select: { nombre: true, apellido: true },
        });
        if (asesor) {
          await tx.cliente.update({
            where: { id: cotizacion.clienteId },
            data: {
              vendedor: `${asesor.nombre} ${asesor.apellido}`.trim(),
              vendedorId: cotizacion.cliente.vendedorId
                ? undefined
                : effectiveAsesorId,
            },
          });
        }
      }

      // Generar automáticamente Solicitud de Despacho en Módulo de Operaciones
      const countDesp = await tx.solicitudDespacho.count({
        where: { empresaId },
      });
      const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
      await tx.solicitudDespacho.create({
        data: {
          codigo: codigoDesp,
          empresaId,
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitadoPor: 'Sistema (Cotización Aprobada)',
          fechaProgramada: contrato.fechaInicio,
          direccionEntrega:
            cotizacion.cliente?.direccion || 'Dirección Registrada del Cliente',
          comentarios: `Despacho de equipos programado automáticamente desde cotización aprobada ${cotizacion.numeroCotizacion}`,
          estado: 'PENDIENTE',
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId || null,
        accion: 'CONTRATO_CONVERTIDO_DESDE_COTIZACION',
        entidadTipo: 'CONTRATO',
        entidadId: contrato.id,
        detalles: {
          codigo: contrato.codigo,
          cotizacionId: cotizacion.id,
          clienteId: contrato.clienteId,
          total: Number(cotizacion.total),
        },
      });

      return contrato;
    });
  }

  // Helper interno para proyectar cortes de facturación
  private async generateCortesForContractTx(
    tx: Prisma.TransactionClient,
    contratoId: string,
    periodoDias: number,
    totalMonto: number,
    fechaInicio: Date,
    fechaFin: Date,
    cantidadCortesExplicit?: number,
    corteOffsetNumero: number = 0,
    dailyRate: number | null = null,
  ) {
    if (!Number.isInteger(periodoDias) || periodoDias < 1 || fechaFin <= fechaInicio) {
      throw new BadRequestException('El período de corte y las fechas del contrato deben definir al menos un día válido.');
    }
    let cantidadCortes = 1;
    if (dailyRate === null && cantidadCortesExplicit && cantidadCortesExplicit >= 1) {
      cantidadCortes = Math.floor(cantidadCortesExplicit);
    } else {
      const diffMs = fechaFin.getTime() - fechaInicio.getTime();
      const diffDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      cantidadCortes = Math.max(1, Math.ceil(diffDias / periodoDias));
    }

    // Para renta diaria, cada corte acumula exactamente sus días; el último
    // termina en fechaFin aunque sea más corto que la frecuencia configurada.
    const totalCentavos = Math.round(totalMonto * 100);
    const baseCentavos = Math.floor(totalCentavos / cantidadCortes);
    let remCentavos = totalCentavos - baseCentavos * cantidadCortes;

    let inicioPeriodo = new Date(fechaInicio);
    let maxFechaFin = new Date(fechaFin);
    let diasAcumulados = 0;
    let centavosAcumulados = 0;

    for (let i = 1; i <= cantidadCortes; i++) {
      let finPeriodo = new Date(inicioPeriodo);
      finPeriodo.setDate(finPeriodo.getDate() + periodoDias);

      if ((dailyRate !== null || !cantidadCortesExplicit) && (finPeriodo > fechaFin || i === cantidadCortes)) {
        finPeriodo = new Date(fechaFin);
      }

      if (finPeriodo > maxFechaFin) {
        maxFechaFin = new Date(finPeriodo);
      }

      let corteCentavos: number;
      if (dailyRate !== null) {
        const diasCorte = Math.round((Date.UTC(finPeriodo.getUTCFullYear(), finPeriodo.getUTCMonth(), finPeriodo.getUTCDate()) - Date.UTC(inicioPeriodo.getUTCFullYear(), inicioPeriodo.getUTCMonth(), inicioPeriodo.getUTCDate())) / 86400000);
        diasAcumulados += diasCorte;
        const siguienteAcumulado = Math.round(diasAcumulados * dailyRate * 100);
        corteCentavos = siguienteAcumulado - centavosAcumulados;
        centavosAcumulados = siguienteAcumulado;
      } else {
        corteCentavos = baseCentavos + (remCentavos > 0 ? 1 : 0);
        if (remCentavos > 0) remCentavos--;
      }
      const montoPorCorte = roundMoney(corteCentavos / 100);

      await tx.corteFacturacion.create({
        data: {
          contratoId,
          numeroCorte: corteOffsetNumero + i,
          fechaInicio: inicioPeriodo,
          fechaFin: finPeriodo,
          monto: montoPorCorte,
          estado: EstadoCorteFacturacion.PENDIENTE,
        },
      });

      inicioPeriodo = new Date(finPeriodo);
    }

    if (maxFechaFin > fechaFin) {
      await tx.contrato.update({
        where: { id: contratoId },
        data: { fechaFin: maxFechaFin },
      });
    }
  }

  async generateCortes(
    contratoId: string,
    periodoDias: number = 30,
    empresaId: string,
    usuarioId?: string,
    cantidadCortes?: number,
  ) {
    const contrato = await this.findOne(contratoId, empresaId);

    const totalMonto = contrato.cotizacion
      ? Number(contrato.cotizacion.total)
      : contrato.items.reduce(
          (sum, item) =>
            sum + Number(item.precioRenta) * item.cantidad * (item.dias || 1),
          0,
        );

    return this.prisma.$transaction(async (tx) => {
      const cortesFacturados = await tx.corteFacturacion.findMany({
        where: {
          contratoId,
          estado: EstadoCorteFacturacion.FACTURADO,
        },
        orderBy: { numeroCorte: 'asc' },
      });

      let inicioParaNuevos = new Date(contrato.fechaInicio);
      let montoParaNuevos = totalMonto;
      let offset = 0;

      if (cortesFacturados.length > 0) {
        offset = cortesFacturados.length;
        const lastFacturado = cortesFacturados[cortesFacturados.length - 1];
        inicioParaNuevos = new Date(lastFacturado.fechaFin);
        const montoFacturado = cortesFacturados.reduce(
          (sum, c) => sum + Number(c.monto),
          0,
        );
        montoParaNuevos = Math.max(0, roundMoney(totalMonto - montoFacturado));
      }

      await tx.corteFacturacion.deleteMany({
        where: { contratoId, estado: EstadoCorteFacturacion.PENDIENTE },
      });

      const dailyRate = this.dailyGrossRate(contrato);
      if (inicioParaNuevos < contrato.fechaFin && (dailyRate !== null || montoParaNuevos > 0)) {
        await this.generateCortesForContractTx(
          tx,
          contrato.id,
          periodoDias,
          montoParaNuevos,
          inicioParaNuevos,
          contrato.fechaFin,
          contrato.cotizacion?.fechaInicioRenta && contrato.cotizacion?.fechaFinRenta
            ? undefined
            : cantidadCortes,
          offset,
          dailyRate,
        );
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CORTES_GENERADOS',
        entidadTipo: 'CONTRATO',
        entidadId: contratoId,
        detalles: {
          codigo: contrato.codigo,
          periodoDias,
          cantidadCortes,
          cortesFacturadosPreservados: offset,
        },
      });

      return tx.corteFacturacion.findMany({
        where: { contratoId },
        orderBy: { numeroCorte: 'asc' },
      });
    });
  }

  async openContract(
    contratoId: string,
    periodoDias: number = 30,
    empresaId: string,
    usuarioId?: string,
    cantidadCortes?: number,
    fechaInicio?: string,
    fechaFin?: string,
    horasPorDiaPorItem?: HorasPorDiaItemDto[],
  ) {
    const contrato = await this.findOne(contratoId, empresaId);

    const quotedStart = contrato.cotizacion?.fechaInicioRenta;
    const quotedEnd = contrato.cotizacion?.fechaFinRenta;
    const hasQuotedPeriod = Boolean(quotedStart && quotedEnd);
    if (quotedStart && quotedEnd &&
      ((fechaInicio && fechaInicio.slice(0, 10) !== quotedStart.toISOString().slice(0, 10)) ||
       (fechaFin && fechaFin.slice(0, 10) !== quotedEnd.toISOString().slice(0, 10)))) {
      throw new BadRequestException('Las fechas del contrato deben respetar el período pactado en la cotización.');
    }
    const effectiveFechaInicio = quotedStart
      ? new Date(quotedStart)
      : fechaInicio
        ? new Date(`${fechaInicio}T12:00:00.000Z`)
        : new Date(contrato.fechaInicio);
    const effectiveFechaFin = quotedEnd
      ? new Date(quotedEnd)
      : fechaFin
        ? new Date(`${fechaFin}T12:00:00.000Z`)
        : new Date(contrato.fechaFin);

    const duracionDias = cutDays(effectiveFechaInicio, effectiveFechaFin);
    if (!Number.isFinite(duracionDias) || duracionDias < 1) {
      throw new BadRequestException('La fecha final debe ser posterior a la fecha inicial del contrato.');
    }
    if (contrato.cortesFacturacion?.some((corte) => corte.estado === EstadoCorteFacturacion.FACTURADO)) {
      throw new BadRequestException('No se puede cambiar el plan de horas de un contrato con cortes facturados.');
    }
    const hourlyItems = contrato.items.filter((item) => item.tipoTarifa === 'HORA');
    const supplied = horasPorDiaPorItem || [];
    const byId = new Map(supplied.map((item) => [item.detalleContratoId, item.horasPorDia]));
    if (byId.size !== supplied.length || supplied.some((item) => !hourlyItems.some((line) => line.id === item.detalleContratoId))) {
      throw new BadRequestException('Las horas por día deben pertenecer a líneas horarias únicas de este contrato.');
    }
    if (hourlyItems.some((item) => !byId.has(item.id))) {
      throw new BadRequestException('Defina las horas previstas por día de cada producto cobrado por hora.');
    }
    const pricedItems = contrato.items.map((item) => item.tipoTarifa === 'HORA'
      ? { ...item, horasPorDia: byId.get(item.id)!, horasPactadas: byId.get(item.id)! * duracionDias }
      : { ...item, dias: duracionDias });
    const pricedContract = {
      ...contrato, items: pricedItems,
      fechaInicio: effectiveFechaInicio, fechaFin: effectiveFechaFin,
    };
    const baseRate = plannedDailyGrossRate({ ...pricedContract, cotizacion: null });
    const factorCotizado = quotationMultiplier(contrato) ?? 1;
    const dailyRate = baseRate === null ? null : baseRate * factorCotizado;
    if (contrato.items.length > 0 && (dailyRate === null || dailyRate <= 0)) {
      throw new BadRequestException('No se pudo calcular la tarifa del contrato con las cantidades y horas indicadas.');
    }
    const totalMonto = dailyRate === null
      ? Number(contrato.cotizacion?.total || 0)
      : roundMoney(dailyRate * duracionDias);

    return this.prisma.$transaction(async (tx) => {
      await tx.corteFacturacion.deleteMany({
        where: { contratoId, estado: EstadoCorteFacturacion.PENDIENTE },
      });

      await tx.contrato.update({
        where: { id: contratoId },
        data: {
          estado: EstadoContrato.ACTIVO,
          fechaInicio: effectiveFechaInicio,
          fechaFin: effectiveFechaFin,
        },
      });

      for (const item of pricedItems) {
        if (!item.id || !tx.detalleContrato?.update) continue;
        await tx.detalleContrato.update({
          where: { id: item.id },
          data: item.tipoTarifa === 'HORA'
            ? { horasPorDia: byId.get(item.id)!, horasPactadas: byId.get(item.id)! * duracionDias }
            : { dias: duracionDias },
        });
      }

      await this.generateCortesForContractTx(
        tx,
        contrato.id,
        periodoDias,
        totalMonto,
        effectiveFechaInicio,
        effectiveFechaFin,
        hasQuotedPeriod ? undefined : cantidadCortes,
        0,
        dailyRate,
      );

      // Sincronizar fechas de reservas asociadas al contrato
      await tx.reserva.updateMany({
        where: { contratoId },
        data: {
          fechaInicio: effectiveFechaInicio,
          fechaFin: effectiveFechaFin,
        },
      });

      const updated = await (tx.contrato.findUniqueOrThrow
        ? tx.contrato.findUniqueOrThrow({
            where: { id: contratoId },
            include: {
              cliente: true,
              cotizacion: true,
              items: { include: { equipo: true } },
              cortesFacturacion: { orderBy: { numeroCorte: 'asc' } },
            },
          })
        : tx.contrato.findUnique({
            where: { id: contratoId },
            include: {
              cliente: true,
              cotizacion: true,
              items: { include: { equipo: true } },
              cortesFacturacion: { orderBy: { numeroCorte: 'asc' } },
            },
          }));

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CONTRATO_ABIERTO',
        entidadTipo: 'CONTRATO',
        entidadId: contratoId,
        detalles: {
          codigo: contrato.codigo,
          periodoDias,
          cantidadCortes,
          fechaInicio: effectiveFechaInicio,
          fechaFin: effectiveFechaFin,
          horasPorDiaPorItem: supplied,
          totalProyectado: totalMonto,
        },
      });

      return updated!;
    });
  }

  async getCortes(contratoId: string, empresaId: string) {
    await this.findOne(contratoId, empresaId);
    return this.prisma.corteFacturacion.findMany({
      where: { contratoId },
      include: { facturas: true },
      orderBy: { numeroCorte: 'asc' },
    });
  }

  async createManualCorte(
    contratoId: string,
    fechaCorte: string,
    monto: number | undefined,
    empresaId: string,
    usuarioId?: string,
  ) {
    const contrato = await this.findOne(contratoId, empresaId);

    const countCortes = await this.prisma.corteFacturacion.count({
      where: { contratoId },
    });

    const lastCorte = await this.prisma.corteFacturacion.findFirst({
      where: { contratoId },
      orderBy: { numeroCorte: 'desc' },
    });

    const inicio = lastCorte
      ? new Date(lastCorte.fechaFin)
      : new Date(contrato.fechaInicio);
    const fin = new Date(fechaCorte);

    const totalCalculado = contrato.cotizacion
      ? Number(contrato.cotizacion.total)
      : contrato.items.reduce(
          (sum, item) =>
            sum + roundMoney(Number(item.precioRenta) * item.cantidad),
          0,
        );
    const montoFinal =
      monto && monto > 0
        ? assertPositive(monto, 'monto')
        : roundMoney(totalCalculado / Math.max(1, countCortes + 1));

    return this.prisma.$transaction(async (tx) => {
      const corte = await tx.corteFacturacion.create({
        data: {
          contratoId: contrato.id,
          numeroCorte: countCortes + 1,
          fechaInicio: inicio,
          fechaFin: fin,
          monto: montoFinal,
          estado: EstadoCorteFacturacion.PENDIENTE,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CORTE_FACTURACION_CREADO',
        entidadTipo: 'CORTE_FACTURACION',
        entidadId: corte.id,
        detalles: {
          contratoId,
          numeroCorte: countCortes + 1,
          fechaInicio: inicio.toISOString(),
          fechaFin: fin.toISOString(),
          monto: montoFinal,
        },
      });
      return corte;
    });
  }

  async updateCorte(
    contratoId: string,
    corteId: string,
    dto: UpdateCorteDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const contrato = await this.findOne(contratoId, empresaId);
    const corte = await this.prisma.corteFacturacion.findFirst({
      where: { id: corteId, contratoId: contrato.id },
    });
    if (!corte) {
      throw new NotFoundException('Corte de facturación no encontrado.');
    }
    if (corte.estado === EstadoCorteFacturacion.FACTURADO) {
      throw new BadRequestException('No se puede modificar un corte que ya ha sido facturado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.corteFacturacion.update({
        where: { id: corteId },
        data: {
          ...(dto.fechaInicio ? { fechaInicio: new Date(dto.fechaInicio) } : {}),
          ...(dto.fechaFin ? { fechaFin: new Date(dto.fechaFin) } : {}),
          ...(dto.monto !== undefined ? { monto: roundMoney(dto.monto) } : {}),
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CORTE_FACTURACION_ACTUALIZADO',
        entidadTipo: 'CORTE_FACTURACION',
        entidadId: corte.id,
        detalles: {
          contratoId,
          corteId,
          cambios: dto,
        },
      });

      return updated;
    });
  }

  async deleteCorte(
    contratoId: string,
    corteId: string,
    empresaId: string,
    usuarioId?: string,
  ) {
    const contrato = await this.findOne(contratoId, empresaId);
    const corte = await this.prisma.corteFacturacion.findFirst({
      where: { id: corteId, contratoId: contrato.id },
    });
    if (!corte) {
      throw new NotFoundException('Corte de facturación no encontrado.');
    }
    if (corte.estado === EstadoCorteFacturacion.FACTURADO) {
      throw new BadRequestException('No se puede eliminar un corte que ya ha sido facturado.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.corteFacturacion.delete({
        where: { id: corteId },
      });

      // Renumerar los cortes restantes
      const restantes = await tx.corteFacturacion.findMany({
        where: { contratoId: contrato.id },
        orderBy: { fechaInicio: 'asc' },
      });

      for (let i = 0; i < restantes.length; i++) {
        await tx.corteFacturacion.update({
          where: { id: restantes[i].id },
          data: { numeroCorte: i + 1 },
        });
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CORTE_FACTURACION_ELIMINADO',
        entidadTipo: 'CORTE_FACTURACION',
        entidadId: corte.id,
        detalles: { contratoId, corteId, numeroCorte: corte.numeroCorte },
      });

      return { success: true, message: 'Corte eliminado exitosamente' };
    });
  }

  async findAll(
    empresaId: string,
    user?: {
      id: string;
      roles?: (string | { nombre?: string; rol?: { nombre?: string } })[];
    },
    all?: boolean,
  ) {
    const whereClause: Prisma.ContratoWhereInput = {
      sucursal: { empresaId },
    };

    const roles = (user?.roles || []).map((r) =>
      typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || '',
    );
    const isComercialOnly =
      roles.includes('COMERCIAL') &&
      !roles.includes('ADMIN') &&
      !roles.includes('GERENTE');

    if (isComercialOnly && !all && user?.id) {
      whereClause.AND = [
        {
          OR: [
            { cotizacion: { asesorId: user.id } },
            { cliente: { vendedorId: user.id } },
          ],
        },
      ];
    }

    return this.prisma.contrato.findMany({
      where: whereClause,
      include: {
        cliente: true,
        cotizacion: {
          include: {
            asesor: {
              select: { id: true, nombre: true, apellido: true, email: true },
            },
          },
        },
        items: {
          include: { equipo: true },
        },
        cortesFacturacion: true,
        despachos: true,
        devoluciones: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, empresaId: string) {
    const contrato = await this.prisma.contrato.findFirst({
      where: {
        id,
        sucursal: { empresaId },
      },
      include: {
        cliente: true,
        cotizacion: { include: { items: true } },
        items: {
          include: {
            equipo: {
              include: { categoria: true, subcategoria: true, marca: true },
            },
          },
        },
        cortesFacturacion: {
          include: { facturas: true },
          orderBy: { numeroCorte: 'asc' },
        },
        despachos: {
          include: {
            items: {
              include: { equipo: true, inspeccionesSalida: true },
            },
          },
        },
        devoluciones: {
          include: {
            items: {
              include: { equipo: true, inspeccionesDanio: true },
            },
          },
        },
      },
    });

    if (!contrato) {
      throw new NotFoundException(`No se encontró el contrato con ID: ${id}`);
    }

    return contrato;
  }

  async cancelContract(id: string, empresaId: string, usuarioId?: string) {
    const contrato = await this.findOne(id, empresaId);

    if (contrato.estado !== 'ACTIVO') {
      throw new BadRequestException(
        `Solo se pueden cancelar contratos en estado ACTIVO. Estado actual: ${contrato.estado}`,
      );
    }

    if (contrato.despachos && contrato.despachos.length > 0) {
      throw new BadRequestException(
        'No se puede cancelar un contrato que ya tiene despachos ejecutados. Debe procesar la devolución de equipos.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const reservas = await tx.reserva.findMany({
        where: { contratoId: id, estado: EstadoReserva.CONFIRMADA },
        include: { equipo: true },
      });

      for (const res of reservas) {
        if (res.equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
          await tx.equipo.update({
            where: { id: res.equipoId },
            data: { cantidadDisponible: 1, estado: EstadoEquipo.DISPONIBLE },
          });
        } else {
          const itemContrato = contrato.items.find(
            (it) => it.equipoId === res.equipoId,
          );
          const cant = itemContrato ? itemContrato.cantidad : 1;
          await tx.equipo.update({
            where: { id: res.equipoId },
            data: {
              cantidadDisponible: Math.min(
                res.equipo.cantidadTotal,
                res.equipo.cantidadDisponible + cant,
              ),
            },
          });
        }

        await tx.reserva.update({
          where: { id: res.id },
          data: { estado: EstadoReserva.CANCELADA },
        });
      }

      await tx.solicitudDespacho.updateMany({
        where: { contratoId: id, estado: 'PENDIENTE' },
        data: { estado: 'CANCELADA' },
      });

      const updated = await tx.contrato.update({
        where: { id },
        data: { estado: 'CANCELADO' },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CONTRATO_CANCELADO',
        entidadTipo: 'CONTRATO',
        entidadId: id,
        detalles: {
          codigo: contrato.codigo,
          estado: 'CANCELADO',
        },
      });

      return updated;
    });
  }

  async finalizeContract(id: string, empresaId: string, usuarioId?: string) {
    assertEmpresaId(empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo de la fila del contrato (acotado al tenant) para que una
      // devolución/despacho concurrente no cambie el balance entre la
      // validación y la finalización.
      if (tx.$executeRaw) {
        await tx.$executeRaw`SELECT c.id FROM "contratos" c JOIN "sucursales" s ON s.id = c.sucursal_id WHERE c.id = ${id} AND s.empresa_id = ${empresaId} FOR UPDATE OF c`;
      }

      const contrato = await tx.contrato.findFirst({
        where: { id, sucursal: { empresaId } },
        include: {
          despachos: { include: { items: true } },
          devoluciones: { include: { items: true } },
        },
      });
      if (!contrato) {
        throw new NotFoundException(`No se encontró el contrato con ID: ${id}`);
      }

      if (contrato.estado !== 'ACTIVO') {
        throw new BadRequestException(
          `Solo se pueden finalizar contratos en estado ACTIVO. Estado actual: ${contrato.estado}`,
        );
      }

      const balance = calcularBalanceRetorno(
        contrato.despachos,
        contrato.devoluciones,
      );
      if (balance.pendiente > 0) {
        throw new BadRequestException(
          `No se puede finalizar el contrato: hay equipos pendientes de retorno (${balance.totalRetornado}/${balance.totalDespachado} devueltos o declarados perdidos).`,
        );
      }

      await tx.reserva.updateMany({
        where: { contratoId: id },
        data: { estado: EstadoReserva.CANCELADA },
      });

      const updated = await tx.contrato.update({
        where: { id },
        data: { estado: 'FINALIZADO' },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CONTRATO_FINALIZADO',
        entidadTipo: 'CONTRATO',
        entidadId: id,
        detalles: {
          codigo: contrato.codigo,
          estado: 'FINALIZADO',
        },
      });

      return updated;
    });
  }
}
