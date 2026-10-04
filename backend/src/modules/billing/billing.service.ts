import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TipoFactura,
  CondicionPagoFactura,
  EstadoCotizacion,
  EstadoCorteFacturacion,
  EstadoFactura,
  EstadoMantenimiento,
  MetodoPago,
  Prisma,
} from '@prisma/client';
import { resolveQuotationEquipment } from '../contracts/utils/resolve-quotation-equipment';
import {
  roundMoney,
  assertNonNegative,
  assertPositive,
  DEFAULT_IVA_RATE,
} from '../../common/utils/financial-calculator';
import {
  assertMoneyWithinLimit,
  toNumberHoras,
  type DecimalLike,
} from '../../common/utils/decimal.util';
import { recordAuditInTx } from '../auditoria/utils/audit-tx.util';
import { rentalCutUsage, rentalCalendarDay } from './daily-usage';
import {
  assertEmpresaId,
  assertSucursalEnEmpresa,
} from '../../common/utils/tenant.util';
import { nextContractCode } from '../../common/utils/numbering.util';

/**
 * Retencion de IVA del payload: 0 si no viene; si viene debe ser un importe
 * finito, no negativo y dentro del tope Decimal(12,2). Antes `x ? ... : 0`
 * trataba NaN como "sin retencion" y la factura se guardaba sin validarla.
 */
export function normalizarRetencionIva(valor: unknown): number {
  if (valor === undefined || valor === null) return 0;
  return roundMoney(
    assertMoneyWithinLimit(
      assertNonNegative(valor, 'retencionIva'),
      'importe de la retencion de IVA',
    ),
  );
}

/**
 * La retencion de IVA no puede superar el IVA del documento. Ambos importes se
 * comparan en Decimal y redondeados a 2 decimales (half-up), con tolerancia
 * 0.00: una retencion igual al IVA es valida, un centavo mas no.
 */
export function assertRetencionNoSuperaIva(
  retencionIva: number,
  ivaDocumento: DecimalLike,
): void {
  const retencion = new Prisma.Decimal(retencionIva).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
  const iva = new Prisma.Decimal(toNumberHoras(ivaDocumento, 0));
  if (retencion.gt(iva)) {
    throw new BadRequestException(
      `La retencion de IVA (${retencion.toFixed(2)}) no puede superar el IVA del documento (${iva.toFixed(2)}).`,
    );
  }
}

export interface CreateInvoicePayload {
  sucursalId?: string;
  tipoFactura?: TipoFactura;
  condicionPago?: CondicionPagoFactura;
  plazoCreditoDias?: number;
  retencionIva?: number;
  estado?: EstadoFactura;
}

export interface RegisterPaymentPayload {
  monto: number;
  metodo?: MetodoPago;
  referencia?: string;
  banco?: string;
  comprobanteUrl?: string;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getPendingQuotations(empresaId: string) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.CotizacionWhereInput = {
      estado: EstadoCotizacion.ACEPTADA,
      contratos: { none: {} },
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
      },
    });
  }

  async getPendingCortes(empresaId: string) {
    assertEmpresaId(empresaId);
    return this.prisma.corteFacturacion.findMany({
      where: {
        estado: EstadoCorteFacturacion.PENDIENTE,
        contrato: {
          sucursal: { empresaId },
        },
      },
      include: {
        contrato: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: {
        fechaInicio: 'asc',
      },
    });
  }

  async getContractCortes(empresaId: string) {
    assertEmpresaId(empresaId);
    const cortes = await this.prisma.corteFacturacion.findMany({
      where: {
        estado: { not: EstadoCorteFacturacion.ANULADO },
        contrato: { sucursal: { empresaId } },
      },
      include: {
        facturas: { select: { id: true, folio: true, estado: true } },
        contrato: { include: {
          cliente: true,
          cotizacion: { include: { items: true } },
          items: { include: { equipo: true } },
          despachos: { include: { items: true } },
          devoluciones: { include: { items: true } },
        } },
      },
      orderBy: [{ contratoId: 'asc' }, { numeroCorte: 'asc' }],
    });
    const previousBilled = new Map<string, boolean>();
    const previousPeriodEnd = new Map<string, Date>();
    const today = rentalCalendarDay(new Date());
    return cortes.map((corte) => {
      const priorComplete = previousBilled.get(corte.contratoId) ?? true;
      const priorEnd = previousPeriodEnd.get(corte.contratoId);
      const priorPeriodFinished = !priorEnd || today >= rentalCalendarDay(priorEnd);
      const billed = corte.estado === EstadoCorteFacturacion.FACTURADO || corte.facturas.length > 0;
      previousBilled.set(corte.contratoId, priorComplete && billed);
      previousPeriodEnd.set(corte.contratoId, corte.fechaFin);
      const periodStarted = today >= rentalCalendarDay(corte.fechaInicio);
      const usage = rentalCutUsage(corte.contrato, corte.fechaInicio, corte.fechaFin);
      const actualMonto = usage?.total ?? null;
      const hasUsage = actualMonto === null || actualMonto > 0;
      const available = !billed && corte.estado === EstadoCorteFacturacion.PENDIENTE && priorComplete && priorPeriodFinished && periodStarted && hasUsage;
      const reason = billed ? 'Facturado'
        : !priorComplete ? 'Primero facture el corte anterior'
        : !priorPeriodFinished ? 'Disponible cuando termine el corte anterior'
        : !periodStarted ? 'Disponible desde el inicio del período'
        : !hasUsage ? 'Se requiere un despacho con días de uso'
        : null;
      return {
        id: corte.id, contratoId: corte.contratoId, numeroCorte: corte.numeroCorte,
        fechaInicio: corte.fechaInicio, fechaFin: corte.fechaFin,
        monto: available && actualMonto !== null ? actualMonto : corte.monto,
        detalleProyectado: usage?.lines ?? [],
        fechaDisponible: priorEnd && rentalCalendarDay(priorEnd) > rentalCalendarDay(corte.fechaInicio)
          ? priorEnd : corte.fechaInicio,
        estado: corte.estado, disponibleParaFacturar: available, motivoBloqueo: reason,
        factura: corte.facturas[0] ?? null,
        contrato: {
          id: corte.contrato.id, codigo: corte.contrato.codigo,
          cliente: { id: corte.contrato.cliente.id, nombre: corte.contrato.cliente.nombre },
        },
      };
    });
  }

  async getDamageReturns(empresaId: string) {
    assertEmpresaId(empresaId);
    return this.prisma.devolucion.findMany({
      where: {
        sucursal: { empresaId },
        items: { some: { daniosDetectados: true } },
      },
      include: {
        contrato: { include: { cliente: true } },
        facturaCargo: true,
        items: { include: {
          equipo: true,
          inspeccionesDanio: true,
          reparaciones: true,
        } },
      },
      orderBy: { fechaDevolucion: 'desc' },
    });
  }

  async invoiceDamageReturn(
    devolucionId: string,
    empresaId: string,
    usuarioId?: string,
  ) {
    assertEmpresaId(empresaId);
    return this.prisma.$transaction(async (tx) => {
      // Bloqueo acotado a la empresa (via sucursal), mismo patron que finalizeContract.
      await tx.$executeRaw`SELECT d.id FROM "devoluciones" d JOIN "sucursales" s ON s.id = d.sucursal_id WHERE d.id = ${devolucionId} AND s.empresa_id = ${empresaId} FOR UPDATE OF d`;
      const retorno = await tx.devolucion.findFirst({
        where: { id: devolucionId, sucursal: { empresaId } },
        include: {
          contrato: { include: { cliente: true, sucursal: true } },
          facturaCargo: true,
          items: { include: {
            equipo: true,
            inspeccionesDanio: true,
            reparaciones: true,
          } },
        },
      });
      if (!retorno) throw new NotFoundException('Retorno no encontrado');
      if (retorno.facturaCargo) throw new ConflictException('Este retorno ya tiene una factura por daños.');

      const reparaciones = retorno.items.flatMap((item) =>
        item.reparaciones.filter((reparacion) => reparacion.cobrableCliente).map((reparacion) => ({ item, reparacion })),
      );
      if (!reparaciones.length) {
        throw new BadRequestException('No hay reparaciones atribuidas al cliente para facturar.');
      }
      const conceptos: Array<Record<string, unknown>> = [];
      for (const { item, reparacion } of reparaciones) {
        if (!item.inspeccionesDanio.some((inspeccion) => inspeccion.cobrable)) {
          throw new BadRequestException('Falta una inspección cobrable que respalde la reparación.');
        }
        if (reparacion.estado !== EstadoMantenimiento.COMPLETADO) {
          throw new BadRequestException('Termine la reparación antes de emitir el cargo al cliente.');
        }
        const gastos = Array.isArray(reparacion.gastos)
          ? reparacion.gastos as Record<string, unknown>[] : [];
        if (gastos.some((gasto) =>
          !String(gasto.descripcion || '').trim() ||
          !Number.isFinite(Number(gasto.monto)) || Number(gasto.monto) <= 0)) {
          throw new BadRequestException('El desglose de reparación contiene conceptos inválidos.');
        }
        const suma = roundMoney(gastos.reduce((total, gasto) => total + Number(gasto.monto), 0));
        if (!gastos.length || suma <= 0 || suma !== roundMoney(Number(reparacion.costo))) {
          throw new BadRequestException('La reparación necesita gastos reales desglosados que coincidan con su costo.');
        }
        for (const gasto of gastos) {
          const line = gasto;
          if (line.cobrableCliente === false) continue;
          conceptos.push({
            mantenimientoId: reparacion.id,
            equipoId: item.equipoId,
            equipo: item.equipo.modelo,
            tipo: line.tipo,
            descripcion: line.descripcion,
            monto: Number(line.monto),
            comprobanteUrl: line.comprobanteUrl || null,
          });
        }
      }
      if (!conceptos.length) {
        throw new BadRequestException('No hay gastos de reparación cobrables al cliente.');
      }
      const total = roundMoney(conceptos.reduce((sum, concepto) => sum + Number(concepto.monto), 0));
      const subtotal = roundMoney(total / (1 + DEFAULT_IVA_RATE));
      const iva = roundMoney(total - subtotal);
      const factura = await tx.factura.create({
        data: {
          folio: `FAC-DAN-${retorno.contrato.codigo}-${devolucionId.slice(0, 8)}`,
          empresaId,
          sucursalId: retorno.sucursalId,
          clienteId: retorno.contrato.clienteId,
          contratoId: retorno.contratoId,
          devolucionId,
          detalleCargo: conceptos as Prisma.InputJsonValue,
          tipoFactura: TipoFactura.CARGO_DANOS,
          condicionPago: CondicionPagoFactura.CREDITO,
          plazoCreditoDias: 30,
          fechaVence: new Date(Date.now() + 30 * 86400000),
          subtotal,
          iva,
          total,
          estado: EstadoFactura.PENDIENTE,
        },
        include: { cliente: true, empresa: true, contrato: true, devolucion: true },
      });
      await recordAuditInTx(tx, {
        empresaId, usuarioId, accion: 'FACTURA_DANOS_CREADA',
        entidadTipo: 'FACTURA', entidadId: factura.id,
        detalles: { devolucionId, contratoId: retorno.contratoId, total, reparaciones: reparaciones.map(({ reparacion }) => reparacion.id) },
      });
      return factura;
    });
  }

  // 1. Facturar una Cotización Comercial directa (Solo si NO ha sido convertida a Contrato)
  async invoiceQuotation(
    id: string,
    payload: CreateInvoicePayload,
    empresaId: string,
    usuarioId?: string,
  ) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.CotizacionWhereInput = {
      id,
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        items: { include: { equipo: true } },
        cliente: true,
        facturas: true,
      },
    });

    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');

    // Bloqueo de Doble Cobro: Si la cotización fue convertida a Contrato, se rechaza la facturación directa
    if (cotizacion.estado === EstadoCotizacion.CONVERTIDA_A_CONTRATO) {
      throw new ConflictException(
        'No se puede facturar directamente esta cotización porque ya ha sido convertida en un Contrato. Utilice los cortes de facturación del contrato.',
      );
    }

    if (
      cotizacion.estado === EstadoCotizacion.FACTURADA ||
      (cotizacion.facturas && cotizacion.facturas.length > 0)
    ) {
      throw new ConflictException(
        'Esta cotización ya fue facturada previamente.',
      );
    }

    if (cotizacion.estado !== EstadoCotizacion.ACEPTADA) {
      throw new BadRequestException(
        `Solo se pueden facturar cotizaciones en estado ACEPTADA. Estado actual: ${cotizacion.estado}`,
      );
    }

    let sucursalId = payload.sucursalId || cotizacion.sucursalId;
    if (sucursalId) {
      // La sucursal del body (o de la cotizacion) debe ser de la empresa del token.
      await assertSucursalEnEmpresa(this.prisma, sucursalId, empresaId);
    } else {
      const firstSucursal = await this.prisma.sucursal.findFirst({
        where: { empresaId },
      });
      if (!firstSucursal)
        throw new BadRequestException('No hay sucursales configuradas');
      sucursalId = firstSucursal.id;
    }

    const retencionIva = normalizarRetencionIva(payload.retencionIva);
    assertRetencionNoSuperaIva(retencionIva, cotizacion.iva);
    const folio = `FAC-COT-${Math.floor(100000 + Math.random() * 900000)}`;
    const empId =
      cotizacion.empresaId || empresaId || cotizacion.cliente?.empresaId || '';

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en PostgreSQL para serializar solicitudes de facturación concurrentes
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE id = ${id} FOR UPDATE`;

      const existingInvoice = await tx.factura.findFirst({
        where: { cotizacionId: cotizacion.id },
      });
      if (existingInvoice) {
        throw new ConflictException(
          `Esta cotización ya fue facturada previamente (Folio: ${existingInvoice.folio}).`,
        );
      }

      const existingContract = await tx.contrato.findFirst({
        where: { cotizacionId: cotizacion.id },
      });
      const contractItems =
        !existingContract && cotizacion.items.length > 0
          ? await resolveQuotationEquipment(
              tx,
              cotizacion.items,
              empId,
              sucursalId,
            )
          : [];

      // Conservar la cotización de origen y vincular su contrato operativo si ya existe.
      const factura = await tx.factura.create({
        data: {
          folio,
          empresaId: empId,
          sucursalId,
          clienteId: cotizacion.clienteId,
          cotizacionId: cotizacion.id,
          contratoId: existingContract?.id,
          tipoFactura:
            (payload.tipoFactura as TipoFactura) || TipoFactura.ESTANDAR,
          condicionPago:
            (payload.condicionPago as CondicionPagoFactura) ||
            CondicionPagoFactura.CONTADO,
          plazoCreditoDias: payload.plazoCreditoDias,
          retencionIva,
          subtotal: cotizacion.subtotal,
          iva: cotizacion.iva,
          total: cotizacion.total,
          estado:
            payload.estado === 'PAGADA'
              ? EstadoFactura.PAGADA
              : EstadoFactura.PENDIENTE,
          fechaVence: new Date(
            Date.now() + (payload.plazoCreditoDias || 0) * 24 * 60 * 60 * 1000,
          ),
        },
        include: { cliente: true, empresa: true, cotizacion: { include: { items: true } } },
      });

      // Actualizar estado de la cotización origen a FACTURADA
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: { estado: EstadoCotizacion.FACTURADA },
      });

      // Si la cotización facturada posee ítems de maquinaria, generar automáticamente el contrato operativo para Operaciones
      if (
        !existingContract &&
        cotizacion.items &&
        cotizacion.items.length > 0
      ) {
        const codigoContrato = await nextContractCode(tx);

        const contrato = await tx.contrato.create({
          data: {
            codigo: codigoContrato,
            sucursalId,
            clienteId: cotizacion.clienteId,
            cotizacionId: cotizacion.id,
            fechaInicio: new Date(),
            fechaFin: new Date(
              Date.now() + (cotizacion.validezDias || 30) * 24 * 60 * 60 * 1000,
            ),
            depositoGarantia: cotizacion.depositoGarantia || 0.0,
            condiciones:
              cotizacion.condiciones ||
              'Contrato generado automáticamente por facturación de cotización.',
            estado: 'ACTIVO',
            items: {
              create: contractItems,
            },
          },
        });

        const countDesp = await tx.solicitudDespacho.count();
        const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
        await tx.solicitudDespacho.create({
          data: {
            codigo: codigoDesp,
            empresaId: empId,
            sucursalId,
            contratoId: contrato.id,
            solicitadoPor: 'Sistema (Facturación Directa de Cotización)',
            fechaProgramada: new Date(),
            direccionEntrega:
              cotizacion.cliente?.direccion ||
              'Dirección Registrada del Cliente',
            comentarios: `Despacho de equipos generado por facturación de cotización ${cotizacion.numeroCotizacion}`,
            estado: 'PENDIENTE',
          },
        });
      }

      await recordAuditInTx(tx, {
        empresaId: empId,
        usuarioId,
        accion: 'FACTURA_CREADA',
        entidadTipo: 'FACTURA',
        entidadId: factura.id,
        detalles: {
          folio: factura.folio,
          clienteId: factura.clienteId,
          total: Number(factura.total),
          estado: factura.estado,
        },
      });

      return factura;
    });
  }

  // 2. Facturar un Corte de Facturación de Contrato (Ciclo de Cobro a Largo Plazo)
  async invoiceCorte(
    corteId: string,
    payload: CreateInvoicePayload,
    empresaId: string,
    usuarioId?: string,
  ) {
    assertEmpresaId(empresaId);
    const corte = await this.prisma.corteFacturacion.findFirst({
      where: {
        id: corteId,
        contrato: {
          sucursal: { empresaId },
        },
      },
      include: {
        contrato: {
          include: {
            cliente: true, sucursal: true, cotizacion: { include: { items: true } }, items: { include: { equipo: true } },
            despachos: { include: { items: true } },
            devoluciones: { include: { items: true } },
          },
        },
        facturas: true,
      },
    });

    if (!corte) {
      throw new NotFoundException(
        `No se encontró el corte de facturación con ID: ${corteId}`,
      );
    }

    if (
      corte.estado === EstadoCorteFacturacion.FACTURADO ||
      (corte.facturas && corte.facturas.length > 0)
    ) {
      throw new ConflictException(
        `El corte de facturación #${corte.numeroCorte} del contrato ya ha sido facturado previamente.`,
      );
    }

    if (corte.estado !== EstadoCorteFacturacion.PENDIENTE) {
      throw new BadRequestException(
        `Solo se pueden facturar cortes en estado PENDIENTE. Estado actual: ${corte.estado}`,
      );
    }

    const contrato = corte.contrato;
    const folio = `FAC-CRT-${contrato.codigo}-C${corte.numeroCorte}`;
    const retencionIva = normalizarRetencionIva(payload.retencionIva);

    return this.prisma.$transaction(async (tx) => {
      for (const equipoId of [...new Set((corte.contrato.items || []).map((item) => item.equipoId))].sort()) {
        await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${equipoId} FOR UPDATE`;
      }
      await tx.$executeRaw`SELECT id FROM "cortes_facturacion" WHERE id = ${corteId} FOR UPDATE`;
      // Leer el uso físico dentro de la transacción para no emitir un importe
      // calculado con un estado de despacho/devolución desactualizado.
      const currentCorte = tx.corteFacturacion.findFirst
        ? await tx.corteFacturacion.findFirst({
            where: { id: corteId, contrato: { sucursal: { empresaId } } },
            include: {
              facturas: true,
              contrato: { include: {
                cliente: true, sucursal: true, cotizacion: { include: { items: true } }, items: { include: { equipo: true } },
                despachos: { include: { items: true } },
                devoluciones: { include: { items: true } },
              } },
            },
          })
        : corte;
      if (!currentCorte || currentCorte.estado !== EstadoCorteFacturacion.PENDIENTE || currentCorte.facturas?.length) {
        throw new ConflictException('El corte ya no está pendiente o fue facturado previamente.');
      }
      const previousCortes = await tx.corteFacturacion.findMany({
        where: {
          contratoId: currentCorte.contratoId,
          numeroCorte: { lt: currentCorte.numeroCorte },
        },
        select: { estado: true, fechaFin: true },
      });
      if (previousCortes?.some((previous) => previous.estado !== EstadoCorteFacturacion.FACTURADO)) {
        throw new BadRequestException('Primero debe facturarse el corte anterior de este contrato.');
      }
      const today = rentalCalendarDay(new Date());
      if (previousCortes?.some((previous) => today < rentalCalendarDay(previous.fechaFin))) {
        throw new BadRequestException('El plazo del corte anterior todavía no termina.');
      }
      if (today < rentalCalendarDay(currentCorte.fechaInicio)) {
        throw new BadRequestException('El período de este corte todavía no comienza.');
      }
      const usage = rentalCutUsage(
        currentCorte.contrato,
        currentCorte.fechaInicio,
        currentCorte.fechaFin,
      );
      const actualMonto = usage?.total ?? null;
      if (actualMonto !== null && tx.factura.findFirst) {
        const overlappingInvoice = await tx.factura.findFirst({
          where: {
            contratoId: currentCorte.contratoId,
            corteId: { not: corteId },
            estado: { not: EstadoFactura.CANCELADA },
            corte: {
              fechaInicio: { lt: currentCorte.fechaFin },
              fechaFin: { gt: currentCorte.fechaInicio },
            },
          },
          select: { id: true },
        });
        if (overlappingInvoice) {
          throw new ConflictException('Ya existe una factura de renta diaria para un período superpuesto.');
        }
      }
      if (actualMonto !== null && actualMonto <= 0) {
        throw new BadRequestException('No hay días de uso registrados: primero debe despacharse el equipo.');
      }
      const corteMonto = actualMonto ?? Number(currentCorte.monto);
      const subtotal = roundMoney(corteMonto / (1 + DEFAULT_IVA_RATE));
      const iva = roundMoney(corteMonto - subtotal);
      assertRetencionNoSuperaIva(retencionIva, iva);
      if (actualMonto !== null && roundMoney(Number(currentCorte.monto)) !== corteMonto) {
        await tx.corteFacturacion.update({ where: { id: corteId }, data: { monto: corteMonto } });
      }
      // Crear la Factura con origen corteId (Patrón XOR)
      const factura = await tx.factura.create({
        data: {
          folio,
          empresaId: contrato.sucursal.empresaId || empresaId,
          sucursalId: contrato.sucursalId,
          clienteId: contrato.clienteId,
          contratoId: contrato.id,
          corteId: corte.id,
          corteNumero: corte.numeroCorte,
          detalleCorte: usage?.lines ?? undefined,
          tipoFactura:
            (payload.tipoFactura as TipoFactura) || TipoFactura.ESTANDAR,
          condicionPago:
            (payload.condicionPago as CondicionPagoFactura) ||
            CondicionPagoFactura.CONTADO,
          plazoCreditoDias: payload.plazoCreditoDias,
          retencionIva,
          subtotal,
          iva,
          total: roundMoney(corteMonto),
          estado:
            payload.estado === 'PAGADA'
              ? EstadoFactura.PAGADA
              : EstadoFactura.PENDIENTE,
          fechaVence: new Date(
            Date.now() + (payload.plazoCreditoDias || 0) * 24 * 60 * 60 * 1000,
          ),
        },
        include: { cliente: true, empresa: true, contrato: true, corte: true },
      });

      // Actualizar estado del corte a FACTURADO
      await tx.corteFacturacion.update({
        where: { id: corte.id },
        data: { estado: EstadoCorteFacturacion.FACTURADO },
      });

      await recordAuditInTx(tx, {
        empresaId: contrato.sucursal.empresaId,
        usuarioId,
        accion: 'FACTURA_CORTE_CREADA',
        entidadTipo: 'FACTURA',
        entidadId: factura.id,
        detalles: {
          folio: factura.folio,
          contratoId: contrato.id,
          corteId: corte.id,
          total: Number(factura.total),
          estado: factura.estado,
        },
      });

      return factura;
    });
  }

  async getInvoices(empresaId: string) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.FacturaWhereInput = {
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    const facturas = await this.prisma.factura.findMany({
      where: whereClause,
      include: {
        cliente: true,
        contrato: true,
        empresa: true,
        cotizacion: { include: { items: true } },
        corte: true,
        devolucion: true,
        pagos: true,
      },
      orderBy: {
        fechaEmision: 'desc',
      },
    });

    return facturas.map((factura) => {
      const totalPagado = roundMoney(
        (factura.pagos || []).reduce((acc, p) => acc + Number(p.monto), 0),
      );
      const saldoPendiente = roundMoney(
        Math.max(0, Number(factura.total) - totalPagado),
      );
      return {
        ...factura,
        totalPagado,
        saldoPendiente,
      };
    });
  }

  async registerPayment(
    id: string,
    payload: RegisterPaymentPayload,
    empresaId: string,
    usuarioId?: string,
  ) {
    assertEmpresaId(empresaId);
    const monto = roundMoney(assertPositive(Number(payload.monto), 'monto'));

    const whereClause: Prisma.FacturaWhereInput = {
      id,
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en PostgreSQL para serializar pagos concurrentes
      await tx.$executeRaw`SELECT id FROM "facturas" WHERE id = ${id} FOR UPDATE`;

      const factura = await tx.factura.findFirst({
        where: whereClause,
        include: { pagos: true },
      });
      if (!factura) throw new NotFoundException('Factura no encontrada');

      if (factura.estado === EstadoFactura.PAGADA) {
        throw new BadRequestException(
          'Esta factura ya se encuentra totalmente pagada.',
        );
      }

      const totalPagadoPreviamente = roundMoney(
        factura.pagos.reduce(
          (sum: number, p) => sum + roundMoney(Number(p.monto)),
          0,
        ),
      );
      const saldoPendiente = roundMoney(
        Math.max(0, Number(factura.total) - totalPagadoPreviamente),
      );

      if (monto > roundMoney(saldoPendiente + 0.009)) {
        throw new BadRequestException(
          `El monto ingresado (C$ ${monto}) supera el saldo pendiente de la factura (C$ ${saldoPendiente}).`,
        );
      }

      const pago = await tx.pago.create({
        data: {
          facturaId: factura.id,
          monto,
          metodo: payload.metodo || MetodoPago.TRANSFERENCIA,
          referencia: payload.referencia || `PAGO-${factura.folio}`,
          banco: payload.banco?.trim() || null,
          comprobanteUrl: payload.comprobanteUrl || null,
        },
      });

      const nuevoTotalPagado = roundMoney(totalPagadoPreviamente + monto);
      const nuevoSaldo = roundMoney(
        Math.max(0, Number(factura.total) - nuevoTotalPagado),
      );
      const nuevoEstado =
        nuevoSaldo <= 0.01
          ? EstadoFactura.PAGADA
          : EstadoFactura.PAGADA_PARCIAL;

      const updatedFactura = await tx.factura.update({
        where: { id: factura.id },
        data: { estado: nuevoEstado },
        include: {
          cliente: true,
          contrato: true,
          empresa: true,
          cotizacion: { include: { items: true } },
          corte: true,
          pagos: true,
        },
      });

      await recordAuditInTx(tx, {
        empresaId: factura.empresaId || empresaId || '',
        usuarioId,
        accion: 'PAGO_REGISTRADO',
        entidadTipo: 'PAGO',
        entidadId: pago.id,
        detalles: {
          facturaId: factura.id,
          folio: factura.folio,
          monto,
          metodo: pago.metodo,
          nuevoEstado,
          saldoPendiente: nuevoSaldo,
        },
      });

      return {
        factura: updatedFactura,
        pago,
        saldoPendiente: nuevoSaldo,
        totalPagado: nuevoTotalPagado,
      };
    });
  }

  async markAsPaid(id: string, empresaId: string, usuarioId?: string) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.FacturaWhereInput = {
      id,
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en PostgreSQL para serializar operaciones concurrentes
      await tx.$executeRaw`SELECT id FROM "facturas" WHERE id = ${id} FOR UPDATE`;

      const factura = await tx.factura.findFirst({
        where: whereClause,
        include: { pagos: true },
      });
      if (!factura) throw new NotFoundException('Factura no encontrada');

      const totalPagado = roundMoney(
        factura.pagos.reduce(
          (sum: number, p) => sum + roundMoney(Number(p.monto)),
          0,
        ),
      );
      const saldoPendiente = roundMoney(
        Math.max(0, Number(factura.total) - totalPagado),
      );

      if (saldoPendiente > 0) {
        await tx.pago.create({
          data: {
            facturaId: factura.id,
            monto: saldoPendiente,
            metodo: MetodoPago.TRANSFERENCIA,
            referencia: `PAGO-AUTO-${factura.folio}`,
          },
        });
      }

      const updatedFactura = await tx.factura.update({
        where: { id: factura.id },
        data: { estado: EstadoFactura.PAGADA },
        include: {
          cliente: true,
          contrato: true,
          empresa: true,
          cotizacion: { include: { items: true } },
          corte: true,
          pagos: true,
        },
      });

      await recordAuditInTx(tx, {
        empresaId: factura.empresaId || empresaId || '',
        usuarioId,
        accion: 'FACTURA_PAGADA',
        entidadTipo: 'FACTURA',
        entidadId: factura.id,
        detalles: {
          folio: factura.folio,
          saldoLiquidado: saldoPendiente,
          estado: EstadoFactura.PAGADA,
        },
      });

      return updatedFactura;
    });
  }
}
