import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SimularArregloDto } from '../dto/simular-arreglo.dto';
import { CreateArregloPagoDto } from '../dto/create-arreglo-pago.dto';
import { TipoCambioService } from './tipo-cambio.service';
import { CxcConfiguracionService } from './cxc-configuracion.service';

export interface CuotaSimulada {
  numeroCuota: number;
  fechaVencimiento: string;
  capital: number;
  interes: number;
  gastosAdmin: number;
  iva: number;
  totalCuota: number;
  saldoRestante: number;
}

@Injectable()
export class CxcArreglosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoCambioService: TipoCambioService,
    private readonly configService: CxcConfiguracionService
  ) {}

  /**
   * Simula la tabla de amortización para un arreglo de pago (sin persistir en base de datos).
   */
  simularAmortizacion(dto: SimularArregloDto): {
    resumen: {
      capitalOriginal: number;
      montoGastosAdmin: number;
      montoIntereses: number;
      montoIva: number;
      granTotalArreglo: number;
      cuotaPromedio: number;
      numeroCuotas: number;
      frecuencia: string;
      metodoAmortizacion: string;
    };
    tablaAmortizacion: CuotaSimulada[];
  } {
    const capital = Number(dto.montoCapital);
    const n = dto.numeroCuotas;
    const metodo = dto.metodoAmortizacion || 'CUOTA_NIVELADA';

    // Frecuencias: SEMANAL (52/año), QUINCENAL (24/año), MENSUAL (12/año)
    const periodosAnio = dto.frecuencia === 'SEMANAL' ? 52 : dto.frecuencia === 'QUINCENAL' ? 24 : 12;
    const tasaPeriodica = (dto.tasaInteresAnual / 100) / periodosAnio;

    // Gastos administrativos distribuidos
    const gastosAdminTotal = capital * (dto.porcentajeGastosAdmin / 100);
    const gastosAdminPorCuota = Math.round((gastosAdminTotal / n) * 100) / 100;

    let cuotaNiveladaBase = 0;
    if (tasaPeriodica > 0) {
      cuotaNiveladaBase = capital * (tasaPeriodica / (1 - Math.pow(1 + tasaPeriodica, -n)));
    } else {
      cuotaNiveladaBase = capital / n;
    }

    const tabla: CuotaSimulada[] = [];
    let saldoActual = capital;
    let fechaIter = new Date(dto.fechaPrimeraCuota.slice(0, 10));

    let sumaIntereses = 0;
    let sumaGastos = 0;
    let sumaIva = 0;

    for (let i = 1; i <= n; i++) {
      let interesCuota = 0;
      let capitalCuota = 0;

      if (metodo === 'CUOTA_NIVELADA') {
        interesCuota = Math.round(saldoActual * tasaPeriodica * 100) / 100;
        capitalCuota = i === n ? saldoActual : Math.round((cuotaNiveladaBase - interesCuota) * 100) / 100;
      } else {
        // CAPITAL_CONSTANTE (Alemán)
        capitalCuota = i === n ? saldoActual : Math.round((capital / n) * 100) / 100;
        interesCuota = Math.round(saldoActual * tasaPeriodica * 100) / 100;
      }

      saldoActual = Math.max(0, Math.round((saldoActual - capitalCuota) * 100) / 100);

      // IVA sobre intereses y gastos administrativos si están parametrizados
      const ivaInteres = dto.aplicaIvaIntereses ? Math.round(interesCuota * 0.15 * 100) / 100 : 0;
      const ivaGastos = dto.aplicaIvaGastosAdmin ? Math.round(gastosAdminPorCuota * 0.15 * 100) / 100 : 0;
      const ivaCuota = ivaInteres + ivaGastos;

      const totalCuota = Math.round((capitalCuota + interesCuota + gastosAdminPorCuota + ivaCuota) * 100) / 100;

      tabla.push({
        numeroCuota: i,
        fechaVencimiento: fechaIter.toISOString().slice(0, 10),
        capital: capitalCuota,
        interes: interesCuota,
        gastosAdmin: gastosAdminPorCuota,
        iva: ivaCuota,
        totalCuota,
        saldoRestante: saldoActual,
      });

      sumaIntereses += interesCuota;
      sumaGastos += gastosAdminPorCuota;
      sumaIva += ivaCuota;

      // Avanzar fecha según frecuencia
      if (dto.frecuencia === 'SEMANAL') {
        fechaIter.setDate(fechaIter.getDate() + 7);
      } else if (dto.frecuencia === 'QUINCENAL') {
        fechaIter.setDate(fechaIter.getDate() + 15);
      } else {
        fechaIter.setMonth(fechaIter.getMonth() + 1);
      }
    }

    const granTotal = Math.round((capital + sumaIntereses + sumaGastos + sumaIva) * 100) / 100;

    return {
      resumen: {
        capitalOriginal: capital,
        montoGastosAdmin: Math.round(sumaGastos * 100) / 100,
        montoIntereses: Math.round(sumaIntereses * 100) / 100,
        montoIva: Math.round(sumaIva * 100) / 100,
        granTotalArreglo: granTotal,
        cuotaPromedio: Math.round((granTotal / n) * 100) / 100,
        numeroCuotas: n,
        frecuencia: dto.frecuencia,
        metodoAmortizacion: metodo,
      },
      tablaAmortizacion: tabla,
    };
  }

  /**
   * Genera el consecutivo único para el arreglo de pago (ej: ARR-2026-0001).
   */
  private async generarSiguienteNumeroArreglo(empresaId: string): Promise<string> {
    const anio = new Date().getFullYear();
    const prefijo = `ARR-${anio}`;
    const ultimo = await this.prisma.arregloPago.findFirst({
      where: {
        empresaId,
        numeroArreglo: { startsWith: prefijo },
      },
      orderBy: { createdAt: 'desc' },
    });

    let siguiente = 1;
    if (ultimo) {
      const match = ultimo.numeroArreglo.match(/-(\d+)$/);
      if (match) {
        siguiente = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefijo}-${String(siguiente).padStart(4, '0')}`;
  }

  /**
   * Crea y solicita la formalización de un nuevo Arreglo de Pago consolidando facturas a crédito.
   */
  async solicitarArregloPago(empresaId: string, usuarioId: string, dto: CreateArregloPagoDto) {
    if (!dto.facturasIds || dto.facturasIds.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos una factura para incorporar al arreglo de pago.');
    }

    const cliente = await this.prisma.cliente.findUnique({ where: { id: dto.clienteId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const tcInfo = await this.tipoCambioService.getTipoCambioHoy();
    const config = await this.configService.getConfiguracion(empresaId);

    // Validar facturas seleccionadas
    const facturas = await this.prisma.factura.findMany({
      where: {
        id: { in: dto.facturasIds },
        clienteId: dto.clienteId,
        condicionPago: 'CREDITO',
        estadoCxc: { in: ['PENDIENTE', 'PARCIAL'] },
      },
    });

    if (facturas.length !== dto.facturasIds.length) {
      throw new BadRequestException('Una o más facturas seleccionadas no son válidas o ya no tienen saldo pendiente.');
    }

    const capitalTotal = facturas.reduce((sum, f) => sum + Number(f.saldoPendiente), 0);
    if (capitalTotal <= 0) {
      throw new BadRequestException('El saldo pendiente total de las facturas seleccionadas debe ser mayor a cero.');
    }

    // Correr simulación con los parámetros configurados
    const simulacion = this.simularAmortizacion({
      montoCapital: capitalTotal,
      tasaInteresAnual: dto.tasaInteresAnual,
      porcentajeGastosAdmin: dto.porcentajeGastosAdmin,
      numeroCuotas: dto.numeroCuotas,
      frecuencia: dto.frecuencia,
      fechaPrimeraCuota: dto.fechaPrimeraCuota,
      metodoAmortizacion: dto.metodoAmortizacion || config.metodoAmortizacionDefault,
      aplicaIvaIntereses: config.aplicaIvaIntereses,
      aplicaIvaGastosAdmin: config.aplicaIvaGastosAdmin,
    });

    const numeroArreglo = await this.generarSiguienteNumeroArreglo(empresaId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear cabecera del Arreglo
      const arreglo = await tx.arregloPago.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId,
          clienteId: dto.clienteId,
          numeroArreglo,
          fechaEmision: new Date(),
          estado: 'SOLICITADO',
          moneda: 'NIO',
          tipoCambioEmision: tcInfo.tasa,
          capitalOriginal: capitalTotal,
          porcentajeGastosAdmin: dto.porcentajeGastosAdmin,
          montoGastosAdmin: simulacion.resumen.montoGastosAdmin,
          tasaInteresAnual: dto.tasaInteresAnual,
          montoTotalIntereses: simulacion.resumen.montoIntereses,
          montoTotalArreglo: simulacion.resumen.granTotalArreglo,
          saldoPendiente: simulacion.resumen.granTotalArreglo,
          numeroCuotas: dto.numeroCuotas,
          frecuencia: dto.frecuencia,
          fechaPrimeraCuota: new Date(dto.fechaPrimeraCuota.slice(0, 10)),
          metodoAmortizacion: dto.metodoAmortizacion || config.metodoAmortizacionDefault,
          penalidadIncumplimientoUsd: dto.penalidadIncumplimientoUsd || 0,
          solicitadoPorId: usuarioId,
          documentos: {
            create: facturas.map((f) => ({
              facturaId: f.id,
              saldoIncorporado: Number(f.saldoPendiente),
            })),
          },
          cuotas: {
            create: simulacion.tablaAmortizacion.map((c) => ({
              numeroCuota: c.numeroCuota,
              fechaVencimiento: new Date(c.fechaVencimiento),
              capital: c.capital,
              interes: c.interes,
              gastosAdmin: c.gastosAdmin,
              iva: c.iva,
              totalCuota: c.totalCuota,
              saldoCuota: c.totalCuota,
              estado: 'PENDIENTE',
            })),
          },
        },
        include: {
          documentos: true,
          cuotas: true,
        },
      });

      return arreglo;
    });
  }

  /**
   * Aprueba y formaliza un Arreglo de Pago.
   * Traslada las facturas originales a estado EN_ARREGLO (salen de la cartera ordinaria).
   */
  async aprobarArregloPago(empresaId: string, arregloId: string, usuarioId: string, rolesUsuario: string[]) {
    const config = await this.configService.getConfiguracion(empresaId);
    const rolRequerido = config.rolAprobacionArreglo || 'GERENTE';

    const tienePermiso = rolesUsuario.some((r) => ['ADMIN', 'SUPERADMIN', rolRequerido].includes(r));
    if (!tienePermiso) {
      throw new ForbiddenException(`Se requiere rol ${rolRequerido} o superior para autorizar y formalizar acuerdos de pago.`);
    }

    const arreglo = await this.prisma.arregloPago.findUnique({
      where: { id: arregloId },
      include: { documentos: true },
    });

    if (!arreglo) throw new NotFoundException('Arreglo de pago no encontrado');
    if (arreglo.estado === 'FORMALIZADO' || arreglo.estado === 'VIGENTE') {
      throw new BadRequestException('El arreglo ya se encuentra formalizado.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar facturas consolidadas a EN_ARREGLO
      for (const doc of arreglo.documentos) {
        if (doc.facturaId) {
          await tx.factura.update({
            where: { id: doc.facturaId },
            data: { estadoCxc: 'EN_ARREGLO' },
          });
        }
      }

      // 2. Formalizar arreglo
      const formalizado = await tx.arregloPago.update({
        where: { id: arregloId },
        data: {
          estado: 'FORMALIZADO',
          aprobadoPorId: usuarioId,
          fechaAprobacion: new Date(),
          fechaFormalizacion: new Date(),
        },
        include: {
          documentos: true,
          cuotas: true,
          cliente: true,
        },
      });

      return formalizado;
    });
  }

  /**
   * Aplica una penalidad por incumplimiento sobre un arreglo de pago (emitiendo Nota de Débito en C$).
   * Convierte la penalidad en USD pactada al TC BCN oficial del día.
   */
  async aplicarPenalidadArreglo(empresaId: string, arregloId: string, usuarioId: string) {
    const arreglo = await this.prisma.arregloPago.findUnique({
      where: { id: arregloId },
      include: { cliente: true },
    });

    if (!arreglo) throw new NotFoundException('Arreglo no encontrado');
    const penalidadUsd = Number(arreglo.penalidadIncumplimientoUsd);
    if (penalidadUsd <= 0) {
      throw new BadRequestException('Este arreglo de pago no tiene una penalidad por incumplimiento pactada.');
    }

    const tcInfo = await this.tipoCambioService.getTipoCambioHoy();
    const tasaBcn = tcInfo.tasa;
    const montoCordobas = Math.round(penalidadUsd * tasaBcn * 100) / 100;

    const anio = new Date().getFullYear();
    const numeroNota = `ND-PEN-${arreglo.numeroArreglo}-${String(Date.now()).slice(-4)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear Nota de Débito por la penalidad
      const nota = await tx.notaDebito.create({
        data: {
          empresaId,
          sucursalId: arreglo.sucursalId,
          clienteId: arreglo.clienteId,
          tipoNota: 'DEBITO',
          numeroNota,
          fechaEmision: new Date(),
          fechaVence: new Date(Date.now() + 15 * 86400000), // 15 días de plazo
          moneda: 'NIO',
          montoMonedaOrigen: penalidadUsd,
          tipoCambioEmision: tasaBcn,
          subtotal: montoCordobas,
          iva: 0,
          total: montoCordobas,
          saldoPendiente: montoCordobas,
          condicionPago: 'CREDITO',
          estado: 'PENDIENTE',
          origen: 'PENALIDAD_ARREGLO',
          concepto: `Penalidad por incumplimiento de acuerdo ${arreglo.numeroArreglo} ($ ${penalidadUsd} USD @ TC ${tasaBcn})`,
        },
      });

      // 2. Marcar arreglo como incumplido
      await tx.arregloPago.update({
        where: { id: arregloId },
        data: { estado: 'INCUMPLIDO' },
      });

      return { nota, montoCordobas, tasaBcn, penalidadUsd };
    });
  }

  /**
   * Anula un acuerdo de pago: restaura las facturas a estado pendiente y anula las cuotas.
   */
  async anularArregloPago(empresaId: string, arregloId: string, motivo: string) {
    const arreglo = await this.prisma.arregloPago.findUnique({
      where: { id: arregloId },
      include: {
        documentos: true,
        cuotas: true,
      },
    });

    if (!arreglo) throw new NotFoundException('Arreglo no encontrado');
    if (arreglo.estado === 'ANULADO') throw new BadRequestException('El acuerdo ya se encuentra anulado.');

    return this.prisma.$transaction(async (tx) => {
      // Restaurar estado PENDIENTE en facturas consolidadas
      for (const doc of arreglo.documentos) {
        if (doc.facturaId) {
          await tx.factura.update({
            where: { id: doc.facturaId },
            data: { estadoCxc: 'PENDIENTE' },
          });
        }
      }

      // Marcar cuotas como anuladas / vencidas
      await tx.arregloPagoCuota.updateMany({
        where: { arregloId },
        data: { estado: 'VENCIDA' },
      });

      // Anular acuerdo
      return tx.arregloPago.update({
        where: { id: arregloId },
        data: {
          estado: 'ANULADO',
          motivoAnulacion: motivo,
        },
      });
    });
  }

  async listarArreglos(
    empresaId: string,
    filtrosOrSucursalId?: string | { sucursalId?: string; clienteId?: string; estado?: any },
    clienteId?: string,
  ) {
    const where: any = { empresaId };
    if (typeof filtrosOrSucursalId === 'string') {
      if (filtrosOrSucursalId) where.sucursalId = filtrosOrSucursalId;
      if (clienteId) where.clienteId = clienteId;
    } else if (filtrosOrSucursalId && typeof filtrosOrSucursalId === 'object') {
      if (filtrosOrSucursalId.sucursalId) where.sucursalId = filtrosOrSucursalId.sucursalId;
      if (filtrosOrSucursalId.clienteId) where.clienteId = filtrosOrSucursalId.clienteId;
      if (filtrosOrSucursalId.estado) where.estado = filtrosOrSucursalId.estado;
    }

    return this.prisma.arregloPago.findMany({
      where,
      include: {
        cliente: true,
        sucursal: true,
        cuotas: { orderBy: { numeroCuota: 'asc' } },
        documentos: { include: { factura: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArregloPorId(id: string) {
    const arreglo = await this.prisma.arregloPago.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        empresa: true,
        solicitadoPor: { select: { nombre: true, apellido: true } },
        aprobadoPor: { select: { nombre: true, apellido: true } },
        cuotas: { orderBy: { numeroCuota: 'asc' } },
        documentos: {
          include: {
            factura: true,
            notaDebito: true,
          },
        },
      },
    });

    if (!arreglo) throw new NotFoundException('Arreglo de pago no encontrado');
    return arreglo;
  }

  async obtenerArregloPorId(empresaId: string, id: string) {
    return this.getArregloPorId(id);
  }

  async simularArreglo(empresaId: string, dto: SimularArregloDto) {
    const config = await this.configService.getConfiguracion(empresaId);
    return this.simularAmortizacion({
      ...dto,
      aplicaIvaIntereses: dto.aplicaIvaIntereses !== undefined ? dto.aplicaIvaIntereses : config.aplicaIvaIntereses,
      aplicaIvaGastosAdmin: dto.aplicaIvaGastosAdmin !== undefined ? dto.aplicaIvaGastosAdmin : config.aplicaIvaGastosAdmin,
      metodoAmortizacion: dto.metodoAmortizacion || config.metodoAmortizacionDefault,
    });
  }

  async formalizarArreglo(empresaId: string, dto: CreateArregloPagoDto, usuarioId: string) {
    const arregloSolicitado = await this.solicitarArregloPago(empresaId, usuarioId, dto);
    return this.aprobarArregloPago(empresaId, arregloSolicitado.id, usuarioId, ['ADMIN', 'GERENTE']);
  }

  async anularArreglo(empresaId: string, id: string, motivo: string, usuarioId?: string) {
    return this.anularArregloPago(empresaId, id, motivo);
  }

  async aplicarPenalidadIncumplimiento(empresaId: string, id: string, usuarioId: string) {
    return this.aplicarPenalidadArreglo(empresaId, id, usuarioId);
  }
}
