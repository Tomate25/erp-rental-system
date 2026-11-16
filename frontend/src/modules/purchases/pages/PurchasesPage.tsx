import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Truck,
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  RotateCcw,
  Ban,
  Calendar,
  RefreshCw,
  Building2,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import {
  getResumenCompras,
  getComprasInsumos,
  getMaquinariaExterna,
  recibirCompraInsumo,
  anularCompraInsumo,
  registrarPagoCompraInsumo,
  devolverSubarriendo,
  registrarPagoSubarriendo,
} from '../services/purchases.api';
import { getProviders } from '../../providers/services/providers.api';
import { getInsumos } from '../../insumos/services/insumo.api';
import type { Provider } from '../../providers/types/provider.types';
import type { Insumo } from '../../insumos/types/insumo.types';
import type {
  CompraInsumo,
  EquipoExternoInventario,
  ResumenCompras,
  SubarriendoProveedor,
} from '../types/purchases.types';
import { CompraInsumoModal } from '../components/CompraInsumoModal';
import { SubarriendoModal } from '../components/SubarriendoModal';
import { PagoCompraModal } from '../components/PagoCompraModal';
import { formatCurrency } from '../../../shared/utils/formatters';
import { readTabFromUrl, syncTabToUrl } from '../../../shared/utils/module-navigation';

type PurchasesTab = 'maquinaria' | 'insumos';
const VALID_TABS: readonly PurchasesTab[] = ['maquinaria', 'insumos'];

const MODALIDAD_LABEL: Record<string, string> = {
  POR_DIA: 'Por Día',
  POR_HORA: 'Por Hora',
  POR_MES: 'Por Mes',
  MONTO_FIJO: 'Monto Fijo',
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('es-NI', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
};

const calcPeriodProgress = (startStr: string, endStr: string): number => {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 100;
  const pct = ((Date.now() - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

export const PurchasesPage: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<PurchasesTab>(() =>
    readTabFromUrl(VALID_TABS, 'maquinaria'),
  );
  const setActiveTab = (tab: PurchasesTab) => {
    setActiveTabState(tab);
    syncTabToUrl(tab);
  };

  const [resumen, setResumen] = useState<ResumenCompras | null>(null);
  const [compras, setCompras] = useState<CompraInsumo[]>([]);
  const [equiposExternos, setEquiposExternos] = useState<EquipoExternoInventario[]>([]);
  const [equiposInventario, setEquiposInventario] = useState<EquipoExternoInventario[]>([]);
  const [subarriendos, setSubarriendos] = useState<SubarriendoProveedor[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoCompraFilter, setEstadoCompraFilter] = useState('');
  const [estadoPagoFilter, setEstadoPagoFilter] = useState('');
  const [estadoSubFilter, setEstadoSubFilter] = useState('');

  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedEquipoForSub, setSelectedEquipoForSub] =
    useState<EquipoExternoInventario | null>(null);

  const [pagoTarget, setPagoTarget] = useState<{
    type: 'COMPRA' | 'SUBARRIENDO';
    id: string;
    title: string;
    subtitle: string;
    saldoPendiente: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resData, cmpData, maqData, provData, insData] = await Promise.all([
        getResumenCompras(),
        getComprasInsumos({
          estado: estadoCompraFilter || undefined,
          estadoPago: estadoPagoFilter || undefined,
          search: searchTerm.trim() || undefined,
        }),
        getMaquinariaExterna({
          estado: estadoSubFilter || undefined,
          search: searchTerm.trim() || undefined,
        }),
        getProviders({ activo: true }),
        getInsumos({ activo: true }),
      ]);
      setResumen(resData);
      setCompras(cmpData);
      setEquiposExternos(maqData.equiposExternos);
      setEquiposInventario(
        maqData.equiposInventario?.length ? maqData.equiposInventario : maqData.equiposExternos,
      );
      setSubarriendos(maqData.subarriendos);
      setProviders(provData);
      setInsumos(insData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el módulo de Compras.');
    } finally {
      setLoading(false);
    }
  }, [estadoCompraFilter, estadoPagoFilter, estadoSubFilter, searchTerm]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleRecibirCompra = async (compra: CompraInsumo) => {
    if (
      !window.confirm(
        `¿Confirmar recepción de la compra ${compra.codigo} en Bodega de Insumos? Sumará el stock y generará Kardex y Asiento Contable.`,
      )
    ) {
      return;
    }
    try {
      await recibirCompraInsumo(compra.id);
      showToast(`Compra ${compra.codigo} recibida en bodega con éxito.`);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo recibir la compra.');
    }
  };

  const handleAnularCompra = async (compra: CompraInsumo) => {
    if (
      !window.confirm(
        `¿Anular la compra ${compra.codigo}? Se revertirán las existencias ingresadas en Bodega de Insumos.`,
      )
    ) {
      return;
    }
    try {
      await anularCompraInsumo(compra.id);
      showToast(`Compra ${compra.codigo} anulada correctamente.`);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo anular la compra.');
    }
  };

  const handleDevolverSubarriendo = async (sub: SubarriendoProveedor) => {
    const montoStr = window.prompt(
      `Confirmar devolución de "${sub.equipo?.modelo || 'Maquinaria'}" (${sub.codigo}) a ${sub.proveedorNombre}.\n\nMonto final acordado con el proveedor (C$):`,
      String(Number(sub.montoEstimado || 0)),
    );
    if (montoStr === null) return;
    const montoFinal = Number(montoStr);
    if (Number.isNaN(montoFinal) || montoFinal < 0) {
      alert('Ingresa un monto final válido.');
      return;
    }
    try {
      await devolverSubarriendo(sub.id, {
        montoFinal,
        deshabilitarParaRenta: true,
      });
      showToast(`Maquinaria ${sub.codigo} devuelta al proveedor y deshabilitada para renta.`);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo registrar la devolución.');
    }
  };

  const totalEquiposSinPeriodo = useMemo(
    () => equiposExternos.filter((e) => !e.subarriendos || e.subarriendos.length === 0).length,
    [equiposExternos],
  );

  const totalEquiposConPeriodo = equiposExternos.length - totalEquiposSinPeriodo;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6 animate-fadeIn font-sans">
      {/* Header Principal */}
      <header className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-[#C55500] text-white shadow-md shadow-[#C55500]/20 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-[#1B1D22] tracking-tight">
                Compras y Subarriendo de Maquinaria
              </h1>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Proveedores · Flota Externa · Insumos
              </span>
            </div>
            <p className="text-xs text-[#747780] font-medium mt-0.5">
              Control visual de maquinaria prestada o subarrendada desde Inventario y órdenes de compra para Bodega de Insumos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="btn-precision-secondary text-xs px-3.5 py-2.5 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedEquipoForSub(null);
              setIsSubModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-[#C55500] hover:bg-[#A64700] rounded-xl shadow-md shadow-[#C55500]/20 transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>+ Período Maquinaria</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCompraModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-[#1B1D22] hover:bg-zinc-800 rounded-xl shadow-md shadow-zinc-900/15 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Compra de Insumos</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
              Maquinaria Externa (Inventario)
            </span>
            <p className="text-2xl font-black text-[#1B1D22] font-mono">
              {resumen?.equiposExternosInventario ?? equiposExternos.length}
            </p>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="text-emerald-700">{resumen?.subarriendosActivos ?? 0} activos</span>
              {(resumen?.subarriendosPorVencer ?? 0) > 0 && (
                <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                  {resumen?.subarriendosPorVencer} por vencer
                </span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-[#C55500] border border-amber-200">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
              Total Compras de Insumos
            </span>
            <p className="text-2xl font-black text-[#1B1D22] font-mono">
              {formatCurrency(resumen?.totalCompradoInsumos ?? 0)}
            </p>
            <span className="text-[11px] text-[#747780] font-medium block">
              {resumen?.totalComprasInsumos ?? 0} órdenes recibidas en bodega
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/20">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
              CxP Compras a Crédito
            </span>
            <p className="text-2xl font-black text-[#C55500] font-mono">
              {formatCurrency(resumen?.saldoPendienteCompras ?? 0)}
            </p>
            <span className="text-[11px] text-[#747780] font-medium block">
              Pendiente a proveedores de insumos
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-[#FDF2E9] text-[#C55500] border border-[#C55500]/20">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1B1D22] text-white rounded-3xl p-5 shadow-sm flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase block">
              CxP Total Proveedores Compras
            </span>
            <p className="text-2xl font-black text-amber-400 font-mono">
              {formatCurrency(resumen?.cxpTotalProveedoresCompras ?? 0)}
            </p>
            <span className="text-[11px] text-zinc-400 font-medium block">
              Incluye {formatCurrency(resumen?.saldoPendienteSubarriendos ?? 0)} de subarriendos
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-800 text-amber-400 border border-zinc-700">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadAll} className="underline font-bold cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* Barra de Navegación + Filtros */}
      <div className="bg-white border border-[#E5E8EE] rounded-2xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE]">
          <button
            type="button"
            onClick={() => setActiveTab('maquinaria')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'maquinaria'
                ? 'bg-white text-[#C55500] shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Maquinaria de Proveedores ({equiposExternos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('insumos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'insumos'
                ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Compras de Insumos ({compras.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar código, proveedor, factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-[#E5E8EE] rounded-xl bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30"
            />
          </div>

          {activeTab === 'maquinaria' ? (
            <select
              value={estadoSubFilter}
              onChange={(e) => setEstadoSubFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-[#E5E8EE] rounded-xl bg-[#F8FAFC]"
            >
              <option value="">Todos los períodos</option>
              <option value="ACTIVO">Solo Activos</option>
              <option value="DEVUELTO">Solo Devueltos</option>
            </select>
          ) : (
            <>
              <select
                value={estadoCompraFilter}
                onChange={(e) => setEstadoCompraFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-[#E5E8EE] rounded-xl bg-[#F8FAFC]"
              >
                <option value="">Todos los estados</option>
                <option value="RECIBIDA">Recibidas</option>
                <option value="BORRADOR">Borradores</option>
                <option value="ANULADA">Anuladas</option>
              </select>
              <select
                value={estadoPagoFilter}
                onChange={(e) => setEstadoPagoFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-[#E5E8EE] rounded-xl bg-[#F8FAFC]"
              >
                <option value="">Todo estado pago</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="PARCIAL">Parciales</option>
                <option value="PAGADO">Pagadas</option>
              </select>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-14 text-center">
          <div className="w-8 h-8 border-4 border-[#C55500] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#747780]">
            Cargando información de compras y maquinaria externa...
          </p>
        </div>
      ) : activeTab === 'maquinaria' ? (
        <div className="space-y-6">
          {/* SECCIÓN 1: TARJETAS VISUALES DE EQUIPOS DE PROVEEDORES EN INVENTARIO */}
          <section className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E8EE] pb-4">
              <div>
                <h2 className="text-sm font-black text-[#1B1D22] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C55500]" />
                  Equipos en Inventario Clasificados "De Proveedor"
                </h2>
                <p className="text-xs text-[#747780] mt-0.5">
                  {totalEquiposConPeriodo} con período activo · {totalEquiposSinPeriodo} pendientes de asignar período de préstamo/subarriendo.
                </p>
              </div>
            </div>

            {equiposExternos.length === 0 ? (
              <div className="p-10 text-center bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE] space-y-1.5">
                <Truck className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="text-xs font-bold text-[#1B1D22]">
                  No hay maquinaria clasificada "De proveedor" en Inventario
                </p>
                <p className="text-[11px] text-[#747780]">
                  Cuando registres o clasifiques un equipo como "Proveedor (préstamo / subalquiler)" en Inventario, aparecerá aquí automáticamente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equiposExternos.map((eq) => {
                  const periodoActivo = eq.subarriendos?.[0];
                  const contratoCliente = eq.detallesContrato?.[0]?.contrato;
                  const provNombre =
                    eq.proveedor?.nombre || eq.proveedorNombre || 'Proveedor externo';
                  const progreso = periodoActivo
                    ? calcPeriodProgress(
                        periodoActivo.fechaInicio,
                        periodoActivo.fechaFinEstimada,
                      )
                    : 0;

                  return (
                    <div
                      key={eq.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        periodoActivo
                          ? 'bg-white border-emerald-200 shadow-xs'
                          : 'bg-[#FAFBFD] border-amber-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {eq.codigo && (
                              <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-[#1B1D22] text-white">
                                {eq.codigo}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                eq.disponibleParaRenta
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}
                            >
                              {eq.disponibleParaRenta ? 'Disponible p/ Renta' : 'No Promovible'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {eq.estado}
                            </span>
                          </div>

                          <h3 className="text-sm font-black text-[#1B1D22]">{eq.modelo}</h3>
                          <p className="text-[11px] text-[#747780]">
                            {eq.categoria?.nombre || 'Equipo'} · {eq.marca?.nombre || 'S/M'}
                            {eq.numeroSerie ? ` · S/N: ${eq.numeroSerie}` : ''}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-[#747780] uppercase block">
                            Costo Proveedor
                          </span>
                          <span className="text-sm font-black font-mono text-[#C55500]">
                            {eq.precioProveedor != null
                              ? formatCurrency(Number(eq.precioProveedor))
                              : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-[#F4F6F9] px-3 py-2 rounded-xl border border-[#E5E8EE]">
                        <span className="font-bold text-[#1B1D22] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#C55500]" />
                          {provNombre}
                        </span>
                        {contratoCliente && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                            <ShieldCheck className="w-3 h-3" /> En contrato {contratoCliente.codigo}
                          </span>
                        )}
                      </div>

                      {periodoActivo ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-black text-emerald-800 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {periodoActivo.codigo}
                            </span>
                            <span className="text-[#747780]">
                              {formatDate(periodoActivo.fechaInicio)} →{' '}
                              <strong className="text-[#1B1D22]">
                                {formatDate(periodoActivo.fechaFinEstimada)}
                              </strong>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                progreso >= 90 ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 font-semibold">
                          Sin período de préstamo/renta asignado con el proveedor.
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEquipoForSub(eq);
                            setIsSubModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-[#C55500] hover:bg-[#A64700] text-white text-[11px] font-black rounded-xl transition-colors cursor-pointer"
                        >
                          {periodoActivo ? '+ Nuevo Período' : 'Asignar Período'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECCIÓN 2: PERÍODOS DE RENTA / PRÉSTAMO CON PROVEEDORES */}
          <section className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-[#E5E8EE] bg-[#FAFBFD] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-[#1B1D22]">
                  Control de Períodos con Proveedores ({subarriendos.length})
                </h2>
                <p className="text-[11px] text-[#747780]">
                  Seguimiento de vencimientos, devoluciones y liquidación de cuentas por pagar al proveedor.
                </p>
              </div>
            </div>

            {subarriendos.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#747780]">
                Aún no hay períodos registrados. Haz clic en <strong>Asignar Período</strong> sobre un equipo externo arriba.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[10px] font-black uppercase text-[#747780]">
                      <th className="p-4">Código / Ref</th>
                      <th className="p-4">Maquinaria & Tarifa</th>
                      <th className="p-4">Proveedor</th>
                      <th className="p-4">Período y Vigencia</th>
                      <th className="p-4 text-right">Liquidación</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8EE]">
                    {subarriendos.map((sub) => {
                      const base = Number(sub.montoFinal ?? sub.montoEstimado ?? 0);
                      const pagado = Number(sub.montoPagado || 0);
                      const saldo = Math.max(0, base - pagado);
                      const pctPago = base > 0 ? Math.min(100, Math.round((pagado / base) * 100)) : 100;
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50/70">
                          <td className="p-4 font-mono">
                            <div className="font-black text-[#1B1D22]">{sub.codigo}</div>
                            {sub.referenciaDocumento && (
                              <div className="text-[10px] text-[#747780]">
                                Doc: {sub.referenciaDocumento}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-black text-[#1B1D22]">
                              {sub.equipo?.codigo ? `[${sub.equipo.codigo}] ` : ''}
                              {sub.equipo?.modelo || 'Equipo'}
                            </div>
                            <div className="text-[11px] text-[#747780]">
                              {MODALIDAD_LABEL[sub.modalidad] || sub.modalidad} ·{' '}
                              <strong className="font-mono text-[#C55500]">
                                {formatCurrency(Number(sub.tarifaProveedor))}
                              </strong>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-[#1B1D22]">{sub.proveedorNombre}</td>
                          <td className="p-4 font-mono text-[11px] space-y-1">
                            <div>
                              {formatDate(sub.fechaInicio)} → {formatDate(sub.fechaFinEstimada)}
                            </div>
                            {sub.vencido && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                                <AlertTriangle className="w-3 h-3" /> Vencido ({Math.abs(sub.diasRestantes || 0)}d)
                              </span>
                            )}
                            {sub.porVencer && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" /> Vence en {sub.diasRestantes}d
                              </span>
                            )}
                            {sub.fechaDevolucionReal && (
                              <div className="text-[10px] text-emerald-700 font-bold">
                                Devuelto: {formatDate(sub.fechaDevolucionReal)}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono space-y-1">
                            <div className="font-black text-[#1B1D22]">{formatCurrency(base)}</div>
                            <div className="w-28 ml-auto h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{ width: `${pctPago}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-[#747780]">
                              Saldo:{' '}
                              <span className={saldo > 0 ? 'text-rose-700 font-black' : 'text-emerald-700 font-black'}>
                                {formatCurrency(saldo)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center space-y-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                sub.estado === 'ACTIVO'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {sub.estado}
                            </span>
                            <div className="text-[10px] font-bold text-[#747780]">
                              {sub.estadoPago}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {saldo > 0 && sub.estado !== 'CANCELADO' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPagoTarget({
                                      type: 'SUBARRIENDO',
                                      id: sub.id,
                                      title: `Pagar Subarriendo ${sub.codigo}`,
                                      subtitle: sub.proveedorNombre,
                                      saldoPendiente: saldo,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                                >
                                  <CreditCard className="w-3 h-3" /> Pagar
                                </button>
                              )}
                              {sub.estado === 'ACTIVO' && (
                                <button
                                  type="button"
                                  onClick={() => handleDevolverSubarriendo(sub)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-bold cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" /> Devolver
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
            )}
          </section>
        </div>
      ) : (
        /* TAB: COMPRAS DE INSUMOS */
        <section className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
          {compras.length === 0 ? (
            <div className="p-14 text-center text-xs text-[#747780] space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-zinc-400" />
              <p className="font-black text-sm text-[#1B1D22]">
                No hay compras de insumos registradas
              </p>
              <p>
                Registra tus compras multi-línea de repuestos y lubricantes aquí para alimentar el stock de Bodega, Kardex y Contabilidad automáticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[10px] font-black uppercase text-[#747780]">
                    <th className="p-4">Orden / Factura</th>
                    <th className="p-4">Proveedor y Fecha</th>
                    <th className="p-4">Detalle de Insumos</th>
                    <th className="p-4 text-right">Total y Pago</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE]">
                  {compras.map((cmp) => {
                    const total = Number(cmp.total || 0);
                    const pagado = Number(cmp.montoPagado || 0);
                    const saldo = Math.max(0, total - pagado);
                    const pct = total > 0 ? Math.min(100, Math.round((pagado / total) * 100)) : 100;
                    return (
                      <tr key={cmp.id} className="hover:bg-gray-50/70">
                        <td className="p-4 font-mono">
                          <div className="font-black text-[#1B1D22]">{cmp.codigo}</div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {cmp.condicionPago}
                            </span>
                            {cmp.numeroFactura && (
                              <span className="text-[10px] text-[#747780]">
                                Fac: {cmp.numeroFactura}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-black text-[#1B1D22]">{cmp.proveedorNombre}</div>
                          <div className="text-[11px] text-[#747780] font-mono">
                            {formatDate(cmp.fechaCompra)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {cmp.items?.map((it) => (
                              <span
                                key={it.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F8FAFC] border border-[#E5E8EE] text-[11px] text-[#1B1D22]"
                              >
                                <strong className="font-mono text-[#1A73E8]">
                                  {Number(it.cantidad)}×
                                </strong>
                                <span className="font-semibold">{it.insumo?.nombre || 'Insumo'}</span>
                                <span className="font-mono text-[#747780]">
                                  ({formatCurrency(Number(it.costoUnitario))})
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono space-y-1">
                          <div className="font-black text-[#1B1D22]">{formatCurrency(total)}</div>
                          <div className="w-28 ml-auto h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-[#747780]">
                            IVA: {formatCurrency(Number(cmp.ivaTotal))} · Saldo:{' '}
                            <span className={saldo > 0 ? 'text-rose-700 font-black' : 'text-emerald-700 font-black'}>
                              {formatCurrency(saldo)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              cmp.estado === 'RECIBIDA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cmp.estado === 'BORRADOR'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {cmp.estado}
                          </span>
                          <div className="text-[10px] font-bold text-[#747780]">
                            {cmp.estadoPago}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {cmp.estado === 'BORRADOR' && (
                              <button
                                type="button"
                                onClick={() => handleRecibirCompra(cmp)}
                                className="px-3 py-1.5 bg-[#1B1D22] hover:bg-zinc-800 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                              >
                                Recibir en Bodega
                              </button>
                            )}
                            {cmp.estado === 'RECIBIDA' && saldo > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPagoTarget({
                                    type: 'COMPRA',
                                    id: cmp.id,
                                    title: `Pagar Compra ${cmp.codigo}`,
                                    subtitle: cmp.proveedorNombre,
                                    saldoPendiente: saldo,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                              >
                                <CreditCard className="w-3 h-3" /> Pagar
                              </button>
                            )}
                            {cmp.estado === 'RECIBIDA' && pagado === 0 && (
                              <button
                                type="button"
                                onClick={() => handleAnularCompra(cmp)}
                                title="Anular compra y revertir stock"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
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
          )}
        </section>
      )}

      <CompraInsumoModal
        isOpen={isCompraModalOpen}
        onClose={() => setIsCompraModalOpen(false)}
        onSuccess={() => {
          showToast('Compra de insumos registrada e integrada con Bodega y Contabilidad.');
          void loadAll();
        }}
        providers={providers}
        insumos={insumos}
      />

      <SubarriendoModal
        isOpen={isSubModalOpen}
        onClose={() => {
          setIsSubModalOpen(false);
          setSelectedEquipoForSub(null);
        }}
        onSuccess={() => {
          showToast('Período de maquinaria externa registrado y sincronizado con Inventario.');
          void loadAll();
        }}
        equipos={equiposInventario}
        providers={providers}
        initialEquipo={selectedEquipoForSub}
      />

      {pagoTarget && (
        <PagoCompraModal
          isOpen={Boolean(pagoTarget)}
          onClose={() => setPagoTarget(null)}
          title={pagoTarget.title}
          subtitle={pagoTarget.subtitle}
          saldoPendiente={pagoTarget.saldoPendiente}
          onSubmitPago={async (payload) => {
            if (pagoTarget.type === 'COMPRA') {
              await registrarPagoCompraInsumo(pagoTarget.id, payload);
            } else {
              await registrarPagoSubarriendo(pagoTarget.id, payload);
            }
            showToast('Pago a proveedor registrado y contabilizado (210101).');
            await loadAll();
          }}
        />
      )}
    </div>
  );
};
