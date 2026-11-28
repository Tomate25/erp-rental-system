import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoCompraInsumo,
  EstadoContrato,
  EstadoCorteFacturacion,
  EstadoCxcFactura,
  EstadoEquipo,
  EstadoFactura,
  EstadoNotaCxc,
  EstadoReserva,
  EstadoSubarriendoProveedor,
  EstadoUsoDocumento,
  TipoAsientoContable,
  TipoControlEquipo,
  TipoFactura,
  TipoNotaCxc,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingService } from '../../accounting/services/accounting.service';
import {
  BM_CUENTAS,
  registrarAsientoAutomaticoInTx,
  resolverCuentaBancariaOCaja,
  round2Accounting,
} from '../../accounting/utils/bm-accounting.util';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';
import { CxcRecibosService } from '../../cxc/services/cxc-recibos.service';
import { QuotationsService } from '../../quotations/services/quotations.service';
import {
  ExecuteVoidingDto,
  TipoDocumentoAnulable,
  VoidingListQueryDto,
} from '../dto/reports.dto';

export interface InventoryImpactItem {
  id: string;
  codigo: string;
  nombre: string;
  tipoControl: string;
  estadoActual: string;
  estadoResultante: string;
  stockActual: number;
  cambioStock: number;
  stockResultante: number;
  accion: 'LIBERAR_RESERVA' | 'DESCONTAR_ENTRADA_BODEGA' | 'DESHABILITAR_EXTERNO' | 'SIN_CAMBIO';
  detalle: string;
}

export interface AccountingImpactLine {
  cuentaCodigo: string;
  cuentaNombre: string;
  naturaleza: 'Deudora' | 'Acreedora';
  debe: number;
  haber: number;
  concepto: string;
  saldoAntes: number;
  saldoDespues: number;
}

export interface RelatedDocumentImpact {
  tipo: string;
  codigo: string;
  estadoActual: string;
  estadoResultante: string;
  detalle: string;
}

export interface VoidingImpactPreview {
  tipoDocumento: TipoDocumentoAnulable;
  documentoId: string;
  codigo: string;
  fecha: string;
  tercero: string;
  monto: number;
  estadoActual: string;
  estadoResultante: string;
  puedeAnular: boolean;
  bloqueos: string[];
  advertencias: string[];
  impactoInventario: {
    tieneImpacto: boolean;
    tipoInventario: 'FLOTA_MAQUINARIA' | 'BODEGA_INSUMOS' | 'NINGUNO';
    resumen: string;
    items: InventoryImpactItem[];
  };
  impactoContable: {
    tieneImpacto: boolean;
    mecanismo:
      | 'ASIENTO_REVERSION'
      | 'EXCLUSION_POLIZA_AUTOMATICA'
      | 'ANULACION_ASIENTO'
      | 'SIN_IMPACTO';
    resumen: string;
    efectoBalanceGeneral: string;
    efectoEstadoResultados: string;
    partidasReversion: AccountingImpactLine[];
    totalDebe: number;
    totalHaber: number;
    cuadrado: boolean;
  };
  documentosRelacionados: RelatedDocumentImpact[];
}

export interface VoidingBehaviorMatrixRule {
  tipoDocumento: TipoDocumentoAnulable;
  nombre: string;
  modulo: string;
  afectaInventario: boolean;
  comportamientoInventario: string;
  afectaContabilidad: boolean;
  comportamientoContable: string;
  cuentasAfectadas: string[];
  efectoEstadosFinancieros: string;
  reglasBloqueo: string[];
}

export interface VoidableDocumentRow {
  tipoDocumento: TipoDocumentoAnulable;
  documentoId: string;
  codigo: string;
  fecha: string;
  tercero: string;
  descripcion: string;
  monto: number;
  estado: string;
  estaAnulado: boolean;
  afectaInventario: boolean;
  afectaContabilidad: boolean;
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function toIsoDate(value?: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class DocumentVoidingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
    private readonly cxcRecibosService: CxcRecibosService,
    private readonly quotationsService: QuotationsService,
  ) {}

  private requireEmpresa(empresaId: string): void {
    if (!empresaId || typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new ForbiddenException('El usuario no tiene una empresa asignada.');
    }
  }

  getMatrizComportamientoAnulaciones(): VoidingBehaviorMatrixRule[] {
    return [
      {
        tipoDocumento: TipoDocumentoAnulable.FACTURA,
        nombre: 'Factura (Alquiler, Anticipo o Daños)',
        modulo: 'Facturación y Caja',
        afectaInventario: false,
        comportamientoInventario:
          'Sin movimiento físico de flota ni bodega (la salida/entrada física la rigen Despachos y Retornos). Si corresponde a un Corte de Contrato, el corte regresa a PENDIENTE para permitir refacturación; si era factura directa de Cotización, la cotización retorna a ACEPTADA.',
        afectaContabilidad: true,
        comportamientoContable:
          'Se excluye la póliza automática de venta en Libro Diario y Balanza (estado CANCELADA, estadoCxc ANULADA, saldo 0). Se revierte el Ingreso (410101 / 410102) y el IVA 15% por Pagar (210201) contra CxC Clientes (110301) si fue Crédito, o contra Caja/Banco (1101xx/1102xx) y Retención IR (110703) si fue Contado. El folio queda marcado como ANULADO en Series.',
        cuentasAfectadas: ['410101 / 410102', '210201', '110301', '110101 / 110201', '110703'],
        efectoEstadosFinancieros:
          'Balance General: Disminuye Activo (CxC o Bancos/Caja) y Pasivo (IVA por Pagar). Estado de Resultados: Disminuyen los Ingresos Operativos y la Utilidad.',
        reglasBloqueo: [
          'Bloqueada si ya fue anulada previamente.',
          'Bloqueada si tiene Recibos de Caja EMITIDOS aplicados (debe anular primero el Recibo de Caja).',
          'Bloqueada si pertenece a un Arreglo de Pago vigente o formalizado.',
        ],
      },
      {
        tipoDocumento: TipoDocumentoAnulable.CONTRATO,
        nombre: 'Contrato de Arrendamiento',
        modulo: 'Contratos',
        afectaInventario: true,
        comportamientoInventario:
          'IMPACTO DIRECTO EN FLOTA: Cancela todas las reservas activas (CONFIRMADA/PENDIENTE → CANCELADA). Equipos SERIALIZADOS cambian de RESERVADO → DISPONIBLE (stock 1). Equipos POR_CANTIDAD incrementan su cantidadDisponible hasta cantidadTotal. Cancela solicitudes de despacho pendientes y anula cortes pendientes.',
        afectaContabilidad: true,
        comportamientoContable:
          'Si el contrato registró Depósito en Garantía (> 0), se libera la póliza de depósito (DEBE 210409 Anticipos/Depósitos de Clientes, HABER 110201 Banco). Si tenía equipos de proveedor en subarriendo, detiene el reconocimiento del costo 510106 vs 210101.',
        cuentasAfectadas: ['210409', '110201', '510106 (si aplica)', '210101 (si aplica)'],
        efectoEstadosFinancieros:
          'Balance General: Disminuye Pasivo por depósitos de clientes (210409) y Banco (110201) si había depósito. Sin impacto si el depósito era C$ 0.',
        reglasBloqueo: [
          'Bloqueado si el contrato ya tiene Despachos ejecutados (debe registrar primero el retorno físico de la maquinaria).',
          'Bloqueado si tiene Facturas activas no anuladas (anule primero las facturas).',
          'Bloqueado si el contrato ya está FINALIZADO o CANCELADO.',
        ],
      },
      {
        tipoDocumento: TipoDocumentoAnulable.COTIZACION,
        nombre: 'Cotización Comercial',
        modulo: 'Cotizaciones',
        afectaInventario: true,
        comportamientoInventario:
          'Si está en BORRADOR/PENDIENTE/ENVIADA/VISTA no afecta stock. Si ya estaba ACEPTADA o CONVERTIDA_A_CONTRATO (sin despachos ni facturas), cancela automáticamente el contrato vinculado, cancela las reservas y devuelve todos los equipos a DISPONIBLE.',
        afectaContabilidad: false,
        comportamientoContable:
          'Las cotizaciones no generan pólizas contables directas. Si al cancelar se revierte un contrato asociado con depósito en garantía sin facturar, también se libera el compromiso del depósito.',
        cuentasAfectadas: ['Sin afectación directa (solo 210409 / 110201 si libera contrato con depósito)'],
        efectoEstadosFinancieros:
          'Sin efecto en Balance ni Estado de Resultados mientras no haya facturación asociada.',
        reglasBloqueo: [
          'Bloqueada si ya fue FACTURADA o tiene facturas activas.',
          'Bloqueada si el contrato asociado ya tiene despachos ejecutados o está finalizado.',
        ],
      },
      {
        tipoDocumento: TipoDocumentoAnulable.RECIBO_CAJA,
        nombre: 'Recibo Oficial de Caja (CxC)',
        modulo: 'Cuentas por Cobrar (CxC)',
        afectaInventario: false,
        comportamientoInventario:
          'Sin movimiento de maquinaria ni bodega de insumos (operación estrictamente de tesorería y cartera).',
        afectaContabilidad: true,
        comportamientoContable:
          'Genera Asiento Contable de Reversión PUBLICADO (tipo CXC_REVERSION): DEBE 110301 CxC Clientes (restaura el saldo pendiente de cada factura/nota/cuota aplicada) y DEBE 210409 Anticipos (si hubo excedente); HABER Caja/Banco (110101/110201), HABER 110703 Retención IR y HABER 110705 Retención IMI.',
        cuentasAfectadas: ['110301', '110101 / 110201', '110703', '110705', '210409'],
        efectoEstadosFinancieros:
          'Balance General: Aumenta nuevamente CxC Clientes (110301) y disminuye Efectivo/Bancos y Retenciones a Favor. Estado de Resultados: Sin efecto (solo flujo de cobro).',
        reglasBloqueo: [
          'Bloqueado si ya se encuentra ANULADO.',
          'Bloqueado si el anticipo por sobrepago generado por este recibo ya fue consumido en otra operación.',
        ],
      },
      {
        tipoDocumento: TipoDocumentoAnulable.COMPRA_INSUMO,
        nombre: 'Orden de Compra de Insumos',
        modulo: 'Compras y Bodega de Insumos',
        afectaInventario: true,
        comportamientoInventario:
          'IMPACTO DIRECTO EN BODEGA: Si la compra fue RECIBIDA, descuenta del stockActual de cada insumo la cantidad comprada y registra un movimiento Kardex de SALIDA por anulación de compra.',
        afectaContabilidad: true,
        comportamientoContable:
          'Genera Asiento Contable de Reversión PUBLICADO invirtiendo el asiento de compra: DEBE 210101 CxP Proveedores (si fue Crédito) o DEBE Caja/Banco (si fue Contado); HABER 121002 Inventario de Insumos/Repuestos de Taller (subtotal) y HABER 110702 IVA Pagado sobre Compras.',
        cuentasAfectadas: ['121002', '110702', '210101', '110101 / 110102 / 110201'],
        efectoEstadosFinancieros:
          'Balance General: Disminuye Inventario de Insumos (121002) e IVA Acreditable (110702); disminuye CxP Proveedores (210101) o devuelve saldo a Banco/Caja.',
        reglasBloqueo: [
          'Bloqueada si ya fue ANULADA.',
          'Bloqueada si es a CRÉDITO y ya tiene abonos/pagos registrados a proveedor.',
          'Bloqueada si alguno de los insumos ya fue consumido en taller y el stockActual es menor que la cantidad comprada.',
        ],
      },
      {
        tipoDocumento: TipoDocumentoAnulable.SUBARRIENDO_PROVEEDOR,
        nombre: 'Subarriendo de Maquinaria Externa',
        modulo: 'Compras y Maquinaria Externa',
        afectaInventario: true,
        comportamientoInventario:
          'IMPACTO EN FLOTA EXTERNA: Cancela el período de subarriendo (CANCELADO) y, si no existen otros subarriendos activos del mismo equipo, marca disponibleParaRenta = false para evitar cotizar maquinaria externa cancelada.',
        afectaContabilidad: true,
        comportamientoContable:
          'Si el subarriendo generó asiento contable de devengo, registra Asiento de Reversión PUBLICADO: DEBE 210101 CxP Proveedores, HABER 510106 Costo de Subarriendo de Maquinaria.',
        cuentasAfectadas: ['210101', '510106'],
        efectoEstadosFinancieros:
          'Balance General: Disminuye CxP Proveedores (210101). Estado de Resultados: Disminuye Costo de Subarriendo (510106), mejorando margen.',
        reglasBloqueo: [
          'Bloqueado si ya está DEVUELTO o CANCELADO.',
          'Bloqueado si ya tiene pagos registrados al proveedor.',
          'Bloqueado si el equipo se encuentra actualmente RENTADO / DESPACHADO en un contrato activo.',
        ],
      },
      {
        tipoDocumento: TipoDocumentoAnulable.NOTA_CXC,
        nombre: 'Nota de Débito / Crédito (CxC)',
        modulo: 'Cuentas por Cobrar (CxC)',
        afectaInventario: false,
        comportamientoInventario:
          'Sin movimiento físico en maquinaria ni bodega de insumos.',
        afectaContabilidad: true,
        comportamientoContable:
          'Nota de Débito: Revierte cargo adicional (DEBE 410401 Otros Ingresos + DEBE 210201 IVA, HABER 110301 CxC Clientes). Nota de Crédito: Restaura el saldo pendiente de la factura referenciada (DEBE 110301 CxC Clientes, HABER 410103 Descuentos/Devoluciones + HABER 210201 IVA).',
        cuentasAfectadas: ['110301', '410401 / 410103', '210201'],
        efectoEstadosFinancieros:
          'Ajusta directamente la cartera CxC (110301), el IVA por Pagar (210201) y los Ingresos/Devoluciones en P&L.',
        reglasBloqueo: [
          'Bloqueada si ya está ANULADA.',
          'Bloqueada si tiene aplicaciones activas en Recibos de Caja o Arreglos de Pago.',
        ],
      },
      {
        tipoDocumento: TipoDocumentoAnulable.ASIENTO_MANUAL,
        nombre: 'Asiento Contable Manual',
        modulo: 'Contabilidad & Finanzas',
        afectaInventario: false,
        comportamientoInventario:
          'Sin afectación automática a inventarios físicos ni reservas.',
        afectaContabilidad: true,
        comportamientoContable:
          'Marca el asiento original como ANULADO (sale inmediatamente de la Balanza y Estados Financieros) y registra un asiento espejo de reversión (Debe ↔ Haber) para auditoría.',
        cuentasAfectadas: ['Todas las cuentas detalladas en las partidas del asiento original'],
        efectoEstadosFinancieros:
          'Revierte al 100% el efecto de cada cuenta tocada por el asiento manual en Balance y Estado de Resultados.',
        reglasBloqueo: [
          'Bloqueado si el asiento ya está ANULADO.',
          'Bloqueado si el asiento fue generado automáticamente por otro módulo (debe anularse desde el documento origen).',
        ],
      },
    ];
  }

  async listarDocumentosAnulables(
    empresaId: string,
    query: VoidingListQueryDto = {},
  ): Promise<{
    total: number;
    activos: number;
    anulados: number;
    documentos: VoidableDocumentRow[];
  }> {
    this.requireEmpresa(empresaId);

    const tiposABuscar: TipoDocumentoAnulable[] = query.tipoDocumento
      ? [query.tipoDocumento]
      : Object.values(TipoDocumentoAnulable);

    const rows: VoidableDocumentRow[] = [];

    const tasks: Array<Promise<void>> = [];

    if (tiposABuscar.includes(TipoDocumentoAnulable.FACTURA)) {
      tasks.push(
        this.prisma.factura
          .findMany({
            where: { OR: [{ empresaId }, { cliente: { empresaId } }] },
            include: { cliente: { select: { nombre: true } } },
            orderBy: { fechaEmision: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const f of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.FACTURA,
                documentoId: f.id,
                codigo: f.folio,
                fecha: toIsoDate(f.fechaEmision),
                tercero: f.cliente?.nombre || 'Cliente',
                descripcion: `${f.tipoFactura} · ${f.condicionPago}`,
                monto: round2(Number(f.total || 0)),
                estado: f.estado,
                estaAnulado: f.estado === EstadoFactura.CANCELADA,
                afectaInventario: false,
                afectaContabilidad: true,
              });
            }
          }),
      );
    }

    if (tiposABuscar.includes(TipoDocumentoAnulable.CONTRATO)) {
      tasks.push(
        this.prisma.contrato
          .findMany({
            where: { sucursal: { empresaId } },
            include: {
              cliente: { select: { nombre: true } },
              cotizacion: { select: { total: true } },
            },
            orderBy: { fechaInicio: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const c of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.CONTRATO,
                documentoId: c.id,
                codigo: c.codigo,
                fecha: toIsoDate(c.fechaInicio),
                tercero: c.cliente?.nombre || 'Cliente',
                descripcion: `Vigencia ${toIsoDate(c.fechaInicio)} → ${toIsoDate(c.fechaFin)}`,
                monto: round2(
                  Number(c.cotizacion?.total || c.depositoGarantia || 0),
                ),
                estado: c.estado,
                estaAnulado: c.estado === EstadoContrato.CANCELADO,
                afectaInventario: true,
                afectaContabilidad: Number(c.depositoGarantia || 0) > 0,
              });
            }
          }),
      );
    }

    if (tiposABuscar.includes(TipoDocumentoAnulable.COTIZACION)) {
      tasks.push(
        this.prisma.cotizacion
          .findMany({
            where: { OR: [{ empresaId }, { cliente: { empresaId } }] },
            include: { cliente: { select: { nombre: true } } },
            orderBy: { fechaEmision: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const q of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.COTIZACION,
                documentoId: q.id,
                codigo: `${q.numeroCotizacion} v${q.version}`,
                fecha: toIsoDate(q.fechaEmision),
                tercero: q.cliente?.nombre || 'Cliente',
                descripcion: q.proyecto || 'Cotización comercial',
                monto: round2(Number(q.total || 0)),
                estado: q.estado,
                estaAnulado: q.estado === 'CANCELADA',
                afectaInventario: ['ACEPTADA', 'CONVERTIDA_A_CONTRATO'].includes(
                  q.estado,
                ),
                afectaContabilidad: false,
              });
            }
          }),
      );
    }

    if (tiposABuscar.includes(TipoDocumentoAnulable.RECIBO_CAJA)) {
      tasks.push(
        this.prisma.reciboCaja
          .findMany({
            where: { empresaId },
            include: { cliente: { select: { nombre: true } } },
            orderBy: { fechaRecibo: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const r of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.RECIBO_CAJA,
                documentoId: r.id,
                codigo: r.numeroRecibo,
                fecha: toIsoDate(r.fechaRecibo),
                tercero: r.cliente?.nombre || 'Cliente',
                descripcion: `${r.metodoPago} · ${r.concepto}`.slice(0, 90),
                monto: round2(Number(r.totalLiquidado || 0)),
                estado: r.estado,
                estaAnulado: r.estado === 'ANULADO',
                afectaInventario: false,
                afectaContabilidad: true,
              });
            }
          }),
      );
    }

    if (tiposABuscar.includes(TipoDocumentoAnulable.COMPRA_INSUMO)) {
      tasks.push(
        this.prisma.compraInsumo
          .findMany({
            where: { empresaId },
            orderBy: { fechaCompra: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const co of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.COMPRA_INSUMO,
                documentoId: co.id,
                codigo: co.codigo,
                fecha: toIsoDate(co.fechaCompra),
                tercero: co.proveedorNombre,
                descripcion: `Compra insumos ${co.condicionPago}${co.numeroFactura ? ` · Fac. ${co.numeroFactura}` : ''}`,
                monto: round2(Number(co.total || 0)),
                estado: co.estado,
                estaAnulado: co.estado === EstadoCompraInsumo.ANULADA,
                afectaInventario: co.estado === EstadoCompraInsumo.RECIBIDA,
                afectaContabilidad: true,
              });
            }
          }),
      );
    }

    if (tiposABuscar.includes(TipoDocumentoAnulable.SUBARRIENDO_PROVEEDOR)) {
      tasks.push(
        this.prisma.subarriendoProveedor
          .findMany({
            where: { empresaId },
            include: { equipo: { select: { codigo: true, modelo: true } } },
            orderBy: { fechaInicio: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const s of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.SUBARRIENDO_PROVEEDOR,
                documentoId: s.id,
                codigo: s.codigo,
                fecha: toIsoDate(s.fechaInicio),
                tercero: s.proveedorNombre,
                descripcion: `${s.equipo?.codigo || ''} ${s.equipo?.modelo || 'Maquinaria externa'}`.trim(),
                monto: round2(Number(s.montoFinal ?? s.montoEstimado ?? 0)),
                estado: s.estado,
                estaAnulado: s.estado === EstadoSubarriendoProveedor.CANCELADO,
                afectaInventario: true,
                afectaContabilidad: true,
              });
            }
          }),
      );
    }

    if (tiposABuscar.includes(TipoDocumentoAnulable.NOTA_CXC)) {
      tasks.push(
        this.prisma.notaDebito
          .findMany({
            where: { empresaId },
            include: { cliente: { select: { nombre: true } } },
            orderBy: { fechaEmision: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const n of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.NOTA_CXC,
                documentoId: n.id,
                codigo: n.numeroNota,
                fecha: toIsoDate(n.fechaEmision),
                tercero: n.cliente?.nombre || 'Cliente',
                descripcion: `Nota de ${n.tipoNota} · ${n.concepto}`.slice(0, 90),
                monto: round2(Number(n.total || 0)),
                estado: n.estado,
                estaAnulado: n.estado === EstadoNotaCxc.ANULADA,
                afectaInventario: false,
                afectaContabilidad: true,
              });
            }
          }),
      );
    }

    if (tiposABuscar.includes(TipoDocumentoAnulable.ASIENTO_MANUAL)) {
      tasks.push(
        this.prisma.asientoContable
          .findMany({
            where: { empresaId, origenModulo: 'MANUAL' },
            orderBy: { fecha: 'desc' },
            take: 150,
          })
          .then((list) => {
            for (const a of list) {
              rows.push({
                tipoDocumento: TipoDocumentoAnulable.ASIENTO_MANUAL,
                documentoId: a.id,
                codigo: a.numeroAsiento,
                fecha: toIsoDate(a.fecha),
                tercero: 'Contabilidad Interna',
                descripcion: a.concepto.slice(0, 90),
                monto: round2(Number(a.totalDebe || 0)),
                estado: a.estado,
                estaAnulado: a.estado === 'ANULADO',
                afectaInventario: false,
                afectaContabilidad: true,
              });
            }
          }),
      );
    }

    await Promise.all(tasks);

    let filtered = rows;
    if (query.estadoFiltro === 'ACTIVOS') {
      filtered = filtered.filter((r) => !r.estaAnulado);
    } else if (query.estadoFiltro === 'ANULADOS') {
      filtered = filtered.filter((r) => r.estaAnulado);
    }
    if (query.fechaDesde) {
      const fd = query.fechaDesde.slice(0, 10);
      filtered = filtered.filter((r) => !r.fecha || r.fecha >= fd);
    }
    if (query.fechaHasta) {
      const fh = query.fechaHasta.slice(0, 10);
      filtered = filtered.filter((r) => !r.fecha || r.fecha <= fh);
    }
    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.codigo.toLowerCase().includes(term) ||
          r.tercero.toLowerCase().includes(term) ||
          r.descripcion.toLowerCase().includes(term) ||
          r.tipoDocumento.toLowerCase().includes(term),
      );
    }

    filtered.sort((a, b) => b.fecha.localeCompare(a.fecha));

    return {
      total: filtered.length,
      activos: filtered.filter((r) => !r.estaAnulado).length,
      anulados: filtered.filter((r) => r.estaAnulado).length,
      documentos: filtered,
    };
  }

  private async getAccountBalancesMap(
    empresaId: string,
  ): Promise<
    Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>
  > {
    const map = new Map<
      string,
      { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }
    >();
    try {
      const balanza = await this.accountingService.getBalanzaComprobacion(empresaId);
      for (const c of balanza.cuentas || []) {
        const saldoNeto =
          c.naturaleza === 'Acreedora'
            ? round2(c.saldoFinalAcreedor - c.saldoFinalDeudor)
            : round2(c.saldoFinalDeudor - c.saldoFinalAcreedor);
        map.set(c.codigo, {
          saldoNeto,
          naturaleza: c.naturaleza,
          nombre: c.nombre,
        });
      }
    } catch {
      // Fallback seguro si no hay saldos iniciales cargados
    }
    return map;
  }

  private enrichAccountingLines(
    rawLines: Array<{
      cuentaCodigo: string;
      cuentaNombre: string;
      debe: number;
      haber: number;
      concepto: string;
    }>,
    balancesMap: Map<
      string,
      { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }
    >,
  ): AccountingImpactLine[] {
    const runningSaldo = new Map<string, number>();

    return rawLines
      .filter((l) => round2(l.debe) > 0 || round2(l.haber) > 0)
      .map((l) => {
        const meta = balancesMap.get(l.cuentaCodigo);
        const firstDigit = l.cuentaCodigo.slice(0, 1);
        const naturaleza: 'Deudora' | 'Acreedora' =
          meta?.naturaleza ||
          (['2', '3', '4'].includes(firstDigit) ? 'Acreedora' : 'Deudora');
        const saldoAntes = runningSaldo.has(l.cuentaCodigo)
          ? runningSaldo.get(l.cuentaCodigo)!
          : meta?.saldoNeto ?? 0;

        const debe = round2(l.debe);
        const haber = round2(l.haber);
        const delta = naturaleza === 'Acreedora' ? haber - debe : debe - haber;
        const saldoDespues = round2(saldoAntes + delta);
        runningSaldo.set(l.cuentaCodigo, saldoDespues);

        return {
          cuentaCodigo: l.cuentaCodigo,
          cuentaNombre: meta?.nombre || l.cuentaNombre,
          naturaleza,
          debe,
          haber,
          concepto: l.concepto,
          saldoAntes,
          saldoDespues,
        };
      });
  }

  async previsualizarAnulacion(
    empresaId: string,
    tipoDocumento: TipoDocumentoAnulable,
    documentoId: string,
  ): Promise<VoidingImpactPreview> {
    this.requireEmpresa(empresaId);
    const balancesMap = await this.getAccountBalancesMap(empresaId);

    switch (tipoDocumento) {
      case TipoDocumentoAnulable.FACTURA:
        return this.previewFactura(empresaId, documentoId, balancesMap);
      case TipoDocumentoAnulable.CONTRATO:
        return this.previewContrato(empresaId, documentoId, balancesMap);
      case TipoDocumentoAnulable.COTIZACION:
        return this.previewCotizacion(empresaId, documentoId, balancesMap);
      case TipoDocumentoAnulable.RECIBO_CAJA:
        return this.previewReciboCaja(empresaId, documentoId, balancesMap);
      case TipoDocumentoAnulable.COMPRA_INSUMO:
        return this.previewCompraInsumo(empresaId, documentoId, balancesMap);
      case TipoDocumentoAnulable.SUBARRIENDO_PROVEEDOR:
        return this.previewSubarriendo(empresaId, documentoId, balancesMap);
      case TipoDocumentoAnulable.NOTA_CXC:
        return this.previewNotaCxc(empresaId, documentoId, balancesMap);
      case TipoDocumentoAnulable.ASIENTO_MANUAL:
        return this.previewAsientoManual(empresaId, documentoId, balancesMap);
      default:
        throw new BadRequestException(
          `Tipo de documento no soportado para anulación: ${String(tipoDocumento)}`,
        );
    }
  }

  private async previewFactura(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const factura = await this.prisma.factura.findFirst({
      where: { id: documentoId, OR: [{ empresaId }, { cliente: { empresaId } }] },
      include: {
        cliente: true,
        corte: true,
        cotizacion: true,
        contrato: true,
        pagos: true,
        reciboAplicaciones: { include: { reciboCaja: true } },
        arregloDocumentos: { include: { arreglo: true } },
      },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada.');

    const bloqueos: string[] = [];
    const advertencias: string[] = [];
    const relacionados: RelatedDocumentImpact[] = [];

    if (factura.estado === EstadoFactura.CANCELADA) {
      bloqueos.push('Esta factura ya se encuentra ANULADA (CANCELADA).');
    }

    const recibosActivos = (factura.reciboAplicaciones || []).filter(
      (a) => a.reciboCaja && a.reciboCaja.estado !== 'ANULADO',
    );
    if (recibosActivos.length > 0) {
      const codigos = recibosActivos.map((a) => a.reciboCaja.numeroRecibo).join(', ');
      bloqueos.push(
        `La factura tiene Recibos de Caja activos aplicados (${codigos}). Debe anular primero esos recibos en CxC antes de anular la factura.`,
      );
    }

    const arreglosActivos = (factura.arregloDocumentos || []).filter(
      (a) =>
        a.arreglo &&
        !['ANULADO', 'FINALIZADO'].includes(a.arreglo.estado),
    );
    if (arreglosActivos.length > 0) {
      const codigos = arreglosActivos.map((a) => a.arreglo.numeroArreglo).join(', ');
      bloqueos.push(
        `La factura forma parte de un Arreglo de Pago activo (${codigos}).`,
      );
    }

    if (factura.pagos && factura.pagos.length > 0) {
      advertencias.push(
        `Tiene ${factura.pagos.length} cobro(s) directo(s) en Facturación por C$ ${round2(factura.pagos.reduce((s, p) => s + Number(p.monto || 0), 0)).toFixed(2)} que se revertirán automáticamente en las cuentas de Caja/Banco.`,
      );
    }

    if (factura.corte) {
      relacionados.push({
        tipo: 'CORTE_FACTURACION',
        codigo: `Corte #${factura.corte.numeroCorte} (${factura.contrato?.codigo || ''})`,
        estadoActual: factura.corte.estado,
        estadoResultante: EstadoCorteFacturacion.PENDIENTE,
        detalle: 'El corte queda liberado para poder emitirse una nueva factura corregida.',
      });
    }
    if (factura.cotizacion && !factura.contratoId) {
      relacionados.push({
        tipo: 'COTIZACION',
        codigo: factura.cotizacion.numeroCotizacion,
        estadoActual: factura.cotizacion.estado,
        estadoResultante: 'ACEPTADA',
        detalle: 'La cotización vuelve a estado ACEPTADA sin afectar reservas físicas.',
      });
    }
    relacionados.push({
      tipo: 'SERIE_FOLIO',
      codigo: factura.folio,
      estadoActual: 'EMITIDO',
      estadoResultante: 'ANULADO',
      detalle: 'El folio fiscal queda inutilizado y registrado como ANULADO (no se reutiliza).',
    });

    const subtotal = round2(Number(factura.subtotal || 0));
    const iva = round2(Number(factura.iva || 0));
    const total = round2(Number(factura.total || 0));
    const retencion = round2(Number(factura.retencionIva || 0));
    const isMantenimiento =
      factura.tipoFactura === TipoFactura.CARGO_DANOS ||
      Boolean(factura.devolucionId);
    const ctaIngreso = isMantenimiento
      ? BM_CUENTAS.INGRESO_SERVICIOS_LOCALES
      : BM_CUENTAS.INGRESO_ALQUILER;

    const rawLines: Array<{
      cuentaCodigo: string;
      cuentaNombre: string;
      debe: number;
      haber: number;
      concepto: string;
    }> = [
      {
        cuentaCodigo: ctaIngreso.codigo,
        cuentaNombre: ctaIngreso.nombre,
        debe: subtotal,
        haber: 0,
        concepto: `Reversión de ingreso por anulación de Factura ${factura.folio}`,
      },
      {
        cuentaCodigo: BM_CUENTAS.IVA_POR_PAGAR.codigo,
        cuentaNombre: BM_CUENTAS.IVA_POR_PAGAR.nombre,
        debe: iva,
        haber: 0,
        concepto: `Reversión IVA 15% Factura ${factura.folio}`,
      },
    ];

    if (factura.condicionPago === 'CONTADO') {
      const neto = round2(total - retencion);
      if (factura.pagos && factura.pagos.length > 0) {
        let cubierto = 0;
        for (const p of factura.pagos) {
          const m = round2(Number(p.monto || 0));
          if (m <= 0) continue;
          const ctaDest = resolverCuentaBancariaOCaja(p.banco, p.metodo);
          rawLines.push({
            cuentaCodigo: ctaDest.codigo,
            cuentaNombre: ctaDest.nombre,
            debe: 0,
            haber: m,
            concepto: `Reversión cobro contado Factura ${factura.folio} (${ctaDest.nombre})`,
          });
          cubierto = round2(cubierto + m);
        }
        const rest = round2(neto - cubierto);
        if (rest > 0.01) {
          rawLines.push({
            cuentaCodigo: BM_CUENTAS.CAJA_GENERAL.codigo,
            cuentaNombre: BM_CUENTAS.CAJA_GENERAL.nombre,
            debe: 0,
            haber: rest,
            concepto: `Reversión saldo contado Caja General Factura ${factura.folio}`,
          });
        }
      } else {
        rawLines.push({
          cuentaCodigo: BM_CUENTAS.CAJA_GENERAL.codigo,
          cuentaNombre: BM_CUENTAS.CAJA_GENERAL.nombre,
          debe: 0,
          haber: neto,
          concepto: `Reversión ingreso de contado Factura ${factura.folio}`,
        });
      }
      if (retencion > 0) {
        rawLines.push({
          cuentaCodigo: BM_CUENTAS.RETENCION_IR_FAVOR.codigo,
          cuentaNombre: BM_CUENTAS.RETENCION_IR_FAVOR.nombre,
          debe: 0,
          haber: retencion,
          concepto: `Reversión retención fiscal Factura ${factura.folio}`,
        });
      }
    } else {
      // Crédito: reversión de CxC (y de pagos directos si tenía)
      const totalPagadoDirecto = round2(
        (factura.pagos || []).reduce((s, p) => s + Number(p.monto || 0), 0),
      );
      const saldoCxcRevertido = round2(Math.max(0, total - totalPagadoDirecto));
      if (saldoCxcRevertido > 0) {
        rawLines.push({
          cuentaCodigo: BM_CUENTAS.CXC_CLIENTES.codigo,
          cuentaNombre: BM_CUENTAS.CXC_CLIENTES.nombre,
          debe: 0,
          haber: saldoCxcRevertido,
          concepto: `Baja de saldo por cobrar Factura ${factura.folio}`,
        });
      }
      for (const p of factura.pagos || []) {
        const m = round2(Number(p.monto || 0));
        if (m <= 0) continue;
        const ctaDest = resolverCuentaBancariaOCaja(p.banco, p.metodo);
        rawLines.push({
          cuentaCodigo: ctaDest.codigo,
          cuentaNombre: ctaDest.nombre,
          debe: 0,
          haber: m,
          concepto: `Reversión abono directo Factura ${factura.folio} (${ctaDest.nombre})`,
        });
      }
    }

    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.FACTURA,
      documentoId: factura.id,
      codigo: factura.folio,
      fecha: toIsoDate(factura.fechaEmision),
      tercero: factura.cliente?.nombre || 'Cliente',
      monto: total,
      estadoActual: factura.estado,
      estadoResultante: EstadoFactura.CANCELADA,
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias,
      impactoInventario: {
        tieneImpacto: false,
        tipoInventario: 'NINGUNO',
        resumen:
          'Anular una factura NO modifica las existencias ni el estado físico de la maquinaria. Si los equipos siguen en obra, el contrato y los despachos permanecen intactos.',
        items: [],
      },
      impactoContable: {
        tieneImpacto: true,
        mecanismo: 'EXCLUSION_POLIZA_AUTOMATICA',
        resumen: `Al anular ${factura.folio} se revierte el ingreso de C$ ${subtotal.toFixed(2)}, el IVA por pagar de C$ ${iva.toFixed(2)} y el activo correspondiente por C$ ${total.toFixed(2)}.`,
        efectoBalanceGeneral: `Disminuye Activo (${factura.condicionPago === 'CREDITO' ? 'CxC Clientes 110301' : 'Caja/Bancos'}) en C$ ${total.toFixed(2)} y disminuye Pasivo (IVA 210201) en C$ ${iva.toFixed(2)}.`,
        efectoEstadoResultados: `Disminuyen los Ingresos (${ctaIngreso.codigo}) en C$ ${subtotal.toFixed(2)}, reduciendo la utilidad neta del período.`,
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: relacionados,
    };
  }

  private async previewContrato(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: documentoId, sucursal: { empresaId } },
      include: {
        cliente: true,
        cotizacion: true,
        items: { include: { equipo: true } },
        reservas: { include: { equipo: true } },
        despachos: true,
        facturas: true,
        cortesFacturacion: true,
        solicitudesDespacho: true,
      },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');

    const bloqueos: string[] = [];
    const advertencias: string[] = [];
    const relacionados: RelatedDocumentImpact[] = [];

    if (contrato.estado === EstadoContrato.CANCELADO) {
      bloqueos.push('Este contrato ya se encuentra CANCELADO.');
    }
    if (contrato.estado === EstadoContrato.FINALIZADO) {
      bloqueos.push('No se puede anular un contrato que ya fue FINALIZADO.');
    }
    if (contrato.despachos && contrato.despachos.length > 0) {
      bloqueos.push(
        `El contrato tiene ${contrato.despachos.length} despacho(s) ejecutado(s). Debe procesar primero la devolución física de la maquinaria en Operaciones.`,
      );
    }
    const facturasActivas = (contrato.facturas || []).filter(
      (f) => f.estado !== EstadoFactura.CANCELADA,
    );
    if (facturasActivas.length > 0) {
      bloqueos.push(
        `El contrato tiene ${facturasActivas.length} factura(s) vigente(s) (${facturasActivas.map((f) => f.folio).join(', ')}). Debe anular primero las facturas.`,
      );
    }

    const reservasActivas = (contrato.reservas || []).filter(
      (r) =>
        r.estado === EstadoReserva.CONFIRMADA ||
        r.estado === EstadoReserva.PENDIENTE,
    );

    const invItems: InventoryImpactItem[] = reservasActivas.map((res) => {
      const itemContrato = contrato.items.find((it) => it.equipoId === res.equipoId);
      const cant = itemContrato ? Number(itemContrato.cantidad || 1) : 1;
      const isSer = res.equipo.tipoControl === TipoControlEquipo.SERIALIZADO;
      const stockActual = Number(res.equipo.cantidadDisponible || 0);
      const stockResultante = isSer
        ? 1
        : Math.min(Number(res.equipo.cantidadTotal || 1), stockActual + cant);

      return {
        id: res.equipoId,
        codigo: res.equipo.codigo || 'S/C',
        nombre: res.equipo.modelo,
        tipoControl: res.equipo.tipoControl,
        estadoActual: res.equipo.estado,
        estadoResultante: EstadoEquipo.DISPONIBLE,
        stockActual,
        cambioStock: round2(stockResultante - stockActual),
        stockResultante,
        accion: 'LIBERAR_RESERVA',
        detalle: `Reserva ${res.estado} → CANCELADA. Maquinaria liberada para nueva renta.`,
      };
    });

    for (const sol of contrato.solicitudesDespacho.filter(
      (s) => s.estado === 'PENDIENTE',
    )) {
      relacionados.push({
        tipo: 'SOLICITUD_DESPACHO',
        codigo: sol.codigo,
        estadoActual: sol.estado,
        estadoResultante: 'CANCELADA',
        detalle: 'Solicitud de despacho pendiente cancelada automáticamente.',
      });
    }
    for (const ct of contrato.cortesFacturacion.filter(
      (c) => c.estado === EstadoCorteFacturacion.PENDIENTE,
    )) {
      relacionados.push({
        tipo: 'CORTE_FACTURACION',
        codigo: `Corte #${ct.numeroCorte}`,
        estadoActual: ct.estado,
        estadoResultante: EstadoCorteFacturacion.ANULADO,
        detalle: `Corte pendiente por C$ ${round2(Number(ct.monto)).toFixed(2)} anulado.`,
      });
    }

    const dep = round2(Number(contrato.depositoGarantia || 0));
    const rawLines: Array<{
      cuentaCodigo: string;
      cuentaNombre: string;
      debe: number;
      haber: number;
      concepto: string;
    }> = [];

    if (dep > 0) {
      rawLines.push(
        {
          cuentaCodigo: BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.codigo,
          cuentaNombre: BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.nombre,
          debe: dep,
          haber: 0,
          concepto: `Liberación/Devolución depósito garantía Contrato ${contrato.codigo}`,
        },
        {
          cuentaCodigo: BM_CUENTAS.BANCO_LAFISE.codigo,
          cuentaNombre: BM_CUENTAS.BANCO_LAFISE.nombre,
          debe: 0,
          haber: dep,
          concepto: `Reversión ingreso bancario depósito Contrato ${contrato.codigo}`,
        },
      );
    }

    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.CONTRATO,
      documentoId: contrato.id,
      codigo: contrato.codigo,
      fecha: toIsoDate(contrato.fechaInicio),
      tercero: contrato.cliente?.nombre || 'Cliente',
      monto: round2(Number(contrato.cotizacion?.total || dep || 0)),
      estadoActual: contrato.estado,
      estadoResultante: EstadoContrato.CANCELADO,
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias,
      impactoInventario: {
        tieneImpacto: invItems.length > 0,
        tipoInventario: invItems.length > 0 ? 'FLOTA_MAQUINARIA' : 'NINGUNO',
        resumen:
          invItems.length > 0
            ? `Se liberarán ${invItems.length} equipo(s) reservado(s) regresando inmediatamente a estado DISPONIBLE.`
            : 'Este contrato no tiene reservas activas pendientes por liberar.',
        items: invItems,
      },
      impactoContable: {
        tieneImpacto: partidas.length > 0,
        mecanismo:
          partidas.length > 0 ? 'EXCLUSION_POLIZA_AUTOMATICA' : 'SIN_IMPACTO',
        resumen:
          dep > 0
            ? `Se revierte la póliza de depósito en garantía por C$ ${dep.toFixed(2)} (210409 vs 110201).`
            : 'Sin depósito en garantía ni facturas activas: la cancelación no altera saldos contables.',
        efectoBalanceGeneral:
          dep > 0
            ? `Disminuye Banco (110201) y Pasivo por Depósitos de Clientes (210409) en C$ ${dep.toFixed(2)}.`
            : 'Sin efecto en Balance General.',
        efectoEstadoResultados: 'Sin efecto en Estado de Resultados (P&L).',
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: relacionados,
    };
  }

  private async previewCotizacion(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const cot = await this.prisma.cotizacion.findFirst({
      where: { id: documentoId, OR: [{ empresaId }, { cliente: { empresaId } }] },
      include: {
        cliente: true,
        facturas: true,
        contratos: {
          include: {
            items: true,
            despachos: true,
            facturas: true,
            reservas: { include: { equipo: true } },
          },
        },
      },
    });
    if (!cot) throw new NotFoundException('Cotización no encontrada.');

    const bloqueos: string[] = [];
    const advertencias: string[] = [];
    const relacionados: RelatedDocumentImpact[] = [];
    const invItems: InventoryImpactItem[] = [];
    let depositoLiberado = 0;

    if (cot.estado === 'CANCELADA') {
      bloqueos.push('Esta cotización ya se encuentra CANCELADA.');
    }
    if (cot.estado === 'FACTURADA') {
      bloqueos.push('No se puede anular una cotización ya FACTURADA.');
    }
    const facsActivas = (cot.facturas || []).filter(
      (f) => f.estado !== EstadoFactura.CANCELADA,
    );
    if (facsActivas.length > 0) {
      bloqueos.push(
        `Tiene facturas activas (${facsActivas.map((f) => f.folio).join(', ')}). Anule primero las facturas.`,
      );
    }

    for (const ctr of cot.contratos || []) {
      if (ctr.estado === EstadoContrato.CANCELADO) continue;
      if (ctr.estado === EstadoContrato.FINALIZADO) {
        bloqueos.push(`El contrato vinculado ${ctr.codigo} ya fue FINALIZADO.`);
      }
      if (ctr.despachos && ctr.despachos.length > 0) {
        bloqueos.push(
          `El contrato vinculado ${ctr.codigo} ya tiene despachos ejecutados.`,
        );
      }
      const ctrFacs = (ctr.facturas || []).filter(
        (f) => f.estado !== EstadoFactura.CANCELADA,
      );
      if (ctrFacs.length > 0) {
        bloqueos.push(
          `El contrato vinculado ${ctr.codigo} tiene facturas activas.`,
        );
      }

      relacionados.push({
        tipo: 'CONTRATO',
        codigo: ctr.codigo,
        estadoActual: ctr.estado,
        estadoResultante: EstadoContrato.CANCELADO,
        detalle: 'Contrato derivado cancelado atómicamente junto con la cotización.',
      });
      depositoLiberado = round2(depositoLiberado + Number(ctr.depositoGarantia || 0));

      for (const res of (ctr.reservas || []).filter(
        (r) => r.estado === 'CONFIRMADA' || r.estado === 'PENDIENTE',
      )) {
        const itCtr = ctr.items.find((i) => i.equipoId === res.equipoId);
        const cant = itCtr ? Number(itCtr.cantidad || 1) : 1;
        const isSer = res.equipo.tipoControl === TipoControlEquipo.SERIALIZADO;
        const stockActual = Number(res.equipo.cantidadDisponible || 0);
        const stockResultante = isSer
          ? 1
          : Math.min(Number(res.equipo.cantidadTotal || 1), stockActual + cant);

        invItems.push({
          id: res.equipoId,
          codigo: res.equipo.codigo || 'S/C',
          nombre: res.equipo.modelo,
          tipoControl: res.equipo.tipoControl,
          estadoActual: res.equipo.estado,
          estadoResultante: EstadoEquipo.DISPONIBLE,
          stockActual,
          cambioStock: round2(stockResultante - stockActual),
          stockResultante,
          accion: 'LIBERAR_RESERVA',
          detalle: `Liberado por cancelación de contrato vinculado ${ctr.codigo}.`,
        });
      }
    }

    const rawLines =
      depositoLiberado > 0
        ? [
            {
              cuentaCodigo: BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.codigo,
              cuentaNombre: BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.nombre,
              debe: depositoLiberado,
              haber: 0,
              concepto: `Liberación depósito garantía contrato vinculado a ${cot.numeroCotizacion}`,
            },
            {
              cuentaCodigo: BM_CUENTAS.BANCO_LAFISE.codigo,
              cuentaNombre: BM_CUENTAS.BANCO_LAFISE.nombre,
              debe: 0,
              haber: depositoLiberado,
              concepto: `Reversión banco depósito ${cot.numeroCotizacion}`,
            },
          ]
        : [];
    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.COTIZACION,
      documentoId: cot.id,
      codigo: `${cot.numeroCotizacion} v${cot.version}`,
      fecha: toIsoDate(cot.fechaEmision),
      tercero: cot.cliente?.nombre || 'Cliente',
      monto: round2(Number(cot.total || 0)),
      estadoActual: cot.estado,
      estadoResultante: 'CANCELADA',
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias,
      impactoInventario: {
        tieneImpacto: invItems.length > 0,
        tipoInventario: invItems.length > 0 ? 'FLOTA_MAQUINARIA' : 'NINGUNO',
        resumen:
          invItems.length > 0
            ? `Liberará ${invItems.length} equipo(s) reservado(s) del contrato asociado devolviéndolos a DISPONIBLE.`
            : 'La cotización no tiene reservas de flota activas comprometidas.',
        items: invItems,
      },
      impactoContable: {
        tieneImpacto: partidas.length > 0,
        mecanismo: partidas.length > 0 ? 'EXCLUSION_POLIZA_AUTOMATICA' : 'SIN_IMPACTO',
        resumen:
          depositoLiberado > 0
            ? `Al cancelar el contrato derivado se libera el depósito en garantía de C$ ${depositoLiberado.toFixed(2)}.`
            : 'Las cotizaciones no afectan cuentas contables de mayor.',
        efectoBalanceGeneral:
          depositoLiberado > 0
            ? `Reduce Banco y Depósitos de Clientes en C$ ${depositoLiberado.toFixed(2)}.`
            : 'Sin efecto en Balance General.',
        efectoEstadoResultados: 'Sin efecto en Estado de Resultados.',
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: relacionados,
    };
  }

  private async previewReciboCaja(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const recibo = await this.prisma.reciboCaja.findFirst({
      where: { id: documentoId, empresaId },
      include: {
        cliente: true,
        aplicaciones: {
          include: {
            factura: { select: { folio: true, saldoPendiente: true, total: true, estado: true } },
            notaDebito: { select: { numeroNota: true, saldoPendiente: true, estado: true } },
          },
        },
        anticiposGenerados: true,
      },
    });
    if (!recibo) throw new NotFoundException('Recibo de caja no encontrado.');

    const bloqueos: string[] = [];
    const relacionados: RelatedDocumentImpact[] = [];

    if (recibo.estado === 'ANULADO') {
      bloqueos.push('Este recibo de caja ya se encuentra ANULADO.');
    }
    for (const ant of recibo.anticiposGenerados || []) {
      if (Number(ant.saldoDisponible) < Number(ant.montoOriginal)) {
        bloqueos.push(
          'El anticipo por excedente generado por este recibo ya fue aplicado parcialmente en otra operación.',
        );
      }
    }

    for (const app of recibo.aplicaciones || []) {
      if (app.factura) {
        const nuevoSaldo = round2(
          Number(app.factura.saldoPendiente) + Number(app.montoCapitalAplicado),
        );
        relacionados.push({
          tipo: 'FACTURA',
          codigo: app.factura.folio,
          estadoActual: app.factura.estado,
          estadoResultante: 'PENDIENTE',
          detalle: `Se restituye C$ ${round2(Number(app.montoCapitalAplicado)).toFixed(2)} al saldo pendiente (nuevo saldo: C$ ${nuevoSaldo.toFixed(2)}).`,
        });
      } else if (app.notaDebito) {
        relacionados.push({
          tipo: 'NOTA_DEBITO',
          codigo: app.notaDebito.numeroNota,
          estadoActual: app.notaDebito.estado,
          estadoResultante: 'PENDIENTE',
          detalle: `Se restituye C$ ${round2(Number(app.montoCapitalAplicado)).toFixed(2)} al saldo pendiente.`,
        });
      }
    }

    const cuentaDestino = resolverCuentaBancariaOCaja(
      recibo.banco,
      recibo.metodoPago,
    );
    const totalAplicado = round2(Number(recibo.totalAplicadoDocumentos || 0));
    const montoExcedente = round2(Number(recibo.montoExcedenteAnticipo || 0));
    const montoEfectivo = round2(Number(recibo.montoEfectivoBancos || 0));
    const montoRetIr = round2(Number(recibo.montoRetencionIr || 0));
    const montoRetImi = round2(Number(recibo.montoRetencionImi || 0));

    const rawLines: Array<{
      cuentaCodigo: string;
      cuentaNombre: string;
      debe: number;
      haber: number;
      concepto: string;
    }> = [];

    if (totalAplicado > 0) {
      rawLines.push({
        cuentaCodigo: BM_CUENTAS.CXC_CLIENTES.codigo,
        cuentaNombre: BM_CUENTAS.CXC_CLIENTES.nombre,
        debe: totalAplicado,
        haber: 0,
        concepto: `Restitución CxC por anulación Recibo ${recibo.numeroRecibo}`,
      });
    }
    if (montoExcedente > 0) {
      rawLines.push({
        cuentaCodigo: BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.codigo,
        cuentaNombre: BM_CUENTAS.ANTICIPOS_DEPOSITOS_CLIENTES.nombre,
        debe: montoExcedente,
        haber: 0,
        concepto: `Reversión anticipo Recibo ${recibo.numeroRecibo}`,
      });
    }
    if (montoEfectivo > 0) {
      rawLines.push({
        cuentaCodigo: cuentaDestino.codigo,
        cuentaNombre: cuentaDestino.nombre,
        debe: 0,
        haber: montoEfectivo,
        concepto: `Salida/reversión de ingreso Recibo ${recibo.numeroRecibo}`,
      });
    }
    if (montoRetIr > 0) {
      rawLines.push({
        cuentaCodigo: BM_CUENTAS.RETENCION_IR_FAVOR.codigo,
        cuentaNombre: BM_CUENTAS.RETENCION_IR_FAVOR.nombre,
        debe: 0,
        haber: montoRetIr,
        concepto: `Reversión retención IR 2% Recibo ${recibo.numeroRecibo}`,
      });
    }
    if (montoRetImi > 0) {
      rawLines.push({
        cuentaCodigo: BM_CUENTAS.RETENCION_IMI_FAVOR.codigo,
        cuentaNombre: BM_CUENTAS.RETENCION_IMI_FAVOR.nombre,
        debe: 0,
        haber: montoRetImi,
        concepto: `Reversión retención IMI 1% Recibo ${recibo.numeroRecibo}`,
      });
    }

    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.RECIBO_CAJA,
      documentoId: recibo.id,
      codigo: recibo.numeroRecibo,
      fecha: toIsoDate(recibo.fechaRecibo),
      tercero: recibo.cliente?.nombre || 'Cliente',
      monto: round2(Number(recibo.totalLiquidado || 0)),
      estadoActual: recibo.estado,
      estadoResultante: 'ANULADO',
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias: [],
      impactoInventario: {
        tieneImpacto: false,
        tipoInventario: 'NINGUNO',
        resumen: 'Los recibos de caja son documentos financieros y no alteran el inventario físico.',
        items: [],
      },
      impactoContable: {
        tieneImpacto: true,
        mecanismo: 'ASIENTO_REVERSION',
        resumen: `Se generará un asiento contable de reversión (CXC_REVERSION) por C$ ${totalDebe.toFixed(2)} restaurando la deuda del cliente y revirtiendo el ingreso en ${cuentaDestino.nombre}.`,
        efectoBalanceGeneral: `Aumenta CxC Clientes (110301) en C$ ${totalAplicado.toFixed(2)} y disminuye ${cuentaDestino.nombre} en C$ ${montoEfectivo.toFixed(2)}.`,
        efectoEstadoResultados: 'Sin efecto en P&L (operación de cartera/tesorería).',
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: relacionados,
    };
  }

  private async previewCompraInsumo(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const compra = await this.prisma.compraInsumo.findFirst({
      where: { id: documentoId, empresaId },
      include: {
        items: { include: { insumo: true } },
        pagos: true,
      },
    });
    if (!compra) throw new NotFoundException('Compra de insumos no encontrada.');

    const bloqueos: string[] = [];
    if (compra.estado === EstadoCompraInsumo.ANULADA) {
      bloqueos.push('Esta orden de compra ya fue ANULADA.');
    }
    if (compra.condicionPago === 'CREDITO' && Number(compra.montoPagado || 0) > 0) {
      bloqueos.push(
        `La compra a crédito ya tiene abonos registrados por C$ ${round2(Number(compra.montoPagado)).toFixed(2)}.`,
      );
    }

    const invItems: InventoryImpactItem[] = [];
    if (compra.estado === EstadoCompraInsumo.RECIBIDA) {
      for (const item of compra.items) {
        const stockActual = round2(Number(item.insumo?.stockActual || 0));
        const cant = round2(Number(item.cantidad || 0));
        const stockResultante = round2(stockActual - cant);
        if (stockActual < cant) {
          bloqueos.push(
            `Stock insuficiente en bodega para revertir "${item.insumo?.nombre}": actual ${stockActual}, comprado ${cant} (parte ya fue consumida en taller).`,
          );
        }
        invItems.push({
          id: item.insumoId,
          codigo: item.insumo?.codigo || '-',
          nombre: item.insumo?.nombre || 'Insumo',
          tipoControl: item.insumo?.unidadMedida || 'UNIDAD',
          estadoActual: `Stock: ${stockActual}`,
          estadoResultante: `Stock: ${Math.max(0, stockResultante)}`,
          stockActual,
          cambioStock: -cant,
          stockResultante: Math.max(0, stockResultante),
          accion: 'DESCONTAR_ENTRADA_BODEGA',
          detalle: `Se generará salida Kardex de bodega (-${cant} ${item.insumo?.unidadMedida || ''}) por reversión de compra ${compra.codigo}.`,
        });
      }
    }

    const subtotal = round2(Number(compra.subtotal || 0));
    const iva = round2(Number(compra.ivaTotal || 0));
    const total = round2(Number(compra.total || 0));
    const esCredito = compra.condicionPago === 'CREDITO';
    const ctaPago = resolverCuentaBancariaOCaja(
      compra.cuentaPagoCodigo,
      compra.metodoPago,
    );

    const rawLines =
      compra.estado === EstadoCompraInsumo.RECIBIDA
        ? [
            {
              cuentaCodigo: esCredito
                ? BM_CUENTAS.PROVEEDORES_OTROS.codigo
                : ctaPago.codigo,
              cuentaNombre: esCredito
                ? BM_CUENTAS.PROVEEDORES_OTROS.nombre
                : ctaPago.nombre,
              debe: total,
              haber: 0,
              concepto: `Reversión ${esCredito ? 'CxP Proveedor' : 'pago contado'} compra ${compra.codigo}`,
            },
            {
              cuentaCodigo: BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.codigo,
              cuentaNombre: BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.nombre,
              debe: 0,
              haber: subtotal,
              concepto: `Reversión entrada inventario bodega compra ${compra.codigo}`,
            },
            ...(iva > 0
              ? [
                  {
                    cuentaCodigo: BM_CUENTAS.IVA_PAGADOS_COMPRAS.codigo,
                    cuentaNombre: BM_CUENTAS.IVA_PAGADOS_COMPRAS.nombre,
                    debe: 0,
                    haber: iva,
                    concepto: `Reversión IVA acreditable compra ${compra.codigo}`,
                  },
                ]
              : []),
          ]
        : [];

    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.COMPRA_INSUMO,
      documentoId: compra.id,
      codigo: compra.codigo,
      fecha: toIsoDate(compra.fechaCompra),
      tercero: compra.proveedorNombre,
      monto: total,
      estadoActual: compra.estado,
      estadoResultante: EstadoCompraInsumo.ANULADA,
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias: [],
      impactoInventario: {
        tieneImpacto: invItems.length > 0,
        tipoInventario: invItems.length > 0 ? 'BODEGA_INSUMOS' : 'NINGUNO',
        resumen:
          invItems.length > 0
            ? `Se descontarán ${invItems.length} insumo(s) de la Bodega de Insumos generando movimientos Kardex de SALIDA por reversión.`
            : 'Compra en estado BORRADOR: no había ingresado stock a bodega.',
        items: invItems,
      },
      impactoContable: {
        tieneImpacto: partidas.length > 0,
        mecanismo: partidas.length > 0 ? 'ASIENTO_REVERSION' : 'SIN_IMPACTO',
        resumen:
          partidas.length > 0
            ? `Se generará Asiento de Reversión PUBLICADO revirtiendo Inventario (121002), IVA Pagado (110702) y ${esCredito ? 'CxP Proveedores (210101)' : ctaPago.nombre}.`
            : 'Sin asiento contable publicado que revertir.',
        efectoBalanceGeneral:
          partidas.length > 0
            ? `Disminuye Inventario de Insumos (121002) en C$ ${subtotal.toFixed(2)} y ${esCredito ? 'disminuye Pasivo CxP Proveedores (210101)' : `reintegra ${ctaPago.nombre}`} en C$ ${total.toFixed(2)}.`
            : 'Sin efecto en Balance General.',
        efectoEstadoResultados: 'Sin efecto directo en P&L (compra capitalizada a inventario de insumos).',
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: [],
    };
  }

  private async previewSubarriendo(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const sub = await this.prisma.subarriendoProveedor.findFirst({
      where: { id: documentoId, empresaId },
      include: { equipo: true },
    });
    if (!sub) throw new NotFoundException('Subarriendo no encontrado.');

    const bloqueos: string[] = [];
    if (sub.estado !== EstadoSubarriendoProveedor.ACTIVO) {
      bloqueos.push(
        `Solo se pueden anular subarriendos en estado ACTIVO (actual: ${sub.estado}).`,
      );
    }
    if (Number(sub.montoPagado || 0) > 0) {
      bloqueos.push(
        `El subarriendo ya registra pagos al proveedor por C$ ${round2(Number(sub.montoPagado)).toFixed(2)}.`,
      );
    }
    if (
      sub.equipo &&
      ['RENTADO', 'DESPACHADO', 'EN_ALQUILER'].includes(sub.equipo.estado)
    ) {
      bloqueos.push(
        `El equipo externo ${sub.equipo.codigo || sub.equipo.modelo} está actualmente en obra (${sub.equipo.estado}).`,
      );
    }

    const invItems: InventoryImpactItem[] = sub.equipo
      ? [
          {
            id: sub.equipo.id,
            codigo: sub.equipo.codigo || 'S/C',
            nombre: sub.equipo.modelo,
            tipoControl: sub.equipo.tipoControl,
            estadoActual: sub.equipo.disponibleParaRenta
              ? `${sub.equipo.estado} (Habilitado)`
              : `${sub.equipo.estado} (No habilitado)`,
            estadoResultante: `${sub.equipo.estado} (Deshabilitado para Renta)`,
            stockActual: Number(sub.equipo.cantidadDisponible || 0),
            cambioStock: 0,
            stockResultante: Number(sub.equipo.cantidadDisponible || 0),
            accion: 'DESHABILITAR_EXTERNO',
            detalle:
              'Se marca disponibleParaRenta = false si no existen otros subarriendos activos.',
          },
        ]
      : [];

    const monto = round2(Number(sub.montoFinal ?? sub.montoEstimado ?? 0));
    const rawLines =
      sub.asientoId && monto > 0
        ? [
            {
              cuentaCodigo: BM_CUENTAS.PROVEEDORES_OTROS.codigo,
              cuentaNombre: BM_CUENTAS.PROVEEDORES_OTROS.nombre,
              debe: monto,
              haber: 0,
              concepto: `Reversión CxP proveedor subarriendo ${sub.codigo}`,
            },
            {
              cuentaCodigo: BM_CUENTAS.COSTO_SUBARRIENDO_MAQUINARIA.codigo,
              cuentaNombre: BM_CUENTAS.COSTO_SUBARRIENDO_MAQUINARIA.nombre,
              debe: 0,
              haber: monto,
              concepto: `Reversión costo subarriendo ${sub.codigo}`,
            },
          ]
        : [];
    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.SUBARRIENDO_PROVEEDOR,
      documentoId: sub.id,
      codigo: sub.codigo,
      fecha: toIsoDate(sub.fechaInicio),
      tercero: sub.proveedorNombre,
      monto,
      estadoActual: sub.estado,
      estadoResultante: EstadoSubarriendoProveedor.CANCELADO,
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias: [],
      impactoInventario: {
        tieneImpacto: invItems.length > 0,
        tipoInventario: 'FLOTA_MAQUINARIA',
        resumen:
          'Deshabilita la maquinaria externa para nuevas rentas al cancelar el período con el proveedor.',
        items: invItems,
      },
      impactoContable: {
        tieneImpacto: partidas.length > 0,
        mecanismo: partidas.length > 0 ? 'ASIENTO_REVERSION' : 'SIN_IMPACTO',
        resumen:
          partidas.length > 0
            ? `Revierte la obligación CxP Proveedores (210101) y el costo de subarriendo (510106) por C$ ${monto.toFixed(2)}.`
            : 'Este subarriendo no tenía asiento contable de devengo generado.',
        efectoBalanceGeneral:
          partidas.length > 0
            ? `Disminuye Pasivo CxP Proveedores (210101) en C$ ${monto.toFixed(2)}.`
            : 'Sin efecto en Balance General.',
        efectoEstadoResultados:
          partidas.length > 0
            ? `Disminuye Costo de Subarriendo (510106) en C$ ${monto.toFixed(2)}.`
            : 'Sin efecto en P&L.',
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: [],
    };
  }

  private async previewNotaCxc(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const nota = await this.prisma.notaDebito.findFirst({
      where: { id: documentoId, empresaId },
      include: {
        cliente: true,
        facturaReferencia: true,
        reciboAplicaciones: { include: { reciboCaja: true } },
        arregloDocumentos: { include: { arreglo: true } },
      },
    });
    if (!nota) throw new NotFoundException('Nota CxC no encontrada.');

    const bloqueos: string[] = [];
    const relacionados: RelatedDocumentImpact[] = [];

    if (nota.estado === EstadoNotaCxc.ANULADA) {
      bloqueos.push('Esta nota ya se encuentra ANULADA.');
    }
    const recibosActivos = (nota.reciboAplicaciones || []).filter(
      (a) => a.reciboCaja && a.reciboCaja.estado !== 'ANULADO',
    );
    if (recibosActivos.length > 0) {
      bloqueos.push(
        `La nota tiene recibos de caja aplicados (${recibosActivos.map((r) => r.reciboCaja.numeroRecibo).join(', ')}).`,
      );
    }

    const subtotal = round2(Number(nota.subtotal || 0));
    const iva = round2(Number(nota.iva || 0));
    const total = round2(Number(nota.total || 0));
    const esCredito = nota.tipoNota === TipoNotaCxc.CREDITO;

    if (esCredito && nota.facturaReferencia) {
      relacionados.push({
        tipo: 'FACTURA',
        codigo: nota.facturaReferencia.folio,
        estadoActual: nota.facturaReferencia.estado,
        estadoResultante: 'PENDIENTE',
        detalle: `Restaura C$ ${total.toFixed(2)} al saldo pendiente de la factura referenciada.`,
      });
    }

    const rawLines = esCredito
      ? [
          {
            cuentaCodigo: BM_CUENTAS.CXC_CLIENTES.codigo,
            cuentaNombre: BM_CUENTAS.CXC_CLIENTES.nombre,
            debe: total,
            haber: 0,
            concepto: `Restitución CxC por anulación Nota de Crédito ${nota.numeroNota}`,
          },
          {
            cuentaCodigo: BM_CUENTAS.DESCUENTOS_DEVOLUCIONES_VENTAS.codigo,
            cuentaNombre: BM_CUENTAS.DESCUENTOS_DEVOLUCIONES_VENTAS.nombre,
            debe: 0,
            haber: subtotal,
            concepto: `Reversión devolución/descuento Nota ${nota.numeroNota}`,
          },
          ...(iva > 0
            ? [
                {
                  cuentaCodigo: BM_CUENTAS.IVA_POR_PAGAR.codigo,
                  cuentaNombre: BM_CUENTAS.IVA_POR_PAGAR.nombre,
                  debe: 0,
                  haber: iva,
                  concepto: `Restitución IVA Nota ${nota.numeroNota}`,
                },
              ]
            : []),
        ]
      : [
          {
            cuentaCodigo: BM_CUENTAS.OTROS_INGRESOS.codigo,
            cuentaNombre: BM_CUENTAS.OTROS_INGRESOS.nombre,
            debe: subtotal,
            haber: 0,
            concepto: `Reversión cargo Nota de Débito ${nota.numeroNota}`,
          },
          ...(iva > 0
            ? [
                {
                  cuentaCodigo: BM_CUENTAS.IVA_POR_PAGAR.codigo,
                  cuentaNombre: BM_CUENTAS.IVA_POR_PAGAR.nombre,
                  debe: iva,
                  haber: 0,
                  concepto: `Reversión IVA Nota de Débito ${nota.numeroNota}`,
                },
              ]
            : []),
          {
            cuentaCodigo: BM_CUENTAS.CXC_CLIENTES.codigo,
            cuentaNombre: BM_CUENTAS.CXC_CLIENTES.nombre,
            debe: 0,
            haber: total,
            concepto: `Baja CxC Nota de Débito ${nota.numeroNota}`,
          },
        ];

    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.NOTA_CXC,
      documentoId: nota.id,
      codigo: nota.numeroNota,
      fecha: toIsoDate(nota.fechaEmision),
      tercero: nota.cliente?.nombre || 'Cliente',
      monto: total,
      estadoActual: nota.estado,
      estadoResultante: EstadoNotaCxc.ANULADA,
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias: [],
      impactoInventario: {
        tieneImpacto: false,
        tipoInventario: 'NINGUNO',
        resumen: 'Las notas de débito/crédito CxC no modifican inventario físico.',
        items: [],
      },
      impactoContable: {
        tieneImpacto: true,
        mecanismo: 'ASIENTO_REVERSION',
        resumen: `Se generará Asiento de Reversión PUBLICADO para anular la Nota de ${nota.tipoNota} ${nota.numeroNota} por C$ ${total.toFixed(2)}.`,
        efectoBalanceGeneral: esCredito
          ? `Aumenta CxC Clientes (110301) en C$ ${total.toFixed(2)}.`
          : `Disminuye CxC Clientes (110301) en C$ ${total.toFixed(2)}.`,
        efectoEstadoResultados: esCredito
          ? `Revierte descuento/devolución sobre ventas (410103) por C$ ${subtotal.toFixed(2)}.`
          : `Disminuye Otros Ingresos (410401) en C$ ${subtotal.toFixed(2)}.`,
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: relacionados,
    };
  }

  private async previewAsientoManual(
    empresaId: string,
    documentoId: string,
    balancesMap: Map<string, { saldoNeto: number; naturaleza: 'Deudora' | 'Acreedora'; nombre: string }>,
  ): Promise<VoidingImpactPreview> {
    const asiento = await this.prisma.asientoContable.findFirst({
      where: { id: documentoId, empresaId },
      include: { lineas: true },
    });
    if (!asiento) throw new NotFoundException('Asiento contable no encontrado.');

    const bloqueos: string[] = [];
    if (asiento.estado === 'ANULADO') {
      bloqueos.push('Este asiento contable ya fue ANULADO.');
    }
    if (asiento.origenModulo !== 'MANUAL') {
      bloqueos.push(
        `Este asiento pertenece al módulo automático ${asiento.origenModulo}. Anule el documento origen.`,
      );
    }

    const rawLines = (asiento.lineas || []).map((l) => ({
      cuentaCodigo: l.cuentaCodigo,
      cuentaNombre: l.cuentaNombre,
      debe: round2(Number(l.haber || 0)),
      haber: round2(Number(l.debe || 0)),
      concepto: `Reversión espejo de ${asiento.numeroAsiento}`,
    }));

    const partidas = this.enrichAccountingLines(rawLines, balancesMap);
    const totalDebe = round2(partidas.reduce((s, p) => s + p.debe, 0));
    const totalHaber = round2(partidas.reduce((s, p) => s + p.haber, 0));

    return {
      tipoDocumento: TipoDocumentoAnulable.ASIENTO_MANUAL,
      documentoId: asiento.id,
      codigo: asiento.numeroAsiento,
      fecha: toIsoDate(asiento.fecha),
      tercero: 'Contabilidad Interna',
      monto: round2(Number(asiento.totalDebe || 0)),
      estadoActual: asiento.estado,
      estadoResultante: 'ANULADO',
      puedeAnular: bloqueos.length === 0,
      bloqueos,
      advertencias: [],
      impactoInventario: {
        tieneImpacto: false,
        tipoInventario: 'NINGUNO',
        resumen: 'Los asientos contables manuales no alteran stock físico.',
        items: [],
      },
      impactoContable: {
        tieneImpacto: true,
        mecanismo: 'ANULACION_ASIENTO',
        resumen: `El asiento ${asiento.numeroAsiento} pasará a estado ANULADO y se registrará su contrapartida espejo de trazabilidad.`,
        efectoBalanceGeneral: 'Revierte los saldos de todas las cuentas de activo/pasivo/patrimonio del asiento.',
        efectoEstadoResultados: 'Revierte los saldos de ingresos/costos/gastos incluidos en el asiento.',
        partidasReversion: partidas,
        totalDebe,
        totalHaber,
        cuadrado: Math.abs(totalDebe - totalHaber) <= 0.05,
      },
      documentosRelacionados: [],
    };
  }

  // ============================================================================
  // EJECUCIÓN ATÓMICA DE ANULACIÓN CON TRAZABILIDAD INVENTARIO + CONTABILIDAD
  // ============================================================================
  async ejecutarAnulacion(
    empresaId: string,
    dto: ExecuteVoidingDto,
    usuarioId: string,
    user?: {
      id: string;
      roles?: Array<string | { nombre?: string; rol?: { nombre?: string } }>;
    },
    context?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    this.requireEmpresa(empresaId);
    const motivo = dto.motivo?.trim();
    if (!motivo || motivo.length < 5) {
      throw new BadRequestException(
        'El motivo de anulación es obligatorio y debe tener al menos 5 caracteres.',
      );
    }

    const preview = await this.previsualizarAnulacion(
      empresaId,
      dto.tipoDocumento,
      dto.documentoId,
    );
    if (!preview.puedeAnular) {
      throw new BadRequestException(
        preview.bloqueos.join(' | ') || 'No es posible anular este documento.',
      );
    }

    let asientoReversionNumero: string | null = null;

    switch (dto.tipoDocumento) {
      case TipoDocumentoAnulable.FACTURA:
        await this.executeVoidFactura(empresaId, dto.documentoId, motivo, usuarioId, preview);
        break;
      case TipoDocumentoAnulable.CONTRATO:
        await this.executeVoidContrato(empresaId, dto.documentoId, motivo, usuarioId, preview);
        break;
      case TipoDocumentoAnulable.COTIZACION:
        await this.quotationsService.cancelQuotation(
          dto.documentoId,
          empresaId,
          motivo,
          usuarioId,
          user,
          context,
        );
        break;
      case TipoDocumentoAnulable.RECIBO_CAJA: {
        const resRecibo = await this.cxcRecibosService.anularReciboCaja(
          empresaId,
          dto.documentoId,
          usuarioId,
          motivo,
        );
        asientoReversionNumero =
          (resRecibo as any)?.asientoReversion?.numeroAsiento || null;
        break;
      }
      case TipoDocumentoAnulable.COMPRA_INSUMO:
        asientoReversionNumero = await this.executeVoidCompraInsumo(
          empresaId,
          dto.documentoId,
          motivo,
          usuarioId,
          preview,
        );
        break;
      case TipoDocumentoAnulable.SUBARRIENDO_PROVEEDOR:
        asientoReversionNumero = await this.executeVoidSubarriendo(
          empresaId,
          dto.documentoId,
          motivo,
          usuarioId,
          preview,
        );
        break;
      case TipoDocumentoAnulable.NOTA_CXC:
        asientoReversionNumero = await this.executeVoidNotaCxc(
          empresaId,
          dto.documentoId,
          motivo,
          usuarioId,
          preview,
        );
        break;
      case TipoDocumentoAnulable.ASIENTO_MANUAL: {
        const resAsiento = await this.accountingService.anularAsientoManual(
          empresaId,
          dto.documentoId,
          usuarioId,
          motivo,
        );
        asientoReversionNumero =
          resAsiento?.reversion?.numeroAsiento || null;
        break;
      }
      default:
        throw new BadRequestException('Tipo de documento no soportado.');
    }

    return {
      anulado: true,
      tipoDocumento: dto.tipoDocumento,
      documentoId: dto.documentoId,
      codigo: preview.codigo,
      motivo,
      fechaAnulacion: new Date().toISOString(),
      asientoReversionNumero,
      impactoAplicado: {
        inventario: preview.impactoInventario,
        contabilidad: preview.impactoContable,
        documentosRelacionados: preview.documentosRelacionados,
      },
    };
  }

  private async executeVoidFactura(
    empresaId: string,
    facturaId: string,
    motivo: string,
    usuarioId: string,
    preview: VoidingImpactPreview,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "facturas" WHERE id = ${facturaId} FOR UPDATE`;
      const factura = await tx.factura.findFirst({
        where: { id: facturaId, OR: [{ empresaId }, { cliente: { empresaId } }] },
        include: { corte: true, cotizacion: true },
      });
      if (!factura) throw new NotFoundException('Factura no encontrada.');
      if (factura.estado === EstadoFactura.CANCELADA) {
        throw new BadRequestException('Esta factura ya está anulada.');
      }

      await tx.factura.update({
        where: { id: factura.id },
        data: {
          estado: EstadoFactura.CANCELADA,
          estadoCxc: EstadoCxcFactura.ANULADA,
          saldoPendiente: 0,
        },
      });

      if (factura.corteId) {
        await tx.corteFacturacion.update({
          where: { id: factura.corteId },
          data: { estado: EstadoCorteFacturacion.PENDIENTE },
        });
      }

      if (factura.cotizacionId && !factura.contratoId && factura.cotizacion?.estado === 'FACTURADA') {
        await tx.cotizacion.update({
          where: { id: factura.cotizacionId },
          data: { estado: 'ACEPTADA' },
        });
      }

      if (tx.serieDocumentoUso?.updateMany) {
        await tx.serieDocumentoUso.updateMany({
          where: { codigoFormateado: factura.folio },
          data: { estado: EstadoUsoDocumento.ANULADO },
        });
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'FACTURA_ANULADA',
        entidadTipo: 'FACTURA',
        entidadId: factura.id,
        detalles: {
          folio: factura.folio,
          motivo,
          total: Number(factura.total || 0),
          partidasReversion: preview.impactoContable.partidasReversion,
        },
      });
    });
  }

  private async executeVoidContrato(
    empresaId: string,
    contratoId: string,
    motivo: string,
    usuarioId: string,
    preview: VoidingImpactPreview,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findFirst({
        where: { id: contratoId, sucursal: { empresaId } },
        include: {
          items: true,
          reservas: { include: { equipo: true } },
        },
      });
      if (!contrato) throw new NotFoundException('Contrato no encontrado.');

      const reservasActivas = contrato.reservas.filter(
        (r) =>
          r.estado === EstadoReserva.CONFIRMADA ||
          r.estado === EstadoReserva.PENDIENTE,
      );

      for (const res of reservasActivas) {
        if (res.equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
          await tx.equipo.update({
            where: { id: res.equipoId },
            data: { cantidadDisponible: 1, estado: EstadoEquipo.DISPONIBLE },
          });
        } else {
          const itemCtr = contrato.items.find((i) => i.equipoId === res.equipoId);
          const cant = itemCtr ? Number(itemCtr.cantidad || 1) : 1;
          const nuevaDisp = Math.min(
            Number(res.equipo.cantidadTotal || 1),
            Number(res.equipo.cantidadDisponible || 0) + cant,
          );
          await tx.equipo.update({
            where: { id: res.equipoId },
            data: {
              cantidadDisponible: nuevaDisp,
              estado: nuevaDisp > 0 ? EstadoEquipo.DISPONIBLE : res.equipo.estado,
            },
          });
        }

        await tx.reserva.update({
          where: { id: res.id },
          data: { estado: EstadoReserva.CANCELADA },
        });
      }

      await tx.solicitudDespacho.updateMany({
        where: { contratoId: contrato.id, estado: 'PENDIENTE' },
        data: { estado: 'CANCELADA' },
      });

      await tx.corteFacturacion.updateMany({
        where: { contratoId: contrato.id, estado: EstadoCorteFacturacion.PENDIENTE },
        data: { estado: EstadoCorteFacturacion.ANULADO },
      });

      await tx.contrato.update({
        where: { id: contrato.id },
        data: { estado: EstadoContrato.CANCELADO },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'CONTRATO_ANULADO',
        entidadTipo: 'CONTRATO',
        entidadId: contrato.id,
        detalles: {
          codigo: contrato.codigo,
          motivo,
          equiposLiberados: preview.impactoInventario.items.length,
          depositoGarantia: Number(contrato.depositoGarantia || 0),
        },
      });
    });
  }

  private async executeVoidCompraInsumo(
    empresaId: string,
    compraId: string,
    motivo: string,
    usuarioId: string,
    preview: VoidingImpactPreview,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const compra = await tx.compraInsumo.findFirst({
        where: { id: compraId, empresaId },
        include: { items: { include: { insumo: true } } },
      });
      if (!compra) throw new NotFoundException('Compra de insumos no encontrada.');

      if (compra.estado === EstadoCompraInsumo.RECIBIDA) {
        for (const item of compra.items) {
          const insumo = await tx.insumo.findFirst({
            where: { id: item.insumoId, empresaId },
          });
          if (!insumo) continue;
          const stockActual = Number(insumo.stockActual || 0);
          const cant = Number(item.cantidad);
          if (stockActual < cant) {
            throw new BadRequestException(
              `Stock insuficiente de "${insumo.nombre}" para revertir la compra.`,
            );
          }
          const stockNuevo = round2Accounting(stockActual - cant);
          await tx.insumo.update({
            where: { id: insumo.id },
            data: { stockActual: stockNuevo },
          });
          await tx.insumoMovimiento.create({
            data: {
              empresaId,
              insumoId: insumo.id,
              tipo: 'SALIDA',
              cantidad: cant,
              stockAnterior: stockActual,
              stockNuevo,
              costoUnitario: Number(item.costoUnitario),
              costoTotal: Number(item.subtotal),
              motivo: `Anulación de compra ${compra.codigo}: ${motivo}`,
              destino: 'Reversión de Compra',
              referencia: compra.codigo,
              compraInsumoId: compra.id,
              usuarioId,
            },
          });
        }
      }

      let asientoNum: string | null = null;
      if (preview.impactoContable.partidasReversion.length > 0) {
        const asiento = await registrarAsientoAutomaticoInTx(tx, {
          empresaId,
          sucursalId: compra.sucursalId || null,
          fecha: new Date(),
          tipoAsiento: 'DIARIO',
          origenModulo: 'OPERACIONES',
          documentoReferencia: `REV-${compra.codigo}`,
          concepto: `Reversión por anulación compra ${compra.codigo}: ${motivo}`,
          creadoPorId: usuarioId,
          prefijoNumero: 'REV',
          partidas: preview.impactoContable.partidasReversion.map((l) => ({
            cuentaCodigo: l.cuentaCodigo,
            cuentaNombre: l.cuentaNombre,
            debe: l.debe,
            haber: l.haber,
            conceptoLinea: l.concepto,
          })),
        });
        asientoNum = asiento?.numeroAsiento || null;
      }

      await tx.compraInsumo.update({
        where: { id: compra.id },
        data: { estado: EstadoCompraInsumo.ANULADA },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'COMPRA_INSUMO_ANULADA',
        entidadTipo: 'COMPRA_INSUMO',
        entidadId: compra.id,
        detalles: {
          codigo: compra.codigo,
          motivo,
          asientoReversion: asientoNum,
          insumosRevertidos: preview.impactoInventario.items.length,
        },
      });

      return asientoNum;
    });
  }

  private async executeVoidSubarriendo(
    empresaId: string,
    subarriendoId: string,
    motivo: string,
    usuarioId: string,
    preview: VoidingImpactPreview,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subarriendoProveedor.findFirst({
        where: { id: subarriendoId, empresaId },
      });
      if (!sub) throw new NotFoundException('Subarriendo no encontrado.');

      await tx.subarriendoProveedor.update({
        where: { id: sub.id },
        data: {
          estado: EstadoSubarriendoProveedor.CANCELADO,
          observaciones: `${sub.observaciones ? `${sub.observaciones} | ` : ''}ANULADO: ${motivo}`,
        },
      });

      const otrosActivos = await tx.subarriendoProveedor.count({
        where: {
          empresaId,
          equipoId: sub.equipoId,
          estado: EstadoSubarriendoProveedor.ACTIVO,
          id: { not: sub.id },
        },
      });
      if (otrosActivos === 0) {
        await tx.equipo.update({
          where: { id: sub.equipoId },
          data: { disponibleParaRenta: false },
        });
      }

      let asientoNum: string | null = null;
      if (preview.impactoContable.partidasReversion.length > 0) {
        const asiento = await registrarAsientoAutomaticoInTx(tx, {
          empresaId,
          sucursalId: sub.sucursalId || null,
          fecha: new Date(),
          tipoAsiento: 'DIARIO',
          origenModulo: 'OPERACIONES',
          documentoReferencia: `REV-${sub.codigo}`,
          concepto: `Reversión por anulación subarriendo ${sub.codigo}: ${motivo}`,
          creadoPorId: usuarioId,
          prefijoNumero: 'REV',
          partidas: preview.impactoContable.partidasReversion.map((l) => ({
            cuentaCodigo: l.cuentaCodigo,
            cuentaNombre: l.cuentaNombre,
            debe: l.debe,
            haber: l.haber,
            conceptoLinea: l.concepto,
          })),
        });
        asientoNum = asiento?.numeroAsiento || null;
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'SUBARRIENDO_ANULADO',
        entidadTipo: 'SUBARRIENDO_PROVEEDOR',
        entidadId: sub.id,
        detalles: { codigo: sub.codigo, motivo, asientoReversion: asientoNum },
      });

      return asientoNum;
    });
  }

  private async executeVoidNotaCxc(
    empresaId: string,
    notaId: string,
    motivo: string,
    usuarioId: string,
    preview: VoidingImpactPreview,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const nota = await tx.notaDebito.findFirst({
        where: { id: notaId, empresaId },
        include: { facturaReferencia: true },
      });
      if (!nota) throw new NotFoundException('Nota CxC no encontrada.');

      await tx.notaDebito.update({
        where: { id: nota.id },
        data: {
          estado: EstadoNotaCxc.ANULADA,
          saldoPendiente: 0,
        },
      });

      if (nota.tipoNota === TipoNotaCxc.CREDITO && nota.facturaReferenciaId && nota.facturaReferencia) {
        const nuevoSaldo = round2(
          Number(nota.facturaReferencia.saldoPendiente) + Number(nota.total),
        );
        await tx.factura.update({
          where: { id: nota.facturaReferenciaId },
          data: {
            saldoPendiente: nuevoSaldo,
            estado: EstadoFactura.PENDIENTE,
            estadoCxc:
              nuevoSaldo >= Number(nota.facturaReferencia.total)
                ? EstadoCxcFactura.PENDIENTE
                : EstadoCxcFactura.PARCIAL,
          },
        });
      }

      let asientoNum: string | null = null;
      if (preview.impactoContable.partidasReversion.length > 0) {
        const asiento = await registrarAsientoAutomaticoInTx(tx, {
          empresaId,
          sucursalId: nota.sucursalId || null,
          fecha: new Date(),
          tipoAsiento: TipoAsientoContable.DIARIO as any,
          origenModulo: 'CXC',
          documentoReferencia: `REV-${nota.numeroNota}`,
          concepto: `Reversión Nota ${nota.tipoNota} ${nota.numeroNota}: ${motivo}`,
          creadoPorId: usuarioId,
          prefijoNumero: 'REV',
          partidas: preview.impactoContable.partidasReversion.map((l) => ({
            cuentaCodigo: l.cuentaCodigo,
            cuentaNombre: l.cuentaNombre,
            debe: l.debe,
            haber: l.haber,
            clienteId: nota.clienteId,
            conceptoLinea: l.concepto,
          })),
        });
        asientoNum = asiento?.numeroAsiento || null;
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'NOTA_CXC_ANULADA',
        entidadTipo: 'NOTA_DEBITO',
        entidadId: nota.id,
        detalles: { numeroNota: nota.numeroNota, motivo, asientoReversion: asientoNum },
      });

      return asientoNum;
    });
  }

  async getHistorialAnulaciones(
    empresaId: string,
    query: VoidingListQueryDto = {},
  ) {
    this.requireEmpresa(empresaId);

    const [anuladosList, auditorias] = await Promise.all([
      this.listarDocumentosAnulables(empresaId, {
        ...query,
        estadoFiltro: 'ANULADOS',
      }),
      this.prisma.auditoria.findMany({
        where: {
          empresaId,
          OR: [
            { accion: { contains: 'ANULAD', mode: 'insensitive' } },
            { accion: { contains: 'CANCEL', mode: 'insensitive' } },
            { accion: { contains: 'REVERS', mode: 'insensitive' } },
          ],
        },
        include: {
          usuario: { select: { nombre: true, apellido: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      }),
    ]);

    return {
      totalDocumentosAnulados: anuladosList.total,
      documentosAnulados: anuladosList.documentos,
      bitacoraAnulaciones: auditorias.map((a) => ({
        id: a.id,
        fecha: a.createdAt.toISOString(),
        accion: a.accion,
        entidadTipo: a.entidadTipo,
        entidadId: a.entidadId,
        usuario: a.usuario
          ? `${a.usuario.nombre} ${a.usuario.apellido}`.trim()
          : 'Sistema',
        detalles: a.detalles,
      })),
    };
  }
}
