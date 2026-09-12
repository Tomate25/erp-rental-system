import React, { useState, useEffect } from 'react';
import { getSalesRanking, getAllQuotations, seedSalesTestData } from '../services/sales.api';
import type { AdvisorSalesStat, GlobalSalesTotals } from '../types/sales.types';
import type { Cotizacion } from '../../quotations/types/quotation.types';
import { EstadoCotizacionValues } from '../../quotations/types/quotation.types';
import { QuotationPrintView } from '../../quotations/components/QuotationPrintView';
import {
  Trophy,
  Award,
  Users,
  Coins,
  Banknote,
  Percent,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  Filter
} from 'lucide-react';

export const SalesDashboardPage: React.FC = () => {
  const [ranking, setRanking] = useState<AdvisorSalesStat[]>([]);
  const [globalTotals, setGlobalTotals] = useState<GlobalSalesTotals | null>(null);
  const [quotations, setQuotations] = useState<Cotizacion[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Cotizacion[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  // Filtros de cotizaciones
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'VENTAS' | 'CONVERSION' | 'COTIZACIONES'>('VENTAS');

  // Vista de impresión
  const [printingQuotation, setPrintingQuotation] = useState<Cotizacion | null>(null);

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const userRoles: string[] = (currentUser?.roles || []).map((r: any) =>
    typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || ''
  );
  const isAdminOrManager = userRoles.includes('ADMIN') || userRoles.includes('GERENTE');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rankingData, quotesData] = await Promise.all([
        getSalesRanking(),
        getAllQuotations()
      ]);
      setRanking(rankingData?.ranking || []);
      setGlobalTotals(rankingData?.globalTotals || null);
      setQuotations(quotesData || []);
      setFilteredQuotations(quotesData || []);
    } catch (err) {
      console.error('Error loading sales ranking data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrado de cotizaciones
  useEffect(() => {
    let list = quotations;

    if (selectedStatus !== 'ALL') {
      list = list.filter(q => q.estado === selectedStatus);
    }

    if (selectedAdvisor !== 'ALL') {
      list = list.filter(q => (q.asesorId || q.asesor?.id) === selectedAdvisor);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        item =>
          item.numeroCotizacion?.toLowerCase().includes(q) ||
          item.cliente?.nombre?.toLowerCase().includes(q) ||
          item.proyecto?.toLowerCase().includes(q) ||
          (item.asesor ? `${item.asesor.nombre} ${item.asesor.apellido}`.toLowerCase().includes(q) : false)
      );
    }

    setFilteredQuotations(list);
  }, [searchQuery, selectedStatus, selectedAdvisor, quotations]);

  const handleSeedData = async () => {
    if (!window.confirm('¿Deseas generar cotizaciones y contratos de prueba realistas para los asesores comerciales?')) {
      return;
    }
    setIsSeeding(true);
    setSeedSuccessMsg(null);
    try {
      const res = await seedSalesTestData();
      setSeedSuccessMsg(
        `¡Generación exitosa! Se crearon ${res.createdQuotesCount} cotizaciones y ${res.createdContractsCount} contratos para ${res.advisorsSeeded} asesores.`
      );
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al generar datos de prueba');
    } finally {
      setIsSeeding(false);
    }
  };

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(val || 0);
  };

  // Ordenar ranking
  const sortedRanking = [...ranking].sort((a, b) => {
    if (sortBy === 'VENTAS') return b.montoTotalVendido - a.montoTotalVendido;
    if (sortBy === 'CONVERSION') return b.tasaConversion - a.tasaConversion;
    if (sortBy === 'COTIZACIONES') return b.totalCotizaciones - a.totalCotizaciones;
    return 0;
  });

  const top1 = sortedRanking[0];
  const top2 = sortedRanking[1];
  const top3 = sortedRanking[2];

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case EstadoCotizacionValues.ACEPTADA:
      case 'CONVERTIDA_A_CONTRATO':
      case 'FACTURADA':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-max">
            <CheckCircle className="w-3 h-3" /> Aprobada / Ganada
          </span>
        );
      case EstadoCotizacionValues.EN_REVISION:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 flex items-center gap-1 w-max">
            <Clock className="w-3 h-3" /> En Revisión
          </span>
        );
      case EstadoCotizacionValues.RECHAZADA:
      case EstadoCotizacionValues.CANCELADA:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 flex items-center gap-1 w-max">
            <XCircle className="w-3 h-3" /> Rechazada
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 flex items-center gap-1 w-max">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
    }
  };

  if (printingQuotation) {
    return <QuotationPrintView quotation={printingQuotation} onBack={() => setPrintingQuotation(null)} />;
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              Supervisión Comercial & Leaderboard
            </span>
            <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              Moneda: Córdobas (C$ NIO)
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#1B1D22] tracking-tight">
            Ranking de Ventas & Cotizaciones
          </h1>
          <p className="text-xs text-[#747780] mt-0.5">
            Métricas de rendimiento en tiempo real, efectividad de cierre por asesor y control consolidado de cotizaciones en Córdobas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#E5E8EE] text-[#1B1D22] text-xs font-bold hover:bg-[#F4F6F9] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>

          {isAdminOrManager && (
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold hover:from-amber-600 hover:to-amber-700 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
              {isSeeding ? 'Generando Datos...' : 'Generar Datos de Prueba'}
            </button>
          )}
        </div>
      </div>

      {/* Alerta de datos generados */}
      {seedSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-800">{seedSuccessMsg}</p>
          </div>
          <button
            onClick={() => setSeedSuccessMsg(null)}
            className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* KPI Globales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs">
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Cotizado (C$)</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#1B1D22]">
            {formatMoney(globalTotals?.montoGlobalCotizado)}
          </p>
          <span className="text-[10px] text-[#747780] font-medium block mt-1">
            {globalTotals?.totalCotizaciones || 0} cotizaciones emitidas
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ventas Cerradas</span>
            <div className="p-2 rounded-xl bg-emerald-500 text-white">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700">
            {formatMoney(globalTotals?.montoGlobalVendido)}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">
            {globalTotals?.totalAprobadas || 0} contratos formalizados
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs">
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Efectividad</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-purple-700">
            {globalTotals?.tasaConversionPromedio || 0}%
          </p>
          <span className="text-[10px] text-[#747780] font-medium block mt-1">
            Tasa de conversión global
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs">
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Negociación</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-600">
            {globalTotals?.totalPendientes || 0}
          </p>
          <span className="text-[10px] text-[#747780] font-medium block mt-1">
            Pendientes o en revisión
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#747780] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Equipo Asesores</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#1B1D22]">
            {ranking.length}
          </p>
          <span className="text-[10px] text-[#747780] font-medium block mt-1">
            Vendedores activos
          </span>
        </div>
      </div>

      {/* Podio Top 3 Vendedores */}
      {top1 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-black text-[#1B1D22]">Podio de Honor: Top Vendedores</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#747780]">
              <span>Ordenar ranking por:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-white border border-[#E5E8EE] rounded-xl px-3 py-1.5 text-xs text-[#1B1D22] font-semibold cursor-pointer focus:outline-none"
              >
                <option value="VENTAS">Mayor Monto Vendido (C$)</option>
                <option value="CONVERSION">Mayor Tasa de Conversión (%)</option>
                <option value="COTIZACIONES">Mayor Cantidad Cotizaciones</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 2do Lugar (Plata) */}
            {top2 ? (
              <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm relative flex flex-col justify-between order-2 md:order-1">
                <div className="absolute -top-3.5 left-6 px-3 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black tracking-wider uppercase border border-slate-300 flex items-center gap-1">
                  🥈 2º Lugar • Plata
                </div>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-lg border border-slate-200">
                      {top2.nombre.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-[#1B1D22] leading-tight">{top2.nombre}</h3>
                      <p className="text-[11px] text-[#747780] truncate max-w-[180px]">{top2.email}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendido</span>
                    <p className="text-lg font-black text-[#1B1D22]">{formatMoney(top2.montoTotalVendido)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-[#747780] block">Aprobadas</span>
                      <strong className="text-[#1B1D22] font-black">{top2.cotizacionesAprobadas}</strong> / {top2.totalCotizaciones}
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-[#747780] block">Conversión</span>
                      <strong className="text-slate-800 font-black">{top2.tasaConversion}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="hidden md:block order-1" />}

            {/* 1er Lugar (Oro) */}
            <div className="bg-gradient-to-b from-amber-50/50 to-white rounded-3xl p-6 border-2 border-amber-400 shadow-md shadow-amber-500/10 relative flex flex-col justify-between order-1 md:order-2">
              <div className="absolute -top-3.5 left-6 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-black tracking-wider uppercase shadow-sm flex items-center gap-1.5">
                👑 1º Lugar • Líder de Ventas
              </div>
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 text-white flex items-center justify-center font-black text-xl shadow-md shadow-amber-400/30">
                    {top1.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#1B1D22] leading-tight">{top1.nombre}</h3>
                    <p className="text-[11px] text-[#747780] truncate max-w-[190px]">{top1.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {top1.contratosGenerados} contratos activos
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Facturado / Vendido</span>
                  <p className="text-2xl font-black text-amber-900">{formatMoney(top1.montoTotalVendido)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-xs">
                    <span className="text-[10px] text-[#747780] block">Cierre de Ventas</span>
                    <strong className="text-[#1B1D22] font-black">{top1.cotizacionesAprobadas}</strong> aprobadas de {top1.totalCotizaciones}
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-xs">
                    <span className="text-[10px] text-[#747780] block">Tasa de Éxito</span>
                    <strong className="text-amber-700 font-black text-sm">{top1.tasaConversion}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 3er Lugar (Bronce) */}
            {top3 ? (
              <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-sm relative flex flex-col justify-between order-3">
                <div className="absolute -top-3.5 left-6 px-3 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black tracking-wider uppercase border border-orange-200 flex items-center gap-1">
                  🥉 3º Lugar • Bronce
                </div>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center font-black text-orange-800 text-lg border border-orange-200">
                      {top3.nombre.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-[#1B1D22] leading-tight">{top3.nombre}</h3>
                      <p className="text-[11px] text-[#747780] truncate max-w-[180px]">{top3.email}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-100 space-y-1">
                    <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Vendido</span>
                    <p className="text-lg font-black text-[#1B1D22]">{formatMoney(top3.montoTotalVendido)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-orange-50/40 border border-orange-100">
                      <span className="text-[10px] text-[#747780] block">Aprobadas</span>
                      <strong className="text-[#1B1D22] font-black">{top3.cotizacionesAprobadas}</strong> / {top3.totalCotizaciones}
                    </div>
                    <div className="p-2 rounded-xl bg-orange-50/40 border border-orange-100">
                      <span className="text-[10px] text-[#747780] block">Conversión</span>
                      <strong className="text-orange-800 font-black">{top3.tasaConversion}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="hidden md:block order-3" />}
          </div>
        </div>
      )}

      {/* Tabla Completa del Leaderboard / Ranking de Asesores */}
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5E8EE] flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#1B1D22]">Tabla de Rendimiento Comercial</h2>
            <p className="text-xs text-[#747780]">Desempeño acumulado de cada miembro del equipo de ventas</p>
          </div>
          <span className="text-xs font-bold text-[#747780]">
            {sortedRanking.length} Asesores Evaluados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E8EE] bg-[#F8F9FA] text-[11px] font-bold text-[#747780] uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-16">Pos</th>
                <th className="py-3.5 px-4">Asesor Comercial</th>
                <th className="py-3.5 px-4 text-center">Cotizaciones</th>
                <th className="py-3.5 px-4 text-center">Aprobadas</th>
                <th className="py-3.5 px-4">Tasa Conversión</th>
                <th className="py-3.5 px-4 text-right">Total Cotizado</th>
                <th className="py-3.5 px-4 text-right">Total Vendido</th>
                <th className="py-3.5 px-4 text-right">Ticket Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EE] text-xs">
              {sortedRanking.map((item, index) => {
                const pos = index + 1;
                const isCurrent = currentUser?.id === item.asesorId;
                return (
                  <tr
                    key={item.asesorId}
                    className={`hover:bg-[#F8F9FA] transition-colors ${
                      isCurrent ? 'bg-amber-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-4 px-4 text-center">
                      {pos === 1 ? (
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-white font-black text-xs inline-flex items-center justify-center shadow-xs">
                          1
                        </span>
                      ) : pos === 2 ? (
                        <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black text-xs inline-flex items-center justify-center">
                          2
                        </span>
                      ) : pos === 3 ? (
                        <span className="w-7 h-7 rounded-full bg-orange-300 text-orange-900 font-black text-xs inline-flex items-center justify-center">
                          3
                        </span>
                      ) : (
                        <span className="text-[#747780] font-black text-xs">#{pos}</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {item.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[#1B1D22]">{item.nombre}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.2 rounded-md bg-amber-200 text-amber-900 text-[9px] font-black uppercase">
                                Tú
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#747780]">{item.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-[#1B1D22]">
                      {item.totalCotizaciones}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        {item.cotizacionesAprobadas}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1 w-36">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>{item.tasaConversion}%</span>
                          <span className="text-[9px] text-[#747780]">
                            {item.cotizacionesAprobadas}/{item.totalCotizaciones}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.tasaConversion >= 60
                                ? 'bg-emerald-500'
                                : item.tasaConversion >= 30
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, item.tasaConversion)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right text-[#747780] font-semibold">
                      {formatMoney(item.montoTotalCotizado)}
                    </td>

                    <td className="py-4 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatMoney(item.montoTotalVendido)}
                    </td>

                    <td className="py-4 px-4 text-right text-[#1B1D22] font-semibold">
                      {formatMoney(item.ticketPromedio)}
                    </td>
                  </tr>
                );
              })}

              {sortedRanking.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#747780]">
                    No se encontraron registros de ventas ni asesores comerciales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consolidado de TODAS las Cotizaciones */}
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-[#1B1D22]">
              Registro Consolidado de Cotizaciones
            </h2>
            <p className="text-xs text-[#747780]">
              Todas las cotizaciones registradas por los diferentes asesores de la empresa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Buscador */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#747780] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente, proyecto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F8F9FA] border border-[#E5E8EE] text-xs focus:outline-none focus:border-[#1A73E8]"
              />
            </div>

            {/* Filtro por Asesor */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E8EE] px-3 py-1.5 rounded-2xl text-xs">
              <Users className="w-3.5 h-3.5 text-[#747780]" />
              <select
                value={selectedAdvisor}
                onChange={(e) => setSelectedAdvisor(e.target.value)}
                className="bg-transparent text-xs text-[#1B1D22] font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Asesores</option>
                {ranking.map((adv) => (
                  <option key={adv.asesorId} value={adv.asesorId}>
                    {adv.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E8EE] px-3 py-1.5 rounded-2xl text-xs">
              <Filter className="w-3.5 h-3.5 text-[#747780]" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs text-[#1B1D22] font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Estados</option>
                <option value={EstadoCotizacionValues.ACEPTADA}>Aprobadas / Vendidas</option>
                <option value={EstadoCotizacionValues.PENDIENTE}>Pendientes</option>
                <option value={EstadoCotizacionValues.EN_REVISION}>En Revisión</option>
                <option value={EstadoCotizacionValues.RECHAZADA}>Rechazadas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Cotizaciones Consolidadas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E8EE] bg-[#F8F9FA] text-[11px] font-bold text-[#747780] uppercase tracking-wider">
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Cliente & Proyecto</th>
                <th className="py-3 px-4">Asesor Asignado</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha Emisión</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EE] text-xs">
              {filteredQuotations.map((q) => (
                <tr key={q.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-3.5 px-4 font-black text-[#1A73E8]">
                    {q.numeroCotizacion}
                    {q.version > 1 && (
                      <span className="ml-1 text-[10px] text-[#747780] font-normal">v{q.version}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#1B1D22]">{q.cliente?.nombre || 'Cliente General'}</p>
                    <span className="text-[11px] text-[#747780]">{q.proyecto || 'Proyecto Estándar'}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    {q.asesor ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center">
                          {q.asesor.nombre.charAt(0)}
                        </span>
                        <span className="font-semibold text-[#1B1D22]">
                          {q.asesor.nombre} {q.asesor.apellido}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#747780] italic">Sin Asesor</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right font-black text-[#1B1D22]">
                    {formatMoney(q.total)}
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(q.estado)}</td>

                  <td className="py-3.5 px-4 text-[#747780]">
                    {new Date(q.fechaEmision || q.createdAt).toLocaleDateString('es-NI')}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => setPrintingQuotation(q)}
                      title="Imprimir Cotización Oficial"
                      className="p-1.5 rounded-xl border border-[#E5E8EE] text-[#747780] hover:text-[#1A73E8] hover:bg-[#E8F0FE] transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#747780]">
                    No se encontraron cotizaciones con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
