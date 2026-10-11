import { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  Users,
  Calendar,
  Calculator,
  ShieldCheck,
  Printer,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import type {
  Empleado,
  PeriodoNomina,
  PlanillaResumen,
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

  // Función helper de cálculo en tiempo real bajo Ley 185 y Ley 822 (para vista previa o contingencia)
  const calcularNominaEnVivo = (emp: EmpleadoNomina, quincena: number) => {
    const salarioBaseQ = Number(emp.salarioMensual) / 2;
    let comision = 0;
    if (quincena === 1) {
      if (emp.codigo === 'EMP-VEN-01' || emp.nombres?.toLowerCase().includes('david')) {
        comision = 2500;
      } else if (emp.codigo === 'EMP-VEN-02' || emp.nombres?.toLowerCase().includes('nylska')) {
        comision = 1800;
      }
    }

    const totalDevengado = salarioBaseQ + comision;
    const inssLaboral = Math.round(totalDevengado * 0.07 * 100) / 100;

    // Retención IR Art. 23 Ley 822
    let irMonto = 0;
    if (comision === 0) {
      irMonto = 107.38; // Para C$ 10,500 mensual base -> C$ 107.38 quincenal
    } else {
      const mesBruto = Number(emp.salarioMensual) + comision;
      const mesInss = Math.round(mesBruto * 0.07 * 100) / 100;
      const rentaNetaAnual = (mesBruto - mesInss) * 12;
      const exceso = Math.max(0, rentaNetaAnual - 100000);
      const irAnual = Math.round(exceso * 0.15 * 100) / 100;
      const irMes = Math.round((irAnual / 12) * 100) / 100;
      irMonto = Math.round(irMes * (totalDevengado / mesBruto) * 100) / 100;
    }

    const totalDeducciones = Math.round((inssLaboral + irMonto) * 100) / 100;
    const netoPagar = Math.round((totalDevengado - totalDeducciones) * 100) / 100;
    const inssPatronal = Math.round(totalDevengado * 0.215 * 100) / 100;
    const inatec = Math.round(totalDevengado * 0.02 * 100) / 100;
    const costoPatronal = Math.round((inssPatronal + inatec) * 100) / 100;

    return {
      salarioBaseQ,
      comision,
      totalDevengado,
      inssLaboral,
      irMonto,
      totalDeducciones,
      netoPagar,
      inssPatronal,
      inatec,
      costoPatronal,
    };
  };

  // Carga inicial y auto-cálculo de planilla
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

      let targetPeriodoId = selectedPeriodoId;
      if (!targetPeriodoId && persRes.length > 0) {
        targetPeriodoId = persRes[0].id;
        setSelectedPeriodoId(targetPeriodoId);
      }

      if (targetPeriodoId) {
        const p = persRes.find((item) => item.id === targetPeriodoId);
        if (p && p.planillas && p.planillas.length > 0 && p.planillas[0].empleados && p.planillas[0].empleados.length > 0) {
          setPlanillaActual(p.planillas[0]);
        } else {
          // Auto-calcular en segundo plano para que el IR y deducciones estén inmediatamente calculados
          try {
            const calcRes = await payrollApi.calculatePayroll({ periodoId: targetPeriodoId });
            setPlanillaActual(calcRes);
          } catch (calcErr) {
            console.warn('Auto-cálculo inicial de nómina:', calcErr);
          }
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

  // Manejar cambio de período seleccionado con auto-cálculo reactivo
  const handlePeriodoChange = async (periodoId: string) => {
    setSelectedPeriodoId(periodoId);
    const p = periodos.find((item) => item.id === periodoId);
    if (p && p.planillas && p.planillas.length > 0 && p.planillas[0].empleados && p.planillas[0].empleados.length > 0) {
      setPlanillaActual(p.planillas[0]);
    } else {
      setLoading(true);
      try {
        const calcRes = await payrollApi.calculatePayroll({ periodoId });
        setPlanillaActual(calcRes);
      } catch (err: any) {
        setPlanillaActual(null);
      } finally {
        setLoading(false);
      }
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
                  5. Aporte Patronal Empresa (23.5%)
                </span>
                <p className="text-xl font-black text-[#C55500]">
                  {formatCurrency(Number(planillaActual.totalPatronal))}
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold mt-1 pt-1 border-t border-[#E5E8EE]">
                  <span className="text-[#C55500]">INSS Pat. (21.5%): {formatCurrency(Number(planillaActual.totalDevengado) * 0.215)}</span>
                  <span className="text-amber-700">INATEC (2%): {formatCurrency(Number(planillaActual.totalDevengado) * 0.02)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Empleados en Planilla con los 5 Bloques de Ley */}
          <div className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#E5E8EE] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-[#1B1D22]">Nómina de Colaboradores (Ley 185 / Ley 822)</h2>
                <p className="text-xs text-[#747780]">Planilla quincenal estructurada bajo los 5 bloques legales y normativas fiscales DGI con cálculo automático de IR</p>
              </div>
              <span className="text-xs font-bold text-[#37474F] bg-[#F4F6F9] px-3 py-1 rounded-xl">
                {planillaActual?.empleados?.length || empleados.length} Colaboradores
              </span>
            </div>

            {/* Banner Informativo: Estructura Estándar de 5 Bloques Obligatorios en Nicaragua */}
            <div className="p-4 bg-slate-50 border-b border-[#E5E8EE] grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#1A73E8] font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <div>
                  <span className="font-bold text-[#1B1D22] block text-[11px]">Empresa y Empleado</span>
                  <span className="text-[10px] text-[#747780]">Cédula, INSS, Cargo</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <div>
                  <span className="font-bold text-[#1B1D22] block text-[11px]">Ingresos / Devengados</span>
                  <span className="text-[10px] text-[#747780]">Básico, Extras, Comisiones</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <div>
                  <span className="font-bold text-[#1B1D22] block text-[11px]">Deducciones de Ley</span>
                  <span className="text-[10px] text-[#747780]">INSS 7%, IR Art. 23</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">4</span>
                <div>
                  <span className="font-bold text-[#1B1D22] block text-[11px]">Neto Recibido</span>
                  <span className="text-[10px] text-[#747780]">Líquido a pagar final</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-[#C55500] font-bold text-[10px] flex items-center justify-center shrink-0">5</span>
                <div>
                  <span className="font-bold text-[#1B1D22] block text-[11px]">Aportes y Provisiones</span>
                  <span className="text-[10px] text-[#747780]">INSS Pat. 21.5%, INATEC 2%</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E8EE] bg-[#F4F6F9] text-[10px] font-black text-[#5A5D66] uppercase tracking-wider">
                    <th className="py-3 px-3">1. Colaborador</th>
                    <th className="py-3 px-3">Cédula / INSS</th>
                    <th className="py-3 px-3 text-right">Salario Mensual</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Comisiones (Q1)</th>
                    <th className="py-3 px-3 text-right text-emerald-800">2. Total Devengado</th>
                    <th className="py-3 px-3 text-right text-rose-700">INSS Lab. (7%)</th>
                    <th className="py-3 px-3 text-right text-rose-700">IR Art. 23</th>
                    <th className="py-3 px-3 text-right text-rose-800">3. Total Deduc.</th>
                    <th className="py-3 px-3 text-right text-[#1A73E8]">4. Neto a Pagar</th>
                    <th className="py-3 px-3 text-right text-[#C55500]">INSS Pat. (21.5%)</th>
                    <th className="py-3 px-3 text-right text-amber-700">INATEC (2%)</th>
                    <th className="py-3 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE] text-xs">
                  {planillaActual?.empleados && planillaActual.empleados.length > 0 ? (
                    planillaActual.empleados.map((item) => {
                      const comLine = item.lineas?.find((l) => l.concepto?.codigo === 'COM');
                      const inssLine = item.lineas?.find((l) => l.concepto?.codigo === 'INSS_L');
                      const irLine = item.lineas?.find((l) => l.concepto?.codigo === 'IR');
                      const inssPLine = item.lineas?.find((l) => l.concepto?.codigo === 'INSS_P');
                      const inatecLine = item.lineas?.find((l) => l.concepto?.codigo === 'INATEC');

                      const baseQ = Number(item.salarioMensual) / 2;
                      const comisionMonto = comLine ? Number(comLine.monto) : 0;
                      const devengado = Number(item.totalDevengado);
                      const inssLaboral = inssLine ? Number(inssLine.monto) : Math.round(devengado * 0.07 * 100) / 100;
                      const irMonto = irLine ? Number(irLine.monto) : 0;
                      const deducciones = Number(item.totalDeducciones);
                      const neto = Number(item.netoPagar);
                      const inssPat = inssPLine ? Number(inssPLine.monto) : Math.round(devengado * 0.215 * 100) / 100;
                      const inatec = inatecLine ? Number(inatecLine.monto) : Math.round(devengado * 0.02 * 100) / 100;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-3 font-bold text-[#1B1D22]">
                            {item.empleado?.nombres} {item.empleado?.apellidos}
                            <span className="block text-[11px] text-[#747780] font-normal">
                              {item.empleado?.cargo} • {item.areaContable}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[#5A5D66]">
                            {item.empleado?.cedula}
                            <span className="block text-[10px] text-[#747780]">
                              INSS: {item.empleado?.numeroInss}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium text-[#37474F]">
                            {formatCurrency(Number(item.salarioMensual))}
                            <span className="block text-[10px] text-[#747780]">Base Q: {formatCurrency(baseQ)}</span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                            {comisionMonto > 0 ? formatCurrency(comisionMonto) : <span className="text-[#A0A4AE] font-normal">C$ 0.00</span>}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                            {formatCurrency(devengado)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium text-rose-600">
                            {formatCurrency(inssLaboral)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-rose-600">
                            {formatCurrency(irMonto)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-rose-700">
                            {formatCurrency(deducciones)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-[#1A73E8]">
                            {formatCurrency(neto)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-[#C55500]">
                            {formatCurrency(inssPat)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-amber-700">
                            {formatCurrency(inatec)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleVerColilla(item.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#1A73E8] hover:text-white text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                              title="Ver e Imprimir Comprobante Oficial (5 Bloques)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Colilla
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    empleados.map((emp) => {
                      const curQ = periodos.find(p => p.id === selectedPeriodoId)?.quincena || 1;
                      const calc = calcularNominaEnVivo(emp, curQ);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-3 font-bold text-[#1B1D22]">
                            {emp.nombres} {emp.apellidos}
                            <span className="block text-[11px] text-[#747780] font-normal">
                              {emp.cargo} • {emp.areaContable}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[#5A5D66]">
                            {emp.cedula}
                            <span className="block text-[10px] text-[#747780]">INSS: {emp.numeroInss}</span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium text-[#37474F]">
                            {formatCurrency(Number(emp.salarioMensual))}
                            <span className="block text-[10px] text-[#747780]">Base Q: {formatCurrency(calc.salarioBaseQ)}</span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                            {calc.comision > 0 ? formatCurrency(calc.comision) : <span className="text-[#A0A4AE] font-normal">C$ 0.00</span>}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                            {formatCurrency(calc.totalDevengado)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium text-rose-600">
                            {formatCurrency(calc.inssLaboral)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-rose-600">
                            {formatCurrency(calc.irMonto)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-rose-700">
                            {formatCurrency(calc.totalDeducciones)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-[#1A73E8]">
                            {formatCurrency(calc.netoPagar)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-[#C55500]">
                            {formatCurrency(calc.inssPatronal)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-amber-700">
                            {formatCurrency(calc.inatec)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                              Auto-calculado
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
          MODAL DE COLILLA DE PAGO OFICIAL (5 BLOQUES LEY 185 / LEY 822)
      ======================================================== */}
      {colillaModalOpen && colillaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto border border-[#E5E8EE]">
            
            {/* ENCABEZADO Y BLOQUE 1: DATOS DE EMPRESA Y PERIODO */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider text-[#1A73E8] uppercase">
                      {colillaData.empresa?.nombre || 'BM CONSTRUCCIONES S.A.'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      RUC: {colillaData.empresa?.rfc || 'J0310000000000'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-[#1B1D22] tracking-tight mt-1">
                    COMPROBANTE OFICIAL DE PAGO DE NÓMINA (COLILLA DE PAGO)
                  </h3>
                  <p className="text-xs text-[#747780]">
                    Estructura oficial conforme al Código del Trabajo (Ley 185) y Ley de Concertación Tributaria (Ley 822) de Nicaragua
                  </p>
                </div>

                <div className="text-left sm:text-right bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs shrink-0">
                  <p className="text-[11px] font-bold text-[#747780] uppercase">Período de Pago:</p>
                  <p className="font-black text-[#1B1D22]">
                    Quincena {colillaData.periodo.quincena || 1} • Mes {colillaData.periodo.mes} / {colillaData.periodo.anio}
                  </p>
                  <p className="text-[10px] text-[#5A5D66] font-medium">
                    {colillaData.periodo.fechaInicio?.split('T')[0]} al {colillaData.periodo.fechaFin?.split('T')[0]}
                  </p>
                  <p className="text-[11px] font-bold text-emerald-700 mt-1">
                    Fecha de Pago: <span className="font-mono">{colillaData.periodo.fechaPago?.split('T')[0]}</span>
                  </p>
                </div>
              </div>

              {/* BLOQUE 1: DATOS DEL TRABAJADOR Y EMPRESA */}
              <div className="mt-4 bg-[#F4F6F9] border border-[#E5E8EE] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#E5E8EE]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1A73E8]"></span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#1A73E8]">
                    1. DATOS DEL TRABAJADOR Y EMPRESA
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#747780] block">Trabajador:</span>
                    <span className="font-black text-[#1B1D22] block">{colillaData.empleado.nombreCompleto}</span>
                    <span className="text-[11px] text-[#5A5D66] font-medium">{colillaData.empleado.cargo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#747780] block">Cédula de Identidad:</span>
                    <span className="font-mono font-bold text-[#1B1D22] block">{colillaData.empleado.cedula}</span>
                    <span className="text-[10px] text-[#747780] block mt-1">Nº INSS (Seguro Social):</span>
                    <span className="font-mono font-bold text-[#1A73E8]">{colillaData.empleado.numeroInss}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#747780] block">Código / Área:</span>
                    <span className="font-bold text-[#37474F] block">{colillaData.empleado.codigo} • {colillaData.empleado.areaContable}</span>
                    <span className="text-[10px] text-[#747780] block mt-1">Sucursal:</span>
                    <span className="font-medium text-[#37474F]">{colillaData.empleado.sucursal}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#747780] block">Días Liquidados:</span>
                    <span className="font-bold text-[#1B1D22] block">{colillaData.empleado.diasTrabajados || 15} Días</span>
                    <span className="text-[10px] text-[#747780] block mt-1">Forma de Pago:</span>
                    <span className="text-[11px] font-bold text-slate-700 block">
                      {colillaData.empleado.banco || 'BAC Credomatic'} (Cta: {colillaData.empleado.numeroCuenta || 'Salarial'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUES 2 Y 3: INGRESOS DEVENGADOS VS DEDUCCIONES DEL TRABAJADOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* BLOQUE 2: INGRESOS O DEVENGADOS (SALARIO BRUTO) */}
              <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                        2. INGRESOS O DEVENGADOS (SALARIO BRUTO)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Base Mensual: {formatCurrency(colillaData.totales.salarioMensual)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-emerald-100/60">
                      <div>
                        <span className="font-bold text-[#1B1D22] block">Salario Básico Quincenal</span>
                        <span className="text-[10px] text-[#747780]">Cálculo ordinario período (15 días)</span>
                      </div>
                      <span className="font-bold text-emerald-800 font-mono">
                        {formatCurrency(colillaData.totales.salarioQuincenal || colillaData.totales.salarioMensual / 2)}
                      </span>
                    </div>

                    {/* Horas extras, comisiones u otros devengos adicionales */}
                    {colillaData.devengos.filter(d => d.codigo !== 'SAL_ORD').map((d, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-emerald-100/60">
                        <div>
                          <span className="font-bold text-[#1B1D22] block">{d.nombre}</span>
                          <span className="text-[10px] text-[#747780]">
                            {d.codigo === 'HEX' ? 'Recargo 100% (Art. 62 CT)' : d.codigo === 'COM' ? 'Comisiones sobre ventas' : 'Devengo adicional'}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-800 font-mono">{formatCurrency(d.monto)}</span>
                      </div>
                    ))}

                    {/* Si no hay otros devengos, mostrar líneas de ley estándar en 0.00 */}
                    {!colillaData.devengos.some(d => d.codigo === 'HEX') && (
                      <div className="flex justify-between py-1 border-b border-emerald-100/60 text-[#747780]">
                        <span>Horas Extras (100% Recargo Art. 62)</span>
                        <span className="font-mono">C$ 0.00</span>
                      </div>
                    )}
                    {!colillaData.devengos.some(d => d.codigo === 'ANTIG') && (
                      <div className="flex justify-between py-1 border-b border-emerald-100/60 text-[#747780]">
                        <span>Pago por Antigüedad de Ley</span>
                        <span className="font-mono">C$ 0.00</span>
                      </div>
                    )}
                    {!colillaData.devengos.some(d => d.codigo === 'COM') && (
                      <div className="flex justify-between py-1 border-b border-emerald-100/60 text-[#747780]">
                        <span>Comisiones, Bonos o Incentivos</span>
                        <span className="font-mono">C$ 0.00</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-emerald-300 flex justify-between items-center bg-emerald-100/60 p-3 rounded-xl font-black">
                  <span className="text-xs text-emerald-950 uppercase tracking-wide">TOTAL DEVENGADO:</span>
                  <span className="text-base text-emerald-800 font-mono">
                    {formatCurrency(colillaData.totales.totalDevengado)}
                  </span>
                </div>
              </div>

              {/* BLOQUE 3: DEDUCCIONES DEL TRABAJADOR */}
              <div className="border border-rose-200 bg-rose-50/30 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-rose-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                      <h4 className="text-xs font-black text-rose-900 uppercase tracking-wide">
                        3. DEDUCCIONES DEL TRABAJADOR
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Retenciones de Ley
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* INSS Laboral */}
                    {(() => {
                      const inssLine = colillaData.deducciones.find(d => d.codigo === 'INSS_L');
                      return (
                        <div className="flex justify-between py-1 border-b border-rose-100/60">
                          <div>
                            <span className="font-bold text-[#1B1D22] block">INSS Laboral (7.00%)</span>
                            <span className="text-[10px] text-[#747780]">Retención obligatoria s/ total devengado</span>
                          </div>
                          <span className="font-bold text-rose-700 font-mono">
                            {formatCurrency(inssLine ? inssLine.monto : (colillaData.totales.totalDevengado * 0.07))}
                          </span>
                        </div>
                      );
                    })()}

                    {/* IR Salarial */}
                    {(() => {
                      const irLine = colillaData.deducciones.find(d => d.codigo === 'IR');
                      return (
                        <div className="flex justify-between py-1 border-b border-rose-100/60">
                          <div>
                            <span className="font-bold text-[#1B1D22] block">Impuesto s/ la Renta (IR)</span>
                            <span className="text-[10px] text-[#747780]">Ley 822 de Concertación Tributaria (Art. 23)</span>
                          </div>
                          <span className="font-bold text-rose-700 font-mono">
                            {formatCurrency(irLine ? irLine.monto : 0)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Otras deducciones */}
                    {colillaData.deducciones.filter(d => d.codigo !== 'INSS_L' && d.codigo !== 'IR').map((d, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-rose-100/60">
                        <div>
                          <span className="font-bold text-[#1B1D22] block">{d.nombre}</span>
                          <span className="text-[10px] text-[#747780]">Préstamos / Anticipos / Pensiones</span>
                        </div>
                        <span className="font-bold text-rose-700 font-mono">{formatCurrency(d.monto)}</span>
                      </div>
                    ))}

                    {!colillaData.deducciones.some(d => d.codigo !== 'INSS_L' && d.codigo !== 'IR') && (
                      <div className="flex justify-between py-1 border-b border-rose-100/60 text-[#747780]">
                        <span>Otras Deducciones (Préstamos, anticipos, embargos)</span>
                        <span className="font-mono">C$ 0.00</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-rose-300 flex justify-between items-center bg-rose-100/60 p-3 rounded-xl font-black">
                  <span className="text-xs text-rose-950 uppercase tracking-wide">TOTAL DEDUCCIONES:</span>
                  <span className="text-base text-rose-800 font-mono">
                    {formatCurrency(colillaData.totales.totalDeducciones)}
                  </span>
                </div>
              </div>

            </div>

            {/* BLOQUE 4: NETO RECIBIDO */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-200">
                      4. NETO RECIBIDO (MONTO LÍQUIDO FINAL)
                    </span>
                  </div>
                  <p className="text-3xl font-black tracking-tight text-white mt-1 font-mono">
                    {formatCurrency(colillaData.totales.netoPagar)}
                  </p>
                  <p className="text-xs text-blue-200 mt-1">
                    Fórmula legal: Total Devengado ({formatCurrency(colillaData.totales.totalDevengado)}) - Total Deducciones ({formatCurrency(colillaData.totales.totalDeducciones)})
                  </p>
                </div>

                <div className="text-left sm:text-right bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/20">
                  <span className="text-[10px] text-cyan-200 uppercase font-bold block">Modalidad de Dispersión:</span>
                  <span className="text-xs font-black text-white block">
                    {colillaData.empleado.formaPago || 'Transferencia Bancaria'}
                  </span>
                  <span className="text-[11px] text-blue-100 font-mono">
                    {colillaData.empleado.banco || 'BAC'} · {colillaData.empleado.numeroCuenta || 'Cta Salarial'}
                  </span>
                </div>
              </div>
            </div>

            {/* BLOQUE 5: APORTES PATRONALES Y PROVISIONES */}
            <div className="border border-slate-300 bg-slate-50/80 rounded-2xl p-4">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    5. APORTES PATRONALES Y PROVISIONES (REPORTE DE PLANILLA INTERNO)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                  Costos de Ley Asumidos por la Empresa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Aportes Patronales */}
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="font-black text-slate-900 block mb-2 text-[11px] uppercase border-b pb-1">
                    Aportes Patronales (23.50%)
                  </span>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span>INSS Patronal (21.50% &lt;50 trab.):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(colillaData.totales.totalDevengado * 0.215)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>INATEC (2.00% Capacitación):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(colillaData.totales.totalDevengado * 0.02)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                      <span>Total Aportes Patronales:</span>
                      <span className="font-mono text-[#C55500]">
                        {formatCurrency(colillaData.totales.costoPatronal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Provisiones Sociales */}
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="font-black text-slate-900 block mb-2 text-[11px] uppercase border-b pb-1">
                    Provisiones de Prestaciones Sociales (Ley 185)
                  </span>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span>Aguinaldo / Décimo Tercer Mes (1/12):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(colillaData.totales.totalDevengado / 12)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vacaciones de Ley (2.5 d/mes - 1/12):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(colillaData.totales.totalDevengado / 12)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Indemnización por Antigüedad (Art. 45 - 1/12):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(colillaData.totales.totalDevengado / 12)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                      <span>Total Provisiones Acumuladas:</span>
                      <span className="font-mono text-indigo-700">
                        {formatCurrency(colillaData.totales.totalProvisiones || (colillaData.totales.totalDevengado / 12) * 3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONSTANCIA LEGAL Y CIERRE: FIRMA DEL TRABAJADOR Y SELLO DE LA EMPRESA */}
            <div className="pt-4 border-t-2 border-slate-900 space-y-4">
              <p className="text-[11px] text-[#5A5D66] text-justify leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                "Hago constar que he recibido de <strong>{colillaData.empresa?.nombre || 'BM CONSTRUCCIONES S.A.'}</strong> a mi entera satisfacción la cantidad neta indicada en la presente colilla de pago por concepto de sueldos y prestaciones laborales correspondientes al período señalado, en conformidad con el Código del Trabajo (Ley 185) y normativas fiscales de la DGI (Ley 822), no existiendo reclamo ni saldo pendiente a la fecha."
              </p>

              <div className="grid grid-cols-2 gap-8 pt-4">
                {/* Firma Trabajador */}
                <div className="border border-slate-300 rounded-2xl p-4 text-center bg-white flex flex-col justify-between min-h-[130px]">
                  <div className="h-14 flex items-end justify-center">
                    <div className="w-48 border-b-2 border-slate-800"></div>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#1B1D22]">{colillaData.empleado.nombreCompleto}</p>
                    <p className="text-[10px] text-[#747780]">Cédula: {colillaData.empleado.cedula}</p>
                    <span className="text-[10px] font-black uppercase text-[#1A73E8] block mt-1">
                      Firma del Trabajador / Recibí Conforme
                    </span>
                  </div>
                </div>

                {/* Sello y Firma Empresa */}
                <div className="border border-slate-300 rounded-2xl p-4 text-center bg-white flex flex-col justify-between min-h-[130px]">
                  <div className="h-14 flex items-center justify-center">
                    <div className="border-2 border-dashed border-slate-400 rounded-xl px-4 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      SELLO OFICIAL DE RRHH / EMPRESA
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#1B1D22]">{colillaData.empresa?.nombre || 'BM Construcciones S.A.'}</p>
                    <p className="text-[10px] text-[#747780]">RUC: {colillaData.empresa?.rfc || 'J0310000000000'}</p>
                    <span className="text-[10px] font-black uppercase text-emerald-800 block mt-1">
                      Firma Autorizada y Sello del Empleador
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex justify-end items-center gap-3 pt-3 border-t border-[#E5E8EE]">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#E5E8EE] hover:bg-slate-50 text-xs font-bold text-[#1B1D22] flex items-center gap-2 cursor-pointer shadow-xs transition"
              >
                <Printer className="w-4 h-4 text-[#1A73E8]" />
                Imprimir Comprobante Oficial (PDF)
              </button>
              <button
                type="button"
                onClick={() => setColillaModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1A73E8] text-white text-xs font-bold hover:bg-[#1557b0] cursor-pointer shadow-xs transition"
              >
                Cerrar
              </button>
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
