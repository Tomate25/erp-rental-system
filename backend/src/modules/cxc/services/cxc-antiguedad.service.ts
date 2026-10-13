import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EstadoFactura, EstadoCxcFactura } from '@prisma/client';
import { roundMoney } from '../../../common/utils/financial-calculator';
import { AntiguedadFiltrosDto } from '../dto/cxc-query.dto';
import { TipoCambioService } from './tipo-cambio.service';
import { CxcConfiguracionService } from './cxc-configuracion.service';

export interface TramoConfig {
  id: string;
  nombre: string;
  min: number;
  max: number;
}

export interface DocumentoCarteraItem {
  id: string;
  tipoDocumento: 'FACTURA' | 'NOTA_DEBITO' | 'CUOTA_ARREGLO';
  folio: string;
  clienteId: string;
  clienteNombre: string;
  clienteRuc: string;
  fechaEmision: Date;
  fechaVence: Date;
  monedaOriginal: string;
  montoOriginal: number;
  tipoCambioEmision: number;
  saldoPendienteCordobas: number;
  saldoPendienteVisualizado: number;
  diasMora: number;
  tramoId: string;
  tramoNombre: string;
  estado: string;
  vendedorNombre?: string;
  sucursalNombre?: string;
}

export interface ClienteCarteraGroup {
  clienteId: string;
  clienteNombre: string;
  clienteRuc: string;
  tipoCliente?: string;
  vendedorNombre?: string;
  limiteCredito?: number;
  totalDocumentos: number;
  saldoTotalCordobas: number;
  saldoTotalVisualizado: number;
  tramos: Record<string, number>; // Monto por cada tramo en la moneda de visualización
  porcentajeTotal: number;
  documentos: DocumentoCarteraItem[];
}

export interface KpiTramoItem {
  tramoId: string;
  nombre: string;
  min: number;
  max: number;
  montoCordobas: number;
  montoVisualizado: number;
  porcentaje: number;
  cantidadDocumentos: number;
}

@Injectable()
export class CxcAntiguedadService {
  private readonly logger = new Logger(CxcAntiguedadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoCambioService: TipoCambioService,
    private readonly configService: CxcConfiguracionService
  ) {}

  async getAntiguedadCartera(empresaId: string, filtros: AntiguedadFiltrosDto) {
    const config = await this.configService.getConfiguracion(empresaId);
    const tcHoyInfo = await this.tipoCambioService.getTipoCambioHoy(filtros.fechaCorte);
    const tasaBcn = tcHoyInfo.tasa;

    const tramos: TramoConfig[] = Array.isArray(config.tramosAntiguedadJson)
      ? (config.tramosAntiguedadJson as any)
      : [
          { id: 'corriente', nombre: 'Corriente', min: 0, max: 0 },
          { id: '1_30', nombre: '1-30 días', min: 1, max: 30 },
          { id: '31_60', nombre: '31-60 días', min: 31, max: 60 },
          { id: '61_90', nombre: '61-90 días', min: 61, max: 90 },
          { id: '90_mas', nombre: 'Más de 90 días', min: 91, max: 99999 },
        ];

    const fechaCorteDate = filtros.fechaCorte
      ? new Date(`${filtros.fechaCorte}T23:59:59.999Z`)
      : new Date();

    const criterioFecha = filtros.criterioFecha || 'VENCIMIENTO';
    const monedaVis = filtros.monedaVisualizacion || 'NIO';

    // 1. Consultar Facturas a Crédito
    const whereFactura: any = {
      empresaId,
      condicionPago: 'CREDITO',
      estado: { notIn: [EstadoFactura.PAGADA, EstadoFactura.CANCELADA] },
      estadoCxc: {
        notIn: [
          EstadoCxcFactura.NO_APLICA,
          EstadoCxcFactura.ANULADA,
          EstadoCxcFactura.EN_ARREGLO,
          EstadoCxcFactura.PAGADA,
        ],
      },
      saldoPendiente: { gt: 0.01 },
      fechaEmision: { lte: fechaCorteDate },
    };

    if (filtros.sucursalId) whereFactura.sucursalId = filtros.sucursalId;
    if (filtros.vendedorId) whereFactura.vendedorId = filtros.vendedorId;
    if (filtros.clienteId) whereFactura.clienteId = filtros.clienteId;
    if (filtros.tipoCliente) whereFactura.cliente = { tipoCliente: filtros.tipoCliente };
    if (filtros.monedaOriginal && filtros.monedaOriginal !== 'TODAS') {
      whereFactura.moneda = filtros.monedaOriginal;
    }

    const facturas = await this.prisma.factura.findMany({
      where: whereFactura,
      include: {
        cliente: true,
        sucursal: true,
        vendedor: { include: { usuario: true } },
        pagos: true,
        reciboAplicaciones: true,
      },
      orderBy: { fechaVence: 'asc' },
    });

    // 2. Consultar Notas de Débito a Crédito
    const whereNota: any = {
      empresaId,
      tipoNota: 'DEBITO',
      condicionPago: 'CREDITO',
      estado: { in: ['PENDIENTE', 'PARCIAL'] },
      saldoPendiente: { gt: 0 },
      fechaEmision: { lte: fechaCorteDate },
    };

    if (filtros.sucursalId) whereNota.sucursalId = filtros.sucursalId;
    if (filtros.clienteId) whereNota.clienteId = filtros.clienteId;
    if (filtros.tipoCliente) whereNota.cliente = { tipoCliente: filtros.tipoCliente };
    if (filtros.monedaOriginal && filtros.monedaOriginal !== 'TODAS') {
      whereNota.moneda = filtros.monedaOriginal;
    }

    const notasDebito = await this.prisma.notaDebito.findMany({
      where: whereNota,
      include: {
        cliente: true,
        sucursal: true,
      },
      orderBy: { fechaVence: 'asc' },
    });

    // 3. Consultar Cuotas de Arreglos de Pago (ARR)
    const whereArreglos: any = {
      empresaId,
      estado: { in: ['FORMALIZADO', 'VIGENTE', 'INCUMPLIDO'] },
    };
    if (filtros.sucursalId) whereArreglos.sucursalId = filtros.sucursalId;
    if (filtros.clienteId) whereArreglos.clienteId = filtros.clienteId;
    if (filtros.tipoCliente) whereArreglos.cliente = { tipoCliente: filtros.tipoCliente };

    const arreglos = await this.prisma.arregloPago.findMany({
      where: whereArreglos,
      include: {
        cliente: true,
        sucursal: true,
        cuotas: {
          where: {
            saldoCuota: { gt: 0 },
            estado: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDA'] },
          },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
    });

    // Consolidar todos los documentos analíticos de cartera
    const todosDocumentos: DocumentoCarteraItem[] = [];

    // Helper para clasificar tramo
    const clasificarTramo = (diasMora: number): TramoConfig => {
      if (diasMora <= 0) {
        return tramos.find((t) => t.min === 0 && t.max === 0) || tramos[0];
      }
      const match = tramos.find((t) => diasMora >= t.min && diasMora <= t.max);
      return match || tramos[tramos.length - 1];
    };

    // Helper para calcular días de mora
    const calcularDiasMora = (fechaBase: Date): number => {
      const diffMs = fechaCorteDate.getTime() - new Date(fechaBase).getTime();
      const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return dias > 0 ? dias : 0;
    };

    // Procesar facturas
    for (const f of facturas) {
      const totalPagos = (f.pagos || []).reduce((sum: number, p: any) => sum + Number(p.monto), 0);
      const totalRecibos = (f.reciboAplicaciones || []).reduce(
        (sum: number, r: any) =>
          sum +
          Number(r.montoCapitalAplicado || 0) +
          Number(r.montoRetencionIrAplicado || 0) +
          Number(r.montoRetencionImiAplicado || 0),
        0,
      );
      const maxAbonado = Math.max(
        totalPagos,
        totalRecibos,
        roundMoney(Number(f.total) - Number(f.saldoPendiente)),
      );
      const saldoCalculado = roundMoney(Math.max(0, Number(f.total) - maxAbonado));
      const saldoC$ = Math.min(Number(f.saldoPendiente), saldoCalculado);

      // Si la factura está pagada, su saldo pendiente es 0 o su estado es PAGADA, se excluye de cartera pendiente
      if (
        f.estado === EstadoFactura.PAGADA ||
        f.estadoCxc === EstadoCxcFactura.PAGADA ||
        saldoC$ <= 0.01 ||
        Number(f.saldoPendiente) <= 0.01
      ) {
        continue;
      }

      const fechaComparar = criterioFecha === 'VENCIMIENTO' ? f.fechaVence : f.fechaEmision;
      const diasMora = calcularDiasMora(fechaComparar);
      const tramo = clasificarTramo(diasMora);
      const saldoVis = monedaVis === 'USD'
        ? (f.moneda === 'USD' ? Number(f.montoMonedaOrigen) : Math.round((saldoC$ / tasaBcn) * 100) / 100)
        : (f.moneda === 'USD' ? Math.round(Number(f.montoMonedaOrigen) * tasaBcn * 100) / 100 : saldoC$);

      todosDocumentos.push({
        id: f.id,
        tipoDocumento: 'FACTURA',
        folio: f.folio,
        clienteId: f.clienteId,
        clienteNombre: f.cliente.nombre,
        clienteRuc: f.cliente.rfc || f.cliente.cedula || 'Sin RUC',
        fechaEmision: f.fechaEmision,
        fechaVence: f.fechaVence,
        monedaOriginal: f.moneda,
        montoOriginal: Number(f.montoMonedaOrigen) || Number(f.total),
        tipoCambioEmision: Number(f.tipoCambioEmision) || 1.0,
        saldoPendienteCordobas: saldoC$,
        saldoPendienteVisualizado: saldoVis,
        diasMora,
        tramoId: tramo.id,
        tramoNombre: tramo.nombre,
        estado: f.estadoCxc,
        vendedorNombre: f.vendedor?.usuario ? `${f.vendedor.usuario.nombre} ${f.vendedor.usuario.apellido}` : undefined,
        sucursalNombre: f.sucursal?.nombre,
      });
    }

    // Procesar notas de débito
    for (const nd of notasDebito) {
      const saldoC$ = Number(nd.saldoPendiente);
      if (nd.estado === 'PAGADA' || saldoC$ <= 0.01) {
        continue;
      }
      const fechaComparar = criterioFecha === 'VENCIMIENTO' ? nd.fechaVence : nd.fechaEmision;
      const diasMora = calcularDiasMora(fechaComparar);
      const tramo = clasificarTramo(diasMora);
      const saldoVis = monedaVis === 'USD'
        ? (nd.moneda === 'USD' ? Number(nd.montoMonedaOrigen) : Math.round((saldoC$ / tasaBcn) * 100) / 100)
        : (nd.moneda === 'USD' ? Math.round(Number(nd.montoMonedaOrigen) * tasaBcn * 100) / 100 : saldoC$);

      todosDocumentos.push({
        id: nd.id,
        tipoDocumento: 'NOTA_DEBITO',
        folio: nd.numeroNota,
        clienteId: nd.clienteId,
        clienteNombre: nd.cliente.nombre,
        clienteRuc: nd.cliente.rfc || nd.cliente.cedula || 'Sin RUC',
        fechaEmision: nd.fechaEmision,
        fechaVence: nd.fechaVence,
        monedaOriginal: nd.moneda,
        montoOriginal: Number(nd.montoMonedaOrigen) || Number(nd.total),
        tipoCambioEmision: Number(nd.tipoCambioEmision) || 1.0,
        saldoPendienteCordobas: saldoC$,
        saldoPendienteVisualizado: saldoVis,
        diasMora,
        tramoId: tramo.id,
        tramoNombre: tramo.nombre,
        estado: nd.estado,
        sucursalNombre: nd.sucursal?.nombre,
      });
    }

    // Procesar cuotas de arreglos de pago
    for (const arr of arreglos) {
      for (const cuota of arr.cuotas) {
        const saldoC$ = Number(cuota.saldoCuota);
        if (cuota.estado === 'PAGADA' || saldoC$ <= 0.01) {
          continue;
        }
        const fechaVenceDate = new Date(cuota.fechaVencimiento);
        const diasMora = calcularDiasMora(fechaVenceDate);
        const tramo = clasificarTramo(diasMora);
        const saldoVis = monedaVis === 'USD'
          ? Math.round((saldoC$ / tasaBcn) * 100) / 100
          : saldoC$;

        todosDocumentos.push({
          id: cuota.id,
          tipoDocumento: 'CUOTA_ARREGLO',
          folio: `${arr.numeroArreglo} (Cuota ${cuota.numeroCuota}/${arr.numeroCuotas})`,
          clienteId: arr.clienteId,
          clienteNombre: arr.cliente.nombre,
          clienteRuc: arr.cliente.rfc || arr.cliente.cedula || 'Sin RUC',
          fechaEmision: arr.fechaEmision,
          fechaVence: fechaVenceDate,
          monedaOriginal: arr.moneda,
          montoOriginal: Number(cuota.totalCuota),
          tipoCambioEmision: Number(arr.tipoCambioEmision) || 1.0,
          saldoPendienteCordobas: saldoC$,
          saldoPendienteVisualizado: saldoVis,
          diasMora,
          tramoId: tramo.id,
          tramoNombre: tramo.nombre,
          estado: cuota.estado,
          sucursalNombre: arr.sucursal?.nombre,
        });
      }
    }

    // 4. Agrupación analítica por cliente
    const clientesMap = new Map<string, ClienteCarteraGroup>();
    let granTotalCordobas = 0;
    let granTotalVisualizado = 0;

    for (const doc of todosDocumentos) {
      granTotalCordobas += doc.saldoPendienteCordobas;
      granTotalVisualizado += doc.saldoPendienteVisualizado;

      if (!clientesMap.has(doc.clienteId)) {
        const tramosInit: Record<string, number> = {};
        tramos.forEach((t) => (tramosInit[t.id] = 0));

        clientesMap.set(doc.clienteId, {
          clienteId: doc.clienteId,
          clienteNombre: doc.clienteNombre,
          clienteRuc: doc.clienteRuc,
          totalDocumentos: 0,
          saldoTotalCordobas: 0,
          saldoTotalVisualizado: 0,
          tramos: tramosInit,
          porcentajeTotal: 0,
          documentos: [],
        });
      }

      const cl = clientesMap.get(doc.clienteId)!;
      cl.totalDocumentos += 1;
      cl.saldoTotalCordobas += doc.saldoPendienteCordobas;
      cl.saldoTotalVisualizado += doc.saldoPendienteVisualizado;
      cl.tramos[doc.tramoId] = (cl.tramos[doc.tramoId] || 0) + doc.saldoPendienteVisualizado;
      cl.documentos.push(doc);
    }

    // Calcular porcentajes por cliente
    const clientesLista = Array.from(clientesMap.values()).map((cl) => {
      cl.porcentajeTotal = granTotalVisualizado > 0
        ? Math.round((cl.saldoTotalVisualizado / granTotalVisualizado) * 10000) / 100
        : 0;
      return cl;
    });

    // Ordenar clientes de mayor saldo a menor
    clientesLista.sort((a, b) => b.saldoTotalVisualizado - a.saldoTotalVisualizado);

    // 5. Construcción de Tarjetas KPI por tramo
    const kpisMap = new Map<string, KpiTramoItem>();
    tramos.forEach((t) => {
      kpisMap.set(t.id, {
        tramoId: t.id,
        nombre: t.nombre,
        min: t.min,
        max: t.max,
        montoCordobas: 0,
        montoVisualizado: 0,
        porcentaje: 0,
        cantidadDocumentos: 0,
      });
    });

    for (const doc of todosDocumentos) {
      const kpi = kpisMap.get(doc.tramoId);
      if (kpi) {
        kpi.montoCordobas += doc.saldoPendienteCordobas;
        kpi.montoVisualizado += doc.saldoPendienteVisualizado;
        kpi.cantidadDocumentos += 1;
      }
    }

    const kpisLista = Array.from(kpisMap.values()).map((k) => {
      k.porcentaje = granTotalVisualizado > 0
        ? Math.round((k.montoVisualizado / granTotalVisualizado) * 10000) / 100
        : 0;
      k.montoCordobas = Math.round(k.montoCordobas * 100) / 100;
      k.montoVisualizado = Math.round(k.montoVisualizado * 100) / 100;
      return k;
    });

    return {
      parametrosActivos: {
        empresaId,
        sucursalId: filtros.sucursalId || 'TODAS',
        vendedorId: filtros.vendedorId || 'TODOS',
        tipoCliente: filtros.tipoCliente || 'TODOS',
        monedaOriginal: filtros.monedaOriginal || 'TODAS',
        monedaVisualizacion: monedaVis,
        fechaCorte: fechaCorteDate.toISOString().slice(0, 10),
        criterioFecha,
        tipoCambioBcn: tasaBcn,
        avisoFaltaTasaBcn: tcHoyInfo.avisoFaltaTasa,
      },
      resumenGlobal: {
        totalCarteraCordobas: Math.round(granTotalCordobas * 100) / 100,
        totalCarteraVisualizada: Math.round(granTotalVisualizado * 100) / 100,
        totalClientes: clientesLista.length,
        totalDocumentos: todosDocumentos.length,
      },
      tramosDefinidos: tramos,
      kpisPorTramo: kpisLista,
      clientes: clientesLista,
    };
  }

  async obtenerAntiguedadSaldos(empresaId: string, filtros: AntiguedadFiltrosDto) {
    return this.getAntiguedadCartera(empresaId, filtros);
  }
}
