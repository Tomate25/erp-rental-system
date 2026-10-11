import React, { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  Users,
  Calendar,
  Calculator,
  ShieldCheck,
  FileText,
  Printer,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
  TrendingUp,
  Download,
  Building,
} from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import type {
  Empleado,
  PeriodoNomina,
  PlanillaResumen,
  PlanillaEmpleadoItem,
  ColillaData,
} from '../services/payroll.api';
import { formatCurrency } from '../../../shared/utils/formatters';

export const PayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'planilla' | 'empleados' | 'liquidaciones' | 'parametros'>('planilla');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Datos
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('');
  const [planillaActual, setPlanillaActual] = useState<PlanillaResumen | null>(null);

  // Modal Colilla
  const [colillaModalOpen, setColillaModalOpen] = useState(false);
  const [colillaData, setColillaData] = useState<ColillaData | null>(null);

  // Modal Nuevo Empleado
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({
    codigo: '',
    nombres: '',
    apellidos: '',
    cedula: '',
    numeroInss: '',
    cargo: '',
    sucursalId: '',
    areaContable: 'OPERACION' as 'OPERACION' | 'ADMINISTRACION' | 'VENTAS',
    tipoSalario: 'FIJO' as 'FIJO' | 'VARIABLE' | 'MIXTO',
    salarioMensual: 20000,
    fechaIngreso: new Date().toISOString().split('T')[0],
  });

  // Formulario Liquidación
  const [liqForm, setLiqForm] = useState({
    empleadoId: '',
    fechaBaja: new Date().toISOString().split('T')[0],
    causa: 'RENUNCIA',
    pagaIndemnizacion: true,
    diasPendientes: 15,
    diasVacacionesPendientes: 10,
    mesesAguinaldo: 10,
  });
  const [liqResultado, setLiqResultado] = useState<any | null>(null);

  // Carga inicial
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empsRes, persRes] = await Promise.all([
        payrollApi.getEmployees(),
        payrollApi.getPeriods(),
      ]);
      setEmpleados(empsRes);
      setPeriodos(persRes);

      if (persRes.length > 0 && !selectedPeriodoId) {
        setSelectedPeriodoId(persRes[0].id);
        if (persRes[0].planillas && persRes[0].planillas.length > 0) {
          setPlanillaActual(persRes[0].planillas[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Error al cargar información de nómina');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejar cambio de período seleccionado
  const handlePeriodoChange = (periodoId: string) => {
    setSelectedPeriodoId(periodoId);
    const p = periodos.find((item) => item.id === periodoId);
    if (p && p.planillas && p.planillas.length > 0) {
      setPlanillaActual(p.planillas[0]);
    } else {
      setPlanillaActual(null);
    }
  };

  // Sembrar parámetros legales
  const handleSeedDefaults = async () => {
    setLoading(true);
    setError(null);
    try {
      await payrollApi.seedDefaults();
      setSuccessMsg('Parámetros legales oficiales de Nicaragua sembrados con éxito.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al sembrar parámetros');
    } finally {
      setLoading(false);
    }
  };

  // Crear período del mes en curso si no existe
  const handleCrearPeriodoActual = async (quincena: number) => {
    setLoading(true);
    setError(null);
    try {
      const hoy = new Date();
      const anio = hoy.getFullYear();
      const mes = hoy.getMonth() + 1;
      const diaFin = quincena === 1 ? 15 : new Date(anio, mes, 0).getDate();
      const diaInicio = quincena === 1 ? 1 : 16;

      const fInicio = `${anio}-${String(mes).padStart(2, '0')}-${String(diaInicio).padStart(2, '0')}`;
      const fFin = `${anio}-${String(mes).padStart(2, '0')}-${String(diaFin).padStart(2, '0')}`;
      const fPago = fFin;

      const nuevoPeriodo = await payrollApi.createPeriod({
        anio,
        mes,
        quincena,
        fechaInicio: fInicio,
        fechaFin: fFin,
        fechaPago: fPago,
      });

      setSuccessMsg(`Período Q${quincena} ${mes}/${anio} creado.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
      setSelectedPeriodoId(nuevoPeriodo.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear período');
    } finally {
      setLoading(false);
    }
  };

  // Calcular / Recalcular planilla
  const handleCalcularPlanilla = async () => {
    if (!selectedPeriodoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.calculatePayroll({ periodoId: selectedPeriodoId });
      setPlanillaActual(res);
      setSuccessMsg('Planilla calculada exitosamente conforme a la ley nicaragüense.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al calcular la planilla');
    } finally {
      setLoading(false);
    }
  };

  // Flujo de estados
  const handleRevisar = async () => {
    if (!planillaActual) return;
    setLoading(true);
    try {
      const res = await payrollApi.reviewPayroll(planillaActual.id);
      setPlanillaActual(res);
      setSuccessMsg('Planilla marcada como REVISADA.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al revisar planilla');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async () => {
    if (!planillaActual) return;
    setLoading(true);
    try {
      const res = await payrollApi.approvePayroll(planillaActual.id);
      setPlanillaActual(res);
      setSuccessMsg('Planilla APROBADA exitosamente.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al aprobar planilla');
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async () => {
    if (!planillaActual) return;
    setLoading(true);
    try {
      const res = await payrollApi.markPaid(planillaActual.id);
      setPlanillaActual(res);
      setSuccessMsg('Planilla marcada como PAGADA.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al marcar como pagada');
    } finally {
      setLoading(false);
    }
  };

  // Ver colilla
  const handleVerColilla = async (planillaEmpId: string) => {
    setLoading(true);
    try {
      const colilla = await payrollApi.getPayslip(planillaEmpId);
      setColillaData(colilla);
      setColillaModalOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar colilla');
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo empleado
  const handleCrearEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await payrollApi.createEmployee({
        ...empForm,
        salarioMensual: Number(empForm.salarioMensual),
        sucursalId: empleados[0]?.sucursal?.id || 'suc-1',
      });
      setSuccessMsg('Empleado creado exitosamente con su expediente inicial.');
      setEmpModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  // Calcular Liquidación
  const handleCalcularLiquidacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liqForm.empleadoId) {
      setError('Seleccione un colaborador para calcular el finiquito');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.calculateSettlement({
        ...liqForm,
        pagaIndemnizacion: liqForm.causa !== 'DESPIDO_CAUSA_JUSTA',
        diasPendientes: Number(liqForm.diasPendientes),
        diasVacacionesPendientes: Number(liqForm.diasVacacionesPendientes),
        mesesAguinaldo: Number(liqForm.mesesAguinaldo),
      });
      setLiqResultado(res);
      setSuccessMsg('Liquidación final calculada exitosamente conforme a Art. 45 Ley 185.');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al calcular liquidación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
            <Banknote className="w-3.5 h-3.5" />
            Nicaragua • Código del Trabajo Ley 185 & Ley 822
          </div>
          <h1 className="text-2xl font-black text-[#1B1D22] tracking-tight">
            Nómina y Recursos Humanos
          </h1>
          <p className="text-xs text-[#747780] max-w-2xl leading-relaxed">
            Planilla quincenal automatizada, cotizaciones de Seguro Social (INSS), retenciones progresivas de IR (Art. 23 LCT), aportes INATEC, provisiones mensuales y liquidaciones laborales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E8EE] hover:bg-slate-50 text-xs font-bold text-[#37474F] flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="Cargar o actualizar tarifas oficiales de ley"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Sembrar Parámetros de Ley
          </button>

          <button
            type="button"
            onClick={() => setEmpModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E8EE] hover:bg-slate-50 text-xs font-bold text-[#1B1D22] flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#1A73E8]" />
            Nuevo Colaborador
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-[#E5E8EE] gap-2 overflow-x-auto pb-1">
        {[
          { id: 'planilla', label: 'Planilla Quincenal', icon: Calendar },
          { id: 'empleados', label: 'Expediente de Personal', icon: Users },
          { id: 'liquidaciones', label: 'Finiquito & Liquidación (Art. 45)', icon: Calculator },
          { id: 'parametros', label: 'Tarifas Legales (INSS/IR/INATEC)', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#1A73E8] text-white shadow-sm shadow-[#1A73E8]/30'
                  : 'text-[#5A5D66] hover:bg-white hover:text-[#1B1D22]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================
          PESTAÑA 1: PLANILLA QUINCENAL
      ======================================================== */}
      {activeTab === 'planilla' && (
        <div className="space-y-6">
          {/* Barra de Período y Controles */}
          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="periodo-select" className="text-xs font-bold text-[#37474F]">Período de Nómina:</label>
              <select
                id="periodo-select"
                aria-label="Seleccionar período de nómina"
                value={selectedPeriodoId}
                onChange={(e) => handlePeriodoChange(e.target.value)}
                className="bg-[#F4F6F9] border border-[#E5E8EE] text-[#1B1D22] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
              >
                {periodos.length === 0 ? (
                  <option value="">No hay períodos registrados</option>
                ) : (
                  periodos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.anio} - Mes {p.mes} (Q{p.quincena || 1}) • Pago: {p.fechaPago?.split('T')[0]}
                    </option>
                  ))
                )}
              </select>

              {periodos.length === 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCrearPeriodoActual(1)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                  >
                    Crear Período Q1 Mes Actual
                  </button>
                  <button
                    onClick={() => handleCrearPeriodoActual(2)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                  >
                    Crear Período Q2 Mes Actual
                  </button>
                </div>
              )}
            </div>

            {/* Acciones de Flujo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCalcularPlanilla}
                disabled={loading || !selectedPeriodoId}
                className="px-4 py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Calcular / Recalcular
              </button>

              {planillaActual && (
                <div className="flex items-center gap-2">
                  {planillaActual.estado === 'CALCULADA' && (
                    <button
                      type="button"
                      onClick={handleRevisar}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                    >
                      Marcar Revisada
                    </button>
                  )}

                  {(planillaActual.estado === 'REVISADA' || planillaActual.estado === 'CALCULADA') && (
                    <button
                      type="button"
                      onClick={handleAprobar}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs"
                    >
                      Aprobar Planilla
                    </button>
                  )}

                  {planillaActual.estado === 'APROBADA' && (
                    <button
                      type="button"
                      onClick={handlePagar}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                    >
                      Marcar Pagada
                    </button>
                  )}

                  <span
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                      planillaActual.estado === 'PAGADA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : planillaActual.estado === 'APROBADA'
                        ? 'bg-blue-100 text-blue-800'
                        : planillaActual.estado === 'REVISADA'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {planillaActual.estado}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tarjetas de Totales */}
          {planillaActual && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs">
                <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block mb-1">
                  Total Devengado
                </span>
                <p className="text-xl font-black text-[#1B1D22]">
                  {formatCurrency(Number(planillaActual.totalDevengado))}
                </p>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                  Salarios ordinarios + extras + comisiones
                </span>
              </div>

              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs">
                <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block mb-1">
                  Deducciones Legales
                </span>
                <p className="text-xl font-black text-rose-600">
                  {formatCurrency(Number(planillaActual.totalDeducciones))}
                </p>
                <span className="text-[10px] text-rose-500 font-bold block mt-1">
                  INSS laboral (7%) + Retención IR Art. 23
                </span>
              </div>

              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs">
                <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block mb-1">
                  Neto a Pagar
                </span>
                <p className="text-xl font-black text-[#1A73E8]">
                  {formatCurrency(Number(planillaActual.totalNeto))}
                </p>
                <span className="text-[10px] text-[#1A73E8] font-bold block mt-1">
                  Monto a transferir a colaboradores
                </span>
              </div>

              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs">
                <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block mb-1">
                  Aporte Patronal Empresa
                </span>
                <p className="text-xl font-black text-[#C55500]">
                  {formatCurrency(Number(planillaActual.totalPatronal))}
                </p>
                <span className="text-[10px] text-[#C55500] font-bold block mt-1">
                  INSS Patronal (21.5%) + INATEC (2%)
                </span>
              </div>
            </div>
          )}

          {/* Tabla de Empleados en Planilla */}
          <div className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#E5E8EE] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-[#1B1D22]">Nómina de Colaboradores</h2>
                <p className="text-xs text-[#747780]">Cálculo quincenal individual con desglose de retenciones</p>
              </div>
              <span className="text-xs font-bold text-[#37474F] bg-[#F4F6F9] px-3 py-1 rounded-xl">
                {planillaActual?.empleados?.length || empleados.length} Colaboradores
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E8EE] bg-[#F4F6F9] text-[11px] font-black text-[#5A5D66] uppercase tracking-wider">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Cédula / INSS</th>
                    <th className="py-3 px-4 text-right">Salario Mensual</th>
                    <th className="py-3 px-4 text-right">Devengado</th>
                    <th className="py-3 px-4 text-right">INSS Lab. (7%)</th>
                    <th className="py-3 px-4 text-right">IR Art. 23</th>
                    <th className="py-3 px-4 text-right">Neto a Pagar</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE] text-xs">
                  {planillaActual?.empleados && planillaActual.empleados.length > 0 ? (
                    planillaActual.empleados.map((item) => {
                      const inssLine = item.lineas.find((l) => l.concepto?.codigo === 'INSS_L');
                      const irLine = item.lineas.find((l) => l.concepto?.codigo === 'IR');

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-[#1B1D22]">
                            {item.empleado?.nombres} {item.empleado?.apellidos}
                            <span className="block text-[11px] text-[#747780] font-normal">
                              {item.empleado?.cargo} • {item.areaContable}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#5A5D66]">
                            {item.empleado?.cedula}
                            <span className="block text-[10px] text-[#747780]">
                              INSS: {item.empleado?.numeroInss}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#37474F]">
                            {formatCurrency(Number(item.salarioMensual))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                            {formatCurrency(Number(item.totalDevengado))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                            {formatCurrency(inssLine ? Number(inssLine.monto) : 0)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                            {formatCurrency(irLine ? Number(irLine.monto) : 0)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-[#1A73E8]">
                            {formatCurrency(Number(item.netoPagar))}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleVerColilla(item.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#1A73E8] hover:text-white text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Colilla
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    empleados.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-[#1B1D22]">
                          {emp.nombres} {emp.apellidos}
                          <span className="block text-[11px] text-[#747780] font-normal">
                            {emp.cargo} • {emp.areaContable}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#5A5D66]">
                          {emp.cedula}
                          <span className="block text-[10px] text-[#747780]">INSS: {emp.numeroInss}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#37474F]">
                          {formatCurrency(Number(emp.salarioMensual))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          {formatCurrency(Number(emp.salarioMensual) / 2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                          {formatCurrency((Number(emp.salarioMensual) / 2) * 0.07)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#747780] italic">
                          Pendiente de cálculo
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#1A73E8]">
                          {formatCurrency((Number(emp.salarioMensual) / 2) * 0.93)}
                        </td>
                        <td className="py-3.5 px-4 text-center text-[#747780]">
                          Calcular para ver colilla
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: EXPEDIENTE DE EMPLEADOS
      ======================================================== */}
      {activeTab === 'empleados' && (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#E5E8EE] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#1B1D22]">Directorio de Colaboradores</h2>
              <p className="text-xs text-[#747780]">Historial salarial, afiliación INSS y centros de costo</p>
            </div>
            <button
              onClick={() => setEmpModalOpen(true)}
              className="btn-precision-primary text-xs py-2 px-3.5 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nuevo Colaborador
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E8EE] bg-[#F4F6F9] text-[11px] font-black text-[#5A5D66] uppercase tracking-wider">
                  <th className="py-3 px-4">Código / Nombre</th>
                  <th className="py-3 px-4">Cédula Oficial</th>
                  <th className="py-3 px-4">Nº INSS</th>
                  <th className="py-3 px-4">Cargo & Área</th>
                  <th className="py-3 px-4">Salario Mensual</th>
                  <th className="py-3 px-4">Régimen IR</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE] text-xs">
                {empleados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-[#1B1D22]">
                      <span className="font-mono text-[#1A73E8] mr-2">[{emp.codigo}]</span>
                      {emp.nombres} {emp.apellidos}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#37474F]">{emp.cedula}</td>
                    <td className="py-3.5 px-4 font-mono text-[#37474F]">{emp.numeroInss}</td>
                    <td className="py-3.5 px-4 text-[#5A5D66]">
                      {emp.cargo} <span className="text-[10px] text-[#747780]">({emp.areaContable})</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1B1D22]">
                      {formatCurrency(Number(emp.salarioMensual))}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#37474F] font-bold text-[10px]">
                        {emp.metodoIr}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {emp.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: LIQUIDACIONES (ART. 45)
      ======================================================== */}
      {activeTab === 'liquidaciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-black text-[#1B1D22]">Cálculo de Finiquito y Liquidación</h2>
              <p className="text-xs text-[#747780]">
                Indemnización por antigüedad (Art. 45 Ley 185), vacaciones acumuladas y décimo tercer mes proporcional
              </p>
            </div>

            <form onSubmit={handleCalcularLiquidacion} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#37474F] block mb-1">Colaborador:</label>
                <select
                  value={liqForm.empleadoId}
                  onChange={(e) => setLiqForm({ ...liqForm, empleadoId: e.target.value })}
                  className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-[#1B1D22] text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-[#1A73E8]"
                  required
                >
                  <option value="">Seleccione colaborador...</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombres} {e.apellidos} (Salario: {formatCurrency(Number(e.salarioMensual))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Fecha de Baja:</label>
                  <input
                    type="date"
                    value={liqForm.fechaBaja}
                    onChange={(e) => setLiqForm({ ...liqForm, fechaBaja: e.target.value })}
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Causa de Terminación:</label>
                  <select
                    value={liqForm.causa}
                    onChange={(e) => setLiqForm({ ...liqForm, causa: e.target.value })}
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                  >
                    <option value="RENUNCIA">Renuncia Voluntaria</option>
                    <option value="DESPIDO_SIN_CAUSA">Despido Sin Causa Justificada</option>
                    <option value="DESPIDO_CAUSA_JUSTA">Despido Con Causa Justa (Sin Art. 45)</option>
                    <option value="MUTUO_ACUERDO">Mutuo Acuerdo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Días Salario Pend.:</label>
                  <input
                    type="number"
                    value={liqForm.diasPendientes}
                    onChange={(e) => setLiqForm({ ...liqForm, diasPendientes: Number(e.target.value) })}
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    min={0}
                    max={30}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Días Vacaciones:</label>
                  <input
                    type="number"
                    value={liqForm.diasVacacionesPendientes}
                    onChange={(e) => setLiqForm({ ...liqForm, diasVacacionesPendientes: Number(e.target.value) })}
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    min={0}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Meses Aguinaldo:</label>
                  <input
                    type="number"
                    value={liqForm.mesesAguinaldo}
                    onChange={(e) => setLiqForm({ ...liqForm, mesesAguinaldo: Number(e.target.value) })}
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    min={0}
                    max={12}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-precision-primary text-xs py-2.5 cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <Calculator className="w-4 h-4" />
                Calcular y Registrar Finiquito
              </button>
            </form>
          </div>

          {/* Resultado de la Liquidación */}
          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-black text-[#1B1D22] mb-1">Desglose de Liquidación Final</h2>
              <p className="text-xs text-[#747780] mb-4">
                Valores calculados respetando la exención legal del Décimo Tercer Mes e Indemnización
              </p>

              {liqResultado ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#F4F6F9] space-y-2 text-xs">
                    <div className="flex justify-between text-[#37474F]">
                      <span>Salario Pendiente:</span>
                      <span className="font-bold">{formatCurrency(Number(liqResultado.montoSalarioPendiente))}</span>
                    </div>
                    <div className="flex justify-between text-[#37474F]">
                      <span>Vacaciones Proporcionales:</span>
                      <span className="font-bold">{formatCurrency(Number(liqResultado.montoVacaciones))}</span>
                    </div>
                    <div className="flex justify-between text-[#37474F]">
                      <span>Décimo Tercer Mes (Exento):</span>
                      <span className="font-bold">{formatCurrency(Number(liqResultado.montoAguinaldo))}</span>
                    </div>
                    <div className="flex justify-between text-[#37474F]">
                      <span>Indemnización Art. 45 ({Number(liqResultado.antiguedadAnios).toFixed(2)} años):</span>
                      <span className="font-bold">{formatCurrency(Number(liqResultado.montoIndemnizacion))}</span>
                    </div>
                    <div className="border-t border-[#E5E8EE] pt-2 flex justify-between font-bold text-emerald-700">
                      <span>Total Devengado Prestaciones:</span>
                      <span>{formatCurrency(Number(liqResultado.montoTotalDevengado))}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 space-y-2 text-xs text-rose-900 border border-rose-200">
                    <div className="flex justify-between">
                      <span>Retención INSS Laboral (Salario + Vac.):</span>
                      <span className="font-bold">{formatCurrency(Number(liqResultado.deduccionInss))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retención IR Salarial:</span>
                      <span className="font-bold">{formatCurrency(Number(liqResultado.deduccionIr))}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Neto a Pagar Finiquito</span>
                      <span className="text-xl font-black text-[#1A73E8]">
                        {formatCurrency(Number(liqResultado.montoNetoPagar))}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold">
                      Listo para Firma
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-[#747780] text-xs">
                  <Calculator className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  Seleccione un colaborador y complete los datos para ver la simulación de prestaciones.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 4: PARÁMETROS LEGALES
      ======================================================== */}
      {activeTab === 'parametros' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                7%
              </div>
              <div>
                <h2 className="text-sm font-black text-[#1B1D22]">Seguridad Social (INSS) & INATEC</h2>
                <p className="text-xs text-[#747780]">Decreto 06-2019 / Ley Orgánica INATEC</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-[#F4F6F9]">
                <span className="font-bold text-[#37474F]">INSS Laboral (Deducción al trabajador):</span>
                <span className="font-black text-rose-600">7.00%</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-[#F4F6F9]">
                <span className="font-bold text-[#37474F]">INSS Patronal (Empleador &lt; 50 trab.):</span>
                <span className="font-black text-[#C55500]">21.50%</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-[#F4F6F9]">
                <span className="font-bold text-[#37474F]">Aporte INATEC (A cargo del empleador):</span>
                <span className="font-black text-[#C55500]">2.00%</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-[#F4F6F9]">
                <span className="font-bold text-[#37474F]">Techo Salarial Máximo Cotizable:</span>
                <span className="font-bold text-emerald-700">Sin Techo (Reforma 2019)</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                IR
              </div>
              <div>
                <h2 className="text-sm font-black text-[#1B1D22]">Tarifa Progresiva de IR (Art. 23 Ley 822)</h2>
                <p className="text-xs text-[#747780]">Rentas del Trabajo anualizadas con deducción del INSS</p>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E8EE] text-[10px] text-[#747780] font-black uppercase">
                    <th className="py-2">Estrato Anual (C$)</th>
                    <th className="py-2 text-right">Impuesto Base</th>
                    <th className="py-2 text-right">Tasa Exceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE]">
                  <tr>
                    <td className="py-2 text-[#37474F]">Hasta 100,000.00</td>
                    <td className="py-2 text-right font-mono">0.00</td>
                    <td className="py-2 text-right font-bold text-emerald-600">0% (Exento)</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#37474F]">100,000.01 a 200,000.00</td>
                    <td className="py-2 text-right font-mono">0.00</td>
                    <td className="py-2 text-right font-bold text-[#1A73E8]">15%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#37474F]">200,000.01 a 350,000.00</td>
                    <td className="py-2 text-right font-mono">15,000.00</td>
                    <td className="py-2 text-right font-bold text-[#1A73E8]">20%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#37474F]">350,000.01 a 500,000.00</td>
                    <td className="py-2 text-right font-mono">45,000.00</td>
                    <td className="py-2 text-right font-bold text-[#1A73E8]">25%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#37474F]">Más de 500,000.00</td>
                    <td className="py-2 text-right font-mono">82,500.00</td>
                    <td className="py-2 text-right font-bold text-[#1A73E8]">30%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE COLILLA DE PAGO (IMPRIMIBLE)
      ======================================================== */}
      {colillaModalOpen && colillaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Membrete Imprimible */}
            <div className="border-b border-[#E5E8EE] pb-4 flex justify-between items-start">
              <div>
                <span className="text-xs font-black tracking-widest text-[#1A73E8] uppercase block">
                  BM CONSTRUCCIONES S.A.
                </span>
                <h3 className="text-lg font-black text-[#1B1D22]">Comprobante de Pago de Nómina</h3>
                <p className="text-xs text-[#747780]">
                  Período: {colillaData.periodo.anio} - Mes {colillaData.periodo.mes} (Quincena {colillaData.periodo.quincena || 1})
                </p>
              </div>

              <div className="text-right text-xs text-[#5A5D66]">
                <p className="font-bold">Fecha de Pago:</p>
                <p className="font-mono">{colillaData.periodo.fechaPago?.split('T')[0]}</p>
              </div>
            </div>

            {/* Datos del Colaborador */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-[#F4F6F9] p-4 rounded-2xl">
              <div>
                <p className="text-[#747780]">Colaborador:</p>
                <p className="font-bold text-[#1B1D22]">{colillaData.empleado.nombreCompleto}</p>
                <p className="text-[#5A5D66]">{colillaData.empleado.cargo}</p>
              </div>
              <div className="text-right">
                <p className="text-[#747780]">Cédula: <span className="font-mono text-[#1B1D22] font-bold">{colillaData.empleado.cedula}</span></p>
                <p className="text-[#747780]">Nº INSS: <span className="font-mono text-[#1B1D22] font-bold">{colillaData.empleado.numeroInss}</span></p>
                <p className="text-[#747780]">Sucursal: <span className="font-bold text-[#37474F]">{colillaData.empleado.sucursal}</span></p>
              </div>
            </div>

            {/* Tablas de Devengos y Deducciones */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-1 mb-2">Ingresos / Devengos</h4>
                <div className="space-y-1.5">
                  {colillaData.devengos.map((d, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-[#37474F]">{d.nombre}</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(d.monto)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#E5E8EE] pt-1.5 flex justify-between font-black text-emerald-800">
                    <span>Total Ingresos:</span>
                    <span>{formatCurrency(colillaData.totales.totalDevengado)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-rose-800 border-b border-rose-200 pb-1 mb-2">Deducciones de Ley</h4>
                <div className="space-y-1.5">
                  {colillaData.deducciones.map((ded, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-[#37474F]">{ded.nombre}</span>
                      <span className="font-bold text-rose-600">{formatCurrency(ded.monto)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#E5E8EE] pt-1.5 flex justify-between font-black text-rose-800">
                    <span>Total Deducciones:</span>
                    <span>{formatCurrency(colillaData.totales.totalDeducciones)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Neto y Firma */}
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Neto Pagado al Colaborador</span>
                <span className="text-2xl font-black text-[#1A73E8]">
                  {formatCurrency(colillaData.totales.netoPagar)}
                </span>
              </div>
              <div className="text-right text-[11px] text-indigo-900">
                <span className="font-bold block">Aporte Patronal (INSS 21.5% + INATEC 2%):</span>
                <span className="font-mono font-bold">{formatCurrency(colillaData.totales.costoPatronal)}</span>
              </div>
            </div>

            {/* Firma */}
            <div className="border-t border-[#E5E8EE] pt-8 flex justify-between items-center text-xs text-[#747780]">
              <div className="text-center w-48">
                <div className="border-b border-[#37474F] pb-1 mb-1"></div>
                <span>Firma del Empleado</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E5E8EE] hover:bg-slate-50 text-xs font-bold text-[#1B1D22] flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-[#1A73E8]" />
                  Imprimir Comprobante
                </button>
                <button
                  type="button"
                  onClick={() => setColillaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A73E8] text-white text-xs font-bold hover:bg-[#1557b0] cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL NUEVO EMPLEADO
      ======================================================== */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="border-b border-[#E5E8EE] pb-3">
              <h3 className="text-base font-black text-[#1B1D22]">Registrar Nuevo Colaborador</h3>
              <p className="text-xs text-[#747780]">Afiliación a nómina, centro contable y salario mensual</p>
            </div>

            <form onSubmit={handleCrearEmpleado} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Código:</label>
                  <input
                    type="text"
                    value={empForm.codigo}
                    onChange={(e) => setEmpForm({ ...empForm, codigo: e.target.value })}
                    placeholder="EMP-001"
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Área Contable:</label>
                  <select
                    value={empForm.areaContable}
                    onChange={(e) => setEmpForm({ ...empForm, areaContable: e.target.value as any })}
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                  >
                    <option value="OPERACION">Operaciones / Taller</option>
                    <option value="ADMINISTRACION">Administración General</option>
                    <option value="VENTAS">Ventas Comerciales</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Nombres:</label>
                  <input
                    type="text"
                    value={empForm.nombres}
                    onChange={(e) => setEmpForm({ ...empForm, nombres: e.target.value })}
                    placeholder="Juan"
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Apellidos:</label>
                  <input
                    type="text"
                    value={empForm.apellidos}
                    onChange={(e) => setEmpForm({ ...empForm, apellidos: e.target.value })}
                    placeholder="Pérez"
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Cédula Oficial:</label>
                  <input
                    type="text"
                    value={empForm.cedula}
                    onChange={(e) => setEmpForm({ ...empForm, cedula: e.target.value })}
                    placeholder="001-010190-0001A"
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Nº INSS:</label>
                  <input
                    type="text"
                    value={empForm.numeroInss}
                    onChange={(e) => setEmpForm({ ...empForm, numeroInss: e.target.value })}
                    placeholder="1234567-8"
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Cargo:</label>
                  <input
                    type="text"
                    value={empForm.cargo}
                    onChange={(e) => setEmpForm({ ...empForm, cargo: e.target.value })}
                    placeholder="Mecánico / Asesor"
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#37474F] block mb-1">Salario Mensual (C$):</label>
                  <input
                    type="number"
                    value={empForm.salarioMensual}
                    onChange={(e) => setEmpForm({ ...empForm, salarioMensual: Number(e.target.value) })}
                    className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    required
                    min={5000}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E8EE]">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-[#5A5D66] text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-precision-primary text-xs py-2 px-5 cursor-pointer"
                >
                  Guardar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
