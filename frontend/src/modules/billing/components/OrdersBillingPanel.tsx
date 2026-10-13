import React, { useState, useMemo } from 'react';
import { 
  FolderClosed, ChevronDown, ChevronRight, Sparkles, TrendingUp, 
  CheckCheck, Receipt, Search, Filter, Printer, CreditCard, 
  CalendarDays, CheckCircle, Coins
} from 'lucide-react';
import type { Factura, FacturaPago, CorteFacturacionResumen, RetornoConDanos } from '../types/billing.types';
import { formatCurrency } from '../../../shared/utils/formatters';

export interface PedidoGrupo {
  id: string;
  tipo: 'CONTRATO' | 'COTIZACION' | 'ESTANDAR';
  codigo: string;
  cliente: { id?: string; nombre: string; rfc?: string | null };
  condicionPago: 'CONTADO' | 'CREDITO';
  plazoCreditoDias?: number;
  totalPedido: number;
  totalFacturado: number;
  totalPagado: number;
  saldoPendiente: number;
  estadoCobro: 'NUEVO_POR_COBRAR' | 'CREDITO_CORTE_PAGADO' | 'CREDITO_PENDIENTE' | 'LIQUIDADO';
  porcentajeCobrado: number;
  cortes: CorteFacturacionResumen[];
  facturas: Factura[];
  reparaciones: RetornoConDanos[];
  fechaReferencia: string;
}

interface OrdersBillingPanelProps {
  pedidos: PedidoGrupo[];
  onOpenInvoice: (inv: Factura) => void;
  onOpenReceipt: (data: { factura: Factura; pago: FacturaPago }) => void;
  onRegisterPayment: (inv: Factura) => void;
  onInvoiceCorte: (corteId: string) => void;
}

export const OrdersBillingPanel: React.FC<OrdersBillingPanelProps> = ({
  pedidos,
  onOpenInvoice,
  onOpenReceipt,
  onRegisterPayment,
  onInvoiceCorte,
}) => {
  const [filtroEstado, setFiltroEstado] = useState<'ALL' | 'NEW' | 'CREDIT_CORTES' | 'PAID'>('ALL');
  const [filtroCondicion, setFiltroCondicion] = useState<'ALL' | 'CONTADO' | 'CREDITO'>('ALL');
  const [busqueda, setBusqueda] = useState('');
  const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setPedidosExpandidos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    pedidos.forEach((p) => { all[p.id] = true; });
    setPedidosExpandidos(all);
  };

  const collapseAll = () => {
    const none: Record<string, boolean> = {};
    pedidos.forEach((p) => { none[p.id] = false; });
    setPedidosExpandidos(none);
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('es-NI', {
        timeZone: 'America/Managua',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  // KPIs
  const stats = useMemo(() => {
    let countNuevos = 0;
    let saldoNuevos = 0;
    let countCreditoCortes = 0;
    let saldoCreditoCortes = 0;
    let countLiquidados = 0;
    let totalCobrado = 0;
    let totalGlobal = 0;

    for (const p of pedidos) {
      totalGlobal += p.totalPedido;
      totalCobrado += p.totalPagado;
      if (p.estadoCobro === 'LIQUIDADO') {
        countLiquidados++;
      } else if (p.estadoCobro === 'CREDITO_CORTE_PAGADO') {
        countCreditoCortes++;
        saldoCreditoCortes += p.saldoPendiente;
      } else {
        countNuevos++;
        saldoNuevos += p.saldoPendiente;
      }
    }

    return {
      totalGlobal,
      totalCobrado,
      countTotal: pedidos.length,
      countNuevos,
      saldoNuevos,
      countCreditoCortes,
      saldoCreditoCortes,
      countLiquidados,
    };
  }, [pedidos]);

  // Filtrado
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      // Estado
      if (filtroEstado === 'NEW' && p.estadoCobro !== 'NUEVO_POR_COBRAR') return false;
      if (filtroEstado === 'CREDIT_CORTES' && p.estadoCobro !== 'CREDITO_CORTE_PAGADO') return false;
      if (filtroEstado === 'PAID' && p.estadoCobro !== 'LIQUIDADO') return false;

      // Condición
      if (filtroCondicion !== 'ALL' && p.condicionPago !== filtroCondicion) return false;

      // Búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const codigoMatch = p.codigo.toLowerCase().includes(q);
        const clienteMatch = p.cliente.nombre.toLowerCase().includes(q);
        const folioMatch = p.facturas.some((f) => f.folio.toLowerCase().includes(q));
        if (!codigoMatch && !clienteMatch && !folioMatch) return false;
      }

      return true;
    });
  }, [pedidos, filtroEstado, filtroCondicion, busqueda]);

  return (
    <div className="space-y-4">
      {/* 1. Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setFiltroEstado('NEW')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filtroEstado === 'NEW'
              ? 'bg-[#E8F0FE] border-[#1A73E8] shadow-xs ring-2 ring-[#1A73E8]/20'
              : 'bg-white border-[#E5E8EE] hover:border-[#1A73E8]/40 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A73E8] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Nuevos por Cobrar
            </span>
            <span className="text-xs font-black bg-[#1A73E8] text-white px-2 py-0.5 rounded-full">
              {stats.countNuevos}
            </span>
          </div>
          <div className="text-lg font-black text-[#1B1D22] font-mono">
            {formatCurrency(stats.saldoNuevos)}
          </div>
          <p className="text-[10px] text-[#747780] font-medium mt-1">
            Pedidos recién abiertos sin pagos
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEstado('CREDIT_CORTES')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filtroEstado === 'CREDIT_CORTES'
              ? 'bg-[#FEF3C7] border-amber-500 shadow-xs ring-2 ring-amber-500/20'
              : 'bg-white border-[#E5E8EE] hover:border-amber-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Crédito con Cortes Pagados
            </span>
            <span className="text-xs font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">
              {stats.countCreditoCortes}
            </span>
          </div>
          <div className="text-lg font-black text-[#1B1D22] font-mono">
            {formatCurrency(stats.saldoCreditoCortes)}
          </div>
          <p className="text-[10px] text-[#747780] font-medium mt-1">
            En amortización con avance de cobro
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEstado('PAID')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filtroEstado === 'PAID'
              ? 'bg-[#D1FAE5] border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
              : 'bg-white border-[#E5E8EE] hover:border-emerald-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" /> Pedidos Liquidados
            </span>
            <span className="text-xs font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              {stats.countLiquidados}
            </span>
          </div>
          <div className="text-lg font-black text-[#1B1D22] font-mono">
            {formatCurrency(stats.totalCobrado)}
          </div>
          <p className="text-[10px] text-[#747780] font-medium mt-1">
            Saldados al 100% en caja / banco
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEstado('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filtroEstado === 'ALL'
              ? 'bg-[#F4F6F9] border-[#37474F] shadow-xs ring-2 ring-[#37474F]/20'
              : 'bg-white border-[#E5E8EE] hover:border-gray-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#37474F] flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Total Cartera de Pedidos
            </span>
            <span className="text-xs font-black bg-[#37474F] text-white px-2 py-0.5 rounded-full">
              {stats.countTotal}
            </span>
          </div>
          <div className="text-lg font-black text-[#1B1D22] font-mono">
            {formatCurrency(stats.totalGlobal)}
          </div>
          <p className="text-[10px] text-[#747780] font-medium mt-1">
            Facturación global proyectada y emitida
          </p>
        </button>
      </div>

      {/* 2. Barra de Filtros, Sub-pestañas y Búsqueda */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Pestañas de estado */}
        <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFiltroEstado('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === 'ALL'
                ? 'bg-white text-[#1B1D22] shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Todos ({stats.countTotal})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('NEW')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filtroEstado === 'NEW'
                ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-[#1A73E8]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#1A73E8]" />
            Nuevos ({stats.countNuevos})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('CREDIT_CORTES')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filtroEstado === 'CREDIT_CORTES'
                ? 'bg-white text-amber-700 shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-amber-700'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-amber-600" />
            Crédito con Cortes ({stats.countCreditoCortes})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('PAID')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filtroEstado === 'PAID'
                ? 'bg-white text-emerald-700 shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-emerald-700'
            }`}
          >
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            Liquidados ({stats.countLiquidados})
          </button>
        </div>

        {/* Buscador, Filtro Condición y Expansión */}
        <div className="flex items-center gap-2.5 flex-1 max-w-lg ml-auto">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#747780]" />
            <input
              type="text"
              placeholder="Buscar por pedido, contrato, cliente o folio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E5E8EE] rounded-lg focus:ring-1 focus:ring-[#1A73E8] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F4F6F9] p-1 rounded-lg border border-[#E5E8EE] text-[11px] font-bold">
            <Filter className="w-3 h-3 text-[#747780] ml-1" />
            <select
              value={filtroCondicion}
              onChange={(e) => setFiltroCondicion(e.target.value as any)}
              className="bg-transparent border-0 py-0.5 px-1.5 text-xs font-bold text-[#1B1D22] focus:ring-0 cursor-pointer"
            >
              <option value="ALL">Todas las condiciones</option>
              <option value="CONTADO">Solo Contado</option>
              <option value="CREDITO">Solo Crédito</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="px-2 py-1 text-[11px] font-bold text-[#747780] hover:text-[#1B1D22] bg-[#F4F6F9] hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Expandir todos los pedidos"
            >
              Expandir
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2 py-1 text-[11px] font-bold text-[#747780] hover:text-[#1B1D22] bg-[#F4F6F9] hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Colapsar todos los pedidos"
            >
              Colapsar
            </button>
          </div>
        </div>
      </div>

      {/* 3. Listado de Pedidos y Contratos con sus Facturas y Cortes */}
      <div className="space-y-3.5">
        {pedidosFiltrados.map((pedido) => {
          const isExpanded = pedidosExpandidos[pedido.id] ?? false;
          const billedCortesCount = pedido.cortes.filter((c) => c.estado === 'FACTURADO').length;
          const totalCortesCount = pedido.cortes.length;

          return (
            <div
              key={pedido.id}
              className="bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden transition-all hover:border-[#1A73E8]/40"
            >
              {/* Cabecera del Pedido */}
              <div
                onClick={() => toggleExpand(pedido.id)}
                className="p-4 bg-white hover:bg-[#F8FAFC]/80 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E8EE]/70"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="p-2.5 rounded-xl bg-[#E8F0FE] text-[#1A73E8] shrink-0 mt-0.5">
                    <FolderClosed className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-[#1B1D22] text-sm">
                        {pedido.cliente.nombre}
                      </h3>

                      <span className="font-mono text-xs font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-md border border-[#1A73E8]/30">
                        {pedido.codigo}
                      </span>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                          pedido.condicionPago === 'CONTADO'
                            ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/20'
                            : 'bg-[#37474F]/10 text-[#37474F] border-[#37474F]/20'
                        }`}
                      >
                        {pedido.condicionPago} {pedido.plazoCreditoDias ? `(${pedido.plazoCreditoDias} días)` : ''}
                      </span>

                      {pedido.estadoCobro === 'LIQUIDADO' && (
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCheck className="w-3 h-3" /> Liquidado al 100%
                        </span>
                      )}
                      {pedido.estadoCobro === 'CREDITO_CORTE_PAGADO' && (
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 inline-flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Crédito · Cortes Pagados
                        </span>
                      )}
                      {pedido.estadoCobro === 'NUEVO_POR_COBRAR' && (
                        <span className="text-[10px] font-extrabold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-md border border-[#1A73E8]/30 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Nuevo · Por Cobrar
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#747780] font-medium mt-1.5 flex-wrap">
                      <span>Emisión: {formatDate(pedido.fechaReferencia)}</span>
                      <span>·</span>
                      <span>
                        {totalCortesCount > 0
                          ? `${billedCortesCount} de ${totalCortesCount} cortes facturados`
                          : `${pedido.facturas.length} factura(s) emitida(s)`}
                      </span>
                      <span>·</span>
                      <span className="text-emerald-700 font-bold">
                        {pedido.porcentajeCobrado}% pagado
                      </span>
                    </div>

                    {/* Barra de progreso de amortización */}
                    <div className="w-full max-w-md h-1.5 bg-[#E5E8EE] rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-[#1A73E8] to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${pedido.porcentajeCobrado}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Métricas financieras del pedido y botón expandir */}
                <div className="flex items-center gap-6 shrink-0 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-[10px] text-[#747780] uppercase font-bold">Total Pedido</div>
                    <div className="font-mono font-black text-[#1B1D22] text-sm">
                      {formatCurrency(pedido.totalPedido)}
                    </div>
                    {pedido.saldoPendiente > 0 ? (
                      <div className="text-[11px] font-bold text-[#C55500] font-mono mt-0.5">
                        Saldo: {formatCurrency(pedido.saldoPendiente)}
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-emerald-600 font-mono mt-0.5">
                        Saldado (C$ 0.00)
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* 4. Desglose Estructurado de Facturas y Cortes */}
              {isExpanded && (
                <div className="p-4 bg-[#F8FAFC]/50 space-y-3">
                  <div className="text-xs font-extrabold text-[#747780] uppercase tracking-wider flex items-center justify-between">
                    <span>Secuencia de Facturación y Cortes del Pedido:</span>
                    <span className="text-[11px] font-normal text-[#747780] lowercase">
                      {pedido.facturas.length} factura(s) · {pedido.cortes.length} corte(s)
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-[#E5E8EE] overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[10px] uppercase tracking-wider text-[#747780] font-extrabold">
                          <th className="py-2.5 px-3">Corte / Folio</th>
                          <th className="py-2.5 px-3">Período / Emisión</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                          <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                          <th className="py-2.5 px-3 text-center">Estado de Cobro</th>
                          <th className="py-2.5 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E8EE]">
                        {/* A. Si tiene cortes configurados, renderizar cada corte con su factura en orden */}
                        {pedido.cortes.length > 0 ? (
                          pedido.cortes.map((corte) => {
                            const factura = pedido.facturas.find(
                              (f) => f.corteId === corte.id || (f.corteNumero === corte.numeroCorte && f.corteNumero !== undefined)
                            );
                            const isPaid = factura && (factura.estado === 'PAGADA' || (factura.saldoPendiente !== undefined && factura.saldoPendiente <= 0));
                            const saldo = factura?.saldoPendiente !== undefined ? factura.saldoPendiente : corte.monto;

                            return (
                              <tr key={corte.id} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-2.5 px-3 font-black text-[#1B1D22]">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-[#37474F] bg-[#F4F6F9] px-2 py-0.5 rounded-md border border-[#E5E8EE] text-[10px]">
                                      Corte #{corte.numeroCorte}
                                    </span>
                                    {factura ? (
                                      <span className="font-mono text-xs text-[#1A73E8]">
                                        {factura.folio}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs italic">
                                        Sin facturar
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-[#747780] whitespace-nowrap text-[11px]">
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" />
                                    {formatDate(corte.fechaInicio)} — {formatDate(corte.fechaFin)}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1B1D22]">
                                  {formatCurrency(factura ? factura.total : corte.monto)}
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono">
                                  {factura ? (
                                    isPaid ? (
                                      <span className="text-emerald-700 font-bold">C$ 0.00</span>
                                    ) : (
                                      <span className="text-[#C55500] font-bold">
                                        {formatCurrency(saldo)}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-gray-400 font-normal">
                                      {formatCurrency(corte.monto)}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {factura ? (
                                    <span
                                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                        isPaid
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : factura.estado === 'PAGADA_PARCIAL'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-blue-50 text-[#1A73E8] border-blue-200'
                                      }`}
                                    >
                                      {isPaid ? (
                                        <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Coins className="w-2.5 h-2.5 text-amber-600" />
                                      )}
                                      {isPaid ? 'PAGADO' : factura.estado === 'PAGADA_PARCIAL' ? 'ABONO PARCIAL' : 'PENDIENTE'}
                                    </span>
                                  ) : corte.disponibleParaFacturar ? (
                                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                      Listo para facturar
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                      Próximo corte
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {factura ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => onOpenInvoice(factura)}
                                          className="btn-precision-outline text-xs py-1 px-2 cursor-pointer"
                                          title="Ver Factura PDF"
                                        >
                                          <Printer className="w-3 h-3 text-[#1A73E8]" /> Ver
                                        </button>

                                        {(factura.pagos || []).map((pago, index) => (
                                          <button
                                            key={pago.id}
                                            type="button"
                                            onClick={() => onOpenReceipt({ factura, pago })}
                                            className="btn-precision-outline text-xs py-1 px-2 cursor-pointer"
                                            title={`Ver recibo de pago ${index + 1}`}
                                          >
                                            <Printer className="w-3 h-3" /> R#{index + 1}
                                          </button>
                                        ))}

                                        {!isPaid && (
                                          <button
                                            type="button"
                                            onClick={() => onRegisterPayment(factura)}
                                            className="btn-precision-primary text-xs py-1 px-2.5 bg-amber-600 hover:bg-amber-700 border-amber-600 flex items-center gap-1 cursor-pointer"
                                            title="Registrar pago a esta factura"
                                          >
                                            <CreditCard className="w-3 h-3" /> Cobrar
                                          </button>
                                        )}
                                      </>
                                    ) : corte.disponibleParaFacturar ? (
                                      <button
                                        type="button"
                                        onClick={() => onInvoiceCorte(corte.id)}
                                        className="btn-precision-primary text-xs py-1 px-2.5 bg-[#1A73E8] hover:bg-[#1557B0] border-[#1A73E8] flex items-center gap-1 cursor-pointer"
                                        title="Emitir factura para este corte"
                                      >
                                        <Receipt className="w-3 h-3" /> Facturar corte #{corte.numeroCorte}
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-[#747780] italic">
                                        Disp. {formatDate(corte.fechaDisponible)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          /* B. Si no tiene cortes (ej: factura directa de contado o cotización) */
                          pedido.facturas.map((inv) => {
                            const isPaid = inv.estado === 'PAGADA' || (inv.saldoPendiente !== undefined && inv.saldoPendiente <= 0);
                            return (
                              <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-2.5 px-3 font-black text-[#1B1D22]">
                                  <span className="font-mono text-xs text-[#1A73E8]">
                                    {inv.folio}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-[#747780] text-[11px]">
                                  {formatDate(inv.fechaEmision)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1B1D22]">
                                  {formatCurrency(inv.total)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {isPaid ? (
                                    <span className="text-emerald-700 font-bold">C$ 0.00</span>
                                  ) : (
                                    <span className="text-[#C55500] font-bold">
                                      {formatCurrency(inv.saldoPendiente !== undefined ? inv.saldoPendiente : inv.total)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                      isPaid
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-blue-50 text-[#1A73E8] border-blue-200'
                                    }`}
                                  >
                                    {isPaid ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Coins className="w-2.5 h-2.5 text-amber-600" />}
                                    {isPaid ? 'PAGADO' : 'PENDIENTE'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onOpenInvoice(inv)}
                                      className="btn-precision-outline text-xs py-1 px-2 cursor-pointer"
                                    >
                                      <Printer className="w-3 h-3 text-[#1A73E8]" /> Ver
                                    </button>
                                    {!isPaid && (
                                      <button
                                        type="button"
                                        onClick={() => onRegisterPayment(inv)}
                                        className="btn-precision-primary text-xs py-1 px-2.5 bg-amber-600 hover:bg-amber-700 border-amber-600 flex items-center gap-1 cursor-pointer"
                                      >
                                        <CreditCard className="w-3 h-3" /> Cobrar
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {pedidosFiltrados.length === 0 && (
          <div className="text-center py-16 bg-white border border-[#E5E8EE] rounded-3xl shadow-xs">
            <Receipt className="w-12 h-12 text-[#747780] mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-[#1B1D22]">
              {pedidos.length === 0 ? 'No hay pedidos ni contratos registrados' : 'No se encontraron pedidos con los filtros seleccionados'}
            </h3>
            {pedidos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFiltroEstado('ALL');
                  setFiltroCondicion('ALL');
                  setBusqueda('');
                }}
                className="mt-3 text-xs font-bold text-[#1A73E8] hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
