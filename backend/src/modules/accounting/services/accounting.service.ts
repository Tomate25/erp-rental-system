import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Cuentas por Cobrar (CxC)
  async getCuentasPorCobrar(empresaId?: string) {
    const whereInvoice: any = empresaId
      ? {
          OR: [{ empresaId }, { cliente: { empresaId } }]
        }
      : {};

    const facturas = await this.prisma.factura.findMany({
      where: whereInvoice,
      include: {
        cliente: true,
        contrato: { include: { cliente: true } },
        cotizacion: { include: { cliente: true } },
        corte: true,
        pagos: true
      },
      orderBy: { fechaVence: 'asc' }
    });

    const now = new Date();

    // Agrupar por Cliente
    const cxcPorClienteMap = new Map<string, any>();
    let totalFacturado = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;
    let totalVencido = 0;

    for (const f of facturas) {
      const montoPagadoReal = f.pagos && f.pagos.length > 0 ? f.pagos.reduce((sum, p) => sum + p.monto, 0) : 0;
      
      // Si la factura es a crédito o no tiene pago registrado en la tabla Pago, se calcula el cobrado real estrictamente por los pagos registrados.
      let cobradoReal = montoPagadoReal;
      if (f.estado === 'PAGADA' && montoPagadoReal === 0 && f.condicionPago === 'CONTADO' && !f.corteId) {
        cobradoReal = f.total;
      }

      const saldoPendiente = Math.max(0, f.total - cobradoReal);
      const esPagada = saldoPendiente <= 0;
      const esVencida = saldoPendiente > 0 && new Date(f.fechaVence) < now;

      totalFacturado += f.total;
      totalCobrado += cobradoReal;
      totalPendiente += saldoPendiente;
      if (esVencida) totalVencido += saldoPendiente;

      const clienteId = f.clienteId || f.contrato?.clienteId || f.cotizacion?.clienteId || 'general';
      if (!cxcPorClienteMap.has(clienteId)) {
        cxcPorClienteMap.set(clienteId, {
          clienteId,
          clienteNombre: f.cliente?.nombre || f.contrato?.cliente?.nombre || f.cotizacion?.cliente?.nombre || 'Cliente General',
          clienteRuc: f.cliente?.rfc || f.cliente?.cedula || 'N/A',
          totalFacturas: 0,
          totalMonto: 0,
          totalPagado: 0,
          saldoPendiente: 0,
          vencido: 0,
          facturas: []
        });
      }

      const clientEntry = cxcPorClienteMap.get(clienteId);
      clientEntry.totalFacturas += 1;
      clientEntry.totalMonto += f.total;
      clientEntry.totalPagado += cobradoReal;
      clientEntry.saldoPendiente += saldoPendiente;
      if (esVencida) clientEntry.vencido += saldoPendiente;

      clientEntry.facturas.push({
        id: f.id,
        folio: f.folio,
        origen: f.corteId ? `Corte #${f.corteNumero || 1} (Contrato)` : f.cotizacion ? `Cotización ${f.cotizacion.numeroCotizacion}` : 'Factura Estándar',
        fechaEmision: f.fechaEmision,
        fechaVence: f.fechaVence,
        total: f.total,
        montoPagado: cobradoReal,
        saldoPendiente,
        estado: esPagada ? 'PAGADA' : (esVencida ? 'VENCIDA' : 'PENDIENTE'),
        esVencida
      });
    }

    return {
      resumenGlobal: {
        totalFacturado,
        totalCobrado,
        totalPendiente,
        totalVencido
      },
      clientes: Array.from(cxcPorClienteMap.values())
    };
  }

  // 2. Cuentas por Pagar (CxP)
  async getCuentasPorPagar(empresaId?: string) {
    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: empresaId ? { equipo: { sucursal: { empresaId } } } : {},
      include: {
        equipo: {
          include: { marca: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalGastosMantenimiento = 0;
    let totalPendientePago = 0;

    const itemsCxP = mantenimientos.map(m => {
      totalGastosMantenimiento += m.costo;
      const esPendiente = m.estado !== 'COMPLETADO';
      if (esPendiente) totalPendientePago += m.costo;

      return {
        id: m.id,
        concepto: `Mantenimiento ${m.tipo} - ${m.equipo.modelo} (${m.equipo.marca?.nombre || 'General'})`,
        equipoModelo: m.equipo.modelo,
        tipo: m.tipo,
        costo: m.costo,
        insumos: m.insumosUtilizados || 'Mano de Obra y Repuestos',
        fechaProgramada: m.fechaProgramacion,
        estado: m.estado
      };
    });

    return {
      resumenGlobal: {
        totalGastosMantenimiento,
        totalPendientePago,
        totalPagado: totalGastosMantenimiento - totalPendientePago
      },
      cuentasPorPagar: itemsCxP
    };
  }

  // 3. Estado de Resultados (P&L - Pérdidas y Ganancias)
  async getEstadoResultados(empresaId?: string) {
    // A. Ingresos por Alquiler (Facturación Total Emitida)
    const facturas = await this.prisma.factura.findMany({
      where: empresaId ? { OR: [{ empresaId }, { cliente: { empresaId } }] } : {}
    });

    const ingresosAlquiler = facturas.reduce((sum, f) => sum + f.total, 0);
    const subtotalIngresos = facturas.reduce((sum, f) => sum + f.subtotal, 0);
    const ivaRecaudado = facturas.reduce((sum, f) => sum + f.iva, 0);

    // B. Costos Operativos y Mantenimiento de Maquinaria
    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: empresaId ? { equipo: { sucursal: { empresaId } } } : {}
    });

    const costoMantenimiento = mantenimientos.reduce((sum, m) => sum + m.costo, 0);

    // C. Cargos por Daños Evaluados en Retorno
    const inspeccionesDanio = await this.prisma.inspeccionDano.findMany();
    const ingresosPorDanio = inspeccionesDanio.reduce((sum: number, d: any) => sum + (d.cobrable ? d.costoEstimado : 0), 0);

    const ingresosTotalesBrutos = ingresosAlquiler + ingresosPorDanio;
    const utilidadBruta = ingresosTotalesBrutos - costoMantenimiento;

    // Gastos Operativos Generales Estimados (10% de administración y servicios)
    const gastosAdministrativos = Math.round(ingresosAlquiler * 0.10 * 100) / 100;
    const utilidadNeta = utilidadBruta - gastosAdministrativos;

    return {
      periodo: 'Ejercicio Fiscal Actual',
      ingresos: {
        facturacionAlquiler: ingresosAlquiler,
        subtotalSinIva: subtotalIngresos,
        ivaRecaudado,
        cargosPorDanio: ingresosPorDanio,
        totalIngresosBrutos: ingresosTotalesBrutos
      },
      costosOperativos: {
        mantenimientoYRepuestos: costoMantenimiento,
        gastosAdministrativos,
        totalCostosYGastos: costoMantenimiento + gastosAdministrativos
      },
      indicadoresFinancieros: {
        utilidadBruta,
        utilidadNeta,
        margenUtilidadNetaPorcentaje: ingresosTotalesBrutos > 0 ? Math.round((utilidadNeta / ingresosTotalesBrutos) * 10000) / 100 : 0
      }
    };
  }

  // 4. Balance General (Estado de Situación Financiera)
  async getBalanceGeneral(empresaId?: string) {
    // ACTIVOS
    // 1. Efectivo y Bancos (Pagos reales recibidos)
    const pagos = await this.prisma.pago.findMany();
    const efectivoBancos = pagos.reduce((sum, p) => sum + p.monto, 0);

    // 2. Cuentas por Cobrar (Facturas Pendientes)
    const cxc = await this.getCuentasPorCobrar(empresaId);
    const cuentasPorCobrar = cxc.resumenGlobal.totalPendiente;

    // 3. Depósitos en Garantía Custodiados
    const contratos = await this.prisma.contrato.findMany({
      where: empresaId ? { sucursal: { empresaId } } : {}
    });
    const depositosGarantia = contratos.reduce((sum, c) => sum + c.depositoGarantia, 0);

    const totalActivoCorriente = efectivoBancos + cuentasPorCobrar + depositosGarantia;

    // 4. Activos Fijos (Flota de Maquinaria y Equipos)
    const equipos = await this.prisma.equipo.findMany({
      where: empresaId ? { sucursal: { empresaId } } : {}
    });
    const valorFlotaMaquinaria = equipos.reduce((sum, e) => sum + (e.costoAdquisicion || (e.precioRentaDia * 300)), 0);

    const totalActivoNoCorriente = valorFlotaMaquinaria;
    const totalActivos = totalActivoCorriente + totalActivoNoCorriente;

    // PASIVOS
    // 1. Cuentas por Pagar (Mantenimiento y Proveedores)
    const cxp = await this.getCuentasPorPagar(empresaId);
    const cuentasPorPagar = cxp.resumenGlobal.totalPendientePago;

    // 2. Pasivo por Depósitos de Garantía (A devolver a clientes)
    const pasivoDepositos = depositosGarantia;

    const totalPasivos = cuentasPorPagar + pasivoDepositos;

    // PATRIMONIO
    const patrimonioCapital = totalActivos - totalPasivos;

    return {
      fechaCorte: new Date().toISOString(),
      activos: {
        corrientes: {
          efectivoYBancos: efectivoBancos,
          cuentasPorCobrar,
          depositosGarantiaCustodiados: depositosGarantia,
          totalActivoCorriente
        },
        noCorrientes: {
          flotaMaquinariaYEquipos: valorFlotaMaquinaria,
          totalActivoNoCorriente
        },
        totalActivos
      },
      pasivos: {
        corrientes: {
          cuentasPorPagar,
          garantiasPorDevolver: pasivoDepositos,
          totalPasivos
        }
      },
      patrimonio: {
        capitalContableYUtilidades: patrimonioCapital,
        totalPatrimonio: patrimonioCapital
      },
      equilibrioContable: totalActivos === (totalPasivos + patrimonioCapital)
    };
  }
}
