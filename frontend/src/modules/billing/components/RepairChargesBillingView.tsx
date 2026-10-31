import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  FileCheck, 
  AlertTriangle, 
  Coins, 
  Wrench, 
  Printer, 
  Search, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import type { Factura, RetornoConDanos } from '../types/billing.types';
import { invoiceDamageReturn } from '../services/billing.api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface Props {
  returns: RetornoConDanos[];
  onRefresh: () => Promise<void>;
  onOpenInvoice: (invoice: Factura) => void;
  canInvoice: boolean;
}

export const RepairChargesBillingView: React.FC<Props> = ({
  returns,
  onRefresh,
  onOpenInvoice,
  canInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<'ALL' | 'PENDING' | 'BILLED'>('ALL');

  // Cálculo de totales y costos por retorno
  const returnRows = useMemo(() => {
    return returns.map((r) => {
      // Calcular costo total de reparación sumando los gastos cargados o costos estimados
      const totalReparaciones = r.items.reduce((sum, item) => {
        const repairCost = (item.reparaciones || []).reduce((repSum, rep) => {
          const gastosSum = (rep.gastos || []).reduce((gSum, g) => gSum + Number(g.monto || 0), 0);
          return repSum + (gastosSum > 0 ? gastosSum : Number(rep.costo || 0));
        }, 0);
        return sum + repairCost;
      }, 0);

      const isBilled = Boolean(r.facturaCargo);
      const invoiceTotal = r.facturaCargo ? Number(r.facturaCargo.total || 0) : 0;
      const finalAmount = isBilled ? invoiceTotal : totalReparaciones;

      return {
        retorno: r,
        totalAmount: finalAmount,
        isBilled,
        hasRepairsReady: totalReparaciones > 0 || isBilled,
      };
    });
  }, [returns]);

  // KPIs
  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let billedCount = 0;
    let billedAmount = 0;

    for (const row of returnRows) {
      if (row.isBilled) {
        billedCount++;
        billedAmount += row.totalAmount;
      } else {
        pendingCount++;
        pendingAmount += row.totalAmount;
      }
    }

    return {
      pendingCount,
      pendingAmount,
      billedCount,
      billedAmount,
      totalCount: returnRows.length,
      totalAmount: pendingAmount + billedAmount,
    };
  }, [returnRows]);

  // Filtrado
  const filteredRows = useMemo(() => {
    return returnRows.filter((row) => {
      if (filterState === 'PENDING' && row.isBilled) return false;
      if (filterState === 'BILLED' && !row.isBilled) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const client = row.retorno.contrato?.cliente?.nombre?.toLowerCase() || '';
        const contract = row.retorno.contrato?.codigo?.toLowerCase() || '';
        const folio = row.retorno.facturaCargo?.folio?.toLowerCase() || '';
        const hasEq = row.retorno.items.some(
          (it) => it.equipo?.modelo?.toLowerCase().includes(q) || it.equipo?.codigo?.toLowerCase().includes(q)
        );
        return client.includes(q) || contract.includes(q) || folio.includes(q) || hasEq;
      }

      return true;
    });
  }, [returnRows, filterState, searchTerm]);

  const handleInvoice = async (returnId: string) => {
    if (!confirm('¿Desea emitir la factura oficial de cobro por los daños y gastos de reparación de este retorno?')) {
      return;
    }
    setIssuingId(returnId);
    setError(null);
    try {
      const invoice = await invoiceDamageReturn(returnId);
      await onRefresh();
      onOpenInvoice(invoice);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo generar la factura por daños.');
    } finally {
      setIssuingId(null);
    }
  };

  const formatDate = (val?: string) => {
    if (!val) return '—';
    try {
      return new Intl.DateTimeFormat('es-NI', {
        timeZone: 'America/Managua',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(val));
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPIs Financieros de Facturación de Reparaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Pendiente por Facturar */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <Coins className="w-6 h-6 text-[#C55500]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#747780] tracking-wider block">
              Por Facturar al Cliente
            </span>
            <span className="text-2xl font-black text-[#1B1D22] font-mono">
              {formatCurrency(stats.pendingAmount)}
            </span>
            <p className="text-[11px] text-[#747780] font-medium">
              {stats.pendingCount} retorno(s) pendiente(s) de cobro
            </p>
          </div>
        </div>

        {/* KPI 2: Facturado Concluido */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
            <FileCheck className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#747780] tracking-wider block">
              Cargos Facturados
            </span>
            <span className="text-2xl font-black text-[#1B1D22] font-mono">
              {formatCurrency(stats.billedAmount)}
            </span>
            <p className="text-[11px] text-[#747780] font-medium">
              {stats.billedCount} factura(s) por daños emitida(s)
            </p>
          </div>
        </div>

        {/* KPI 3: Total Cartera Daños */}
        <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
            <Receipt className="w-6 h-6 text-[#1A73E8]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#747780] tracking-wider block">
              Total Cargos Daños
            </span>
            <span className="text-2xl font-black font-mono text-[#1B1D22]">
              {formatCurrency(stats.totalAmount)}
            </span>
            <p className="text-[11px] text-[#747780] font-medium">
              {stats.totalCount} eventos de retorno con daños
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between text-red-800 text-xs font-bold">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE]">
          <button
            type="button"
            onClick={() => setFilterState('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'ALL'
                ? 'bg-white text-[#1B1D22] shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Todos ({stats.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('PENDING')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'PENDING'
                ? 'bg-white text-[#1B1D22] shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Pendientes de Facturar ({stats.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('BILLED')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'BILLED'
                ? 'bg-white text-[#1B1D22] shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Facturados ({stats.billedCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#747780]" />
          <input
            type="text"
            placeholder="Buscar por cliente, contrato, folio o equipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E5E8EE] rounded-lg focus:ring-1 focus:ring-[#1A73E8] focus:bg-white"
          />
        </div>
      </div>

      {/* 3. Listado de Cargos por Reparaciones */}
      {filteredRows.length === 0 ? (
        <div className="bg-white border border-[#E5E8EE] rounded-2xl p-12 text-center text-[#747780] space-y-2">
          <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-sm text-[#1B1D22]">No hay reparaciones por cobrar registradas</p>
          <p className="text-xs">Los retornos con equipos dañados y reparaciones evaluadas se listarán aquí para emitir factura.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRows.map(({ retorno, totalAmount, isBilled }) => {
            const clientName = retorno.contrato?.cliente?.nombre || 'Cliente General';
            const contractCode = retorno.contrato?.codigo || 'CONTRATO';
            const returnDate = formatDate(retorno.fechaDevolucion);

            return (
              <div
                key={retorno.id}
                className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs hover:border-[#1A73E8]/40 transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E8EE]/70 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-[#1B1D22] text-sm">{clientName}</h4>
                      <span className="font-mono text-xs font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-md border border-[#1A73E8]/30">
                        {contractCode}
                      </span>
                      {isBilled ? (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Facturado · {retorno.facturaCargo?.folio}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#C55500]" /> Cargo Pendiente de Facturar
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#747780] font-medium block mt-1">
                      Fecha Retorno: {returnDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-[#747780] uppercase font-bold">Monto por Daños</div>
                      <div className="font-mono font-black text-[#1B1D22] text-base">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>

                    {isBilled && retorno.facturaCargo ? (
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(retorno.facturaCargo as Factura)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-700" /> Ver Factura
                      </button>
                    ) : (
                      canInvoice && (
                        <button
                          type="button"
                          disabled={issuingId === retorno.id}
                          onClick={() => handleInvoice(retorno.id)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          {issuingId === retorno.id ? 'Facturando...' : 'Emitir Factura por Daños'}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Detalle de Equipos Afectados y Daños */}
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E5E8EE] space-y-2 text-xs">
                  <span className="text-[10px] font-black uppercase text-[#747780] tracking-wider block">
                    Equipos con Daños Reportados
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {retorno.items.map((it, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-[#E5E8EE] flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[#1B1D22] flex items-center justify-between">
                            <span className="truncate">{it.equipo?.modelo || it.equipo?.codigo || 'Equipo'}</span>
                            {it.equipo?.codigo && (
                              <span className="font-mono text-[10px] text-slate-500 shrink-0">[{it.equipo.codigo}]</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#747780] mt-0.5">
                            {it.descripcionDanios || it.inspeccionesDanio?.map((d) => `${d.componente}: ${d.tipoDano}`).join(', ') || 'Daños evaluados en inspección física'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
