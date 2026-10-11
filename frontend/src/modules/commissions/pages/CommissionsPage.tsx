import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Plus,
  RotateCcw,
  Percent,
  Calculator,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Info,
  Coins,
  Banknote,
  TrendingUp,
  Users,
  Sparkles,
  RefreshCw,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import {
  getCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  seedDefaultCommissionRules,
  seedRulesForAllSellers,
  calculateCommission,
  getTeamSettlement,
} from '../services/commissions.api';
import type {
  ReglaComision,
  ResultadoComision,
  TeamSettlementResponse,
  SettlementItem,
} from '../services/commissions.api';
import { getUsers } from '../../security/services/security.api';
import type { UserDetail } from '../../security/types/security.types';
import { formatCurrency } from '../../../shared/utils/formatters';

export const CommissionsPage: React.FC = () => {
  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'settlement' | 'rules' | 'simulator'>('settlement');

  // Datos
  const [rules, setRules] = useState<ReglaComision[]>([]);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [settlementData, setSettlementData] = useState<TeamSettlementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Detalle de Liquidación de Vendedor
  const [selectedSeller, setSelectedSeller] = useState<SettlementItem | null>(null);

  // Modal Crear / Editar Regla
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReglaComision | null>(null);
  const [formData, setFormData] = useState<{
    usuarioId: string;
    desdeMonto: number;
    hastaMonto: string;
    porcentaje: number;
  }>({
    usuarioId: '',
    desdeMonto: 0,
    hastaMonto: '',
    porcentaje: 3,
  });

  // Simulador / Liquidador
  const [simUsuarioId, setSimUsuarioId] = useState('');
  const [simMontoVentas, setSimMontoVentas] = useState<number>(279450);
  const [simResult, setSimResult] = useState<ResultadoComision | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Filtro de reglas
  const [filterUser, setFilterUser] = useState<string>('ALL');

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [rulesRes, usersRes, settlementRes] = await Promise.all([
        getCommissionRules(),
        getUsers(),
        getTeamSettlement(),
      ]);
      setRules(rulesRes);
      setUsers(usersRes);
      setSettlementData(settlementRes);

      // Preseleccionar vendedor líder en simulador si existe
      if (settlementRes?.liquidaciones && settlementRes.liquidaciones.length > 0) {
        const top = settlementRes.liquidaciones[0];
        setSimUsuarioId((prev) => prev || top.usuarioId);
        if (top.totalVendido > 0) {
          setSimMontoVentas((prev) => prev || top.totalVendido);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al sincronizar datos de comisiones');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  // Sembrar formato universal a todos los vendedores
  const handleSeedAllSellers = async () => {
    if (!confirm('¿Deseas aplicar la escala universal (1-800k: 3%, 801k-1.2M: 2%, >1.2M: 1%) a todos los vendedores del equipo?')) return;
    setIsLoading(true);
    try {
      await seedRulesForAllSellers();
      setSuccessMsg('Escala universal aplicada exitosamente a todos los asesores comerciales.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al aplicar escala universal a todos los vendedores');
      setIsLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('¿Deseas restablecer las escalas predeterminadas del sistema?')) return;
    setIsLoading(true);
    try {
      await seedDefaultCommissionRules();
      setSuccessMsg('Escalas predeterminadas del sistema aseguradas con éxito.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al sembrar escalas');
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setFormData({
      usuarioId: '',
      desdeMonto: 0,
      hastaMonto: '',
      porcentaje: 3,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: ReglaComision) => {
    setEditingRule(rule);
    setFormData({
      usuarioId: rule.usuarioId || '',
      desdeMonto: rule.desdeMonto,
      hastaMonto: rule.hastaMonto ? String(rule.hastaMonto) : '',
      porcentaje: rule.porcentaje,
    });
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        usuarioId: formData.usuarioId ? formData.usuarioId : null,
        desdeMonto: Number(formData.desdeMonto),
        hastaMonto: formData.hastaMonto ? Number(formData.hastaMonto) : null,
        porcentaje: Number(formData.porcentaje),
      };

      if (editingRule) {
        await updateCommissionRule(editingRule.id, payload);
        setSuccessMsg('Escala de comisión actualizada correctamente');
      } else {
        await createCommissionRule(payload);
        setSuccessMsg('Escala de comisión creada correctamente');
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar la regla de comisión');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta regla de comisión?')) return;
    try {
      await deleteCommissionRule(id);
      setSuccessMsg('Regla eliminada');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleRunSimulation = async () => {
    if (!simUsuarioId || simMontoVentas === undefined) return;
    setIsSimulating(true);
    try {
      const res = await calculateCommission({
        usuarioId: simUsuarioId,
        montoVentas: Number(simMontoVentas),
      });
      setSimResult(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al calcular comisión');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOpenSimulatorForUser = (userItem: SettlementItem) => {
    setSimUsuarioId(userItem.usuarioId);
    setSimMontoVentas(userItem.totalVendido > 0 ? userItem.totalVendido : 500000);
    setActiveTab('simulator');
    setTimeout(() => {
      handleRunSimulation();
    }, 100);
  };

  // Vendedores comerciales
  const salesUsers = users.filter((u) =>
    u.roles?.some((r) => r.nombre === 'COMERCIAL' || r.nombre === 'ADMIN' || r.nombre === 'GERENTE')
  );

  const filteredRules = rules.filter((r) => {
    if (filterUser === 'ALL') return true;
    if (filterUser === 'GLOBAL') return !r.usuarioId;
    return r.usuarioId === filterUser;
  });

  const resumen = settlementData?.resumen;
  const liquidaciones = settlementData?.liquidaciones || [];

  return (
    <div className="animate-fadeIn max-w-7xl mx-auto w-full pb-16 font-sans space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E8EE] pb-4 sm:pb-6">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Award className="w-6 h-6 sm:w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-lg sm:text-xl font-black text-[#1B1D22] tracking-tight">
                Gestión y Liquidación de Comisiones
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] sm:text-[10px] font-black tracking-wider uppercase border border-red-200">
                ADMIN
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-black tracking-wider uppercase border border-emerald-300 flex items-center gap-1">
                <Banknote className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                CÓRDOBAS (C$)
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#747780] font-medium mt-0.5">
              Cálculo automatizado de comisiones comerciales según volumen vendido y escalas vigentes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-precision-outline text-xs py-2 px-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Recalcular con las últimas ventas en vivo"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#1A73E8] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleSeedAllSellers}
            className="btn-precision-primary text-xs py-2 px-2.5 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 border-blue-600 shadow-xs cursor-pointer truncate"
            title="Asegura el formato universal (3%, 2%, 1%) para todos los vendedores"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">Escala Universal</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="col-span-2 sm:col-span-1 btn-precision-primary text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Regla</span>
          </button>
        </div>
      </div>

      {/* Alertas de Notificación */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Tarjetas de Métricas Ejecutivas del Equipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Vendido */}
        <div className="bg-white border border-[#E5E8EE] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-blue-50 text-[#1A73E8] w-fit">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#747780] block">
              Ventas Totales
            </span>
            <div className="text-base sm:text-xl font-black text-[#1B1D22] font-mono mt-0.5">
              {formatCurrency(resumen?.totalVendidoEquipo || 0)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-blue-700 font-bold block truncate">
              {resumen?.totalContratos || 0} contratos generados
            </span>
          </div>
        </div>

        {/* Total Comisiones a Liquidar */}
        <div className="bg-white border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 w-fit">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
              Comisiones a Pagar
            </span>
            <div className="text-base sm:text-xl font-black text-emerald-700 font-mono mt-0.5">
              {formatCurrency(resumen?.totalComisionesEquipo || 0)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block truncate">
              Media: {resumen?.tasaEfectivaPromedio || 0}%
            </span>
          </div>
        </div>

        {/* Vendedor Líder */}
        <div className="bg-white border border-[#E5E8EE] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 w-fit">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="truncate">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#747780] block">
              Vendedor Líder
            </span>
            <div className="text-xs sm:text-sm font-black text-[#1B1D22] truncate mt-0.5" title={resumen?.vendedorLider?.nombre || 'N/A'}>
              {resumen?.vendedorLider?.nombre || 'Sin ventas aún'}
            </div>
            <span className="text-[9px] sm:text-[10px] text-amber-700 font-bold font-mono block truncate">
              {formatCurrency(resumen?.vendedorLider?.comision || 0)}
            </span>
          </div>
        </div>

        {/* Cobertura de Equipo */}
        <div className="bg-white border border-[#E5E8EE] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 w-fit">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#747780] block">
              Equipo Comercial
            </span>
            <div className="text-base sm:text-xl font-black text-[#1B1D22] mt-0.5">
              {resumen?.vendedoresConVentas || 0} / {resumen?.totalVendedores || 0}
            </div>
            <span className="text-[9px] sm:text-[10px] text-purple-700 font-bold block truncate">
              Con comisiones
            </span>
          </div>
        </div>
      </div>

      {/* Banner Informativo del Formato Universal de Comisiones */}
      <div className="bg-gradient-to-r from-blue-50/80 via-white to-emerald-50/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#E5E8EE] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#1A73E8]/10 text-[#1A73E8] shrink-0 mt-0.5">
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider">
                Escala de Comisión Estándar
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] sm:text-[10px] font-bold">
                Universal
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 mt-2 text-xs text-[#37474F] font-medium">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#E5E8EE]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span><strong>1 - 800k:</strong> <span className="font-bold text-emerald-700">3%</span></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#E5E8EE]">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span><strong>801k - 1.2M:</strong> <span className="font-bold text-blue-700">2%</span></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#E5E8EE]">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span><strong>&gt; 1.2M:</strong> <span className="font-bold text-amber-700">1%</span></span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSeedAllSellers}
          className="btn-precision-outline text-xs py-1.5 px-3 whitespace-nowrap self-stretch md:self-auto text-center cursor-pointer"
        >
          Reaplicar a Todos
        </button>
      </div>

      {/* Navegación por Pestañas */}
      <div className="border-b border-[#E5E8EE] flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar whitespace-nowrap -mx-2 px-2 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('settlement')}
          className={`pb-3 px-1.5 text-xs font-extrabold tracking-wide uppercase flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'settlement'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span>Liquidación en Vivo ({liquidaciones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-1.5 text-xs font-extrabold tracking-wide uppercase flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'rules'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <Percent className="w-4 h-4 shrink-0" />
          <span>Reglas y Escalas ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`pb-3 px-1.5 text-xs font-extrabold tracking-wide uppercase flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'simulator'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <Calculator className="w-4 h-4 shrink-0" />
          <span>Simulador</span>
        </button>
      </div>

      {/* Contenido según Pestaña */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E5E8EE]">
          <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#747780] font-medium">Cargando módulos de liquidación y comisiones...</p>
        </div>
      ) : (
        <>
          {/* PESTAÑA 1: TABLERO DE LIQUIDACIÓN EN VIVO */}
          {activeTab === 'settlement' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#E5E8EE] rounded-3xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#E5E8EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFD]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#1B1D22] text-sm">
                        Resumen de Liquidación de Comisiones en Córdobas (C$) por Asesor Comercial
                      </h3>
                      <p className="text-[11px] text-[#747780]">
                        Valores calculados en tiempo real con las cotizaciones ganadas y contratos aprobados en el ERP.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-extrabold text-[#747780] bg-white px-3 py-1.5 rounded-xl border border-[#E5E8EE]">
                    {liquidaciones.filter((l) => l.totalVendido > 0).length} Vendedores con Comisión Ganada
                  </span>
                </div>

                {/* VISTA MÓVIL (< md): TARJETAS TÁCTILES POR ASESOR */}
                <div className="md:hidden space-y-3 p-3 bg-[#FAFBFD]">
                  {liquidaciones.map((l, index) => {
                    const hasSales = l.totalVendido > 0;
                    const isTop = index === 0 && hasSales;

                    return (
                      <div
                        key={l.usuarioId}
                        className={`bg-white rounded-2xl border border-[#E5E8EE] p-3.5 shadow-2xs space-y-3 ${
                          isTop ? 'ring-1 ring-amber-300' : ''
                        }`}
                      >
                        {/* Header: Posición + Nombre + Estado */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                isTop
                                  ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                                  : hasSales
                                  ? 'bg-[#E8F0FE] text-[#1A73E8]'
                                  : 'bg-gray-100 text-[#747780]'
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-bold text-[#1B1D22] text-xs flex items-center gap-1.5">
                                <span>{l.nombre}</span>
                                {isTop && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                                    TOP 1
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#747780] font-mono block truncate max-w-[170px]">
                                {l.email}
                              </span>
                            </div>
                          </div>

                          {hasSales ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>POR LIQUIDAR</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-[#747780] shrink-0">
                              SIN VENTAS
                            </span>
                          )}
                        </div>

                        {/* Grid Métricas: Ventas vs Comisión */}
                        <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E5E8EE]">
                          <div>
                            <span className="text-[9px] uppercase font-extrabold text-[#747780] block">
                              Ventas Cobradas
                            </span>
                            <span className="text-xs font-black font-mono text-[#1B1D22]">
                              {formatCurrency(l.totalVendido)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-extrabold text-emerald-800 block">
                              Comisión Ganada
                            </span>
                            <span className="text-xs font-black font-mono text-emerald-700">
                              {hasSales ? formatCurrency(l.comisionTotal) : 'C$ 0.00'}
                            </span>
                          </div>
                        </div>

                        {/* Detalle de tramo y contratos */}
                        <div className="flex items-center justify-between text-[11px] text-[#747780]">
                          <span>
                            {l.cotizacionesAprobadas} cotiz. · {l.contratosGenerados} contr.
                          </span>
                          {hasSales && (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
                              {l.porcentajeAplicado}% ({l.tramoAplicado})
                            </span>
                          )}
                        </div>

                        {/* Acciones táctiles */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E8EE]">
                          <button
                            type="button"
                            onClick={() => setSelectedSeller(l)}
                            className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#1A73E8]" />
                            <span>Detalle</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSimulatorForUser(l)}
                            className="py-1.5 px-2 bg-[#E8F0FE] hover:bg-blue-100 text-[#1A73E8] text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Simular</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Tarjeta de Totales del Equipo en Móvil */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm space-y-2">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Totales del Equipo Comercial
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Ventas Totales:</span>
                        <span className="font-mono font-bold text-white text-sm">
                          {formatCurrency(resumen?.totalVendidoEquipo || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-300 block text-[10px]">Comisiones Totales:</span>
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {formatCurrency(resumen?.totalComisionesEquipo || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VISTA ESCRITORIO (>= md): TABLA COMPLETA */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] uppercase tracking-wider text-[10px] font-extrabold">
                        <th className="p-4"># Posición / Asesor</th>
                        <th className="p-4 text-center">Cotizaciones & Contratos</th>
                        <th className="p-4 text-right">Ventas Totales Cobradas (C$)</th>
                        <th className="p-4 text-center">Escala / % Aplicado</th>
                        <th className="p-4 text-right">Comisión Ganada (C$)</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E8EE]">
                      {liquidaciones.map((l, index) => {
                        const hasSales = l.totalVendido > 0;
                        const isTop = index === 0 && hasSales;

                        return (
                          <tr
                            key={l.usuarioId}
                            className={`hover:bg-[#F8FAFC] transition-colors font-medium ${
                              isTop ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                    isTop
                                      ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                                      : hasSales
                                      ? 'bg-[#E8F0FE] text-[#1A73E8]'
                                      : 'bg-gray-100 text-[#747780]'
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-bold text-[#1B1D22] text-xs flex items-center gap-1.5">
                                    <span>{l.nombre}</span>
                                    {isTop && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                                        TOP 1
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[#747780] font-mono">{l.email}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 text-center font-medium">
                              <div className="text-xs font-bold text-[#1B1D22]">
                                {l.cotizacionesAprobadas} de {l.totalCotizaciones} cotizaciones
                              </div>
                              <div className="text-[10px] text-[#747780]">
                                {l.contratosGenerados} contratos generados
                              </div>
                            </td>

                            <td className="p-4 text-right font-mono font-bold text-xs text-[#1B1D22]">
                              {formatCurrency(l.totalVendido)}
                            </td>

                            <td className="p-4 text-center">
                              {hasSales ? (
                                <div>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                                    {l.porcentajeAplicado}%
                                  </span>
                                  <span className="block text-[9px] text-[#747780] mt-0.5">
                                    {l.tramoAplicado}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#747780] italic">Sin tramo</span>
                              )}
                            </td>

                            <td className="p-4 text-right font-mono">
                              {hasSales ? (
                                <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200">
                                  {formatCurrency(l.comisionTotal)}
                                </span>
                              ) : (
                                <span className="text-xs text-[#747780] font-bold">C$ 0.00</span>
                              )}
                            </td>

                            <td className="p-4 text-center">
                              {hasSales ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>POR LIQUIDAR</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-[#747780]">
                                  SIN VENTAS
                                </span>
                              )}
                            </td>

                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedSeller(l)}
                                  className="btn-precision-outline text-[11px] py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                                  title="Ver detalle del cálculo y contratos"
                                >
                                  <FileText className="w-3 h-3 text-[#1A73E8]" />
                                  <span>Detalle</span>
                                </button>

                                <button
                                  onClick={() => handleOpenSimulatorForUser(l)}
                                  className="p-1 rounded-lg border border-[#E5E8EE] text-[#747780] hover:text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors cursor-pointer"
                                  title="Simular en la calculadora"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FAFBFD] border-t-2 border-[#E5E8EE] font-bold text-xs text-[#1B1D22]">
                        <td className="p-4 font-black">TOTALES DEL EQUIPO</td>
                        <td className="p-4 text-center font-black">
                          {liquidaciones.reduce((acc, l) => acc + l.cotizacionesAprobadas, 0)} cotiz. /{' '}
                          {resumen?.totalContratos || 0} contratos
                        </td>
                        <td className="p-4 text-right font-mono font-black text-sm text-[#1A73E8]">
                          {formatCurrency(resumen?.totalVendidoEquipo || 0)}
                        </td>
                        <td className="p-4 text-center text-[10px] text-[#747780] font-bold">
                          Media: {resumen?.tasaEfectivaPromedio || 0}%
                        </td>
                        <td className="p-4 text-right font-mono font-black text-sm text-emerald-700">
                          {formatCurrency(resumen?.totalComisionesEquipo || 0)}
                        </td>
                        <td colSpan={2} className="p-4 text-center text-[10px] text-[#747780]">
                          Liquidación lista para corte administrativo
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: REGLAS Y ESCALAS DE COMISIÓN */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#E5E8EE] rounded-3xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#E5E8EE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-[#1A73E8]" />
                    <div>
                      <h3 className="font-black text-[#1B1D22] text-sm">
                        Tramos y Escalas Configuradas en Base de Datos
                      </h3>
                      <p className="text-[11px] text-[#747780]">
                        Parámetros que rigen el cálculo porcentual según los rangos de venta alcanzados.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[#747780]">Filtrar:</label>
                      <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="precision-input text-xs font-bold py-1 px-2.5 bg-white"
                      >
                        <option value="ALL">Todas ({rules.length})</option>
                        <option value="GLOBAL">Universales / Globales</option>
                        {salesUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} {u.apellido}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleSeedDefaults}
                      className="btn-precision-outline text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                      title="Restablecer escalas por defecto"
                    >
                      <RotateCcw className="w-3 h-3 text-[#1A73E8]" />
                      <span>Restablecer</span>
                    </button>
                  </div>
                </div>

                {/* VISTA MÓVIL (< md): TARJETAS DE ESCALAS */}
                <div className="md:hidden space-y-3 p-3 bg-[#FAFBFD]">
                  {filteredRules.map((rule) => {
                    const vendedor = users.find((u) => u.id === rule.usuarioId);
                    const displayName = vendedor
                      ? `${vendedor.nombre} ${vendedor.apellido}`
                      : rule.nombreVendedor
                      ? rule.nombreVendedor
                      : 'Universal (Aplica a Todos)';

                    return (
                      <div
                        key={rule.id}
                        className="bg-white rounded-2xl border border-[#E5E8EE] p-3.5 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                !rule.usuarioId
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-[#E8F0FE] text-[#1A73E8]'
                              }`}
                            >
                              {displayName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-[#1B1D22] block">{displayName}</span>
                              <span className="text-[10px] text-[#747780]">
                                {rule.usuarioId ? 'Escala por Asesor' : 'Escala Universal'}
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono shrink-0">
                            {rule.porcentaje}%
                          </span>
                        </div>

                        <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E5E8EE] text-xs font-mono">
                          <span className="text-[9px] uppercase font-bold text-[#747780] block font-sans">
                            Rango de Ventas Comisionable
                          </span>
                          <span className="font-bold text-[#1B1D22]">
                            {formatCurrency(rule.desdeMonto)} -{' '}
                            {rule.hastaMonto ? (
                              formatCurrency(rule.hastaMonto)
                            ) : (
                              <span className="text-emerald-700 font-bold">En adelante (Sin Límite)</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#E5E8EE]">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ACTIVO
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(rule)}
                              className="py-1 px-3 rounded-lg border border-[#E5E8EE] text-xs font-bold text-[#37474F] hover:bg-[#E8F0FE] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-[#1A73E8]" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="py-1 px-3 rounded-lg border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredRules.length === 0 && (
                    <div className="p-8 text-center text-[#747780] bg-white rounded-2xl border border-[#E5E8EE]">
                      <Percent className="w-7 h-7 mx-auto text-[#747780]/40 mb-2" />
                      <p className="text-xs font-bold">No hay reglas con este criterio.</p>
                    </div>
                  )}
                </div>

                {/* VISTA ESCRITORIO (>= md): TABLA COMPLETA */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] uppercase tracking-wider text-[10px] font-extrabold">
                        <th className="p-4">Asesor Comercial / Ámbito</th>
                        <th className="p-4">Rango de Ventas Comisionable</th>
                        <th className="p-4 text-center">% Comisión Asignado</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E8EE]">
                      {filteredRules.map((rule) => {
                        const vendedor = users.find((u) => u.id === rule.usuarioId);
                        const displayName = vendedor
                          ? `${vendedor.nombre} ${vendedor.apellido}`
                          : rule.nombreVendedor
                          ? rule.nombreVendedor
                          : 'Universal (Aplica a Todos)';

                        return (
                          <tr key={rule.id} className="hover:bg-[#F8FAFC] transition-colors font-medium">
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    !rule.usuarioId
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-[#E8F0FE] text-[#1A73E8]'
                                  }`}
                                >
                                  {displayName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-[#1B1D22] text-xs">
                                    {displayName}
                                  </div>
                                  <span className="text-[10px] text-[#747780]">
                                    {rule.usuarioId ? 'Escala por Asesor' : 'Escala Universal'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 font-mono">
                              <div className="text-xs font-bold text-[#1B1D22]">
                                {formatCurrency(rule.desdeMonto)} -{' '}
                                {rule.hastaMonto ? (
                                  formatCurrency(rule.hastaMonto)
                                ) : (
                                  <span className="text-emerald-700 font-extrabold">En adelante (Sin Límite)</span>
                                )}
                              </div>
                            </td>

                            <td className="p-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {rule.porcentaje}%
                              </span>
                            </td>

                            <td className="p-4 text-center">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ACTIVO
                              </span>
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal(rule)}
                                  className="p-1.5 rounded-lg border border-[#E5E8EE] text-[#37474F] hover:text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors cursor-pointer"
                                  title="Editar regla"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="p-1.5 rounded-lg border border-[#E5E8EE] text-[#747780] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Eliminar regla"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredRules.length === 0 && (
                    <div className="p-10 text-center text-[#747780]">
                      <Percent className="w-8 h-8 mx-auto text-[#747780]/40 mb-2" />
                      <p className="text-xs font-bold">No hay reglas registradas con este criterio.</p>
                      <button
                        onClick={handleSeedAllSellers}
                        className="mt-3 text-xs font-bold text-[#1A73E8] hover:underline cursor-pointer"
                      >
                        Aplicar escala universal a todos los vendedores
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: SIMULADOR DE COMISIONES */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-5 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#1A73E8]/10 text-[#1A73E8]">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[#1B1D22] text-sm">
                      Simulador de Liquidación
                    </h3>
                    <p className="text-[11px] text-[#747780]">Calcula la comisión exacta según ventas</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                      Asesor Comercial
                    </label>
                    <select
                      value={simUsuarioId}
                      onChange={(e) => setSimUsuarioId(e.target.value)}
                      className="precision-input text-xs font-bold"
                    >
                      <option value="">Selecciona asesor...</option>
                      {salesUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} {u.apellido} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                      Monto Total de Ventas Cobradas (C$)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1000"
                        value={simMontoVentas}
                        onChange={(e) => setSimMontoVentas(Number(e.target.value))}
                        placeholder="Ej. 800000"
                        className="precision-input text-xs font-mono font-black pl-9"
                      />
                      <span className="text-xs font-black text-emerald-700 absolute left-2.5 top-2.5 select-none">
                        C$
                      </span>
                    </div>
                  </div>

                  {/* Botones rápidos de prueba */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-[#747780] font-bold">Probar:</span>
                    {[279450, 500000, 800000, 1000000, 1200000, 1500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSimMontoVentas(amt)}
                        className="px-2 py-0.5 rounded-lg bg-[#F4F6F9] border border-[#E5E8EE] text-[10px] font-mono font-bold text-[#37474F] hover:bg-[#E8F0FE] hover:text-[#1A73E8] transition-colors cursor-pointer"
                      >
                        {(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating || !simUsuarioId}
                    className="btn-precision-primary text-xs w-full py-2.5 flex items-center justify-center gap-2 mt-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                  >
                    {isSimulating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        <span>Calcular Liquidación</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Resultado del Simulador */}
              <div className="lg:col-span-2 space-y-4">
                {simResult ? (
                  <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-500 text-white">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-[#1B1D22] text-sm">
                            Resultado de la Liquidación Proyectada
                          </h4>
                          <p className="text-[11px] text-[#747780]">
                            Asesor: <strong>{users.find((u) => u.id === simUsuarioId)?.nombre} {users.find((u) => u.id === simUsuarioId)?.apellido}</strong>
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black">
                        Tasa: {simResult.porcentaje}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#F8FAFC] border border-[#E5E8EE] p-4 rounded-2xl">
                        <span className="text-[10px] font-extrabold uppercase text-[#747780] block">
                          Base de Ventas Comisionable
                        </span>
                        <div className="text-xl font-black font-mono text-[#1B1D22] mt-1">
                          {formatCurrency(simMontoVentas)}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-4 rounded-2xl text-white shadow-md">
                        <span className="text-[10px] font-extrabold uppercase text-emerald-100 block">
                          Comisión Neta a Pagar
                        </span>
                        <div className="text-2xl font-black font-mono mt-1">
                          {formatCurrency(simResult.comisionTotal)}
                        </div>
                      </div>
                    </div>

                    {/* Desglose explicativo */}
                    <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 text-xs text-[#37474F]">
                      <Info className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-[#1B1D22] block">
                          Fórmula de cálculo aplicada:
                        </span>
                        <p className="text-[11px] text-[#747780] mt-0.5">
                          {formatCurrency(simMontoVentas)} × {simResult.porcentaje}% ={' '}
                          <strong className="text-emerald-700 font-mono">
                            {formatCurrency(simResult.comisionTotal)}
                          </strong>{' '}
                          (De acuerdo a la escala universal activa para el tramo correspondiente).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center text-[#747780]">
                    <Calculator className="w-10 h-10 mx-auto text-[#747780]/40 mb-3" />
                    <h4 className="text-sm font-bold text-[#1B1D22]">Calculadora lista</h4>
                    <p className="text-xs text-[#747780] mt-1">
                      Selecciona un asesor y un monto de ventas a la izquierda para visualizar la liquidación proyectada.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Detalle de Liquidación de Asesor */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#E5E8EE] flex justify-between items-center bg-[#F8FAFC] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-[#1B1D22] text-sm sm:text-base">
                    Detalle de Liquidación Comercial
                  </h3>
                  <p className="text-[11px] text-[#747780]">{selectedSeller.nombre}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSeller(null)}
                className="p-1 text-[#747780] hover:text-[#1B1D22] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F4F6F9] rounded-2xl border border-[#E5E8EE]">
                  <span className="text-[10px] font-extrabold uppercase text-[#747780] block">
                    Cotizaciones Ganadas
                  </span>
                  <div className="text-base font-black text-[#1B1D22] mt-0.5">
                    {selectedSeller.cotizacionesAprobadas} de {selectedSeller.totalCotizaciones}
                  </div>
                </div>

                <div className="p-3 bg-[#F4F6F9] rounded-2xl border border-[#E5E8EE]">
                  <span className="text-[10px] font-extrabold uppercase text-[#747780] block">
                    Contratos Generados
                  </span>
                  <div className="text-base font-black text-[#1B1D22] mt-0.5">
                    {selectedSeller.contratosGenerados} Contratos
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl shadow-sm">
                <span className="text-[10px] font-extrabold uppercase text-emerald-100 block">
                  Comisión Total Ganada
                </span>
                <div className="text-2xl font-black font-mono mt-1">
                  {formatCurrency(selectedSeller.comisionTotal)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-100 mt-2 pt-2 border-t border-emerald-400/30">
                  <span>Base ventas: {formatCurrency(selectedSeller.totalVendido)}</span>
                  <span className="font-bold">Tasa: {selectedSeller.porcentajeAplicado}%</span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs">
                <span className="font-extrabold text-[#1B1D22] block">Tramo Asignado:</span>
                <span className="text-[#747780] mt-0.5 block">{selectedSeller.tramoAplicado}</span>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  Estado: {selectedSeller.estado}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-[#E5E8EE] flex justify-end gap-2 bg-[#F8FAFC]">
              <button
                onClick={() => {
                  const s = selectedSeller;
                  setSelectedSeller(null);
                  handleOpenSimulatorForUser(s);
                }}
                className="btn-precision-outline text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#1A73E8]" />
                <span>Simular con este Asesor</span>
              </button>
              <button
                onClick={() => setSelectedSeller(null)}
                className="btn-precision-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Regla */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#E5E8EE] flex justify-between items-center bg-[#F4F6F9] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#1B1D22] text-sm sm:text-base">
                    {editingRule ? 'Editar Escala de Comisión' : 'Nueva Escala de Comisión'}
                  </h3>
                  <p className="text-[11px] text-[#747780]">Define el rango de ventas y el porcentaje asignado</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#747780] hover:text-[#1B1D22] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Asesor Comercial
                </label>
                <select
                  value={formData.usuarioId}
                  onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                  className="precision-input text-xs font-bold"
                >
                  <option value="">Universal (Aplica a todos los vendedores)</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#747780] mt-1">
                  Deja en "Universal" si la escala debe aplicar para cualquier asesor sin esquema individual.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                    Ventas Desde (C$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.desdeMonto}
                    onChange={(e) => setFormData({ ...formData, desdeMonto: Number(e.target.value) })}
                    className="precision-input text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                    Ventas Hasta (C$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.hastaMonto}
                    onChange={(e) => setFormData({ ...formData, hastaMonto: e.target.value })}
                    placeholder="Sin límite"
                    className="precision-input text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Porcentaje de Comisión (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.porcentaje}
                    onChange={(e) => setFormData({ ...formData, porcentaje: Number(e.target.value) })}
                    className="precision-input text-xs font-mono font-black pr-8"
                    required
                  />
                  <Percent className="w-4 h-4 text-[#747780] absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E8EE] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-precision-outline text-xs py-2 px-4 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-precision-primary text-xs py-2 px-5 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 cursor-pointer"
                >
                  {editingRule ? 'Guardar Cambios' : 'Crear Escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
