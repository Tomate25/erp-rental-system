import React, { useState, useEffect } from 'react';
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
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  getCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  seedDefaultCommissionRules,
  calculateCommission,
} from '../services/commissions.api';
import type { ReglaComision, ResultadoComision } from '../services/commissions.api';
import { getUsers } from '../../security/services/security.api';
import type { UserDetail } from '../../security/types/security.types';
import { formatCurrency } from '../../../shared/utils/formatters';

export const CommissionsPage: React.FC = () => {
  const [rules, setRules] = useState<ReglaComision[]>([]);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Crear / Editar
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
    porcentaje: 2,
  });

  // Simulador / Liquidador
  const [simUsuarioId, setSimUsuarioId] = useState('');
  const [simMontoVentas, setSimMontoVentas] = useState<number>(850000);
  const [simResult, setSimResult] = useState<ResultadoComision | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Filtro
  const [filterUser, setFilterUser] = useState<string>('ALL');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rulesRes, usersRes] = await Promise.all([
        getCommissionRules(),
        getUsers(),
      ]);
      setRules(rulesRes);
      setUsers(usersRes);

      // Si hay vendedores, preseleccionar uno para el simulador
      const salespeople = usersRes.filter((u) =>
        u.roles?.some((r) => r.nombre === 'COMERCIAL' || r.nombre === 'ADMIN')
      );
      if (salespeople.length > 0 && !simUsuarioId) {
        setSimUsuarioId(salespeople[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar las reglas de comisión');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedDefaults = async () => {
    if (!confirm('¿Deseas asegurar y restaurar las escalas predeterminadas de David y Nylska?')) return;
    setIsLoading(true);
    try {
      await seedDefaultCommissionRules();
      setSuccessMsg('Escalas predeterminadas de David y Nylska aseguradas con éxito.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al sembrar escalas por defecto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setFormData({
      usuarioId: '',
      desdeMonto: 0,
      hastaMonto: '',
      porcentaje: 2,
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
        setSuccessMsg('Regla de comisión actualizada correctamente');
      } else {
        await createCommissionRule(payload);
        setSuccessMsg('Regla de comisión creada correctamente');
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
    if (!simUsuarioId || !simMontoVentas) return;
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

  // Vendedores disponibles (roles Comercial o Admin)
  const salesUsers = users.filter((u) =>
    u.roles?.some((r) => r.nombre === 'COMERCIAL' || r.nombre === 'ADMIN')
  );

  const filteredRules = rules.filter((r) => {
    if (filterUser === 'ALL') return true;
    if (filterUser === 'GLOBAL') return !r.usuarioId;
    return r.usuarioId === filterUser;
  });

  return (
    <div className="animate-fadeIn max-w-7xl mx-auto w-full pb-16 font-sans space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E8EE] pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#1B1D22] tracking-tight">
                Escalas de Comisión Comercial
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black tracking-wider uppercase border border-red-200">
                ADMIN EXCLUSIVO
              </span>
            </div>
            <p className="text-xs text-[#747780] font-medium mt-0.5">
              Configuración de porcentajes de comisión por vendedor según metas de colocación y simulación de liquidación.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeedDefaults}
            className="btn-precision-outline text-xs py-2 px-3.5 flex items-center gap-2"
            title="Cargar escalas predeterminadas de David y Nylska según directriz"
          >
            <RotateCcw className="w-4 h-4 text-[#1A73E8]" />
            <span>Asegurar Escalas por Defecto</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="btn-precision-primary text-xs py-2 px-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Escala</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
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

      {/* Banner Informativo de Reglas Activas */}
      <div className="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 p-5 rounded-3xl border border-[#E5E8EE] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#1A73E8]/10 text-[#1A73E8] shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[#1B1D22] uppercase tracking-wider">
              Esquemas de Comisión Parametrizados
            </h4>
            <p className="text-xs text-[#747780] font-medium mt-0.5 max-w-2xl leading-relaxed">
              • <strong>David:</strong> 1 a C$ 800,000 (3%) · C$ 800,001 a C$ 1,200,000 (2%) · Más de C$ 1,200,000 (1%)<br />
              • <strong>Nylska:</strong> 1 a C$ 300,000 (2%) · Más de C$ 300,001 (1%)<br />
              • <strong>Escala General:</strong> Se aplica si el vendedor no posee una escala personalizada asignada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#747780]">Filtrar por:</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="precision-input text-xs font-bold py-1.5 px-3 bg-white"
          >
            <option value="ALL">Todas las Escalas ({rules.length})</option>
            <option value="GLOBAL">Generales / Sin Asignar</option>
            {salesUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellido}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E5E8EE]">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#747780] font-medium">Cargando escalas de comisión...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Tabla de Reglas de Comisión (2 columnas) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#E5E8EE] rounded-3xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#E5E8EE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-[#1A73E8]" />
                  <h3 className="font-extrabold text-[#1B1D22] text-sm">
                    Tramos y Porcentajes Configurados
                  </h3>
                </div>
                <span className="text-xs text-[#747780] font-medium">
                  {filteredRules.length} reglas activas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] uppercase tracking-wider text-[10px] font-extrabold">
                      <th className="p-4">Asesor Comercial</th>
                      <th className="p-4">Rango de Ventas</th>
                      <th className="p-4 text-center">% Comisión</th>
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
                        : 'Global / Todos los Vendedores';

                      return (
                        <tr key={rule.id} className="hover:bg-[#F8FAFC] transition-colors font-medium">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center font-bold text-xs">
                                {displayName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-[#1B1D22] text-xs">
                                  {displayName}
                                </div>
                                <span className="text-[10px] text-[#747780]">
                                  {rule.usuarioId ? 'Escala Personalizada' : 'Regla General'}
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
                    <p className="text-xs font-bold">No hay reglas de comisión registradas para este criterio.</p>
                    <button
                      onClick={handleSeedDefaults}
                      className="mt-3 text-xs font-bold text-[#1A73E8] hover:underline cursor-pointer"
                    >
                      Cargar escalas por defecto de David y Nylska
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Simulador y Liquidación en Vivo (1 columna) */}
          <div className="space-y-5">
            <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#1A73E8]/10 text-[#1A73E8]">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#1B1D22] text-sm">
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
                        {u.nombre} {u.apellido} ({u.roles?.map((r) => r.nombre).join(', ')})
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
                      placeholder="Ej. 850000"
                      className="precision-input text-xs font-mono font-black pl-8"
                    />
                    <DollarSign className="w-4 h-4 text-[#747780] absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Botones rápidos de prueba */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-[#747780] font-bold">Probar:</span>
                  {[300000, 800000, 1000000, 1200000, 1500000].map((amt) => (
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
                  className="btn-precision-primary text-xs w-full py-2.5 flex items-center justify-center gap-2 mt-2 cursor-pointer"
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

              {/* Resultado de la Simulación */}
              {simResult && (
                <div className="pt-4 border-t border-[#E5E8EE] space-y-4 animate-fadeIn">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-4 rounded-2xl text-white shadow-md">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 block">
                      Comisión Total Liquidada
                    </span>
                    <div className="text-2xl font-black font-mono mt-1">
                      {formatCurrency(simResult.comisionTotal)}
                    </div>
                    <span className="text-[10px] text-emerald-100 font-medium block mt-1">
                      Base ventas: {formatCurrency(simMontoVentas)}
                    </span>
                  </div>

                  {/* Desglose de tramos */}
                  {simResult.desglose && simResult.desglose.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block">
                        Desglose por Escala
                      </span>
                      <div className="space-y-1.5">
                        {simResult.desglose.map((d, i) => (
                          <div
                            key={i}
                            className="bg-[#F4F6F9] p-2.5 rounded-xl border border-[#E5E8EE] text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-[#1B1D22] text-[11px] block">
                                Tramo {d.porcentaje}%
                              </span>
                              <span className="text-[10px] text-[#747780] font-mono">
                                Base: {formatCurrency(d.montoBase)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-emerald-700 font-mono text-xs block">
                                +{formatCurrency(d.montoComision)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Regla */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-[#E5E8EE] flex justify-between items-center bg-[#F4F6F9]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#1B1D22] text-base">
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

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Asesor Comercial
                </label>
                <select
                  value={formData.usuarioId}
                  onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                  className="precision-input text-xs font-bold"
                >
                  <option value="">Global (Aplica a todos los vendedores)</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#747780] mt-1">
                  Deja en "Global" si la escala debe aplicar para cualquier asesor sin esquema individual.
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
