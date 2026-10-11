import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { getCatalogoOficial, CuentaCatalogo } from '../data/catalogo.loader';

export interface CxcFacturaItem {
  id: string;
  folio: string;
  origen: string;
  fechaEmision: Date;
  fechaVence: Date;
  total: unknown;
  montoPagado: number;
  saldoPendiente: number;
  estado: string;
  esVencida: boolean;
}

export interface CxcClienteGroup {
  clienteId: string;
  clienteNombre: string;
  clienteRuc: string;
  totalFacturas: number;
  totalMonto: number;
  totalPagado: number;
  saldoPendiente: number;
  vencido: number;
  facturas: CxcFacturaItem[];
}

export interface LineaPoliza {
  cuentaCodigo: string;
  cuentaNombre: string;
  debe: number;
  haber: number;
  sucursalId?: string;
  equipoId?: string;
  clienteId?: string;
  concepto?: string;
}

export interface PolizaDiario {
  id: string;
  numeroPoliza: string;
  fecha: Date;
  tipoPoliza: 'VENTAS' | 'INGRESOS' | 'EGRESOS' | 'DIARIO';
  concepto: string;
  referenciaDoc: string;
  totalDebe: number;
  totalHaber: number;
  cuadrado: boolean;
  lineas: LineaPoliza[];
}

export interface BalanzaFila {
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: string;
  naturaleza: 'Deudora' | 'Acreedora';
  saldoInicialDebe: number;
  saldoInicialHaber: number;
  movimientoDebe: number;
  movimientoHaber: number;
  saldoFinalDeudor: number;
  saldoFinalAcreedor: number;
  aceptaMovimiento: boolean;
  esControl: boolean;
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  private requireEmpresa(empresaId: string): void {
    if (typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new ForbiddenException('El usuario no tiene una empresa asignada.');
    }
  }

  // ==========================================================================
  // 1. CATÁLOGO OFICIAL DE CUENTAS (207 Cuentas BM Construcciones)
  // ==========================================================================
  async getCatalogoCuentas(filtroNivel?: number, query?: string): Promise<{
    total: number;
    cuentas: CuentaCatalogo[];
  }> {
    let catalogo = getCatalogoOficial();

    if (filtroNivel) {
      catalogo = catalogo.filter((c) => c.nivel === Number(filtroNivel));
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      catalogo = catalogo.filter(
        (c) =>
          c.codigo.toLowerCase().includes(q) ||
          c.nombre.toLowerCase().includes(q) ||
          c.tipo.toLowerCase().includes(q)
      );
    }

    return {
      total: catalogo.length,
      cuentas: catalogo,
    };
  }

  // ==========================================================================
  // 2. BALANZA DE COMPROBACIÓN DINÁMICA
  // ==========================================================================
  async getBalanzaComprobacion(
    empresaId: string,
    sucursalId?: string
  ): Promise<{
    fechaCorte: string;
    totalDebe: number;
    totalHaber: number;
    cuadrada: boolean;
    cuentas: BalanzaFila[];
  }> {
    this.requireEmpresa(empresaId);

    const catalogo = getCatalogoOficial();
    const movimientosMap = new Map<string, { debe: number; haber: number }>();

    const registrarMovimiento = (codigo: string, debe: number, haber: number) => {
      const d = Math.round(Number(debe || 0) * 100) / 100;
      const h = Math.round(Number(haber || 0) * 100) / 100;
      if (d === 0 && h === 0) return;

      const act = movimientosMap.get(codigo) || { debe: 0, haber: 0 };
      movimientosMap.set(codigo, {
        debe: Math.round((act.debe + d) * 100) / 100,
        haber: Math.round((act.haber + h) * 100) / 100,
      });
    };

    // 1. Consultar Facturas del tenant
    const facturas = await this.prisma.factura.findMany({
      where: {
        empresaId,
        cliente: { empresaId },
        ...(sucursalId ? { sucursalId } : {}),
      },
      include: { pagos: true },
    });

    for (const f of facturas) {
      const subtotal = Number(f.subtotal);
      const iva = Number(f.iva);
      const total = Number(f.total);
      const retencion = Number(f.retencionIva || 0);

      // Ingresos por alquiler (4.1.01.001 Andamios / 4.1.01.002 Maquinaria)
      registrarMovimiento('4.1.01.001', 0, subtotal);
      // IVA por pagar (2.1.02.001)
      registrarMovimiento('2.1.02.001', 0, iva);

      if (f.condicionPago === 'CONTADO') {
        const cajaCode = f.sucursalId?.includes('ca') ? '1.1.01.002' : '1.1.01.001';
        if (retencion > 0) {
          registrarMovimiento(cajaCode, total - retencion, 0);
          registrarMovimiento('1.1.07.003', retencion, 0); // Retención IR 2% a favor
        } else {
          registrarMovimiento(cajaCode, total, 0);
        }
      } else {
        // Venta de crédito -> CxC Clientes (1.1.05.001)
        registrarMovimiento('1.1.05.001', total, 0);

        // Pagos registrados de créditos
        if (f.pagos && f.pagos.length > 0) {
          for (const p of f.pagos) {
            const montoPago = Number(p.monto);
            registrarMovimiento('1.1.02.001', montoPago, 0); // Banco
            registrarMovimiento('1.1.05.001', 0, montoPago); // Rebaja CxC
          }
        }
      }
    }

    // 2. Mantenimientos de flota (CxP y Costos de Taller)
    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: { equipo: { empresaId, sucursal: { empresaId } } },
    });

    for (const m of mantenimientos) {
      const costo = Number(m.costo || 0);
      if (costo > 0) {
        // Costo de taller (5.1.02.001)
        registrarMovimiento('5.1.02.001', costo, 0);
        // CxP Proveedores (2.1.01.001)
        registrarMovimiento('2.1.01.001', 0, costo);
      }
    }

    // 3. Activos Fijos (Flota y Equipos en alquiler):
    // No se estiman costos basados en tarifas de renta (precioRentaDia).
    // Conforme a los acuerdos de auditoria con BM Construcciones (29-ago-2026),
    // los activos fijos se incorporaran formalmente cuando contabilidad registre
    // la Poliza de Apertura / Saldo Inicial tras el levantamiento fisico de inventario.

    // 4. Depósitos en Garantía de Contratos
    const contratos = await this.prisma.contrato.findMany({
      where: { sucursal: { empresaId }, cliente: { empresaId } },
    });

    for (const c of contratos) {
      const dep = Number(c.depositoGarantia || 0);
      if (dep > 0) {
        registrarMovimiento('1.1.02.001', dep, 0); // Banco
        registrarMovimiento('2.1.06.002', 0, dep); // Pasivo depósitos recibidos
      }
    }

    // 5. Construir y consolidar filas de la Balanza
    let totalGeneralDebe = 0;
    let totalGeneralHaber = 0;

    const filasBalanza: BalanzaFila[] = catalogo.map((cta) => {
      const mov = movimientosMap.get(cta.codigo) || { debe: 0, haber: 0 };
      const esDeudora = cta.naturaleza === 'Deudora';

      totalGeneralDebe += mov.debe;
      totalGeneralHaber += mov.haber;

      const saldoNeto = esDeudora ? mov.debe - mov.haber : mov.haber - mov.debe;
      const saldoFinalDeudor = esDeudora && saldoNeto > 0 ? saldoNeto : 0;
      const saldoFinalAcreedor = !esDeudora && saldoNeto > 0 ? saldoNeto : 0;

      return {
        codigo: cta.codigo,
        nombre: cta.nombre,
        nivel: cta.nivel,
        tipo: cta.tipo,
        naturaleza: cta.naturaleza,
        saldoInicialDebe: 0,
        saldoInicialHaber: 0,
        movimientoDebe: mov.debe,
        movimientoHaber: mov.haber,
        saldoFinalDeudor: Math.round(saldoFinalDeudor * 100) / 100,
        saldoFinalAcreedor: Math.round(saldoFinalAcreedor * 100) / 100,
        aceptaMovimiento: cta.aceptaMovimiento,
        esControl: cta.esControl,
      };
    });

    const cuadrada = Math.abs(totalGeneralDebe - totalGeneralHaber) < 0.05;

    return {
      fechaCorte: new Date().toISOString(),
      totalDebe: Math.round(totalGeneralDebe * 100) / 100,
      totalHaber: Math.round(totalGeneralHaber * 100) / 100,
      cuadrada,
      cuentas: filasBalanza,
    };
  }

  // ==========================================================================
  // 3. LIBRO DIARIO DE PÓLIZAS AUTOMÁTICAS
  // ==========================================================================
  async getLibroDiario(empresaId: string, limit = 50): Promise<{
    totalPolizas: number;
    polizas: PolizaDiario[];
  }> {
    this.requireEmpresa(empresaId);

    const facturas = await this.prisma.factura.findMany({
      where: { empresaId, cliente: { empresaId } },
      include: {
        cliente: true,
        pagos: true,
      },
      orderBy: { fechaEmision: 'desc' },
      take: limit,
    });

    const polizas: PolizaDiario[] = [];

    facturas.forEach((f, idx) => {
      const subtotal = Number(f.subtotal);
      const iva = Number(f.iva);
      const total = Number(f.total);
      const retencion = Number(f.retencionIva || 0);

      const lineas: LineaPoliza[] = [];

      if (f.condicionPago === 'CONTADO') {
        const cuentaCaja = f.sucursalId?.includes('ca') ? '1.1.01.002' : '1.1.01.001';
        const nombreCaja = f.sucursalId?.includes('ca')
          ? 'Caja general – Centroamérica'
          : 'Caja general – Km 10.5';

        if (retencion > 0) {
          lineas.push({
            cuentaCodigo: cuentaCaja,
            cuentaNombre: nombreCaja,
            debe: total - retencion,
            haber: 0,
            sucursalId: f.sucursalId || 'KM10',
            concepto: 'Cobro de contado neto en caja',
          });
          lineas.push({
            cuentaCodigo: '1.1.07.003',
            cuentaNombre: 'Retenciones IR 2% a favor (clientes)',
            debe: retencion,
            haber: 0,
            sucursalId: f.sucursalId || 'KM10',
            concepto: 'Retención fiscal aplicada por cliente retenedor',
          });
        } else {
          lineas.push({
            cuentaCodigo: cuentaCaja,
            cuentaNombre: nombreCaja,
            debe: total,
            haber: 0,
            sucursalId: f.sucursalId || 'KM10',
            concepto: 'Cobro íntegro de contado en caja',
          });
        }
      } else {
        lineas.push({
          cuentaCodigo: '1.1.05.001',
          cuentaNombre: 'Clientes – cuentas por cobrar (control)',
          debe: total,
          haber: 0,
          sucursalId: f.sucursalId || 'KM10',
          clienteId: f.clienteId,
          concepto: `Facturación a crédito cliente ${f.cliente?.nombre || 'General'}`,
        });
      }

      lineas.push({
        cuentaCodigo: '4.1.01.001',
        cuentaNombre: 'Alquiler de andamios y equipos',
        debe: 0,
        haber: subtotal,
        sucursalId: f.sucursalId || 'KM10',
        concepto: 'Ingreso por arrendamiento',
      });

      lineas.push({
        cuentaCodigo: '2.1.02.001',
        cuentaNombre: 'IVA por pagar (débito fiscal)',
        debe: 0,
        haber: iva,
        sucursalId: f.sucursalId || 'KM10',
        concepto: 'IVA 15% devengado en factura',
      });

      const totalDebe = lineas.reduce((s, l) => s + l.debe, 0);
      const totalHaber = lineas.reduce((s, l) => s + l.haber, 0);

      polizas.push({
        id: f.id,
        numeroPoliza: `POL-VTA-2026-${String(idx + 1).padStart(4, '0')}`,
        fecha: f.fechaEmision,
        tipoPoliza: 'VENTAS',
        concepto: `Venta ${f.condicionPago} según Factura ${f.folio} - ${f.cliente?.nombre || 'Cliente'}`,
        referenciaDoc: f.folio,
        totalDebe: Math.round(totalDebe * 100) / 100,
        totalHaber: Math.round(totalHaber * 100) / 100,
        cuadrado: Math.abs(totalDebe - totalHaber) < 0.01,
        lineas,
      });

      // Si tiene pagos aplicados a crédito, generar póliza de cobro
      if (f.condicionPago === 'CREDITO' && f.pagos && f.pagos.length > 0) {
        f.pagos.forEach((p, pIdx) => {
          const montoPago = Number(p.monto);
          const lineasPago: LineaPoliza[] = [
            {
              cuentaCodigo: '1.1.02.001',
              cuentaNombre: 'Banco C$ – Recaudación',
              debe: montoPago,
              haber: 0,
              sucursalId: f.sucursalId || 'KM10',
              concepto: 'Abono recibido vía transferencia/banco',
            },
            {
              cuentaCodigo: '1.1.05.001',
              cuentaNombre: 'Clientes – cuentas por cobrar (control)',
              debe: 0,
              haber: montoPago,
              sucursalId: f.sucursalId || 'KM10',
              clienteId: f.clienteId,
              concepto: `Cancelación / Abono Factura ${f.folio}`,
            },
          ];

          polizas.push({
            id: p.id,
            numeroPoliza: `POL-ING-2026-${String(idx + 1).padStart(3, '0')}-${pIdx + 1}`,
            fecha: f.fechaEmision,
            tipoPoliza: 'INGRESOS',
            concepto: `Recibo de Cobro sobre Factura ${f.folio} - ${f.cliente?.nombre || 'Cliente'}`,
            referenciaDoc: `RC-${f.folio}`,
            totalDebe: montoPago,
            totalHaber: montoPago,
            cuadrado: true,
            lineas: lineasPago,
          });
        });
      }
    });

    return {
      totalPolizas: polizas.length,
      polizas,
    };
  }

  // ==========================================================================
  // 4. EXPORTACIÓN A QUICKBOOKS (IIF DESKTOP / CSV ONLINE)
  // ==========================================================================
  async exportQuickBooks(empresaId: string, formato: 'IIF' | 'CSV'): Promise<{
    filename: string;
    mimeType: string;
    content: string;
  }> {
    this.requireEmpresa(empresaId);

    const diario = await this.getLibroDiario(empresaId, 200);
    const catalogo = getCatalogoOficial();
    const mapQB = new Map<string, string>();
    catalogo.forEach((c) => {
      mapQB.set(c.codigo, c.qbNombre || c.nombre);
    });

    if (formato === 'IIF') {
      // Formato QuickBooks Desktop IIF (Tab Separated Values)
      const lines: string[] = [];
      lines.push('!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\tCLASS');
      lines.push('!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\tCLASS');
      lines.push('!ENDTRNS');

      for (const p of diario.polizas) {
        const dateStr = new Date(p.fecha).toLocaleDateString('en-US'); // MM/DD/YYYY
        p.lineas.forEach((l, lIdx) => {
          const accntName = mapQB.get(l.cuentaCodigo) || l.cuentaNombre;
          const amount = l.debe > 0 ? l.debe.toFixed(2) : (-l.haber).toFixed(2);
          const className = l.sucursalId?.includes('ca') ? 'CENTROAMERICA' : 'KM10_5';

          if (lIdx === 0) {
            lines.push(
              `TRNS\t${p.numeroPoliza}\tGENERAL JOURNAL\t${dateStr}\t${accntName}\tClientes ERP\t${amount}\t${p.concepto}\t${className}`
            );
          } else {
            lines.push(
              `SPL\t${p.numeroPoliza}\tGENERAL JOURNAL\t${dateStr}\t${accntName}\t\t${amount}\t${l.concepto || p.concepto}\t${className}`
            );
          }
        });
        lines.push('ENDTRNS');
      }

      return {
        filename: `asientos_qb_desktop_${Date.now()}.iif`,
        mimeType: 'text/plain',
        content: lines.join('\r\n'),
      };
    } else {
      // Formato QuickBooks Online CSV
      const rows: string[] = [];
      rows.push(
        'JournalNo,JournalDate,AccountName,Debits,Credits,Description,Class,Location'
      );

      for (const p of diario.polizas) {
        const dateStr = new Date(p.fecha).toISOString().split('T')[0];
        for (const l of p.lineas) {
          const accntName = `"${mapQB.get(l.cuentaCodigo) || l.cuentaNombre}"`;
          const deb = l.debe > 0 ? l.debe.toFixed(2) : '0.00';
          const cred = l.haber > 0 ? l.haber.toFixed(2) : '0.00';
          const desc = `"${p.concepto.replace(/"/g, '""')}"`;
          const className = l.sucursalId?.includes('ca') ? 'CENTROAMERICA' : 'KM10_5';
          const loc = l.sucursalId?.includes('ca') ? 'Centroamerica' : 'Km 10.5';

          rows.push(
            `${p.numeroPoliza},${dateStr},${accntName},${deb},${cred},${desc},${className},${loc}`
          );
        }
      }

      return {
        filename: `asientos_qb_online_${Date.now()}.csv`,
        mimeType: 'text/csv',
        content: rows.join('\r\n'),
      };
    }
  }

  // ==========================================================================
  // 5. CUENTAS POR COBRAR (CxC)
  // ==========================================================================
  async getCuentasPorCobrar(empresaId: string) {
    this.requireEmpresa(empresaId);

    const facturas = await this.prisma.factura.findMany({
      where: { empresaId, cliente: { empresaId } },
      include: {
        cliente: true,
        contrato: { include: { cliente: true } },
        cotizacion: { include: { cliente: true } },
        corte: true,
        pagos: true,
      },
      orderBy: { fechaVence: 'asc' },
    });

    const now = new Date();

    const cxcPorClienteMap = new Map<string, CxcClienteGroup>();
    let totalFacturado = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;
    let totalVencido = 0;

    for (const f of facturas) {
      const montoPagadoReal =
        f.pagos && f.pagos.length > 0
          ? f.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
          : 0;

      const facturaTotal = Number(f.total);
      let cobradoReal = montoPagadoReal;
      if (
        f.estado === 'PAGADA' &&
        montoPagadoReal === 0 &&
        f.condicionPago === 'CONTADO' &&
        !f.corteId
      ) {
        cobradoReal = facturaTotal;
      }

      const saldoPendiente = Math.max(0, facturaTotal - cobradoReal);
      const esPagada = saldoPendiente <= 0;
      const esVencida = saldoPendiente > 0 && new Date(f.fechaVence) < now;

      totalFacturado += facturaTotal;
      totalCobrado += cobradoReal;
      totalPendiente += saldoPendiente;
      if (esVencida) totalVencido += saldoPendiente;

      const clienteId =
        f.clienteId ||
        f.contrato?.clienteId ||
        f.cotizacion?.clienteId ||
        'general';
      if (!cxcPorClienteMap.has(clienteId)) {
        cxcPorClienteMap.set(clienteId, {
          clienteId,
          clienteNombre:
            f.cliente?.nombre ||
            f.contrato?.cliente?.nombre ||
            f.cotizacion?.cliente?.nombre ||
            'Cliente General',
          clienteRuc: f.cliente?.rfc || f.cliente?.cedula || 'Sin RUC',
          totalFacturas: 0,
          totalMonto: 0,
          totalPagado: 0,
          saldoPendiente: 0,
          vencido: 0,
          facturas: [],
        });
      }

      const clienteGroup = cxcPorClienteMap.get(clienteId)!;
      clienteGroup.totalFacturas += 1;
      clienteGroup.totalMonto += facturaTotal;
      clienteGroup.totalPagado += cobradoReal;
      clienteGroup.saldoPendiente += saldoPendiente;
      if (esVencida) clienteGroup.vencido += saldoPendiente;

      clienteGroup.facturas.push({
        id: f.id,
        folio: f.folio,
        origen: f.corteId ? `Corte #${f.corteNumero || 1}` : 'Factura Estándar',
        fechaEmision: f.fechaEmision,
        fechaVence: f.fechaVence,
        total: facturaTotal,
        montoPagado: cobradoReal,
        saldoPendiente,
        estado: esPagada ? 'PAGADA' : esVencida ? 'VENCIDA' : 'PENDIENTE',
        esVencida,
      });
    }

    return {
      resumenGlobal: {
        totalFacturado,
        totalCobrado,
        totalPendiente,
        totalVencido,
      },
      clientes: Array.from(cxcPorClienteMap.values()),
    };
  }

  // ==========================================================================
  // 6. CUENTAS POR PAGAR (CxP)
  // ==========================================================================
  async getCuentasPorPagar(empresaId: string) {
    this.requireEmpresa(empresaId);
    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: { equipo: { empresaId, sucursal: { empresaId } } },
      include: {
        equipo: {
          include: { marca: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalGastosMantenimiento = 0;
    let totalPendientePago = 0;

    const itemsCxP = mantenimientos.map((m) => {
      const costo = Number(m.costo);
      totalGastosMantenimiento += costo;
      const esPendiente = m.estado !== 'COMPLETADO';
      if (esPendiente) totalPendientePago += costo;

      return {
        id: m.id,
        concepto: `Mantenimiento ${m.tipo} - ${m.equipo.modelo} (${m.equipo.marca?.nombre || 'General'})`,
        equipoModelo: m.equipo.modelo,
        tipo: m.tipo,
        costo,
        insumos: m.insumosUtilizados || 'Mano de Obra y Repuestos',
        fechaProgramada: m.fechaProgramacion,
        estado: m.estado,
      };
    });

    return {
      resumenGlobal: {
        totalGastosMantenimiento,
        totalPendientePago,
        totalPagado: totalGastosMantenimiento - totalPendientePago,
      },
      cuentasPorPagar: itemsCxP,
    };
  }

  // ==========================================================================
  // 7. ESTADO DE RESULTADOS (P&L)
  // ==========================================================================
  async getEstadoResultados(empresaId: string) {
    this.requireEmpresa(empresaId);

    const facturas = await this.prisma.factura.findMany({
      where: { empresaId, cliente: { empresaId } },
    });

    const ingresosAlquiler = facturas.reduce(
      (sum, f) => sum + Number(f.total),
      0,
    );
    const subtotalIngresos = facturas.reduce(
      (sum, f) => sum + Number(f.subtotal),
      0,
    );
    const ivaRecaudado = facturas.reduce((sum, f) => sum + Number(f.iva), 0);

    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: { equipo: { empresaId, sucursal: { empresaId } } },
    });

    const costoMantenimiento = mantenimientos.reduce(
      (sum, m) => sum + Number(m.costo),
      0,
    );

    const inspeccionesDanio = await this.prisma.inspeccionDano.findMany({
      where: {
        detalleDevolucion: {
          equipo: { empresaId },
          devolucion: {
            sucursal: { empresaId },
            contrato: { sucursal: { empresaId }, cliente: { empresaId } },
          },
        },
      },
    });
    const ingresosPorDanio = inspeccionesDanio.reduce(
      (sum: number, d) => sum + (d.cobrable ? Number(d.costoEstimado) : 0),
      0,
    );

    const ingresosTotalesBrutos = ingresosAlquiler + ingresosPorDanio;
    const utilidadBruta = ingresosTotalesBrutos - costoMantenimiento;

    // Gastos operativos: solo se consideran costos reales documentados (no estimaciones teóricas)
    const gastosAdministrativos = 0;
    const utilidadNeta = utilidadBruta - gastosAdministrativos;

    return {
      periodo: 'Ejercicio Fiscal Actual',
      ingresos: {
        facturacionAlquiler: ingresosAlquiler,
        subtotalSinIva: subtotalIngresos,
        ivaRecaudado,
        cargosPorDanio: ingresosPorDanio,
        totalIngresosBrutos: ingresosTotalesBrutos,
      },
      costosOperativos: {
        mantenimientoYRepuestos: costoMantenimiento,
        gastosAdministrativos,
        totalCostosYGastos: costoMantenimiento + gastosAdministrativos,
      },
      indicadoresFinancieros: {
        utilidadBruta,
        utilidadNeta,
        margenUtilidadNetaPorcentaje:
          ingresosTotalesBrutos > 0
            ? Math.round((utilidadNeta / ingresosTotalesBrutos) * 10000) / 100
            : 0,
      },
    };
  }

  // ==========================================================================
  // 8. BALANCE GENERAL
  // ==========================================================================
  async getBalanceGeneral(empresaId: string) {
    this.requireEmpresa(empresaId);

    const pagos = await this.prisma.pago.findMany({
      where: { factura: { empresaId, cliente: { empresaId } } },
    });
    const efectivoBancos = pagos.reduce((sum, p) => sum + Number(p.monto), 0);

    const cxc = await this.getCuentasPorCobrar(empresaId);
    const cuentasPorCobrar = cxc.resumenGlobal.totalPendiente;

    const contratos = await this.prisma.contrato.findMany({
      where: { sucursal: { empresaId }, cliente: { empresaId } },
    });
    const depositosGarantia = contratos.reduce(
      (sum, c) => sum + Number(c.depositoGarantia),
      0,
    );

    const totalActivoCorriente =
      efectivoBancos + cuentasPorCobrar + depositosGarantia;

    const equipos = await this.prisma.equipo.findMany({
      where: { empresaId, sucursal: { empresaId } },
    });
    // Solo equipos con costo de adquisición real documentado en ficha; no se inventan costos basados en tarifas de renta
    const valorFlotaMaquinaria = equipos.reduce(
      (sum, e) =>
        sum + (e.costoAdquisicion ? Number(e.costoAdquisicion) : 0),
      0,
    );

    const totalActivoNoCorriente = valorFlotaMaquinaria;
    const totalActivos = totalActivoCorriente + totalActivoNoCorriente;

    const cxp = await this.getCuentasPorPagar(empresaId);
    const cuentasPorPagar = cxp.resumenGlobal.totalPendientePago;
    const pasivoDepositos = depositosGarantia;
    const totalPasivos = cuentasPorPagar + pasivoDepositos;

    const patrimonioCapital = totalActivos - totalPasivos;

    return {
      fechaCorte: new Date().toISOString(),
      activos: {
        corrientes: {
          efectivoYBancos: efectivoBancos,
          cuentasPorCobrar,
          depositosGarantiaCustodiados: depositosGarantia,
          totalActivoCorriente,
        },
        noCorrientes: {
          flotaMaquinariaYEquipos: valorFlotaMaquinaria,
          totalActivoNoCorriente,
        },
        totalActivos,
      },
      pasivos: {
        corrientes: {
          cuentasPorPagar,
          garantiasPorDevolver: pasivoDepositos,
          totalPasivos,
        },
      },
      patrimonio: {
        capitalContableYUtilidades: patrimonioCapital,
        totalPatrimonio: patrimonioCapital,
      },
      equilibrioContable: totalActivos === totalPasivos + patrimonioCapital,
    };
  }
}
