import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BaseCalculoComision,
  EstadoAjusteComision,
  EstadoFactura,
  EstadoLiquidacionComision,
  EstadoPeriodoComision,
  EstadoVersionPlan,
  MetodoCalculoComision,
  Prisma,
  TipoDocComision,
  TratamientoNegativoComision,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  calcularComision,
  roundHalfUp2,
  TramoConfig,
  validateTramos,
} from '../utils/commission-calculator';
import {
  AssignPlanDto,
  CreatePlanComisionDto,
  SimuladorDto,
  SolicitarAjusteDto,
} from '../dto/comisiones-v2.dto';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class CommissionsV2Service {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Carga los planes iniciales según la especificación técnica de BM Construcciones:
   * - Plan David (3% hasta 800k, 2% de 800k a 1.2M, 1% exceso)
   * - Plan Nylska (2% hasta 300k, 1% exceso)
   * - Vendedores DAVID y NYLSKA con sus respectivas asignaciones vigentes.
   */
  async seedDefaultPlans(empresaId: string, usuarioId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Plan David
      let planDavid = await tx.planComision.findFirst({
        where: { empresaId, codigo: 'PLAN_DAVID' },
        include: { versiones: { include: { tramos: true } } },
      });

      if (!planDavid) {
        planDavid = await tx.planComision.create({
          data: {
            empresaId,
            codigo: 'PLAN_DAVID',
            nombre: 'Plan David 2026',
            descripcion: 'Escala escalonada para David: 3% hasta 800k, 2% hasta 1.2M, 1% más de 1.2M',
            versiones: {
              create: {
                version: 1,
                vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
                metodo: MetodoCalculoComision.ESCALONADO,
                base: BaseCalculoComision.FACTURADO,
                incluyeIva: false,
                tratamientoNegativo: TratamientoNegativoComision.ARRASTRAR,
                mesesMaxArrastre: 3,
                estado: EstadoVersionPlan.ACTIVA,
                tramos: {
                  create: [
                    { orden: 1, desdeExcl: 0, hastaIncl: 800000, porcentaje: 3.0 },
                    { orden: 2, desdeExcl: 800000, hastaIncl: 1200000, porcentaje: 2.0 },
                    { orden: 3, desdeExcl: 1200000, hastaIncl: null, porcentaje: 1.0 },
                  ],
                },
              },
            },
          },
          include: { versiones: { include: { tramos: true } } },
        });
      }

      // 2. Plan Nylska
      let planNylska = await tx.planComision.findFirst({
        where: { empresaId, codigo: 'PLAN_NYLSKA' },
        include: { versiones: { include: { tramos: true } } },
      });

      if (!planNylska) {
        planNylska = await tx.planComision.create({
          data: {
            empresaId,
            codigo: 'PLAN_NYLSKA',
            nombre: 'Plan Nylska 2026',
            descripcion: 'Escala escalonada para Nylska: 2% hasta 300k, 1% más de 300k',
            versiones: {
              create: {
                version: 1,
                vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
                metodo: MetodoCalculoComision.ESCALONADO,
                base: BaseCalculoComision.FACTURADO,
                incluyeIva: false,
                tratamientoNegativo: TratamientoNegativoComision.ARRASTRAR,
                mesesMaxArrastre: 3,
                estado: EstadoVersionPlan.ACTIVA,
                tramos: {
                  create: [
                    { orden: 1, desdeExcl: 0, hastaIncl: 300000, porcentaje: 2.0 },
                    { orden: 2, desdeExcl: 300000, hastaIncl: null, porcentaje: 1.0 },
                  ],
                },
              },
            },
          },
          include: { versiones: { include: { tramos: true } } },
        });
      }

      // 3. Vendedores
      let vendedorDavid = await tx.vendedor.findFirst({
        where: { empresaId, codigo: 'DAVID' },
      });
      if (!vendedorDavid) {
        vendedorDavid = await tx.vendedor.create({
          data: {
            empresaId,
            codigo: 'DAVID',
            nombreMostrar: 'David',
            esComisionable: true,
          },
        });
      }

      let vendedorNylska = await tx.vendedor.findFirst({
        where: { empresaId, codigo: 'NYLSKA' },
      });
      if (!vendedorNylska) {
        vendedorNylska = await tx.vendedor.create({
          data: {
            empresaId,
            codigo: 'NYLSKA',
            nombreMostrar: 'Nylska',
            esComisionable: true,
          },
        });
      }

      // 4. Asignaciones
      const asigDavid = await tx.asignacionVendedorPlan.findFirst({
        where: { vendedorId: vendedorDavid.id, planId: planDavid.id },
      });
      if (!asigDavid) {
        await tx.asignacionVendedorPlan.create({
          data: {
            vendedorId: vendedorDavid.id,
            planId: planDavid.id,
            vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
            motivo: 'Asignación inicial plan David 2026',
          },
        });
      }

      const asigNylska = await tx.asignacionVendedorPlan.findFirst({
        where: { vendedorId: vendedorNylska.id, planId: planNylska.id },
      });
      if (!asigNylska) {
        await tx.asignacionVendedorPlan.create({
          data: {
            vendedorId: vendedorNylska.id,
            planId: planNylska.id,
            vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
            motivo: 'Asignación inicial plan Nylska 2026',
          },
        });
      }

      return {
        message: 'Planes y vendedores predeterminados sembrados con éxito.',
        planes: [planDavid, planNylska],
        vendedores: [vendedorDavid, vendedorNylska],
      };
    });
  }

  /** Lista todos los planes de comisión configurados para la empresa. */
  async getPlanes(empresaId: string) {
    return this.prisma.planComision.findMany({
      where: { empresaId },
      include: {
        versiones: {
          orderBy: { version: 'desc' },
          include: {
            tramos: { orderBy: { orden: 'asc' } },
          },
        },
        asignaciones: {
          include: { vendedor: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Crea un nuevo plan de comisión con su primera versión de tramos. */
  async createPlan(empresaId: string, dto: CreatePlanComisionDto, usuarioId?: string) {
    const tramosConfig: TramoConfig[] = dto.tramos.map((t) => ({
      orden: t.orden,
      desdeExcl: t.desdeExcl,
      hastaIncl: t.hastaIncl ?? null,
      porcentaje: t.porcentaje,
    }));
    validateTramos(tramosConfig);

    return this.prisma.$transaction(async (tx) => {
      const existe = await tx.planComision.findFirst({
        where: { empresaId, codigo: dto.codigo },
      });
      if (existe) {
        throw new BadRequestException(`Ya existe un plan con el código ${dto.codigo}`);
      }

      const plan = await tx.planComision.create({
        data: {
          empresaId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          versiones: {
            create: {
              version: 1,
              vigenteDesde: new Date(dto.vigenteDesde),
              vigenteHasta: dto.vigenteHasta ? new Date(dto.vigenteHasta) : null,
              metodo: dto.metodo || MetodoCalculoComision.ESCALONADO,
              base: dto.base || BaseCalculoComision.FACTURADO,
              incluyeIva: dto.incluyeIva || false,
              tratamientoNegativo: dto.tratamientoNegativo || TratamientoNegativoComision.ARRASTRAR,
              mesesMaxArrastre: dto.mesesMaxArrastre || 3,
              estado: EstadoVersionPlan.ACTIVA,
              aprobadoPor: usuarioId,
              aprobadoEn: new Date(),
              tramos: {
                create: dto.tramos.map((t) => ({
                  orden: t.orden,
                  desdeExcl: t.desdeExcl,
                  hastaIncl: t.hastaIncl ?? null,
                  porcentaje: t.porcentaje,
                })),
              },
            },
          },
        },
        include: {
          versiones: {
            include: { tramos: { orderBy: { orden: 'asc' } } },
          },
        },
      });

      return plan;
    });
  }

  /** Asigna un plan a un vendedor con validación de no traslape (V7). */
  async assignPlanToVendedor(empresaId: string, dto: AssignPlanDto) {
    return this.prisma.$transaction(async (tx) => {
      const vendedor = await tx.vendedor.findFirst({
        where: { id: dto.vendedorId, empresaId },
      });
      if (!vendedor) throw new NotFoundException('Vendedor no encontrado');

      const plan = await tx.planComision.findFirst({
        where: { id: dto.planId, empresaId },
      });
      if (!plan) throw new NotFoundException('Plan no encontrado');

      const desde = new Date(dto.vigenteDesde);
      const hasta = dto.vigenteHasta ? new Date(dto.vigenteHasta) : null;

      // Validar traslapes existentes (V7)
      const existentes = await tx.asignacionVendedorPlan.findMany({
        where: { vendedorId: vendedor.id },
      });

      for (const e of existentes) {
        const eDesde = e.vigenteDesde;
        const eHasta = e.vigenteHasta;

        const seTraslapan =
          (!hasta || eDesde <= hasta) && (!eHasta || desde <= eHasta);

        if (seTraslapan) {
          throw new BadRequestException(
            `El vendedor ya tiene una asignación de plan en el rango solicitado (Conflicto con plan ${e.planId}). Cierre la vigencia anterior antes de asignar una nueva.`,
          );
        }
      }

      return tx.asignacionVendedorPlan.create({
        data: {
          vendedorId: vendedor.id,
          planId: plan.id,
          vigenteDesde: desde,
          vigenteHasta: hasta,
          motivo: dto.motivo,
        },
        include: { plan: true, vendedor: true },
      });
    });
  }

  /** Lista o genera el período de comisión para un mes dado. */
  async getOrCreatePeriodo(empresaId: string, anio: number, mes: number) {
    return this.prisma.$transaction(async (tx) => {
      let periodo = await tx.periodoComision.findFirst({
        where: { empresaId, anio, mes },
      });

      if (!periodo) {
        const fechaInicio = new Date(Date.UTC(anio, mes - 1, 1));
        const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getDate();
        const fechaFin = new Date(Date.UTC(anio, mes - 1, ultimoDia, 23, 59, 59, 999));

        // Fecha de pago día 15 del mes siguiente
        const anioPago = mes === 12 ? anio + 1 : anio;
        const mesPago = mes === 12 ? 1 : mes + 1;
        const fechaPago = new Date(Date.UTC(anioPago, mesPago - 1, 15));

        periodo = await tx.periodoComision.create({
          data: {
            empresaId,
            anio,
            mes,
            fechaInicio,
            fechaFin,
            fechaPago,
            estado: EstadoPeriodoComision.ABIERTO,
          },
        });
      }

      return periodo;
    });
  }

  /**
   * Genera o recalcula la liquidación mensual de un vendedor (R1 a R7 y Algoritmo 7).
   */
  async generarLiquidacion(
    empresaId: string,
    periodoId: string,
    vendedorId: string,
    usuarioId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const periodo = await tx.periodoComision.findFirst({
        where: { id: periodoId, empresaId },
      });
      if (!periodo) throw new NotFoundException('Período de comisión no encontrado');

      if (periodo.estado === EstadoPeriodoComision.CERRADO) {
        throw new BadRequestException('El período se encuentra CERRADO. No admite recálculos.');
      }

      const vendedor = await tx.vendedor.findFirst({
        where: { id: vendedorId, empresaId },
      });
      if (!vendedor) throw new NotFoundException('Vendedor no encontrado');

      // Buscar liquidación previa si existe
      let liq = await tx.liquidacionComision.findFirst({
        where: { periodoId, vendedorId },
        include: { ajustes: true },
      });

      if (
        liq &&
        (liq.estado === EstadoLiquidacionComision.APROBADO ||
          liq.estado === EstadoLiquidacionComision.PAGADO)
      ) {
        throw new BadRequestException('Liquidación bloqueada (ya se encuentra aprobada/pagada).');
      }

      // Buscar asignación vigente del vendedor a la fecha de fin de período
      const asignacion = await tx.asignacionVendedorPlan.findFirst({
        where: {
          vendedorId: vendedor.id,
          vigenteDesde: { lte: periodo.fechaFin },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: periodo.fechaFin } }],
        },
        include: {
          plan: {
            include: {
              versiones: {
                where: {
                  estado: EstadoVersionPlan.ACTIVA,
                  vigenteDesde: { lte: periodo.fechaFin },
                  OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: periodo.fechaFin } }],
                },
                include: { tramos: { orderBy: { orden: 'asc' } } },
              },
            },
          },
        },
      });

      if (!asignacion || !asignacion.plan.versiones[0]) {
        throw new BadRequestException(
          `El vendedor ${vendedor.codigo} no tiene un plan de comisiones activo para el período ${periodo.anio}-${periodo.mes}.`,
        );
      }

      const version = asignacion.plan.versiones[0];
      const tramosConfig: TramoConfig[] = version.tramos.map((t) => ({
        orden: t.orden,
        desdeExcl: Number(t.desdeExcl),
        hastaIncl: t.hastaIncl !== null ? Number(t.hastaIncl) : null,
        porcentaje: Number(t.porcentaje),
      }));

      // Si existía liquidación previa en borrador/revisado, limpiar sus documentos y tramos previos
      if (liq) {
        await tx.liquidacionComisionDocumento.deleteMany({
          where: { liquidacionId: liq.id },
        });
        await tx.liquidacionComisionTramo.deleteMany({
          where: { liquidacionId: liq.id },
        });
      }

      // 1. Acumular Facturas del mes (sin IVA) (R1, R5, R7)
      // Facturas asignadas a este vendedor
      const facturas = await tx.factura.findMany({
        where: {
          empresaId,
          vendedorId: vendedor.id,
          fechaEmision: { lte: periodo.fechaFin },
          estado: { not: EstadoFactura.CANCELADA },
          OR: [
            { periodoComisionId: null },
            { periodoComisionId: periodo.id },
          ],
        },
        include: { cliente: true },
      });

      let totalVentas = 0;
      let totalNc = 0;
      const docsToCreate: Prisma.LiquidacionComisionDocumentoCreateManyInput[] = [];
      const sucursalTotales: Record<string, number> = {};

      for (const f of facturas) {
        // En base facturado: subtotal sin IVA
        const montoBase = Number(version.incluyeIva ? f.total : f.subtotal);
        totalVentas += montoBase;

        if (f.sucursalId) {
          sucursalTotales[f.sucursalId] = (sucursalTotales[f.sucursalId] || 0) + montoBase;
        }

        docsToCreate.push({
          liquidacionId: liq?.id || 'temp', // se asignará al crear/actualizar
          tipoDoc: TipoDocComision.FACTURA,
          documentoId: f.id,
          serieNumero: f.folio,
          fechaDoc: f.fechaEmision,
          sucursalId: f.sucursalId,
          clienteNombre: f.cliente?.nombre || null,
          subtotalSinIva: f.subtotal,
          iva: f.iva,
          total: f.total,
          montoBase: new Prisma.Decimal(montoBase),
          pctParticipacion: new Prisma.Decimal(100.0),
          esTardio: f.fechaEmision < periodo.fechaInicio,
        });
      }

      // 2. Restar Notas de Crédito / Rectificaciones emitidas en el período (R6)
      const rectificaciones = await tx.factura.findMany({
        where: {
          empresaId,
          tipoFactura: 'RECTIFICATIVA',
          fechaEmision: {
            gte: periodo.fechaInicio,
            lte: periodo.fechaFin,
          },
          estado: { not: EstadoFactura.CANCELADA },
          facturaPadre: {
            vendedorId: vendedor.id,
          },
        },
        include: { cliente: true },
      });

      for (const nc of rectificaciones) {
        const montoNc = Math.abs(Number(version.incluyeIva ? nc.total : nc.subtotal));
        totalNc -= montoNc;

        if (nc.sucursalId) {
          sucursalTotales[nc.sucursalId] = (sucursalTotales[nc.sucursalId] || 0) - montoNc;
        }

        docsToCreate.push({
          liquidacionId: liq?.id || 'temp',
          tipoDoc: TipoDocComision.NOTA_CREDITO,
          documentoId: nc.id,
          serieNumero: nc.folio,
          fechaDoc: nc.fechaEmision,
          sucursalId: nc.sucursalId,
          clienteNombre: nc.cliente?.nombre || null,
          facturaOrigenId: nc.facturaPadreId,
          subtotalSinIva: nc.subtotal,
          iva: nc.iva,
          total: nc.total,
          montoBase: new Prisma.Decimal(-montoNc),
          pctParticipacion: new Prisma.Decimal(100.0),
          esTardio: false,
        });
      }

      // 3. Arrastre de saldos negativos de meses anteriores (R6)
      const arrastresPendientes = await tx.saldoArrastreComision.findMany({
        where: {
          vendedorId: vendedor.id,
          periodoAplicadoId: null,
          extinguidoEn: null,
        },
      });

      const arrastreAplicado = arrastresPendientes.reduce(
        (sum, a) => sum + Number(a.monto),
        0,
      );

      const baseComisionable = totalVentas + totalNc + arrastreAplicado;

      // 4. Cálculo de Comisión (R3)
      let comisionCalculada = 0;
      let arrastreGenerado = 0;
      let lineasTramos: {
        orden: number;
        desdeExcl: number;
        hastaIncl: number | null;
        porcentaje: number;
        montoEnTramo: number;
        comisionTramo: number;
      }[] = [];

      if (baseComisionable < 0 && version.tratamientoNegativo === TratamientoNegativoComision.ARRASTRAR) {
        comisionCalculada = 0;
        arrastreGenerado = baseComisionable;
      } else {
        const res = calcularComision(baseComisionable, tramosConfig, version.metodo);
        comisionCalculada = res.comisionCalculada;
        lineasTramos = res.tramos;
        arrastreGenerado = 0;
      }

      // 5. Ajustes manuales
      const ajustesAprobados = (liq?.ajustes || [])
        .filter((a) => a.estado === EstadoAjusteComision.APROBADO)
        .reduce((sum, a) => sum + Number(a.monto), 0);

      const comisionTotal = Math.max(0, comisionCalculada + ajustesAprobados);

      // Desglose proporcional por sucursal
      const desgloseSucursal: Record<string, number> = {};
      const totalBaseSucursal = Object.values(sucursalTotales).reduce((a, b) => a + b, 0);
      if (totalBaseSucursal > 0) {
        for (const [sucId, monto] of Object.entries(sucursalTotales)) {
          desgloseSucursal[sucId] = roundHalfUp2((monto / totalBaseSucursal) * 100);
        }
      }

      const numeroLiq = `COM-${periodo.anio}-${String(periodo.mes).padStart(2, '0')}-${vendedor.codigo}`;

      const snapTramosJson = tramosConfig.map((t) => ({
        orden: t.orden,
        desde: t.desdeExcl,
        hasta: t.hastaIncl,
        pct: t.porcentaje,
      }));

      // Guardar encabezado
      if (liq) {
        liq = await tx.liquidacionComision.update({
          where: { id: liq.id },
          data: {
            estado: EstadoLiquidacionComision.BORRADOR,
            planVersionId: version.id,
            snapMetodo: version.metodo,
            snapBase: version.base,
            snapIncluyeIva: version.incluyeIva,
            snapTratamientoNegativo: version.tratamientoNegativo,
            snapTramos: snapTramosJson,
            totalVentas: new Prisma.Decimal(totalVentas),
            totalNc: new Prisma.Decimal(totalNc),
            arrastreAplicado: new Prisma.Decimal(arrastreAplicado),
            baseComisionable: new Prisma.Decimal(baseComisionable),
            comisionCalculada: new Prisma.Decimal(comisionCalculada),
            totalAjustes: new Prisma.Decimal(ajustesAprobados),
            comisionTotal: new Prisma.Decimal(comisionTotal),
            arrastreGenerado: new Prisma.Decimal(arrastreGenerado),
            desgloseSucursal,
            nRecalculos: { increment: 1 },
          },
          include: { ajustes: true },
        });
      } else {
        liq = await tx.liquidacionComision.create({
          data: {
            empresaId,
            numero: numeroLiq,
            periodoId: periodo.id,
            vendedorId: vendedor.id,
            planVersionId: version.id,
            estado: EstadoLiquidacionComision.BORRADOR,
            snapMetodo: version.metodo,
            snapBase: version.base,
            snapIncluyeIva: version.incluyeIva,
            snapTratamientoNegativo: version.tratamientoNegativo,
            snapTramos: snapTramosJson,
            totalVentas: new Prisma.Decimal(totalVentas),
            totalNc: new Prisma.Decimal(totalNc),
            arrastreAplicado: new Prisma.Decimal(arrastreAplicado),
            baseComisionable: new Prisma.Decimal(baseComisionable),
            comisionCalculada: new Prisma.Decimal(comisionCalculada),
            totalAjustes: new Prisma.Decimal(ajustesAprobados),
            comisionTotal: new Prisma.Decimal(comisionTotal),
            arrastreGenerado: new Prisma.Decimal(arrastreGenerado),
            desgloseSucursal,
          },
          include: { ajustes: true },
        });
      }

      // Guardar detalle de documentos y tramos
      if (docsToCreate.length > 0) {
        await tx.liquidacionComisionDocumento.createMany({
          data: docsToCreate.map((d) => ({ ...d, liquidacionId: liq.id })),
        });
      }

      if (lineasTramos.length > 0) {
        await tx.liquidacionComisionTramo.createMany({
          data: lineasTramos.map((lt) => ({
            liquidacionId: liq.id,
            orden: lt.orden,
            desdeExcl: new Prisma.Decimal(lt.desdeExcl),
            hastaIncl: lt.hastaIncl !== null ? new Prisma.Decimal(lt.hastaIncl) : null,
            porcentaje: new Prisma.Decimal(lt.porcentaje),
            montoEnTramo: new Prisma.Decimal(lt.montoEnTramo),
            comisionTramo: new Prisma.Decimal(lt.comisionTramo),
          })),
        });
      }

      // Retornar liquidación completa
      return tx.liquidacionComision.findUnique({
        where: { id: liq.id },
        include: {
          periodo: true,
          vendedor: true,
          documentos: { orderBy: { fechaDoc: 'asc' } },
          tramos: { orderBy: { orden: 'asc' } },
          ajustes: true,
        },
      });
    });
  }

  /** Marca una liquidación como REVISADA. */
  async marcarRevisado(empresaId: string, liquidacionId: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const liq = await tx.liquidacionComision.findFirst({
        where: { id: liquidacionId, empresaId },
        include: { ajustes: true },
      });
      if (!liq) throw new NotFoundException('Liquidación no encontrada');

      if (liq.estado !== EstadoLiquidacionComision.BORRADOR) {
        throw new BadRequestException('Solo una liquidación en BORRADOR puede marcarse como REVISADA.');
      }

      const tieneAjustesPendientes = liq.ajustes.some(
        (a) => a.estado === EstadoAjusteComision.PENDIENTE,
      );
      if (tieneAjustesPendientes) {
        throw new BadRequestException(
          'No se puede marcar como REVISADA mientras existan ajustes PENDIENTES de aprobación.',
        );
      }

      return tx.liquidacionComision.update({
        where: { id: liq.id },
        data: {
          estado: EstadoLiquidacionComision.REVISADO,
          revisadoPor: usuarioId,
          revisadoEn: new Date(),
        },
        include: {
          documentos: true,
          tramos: true,
          ajustes: true,
        },
      });
    });
  }

  /**
   * Aprueba una liquidación de comisiones (R8 / R9 / R10):
   * - Congela documentos y reglas
   * - Si hay arrastre generado negativo, crea saldo de arrastre
   * - Si el vendedor tiene empleadoId, emite novedad COMISION hacia nómina
   */
  async aprobarLiquidacion(empresaId: string, liquidacionId: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const liq = await tx.liquidacionComision.findFirst({
        where: { id: liquidacionId, empresaId },
        include: {
          periodo: true,
          vendedor: true,
          documentos: true,
          ajustes: true,
        },
      });
      if (!liq) throw new NotFoundException('Liquidación no encontrada');

      if (
        liq.estado !== EstadoLiquidacionComision.BORRADOR &&
        liq.estado !== EstadoLiquidacionComision.REVISADO
      ) {
        throw new BadRequestException('La liquidación no está en un estado apto para aprobación.');
      }

      const tieneAjustesPendientes = liq.ajustes.some(
        (a) => a.estado === EstadoAjusteComision.PENDIENTE,
      );
      if (tieneAjustesPendientes) {
        throw new BadRequestException('No se puede aprobar con ajustes PENDIENTES.');
      }

      // Marcar periodo_comision_id en las facturas involucradas
      const facturaIds = liq.documentos
        .filter((d) => d.tipoDoc === TipoDocComision.FACTURA)
        .map((d) => d.documentoId);

      if (facturaIds.length > 0) {
        await tx.factura.updateMany({
          where: { id: { in: facturaIds } },
          data: { periodoComisionId: liq.periodoId },
        });
      }

      // Arrastre generado negativo -> crear saldo nuevo
      if (Number(liq.arrastreGenerado) < 0) {
        await tx.saldoArrastreComision.create({
          data: {
            vendedorId: liq.vendedorId,
            periodoOrigenId: liq.periodoId,
            monto: liq.arrastreGenerado,
          },
        });
      }

      // Marcar arrastres consumidos
      await tx.saldoArrastreComision.updateMany({
        where: {
          vendedorId: liq.vendedorId,
          periodoAplicadoId: null,
          extinguidoEn: null,
        },
        data: {
          periodoAplicadoId: liq.periodoId,
        },
      });

      // Interfaz con nómina (contrato 10.5 de la spec):
      // Si el vendedor tiene empleadoId, enviar como novedad COMISION a la Q1 del mes siguiente
      let nominaPeriodoId: string | null = null;
      if (liq.vendedor.empleadoId && Number(liq.comisionTotal) > 0) {
        const anioNomina = liq.periodo.mes === 12 ? liq.periodo.anio + 1 : liq.periodo.anio;
        const mesNomina = liq.periodo.mes === 12 ? 1 : liq.periodo.mes + 1;

        let periodoNomina = await tx.periodoNomina.findFirst({
          where: {
            empresaId,
            anio: anioNomina,
            mes: mesNomina,
            quincena: 1,
          },
        });

        if (!periodoNomina) {
          periodoNomina = await tx.periodoNomina.create({
            data: {
              empresaId,
              anio: anioNomina,
              mes: mesNomina,
              quincena: 1,
              fechaInicio: new Date(Date.UTC(anioNomina, mesNomina - 1, 1)),
              fechaFin: new Date(Date.UTC(anioNomina, mesNomina - 1, 15, 23, 59, 59, 999)),
              fechaPago: new Date(Date.UTC(anioNomina, mesNomina - 1, 15)),
            },
          });
        }

        nominaPeriodoId = periodoNomina.id;

        // Concepto de nómina COM
        let conceptoCom = await tx.conceptoNomina.findFirst({
          where: { empresaId, codigo: 'COM' },
        });

        if (!conceptoCom) {
          conceptoCom = await tx.conceptoNomina.create({
            data: {
              empresaId,
              codigo: 'COM',
              nombre: 'Comisión sobre Ventas',
              tipo: 'DEVENGO',
              afectaInss: true,
              afectaInatec: true,
              afectaIr: true,
              metodoIr: 'ORDINARIO',
              afectaPromedioPrestaciones: true,
              visibleColilla: true,
            },
          });
        }

        // Crear novedad de nómina
        await tx.novedadNomina.create({
          data: {
            empresaId,
            empleadoId: liq.vendedor.empleadoId,
            periodoDestinoId: periodoNomina.id,
            conceptoId: conceptoCom.id,
            monto: liq.comisionTotal,
            origen: 'COMISIONES',
            referenciaId: liq.id,
            periodoDevengo: `${liq.periodo.anio}-${String(liq.periodo.mes).padStart(2, '0')}`,
            estado: 'PENDIENTE',
            aprobadoPor: usuarioId,
          },
        });
      }

      // Actualizar estado a APROBADO
      const updated = await tx.liquidacionComision.update({
        where: { id: liq.id },
        data: {
          estado: EstadoLiquidacionComision.APROBADO,
          aprobadoPor: usuarioId,
          aprobadoEn: new Date(),
          nominaPeriodoId,
        },
        include: {
          vendedor: true,
          periodo: true,
          documentos: true,
          tramos: true,
          ajustes: true,
        },
      });

      return updated;
    });
  }

  /** Solicita un ajuste manual a una liquidación en borrador o revisada. */
  async solicitarAjuste(
    empresaId: string,
    liquidacionId: string,
    dto: SolicitarAjusteDto,
    usuarioId: string,
  ) {
    const liq = await this.prisma.liquidacionComision.findFirst({
      where: { id: liquidacionId, empresaId },
    });
    if (!liq) throw new NotFoundException('Liquidación no encontrada');

    if (
      liq.estado !== EstadoLiquidacionComision.BORRADOR &&
      liq.estado !== EstadoLiquidacionComision.REVISADO
    ) {
      throw new BadRequestException('Solo se pueden solicitar ajustes a liquidaciones en BORRADOR o REVISADO.');
    }

    return this.prisma.ajusteComision.create({
      data: {
        liquidacionId: liq.id,
        monto: new Prisma.Decimal(dto.monto),
        motivo: dto.motivo,
        descripcion: dto.descripcion,
        documentoSoporte: dto.documentoSoporte,
        solicitadoPor: usuarioId,
        estado: EstadoAjusteComision.PENDIENTE,
      },
    });
  }

  /**
   * Aprueba un ajuste manual con segregación de funciones (V14: quien aprueba debe ser distinto de quien solicitó).
   */
  async aprobarAjuste(empresaId: string, ajusteId: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ajuste = await tx.ajusteComision.findFirst({
        where: { id: ajusteId },
        include: { liquidacion: true },
      });
      if (!ajuste) throw new NotFoundException('Ajuste no encontrado');

      if (ajuste.liquidacion.empresaId !== empresaId) {
        throw new ForbiddenException('No autorizado');
      }

      if (ajuste.solicitadoPor === usuarioId) {
        throw new BadRequestException(
          'Quien aprueba el ajuste debe ser una persona distinta a quien lo solicitó (Segregación de funciones V14).',
        );
      }

      if (ajuste.estado !== EstadoAjusteComision.PENDIENTE) {
        throw new BadRequestException('El ajuste ya fue procesado anteriormente.');
      }

      const actualizado = await tx.ajusteComision.update({
        where: { id: ajuste.id },
        data: {
          estado: EstadoAjusteComision.APROBADO,
          aprobadoPor: usuarioId,
          aprobadoEn: new Date(),
        },
      });

      // Recalcular comisionTotal en liquidación
      const todosAprobados = await tx.ajusteComision.findMany({
        where: {
          liquidacionId: ajuste.liquidacionId,
          estado: EstadoAjusteComision.APROBADO,
        },
      });

      const totalAjustes = todosAprobados.reduce((sum, a) => sum + Number(a.monto), 0);
      const comisionTotal = Math.max(
        0,
        Number(ajuste.liquidacion.comisionCalculada) + totalAjustes,
      );

      await tx.liquidacionComision.update({
        where: { id: ajuste.liquidacionId },
        data: {
          totalAjustes: new Prisma.Decimal(totalAjustes),
          comisionTotal: new Prisma.Decimal(comisionTotal),
        },
      });

      return actualizado;
    });
  }

  /** Simulador interactivo para comparar método Escalonado vs Tramo Único. */
  simulador(dto: SimuladorDto) {
    const tramosConfig: TramoConfig[] = dto.tramos.map((t) => ({
      orden: t.orden,
      desdeExcl: t.desdeExcl,
      hastaIncl: t.hastaIncl ?? null,
      porcentaje: t.porcentaje,
    }));
    validateTramos(tramosConfig);
    const escalonado = calcularComision(dto.monto, tramosConfig, 'ESCALONADO');
    const tramoUnico = calcularComision(dto.monto, tramosConfig, 'TRAMO_UNICO');

    return {
      monto: dto.monto,
      escalonado: {
        comision: escalonado.comisionCalculada,
        porcentajeEfectivo: dto.monto > 0 ? roundHalfUp2((escalonado.comisionCalculada / dto.monto) * 100) : 0,
        tramos: escalonado.tramos,
      },
      tramoUnico: {
        comision: tramoUnico.comisionCalculada,
        porcentajeEfectivo: dto.monto > 0 ? roundHalfUp2((tramoUnico.comisionCalculada / dto.monto) * 100) : 0,
        tramos: tramoUnico.tramos,
      },
      diferencia: roundHalfUp2(escalonado.comisionCalculada - tramoUnico.comisionCalculada),
    };
  }
}
