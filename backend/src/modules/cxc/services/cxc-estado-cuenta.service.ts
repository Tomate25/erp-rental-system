import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TipoCambioService } from './tipo-cambio.service';

export interface MovimientoEstadoCuenta {
  id: string;
  fecha: Date;
  tipoMovimiento: 'FACTURA' | 'NOTA_DEBITO' | 'RECIBO_CAJA' | 'ANTICIPO' | 'ARREGLO_PAGO';
  numeroDocumento: string;
  concepto: string;
  moneda: string;
  montoOriginal: number;
  tipoCambio: number;
  cargo: number;      // Aumento de deuda (Factura, Nota Débito) en C$
  abono: number;      // Disminución de deuda (Recibo Caja, Retenciones) en C$
  retenciones: number;
  saldoAcumulado: number;
  estado: string;
}

@Injectable()
export class CxcEstadoCuentaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoCambioService: TipoCambioService
  ) {}

  async getEstadoCuentaCliente(
    empresaId: string,
    clienteId: string,
    fechaDesde?: string,
    fechaHasta?: string,
    monedaVisualizacion: 'NIO' | 'USD' = 'NIO'
  ) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        empresa: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const tcInfo = await this.tipoCambioService.getTipoCambioHoy();
    const tasaBcn = tcInfo.tasa;

    // 1. Facturas a Crédito
    const facturas = await this.prisma.factura.findMany({
      where: {
        clienteId,
        condicionPago: 'CREDITO',
        estadoCxc: { not: 'ANULADA' },
      },
      orderBy: { fechaEmision: 'asc' },
    });

    // 2. Notas de Débito
    const notasDebito = await this.prisma.notaDebito.findMany({
      where: {
        clienteId,
        estado: { not: 'ANULADA' },
      },
      orderBy: { fechaEmision: 'asc' },
    });

    // 3. Recibos de Caja Emitidos
    const recibos = await this.prisma.reciboCaja.findMany({
      where: {
        clienteId,
        estado: 'EMITIDO',
      },
      include: {
        aplicaciones: true,
      },
      orderBy: { fechaRecibo: 'asc' },
    });

    // 4. Consolidar Movimientos cronológicos
    const movimientosRaw: Array<{
      id: string;
      fecha: Date;
      tipoMovimiento: 'FACTURA' | 'NOTA_DEBITO' | 'RECIBO_CAJA' | 'ANTICIPO' | 'ARREGLO_PAGO';
      numeroDocumento: string;
      concepto: string;
      moneda: string;
      montoOriginal: number;
      tipoCambio: number;
      cargo: number;
      abono: number;
      retenciones: number;
      estado: string;
    }> = [];

    facturas.forEach((f) => {
      const totalC$ = Number(f.total);
      movimientosRaw.push({
        id: f.id,
        fecha: f.fechaEmision,
        tipoMovimiento: 'FACTURA',
        numeroDocumento: f.folio,
        concepto: `Factura a Crédito ${f.folio}`,
        moneda: f.moneda,
        montoOriginal: Number(f.montoMonedaOrigen) || totalC$,
        tipoCambio: Number(f.tipoCambioEmision) || 1.0,
        cargo: totalC$,
        abono: 0,
        retenciones: 0,
        estado: f.estadoCxc,
      });
    });

    notasDebito.forEach((nd) => {
      const totalC$ = Number(nd.total);
      movimientosRaw.push({
        id: nd.id,
        fecha: nd.fechaEmision,
        tipoMovimiento: 'NOTA_DEBITO',
        numeroDocumento: nd.numeroNota,
        concepto: `Nota de Débito ${nd.numeroNota}: ${nd.concepto}`,
        moneda: nd.moneda,
        montoOriginal: Number(nd.montoMonedaOrigen) || totalC$,
        tipoCambio: Number(nd.tipoCambioEmision) || 1.0,
        cargo: totalC$,
        abono: 0,
        retenciones: 0,
        estado: nd.estado,
      });
    });

    recibos.forEach((rc) => {
      const retTotal = Number(rc.montoRetencionIr) + Number(rc.montoRetencionImi) + Number(rc.otrasRetenciones);
      const abonoTotal = Number(rc.totalLiquidado);
      movimientosRaw.push({
        id: rc.id,
        fecha: new Date(rc.fechaRecibo),
        tipoMovimiento: 'RECIBO_CAJA',
        numeroDocumento: rc.numeroRecibo,
        concepto: `Recibo de Caja ${rc.numeroRecibo}: ${rc.concepto}`,
        moneda: rc.moneda,
        montoOriginal: Number(rc.totalLiquidado),
        tipoCambio: Number(rc.tipoCambioBcn) || 1.0,
        cargo: 0,
        abono: abonoTotal,
        retenciones: retTotal,
        estado: rc.estado,
      });
    });

    // Ordenar cronológicamente por fecha
    movimientosRaw.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Calcular saldo acumulado paso a paso
    let saldoAcumuladoC$ = 0;
    const movimientos: MovimientoEstadoCuenta[] = [];

    for (const mov of movimientosRaw) {
      saldoAcumuladoC$ += mov.cargo - mov.abono;

      // Filtrar por fechas si aplica
      const fechaIso = new Date(mov.fecha).toISOString().slice(0, 10);
      if (fechaDesde && fechaIso < fechaDesde) continue;
      if (fechaHasta && fechaIso > fechaHasta) continue;

      const cargoVis = monedaVisualizacion === 'USD' ? Math.round((mov.cargo / tasaBcn) * 100) / 100 : mov.cargo;
      const abonoVis = monedaVisualizacion === 'USD' ? Math.round((mov.abono / tasaBcn) * 100) / 100 : mov.abono;
      const retVis = monedaVisualizacion === 'USD' ? Math.round((mov.retenciones / tasaBcn) * 100) / 100 : mov.retenciones;
      const saldoVis = monedaVisualizacion === 'USD' ? Math.round((saldoAcumuladoC$ / tasaBcn) * 100) / 100 : saldoAcumuladoC$;

      movimientos.push({
        id: mov.id,
        fecha: mov.fecha,
        tipoMovimiento: mov.tipoMovimiento,
        numeroDocumento: mov.numeroDocumento,
        concepto: mov.concepto,
        moneda: mov.moneda,
        montoOriginal: mov.montoOriginal,
        tipoCambio: mov.tipoCambio,
        cargo: cargoVis,
        abono: abonoVis,
        retenciones: retVis,
        saldoAcumulado: Math.round(saldoVis * 100) / 100,
        estado: mov.estado,
      });
    }

    // Totales
    const totalCargosC$ = movimientosRaw.reduce((s, m) => s + m.cargo, 0);
    const totalAbonosC$ = movimientosRaw.reduce((s, m) => s + m.abono, 0);
    const saldoActualC$ = Math.max(0, totalCargosC$ - totalAbonosC$);

    return {
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        razonSocial: cliente.razonSocial,
        rfc: cliente.rfc || cliente.cedula || 'Sin RUC',
        limiteCredito: cliente.limiteCredito ? Number(cliente.limiteCredito) : null,
        diasCredito: cliente.diasCreditoPactados || 30,
        esRetenedor: cliente.esRetenedor,
        direccion: cliente.direccion,
        telefono: cliente.telefono || cliente.telClaro || cliente.telMovistar,
        email: cliente.emailFacturacion,
      },
      empresa: {
        nombre: cliente.empresa.nombre,
        rfc: cliente.empresa.rfc,
        direccion: cliente.empresa.direccion,
        telefono: cliente.empresa.telefono,
      },
      resumen: {
        saldoActualCordobas: Math.round(saldoActualC$ * 100) / 100,
        saldoActualVisualizado: monedaVisualizacion === 'USD' ? Math.round((saldoActualC$ / tasaBcn) * 100) / 100 : Math.round(saldoActualC$ * 100) / 100,
        totalCargos: Math.round(totalCargosC$ * 100) / 100,
        totalAbonos: Math.round(totalAbonosC$ * 100) / 100,
        monedaVisualizacion,
        tipoCambioBcn: tasaBcn,
      },
      movimientos,
    };
  }

  async obtenerEstadoCuenta(
    empresaId: string,
    clienteId: string,
    monedaVisualizacion: 'NIO' | 'USD' = 'NIO',
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    return this.getEstadoCuentaCliente(empresaId, clienteId, fechaDesde, fechaHasta, monedaVisualizacion);
  }
}
