import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { TipoDocumentoSerie, TipoFactura } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NumberingService } from '../../numbering/services/numbering.service';
import {
  getCatalogoOficial,
  getSaldosInicialesOficiales,
  CuentaCatalogo,
} from '../data/catalogo.loader';
import {
  AnularAsientoDto,
  CrearAsientoManualDto,
  CuentaCatalogoInputDto,
  GuardarSaldosInicialesDto,
  ImportarExcelContableDto,
} from '../dto/accounting.dto';
import {
  BM_CUENTAS,
  resolverCuentaConsumoInsumo,
} from '../utils/bm-accounting.util';

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
  private readonly numberingService: NumberingService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() numberingService?: NumberingService,
  ) {
    this.numberingService = numberingService ?? new NumberingService(prisma);
  }

  private requireEmpresa(empresaId: string): void {
    if (typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new ForbiddenException('El usuario no tiene una empresa asignada.');
    }
  }

  private round2(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private parseFechaCorte(fechaStr: string): Date {
    const clean = (fechaStr || '').trim();
    const parsed = new Date(clean.includes('T') ? clean : `${clean}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `Fecha de corte inválida: "${fechaStr}". Usa el formato YYYY-MM-DD.`,
      );
    }
    return parsed;
  }

  private async loadCatalogoEmpresa(
    empresaId?: string,
  ): Promise<CuentaCatalogo[]> {
    if (empresaId && this.prisma.cuentaContable?.findMany) {
      const dbRows = await this.prisma.cuentaContable.findMany({
        where: { empresaId, activa: true },
        orderBy: { codigo: 'asc' },
      });
      if (dbRows.length > 0) {
        return dbRows.map((row) => ({
          codigo: row.codigo,
          nombre: row.nombre,
          nivel: row.nivel,
          tipo: row.tipo,
          naturaleza:
            row.naturaleza === 'Acreedora' ? 'Acreedora' : 'Deudora',
          aceptaMovimiento: row.aceptaMovimiento,
          esControl: row.esControl,
          mayorCodigo: row.mayorCodigo || undefined,
          mayorNombre: row.mayorNombre || undefined,
          estado: row.estadoFinanciero || undefined,
          renglon: row.renglon || undefined,
          modulo: 'Contabilidad',
          dimensiones: 'Empresa',
          nota: '',
          qbTipo: row.qbTipo || '',
          qbNombre: row.qbNombre || row.nombre,
          qbClass: '',
        }));
      }
    }
    return getCatalogoOficial();
  }

  // ==========================================================================
  // 1. CATÁLOGO OFICIAL DE CUENTAS BM CONSTRUCCIONES
  // ==========================================================================
  async getCatalogoCuentas(
    filtroNivel?: number,
    query?: string,
    empresaId?: string,
  ): Promise<{
    total: number;
    totalGeneral: number;
    totalDetalle: number;
    totalMayor: number;
    cuentas: CuentaCatalogo[];
  }> {
    const catalogoCompleto = await this.loadCatalogoEmpresa(empresaId);
    const totalGeneral = catalogoCompleto.length;
    const totalDetalle = catalogoCompleto.filter(
      (c) => c.aceptaMovimiento || c.nivel === 4,
    ).length;
    const totalMayor = catalogoCompleto.filter((c) => c.nivel === 3).length;

    let catalogo = catalogoCompleto;

    if (filtroNivel) {
      catalogo = catalogo.filter((c) => c.nivel === Number(filtroNivel));
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      catalogo = catalogo.filter(
        (c) =>
          c.codigo.toLowerCase().includes(q) ||
          c.nombre.toLowerCase().includes(q) ||
          c.tipo.toLowerCase().includes(q) ||
          (c.mayorCodigo || '').toLowerCase().includes(q) ||
          (c.mayorNombre || '').toLowerCase().includes(q) ||
          (c.renglon || '').toLowerCase().includes(q),
      );
    }

    return {
      total: catalogo.length,
      totalGeneral,
      totalDetalle,
      totalMayor,
      cuentas: catalogo,
    };
  }

  // ==========================================================================
  // 2. BALANZA DE COMPROBACIÓN DINÁMICA (SALDOS INICIALES + MOVIMIENTOS)
  // ==========================================================================
  async getBalanzaComprobacion(
    empresaId: string,
    sucursalId?: string,
  ): Promise<{
    fechaCorte: string;
    totalSaldoInicialDebe: number;
    totalSaldoInicialHaber: number;
    totalDebe: number;
    totalHaber: number;
    totalSaldoFinalDeudor: number;
    totalSaldoFinalAcreedor: number;
    cuadrada: boolean;
    cuentas: BalanzaFila[];
  }> {
    this.requireEmpresa(empresaId);

    const catalogo = await this.loadCatalogoEmpresa(empresaId);

    // 0. Saldos iniciales persistidos para la empresa
    const saldosInicialesRows =
      (await this.prisma.saldoInicialContable?.findMany?.({
        where: { empresaId },
      })) ?? [];

    const saldosInicialesMap = new Map<
      string,
      { deudor: number; acreedor: number; nombre?: string }
    >();
    let fechaCorteInicial: Date | null = null;
    for (const s of saldosInicialesRows) {
      saldosInicialesMap.set(s.cuentaCodigo, {
        deudor: this.round2(Number(s.deudor || 0)),
        acreedor: this.round2(Number(s.acreedor || 0)),
        nombre: s.cuentaNombre ? String(s.cuentaNombre).toUpperCase() : undefined,
      });
      if (!fechaCorteInicial || s.fechaCorte > fechaCorteInicial) {
        fechaCorteInicial = s.fechaCorte;
      }
    }

    const movimientosMap = new Map<string, { debe: number; haber: number }>();

    const registrarMovimiento = (codigo: string, debe: number, haber: number) => {
      const d = this.round2(debe);
      const h = this.round2(haber);
      if (d === 0 && h === 0) return;

      const act = movimientosMap.get(codigo) || { debe: 0, haber: 0 };
      movimientosMap.set(codigo, {
        debe: this.round2(act.debe + d),
        haber: this.round2(act.haber + h),
      });
    };

    // Configuración dinámica de cuentas CxC
    const cxcConfig =
      (await (this.prisma as any).cxcConfiguracion?.findUnique?.({
        where: { empresaId },
      })) ?? null;
    const ctaClientes =
      cxcConfig?.cuentaMayorClientes || BM_CUENTAS.CXC_CLIENTES.codigo;
    const ctaAnticipos =
      cxcConfig?.cuentaAnticiposClientes ||
      BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.codigo;
    const ctaRetIrFavor =
      cxcConfig?.cuentaRetencionIrFavor || BM_CUENTAS.RETENCION_IR_FAVOR.codigo;

    // 1. Consultar Facturas del tenant (excluyendo canceladas)
    const facturas = await this.prisma.factura.findMany({
      where: {
        empresaId,
        cliente: { empresaId },
        ...(sucursalId ? { sucursalId } : {}),
      },
      include: { pagos: true },
    });

    for (const f of facturas) {
      if ((f as any).estado === 'CANCELADA') continue;

      const subtotal = Number(f.subtotal);
      const iva = Number(f.iva);
      const total = Number(f.total);
      const retencion = Number(f.retencionIva || 0);

      // Ingresos por alquiler (410101) o servicios de taller/mantenimiento (410102)
      const isMantenimiento =
        f.tipoFactura === TipoFactura.CARGO_DANOS ||
        Boolean((f as any).devolucionId);
      registrarMovimiento(
        isMantenimiento
          ? BM_CUENTAS.INGRESO_SERVICIOS_LOCALES.codigo
          : BM_CUENTAS.INGRESO_ALQUILER.codigo,
        0,
        subtotal,
      );
      // IVA 15% por Pagar (210201)
      registrarMovimiento(BM_CUENTAS.IVA_POR_PAGAR.codigo, 0, iva);

      if (f.condicionPago === 'CONTADO') {
        const cajaCode = BM_CUENTAS.CAJA_GENERAL.codigo; // 110101
        if (retencion > 0) {
          registrarMovimiento(cajaCode, total - retencion, 0);
          registrarMovimiento(ctaRetIrFavor, retencion, 0);
        } else {
          registrarMovimiento(cajaCode, total, 0);
        }
      } else {
        // Venta de crédito -> CxC Clientes (110301 o cuenta configurada en CxC)
        registrarMovimiento(ctaClientes, total, 0);

        // Pagos registrados de créditos directos en facturación -> LA FISE (110201)
        if (f.pagos && f.pagos.length > 0) {
          for (const p of f.pagos) {
            const montoPago = Number(p.monto);
            registrarMovimiento(BM_CUENTAS.BANCO_LAFISE.codigo, montoPago, 0);
            registrarMovimiento(ctaClientes, 0, montoPago);
          }
        }
      }
    }

    // 2. Mantenimientos de flota (CxP y Gastos de Mantenimiento)
    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: { equipo: { empresaId, sucursal: { empresaId } } },
    });

    for (const m of mantenimientos) {
      const costo = Number(m.costo || 0);
      if (costo > 0) {
        registrarMovimiento(
          BM_CUENTAS.GASTO_MANTENIMIENTO_MAQUINARIA.codigo,
          costo,
          0,
        );
        registrarMovimiento(BM_CUENTAS.PROVEEDORES_OTROS.codigo, 0, costo);
      }
    }

    // 2b. Subarrendamiento de maquinaria a proveedores (510106 vs 210101)
    const subarriendos =
      (await (this.prisma as any).detalleContrato?.findMany?.({
        where: {
          contrato: {
            estado: { in: ['ACTIVO', 'FINALIZADO'] },
            sucursal: { empresaId },
            cliente: { empresaId },
            ...(sucursalId ? { sucursalId } : {}),
          },
          equipo: {
            OR: [
              { origenEquipo: 'PROVEEDOR' },
              { proveedorId: { not: null } },
            ],
          },
        },
        include: {
          equipo: { select: { precioProveedor: true } },
        },
      })) ?? [];

    for (const sub of subarriendos) {
      const precioProv = Number(sub.equipo?.precioProveedor || 0);
      const costoSub = this.round2(precioProv * Number(sub.cantidad || 1));
      if (costoSub > 0) {
        registrarMovimiento(
          BM_CUENTAS.COSTO_SUBARRIENDO_MAQUINARIA.codigo,
          costoSub,
          0,
        );
        registrarMovimiento(BM_CUENTAS.PROVEEDORES_OTROS.codigo, 0, costoSub);
      }
    }

    // 3. Activos Fijos (Flota y Equipos en alquiler):
    // Los saldos iniciales contables oficiales provienen de `saldos_iniciales_contables`.

    // 4. Depósitos en Garantía de Contratos
    const contratos = await this.prisma.contrato.findMany({
      where: {
        sucursal: { empresaId },
        cliente: { empresaId },
        ...(sucursalId ? { sucursalId } : {}),
      },
    });

    for (const c of contratos) {
      if ((c as any).estado === 'CANCELADO') continue;
      const dep = Number(c.depositoGarantia || 0);
      if (dep > 0) {
        registrarMovimiento(BM_CUENTAS.BANCO_LAFISE.codigo, dep, 0);
        registrarMovimiento(ctaAnticipos, 0, dep);
      }
    }

    // 4b. Asientos contables persistidos (CxC Recibos/Notas, Nómina, Insumos, Comisiones Externas, Manuales)
    const asientosPublicados =
      (await (this.prisma as any).asientoContable?.findMany?.({
        where: {
          empresaId,
          estado: 'PUBLICADO',
          ...(sucursalId ? { sucursalId } : {}),
        },
        include: { lineas: true },
      })) ?? [];

    const docsEnAsientos = new Set<string>();
    for (const asiento of asientosPublicados) {
      if (asiento.documentoReferencia) {
        docsEnAsientos.add(String(asiento.documentoReferencia));
      }
      for (const linea of asiento.lineas || []) {
        registrarMovimiento(
          linea.cuentaCodigo,
          Number(linea.debe || 0),
          Number(linea.haber || 0),
        );
      }
    }

    // 4c. Respaldo para Nóminas históricas aprobadas/pagadas sin AsientoContable persistido
    const planillas =
      (await (this.prisma as any).planilla?.findMany?.({
        where: {
          empresaId,
          estado: { in: ['APROBADA', 'PAGADA'] },
        },
        include: { periodo: true },
      })) ?? [];

    for (const p of planillas) {
      const anio = p.periodo?.anio;
      const mesStr = p.periodo?.mes
        ? String(p.periodo.mes).padStart(2, '0')
        : '00';
      const qStr = p.periodo?.quincena ? `Q${p.periodo.quincena}` : 'M';
      const refDev = p.asientoDevengoId || `AS-DEV-${anio}-${mesStr}-${qStr}`;
      const totalDev = Number(p.totalDevengado || 0);
      const totalPat = Number(p.totalPatronal || 0);
      const totalInatecVal = Number(
        p.totalInatec || this.round2(totalDev * 0.02),
      );
      const totalInssPat = Number(
        p.totalInssPatronal ||
          this.round2(Math.max(0, totalPat - totalInatecVal)),
      );
      const totalDed = Number(p.totalDeducciones || 0);
      const totalNet = Number(p.totalNeto || 0);
      const totalInssLab = this.round2(totalDev * 0.07);
      const totalIrRet = this.round2(Math.max(0, totalDed - totalInssLab));

      if (!docsEnAsientos.has(refDev) && totalDev > 0) {
        registrarMovimiento(BM_CUENTAS.GASTO_SALARIO_ORDINARIO.codigo, totalDev, 0);
        registrarMovimiento(BM_CUENTAS.GASTO_INSS_PATRONAL.codigo, totalInssPat, 0);
        registrarMovimiento(BM_CUENTAS.GASTO_INATEC.codigo, totalInatecVal, 0);
        registrarMovimiento(BM_CUENTAS.INSS_LABORAL_POR_PAGAR.codigo, 0, totalInssLab);
        registrarMovimiento(BM_CUENTAS.RETENCION_IR_POR_PAGAR.codigo, 0, totalIrRet);
        registrarMovimiento(BM_CUENTAS.INSS_PATRONAL_POR_PAGAR.codigo, 0, totalInssPat);
        registrarMovimiento(BM_CUENTAS.INATEC_POR_PAGAR.codigo, 0, totalInatecVal);
        registrarMovimiento(BM_CUENTAS.SUELDOS_POR_PAGAR.codigo, 0, totalNet);
      }

      const refPag = p.asientoPagoId || `AS-PAG-${anio}-${mesStr}-${qStr}`;
      if (p.estado === 'PAGADA' && !docsEnAsientos.has(refPag) && totalNet > 0) {
        registrarMovimiento(BM_CUENTAS.SUELDOS_POR_PAGAR.codigo, totalNet, 0);
        registrarMovimiento(BM_CUENTAS.BANCO_LAFISE.codigo, 0, totalNet);
      }
    }

    // 4d. Respaldo para Movimientos de Insumos históricos sin AsientoContable persistido
    const movsInsumos =
      (await (this.prisma as any).insumoMovimiento?.findMany?.({
        where: { empresaId },
        include: { insumo: { select: { categoria: true } } },
      })) ?? [];

    for (const m of movsInsumos) {
      if (docsEnAsientos.has(m.id) || (m.compraInsumoId && docsEnAsientos.has(m.compraInsumoId))) continue;
      const monto = this.round2(Number(m.costoTotal || 0));
      if (monto <= 0) continue;
      if (m.tipo === 'ENTRADA') {
        registrarMovimiento(BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.codigo, monto, 0);
        registrarMovimiento(BM_CUENTAS.PROVEEDORES_OTROS.codigo, 0, monto);
      } else if (m.tipo === 'SALIDA') {
        const ctaCosto = resolverCuentaConsumoInsumo(m.insumo?.categoria);
        registrarMovimiento(ctaCosto.codigo, monto, 0);
        registrarMovimiento(BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.codigo, 0, monto);
      }
    }

    // 5. Consolidar filas de detalle y propagar subtotales jerárquicos (N4 -> N3 -> N2 -> N1)
    let totalSaldoInicialDebe = 0;
    let totalSaldoInicialHaber = 0;
    let totalGeneralDebe = 0;
    let totalGeneralHaber = 0;
    let totalSaldoFinalDeudor = 0;
    let totalSaldoFinalAcreedor = 0;

    const childCodesByParent = new Set(
      catalogo
        .filter((c) => !c.aceptaMovimiento)
        .map((c) => c.codigo),
    );
    const parentAccum = new Map<
      string,
      {
        siDebe: number;
        siHaber: number;
        movDebe: number;
        movHaber: number;
        sfDeudor: number;
        sfAcreedor: number;
      }
    >();

    const accumulateParent = (
      parentCode: string,
      siDebe: number,
      siHaber: number,
      movDebe: number,
      movHaber: number,
      sfDeudor: number,
      sfAcreedor: number,
    ) => {
      if (!parentCode || !childCodesByParent.has(parentCode)) return;
      const cur = parentAccum.get(parentCode) || {
        siDebe: 0,
        siHaber: 0,
        movDebe: 0,
        movHaber: 0,
        sfDeudor: 0,
        sfAcreedor: 0,
      };
      parentAccum.set(parentCode, {
        siDebe: this.round2(cur.siDebe + siDebe),
        siHaber: this.round2(cur.siHaber + siHaber),
        movDebe: this.round2(cur.movDebe + movDebe),
        movHaber: this.round2(cur.movHaber + movHaber),
        sfDeudor: this.round2(cur.sfDeudor + sfDeudor),
        sfAcreedor: this.round2(cur.sfAcreedor + sfAcreedor),
      });
    };

    const leafValues = new Map<
      string,
      {
        siDebe: number;
        siHaber: number;
        movDebe: number;
        movHaber: number;
        sfDeudor: number;
        sfAcreedor: number;
      }
    >();

    const processedLeafCodes = new Set<string>();
    const extraLeaves: Array<{
      codigo: string;
      nombre: string;
      tipo: string;
      naturaleza: 'Deudora' | 'Acreedora';
      siDebe: number;
      siHaber: number;
      movDebe: number;
      movHaber: number;
      sfDeudor: number;
      sfAcreedor: number;
    }> = [];

    const processLeaf = (
      codigo: string,
      mayorCodigo?: string,
      extraMeta?: { nombre: string },
    ) => {
      processedLeafCodes.add(codigo);
      const si = saldosInicialesMap.get(codigo) || {
        deudor: 0,
        acreedor: 0,
      };
      const mov = movimientosMap.get(codigo) || { debe: 0, haber: 0 };

      // Balancear de forma simétrica para soportar cuentas con saldo contrario puntual (ej. sobregiros bancarios)
      const netoFinal = this.round2(
        si.deudor + mov.debe - (si.acreedor + mov.haber),
      );
      const sfDeudor = netoFinal > 0 ? netoFinal : 0;
      const sfAcreedor = netoFinal < 0 ? Math.abs(netoFinal) : 0;

      leafValues.set(codigo, {
        siDebe: si.deudor,
        siHaber: si.acreedor,
        movDebe: mov.debe,
        movHaber: mov.haber,
        sfDeudor,
        sfAcreedor,
      });

      totalSaldoInicialDebe = this.round2(totalSaldoInicialDebe + si.deudor);
      totalSaldoInicialHaber = this.round2(totalSaldoInicialHaber + si.acreedor);
      totalGeneralDebe = this.round2(totalGeneralDebe + mov.debe);
      totalGeneralHaber = this.round2(totalGeneralHaber + mov.haber);
      totalSaldoFinalDeudor = this.round2(totalSaldoFinalDeudor + sfDeudor);
      totalSaldoFinalAcreedor = this.round2(totalSaldoFinalAcreedor + sfAcreedor);

      const mayorCode =
        mayorCodigo || (codigo.length >= 4 ? codigo.slice(0, 4) : '');
      const rubroCode = codigo.length >= 2 ? codigo.slice(0, 2) : '';
      const claseCode = codigo.length >= 1 ? codigo.slice(0, 1) : '';

      for (const pCode of new Set([mayorCode, rubroCode, claseCode])) {
        if (pCode && pCode !== codigo) {
          accumulateParent(
            pCode,
            si.deudor,
            si.acreedor,
            mov.debe,
            mov.haber,
            sfDeudor,
            sfAcreedor,
          );
        }
      }

      if (extraMeta) {
        const cls = codigo.slice(0, 1);
        const esAcreedora = cls === '2' || cls === '3' || cls === '4';
        const tipoMap: Record<string, string> = {
          '1': 'Activo',
          '2': 'Pasivo',
          '3': 'Patrimonio',
          '4': 'Ingresos',
          '5': 'Costos',
          '6': 'Gastos',
        };
        extraLeaves.push({
          codigo,
          nombre: extraMeta.nombre,
          tipo: tipoMap[cls] || 'Otro',
          naturaleza: esAcreedora ? 'Acreedora' : 'Deudora',
          siDebe: si.deudor,
          siHaber: si.acreedor,
          movDebe: mov.debe,
          movHaber: mov.haber,
          sfDeudor,
          sfAcreedor,
        });
      }
    };

    for (const cta of catalogo) {
      if (!cta.aceptaMovimiento) continue;
      processLeaf(cta.codigo, cta.mayorCodigo);
    }

    // Incluir cuentas con saldo inicial o movimiento que no figuren en el catálogo base (ej. 110508 CONSTRUMARKET)
    for (const codigo of new Set([
      ...saldosInicialesMap.keys(),
      ...movimientosMap.keys(),
    ])) {
      if (processedLeafCodes.has(codigo)) continue;
      const si = saldosInicialesMap.get(codigo);
      processLeaf(codigo, undefined, {
        nombre: si?.nombre || `CUENTA ${codigo}`,
      });
    }

    const filasBalanza: BalanzaFila[] = catalogo.map((cta) => {
      const vals = cta.aceptaMovimiento
        ? leafValues.get(cta.codigo) || {
            siDebe: 0,
            siHaber: 0,
            movDebe: 0,
            movHaber: 0,
            sfDeudor: 0,
            sfAcreedor: 0,
          }
        : parentAccum.get(cta.codigo) || {
            siDebe: 0,
            siHaber: 0,
            movDebe: 0,
            movHaber: 0,
            sfDeudor: 0,
            sfAcreedor: 0,
          };

      return {
        codigo: cta.codigo,
        nombre: cta.nombre,
        nivel: cta.nivel,
        tipo: cta.tipo,
        naturaleza: cta.naturaleza,
        saldoInicialDebe: vals.siDebe,
        saldoInicialHaber: vals.siHaber,
        movimientoDebe: vals.movDebe,
        movimientoHaber: vals.movHaber,
        saldoFinalDeudor: vals.sfDeudor,
        saldoFinalAcreedor: vals.sfAcreedor,
        aceptaMovimiento: cta.aceptaMovimiento,
        esControl: cta.esControl,
      };
    });

    for (const extra of extraLeaves) {
      filasBalanza.push({
        codigo: extra.codigo,
        nombre: extra.nombre,
        nivel: 4,
        tipo: extra.tipo,
        naturaleza: extra.naturaleza,
        saldoInicialDebe: extra.siDebe,
        saldoInicialHaber: extra.siHaber,
        movimientoDebe: extra.movDebe,
        movimientoHaber: extra.movHaber,
        saldoFinalDeudor: extra.sfDeudor,
        saldoFinalAcreedor: extra.sfAcreedor,
        aceptaMovimiento: true,
        esControl: false,
      });
    }

    filasBalanza.sort((a, b) => a.codigo.localeCompare(b.codigo));

    const cuadrada =
      Math.abs(totalSaldoFinalDeudor - totalSaldoFinalAcreedor) < 0.05 &&
      Math.abs(totalGeneralDebe - totalGeneralHaber) < 0.05;

    return {
      fechaCorte: (fechaCorteInicial || new Date()).toISOString(),
      totalSaldoInicialDebe,
      totalSaldoInicialHaber,
      totalDebe: totalGeneralDebe,
      totalHaber: totalGeneralHaber,
      totalSaldoFinalDeudor,
      totalSaldoFinalAcreedor,
      cuadrada,
      cuentas: filasBalanza,
    };
  }

  // ==========================================================================
  // 3. LIBRO DIARIO DE PÓLIZAS AUTOMÁTICAS Y ASIENTOS PERSISTIDOS
  // ==========================================================================
  async getLibroDiario(empresaId: string, limit = 50): Promise<{
    totalPolizas: number;
    polizas: PolizaDiario[];
  }> {
    this.requireEmpresa(empresaId);

    const cxcConfig =
      (await (this.prisma as any).cxcConfiguracion?.findUnique?.({
        where: { empresaId },
      })) ?? null;
    const ctaClientes =
      cxcConfig?.cuentaMayorClientes || BM_CUENTAS.CXC_CLIENTES.codigo;
    const ctaAnticipos =
      cxcConfig?.cuentaAnticiposClientes ||
      BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.codigo;
    const ctaRetIrFavor =
      cxcConfig?.cuentaRetencionIrFavor || BM_CUENTAS.RETENCION_IR_FAVOR.codigo;

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
      if ((f as any).estado === 'CANCELADA') return;

      const subtotal = Number(f.subtotal);
      const iva = Number(f.iva);
      const total = Number(f.total);
      const retencion = Number(f.retencionIva || 0);

      const lineas: LineaPoliza[] = [];

      if (f.condicionPago === 'CONTADO') {
        const cuentaCaja = BM_CUENTAS.CAJA_GENERAL.codigo;
        const nombreCaja = BM_CUENTAS.CAJA_GENERAL.nombre;

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
            cuentaCodigo: ctaRetIrFavor,
            cuentaNombre: BM_CUENTAS.RETENCION_IR_FAVOR.nombre,
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
          cuentaCodigo: ctaClientes,
          cuentaNombre: BM_CUENTAS.CXC_CLIENTES.nombre,
          debe: total,
          haber: 0,
          sucursalId: f.sucursalId || 'KM10',
          clienteId: f.clienteId,
          concepto: `Facturación a crédito cliente ${f.cliente?.nombre || 'General'}`,
        });
      }

      const isMantenimiento =
        f.tipoFactura === TipoFactura.CARGO_DANOS ||
        Boolean((f as any).devolucionId);

      lineas.push({
        cuentaCodigo: isMantenimiento
          ? BM_CUENTAS.INGRESO_SERVICIOS_LOCALES.codigo
          : BM_CUENTAS.INGRESO_ALQUILER.codigo,
        cuentaNombre: isMantenimiento
          ? BM_CUENTAS.INGRESO_SERVICIOS_LOCALES.nombre
          : BM_CUENTAS.INGRESO_ALQUILER.nombre,
        debe: 0,
        haber: subtotal,
        sucursalId: f.sucursalId || 'KM10',
        concepto: isMantenimiento
          ? 'Servicios de mantenimiento y reparación en taller'
          : 'Ingreso por arrendamiento',
      });

      lineas.push({
        cuentaCodigo: BM_CUENTAS.IVA_POR_PAGAR.codigo,
        cuentaNombre: BM_CUENTAS.IVA_POR_PAGAR.nombre,
        debe: 0,
        haber: iva,
        sucursalId: f.sucursalId || 'KM10',
        concepto: 'IVA 15% devengado en factura',
      });

      const totalDebe = lineas.reduce((s, l) => s + l.debe, 0);
      const totalHaber = lineas.reduce((s, l) => s + l.haber, 0);

      polizas.push({
        id: f.id,
        numeroPoliza: isMantenimiento
          ? `POL-MAN-2026-${String(idx + 1).padStart(4, '0')}`
          : `POL-VTA-2026-${String(idx + 1).padStart(4, '0')}`,
        fecha: f.fechaEmision,
        tipoPoliza: isMantenimiento ? 'DIARIO' : 'VENTAS',
        concepto: isMantenimiento
          ? `Cobro Mantenimiento / Reparación según Factura ${f.folio} - ${f.cliente?.nombre || 'Cliente'}`
          : `Venta ${f.condicionPago} según Factura ${f.folio} - ${f.cliente?.nombre || 'Cliente'}`,
        referenciaDoc: f.folio,
        totalDebe: Math.round(totalDebe * 100) / 100,
        totalHaber: Math.round(totalHaber * 100) / 100,
        cuadrado: Math.abs(totalDebe - totalHaber) < 0.01,
        lineas,
      });

      // Si tiene pagos aplicados a crédito directos en facturación, generar póliza de cobro
      if (f.condicionPago === 'CREDITO' && f.pagos && f.pagos.length > 0) {
        f.pagos.forEach((p, pIdx) => {
          const montoPago = Number(p.monto);
          const lineasPago: LineaPoliza[] = [
            {
              cuentaCodigo: BM_CUENTAS.BANCO_LAFISE.codigo,
              cuentaNombre: BM_CUENTAS.BANCO_LAFISE.nombre,
              debe: montoPago,
              haber: 0,
              sucursalId: f.sucursalId || 'KM10',
              concepto: 'Abono recibido vía transferencia/banco',
            },
            {
              cuentaCodigo: ctaClientes,
              cuentaNombre: BM_CUENTAS.CXC_CLIENTES.nombre,
              debe: 0,
              haber: montoPago,
              sucursalId: f.sucursalId || 'KM10',
              clienteId: f.clienteId,
              concepto: isMantenimiento
                ? `Cancelación / Abono Factura Mantenimiento ${f.folio}`
                : `Cancelación / Abono Factura ${f.folio}`,
            },
          ];

          polizas.push({
            id: p.id,
            numeroPoliza: `POL-ING-2026-${String(idx + 1).padStart(3, '0')}-${pIdx + 1}`,
            fecha: f.fechaEmision,
            tipoPoliza: 'INGRESOS',
            concepto: isMantenimiento
              ? `Recibo de Cobro sobre Factura Mantenimiento ${f.folio} - ${f.cliente?.nombre || 'Cliente'}`
              : `Recibo de Cobro sobre Factura ${f.folio} - ${f.cliente?.nombre || 'Cliente'}`,
            referenciaDoc: `RC-${f.folio}`,
            totalDebe: montoPago,
            totalHaber: montoPago,
            cuadrado: true,
            lineas: lineasPago,
          });
        });
      }
    });

    // Asientos contables persistidos (CxC Recibos/Notas, Nómina, Insumos, Comisiones Externas)
    const asientosPublicados =
      (await (this.prisma as any).asientoContable?.findMany?.({
        where: { empresaId, estado: 'PUBLICADO' },
        include: { lineas: true },
        orderBy: { fecha: 'desc' },
        take: limit,
      })) ?? [];

    const docsEnAsientos = new Set<string>();
    for (const a of asientosPublicados) {
      if (a.documentoReferencia) docsEnAsientos.add(String(a.documentoReferencia));
      polizas.push({
        id: a.id,
        numeroPoliza: a.numeroAsiento,
        fecha: a.fecha,
        tipoPoliza: a.tipoAsiento || 'DIARIO',
        concepto: `[${a.origenModulo}] ${a.concepto}`,
        referenciaDoc: a.documentoReferencia || a.numeroAsiento,
        totalDebe: Number(a.totalDebe || 0),
        totalHaber: Number(a.totalHaber || 0),
        cuadrado: Boolean(a.cuadrado),
        lineas: (a.lineas || []).map((l: any) => ({
          cuentaCodigo: l.cuentaCodigo,
          cuentaNombre: l.cuentaNombre,
          debe: Number(l.debe || 0),
          haber: Number(l.haber || 0),
          sucursalId: a.sucursalId || 'KM10',
          clienteId: l.clienteId || undefined,
          concepto: l.conceptoLinea || a.concepto,
        })),
      });
    }

    // Mantenimientos de flota (610112 vs 210101)
    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: { equipo: { empresaId, sucursal: { empresaId } } },
      include: { equipo: { select: { codigo: true, modelo: true, sucursalId: true } } },
      orderBy: { fechaProgramacion: 'desc' },
      take: limit,
    });

    mantenimientos.forEach((m: any, idx: number) => {
      const costo = Number(m.costo || 0);
      if (costo <= 0) return;
      const suc = m.equipo?.sucursalId || 'KM10';
      const conceptoMnt = `Mantenimiento ${m.tipo} equipo ${m.equipo?.codigo || m.equipo?.modelo || ''}`;
      polizas.push({
        id: `mnt-${m.id}`,
        numeroPoliza: `POL-MNT-2026-${String(idx + 1).padStart(4, '0')}`,
        fecha: m.fechaProgramacion || m.createdAt || new Date(),
        tipoPoliza: 'EGRESOS',
        concepto: conceptoMnt,
        referenciaDoc: `MNT-${m.id.slice(0, 8).toUpperCase()}`,
        totalDebe: costo,
        totalHaber: costo,
        cuadrado: true,
        lineas: [
          {
            cuentaCodigo: BM_CUENTAS.GASTO_MANTENIMIENTO_MAQUINARIA.codigo,
            cuentaNombre: BM_CUENTAS.GASTO_MANTENIMIENTO_MAQUINARIA.nombre,
            debe: costo,
            haber: 0,
            sucursalId: suc,
            concepto: conceptoMnt,
          },
          {
            cuentaCodigo: BM_CUENTAS.PROVEEDORES_OTROS.codigo,
            cuentaNombre: BM_CUENTAS.PROVEEDORES_OTROS.nombre,
            debe: 0,
            haber: costo,
            sucursalId: suc,
            concepto: 'Cuenta por pagar taller/repuestos',
          },
        ],
      });
    });

    // Subarrendamientos de maquinaria de terceros (510106 vs 210101)
    const subarriendos =
      (await (this.prisma as any).detalleContrato?.findMany?.({
        where: {
          contrato: {
            estado: { in: ['ACTIVO', 'FINALIZADO'] },
            sucursal: { empresaId },
            cliente: { empresaId },
          },
          equipo: {
            OR: [{ origenEquipo: 'PROVEEDOR' }, { proveedorId: { not: null } }],
          },
        },
        include: {
          contrato: { select: { codigo: true, fechaInicio: true, sucursalId: true } },
          equipo: { select: { codigo: true, modelo: true, precioProveedor: true } },
        },
        take: limit,
      })) ?? [];

    subarriendos.forEach((sub: any, idx: number) => {
      const costoSub = this.round2(
        Number(sub.equipo?.precioProveedor || 0) * Number(sub.cantidad || 1),
      );
      if (costoSub <= 0) return;
      const suc = sub.contrato?.sucursalId || 'KM10';
      const conceptoSub = `Subarriendo maquinaria ${sub.equipo?.codigo || ''} - Contrato ${sub.contrato?.codigo || ''}`;
      polizas.push({
        id: `sub-${sub.id}`,
        numeroPoliza: `POL-SUB-2026-${String(idx + 1).padStart(4, '0')}`,
        fecha: sub.contrato?.fechaInicio || sub.createdAt || new Date(),
        tipoPoliza: 'EGRESOS',
        concepto: conceptoSub,
        referenciaDoc: sub.contrato?.codigo || `SUB-${sub.id.slice(0, 6)}`,
        totalDebe: costoSub,
        totalHaber: costoSub,
        cuadrado: true,
        lineas: [
          {
            cuentaCodigo: BM_CUENTAS.COSTO_SUBARRIENDO_MAQUINARIA.codigo,
            cuentaNombre: BM_CUENTAS.COSTO_SUBARRIENDO_MAQUINARIA.nombre,
            debe: costoSub,
            haber: 0,
            sucursalId: suc,
            concepto: conceptoSub,
          },
          {
            cuentaCodigo: BM_CUENTAS.PROVEEDORES_OTROS.codigo,
            cuentaNombre: BM_CUENTAS.PROVEEDORES_OTROS.nombre,
            debe: 0,
            haber: costoSub,
            sucursalId: suc,
            concepto: 'Cuenta por pagar a proveedor de maquinaria',
          },
        ],
      });
    });

    // Depósitos en garantía de contratos (110201 vs 210409 / ctaAnticipos)
    const contratos = await this.prisma.contrato.findMany({
      where: { sucursal: { empresaId }, cliente: { empresaId } },
      include: { cliente: { select: { nombre: true } } },
      take: limit,
    });

    contratos.forEach((c: any, idx: number) => {
      if (c.estado === 'CANCELADO') return;
      const dep = Number(c.depositoGarantia || 0);
      if (dep <= 0) return;
      const suc = c.sucursalId || 'KM10';
      polizas.push({
        id: `dep-${c.id}`,
        numeroPoliza: `POL-DEP-2026-${String(idx + 1).padStart(4, '0')}`,
        fecha: c.fechaInicio || c.createdAt || new Date(),
        tipoPoliza: 'INGRESOS',
        concepto: `Depósito en garantía Contrato ${c.codigo} - ${c.cliente?.nombre || 'Cliente'}`,
        referenciaDoc: c.codigo,
        totalDebe: dep,
        totalHaber: dep,
        cuadrado: true,
        lineas: [
          {
            cuentaCodigo: BM_CUENTAS.BANCO_LAFISE.codigo,
            cuentaNombre: BM_CUENTAS.BANCO_LAFISE.nombre,
            debe: dep,
            haber: 0,
            sucursalId: suc,
            concepto: 'Ingreso bancario por depósito en garantía',
          },
          {
            cuentaCodigo: ctaAnticipos,
            cuentaNombre: BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.nombre,
            debe: 0,
            haber: dep,
            sucursalId: suc,
            clienteId: c.clienteId,
            concepto: 'Depósito reembolsable / anticipo de cliente',
          },
        ],
      });
    });

    // Ordenar del más reciente al más antiguo respetando límite
    polizas.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );
    const resultPolizas = polizas.slice(0, limit);

    return {
      totalPolizas: resultPolizas.length,
      polizas: resultPolizas,
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
    const catalogo = await this.loadCatalogoEmpresa(empresaId);
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

    // Subarriendo de maquinaria externa de proveedores en contratos activos
    const subarriendos = await this.prisma.detalleContrato.findMany({
      where: {
        contrato: {
          estado: 'ACTIVO',
          sucursal: { empresaId },
        },
        equipo: {
          OR: [
            { origenEquipo: 'PROVEEDOR' },
            { proveedorId: { not: null } },
            { proveedorNombre: { not: null } },
          ],
        },
      },
      include: {
        contrato: {
          include: { cliente: { select: { nombre: true } } },
        },
        equipo: {
          include: {
            proveedor: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { contrato: { fechaInicio: 'desc' } },
    });

    let totalGastosMantenimiento = 0;
    let totalSubarriendoMaquinaria = 0;
    let totalPendientePago = 0;

    const itemsMantenimiento = mantenimientos.map((m) => {
      const costo = Number(m.costo);
      totalGastosMantenimiento += costo;
      const esPendiente = m.estado !== 'COMPLETADO';
      if (esPendiente) totalPendientePago += costo;

      return {
        id: m.id,
        concepto: `Mantenimiento ${m.tipo} - ${m.equipo.modelo} (${m.equipo.marca?.nombre || 'General'})`,
        categoria: 'MANTENIMIENTO_Y_TALLER',
        equipoModelo: m.equipo.modelo,
        tipo: m.tipo,
        costo,
        insumos: m.insumosUtilizados || 'Mano de Obra y Repuestos',
        fechaProgramada: m.fechaProgramacion,
        estado: m.estado,
      };
    });

    const itemsSubarriendo = subarriendos.map((s) => {
      const sub = s as any;
      const precioProv = Number(sub.equipo?.precioProveedor || 0);
      const cantidad = Number(sub.cantidad || 1);
      const costoEstimado = precioProv * cantidad;
      totalSubarriendoMaquinaria += costoEstimado;
      totalPendientePago += costoEstimado;

      const provNombre =
        sub.equipo?.proveedor?.nombre || sub.equipo?.proveedorNombre || 'Proveedor externo';

      return {
        id: sub.id,
        concepto: `Subalquiler de Equipo - ${sub.equipo?.modelo || 'Equipo'} (${sub.equipo?.codigo || 'Sin código'})`,
        categoria: 'MAQUINARIA_PROVEEDOR',
        proveedorNombre: provNombre,
        proveedorId: sub.equipo?.proveedorId,
        equipoModelo: sub.equipo?.modelo,
        equipoCodigo: sub.equipo?.codigo,
        contratoCodigo: sub.contrato?.codigo,
        clienteNombre: sub.contrato?.cliente?.nombre || 'Cliente',
        tipo: 'SUBARRIENDO',
        costo: costoEstimado,
        insumos: `Contrato ${sub.contrato?.codigo || '---'} - ${sub.contrato?.cliente?.nombre || ''}`,
        fechaProgramada: sub.contrato?.fechaInicio || new Date(),
        estado: 'EN_RENTA_ACTIVA',
      };
    });

    const cuentasPorPagar = [...itemsSubarriendo, ...itemsMantenimiento];

    return {
      resumenGlobal: {
        totalGastosMantenimiento,
        totalSubarriendoMaquinaria,
        totalPendientePago,
        totalPagado: totalGastosMantenimiento - (totalPendientePago - totalSubarriendoMaquinaria),
      },
      cuentasPorPagar,
    };
  }

  // ==========================================================================
  // 7. ESTADO DE RESULTADOS (P&L) — INTEGRADO AL LIBRO CONTABLE BM
  // ==========================================================================
  private async getDatosLibroMayor(empresaId: string) {
    const saldosInicialesRows =
      (await this.prisma.saldoInicialContable?.findMany?.({
        where: { empresaId },
      })) ?? [];

    const asientosPublicados =
      (await (this.prisma as any).asientoContable?.findMany?.({
        where: { empresaId, estado: 'PUBLICADO' },
        include: { lineas: true },
        orderBy: { fecha: 'desc' },
      })) ?? [];

    const catalogo = await this.loadCatalogoEmpresa(empresaId);
    const catalogoMap = new Map(catalogo.map((c) => [c.codigo, c]));

    const docsEnAsientos = new Set<string>();
    for (const a of asientosPublicados) {
      if (a.documentoReferencia) docsEnAsientos.add(String(a.documentoReferencia));
    }

    return {
      saldosInicialesRows,
      asientosPublicados,
      catalogoMap,
      docsEnAsientos,
      hasLedgerData: saldosInicialesRows.length > 0 || asientosPublicados.length > 0,
    };
  }

  async getEstadoResultados(empresaId: string) {
    this.requireEmpresa(empresaId);

    const facturas = await this.prisma.factura.findMany({
      where: { empresaId, cliente: { empresaId } },
    });

    const facturasValidas = facturas.filter((f) => (f as any).estado !== 'CANCELADA');
    const ingresosAlquiler = facturasValidas.reduce(
      (sum, f) => sum + Number(f.total),
      0,
    );
    const subtotalIngresos = facturasValidas.reduce(
      (sum, f) => sum + Number(f.subtotal),
      0,
    );
    const ivaRecaudado = facturasValidas.reduce((sum, f) => sum + Number(f.iva), 0);

    const mantenimientos = await this.prisma.mantenimiento.findMany({
      where: { equipo: { empresaId, sucursal: { empresaId } } },
    });

    const costoMantenimiento = mantenimientos.reduce(
      (sum, m) => sum + Number(m.costo),
      0,
    );

    const subarriendos =
      (await (this.prisma as any).detalleContrato?.findMany?.({
        where: {
          contrato: {
            estado: { in: ['ACTIVO', 'FINALIZADO'] },
            sucursal: { empresaId },
            cliente: { empresaId },
          },
          equipo: {
            OR: [{ origenEquipo: 'PROVEEDOR' }, { proveedorId: { not: null } }],
          },
        },
        include: { equipo: { select: { precioProveedor: true } } },
      })) ?? [];

    const costoSubarriendos = this.round2(
      subarriendos.reduce(
        (sum: number, s: any) =>
          sum + Number(s.equipo?.precioProveedor || 0) * Number(s.cantidad || 1),
        0,
      ),
    );

    const salidasInsumos =
      (await (this.prisma as any).insumoMovimiento?.findMany?.({
        where: { empresaId, tipo: 'SALIDA' },
      })) ?? [];

    const insumoMovIds = new Set(salidasInsumos.map((m: any) => String(m.id)));
    const costoConsumoInsumos = this.round2(
      salidasInsumos.reduce((sum: number, m: any) => sum + Number(m.costoTotal || 0), 0),
    );

    const planillas =
      (await (this.prisma as any).planilla?.findMany?.({
        where: { empresaId, estado: { in: ['APROBADA', 'PAGADA'] } },
        include: { periodo: true },
      })) ?? [];

    const planillaRefs = new Set<string>();
    for (const p of planillas) {
      const anio = p.periodo?.anio;
      const mesStr = p.periodo?.mes ? String(p.periodo.mes).padStart(2, '0') : '00';
      const qStr = p.periodo?.quincena ? `Q${p.periodo.quincena}` : 'M';
      planillaRefs.add(p.asientoDevengoId || `AS-DEV-${anio}-${mesStr}-${qStr}`);
      planillaRefs.add(p.asientoPagoId || `AS-PAG-${anio}-${mesStr}-${qStr}`);
    }

    const costoNomina = this.round2(
      planillas.reduce(
        (sum: number, p: any) =>
          sum + Number(p.totalDevengado || 0) + Number(p.totalPatronal || 0),
        0,
      ),
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

    // Integrar saldos iniciales (4xxx, 5xxx, 6xxx, 7xxx) y asientos persistidos no duplicados
    const { saldosInicialesRows, asientosPublicados, catalogoMap } =
      await this.getDatosLibroMayor(empresaId);

    const erCuentasMap = new Map<
      string,
      { codigo: string; nombre: string; grupo: 'INGRESO' | 'COSTO' | 'GASTO'; neto: number }
    >();
    const addErCuenta = (codigo: string, deltaAcreedor: number) => {
      if (!codigo) return;
      const cls = codigo.slice(0, 1);
      if (cls !== '4' && cls !== '5' && cls !== '6' && cls !== '7') return;
      const grupo: 'INGRESO' | 'COSTO' | 'GASTO' =
        cls === '4' ? 'INGRESO' : cls === '5' ? 'COSTO' : 'GASTO';
      const nombre =
        catalogoMap.get(codigo)?.nombre || `Cuenta ${codigo}`;
      const prev = erCuentasMap.get(codigo) || { codigo, nombre, grupo, neto: 0 };
      // Para INGRESO sumamos Haber - Debe; para COSTO/GASTO sumamos Debe - Haber
      const valor = grupo === 'INGRESO' ? deltaAcreedor : -deltaAcreedor;
      prev.neto = this.round2(prev.neto + valor);
      erCuentasMap.set(codigo, prev);
    };

    for (const s of saldosInicialesRows) {
      const deltaAcreedor = Number(s.acreedor || 0) - Number(s.deudor || 0);
      if (deltaAcreedor !== 0) addErCuenta(s.cuentaCodigo, deltaAcreedor);
    }

    for (const asiento of asientosPublicados) {
      const ref = String(asiento.documentoReferencia || '');
      if (ref && (planillaRefs.has(ref) || insumoMovIds.has(ref))) {
        continue;
      }
      for (const l of asiento.lineas || []) {
        const deltaAcreedor = Number(l.haber || 0) - Number(l.debe || 0);
        if (deltaAcreedor !== 0) addErCuenta(l.cuentaCodigo, deltaAcreedor);
      }
    }

    let ingresosLibroBM = 0;
    let otrosIngresosYFinancieros = 0;
    let descuentosSobreVentas = 0;
    let otrosCostosVentaBM = 0;
    let gastosOperativosYFinancierosBM = 0;

    for (const cta of erCuentasMap.values()) {
      if (cta.grupo === 'INGRESO') {
        if (cta.codigo === '410103') {
          descuentosSobreVentas = this.round2(descuentosSobreVentas - cta.neto);
        } else if (cta.codigo.startsWith('4101')) {
          ingresosLibroBM = this.round2(ingresosLibroBM + cta.neto);
        } else {
          otrosIngresosYFinancieros = this.round2(otrosIngresosYFinancieros + cta.neto);
        }
      } else if (cta.grupo === 'COSTO') {
        otrosCostosVentaBM = this.round2(otrosCostosVentaBM + cta.neto);
      } else {
        gastosOperativosYFinancierosBM = this.round2(
          gastosOperativosYFinancierosBM + cta.neto,
        );
      }
    }

    const ingresosTotalesBrutos = this.round2(
      ingresosAlquiler +
        ingresosPorDanio +
        ingresosLibroBM +
        otrosIngresosYFinancieros -
        descuentosSobreVentas,
    );
    const utilidadBruta = this.round2(
      ingresosTotalesBrutos -
        costoMantenimiento -
        costoSubarriendos -
        costoConsumoInsumos -
        otrosCostosVentaBM,
    );

    const gastosAdministrativos = this.round2(
      costoNomina + gastosOperativosYFinancierosBM,
    );
    const utilidadNeta = this.round2(utilidadBruta - gastosAdministrativos);

    const listaEr = Array.from(erCuentasMap.values())
      .filter((c) => Math.abs(c.neto) > 0)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    return {
      periodo: 'Ejercicio Fiscal Actual',
      ingresos: {
        facturacionAlquiler: ingresosAlquiler,
        subtotalSinIva: subtotalIngresos,
        ivaRecaudado,
        cargosPorDanio: ingresosPorDanio,
        ingresosLibroBM,
        otrosIngresosYFinancieros,
        descuentosSobreVentas,
        totalIngresosBrutos: ingresosTotalesBrutos,
      },
      costosOperativos: {
        mantenimientoYRepuestos: costoMantenimiento,
        subarriendoMaquinaria: costoSubarriendos,
        consumoInsumosTaller: costoConsumoInsumos,
        otrosCostosVentaBM,
        nominaYLaboral: costoNomina,
        gastosOperativosYFinancierosBM,
        gastosAdministrativos,
        totalCostosYGastos: this.round2(
          costoMantenimiento +
            costoSubarriendos +
            costoConsumoInsumos +
            otrosCostosVentaBM +
            gastosAdministrativos,
        ),
      },
      indicadoresFinancieros: {
        utilidadBruta,
        utilidadNeta,
        margenUtilidadNetaPorcentaje:
          ingresosTotalesBrutos > 0
            ? Math.round((utilidadNeta / ingresosTotalesBrutos) * 10000) / 100
            : 0,
      },
      desgloseContableBM: {
        ingresos: listaEr.filter((c) => c.grupo === 'INGRESO'),
        costos: listaEr.filter((c) => c.grupo === 'COSTO'),
        gastos: listaEr.filter((c) => c.grupo === 'GASTO'),
      },
    };
  }

  // ==========================================================================
  // 8. BALANCE GENERAL — INTEGRADO A SALDOS INICIALES, ASIENTOS Y MÓDULOS BM
  // ==========================================================================
  async getBalanceGeneral(empresaId: string) {
    this.requireEmpresa(empresaId);

    const pagos = await this.prisma.pago.findMany({
      where: { factura: { empresaId, cliente: { empresaId } } },
    });
    const pagosOperativos = pagos.reduce((sum, p) => sum + Number(p.monto), 0);

    const cxc = await this.getCuentasPorCobrar(empresaId);
    const cxcPendienteOperativo = cxc.resumenGlobal.totalPendiente;

    const contratos = await this.prisma.contrato.findMany({
      where: { sucursal: { empresaId }, cliente: { empresaId } },
    });
    const depositosGarantia = contratos
      .filter((c) => (c as any).estado !== 'CANCELADO')
      .reduce((sum, c) => sum + Number(c.depositoGarantia), 0);

    const equipos = await this.prisma.equipo.findMany({
      where: { empresaId, sucursal: { empresaId } },
    });
    // Solo equipos con costo de adquisición real documentado en ficha
    const valorFlotaMaquinaria = equipos.reduce(
      (sum, e) =>
        sum + (e.costoAdquisicion ? Number(e.costoAdquisicion) : 0),
      0,
    );

    const cxp = await this.getCuentasPorPagar(empresaId);
    const cxpPendienteOperativo = cxp.resumenGlobal.totalPendientePago;

    const { saldosInicialesRows, asientosPublicados, catalogoMap, docsEnAsientos, hasLedgerData } =
      await this.getDatosLibroMayor(empresaId);

    if (!hasLedgerData) {
      const totalActivoCorriente =
        pagosOperativos + cxcPendienteOperativo + depositosGarantia;
      const totalActivoNoCorriente = valorFlotaMaquinaria;
      const totalActivos = totalActivoCorriente + totalActivoNoCorriente;
      const totalPasivos = cxpPendienteOperativo + depositosGarantia;
      const patrimonioCapital = totalActivos - totalPasivos;

      return {
        fechaCorte: new Date().toISOString(),
        integradoConLibroBM: false,
        activos: {
          corrientes: {
            efectivoYBancos: pagosOperativos,
            cuentasPorCobrar: cxcPendienteOperativo,
            anticiposEImpuestosFavor: 0,
            inventarioTaller: 0,
            depositosGarantiaCustodiados: depositosGarantia,
            totalActivoCorriente,
          },
          noCorrientes: {
            flotaMaquinariaYEquipos: valorFlotaMaquinaria,
            activosFijosLibroBM: 0,
            depreciacionAcumulada: 0,
            totalActivoNoCorriente,
          },
          totalActivos,
        },
        pasivos: {
          corrientes: {
            cuentasPorPagar: cxpPendienteOperativo,
            impuestosYCargasPorPagar: 0,
            garantiasPorDevolver: depositosGarantia,
            totalPasivos: totalPasivos,
          },
          noCorrientes: {
            prestamosBancariosLP: 0,
          },
          totalPasivosGeneral: totalPasivos,
        },
        patrimonio: {
          capitalContableYUtilidades: patrimonioCapital,
          resultadoDelEjercicio: 0,
          totalPatrimonio: patrimonioCapital,
        },
        diferenciaEcuacion: 0,
        equilibrioContable: totalActivos === totalPasivos + patrimonioCapital,
      };
    }

    // Consolidación completa con saldos iniciales + asientos automáticos/manuales + fallbacks
    const ledgerNetDebe = new Map<string, number>();
    const addLedger = (codigo: string, deltaDebe: number) => {
      if (!codigo || deltaDebe === 0) return;
      ledgerNetDebe.set(codigo, this.round2((ledgerNetDebe.get(codigo) || 0) + deltaDebe));
    };

    for (const s of saldosInicialesRows) {
      addLedger(s.cuentaCodigo, Number(s.deudor || 0) - Number(s.acreedor || 0));
    }
    for (const a of asientosPublicados) {
      for (const l of a.lineas || []) {
        addLedger(l.cuentaCodigo, Number(l.debe || 0) - Number(l.haber || 0));
      }
    }

    // Insumos históricos sin asiento persistido
    const movsInsumos =
      (await (this.prisma as any).insumoMovimiento?.findMany?.({
        where: { empresaId },
      })) ?? [];
    for (const m of movsInsumos) {
      if (docsEnAsientos.has(m.id) || (m.compraInsumoId && docsEnAsientos.has(m.compraInsumoId))) continue;
      const monto = this.round2(Number(m.costoTotal || 0));
      if (monto <= 0) continue;
      if (m.tipo === 'ENTRADA') {
        addLedger(BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.codigo, monto);
        addLedger(BM_CUENTAS.PROVEEDORES_OTROS.codigo, -monto);
      } else if (m.tipo === 'SALIDA') {
        addLedger(BM_CUENTAS.COSTO_OTROS.codigo, monto);
        addLedger(BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.codigo, -monto);
      }
    }

    // Nómina histórica sin asiento persistido
    const planillas =
      (await (this.prisma as any).planilla?.findMany?.({
        where: { empresaId, estado: { in: ['APROBADA', 'PAGADA'] } },
        include: { periodo: true },
      })) ?? [];
    for (const p of planillas) {
      const anio = p.periodo?.anio;
      const mesStr = p.periodo?.mes ? String(p.periodo.mes).padStart(2, '0') : '00';
      const qStr = p.periodo?.quincena ? `Q${p.periodo.quincena}` : 'M';
      const refDev = p.asientoDevengoId || `AS-DEV-${anio}-${mesStr}-${qStr}`;
      const totalDev = Number(p.totalDevengado || 0);
      const totalPat = Number(p.totalPatronal || 0);
      const totalInatecVal = Number(p.totalInatec || this.round2(totalDev * 0.02));
      const totalInssPat = Number(
        p.totalInssPatronal || this.round2(Math.max(0, totalPat - totalInatecVal)),
      );
      const totalDed = Number(p.totalDeducciones || 0);
      const totalNet = Number(p.totalNeto || 0);
      const totalInssLab = this.round2(totalDev * 0.07);
      const totalIrRet = this.round2(Math.max(0, totalDed - totalInssLab));
      if (!docsEnAsientos.has(refDev) && totalDev > 0) {
        addLedger(BM_CUENTAS.GASTO_SALARIO_ORDINARIO.codigo, totalDev);
        addLedger(BM_CUENTAS.GASTO_INSS_PATRONAL.codigo, totalInssPat);
        addLedger(BM_CUENTAS.GASTO_INATEC.codigo, totalInatecVal);
        addLedger(BM_CUENTAS.INSS_LABORAL_POR_PAGAR.codigo, -totalInssLab);
        addLedger(BM_CUENTAS.RETENCION_IR_POR_PAGAR.codigo, -totalIrRet);
        addLedger(BM_CUENTAS.INSS_PATRONAL_POR_PAGAR.codigo, -totalInssPat);
        addLedger(BM_CUENTAS.INATEC_POR_PAGAR.codigo, -totalInatecVal);
        addLedger(BM_CUENTAS.SUELDOS_POR_PAGAR.codigo, -totalNet);
      }
      const refPag = p.asientoPagoId || `AS-PAG-${anio}-${mesStr}-${qStr}`;
      if (p.estado === 'PAGADA' && !docsEnAsientos.has(refPag) && totalNet > 0) {
        addLedger(BM_CUENTAS.SUELDOS_POR_PAGAR.codigo, totalNet);
        addLedger(BM_CUENTAS.BANCO_LAFISE.codigo, -totalNet);
      }
    }

    const sumPrefixDebe = (prefix: string) => {
      let s = 0;
      for (const [k, v] of ledgerNetDebe.entries()) {
        if (k.startsWith(prefix)) s += v;
      }
      return this.round2(s);
    };

    const efectivoYBancos = this.round2(
      pagosOperativos + sumPrefixDebe('1101') + sumPrefixDebe('1102'),
    );
    const cuentasPorCobrar = this.round2(
      Math.max(0, cxcPendienteOperativo + sumPrefixDebe('1103')),
    );
    const anticiposEImpuestosFavor = this.round2(
      sumPrefixDebe('1105') + sumPrefixDebe('1107'),
    );
    const inventarioTaller = this.round2(Math.max(0, sumPrefixDebe('1210')));
    const depositosGarantiaCustodiados = this.round2(
      depositosGarantia + sumPrefixDebe('120106'),
    );
    const totalActivoCorriente = this.round2(
      efectivoYBancos +
        cuentasPorCobrar +
        anticiposEImpuestosFavor +
        inventarioTaller +
        depositosGarantiaCustodiados,
    );

    const activosFijosLibroBM = this.round2(
      sumPrefixDebe('1201') - sumPrefixDebe('120106'),
    );
    const depreciacionAcumulada = this.round2(Math.max(0, -sumPrefixDebe('1209')));
    const totalActivoNoCorriente = this.round2(
      valorFlotaMaquinaria + activosFijosLibroBM - depreciacionAcumulada,
    );
    const totalActivos = this.round2(totalActivoCorriente + totalActivoNoCorriente);

    const cuentasPorPagar = this.round2(
      cxpPendienteOperativo - sumPrefixDebe('2101') - sumPrefixDebe('2105'),
    );
    const impuestosYCargasPorPagar = this.round2(
      -sumPrefixDebe('2102') - sumPrefixDebe('2103') - sumPrefixDebe('2104'),
    );
    const garantiasPorDevolver = this.round2(
      depositosGarantia - sumPrefixDebe('2106'),
    );
    const totalPasivoCorriente = this.round2(
      cuentasPorPagar + impuestosYCargasPorPagar + garantiasPorDevolver,
    );
    const prestamosBancariosLP = this.round2(-sumPrefixDebe('2201'));
    const totalPasivosGeneral = this.round2(
      totalPasivoCorriente + prestamosBancariosLP,
    );

    const capitalContableYUtilidades = this.round2(-sumPrefixDebe('3'));
    const resultadoDelEjercicio = this.round2(
      totalActivos - totalPasivosGeneral - capitalContableYUtilidades,
    );
    const totalPatrimonio = this.round2(
      capitalContableYUtilidades + resultadoDelEjercicio,
    );

    const cuentasBalanceBM = Array.from(ledgerNetDebe.entries())
      .filter(([k, v]) => Number(k.slice(0, 1)) <= 3 && Math.abs(v) > 0)
      .map(([codigo, debeNeto]) => {
        const meta = catalogoMap.get(codigo);
        const esDeudora = codigo.startsWith('1') && !codigo.startsWith('1209');
        return {
          codigo,
          nombre: meta?.nombre || `Cuenta ${codigo}`,
          rubro: meta?.mayorNombre || 'General',
          saldo: this.round2(esDeudora ? debeNeto : -debeNeto),
        };
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    return {
      fechaCorte: new Date().toISOString(),
      integradoConLibroBM: true,
      activos: {
        corrientes: {
          efectivoYBancos,
          cuentasPorCobrar,
          anticiposEImpuestosFavor,
          inventarioTaller,
          depositosGarantiaCustodiados,
          totalActivoCorriente,
        },
        noCorrientes: {
          flotaMaquinariaYEquipos: this.round2(
            valorFlotaMaquinaria + activosFijosLibroBM,
          ),
          activosFijosLibroBM,
          depreciacionAcumulada,
          totalActivoNoCorriente,
        },
        totalActivos,
      },
      pasivos: {
        corrientes: {
          cuentasPorPagar,
          impuestosYCargasPorPagar,
          garantiasPorDevolver,
          totalPasivos: totalPasivoCorriente,
        },
        noCorrientes: {
          prestamosBancariosLP,
        },
        totalPasivosGeneral,
      },
      patrimonio: {
        capitalContableYUtilidades,
        resultadoDelEjercicio,
        totalPatrimonio,
      },
      diferenciaEcuacion: this.round2(
        totalActivos - (totalPasivosGeneral + totalPatrimonio),
      ),
      equilibrioContable:
        Math.abs(totalActivos - (totalPasivosGeneral + totalPatrimonio)) < 0.05,
      cuentasBalanceBM,
    };
  }

  // ==========================================================================
  // 8. DATOS Y SALDOS INICIALES + IMPORTACIÓN DE CATÁLOGO EXCEL BM
  // ==========================================================================
  private buildHierarchyFromDetailRows(rows: CuentaCatalogoInputDto[]) {
    const classMeta: Record<
      string,
      { nombre: string; tipo: string; naturaleza: 'Deudora' | 'Acreedora'; qbTipo: string }
    > = {
      '1': { nombre: 'ACTIVO', tipo: 'ACTIVO', naturaleza: 'Deudora', qbTipo: 'Asset' },
      '2': { nombre: 'PASIVO', tipo: 'PASIVO', naturaleza: 'Acreedora', qbTipo: 'Liability' },
      '3': { nombre: 'CAPITAL CONTABLE', tipo: 'PATRIMONIO', naturaleza: 'Acreedora', qbTipo: 'Equity' },
      '4': { nombre: 'INGRESOS', tipo: 'INGRESO', naturaleza: 'Acreedora', qbTipo: 'Income' },
      '5': { nombre: 'COSTO DE VENTAS', tipo: 'COSTO', naturaleza: 'Deudora', qbTipo: 'Cost of Goods Sold' },
      '6': { nombre: 'GASTOS DE OPERACION', tipo: 'GASTO', naturaleza: 'Deudora', qbTipo: 'Expense' },
      '7': { nombre: 'OTROS GASTOS', tipo: 'GASTO', naturaleza: 'Deudora', qbTipo: 'Other Expense' },
    };

    const rubroNames: Record<string, string> = {
      '11': 'ACTIVO CIRCULANTE',
      '12': 'ACTIVO NO CIRCULANTE',
      '21': 'PASIVO CIRCULANTE',
      '22': 'PASIVO NO CIRCULANTE',
      '31': 'PATRIMONIO',
      '41': 'INGRESOS OPERATIVOS',
      '51': 'COSTOS OPERATIVOS',
      '61': 'GASTOS OPERATIVOS',
    };

    const nodes = new Map<string, Omit<CuentaCatalogo, 'qbClass'> & { qbClass: string }>();

    for (const raw of rows) {
      const codigo = raw.codigo.trim();
      const cls = codigo.slice(0, 1);
      const rub = codigo.slice(0, 2);
      const mayor = (raw.mayorCodigo || codigo.slice(0, 4)).trim();
      const meta = classMeta[cls] || {
        nombre: `CLASE ${cls}`,
        tipo: 'OTRO',
        naturaleza: raw.naturaleza,
        qbTipo: raw.qbTipo || 'Expense',
      };

      if (cls && !nodes.has(cls)) {
        nodes.set(cls, {
          codigo: cls,
          nombre: meta.nombre,
          nivel: 1,
          tipo: meta.tipo,
          naturaleza: meta.naturaleza,
          aceptaMovimiento: false,
          esControl: true,
          estado: raw.estado || (Number(cls) <= 3 ? 'BG' : 'ER'),
          modulo: 'Contabilidad',
          dimensiones: 'Empresa',
          nota: 'Nivel 1 - Clase Contable',
          qbTipo: meta.qbTipo,
          qbNombre: meta.nombre,
          qbClass: '',
        });
      }

      if (rub.length >= 2 && !nodes.has(rub)) {
        nodes.set(rub, {
          codigo: rub,
          nombre: rubroNames[rub] || `${meta.nombre} RUBRO ${rub}`,
          nivel: 2,
          tipo: meta.tipo,
          naturaleza: meta.naturaleza,
          aceptaMovimiento: false,
          esControl: true,
          estado: raw.estado || (Number(cls) <= 3 ? 'BG' : 'ER'),
          modulo: 'Contabilidad',
          dimensiones: 'Empresa',
          nota: 'Nivel 2 - Rubro Contable',
          qbTipo: meta.qbTipo,
          qbNombre: rubroNames[rub] || `${meta.nombre} RUBRO ${rub}`,
          qbClass: '',
        });
      }

      if (mayor && mayor !== codigo && !nodes.has(mayor)) {
        const mayorNombre = (raw.mayorNombre || `MAYOR ${mayor}`).trim();
        nodes.set(mayor, {
          codigo: mayor,
          nombre: mayorNombre,
          nivel: 3,
          tipo: meta.tipo,
          naturaleza: raw.naturaleza || meta.naturaleza,
          aceptaMovimiento: false,
          esControl: true,
          mayorCodigo: mayor,
          mayorNombre,
          estado: raw.estado || (Number(cls) <= 3 ? 'BG' : 'ER'),
          renglon: raw.renglon,
          modulo: 'Contabilidad',
          dimensiones: 'Empresa',
          nota: 'Nivel 3 - Cuenta de Mayor',
          qbTipo: meta.qbTipo,
          qbNombre: mayorNombre,
          qbClass: '',
        });
      }

      const detailName = raw.nombre.trim();
      nodes.set(codigo, {
        codigo,
        nombre: detailName,
        nivel: 4,
        tipo: meta.tipo,
        naturaleza: raw.naturaleza || meta.naturaleza,
        aceptaMovimiento: true,
        esControl: false,
        mayorCodigo: mayor || undefined,
        mayorNombre: raw.mayorNombre?.trim() || undefined,
        estado: raw.estado?.trim() || undefined,
        renglon: raw.renglon?.trim() || undefined,
        modulo: 'Contabilidad',
        dimensiones: 'Empresa',
        nota: '',
        qbTipo: raw.qbTipo?.trim() || meta.qbTipo,
        qbNombre: `${codigo} - ${detailName}`,
        qbClass: '',
      });
    }

    return Array.from(nodes.values()).sort((a, b) =>
      a.codigo.localeCompare(b.codigo),
    );
  }

  async getSaldosIniciales(empresaId: string) {
    this.requireEmpresa(empresaId);

    const [catalogo, rows] = await Promise.all([
      this.loadCatalogoEmpresa(empresaId),
      this.prisma.saldoInicialContable?.findMany?.({
        where: { empresaId },
        orderBy: { cuentaCodigo: 'asc' },
      }) ?? Promise.resolve([]),
    ]);

    const detalleCatalogo = catalogo.filter(
      (c) => c.aceptaMovimiento || c.nivel === 4,
    );
    const saldosMap = new Map(rows.map((r) => [r.cuentaCodigo, r]));
    let fechaCorte: Date | null = null;
    for (const r of rows) {
      if (!fechaCorte || r.fechaCorte > fechaCorte) {
        fechaCorte = r.fechaCorte;
      }
    }

    let totalDeudor = 0;
    let totalAcreedor = 0;
    let cuentasConSaldo = 0;

    const items = detalleCatalogo.map((c) => {
      const s = saldosMap.get(c.codigo);
      const deudor = this.round2(s ? Number(s.deudor) : 0);
      const acreedor = this.round2(s ? Number(s.acreedor) : 0);
      totalDeudor = this.round2(totalDeudor + deudor);
      totalAcreedor = this.round2(totalAcreedor + acreedor);
      if (deudor > 0 || acreedor > 0) cuentasConSaldo += 1;

      return {
        codigo: c.codigo,
        nombre: c.nombre,
        mayorCodigo: c.mayorCodigo || c.codigo.slice(0, 4),
        mayorNombre: c.mayorNombre || '',
        naturaleza: c.naturaleza,
        estado: c.estado || '',
        renglon: c.renglon || '',
        deudor,
        acreedor,
        notas: s?.notas || '',
        fechaCorte: s?.fechaCorte?.toISOString() || null,
      };
    });

    // Incluir saldos iniciales cuya cuenta no figure en el catálogo base (ej. 110508 CONSTRUMARKET) para mantener el cuadre exacto
    const detalleCodes = new Set(detalleCatalogo.map((c) => c.codigo));
    for (const r of rows) {
      if (detalleCodes.has(r.cuentaCodigo)) continue;
      const deudor = this.round2(Number(r.deudor));
      const acreedor = this.round2(Number(r.acreedor));
      totalDeudor = this.round2(totalDeudor + deudor);
      totalAcreedor = this.round2(totalAcreedor + acreedor);
      if (deudor > 0 || acreedor > 0) cuentasConSaldo += 1;

      const cls = r.cuentaCodigo.slice(0, 1);
      const esAcreedora = cls === '2' || cls === '3' || cls === '4';
      items.push({
        codigo: r.cuentaCodigo,
        nombre: String(r.cuentaNombre || r.cuentaCodigo).toUpperCase(),
        mayorCodigo: r.cuentaCodigo.slice(0, 4),
        mayorNombre: '',
        naturaleza: esAcreedora ? 'Acreedora' : 'Deudora',
        estado: cls <= '3' ? 'BG' : 'ER',
        renglon: '',
        deudor,
        acreedor,
        notas: r.notas || '',
        fechaCorte: r.fechaCorte?.toISOString() || null,
      });
    }
    items.sort((a, b) => a.codigo.localeCompare(b.codigo));

    const diferencia = this.round2(totalDeudor - totalAcreedor);
    return {
      fechaCorte: (fechaCorte || new Date('2026-10-31T12:00:00Z')).toISOString().slice(0, 10),
      totalDeudor,
      totalAcreedor,
      diferencia,
      cuadrado: Math.abs(diferencia) < 0.05,
      cuentasConSaldo,
      totalCuentasDetalle: detalleCatalogo.length,
      totalCuentasCatalogo: catalogo.length,
      items,
    };
  }

  async guardarSaldosIniciales(
    empresaId: string,
    dto: GuardarSaldosInicialesDto,
    usuarioId?: string,
  ) {
    this.requireEmpresa(empresaId);
    const fechaCorte = this.parseFechaCorte(dto.fechaCorte);
    const catalogo = await this.loadCatalogoEmpresa(empresaId);
    const codeToName = new Map(catalogo.map((c) => [c.codigo, c.nombre]));
    const validDetailCodes = new Set(
      catalogo
        .filter((c) => c.aceptaMovimiento || c.nivel === 4)
        .map((c) => c.codigo),
    );

    for (const item of dto.items) {
      const code = item.codigo.trim();
      if (!validDetailCodes.has(code)) {
        throw new BadRequestException(
          `La cuenta "${code}" no existe como cuenta de detalle en el catálogo de la empresa.`,
        );
      }
      const d = this.round2(item.deudor);
      const a = this.round2(item.acreedor);
      if (d > 0 && a > 0) {
        throw new BadRequestException(
          `La cuenta "${code}" no puede tener saldo Deudor y Acreedor positivo al mismo tiempo.`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const cuentaCodigo = item.codigo.trim();
        const cuentaNombre =
          item.nombre?.trim() || codeToName.get(cuentaCodigo) || cuentaCodigo;
        const deudor = this.round2(item.deudor);
        const acreedor = this.round2(item.acreedor);
        const notas = item.notas?.trim() || null;

        if (deudor === 0 && acreedor === 0 && !notas) {
          await tx.saldoInicialContable.deleteMany({
            where: { empresaId, cuentaCodigo },
          });
          continue;
        }

        await tx.saldoInicialContable.upsert({
          where: {
            empresaId_cuentaCodigo: { empresaId, cuentaCodigo },
          },
          update: {
            fechaCorte,
            cuentaNombre,
            deudor,
            acreedor,
            notas,
            creadoPorId: usuarioId || null,
          },
          create: {
            empresaId,
            cuentaCodigo,
            cuentaNombre,
            fechaCorte,
            deudor,
            acreedor,
            notas,
            creadoPorId: usuarioId || null,
          },
        });
      }
    });

    return this.getSaldosIniciales(empresaId);
  }

  private toCuentaContableRow(empresaId: string, c: CuentaCatalogo) {
    return {
      empresaId,
      codigo: c.codigo,
      nombre: c.nombre,
      nivel: c.nivel,
      mayorCodigo: c.mayorCodigo || null,
      mayorNombre: c.mayorNombre || null,
      tipo: c.tipo,
      naturaleza: c.naturaleza,
      estadoFinanciero: c.estado || null,
      renglon: c.renglon || null,
      aceptaMovimiento: c.aceptaMovimiento,
      esControl: c.esControl,
      qbTipo: c.qbTipo || null,
      qbNombre: c.qbNombre || null,
      activa: true,
    };
  }

  async importarCatalogoYSaldos(
    empresaId: string,
    dto: ImportarExcelContableDto,
    usuarioId?: string,
  ) {
    this.requireEmpresa(empresaId);
    const fechaCorte = this.parseFechaCorte(dto.fechaCorte);

    for (const s of dto.saldos) {
      if (this.round2(s.deudor) > 0 && this.round2(s.acreedor) > 0) {
        throw new BadRequestException(
          `La cuenta "${s.codigo}" tiene monto Deudor y Acreedor simultáneos en el archivo.`,
        );
      }
    }

    const catalogoActual = await this.loadCatalogoEmpresa(empresaId);
    const catalogoRows =
      dto.reemplazarCatalogo && dto.catalogo && dto.catalogo.length > 0
        ? this.buildHierarchyFromDetailRows(dto.catalogo)
        : null;

    const effectiveCatalogo = catalogoRows || catalogoActual;
    const codeToName = new Map(
      effectiveCatalogo.map((c) => [c.codigo, c.nombre]),
    );
    const validDetailCodes = new Set(
      effectiveCatalogo
        .filter((c) => c.aceptaMovimiento || c.nivel === 4)
        .map((c) => c.codigo),
    );

    if (dto.catalogo && !dto.reemplazarCatalogo) {
      for (const c of dto.catalogo) {
        const cleanCode = c.codigo.trim();
        validDetailCodes.add(cleanCode);
        codeToName.set(cleanCode, c.nombre.trim());
      }
    }

    for (const s of dto.saldos) {
      const code = s.codigo.trim();
      if (!validDetailCodes.has(code) && !(dto.reemplazarCatalogo && /^\d{4,}$/.test(code))) {
        throw new BadRequestException(
          `El saldo de la cuenta "${code}" no corresponde a una cuenta de detalle válida del catálogo.`,
        );
      }
    }

    // Consolidar posibles filas repetidas por cuenta (p. ej. 110301 clientes o 210101 proveedores en Excel)
    const consolidatedSaldos = new Map<
      string,
      {
        empresaId: string;
        cuentaCodigo: string;
        cuentaNombre: string;
        fechaCorte: Date;
        deudor: number;
        acreedor: number;
        notas: string | null;
        creadoPorId: string | null;
      }
    >();
    for (const s of dto.saldos) {
      const cuentaCodigo = s.codigo.trim();
      const d = this.round2(s.deudor);
      const a = this.round2(s.acreedor);
      const nota = s.notas?.trim() || null;
      const existing = consolidatedSaldos.get(cuentaCodigo);
      if (existing) {
        existing.deudor = this.round2(existing.deudor + d);
        existing.acreedor = this.round2(existing.acreedor + a);
        if (!existing.notas && nota) existing.notas = nota;
      } else {
        consolidatedSaldos.set(cuentaCodigo, {
          empresaId,
          cuentaCodigo,
          cuentaNombre: (
            codeToName.get(cuentaCodigo) ||
            s.nombre?.trim() ||
            cuentaCodigo
          ).toUpperCase(),
          fechaCorte,
          deudor: d,
          acreedor: a,
          notas: nota,
          creadoPorId: usuarioId || null,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (catalogoRows) {
        await tx.saldoInicialContable.deleteMany({ where: { empresaId } });
        await tx.cuentaContable.deleteMany({ where: { empresaId } });
        await tx.cuentaContable.createMany({
          data: catalogoRows.map((c) => this.toCuentaContableRow(empresaId, c)),
        });
      } else if (dto.catalogo && dto.catalogo.length > 0) {
        const extraHierarchy = this.buildHierarchyFromDetailRows(dto.catalogo);
        for (const c of extraHierarchy) {
          const rowData = this.toCuentaContableRow(empresaId, c);
          await tx.cuentaContable.upsert({
            where: { empresaId_codigo: { empresaId, codigo: c.codigo } },
            update: {
              nombre: rowData.nombre,
              nivel: rowData.nivel,
              tipo: rowData.tipo,
              naturaleza: rowData.naturaleza,
              aceptaMovimiento: rowData.aceptaMovimiento,
              esControl: rowData.esControl,
              mayorCodigo: rowData.mayorCodigo,
              mayorNombre: rowData.mayorNombre,
              estadoFinanciero: rowData.estadoFinanciero,
              renglon: rowData.renglon,
              qbTipo: rowData.qbTipo,
              qbNombre: rowData.qbNombre,
              activa: true,
            },
            create: rowData,
          });
        }
      }

      await tx.saldoInicialContable.deleteMany({ where: { empresaId } });

      const nonEmptySaldos = Array.from(consolidatedSaldos.values()).filter(
        (s) => s.deudor > 0 || s.acreedor > 0 || Boolean(s.notas),
      );

      if (nonEmptySaldos.length > 0) {
        await tx.saldoInicialContable.createMany({ data: nonEmptySaldos });
      }
    });

    return this.getSaldosIniciales(empresaId);
  }

  async cargarSaldosOficialesBm(empresaId: string, usuarioId?: string) {
    this.requireEmpresa(empresaId);
    const catalogoOficial = getCatalogoOficial();
    const saldosOficiales = getSaldosInicialesOficiales();

    if (!catalogoOficial.length || !saldosOficiales) {
      throw new BadRequestException(
        'No se encontraron los archivos oficiales de catálogo y saldos BM Construcciones.',
      );
    }

    const fechaCorte = this.parseFechaCorte(saldosOficiales.fechaCorte);

    await this.prisma.$transaction(async (tx) => {
      await tx.saldoInicialContable.deleteMany({ where: { empresaId } });
      await tx.cuentaContable.deleteMany({ where: { empresaId } });

      await tx.cuentaContable.createMany({
        data: catalogoOficial.map((c) =>
          this.toCuentaContableRow(empresaId, c),
        ),
      });

      await tx.saldoInicialContable.createMany({
        data: saldosOficiales.items.map((item) => ({
          empresaId,
          cuentaCodigo: item.codigo,
          cuentaNombre: item.nombre,
          fechaCorte,
          deudor: this.round2(item.deudor),
          acreedor: this.round2(item.acreedor),
          notas: 'Saldo inicial oficial BM Construcciones al 31/10/2026',
          creadoPorId: usuarioId || null,
        })),
      });
    });

    return this.getSaldosIniciales(empresaId);
  }

  // ==========================================================================
  // 9. COMPROBANTES Y ASIENTOS CONTABLES (MANUALES Y OPERATIVOS)
  // ==========================================================================
  async listarAsientos(
    empresaId: string,
    filtros?: {
      origenModulo?: string;
      tipoAsiento?: string;
      limit?: number;
    },
  ) {
    this.requireEmpresa(empresaId);

    const where: any = { empresaId };
    if (filtros?.origenModulo && filtros.origenModulo !== 'TODOS') {
      where.origenModulo = filtros.origenModulo;
    }
    if (filtros?.tipoAsiento && filtros.tipoAsiento !== 'TODOS') {
      where.tipoAsiento = filtros.tipoAsiento;
    }

    const asientos =
      (await (this.prisma as any).asientoContable?.findMany?.({
        where,
        include: { lineas: true },
        orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
        take: filtros?.limit || 100,
      })) ?? [];

    return {
      total: asientos.length,
      asientos: asientos.map((a: any) => ({
        id: a.id,
        numeroAsiento: a.numeroAsiento,
        fecha: a.fecha,
        tipoAsiento: a.tipoAsiento,
        origenModulo: a.origenModulo,
        documentoReferencia: a.documentoReferencia,
        concepto: a.concepto,
        totalDebe: Number(a.totalDebe || 0),
        totalHaber: Number(a.totalHaber || 0),
        cuadrado: Boolean(a.cuadrado),
        estado: a.estado,
        sucursalId: a.sucursalId,
        createdAt: a.createdAt,
        lineas: (a.lineas || []).map((l: any) => ({
          id: l.id,
          cuentaCodigo: l.cuentaCodigo,
          cuentaNombre: l.cuentaNombre,
          debe: Number(l.debe || 0),
          haber: Number(l.haber || 0),
          clienteId: l.clienteId,
          conceptoLinea: l.conceptoLinea,
        })),
      })),
    };
  }

  async crearAsientoManual(
    empresaId: string,
    dto: CrearAsientoManualDto,
    usuarioId?: string,
  ) {
    this.requireEmpresa(empresaId);

    if (!dto.lineas || dto.lineas.length < 2) {
      throw new BadRequestException(
        'Un asiento contable requiere al menos 2 partidas (Debe y Haber).',
      );
    }

    const catalogo = await this.loadCatalogoEmpresa(empresaId);
    const catalogoMap = new Map(catalogo.map((c) => [c.codigo, c]));

    const lineasProcesadas: Array<{
      cuentaCodigo: string;
      cuentaNombre: string;
      debe: number;
      haber: number;
      clienteId: string | null;
      conceptoLinea: string | null;
    }> = [];

    for (const raw of dto.lineas) {
      const codigo = String(raw.cuentaCodigo || '').trim();
      const cta = catalogoMap.get(codigo);
      if (!cta) {
        throw new BadRequestException(
          `La cuenta ${codigo} no existe en el catálogo contable BM de la empresa.`,
        );
      }
      if (!cta.aceptaMovimiento) {
        throw new BadRequestException(
          `La cuenta ${codigo} (${cta.nombre}) es agrupadora y no acepta movimientos directos. Use una cuenta de detalle.`,
        );
      }
      const debe = this.round2(Number(raw.debe || 0));
      const haber = this.round2(Number(raw.haber || 0));
      if (debe > 0 && haber > 0) {
        throw new BadRequestException(
          `La línea de cuenta ${codigo} no puede tener monto en Debe y Haber simultáneamente.`,
        );
      }
      if (debe <= 0 && haber <= 0) {
        throw new BadRequestException(
          `La línea de cuenta ${codigo} debe tener un monto mayor a 0 en Debe o Haber.`,
        );
      }
      lineasProcesadas.push({
        cuentaCodigo: codigo,
        cuentaNombre: cta.nombre,
        debe,
        haber,
        clienteId: raw.clienteId?.trim() || null,
        conceptoLinea: raw.conceptoLinea?.trim() || dto.concepto.trim(),
      });
    }

    const totalDebe = this.round2(
      lineasProcesadas.reduce((acc, l) => acc + l.debe, 0),
    );
    const totalHaber = this.round2(
      lineasProcesadas.reduce((acc, l) => acc + l.haber, 0),
    );

    if (totalDebe <= 0 || Math.abs(totalDebe - totalHaber) > 0.01) {
      throw new BadRequestException(
        `El asiento no cuadra en partida doble: Debe (${totalDebe.toFixed(2)}) ≠ Haber (${totalHaber.toFixed(2)}).`,
      );
    }

    const fecha = this.parseFechaCorte(dto.fecha);
    const sucursalId = dto.sucursalId?.trim() || null;
    const runInTx =
      typeof (this.prisma as any).$transaction === 'function'
        ? <T>(cb: (tx: any) => Promise<T>) => (this.prisma as any).$transaction(cb)
        : <T>(cb: (tx: any) => Promise<T>) => cb(this.prisma);

    const creado = await runInTx(async (tx: any) => {
      const numeroAsiento = await this.numberingService.next(tx, {
        empresaId,
        sucursalId,
        tipoDocumento: TipoDocumentoSerie.ASIENTO,
        usuarioId,
      });

      return tx.asientoContable.create({
        data: {
          empresaId,
          sucursalId,
          numeroAsiento,
          fecha,
          tipoAsiento: dto.tipoAsiento,
          origenModulo: 'MANUAL',
          documentoReferencia:
            dto.documentoReferencia?.trim() || numeroAsiento,
          concepto: dto.concepto.trim(),
          totalDebe,
          totalHaber,
          cuadrado: true,
          estado: 'PUBLICADO',
          creadoPorId: usuarioId || null,
          lineas: {
            create: lineasProcesadas,
          },
        },
        include: { lineas: true },
      });
    });

    return creado;
  }

  async anularAsientoManual(
    empresaId: string,
    asientoId: string,
    usuarioId?: string,
    motivo?: string,
  ) {
    this.requireEmpresa(empresaId);

    const asiento = await (this.prisma as any).asientoContable.findFirst({
      where: { id: asientoId, empresaId },
      include: { lineas: true },
    });

    if (!asiento) {
      throw new BadRequestException('Asiento contable no encontrado.');
    }
    if (asiento.estado === 'ANULADO') {
      throw new BadRequestException('Este asiento contable ya fue anulado.');
    }
    if (asiento.origenModulo !== 'MANUAL') {
      throw new BadRequestException(
        `Los asientos generados automáticamente desde ${asiento.origenModulo} deben revertirse desde su módulo origen.`,
      );
    }

    const motivoText = motivo?.trim() || 'Anulación solicitada por usuario contable';

    return this.prisma.$transaction(async (tx: any) => {
      const numeroReversion = await this.numberingService.next(tx, {
        empresaId,
        sucursalId: asiento.sucursalId || null,
        tipoDocumento: TipoDocumentoSerie.ASIENTO,
        documentoId: asiento.id,
        usuarioId,
      });

      const anulado = await tx.asientoContable.update({
        where: { id: asiento.id },
        data: { estado: 'ANULADO' },
      });

      const reversion = await tx.asientoContable.create({
        data: {
          empresaId,
          sucursalId: asiento.sucursalId || null,
          numeroAsiento: numeroReversion,
          fecha: new Date(),
          tipoAsiento: 'AJUSTE',
          origenModulo: 'MANUAL',
          documentoReferencia: `REV-${asiento.numeroAsiento}`,
          concepto: `Reversión de ${asiento.numeroAsiento}: ${motivoText}`,
          totalDebe: asiento.totalHaber,
          totalHaber: asiento.totalDebe,
          cuadrado: true,
          estado: 'ANULADO',
          creadoPorId: usuarioId || null,
          lineas: {
            create: (asiento.lineas || []).map((l: any) => ({
              cuentaCodigo: l.cuentaCodigo,
              cuentaNombre: l.cuentaNombre,
              debe: Number(l.haber || 0),
              haber: Number(l.debe || 0),
              clienteId: l.clienteId || null,
              conceptoLinea: `Reversión ${asiento.numeroAsiento}`,
            })),
          },
        },
        include: { lineas: true },
      });

      return { asientoAnulado: anulado, reversion };
    });
  }
}
