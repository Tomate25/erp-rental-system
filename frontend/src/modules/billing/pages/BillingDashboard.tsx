import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, CheckCircle, CreditCard, Coins, X, Printer, 
  Search, Sparkles, 
  TrendingUp, CheckCheck, Filter, Layers, Wrench, Landmark 
} from 'lucide-react';
import { getContractCortes, getDamageReturns, invoiceCorte, getInvoices, registerInvoicePayment } from '../services/billing.api';
import { getCuentasBancarias, type CuentasBancariasRes } from '../../accounting/services/accounting.api';
import { BANCOS_BM_OPTIONS, resolveCuentaDestinoLabel } from '../../../shared/constants/bank-accounts';
import type { Factura, FacturaPago, CorteFacturacionResumen, RetornoConDanos } from '../types/billing.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { InvoicePrintView } from '../components/InvoicePrintView';
import { ReceiptPrintView } from '../components/ReceiptPrintView';
import { RepairChargesBillingView } from '../components/RepairChargesBillingView';
import { OrdersBillingPanel, type PedidoGrupo } from '../components/OrdersBillingPanel';
import { FACTURA_CORTE_CREDITO_30, FACTURA_CORTE_CONTADO } from '../constants/invoice-payload';
import {
  formatCondicionPagoLabel,
  resolveContratoCondicion,
  resolveInvoiceCondicion,
} from '../utils/billing-condition';
import { METODOS_CON_BANCO, montoComoTexto, montoInicialAbono, validatePayment } from '../validators/payment.validator';

import { serverErrorMessage } from '../../../shared/utils/errors';
import { LIMITS } from '../../../shared/validation/limits';
import { readTabFromUrl, syncTabToUrl } from '../../../shared/utils/module-navigation';

const BILLING_TABS = ['ORDERS', 'INVOICES', 'DAMAGES'] as const;
type BillingTab = (typeof BILLING_TABS)[number];

export const BillingDashboard: React.FC<{ canEditRepair?: boolean; canInvoiceDamage?: boolean }> = ({ canEditRepair: _canEditRepair = false, canInvoiceDamage = false }) => {
  const [activeTab, setActiveTabState] = useState<BillingTab>(() =>
    readTabFromUrl(BILLING_TABS, 'ORDERS'),
  );
  const setActiveTab = (tab: BillingTab) => {
    setActiveTabState(tab);
    syncTabToUrl(tab);
  };
  const [contractCortes, setContractCortes] = useState<CorteFacturacionResumen[]>([]);
  const [invoices, setInvoices] = useState<Factura[]>([]);
  const [damageReturns, setDamageReturns] = useState<RetornoConDanos[]>([]);
  const [bancosData, setBancosData] = useState<CuentasBancariasRes | null>(null);
  const [mostrarSaldosBancos, setMostrarSaldosBancos] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cortesError, setCortesError] = useState(false);
  const [invoicesError, setInvoicesError] = useState(false);
  const [damageError, setDamageError] = useState(false);

  // Filtros y sub-pestañas para Organización de Facturas
  const [invoiceSubTab, setInvoiceSubTab] = useState<'ALL' | 'NEW' | 'CREDIT_CORTES' | 'PAID'>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceCondFilter, setInvoiceCondFilter] = useState<'ALL' | 'CONTADO' | 'CREDITO'>('ALL');

  // Modal State para Registrar Abono / Pago Parcial
  const [abonoInvoice, setAbonoInvoice] = useState<Factura | null>(null);
  // El monto es texto para que un campo vacío no se convierta en 0 (ver `parseNumberOrNaN`).
  const [montoAbono, setMontoAbono] = useState<string>('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>('TRANSFERENCIA');
  const [referenciaAbono, setReferenciaAbono] = useState<string>('');
  const [bancoAbono, setBancoAbono] = useState<string>('');
  const [abonoError, setAbonoError] = useState<string | null>(null);
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);

  // Invoice Print / View State
  const [viewingInvoice, setViewingInvoice] = useState<Factura | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ factura: Factura; pago: FacturaPago } | null>(null);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [cortesResult, invoicesResult, damageResult, bancosResult] = await Promise.allSettled([
        getContractCortes(),
        getInvoices(),
        getDamageReturns(),
        getCuentasBancarias(),
      ]);
      setCortesError(cortesResult.status === 'rejected');
      setInvoicesError(invoicesResult.status === 'rejected');
      if (cortesResult.status === 'fulfilled') setContractCortes(cortesResult.value);
      else console.error('Error cargando cortes de contratos', cortesResult.reason);
      if (invoicesResult.status === 'fulfilled') setInvoices(invoicesResult.value);
      else console.error('Error cargando facturas', invoicesResult.reason);
      setDamageError(damageResult.status === 'rejected');
      if (damageResult.status === 'fulfilled') setDamageReturns(damageResult.value);
      else console.error('Error cargando retornos con daños', damageResult.reason);
      if (bancosResult.status === 'fulfilled' && bancosResult.value) setBancosData(bancosResult.value);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pedidos = useMemo<PedidoGrupo[]>(() => {
    const map = new Map<string, PedidoGrupo>();

    // 1. Agrupar cortes por contrato
    for (const corte of contractCortes) {
      const cid = corte.contratoId;
      if (!map.has(cid)) {
        const condResuelta = resolveContratoCondicion(corte.contrato);
        map.set(cid, {
          id: cid,
          tipo: 'CONTRATO',
          codigo: corte.contrato?.codigo || `CONTRATO-${cid.substring(0, 8)}`,
          cliente: corte.contrato?.cliente ? { id: corte.contrato.cliente.id, nombre: corte.contrato.cliente.nombre } : { nombre: 'Cliente General' },
          condicionPago: condResuelta.condicionPago,
          plazoCreditoDias: condResuelta.plazoCreditoDias,
          totalPedido: 0,
          totalFacturado: 0,
          totalPagado: 0,
          saldoPendiente: 0,
          estadoCobro: 'NUEVO_POR_COBRAR',
          porcentajeCobrado: 0,
          cortes: [],
          facturas: [],
          reparaciones: [],
          fechaReferencia: corte.fechaInicio || new Date().toISOString(),
        });
      }
      map.get(cid)!.cortes.push(corte);
    }

    // 2. Asociar facturas existentes a sus contratos o crear pedidos por cotización / factura directa
    for (const inv of invoices) {
      const clientData = inv.cliente ? { id: inv.cliente.id, nombre: inv.cliente.nombre, rfc: inv.cliente.rfc } : { nombre: 'Cliente General' };
      const invCond = resolveInvoiceCondicion(inv);
      if (inv.contratoId) {
        if (!map.has(inv.contratoId)) {
          const condResuelta = inv.contrato
            ? resolveContratoCondicion({
                condiciones: inv.contrato.condiciones,
                cotizacion: inv.contrato.cotizacion,
                cliente: inv.cliente,
              })
            : invCond;
          map.set(inv.contratoId, {
            id: inv.contratoId,
            tipo: 'CONTRATO',
            codigo: inv.contrato?.codigo || `CONTRATO-${inv.contratoId.substring(0, 8)}`,
            cliente: clientData,
            condicionPago: condResuelta.condicionPago,
            plazoCreditoDias: condResuelta.plazoCreditoDias,
            totalPedido: 0,
            totalFacturado: 0,
            totalPagado: 0,
            saldoPendiente: 0,
            estadoCobro: 'NUEVO_POR_COBRAR',
            porcentajeCobrado: 0,
            cortes: [],
            facturas: [],
            reparaciones: [],
            fechaReferencia: inv.fechaEmision || new Date().toISOString(),
          });
        }
        map.get(inv.contratoId)!.facturas.push(inv);
      } else if (inv.cotizacionId) {
        const cotKey = `COT-${inv.cotizacionId}`;
        if (!map.has(cotKey)) {
          map.set(cotKey, {
            id: cotKey,
            tipo: 'COTIZACION',
            codigo: inv.cotizacion?.numeroCotizacion || `COT-${inv.cotizacionId.substring(0, 8)}`,
            cliente: clientData,
            condicionPago: invCond.condicionPago,
            plazoCreditoDias: invCond.plazoCreditoDias,
            totalPedido: 0,
            totalFacturado: 0,
            totalPagado: 0,
            saldoPendiente: 0,
            estadoCobro: 'NUEVO_POR_COBRAR',
            porcentajeCobrado: 0,
            cortes: [],
            facturas: [],
            reparaciones: [],
            fechaReferencia: inv.fechaEmision || new Date().toISOString(),
          });
        }
        map.get(cotKey)!.facturas.push(inv);
      } else {
        const facKey = `FAC-${inv.id}`;
        map.set(facKey, {
          id: facKey,
          tipo: 'ESTANDAR',
          codigo: inv.folio || `FAC-${inv.id.substring(0, 8)}`,
          cliente: clientData,
          condicionPago: invCond.condicionPago,
          plazoCreditoDias: invCond.plazoCreditoDias,
          totalPedido: 0,
          totalFacturado: 0,
          totalPagado: 0,
          saldoPendiente: 0,
          estadoCobro: 'NUEVO_POR_COBRAR',
          porcentajeCobrado: 0,
          cortes: [],
          facturas: [inv],
          reparaciones: [],
          fechaReferencia: inv.fechaEmision || new Date().toISOString(),
        });
      }
    }

    // 3. Asociar reparaciones con daños a los contratos
    for (const ret of damageReturns) {
      const cid = ret.contrato?.id;
      if (cid && map.has(cid)) {
        map.get(cid)!.reparaciones.push(ret);
      }
    }

    // 4. Calcular métricas, ordenar sub-listas y determinar estado de cobro
    const list = Array.from(map.values());
    for (const pedido of list) {
      pedido.cortes.sort((a, b) => a.numeroCorte - b.numeroCorte);
      pedido.facturas.sort((a, b) => new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime());

      // Totales estrictamente numéricos para evitar coerción a strings
      const facturasActivas = pedido.facturas.filter(f => f.estado !== 'CANCELADA');
      const totalFacturado = facturasActivas.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
      const totalPagado = facturasActivas.reduce((acc, f) => acc + (Number(f.totalPagado) || 0), 0);
      const saldoFacturado = facturasActivas.reduce(
        (acc, f) => acc + (f.saldoPendiente !== undefined ? (Number(f.saldoPendiente) || 0) : Math.max(0, (Number(f.total) || 0) - (Number(f.totalPagado) || 0))),
        0,
      );

      // Cortes aún pendientes de facturar
      const montoCortesPendientes = pedido.cortes
        .filter(c => c.estado !== 'FACTURADO')
        .reduce((acc, c) => acc + (Number(c.monto) || 0), 0);

      // Total general del pedido
      pedido.totalFacturado = Math.round((totalFacturado + Number.EPSILON) * 100) / 100;
      pedido.totalPagado = Math.round((totalPagado + Number.EPSILON) * 100) / 100;
      pedido.totalPedido = Math.round((totalFacturado + montoCortesPendientes + Number.EPSILON) * 100) / 100;
      pedido.saldoPendiente = Math.round((saldoFacturado + montoCortesPendientes + Number.EPSILON) * 100) / 100;

      if (pedido.totalPedido > 0) {
        pedido.porcentajeCobrado = Math.min(100, Math.round((pedido.totalPagado / pedido.totalPedido) * 100));
      } else {
        pedido.porcentajeCobrado = pedido.totalPagado > 0 ? 100 : 0;
      }

      if (pedido.saldoPendiente <= 0 && (pedido.totalPagado > 0 || pedido.totalPedido === 0)) {
        pedido.estadoCobro = 'LIQUIDADO';
        pedido.porcentajeCobrado = 100;
      }

      // Estado de cobro
      const todasFacturasPagadas = facturasActivas.length > 0 && facturasActivas.every(f => f.estado === 'PAGADA' || (f.saldoPendiente !== undefined && f.saldoPendiente <= 0));
      const todosCortesFacturados = pedido.cortes.length === 0 || pedido.cortes.every(c => c.estado === 'FACTURADO');

      if (todasFacturasPagadas && todosCortesFacturados && pedido.saldoPendiente <= 0) {
        pedido.estadoCobro = 'LIQUIDADO';
      } else if (pedido.condicionPago === 'CREDITO') {
        const tienePagos = totalPagado > 0 || facturasActivas.some(f => f.estado === 'PAGADA' || (f.totalPagado || 0) > 0);
        pedido.estadoCobro = tienePagos ? 'CREDITO_CORTE_PAGADO' : 'CREDITO_PENDIENTE';
      } else {
        pedido.estadoCobro = 'NUEVO_POR_COBRAR';
      }
    }

    // Ordenar pedidos por fecha más reciente
    return list.sort((a, b) => new Date(b.fechaReferencia).getTime() - new Date(a.fechaReferencia).getTime());
  }, [contractCortes, invoices, damageReturns]);

  const invoiceStats = useMemo(() => {
    let countNuevas = 0;
    let countCreditoCortes = 0;
    let countPagadas = 0;

    for (const inv of invoices) {
      const total = Number(inv.total) || 0;
      const totalPagado = Number(inv.totalPagado) || 0;
      const saldoPendiente = inv.saldoPendiente !== undefined ? (Number(inv.saldoPendiente) || 0) : Math.max(0, total - totalPagado);
      const isPaid = inv.estado === 'PAGADA' || saldoPendiente <= 0;
      const isCreditCortes = !isPaid && inv.condicionPago === 'CREDITO' && (totalPagado > 0 || inv.estado === 'PAGADA_PARCIAL');
      const isNew = !isPaid && inv.estado !== 'CANCELADA' && !isCreditCortes && totalPagado === 0;

      if (isPaid) {
        countPagadas++;
      } else if (isCreditCortes) {
        countCreditoCortes++;
      } else if (isNew) {
        countNuevas++;
      }
    }

    return {
      countTotal: invoices.length,
      countNuevas,
      countCreditoCortes,
      countPagadas,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isPaid = inv.estado === 'PAGADA' || (inv.saldoPendiente !== undefined && inv.saldoPendiente <= 0);
      const isCreditCortes = !isPaid && inv.condicionPago === 'CREDITO' && ((inv.totalPagado || 0) > 0 || inv.estado === 'PAGADA_PARCIAL');
      const isNew = !isPaid && inv.estado !== 'CANCELADA' && !isCreditCortes && (inv.totalPagado || 0) === 0;

      // Sub-tab filter
      if (invoiceSubTab === 'NEW' && !isNew) return false;
      if (invoiceSubTab === 'CREDIT_CORTES' && !isCreditCortes) return false;
      if (invoiceSubTab === 'PAID' && !isPaid) return false;

      // Condición filter
      if (invoiceCondFilter !== 'ALL' && inv.condicionPago !== invoiceCondFilter) return false;

      // Buscador en tiempo real
      if (invoiceSearch.trim()) {
        const query = invoiceSearch.toLowerCase().trim();
        const folioMatch = inv.folio?.toLowerCase().includes(query);
        const clienteMatch = inv.cliente?.nombre?.toLowerCase().includes(query);
        const cotizacionMatch = inv.cotizacion?.numeroCotizacion?.toLowerCase().includes(query);
        const contratoMatch = inv.contrato?.codigo?.toLowerCase().includes(query);
        if (!folioMatch && !clienteMatch && !cotizacionMatch && !contratoMatch) return false;
      }

      return true;
    });
  }, [invoices, invoiceSubTab, invoiceCondFilter, invoiceSearch]);

  const handleInvoiceCorteDirect = async (corteId: string) => {
    const targetCorte = contractCortes.find((c) => c.id === corteId);
    const condResuelta = resolveContratoCondicion(targetCorte?.contrato);
    const isContado = condResuelta.condicionPago === 'CONTADO';
    const diasCredito = condResuelta.plazoCreditoDias || 30;
    const msg = isContado
      ? '¿Deseas emitir la factura de CONTADO para este corte de contrato?'
      : `¿Deseas emitir la factura a crédito (${diasCredito} Días) para este corte de contrato?`;
    if (!confirm(msg)) return;
    try {
      const payload = isContado
        ? { ...FACTURA_CORTE_CONTADO }
        : { ...FACTURA_CORTE_CREDITO_30, plazoCreditoDias: diasCredito };
      const createdInvoice = await invoiceCorte(corteId, payload);
      setActiveTab('INVOICES');
      const refreshed = await getInvoices();
      setInvoices(refreshed);
      setViewingInvoice(refreshed.find((inv) => inv.id === createdInvoice.id) || createdInvoice);
      fetchData();
      if (isContado) {
        handleOpenAbonoModal(createdInvoice);
      }
    } catch (error: any) {
      alert(serverErrorMessage(error, 'Error al facturar corte de contrato'));
    }
  };


  const handleOpenAbonoModal = (inv: Factura) => {
    setAbonoInvoice(inv);
    // Sin ruido de coma flotante: 100.10000000000001 daría 400 en el backend (máximo 2 decimales).
    setMontoAbono(montoComoTexto(montoInicialAbono(inv)));
    setMetodoPagoAbono('TRANSFERENCIA');
    setReferenciaAbono('');
    setBancoAbono('110201 - LA FISE 750-100-489');
    setAbonoError(null);
  };

  const handleConfirmAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonoInvoice) return;
    setAbonoError(null);
    // Mismos límites y textos que RegisterPaymentDto del backend; el cuerpo no lleva campos fuera del DTO.
    const validacion = validatePayment({
      monto: montoAbono,
      metodo: metodoPagoAbono,
      referencia: referenciaAbono,
      banco: bancoAbono,
    });
    if (!validacion.ok) {
      setAbonoError(validacion.error);
      return;
    }
    setIsSubmittingAbono(true);
    try {
      const result = await registerInvoicePayment(abonoInvoice.id, validacion.payload);
      setAbonoInvoice(null);
      setViewingReceipt({ factura: result.factura, pago: result.pago });
      fetchData();
    } catch (err: unknown) {
      setAbonoError(serverErrorMessage(err, 'Error al registrar el abono'));
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  if (viewingReceipt) {
    return <ReceiptPrintView factura={viewingReceipt.factura} pago={viewingReceipt.pago} onBack={() => setViewingReceipt(null)} />;
  }

  if (viewingInvoice) {
    return (
      <InvoicePrintView 
        factura={viewingInvoice} 
        onBack={() => setViewingInvoice(null)} 
      />
    );
  }

  return (
    <div className="animate-fadeIn h-full flex flex-col font-sans max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#C55500] text-white shadow-md shadow-[#C55500]/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1B1D22] tracking-tight">Facturación y pago</h1>
            <p className="text-xs text-[#747780] font-medium">Facturas de renta y de fallas enviadas desde mantenimiento, y registro del pago.</p>
          </div>
        </div>

        <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] shrink-0 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ORDERS' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Pedidos y Contratos ({pedidos.length})
          </button>

          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'INVOICES' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Facturas Emitidas ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab('DAMAGES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'DAMAGES' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Fallas por facturar ({damageReturns.filter(retorno => !retorno.facturaCargo).length})
          </button>
        </div>
      </div>

      {(cortesError || invoicesError || damageError) && !isLoading && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center justify-between gap-4">
          <span>No se pudieron cargar los datos de facturación. Comprueba la conexión con el servidor.</span>
          <button type="button" onClick={() => fetchData()} className="underline whitespace-nowrap">Reintentar</button>
        </div>
      )}

      {/* Franja de Disponibilidad en Bancos y Caja */}
      {bancosData?.resumen && (
        <div className="mb-5 bg-white border border-[#E5E8EE] rounded-2xl p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-black text-[#1B1D22]">
                <Landmark className="w-4 h-4 text-[#1A73E8]" />
                Tesorería (Bancos y Caja):
              </span>
              <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Disponible: {formatCurrency(bancosData.resumen.saldoTotalDisponible)}
              </span>
              <span className="text-[#747780] font-mono text-[11px]">
                Bancos: <strong className="text-[#1B1D22]">{formatCurrency(bancosData.resumen.totalBancos)}</strong> · Caja: <strong className="text-[#1B1D22]">{formatCurrency(bancosData.resumen.totalCaja)}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMostrarSaldosBancos((prev) => !prev)}
              className="text-[11px] font-bold text-[#1A73E8] hover:underline cursor-pointer"
            >
              {mostrarSaldosBancos ? 'Ocultar detalle por banco' : 'Ver saldo por cuenta bancaria'}
            </button>
          </div>
          {mostrarSaldosBancos && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3 pt-3 border-t border-[#E5E8EE]">
              {bancosData.cuentas
                .filter((c) => c.saldoActual !== 0 || c.movimientosCount > 0 || ['110101', '110201', '110203'].includes(c.codigo))
                .map((c) => (
                  <div key={c.codigo} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E8EE] text-[11px]">
                    <div className="font-mono font-black text-[#1A73E8] text-[10px]">{c.codigo}</div>
                    <div className="font-bold text-[#1B1D22] truncate" title={c.nombre}>{c.nombre}</div>
                    <div className={`font-mono font-black mt-0.5 ${c.saldoActual < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatCurrency(c.saldoActual)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-[#E5E8EE]">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#1A73E8] border-t-transparent"></div>
          </div>
        ) : activeTab === 'ORDERS' ? (
          <OrdersBillingPanel
            pedidos={pedidos}
            onOpenInvoice={(inv) => setViewingInvoice(inv)}
            onOpenReceipt={(data) => setViewingReceipt(data)}
            onRegisterPayment={(inv) => handleOpenAbonoModal(inv)}
            onInvoiceCorte={(corteId) => handleInvoiceCorteDirect(corteId)}
          />
        ) : activeTab === 'DAMAGES' ? (
          <RepairChargesBillingView returns={damageReturns} onRefresh={() => fetchData(false)} onOpenInvoice={setViewingInvoice} canInvoice={canInvoiceDamage} />
        ) : (
          <div className="space-y-4">
            {/* Barra de Filtros, Sub-pestañas y Buscador */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-wrap items-center justify-between gap-3">
              {/* Sub-pestañas */}
              <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setInvoiceSubTab('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    invoiceSubTab === 'ALL'
                      ? 'bg-white text-[#1B1D22] shadow-xs border border-[#E5E8EE]'
                      : 'text-[#747780] hover:text-[#1B1D22]'
                  }`}
                >
                  Todas ({invoiceStats.countTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceSubTab('NEW')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    invoiceSubTab === 'NEW'
                      ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                      : 'text-[#747780] hover:text-[#1A73E8]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-[#1A73E8]" />
                  Nuevas ({invoiceStats.countNuevas})
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceSubTab('CREDIT_CORTES')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    invoiceSubTab === 'CREDIT_CORTES'
                      ? 'bg-white text-amber-700 shadow-xs border border-[#E5E8EE]'
                      : 'text-[#747780] hover:text-amber-700'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 text-amber-600" />
                  Crédito con Cortes ({invoiceStats.countCreditoCortes})
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceSubTab('PAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    invoiceSubTab === 'PAID'
                      ? 'bg-white text-emerald-700 shadow-xs border border-[#E5E8EE]'
                      : 'text-[#747780] hover:text-emerald-700'
                  }`}
                >
                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                  Pagadas ({invoiceStats.countPagadas})
                </button>
              </div>

              {/* Buscador y Filtro Condición */}
              <div className="flex items-center gap-2.5 flex-1 max-w-md ml-auto">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#747780]" />
                  <input
                    type="text"
                    placeholder="Buscar folio, cliente, cotización..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E5E8EE] rounded-lg focus:ring-1 focus:ring-[#1A73E8] focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#F4F6F9] p-1 rounded-lg border border-[#E5E8EE] text-[11px] font-bold">
                  <Filter className="w-3 h-3 text-[#747780] ml-1" />
                  <select
                    value={invoiceCondFilter}
                    onChange={(e) => setInvoiceCondFilter(e.target.value as any)}
                    className="bg-transparent border-0 py-0.5 px-1.5 text-xs font-bold text-[#1B1D22] focus:ring-0 cursor-pointer"
                  >
                    <option value="ALL">Todas</option>
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Tabla de Facturas */}
            <div className="bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[10px] uppercase tracking-wider text-[#747780] font-extrabold">
                      <th className="p-4">Folio / Clasificación</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Condición</th>
                      <th className="p-4 text-right">Total / Saldo</th>
                      <th className="p-4 text-center">Estado de Cobro</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8EE] text-xs font-medium">
                    {filteredInvoices.map((inv) => {
                      const isPaid = inv.estado === 'PAGADA' || (inv.saldoPendiente !== undefined && inv.saldoPendiente <= 0);
                      const isCreditCortes = !isPaid && inv.condicionPago === 'CREDITO' && ((inv.totalPagado || 0) > 0 || inv.estado === 'PAGADA_PARCIAL');
                      const isNew = !isPaid && inv.estado !== 'CANCELADA' && !isCreditCortes && (inv.totalPagado || 0) === 0;
                      const pctPagado = inv.total > 0 ? Math.round(((inv.totalPagado || 0) / inv.total) * 100) : 0;

                      return (
                        <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="p-4 font-black text-[#1B1D22]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{inv.folio}</span>
                              {isNew && (
                                <span className="text-[9px] font-black text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-md border border-[#1A73E8]/30 inline-flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" /> Nueva
                                </span>
                              )}
                              {isCreditCortes && (
                                <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 inline-flex items-center gap-1">
                                  <TrendingUp className="w-2.5 h-2.5" /> Abono/Corte ({pctPagado}%)
                                </span>
                              )}
                              {isPaid && (
                                <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 inline-flex items-center gap-1">
                                  <CheckCheck className="w-2.5 h-2.5" /> Liquidada
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {inv.tipoFactura === 'CARGO_DANOS' || Boolean((inv as any).devolucionId) ? (
                                <span className="text-[9px] font-extrabold text-[#C55500] bg-[#FFF3E0] px-2 py-0.5 rounded-md border border-[#C55500]/30 inline-flex items-center gap-1">
                                  <Wrench className="w-2.5 h-2.5" /> Mantenimiento (Taller)
                                </span>
                              ) : inv.corteNumero || (inv as any).corteId ? (
                                <span className="text-[9px] font-extrabold text-[#37474F] bg-[#F4F6F9] px-2 py-0.5 rounded-md border border-[#E5E8EE]">
                                  Corte #{inv.corteNumero || 1} (Contrato)
                                </span>
                              ) : inv.cotizacion ? (
                                <span className="text-[9px] font-bold text-[#747780] bg-[#F4F6F9] px-2 py-0.5 rounded-md border border-[#E5E8EE]">
                                  Cotización {inv.cotizacion.numeroCotizacion}
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-[#747780] bg-[#F4F6F9] px-2 py-0.5 rounded-md border border-[#E5E8EE]">
                                  Estándar
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-extrabold text-[#1B1D22]">
                            <div>{inv.cliente?.nombre}</div>
                            {inv.contrato?.codigo && (
                              <div className="text-[10px] text-[#747780] font-normal">
                                Contrato: {inv.contrato.codigo}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                                inv.condicionPago === 'CONTADO'
                                  ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/20'
                                  : 'bg-[#37474F]/10 text-[#37474F] border-[#37474F]/20'
                              }`}
                            >
                              {formatCondicionPagoLabel(inv.condicionPago, inv.plazoCreditoDias)}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono">
                            <div className="font-black text-[#1B1D22] text-xs">
                              {formatCurrency(inv.total)}
                            </div>
                            {!isPaid && (
                              <div className="text-[10px] text-[#C55500] font-bold mt-0.5">
                                Saldo: {formatCurrency(inv.saldoPendiente !== undefined ? inv.saldoPendiente : inv.total)}
                              </div>
                            )}
                            {inv.totalPagado && inv.totalPagado > 0 ? (
                              <div className="text-[9px] text-emerald-600 font-medium">
                                Abonado: {formatCurrency(inv.totalPagado)}
                              </div>
                            ) : null}
                            {inv.pagos && inv.pagos.length > 0 && (
                              <div className="mt-1 flex flex-wrap justify-end gap-1">
                                {Array.from(
                                  new Set(
                                    inv.pagos.map((p) => {
                                      const cta = resolveCuentaDestinoLabel(p.banco, p.metodo);
                                      return `${cta.codigo} · ${cta.nombre}`;
                                    }),
                                  ),
                                ).map((label) => (
                                  <span
                                    key={label}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold"
                                  >
                                    <Landmark className="w-2.5 h-2.5" /> {label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : inv.estado === 'PAGADA_PARCIAL' || isCreditCortes
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : inv.estado === 'VENCIDA'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-blue-50 text-[#1A73E8] border-blue-200'
                              }`}
                            >
                              {isPaid ? (
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Coins className="w-3 h-3 text-amber-600" />
                              )}
                              {isPaid ? 'PAGADA' : inv.estado === 'PAGADA_PARCIAL' ? 'PAGADA PARCIAL' : inv.estado}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingInvoice(inv)}
                                className="btn-precision-outline text-xs py-1.5 px-2.5"
                                title="Ver / Imprimir Factura PDF"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#1A73E8]" /> Ver Factura
                              </button>

                              {(inv.pagos || []).map((pago, index) => (
                                <button
                                  key={pago.id}
                                  onClick={() => setViewingReceipt({ factura: inv, pago })}
                                  className="btn-precision-outline text-xs py-1.5 px-2.5"
                                  title={`Ver / imprimir recibo del pago ${index + 1}`}
                                >
                                  <Printer className="w-3.5 h-3.5" /> Recibo {index + 1}
                                </button>
                              ))}

                              {!isPaid && (
                                <button
                                  onClick={() => handleOpenAbonoModal(inv)}
                                  className="btn-precision-primary text-xs py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 border-amber-600 flex items-center gap-1"
                                  title="Registrar un pago a esta factura"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Registrar pago
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredInvoices.length === 0 && (
                <div className="text-center py-16">
                  <Receipt className="w-12 h-12 text-[#747780] mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-[#1B1D22]">
                    {invoices.length === 0
                      ? 'No hay facturas emitidas'
                      : 'No se encontraron facturas con los filtros seleccionados'}
                  </h3>
                  {invoices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceSubTab('ALL');
                        setInvoiceSearch('');
                        setInvoiceCondFilter('ALL');
                      }}
                      className="mt-3 text-xs font-bold text-[#1A73E8] hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para Registrar Abono a Factura */}
      {abonoInvoice && (
        <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-[#E5E8EE] flex justify-between items-center bg-[#F4F6F9]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#1B1D22] text-base">
                    Registrar Pago
                  </h3>
                  <p className="text-[11px] text-[#747780]">
                    Factura: {abonoInvoice.folio} · {abonoInvoice.cliente?.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAbonoInvoice(null)}
                className="p-1 text-[#747780] hover:text-[#1B1D22] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAbono} className="p-6 space-y-4">
              {/* Resumen del Saldo */}
              <div className="bg-[#F4F6F9] p-3.5 rounded-2xl border border-[#E5E8EE] space-y-2 text-xs">
                <div className="flex justify-between text-[#747780]">
                  <span>Total Factura:</span>
                  <span className="font-bold text-[#1B1D22] font-mono">{formatCurrency(abonoInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-[#747780]">
                  <span>Monto Pagado Previo:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {formatCurrency(abonoInvoice.totalPagado || 0)}
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 border-t border-[#E5E8EE]">
                  <span className="text-[#C55500]">Saldo Pendiente:</span>
                  <span className="text-[#C55500] font-mono">
                    {formatCurrency(abonoInvoice.saldoPendiente !== undefined ? abonoInvoice.saldoPendiente : abonoInvoice.total)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Monto a Pagar (C$) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={abonoInvoice.saldoPendiente !== undefined ? abonoInvoice.saldoPendiente : abonoInvoice.total}
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="precision-input text-xs font-mono font-black pl-9"
                    required
                  />
                  <span className="text-xs font-black text-emerald-700 absolute left-2.5 top-2.5 select-none">
                    C$
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={metodoPagoAbono}
                    onChange={(e) => setMetodoPagoAbono(e.target.value)}
                    className="precision-input text-xs font-bold"
                  >
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="EFECTIVO">Efectivo / Caja</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="TARJETA">Tarjeta Débito/Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                    N° Comprobante / Ref.
                  </label>
                  <input
                    type="text"
                    value={referenciaAbono}
                    onChange={(e) => setReferenciaAbono(e.target.value)}
                    maxLength={LIMITS.pago.referencia}
                    placeholder="Ej. TR-982341"
                    className="precision-input text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {METODOS_CON_BANCO.includes(metodoPagoAbono) ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-[#747780] uppercase block">
                    Cuenta Bancaria Destino (Contabilidad) *
                  </label>
                  <select
                    value={
                      BANCOS_BM_OPTIONS.some((b) => b.value === bancoAbono)
                        ? bancoAbono
                        : '__CUSTOM__'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setBancoAbono(val === '__CUSTOM__' ? '' : val);
                    }}
                    className="precision-input text-xs font-bold"
                  >
                    {BANCOS_BM_OPTIONS.map((b) => {
                      const live = bancosData?.cuentas.find((c) => c.codigo === b.codigo);
                      return (
                        <option key={b.codigo} value={b.value}>
                          {b.codigo} - {b.nombre}
                          {live ? ` (Saldo: ${formatCurrency(live.saldoActual)})` : ''}
                        </option>
                      );
                    })}
                    <option value="__CUSTOM__">Otro banco / escribir manual...</option>
                  </select>
                  {!BANCOS_BM_OPTIONS.some((b) => b.value === bancoAbono) && (
                    <input
                      type="text"
                      value={bancoAbono}
                      onChange={(e) => setBancoAbono(e.target.value)}
                      maxLength={LIMITS.pago.banco}
                      className="precision-input text-xs font-medium"
                      placeholder="Nombre del banco o cuenta"
                    />
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>
                    Este cobro ingresará automáticamente a:{' '}
                    <strong>
                      {metodoPagoAbono === 'EFECTIVO'
                        ? '110101 - CAJA GENERAL'
                        : '110201 - LA FISE 750-100-489'}
                    </strong>
                  </span>
                </div>
              )}

              {abonoError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  {abonoError}
                </div>
              )}

              <div className="pt-4 border-t border-[#E5E8EE] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAbonoInvoice(null)}
                  className="btn-precision-outline text-xs py-2 px-4 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbono}
                  className="btn-precision-primary text-xs py-2 px-5 bg-amber-600 hover:bg-amber-700 border-amber-600 cursor-pointer"
                >
                  {isSubmittingAbono ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
