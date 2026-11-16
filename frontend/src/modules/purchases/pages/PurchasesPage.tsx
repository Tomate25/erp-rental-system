import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('es-NI');
};

type PurchasesTab = 'maquinaria' | 'insumos';
const VALID_TABS: readonly PurchasesTab[] = ['maquinaria', 'insumos'];

const MODALIDAD_LABEL: Record<string, string> = {
  POR_DIA: 'Por Día',
  POR_HORA: 'Por Hora',
  POR_MES: 'Por Mes',
  MONTO_FIJO: 'Monto Fijo',
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

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-zinc-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              Compras y Subarriendo de Maquinaria
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
              Proveedores & Abastecimiento
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Control de maquinaria prestada/subarrendada por períodos desde Inventario y órdenes de compra de insumos para Bodega.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedEquipoForSub(null);
              setIsSubModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>+ Período Maquinaria Proveedor</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCompraModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Compra de Insumos</span>
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase block">
            Maquinaria De Proveedor
          </span>
          <p className="text-2xl font-black text-zinc-900 font-mono mt-1">
            {resumen?.equiposExternosInventario ?? equiposExternos.length}
          </p>
          <span className="text-[11px] text-amber-700 font-semibold">
            {resumen?.subarriendosActivos ?? 0} períodos activos · {resumen?.subarriendosPorVencer ?? 0} por vencer
          </span>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase block">
            Compras de Insumos
          </span>
          <p className="text-2xl font-black text-zinc-900 font-mono mt-1">
            {formatCurrency(resumen?.totalCompradoInsumos ?? 0)}
          </p>
          <span className="text-[11px] text-zinc-500">
            {resumen?.totalComprasInsumos ?? 0} compras recibidas en bodega
          </span>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase block">
            CxP Compras de Insumos
          </span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">
            {formatCurrency(resumen?.saldoPendienteCompras ?? 0)}
          </p>
          <span className="text-[11px] text-zinc-500">Saldo pendiente por crédito</span>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase block">
            CxP Subarriendos Maquinaria
          </span>
          <p className="text-2xl font-black text-red-700 font-mono mt-1">
            {formatCurrency(resumen?.saldoPendienteSubarriendos ?? 0)}
          </p>
          <span className="text-[11px] text-zinc-500">
            Total CxP módulo: {formatCurrency(resumen?.cxpTotalProveedoresCompras ?? 0)}
          </span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadAll} className="underline font-bold cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* Tabs + Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('maquinaria')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === 'maquinaria'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Maquinaria de Proveedores ({equiposExternos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('insumos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === 'insumos'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
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
              className="pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-xl bg-white"
            />
          </div>

          {activeTab === 'maquinaria' ? (
            <select
              value={estadoSubFilter}
              onChange={(e) => setEstadoSubFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-zinc-300 rounded-xl bg-white"
            >
              <option value="">Todos los períodos</option>
              <option value="ACTIVO">Activos</option>
              <option value="DEVUELTO">Devueltos</option>
            </select>
          ) : (
            <>
              <select
                value={estadoCompraFilter}
                onChange={(e) => setEstadoCompraFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-zinc-300 rounded-xl bg-white"
              >
                <option value="">Todos los estados</option>
                <option value="RECIBIDA">Recibidas</option>
                <option value="BORRADOR">Borradores</option>
                <option value="ANULADA">Anuladas</option>
              </select>
              <select
                value={estadoPagoFilter}
                onChange={(e) => setEstadoPagoFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-zinc-300 rounded-xl bg-white"
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
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-xs font-bold text-zinc-500">
          Cargando información de compras y maquinaria externa...
        </div>
      ) : activeTab === 'maquinaria' ? (
        <div className="space-y-6">
          {/* SECCIÓN 1: INVENTARIO CLASIFICADO COMO PROVEEDOR */}
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-zinc-200 bg-amber-50/50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-zinc-900">
                  Equipos en Inventario Clasificados "De Proveedor"
                </h2>
                <p className="text-[11px] text-zinc-600">
                  Maquinaria externa registrada en el Inventario ({totalEquiposSinPeriodo} sin período de préstamo/renta asignado).
                </p>
              </div>
            </div>

            {equiposExternos.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No hay equipos clasificados como <strong>De proveedor</strong> en Inventario todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                      <th className="p-3">Código / Equipo</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3 text-right">Costo Proveedor</th>
                      <th className="p-3">Estado Inventario</th>
                      <th className="p-3">Período Activo con Proveedor</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {equiposExternos.map((eq) => {
                      const periodoActivo = eq.subarriendos?.[0];
                      const contratoCliente = eq.detallesContrato?.[0]?.contrato;
                      return (
                        <tr key={eq.id} className="hover:bg-zinc-50/70">
                          <td className="p-3">
                            <div className="font-black text-zinc-900">
                              {eq.codigo ? `[${eq.codigo}] ` : ''}
                              {eq.modelo}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {eq.categoria?.nombre || 'Equipo'} · {eq.marca?.nombre || 'S/M'}
                              {eq.numeroSerie ? ` · S/N: ${eq.numeroSerie}` : ''}
                            </div>
                          </td>
                          <td className="p-3 font-bold text-zinc-800">
                            {eq.proveedor?.nombre || eq.proveedorNombre || 'Sin proveedor asignado'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {eq.precioProveedor != null
                              ? formatCurrency(Number(eq.precioProveedor))
                              : '—'}
                          </td>
                          <td className="p-3 space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-800">
                              {eq.estado}
                            </span>
                            <div className="text-[10px] text-zinc-500">
                              {eq.disponibleParaRenta
                                ? 'Habilitado para rentar'
                                : 'No promovible / Devuelto'}
                              {contratoCliente ? ` · En ${contratoCliente.codigo}` : ''}
                            </div>
                          </td>
                          <td className="p-3">
                            {periodoActivo ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  <Calendar className="w-3 h-3" /> {periodoActivo.codigo}
                                </span>
                                <div className="text-[11px] text-zinc-600 font-mono">
                                  {formatDate(periodoActivo.fechaInicio)} →{' '}
                                  {formatDate(periodoActivo.fechaFinEstimada)}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Sin período asignado
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEquipoForSub(eq);
                                setIsSubModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              {periodoActivo ? 'Nuevo Período' : 'Asignar Período'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: HISTORIAL DE PERÍODOS DE SUBARRIENDO / PRÉSTAMO */}
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h2 className="text-sm font-black text-zinc-900">
                Períodos de Renta / Préstamo con Proveedores ({subarriendos.length})
              </h2>
            </div>

            {subarriendos.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Aún no hay períodos registrados. Haz clic en <strong>Asignar Período</strong> sobre un equipo externo arriba para controlar fechas, costos y devolución.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                      <th className="p-3">Código / Doc</th>
                      <th className="p-3">Equipo</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3">Período</th>
                      <th className="p-3 text-right">Costo / Pagado</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {subarriendos.map((sub) => {
                      const base = Number(sub.montoFinal ?? sub.montoEstimado ?? 0);
                      const saldo = Math.max(0, base - Number(sub.montoPagado || 0));
                      return (
                        <tr key={sub.id} className="hover:bg-zinc-50/70">
                          <td className="p-3 font-mono">
                            <div className="font-black text-zinc-900">{sub.codigo}</div>
                            {sub.referenciaDocumento && (
                              <div className="text-[10px] text-zinc-500">
                                Ref: {sub.referenciaDocumento}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-zinc-900">
                              {sub.equipo?.codigo ? `[${sub.equipo.codigo}] ` : ''}
                              {sub.equipo?.modelo || 'Equipo'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {MODALIDAD_LABEL[sub.modalidad] || sub.modalidad} ·{' '}
                              {formatCurrency(Number(sub.tarifaProveedor))}
                            </div>
                          </td>
                          <td className="p-3 font-bold text-zinc-800">{sub.proveedorNombre}</td>
                          <td className="p-3 font-mono text-[11px]">
                            <div>
                              {formatDate(sub.fechaInicio)} → {formatDate(sub.fechaFinEstimada)}
                            </div>
                            {sub.vencido && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700">
                                <AlertTriangle className="w-3 h-3" /> Vencido (hace{' '}
                                {Math.abs(sub.diasRestantes || 0)}d)
                              </span>
                            )}
                            {sub.porVencer && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700">
                                <Clock className="w-3 h-3" /> Vence en {sub.diasRestantes}d
                              </span>
                            )}
                            {sub.fechaDevolucionReal && (
                              <div className="text-[10px] text-emerald-700">
                                Devuelto: {formatDate(sub.fechaDevolucionReal)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono">
                            <div className="font-black text-zinc-900">{formatCurrency(base)}</div>
                            <div className="text-[10px] text-zinc-500">
                              Pagado: {formatCurrency(Number(sub.montoPagado || 0))} · Saldo:{' '}
                              <span className={saldo > 0 ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                                {formatCurrency(saldo)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                                sub.estado === 'ACTIVO'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {sub.estado}
                            </span>
                            <div>
                              <span className="text-[10px] font-bold text-zinc-500">
                                {sub.estadoPago}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
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
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  <CreditCard className="w-3 h-3" /> Pagar
                                </button>
                              )}
                              {sub.estado === 'ACTIVO' && (
                                <button
                                  type="button"
                                  onClick={() => handleDevolverSubarriendo(sub)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold cursor-pointer"
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
          </div>
        </div>
      ) : (
        /* TAB: COMPRAS DE INSUMOS */
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
          {compras.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
              <ShoppingBag className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="font-bold text-zinc-700">No hay compras de insumos registradas</p>
              <p>
                Registra aquí tus compras multi-línea de repuestos y lubricantes para alimentar automáticamente el stock y Kardex de Bodega.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                    <th className="p-3">Código / Factura</th>
                    <th className="p-3">Proveedor / Fecha</th>
                    <th className="p-3">Insumos Comprados</th>
                    <th className="p-3 text-right">Total / Saldo</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {compras.map((cmp) => {
                    const saldo = Math.max(0, Number(cmp.total) - Number(cmp.montoPagado || 0));
                    return (
                      <tr key={cmp.id} className="hover:bg-zinc-50/70">
                        <td className="p-3 font-mono">
                          <div className="font-black text-zinc-900">{cmp.codigo}</div>
                          <div className="text-[10px] text-zinc-500">
                            {cmp.numeroFactura ? `Fac: ${cmp.numeroFactura}` : 'Sin factura'} ·{' '}
                            {cmp.condicionPago}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-zinc-900">{cmp.proveedorNombre}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {formatDate(cmp.fechaCompra)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            {cmp.items?.map((it) => (
                              <div key={it.id} className="text-[11px] text-zinc-700">
                                <strong className="font-mono">{Number(it.cantidad)}</strong> ×{' '}
                                {it.insumo?.nombre || 'Insumo'} ({formatCurrency(Number(it.costoUnitario))})
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="font-black text-zinc-900">
                            {formatCurrency(Number(cmp.total))}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            IVA: {formatCurrency(Number(cmp.ivaTotal))} · Saldo:{' '}
                            <span className={saldo > 0 ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                              {formatCurrency(saldo)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                              cmp.estado === 'RECIBIDA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cmp.estado === 'BORRADOR'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {cmp.estado}
                          </span>
                          <div className="text-[10px] font-bold text-zinc-500">
                            {cmp.estadoPago}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {cmp.estado === 'BORRADOR' && (
                              <button
                                type="button"
                                onClick={() => handleRecibirCompra(cmp)}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[11px] font-bold cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                <CreditCard className="w-3 h-3" /> Pagar
                              </button>
                            )}
                            {cmp.estado === 'RECIBIDA' && Number(cmp.montoPagado || 0) === 0 && (
                              <button
                                type="button"
                                onClick={() => handleAnularCompra(cmp)}
                                title="Anular compra y revertir stock"
                                className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer"
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
        </div>
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
        equipos={equiposExternos}
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
