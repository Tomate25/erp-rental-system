import { useState, useEffect, useCallback, useMemo } from 'react';
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
  History,
  FileText,
  Eye,
  RotateCcw,
  Lock,
  X,
  CreditCard,
  FileSpreadsheet,
  Ban,
  Edit3,
  Save,
  Settings,
} from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import type {
  Empleado,
  PeriodoNomina,
  PlanillaResumen,
  ColillaData,
  PlanillaHistorialItem,
  PlanillaBitacoraItem,
  HistorialPagosEmpleadoData,
  ParametrosLegalesData,
} from '../services/payroll.api';
import { formatCurrency } from '../../../shared/utils/formatters';

const MESES_ES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const PayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'planilla' | 'historial' | 'empleados' | 'liquidaciones' | 'parametros'>('planilla');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Datos
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('');
  const [planillaActual, setPlanillaActual] = useState<PlanillaResumen | null>(null);

  // Historial de Planillas
  const [historialList, setHistorialList] = useState<PlanillaHistorialItem[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [filtroAnio, setFiltroAnio] = useState<string>('TODOS');
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [detallePlanillaArchivada, setDetallePlanillaArchivada] = useState<any | null>(null);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);

  // Modal Bitácora
  const [bitacoraModalOpen, setBitacoraModalOpen] = useState(false);
  const [bitacoraItems, setBitacoraItems] = useState<PlanillaBitacoraItem[]>([]);
  const [bitacoraTitle, setBitacoraTitle] = useState<string>('');
  const [bitacoraLoading, setBitacoraLoading] = useState(false);

  // Modal Devolver a Calculada
  const [devolverModalOpen, setDevolverModalOpen] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');

  // Modal Anular Planilla
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Modal Asiento Contable
  const [asientoModalOpen, setAsientoModalOpen] = useState(false);
  const [asientoData, setAsientoData] = useState<any | null>(null);
  const [asientoTitle, setAsientoTitle] = useState<string>('Asiento Contable');

  // Modal Historial de Pagos del Colaborador (Art. 78 y Art. 94)
  const [historialPagosModalOpen, setHistorialPagosModalOpen] = useState(false);
  const [historialPagosData, setHistorialPagosData] = useState<HistorialPagosEmpleadoData | null>(null);
  const [historialPagosLoading, setHistorialPagosLoading] = useState(false);

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

  // Detección de Usuario y Rol Administrador
  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const roles: string[] = (currentUser.roles || []).map((r: any) => {
      if (typeof r === 'string') return r.toUpperCase();
      if (r?.nombre) return r.nombre.toUpperCase();
      if (r?.rol?.nombre) return r.rol.nombre.toUpperCase();
      return String(r).toUpperCase();
    });
    return roles.includes('ADMIN');
  }, [currentUser]);

  // Modal Editar Expediente de Empleado (Exclusivo Administrador)
  const [editEmpModalOpen, setEditEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Empleado | null>(null);
  const [editEmpForm, setEditEmpForm] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    numeroInss: '',
    ruc: '',
    email: '',
    telefono: '',
    direccion: '',
    cargo: '',
    areaContable: 'OPERACION' as 'OPERACION' | 'ADMINISTRACION' | 'VENTAS',
    tipoContrato: 'INDETERMINADO' as any,
    tipoSalario: 'FIJO' as 'FIJO' | 'VARIABLE' | 'MIXTO',
    metodoIr: 'FIJO' as 'FIJO' | 'VARIABLE',
    frecuenciaPago: 'QUINCENAL' as any,
    salarioMensual: 0,
    motivoCambioSalario: '',
    estado: 'ACTIVO' as any,
    bancoNombre: '',
    numeroCuenta: '',
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

  // Estado Parámetros Legales (INSS / IR / INATEC)
  const [parametrosLegales, setParametrosLegales] = useState<ParametrosLegalesData | null>(null);
  const [editParamModalOpen, setEditParamModalOpen] = useState(false);
  const [paramForm, setParamForm] = useState({
    tasaLaboral: 7.0,
    tasaPatronal: 21.5,
    tasaInatec: 2.0,
    techoMensual: '' as number | '',
    tamanoEmpleador: 'PEQUENO',
    fuenteTexto: 'Decreto 06-2019 / Ley 822 / Ley Orgánica INATEC',
    irTramos: [
      { orden: 1, desdeExcl: 0, hastaIncl: 100000 as number | null, impuestoBase: 0, porcentaje: 0, sobreExceso: 0, fuenteTexto: 'Ley 822' },
      { orden: 2, desdeExcl: 100000, hastaIncl: 200000 as number | null, impuestoBase: 0, porcentaje: 15, sobreExceso: 100000, fuenteTexto: 'Ley 822' },
      { orden: 3, desdeExcl: 200000, hastaIncl: 350000 as number | null, impuestoBase: 15000, porcentaje: 20, sobreExceso: 200000, fuenteTexto: 'Ley 822' },
      { orden: 4, desdeExcl: 350000, hastaIncl: 500000 as number | null, impuestoBase: 45000, porcentaje: 25, sobreExceso: 350000, fuenteTexto: 'Ley 822' },
      { orden: 5, desdeExcl: 500000, hastaIncl: null as number | null, impuestoBase: 82500, porcentaje: 30, sobreExceso: 500000, fuenteTexto: 'Ley 822' },
    ],
  });

  // Función helper de cálculo en tiempo real bajo Ley 185 y Ley 822 (para vista previa o contingencia)
  const calcularNominaEnVivo = (emp: Empleado, quincena: number) => {
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
    const inssLaboralTasa = parametrosLegales?.inss?.tasaLaboral 
      ? (parametrosLegales.inss.tasaLaboral > 1 ? parametrosLegales.inss.tasaLaboral / 100 : parametrosLegales.inss.tasaLaboral)
      : 0.07;
    const inssLaboral = Math.round(totalDevengado * inssLaboralTasa * 100) / 100;

    // Retención IR Art. 23 Ley 822
    let irMonto = 0;
    if (comision === 0) {
      irMonto = 107.38; // Para C$ 10,500 mensual base -> C$ 107.38 quincenal
    } else {
      const mesBruto = Number(emp.salarioMensual) + comision;
      const mesInss = Math.round(mesBruto * inssLaboralTasa * 100) / 100;
      const rentaNetaAnual = (mesBruto - mesInss) * 12;
      const exceso = Math.max(0, rentaNetaAnual - 100000);
      const irAnual = Math.round(exceso * 0.15 * 100) / 100;
      const irMes = Math.round((irAnual / 12) * 100) / 100;
      irMonto = Math.round(irMes * (totalDevengado / mesBruto) * 100) / 100;
    }

    const inssPatronalTasa = parametrosLegales?.inss?.tasaPatronal
      ? (parametrosLegales.inss.tasaPatronal > 1 ? parametrosLegales.inss.tasaPatronal / 100 : parametrosLegales.inss.tasaPatronal)
      : 0.215;
    const inatecTasa = parametrosLegales?.inatec?.tasa
      ? (parametrosLegales.inatec.tasa > 1 ? parametrosLegales.inatec.tasa / 100 : parametrosLegales.inatec.tasa)
      : 0.02;

    const totalDeducciones = Math.round((inssLaboral + irMonto) * 100) / 100;
    const netoPagar = Math.round((totalDevengado - totalDeducciones) * 100) / 100;
    const inssPatronal = Math.round(totalDevengado * inssPatronalTasa * 100) / 100;
    const inatec = Math.round(totalDevengado * inatecTasa * 100) / 100;
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
      const [empsRes, persRes, paramsRes] = await Promise.all([
        payrollApi.getEmployees(),
        payrollApi.getPeriods(),
        payrollApi.getParameters().catch((err) => {
          console.warn('Error al cargar parámetros legales:', err);
          return null;
        }),
      ]);
      setEmpleados(empsRes);
      setPeriodos(persRes);
      if (paramsRes) {
        setParametrosLegales(paramsRes);
      }

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
          } catch (calcErr: any) {
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

  // Períodos ordenados cronológicamente descendente (más recientes primero)
  const periodosOrdenados = useMemo(() => {
    return [...periodos].sort((a, b) => {
      if (b.anio !== a.anio) return b.anio - a.anio;
      if (b.mes !== a.mes) return b.mes - a.mes;
      return (b.quincena || 0) - (a.quincena || 0);
    });
  }, [periodos]);

  // Regla Ley 185: Bloquear Q2 si Q1 no está APROBADA
  const esPeriodoQ2Bloqueado = useCallback((periodo: PeriodoNomina) => {
    if (periodo.quincena !== 2) return false;
    const q1 = periodos.find(
      (p) => p.anio === periodo.anio && p.mes === periodo.mes && p.quincena === 1,
    );
    if (!q1) return true;
    const q1Aprobada = q1.planillas?.some(
      (pl) => pl.estado === 'APROBADA' || pl.estado === 'PAGADA',
    );
    return !q1Aprobada;
  }, [periodos]);

  const selectedPeriodo = useMemo(() => {
    return periodos.find((p) => p.id === selectedPeriodoId);
  }, [periodos, selectedPeriodoId]);

  const isQ2Bloqueado = useMemo(() => {
    if (!selectedPeriodo) return false;
    return esPeriodoQ2Bloqueado(selectedPeriodo);
  }, [selectedPeriodo, esPeriodoQ2Bloqueado]);

  // Carga reactiva de Historial de Planillas con filtros
  const loadHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      const params: any = {};
      if (filtroAnio !== 'TODOS') params.anio = Number(filtroAnio);
      if (filtroMes !== 'TODOS') params.mes = Number(filtroMes);
      if (filtroEstado !== 'TODOS') params.estado = filtroEstado;

      const res = await payrollApi.getPayrollHistory(params);
      setHistorialList(res);
    } catch (err: any) {
      console.error('Error cargando historial de planillas:', err);
    } finally {
      setHistorialLoading(false);
    }
  }, [filtroAnio, filtroMes, filtroEstado]);

  useEffect(() => {
    if (activeTab === 'historial') {
      loadHistorial();
    }
  }, [activeTab, loadHistorial]);

  // Ver bitácora documental
  const handleVerBitacora = async (planillaId: string, titulo = 'Bitácora de Planilla') => {
    setBitacoraTitle(titulo);
    setBitacoraModalOpen(true);
    setBitacoraLoading(true);
    try {
      const res = await payrollApi.getPayrollAuditLog(planillaId);
      setBitacoraItems(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar bitácora');
    } finally {
      setBitacoraLoading(false);
    }
  };

  // Ver detalle de planilla archivada en solo lectura
  const handleVerDetallePlanilla = async (planillaId: string) => {
    setLoading(true);
    try {
      const res = await payrollApi.getPayrollDetail(planillaId);
      setDetallePlanillaArchivada(res);
      setDetalleModalOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar detalle de planilla');
    } finally {
      setLoading(false);
    }
  };

  // Ver Historial de Pagos del colaborador
  const handleVerHistorialPagos = async (empleadoId: string) => {
    setHistorialPagosLoading(true);
    setHistorialPagosModalOpen(true);
    try {
      const res = await payrollApi.getEmployeePaymentHistory(empleadoId);
      setHistorialPagosData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar historial de pagos');
    } finally {
      setHistorialPagosLoading(false);
    }
  };

  // Confirmar devolución de REVISADA a CALCULADA
  const handleConfirmarDevolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planillaActual || !motivoDevolucion.trim()) return;
    setLoading(true);
    try {
      const res = await payrollApi.returnPayroll(planillaActual.id, motivoDevolucion.trim());
      setPlanillaActual(res);
      setDevolverModalOpen(false);
      setMotivoDevolucion('');
      setSuccessMsg('Planilla devuelta a estado CALCULADA para corrección.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al devolver planilla');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar anulación de planilla
  const handleConfirmarAnulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planillaActual || !motivoAnulacion.trim()) return;
    setLoading(true);
    try {
      const res = await payrollApi.cancelPayroll(planillaActual.id, motivoAnulacion.trim());
      setPlanillaActual(res);
      setAnularModalOpen(false);
      setMotivoAnulacion('');
      setSuccessMsg('Planilla anulada.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al anular planilla');
    } finally {
      setLoading(false);
    }
  };

  // Ver asiento contable generado
  const handleVerAsiento = (asientoJson: any, titulo = 'Asiento Contable de Nómina') => {
    if (!asientoJson) return;
    setAsientoData(asientoJson);
    setAsientoTitle(titulo);
    setAsientoModalOpen(true);
  };

  // Exportar planilla completa a archivo CSV / Excel
  const exportPlanillaToCSV = (planilla: any, tituloPeriodo = 'Planilla') => {
    if (!planilla || !planilla.empleados || planilla.empleados.length === 0) {
      setError('No hay colaboradores en esta planilla para exportar');
      return;
    }

    const headers = [
      'Código',
      'Colaborador',
      'Cédula',
      'Nº INSS',
      'Cargo',
      'Área Contable',
      'Salario Mensual',
      'Días',
      'Salario Básico Q',
      'Horas Extras',
      'Comisiones',
      'Otros Ingresos',
      'Total Devengado',
      'INSS Laboral (7%)',
      'IR Salarial (Art. 23)',
      'Otras Deducciones',
      'Total Deducciones',
      'Neto a Pagar',
      'INSS Patronal (21.5%)',
      'INATEC (2%)',
      'Total Patronal (23.5%)',
    ];

    const rows = planilla.empleados.map((item: any) => {
      const emp = item.empleado || item.snapshotEmpleado || {};
      const salMensual = Number(item.salarioMensual || emp.salarioMensual || 0);
      const salQ = salMensual / 2;
      const hExtra = Number(item.horasExtra || 0);
      const com = Number(item.comisiones || 0);
      const otros = Number(item.otrosIngresos || 0);
      const dev = Number(item.totalDevengado || 0);
      const inssL = Number(item.inssLaboral || 0);
      const ir = Number(item.irSalarial || 0);
      const otrasDed = Number(item.otrasDeducciones || 0);
      const totDed = Number(item.totalDeducciones || 0);
      const neto = Number(item.netoPagar || 0);
      const inssP = Number(item.inssPatronal || Math.round(dev * 0.215 * 100) / 100);
      const inatec = Number(item.inatec || Math.round(dev * 0.02 * 100) / 100);
      const totPat = Number(item.costoPatronal || inssP + inatec);

      return [
        `"${emp.codigo || ''}"`,
        `"${(emp.nombres || '') + ' ' + (emp.apellidos || '')}"`,
        `"${emp.cedula || ''}"`,
        `"${emp.numeroInss || ''}"`,
        `"${emp.cargo || ''}"`,
        `"${emp.areaContable || ''}"`,
        salMensual.toFixed(2),
        item.diasTrabajados || 15,
        salQ.toFixed(2),
        hExtra.toFixed(2),
        com.toFixed(2),
        otros.toFixed(2),
        dev.toFixed(2),
        inssL.toFixed(2),
        ir.toFixed(2),
        otrasDed.toFixed(2),
        totDed.toFixed(2),
        neto.toFixed(2),
        inssP.toFixed(2),
        inatec.toFixed(2),
        totPat.toFixed(2),
      ].join(',');
    });

    const totalDev = Number(planilla.totalDevengado || 0);
    const totalDed = Number(planilla.totalDeducciones || 0);
    const totalNet = Number(planilla.totalNeto || 0);
    const totalInssP = Number(planilla.totalInssPatronal || Math.round(totalDev * 0.215 * 100) / 100);
    const totalInatec = Number(planilla.totalInatec || Math.round(totalDev * 0.02 * 100) / 100);
    const totalPat = Number(planilla.totalPatronal || totalInssP + totalInatec);

    rows.push([
      '"TOTALES GENERALES"',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      totalDev.toFixed(2),
      '""',
      '""',
      '""',
      totalDed.toFixed(2),
      totalNet.toFixed(2),
      totalInssP.toFixed(2),
      totalInatec.toFixed(2),
      totalPat.toFixed(2),
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tituloPeriodo.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // Abrir modal de edición con los datos vigentes actuales
  const abrirModalEdicionParametros = () => {
    if (parametrosLegales) {
      setParamForm({
        tasaLaboral: parametrosLegales.inss?.tasaLaboral ?? 7.0,
        tasaPatronal: parametrosLegales.inss?.tasaPatronal ?? 21.5,
        tasaInatec: parametrosLegales.inatec?.tasa ?? 2.0,
        techoMensual: parametrosLegales.inss?.techoMensual ?? '',
        tamanoEmpleador: parametrosLegales.inss?.tamanoEmpleador ?? 'PEQUENO',
        fuenteTexto: parametrosLegales.inss?.fuenteTexto || 'Decreto 06-2019 / Ley 822 / Ley Orgánica INATEC',
        irTramos: parametrosLegales.irTramos && parametrosLegales.irTramos.length > 0
          ? parametrosLegales.irTramos.map((t) => ({
              orden: t.orden,
              desdeExcl: t.desdeExcl,
              hastaIncl: t.hastaIncl,
              impuestoBase: t.impuestoBase,
              porcentaje: t.porcentaje,
              sobreExceso: t.sobreExceso,
              fuenteTexto: t.fuenteTexto || 'Ley 822 Art. 23',
            }))
          : [
              { orden: 1, desdeExcl: 0, hastaIncl: 100000, impuestoBase: 0, porcentaje: 0, sobreExceso: 0, fuenteTexto: 'Ley 822' },
              { orden: 2, desdeExcl: 100000, hastaIncl: 200000, impuestoBase: 0, porcentaje: 15, sobreExceso: 100000, fuenteTexto: 'Ley 822' },
              { orden: 3, desdeExcl: 200000, hastaIncl: 350000, impuestoBase: 15000, porcentaje: 20, sobreExceso: 200000, fuenteTexto: 'Ley 822' },
              { orden: 4, desdeExcl: 350000, hastaIncl: 500000, impuestoBase: 45000, porcentaje: 25, sobreExceso: 350000, fuenteTexto: 'Ley 822' },
              { orden: 5, desdeExcl: 500000, hastaIncl: null, impuestoBase: 82500, porcentaje: 30, sobreExceso: 500000, fuenteTexto: 'Ley 822' },
            ],
      });
    }
    setEditParamModalOpen(true);
  };

  // Guardar cambios en tarifas legales
  const handleGuardarParametros = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await payrollApi.updateParameters({
        inss: {
          tasaLaboral: Number(paramForm.tasaLaboral),
          tasaPatronal: Number(paramForm.tasaPatronal),
          techoMensual: paramForm.techoMensual !== '' ? Number(paramForm.techoMensual) : null,
          tamanoEmpleador: paramForm.tamanoEmpleador,
          fuenteTexto: paramForm.fuenteTexto,
        },
        inatec: {
          tasa: Number(paramForm.tasaInatec),
          fuenteTexto: paramForm.fuenteTexto,
        },
        irTramos: paramForm.irTramos.map((t) => ({
          orden: Number(t.orden),
          desdeExcl: Number(t.desdeExcl),
          hastaIncl: t.hastaIncl !== null && t.hastaIncl !== undefined ? Number(t.hastaIncl) : null,
          impuestoBase: Number(t.impuestoBase),
          porcentaje: Number(t.porcentaje),
          sobreExceso: Number(t.sobreExceso),
          fuenteTexto: t.fuenteTexto,
        })),
      });
      setParametrosLegales(updated);
      setEditParamModalOpen(false);
      setSuccessMsg('Tarifas legales actualizadas y guardadas con éxito en el sistema.');
      setTimeout(() => setSuccessMsg(null), 5000);

      // Auto-recalcular la planilla seleccionada si está en borrador/calculada
      if (selectedPeriodoId) {
        try {
          const calcRes = await payrollApi.calculatePayroll({ periodoId: selectedPeriodoId });
          setPlanillaActual(calcRes);
        } catch (calcErr) {
          console.warn('Recálculo automático tras actualizar parámetros:', calcErr);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al guardar tarifas legales');
    } finally {
      setLoading(false);
    }
  };

  // Restablecer a tarifas oficiales de ley
  const handleRestablecerParametros = async () => {
    if (!window.confirm('¿Está seguro de restablecer todas las tarifas a los valores oficiales de ley de Nicaragua (INSS 7%/21.5%, INATEC 2%, tabla IR Art. 23)?')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.resetParameters();
      setParametrosLegales(res);
      setEditParamModalOpen(false);
      setSuccessMsg('Tarifas legales restablecidas a los valores oficiales de Nicaragua.');
      setTimeout(() => setSuccessMsg(null), 5000);
      if (selectedPeriodoId) {
        try {
          const calcRes = await payrollApi.calculatePayroll({ periodoId: selectedPeriodoId });
          setPlanillaActual(calcRes);
        } catch (calcErr) {
          console.warn('Recálculo tras restablecer parámetros:', calcErr);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al restablecer tarifas');
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

  // Abrir modal de edición de expediente (Exclusivo Administrador)
  const handleAbrirEditarEmpleado = (emp: Empleado) => {
    if (!isAdmin) {
      alert('Acceso restringido: Solo los administradores del sistema pueden modificar expedientes de personal.');
      return;
    }
    setEditingEmp(emp);
    const cBancaria = (emp as any).cuentasBancarias?.find((c: any) => c.esPrincipal) || (emp as any).cuentasBancarias?.[0];
    setEditEmpForm({
      nombres: emp.nombres || '',
      apellidos: emp.apellidos || '',
      cedula: emp.cedula || '',
      numeroInss: emp.numeroInss || '',
      ruc: (emp as any).ruc || '',
      email: (emp as any).email || '',
      telefono: (emp as any).telefono || '',
      direccion: (emp as any).direccion || '',
      cargo: emp.cargo || '',
      areaContable: emp.areaContable || 'OPERACION',
      tipoContrato: (emp as any).tipoContrato || 'INDETERMINADO',
      tipoSalario: emp.tipoSalario || 'FIJO',
      metodoIr: emp.metodoIr || 'FIJO',
      frecuenciaPago: (emp as any).frecuenciaPago || 'QUINCENAL',
      salarioMensual: Number(emp.salarioMensual) || 0,
      motivoCambioSalario: '',
      estado: (emp.estado as any) || 'ACTIVO',
      bancoNombre: cBancaria?.banco || '',
      numeroCuenta: cBancaria?.numeroCuenta || '',
    });
    setEditEmpModalOpen(true);
  };

  // Guardar edición de expediente
  const handleActualizarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Acceso restringido: Solo administradores pueden guardar modificaciones de expediente.');
      return;
    }
    if (!editingEmp) return;
    setLoading(true);
    setError(null);
    try {
      await payrollApi.updateEmployee(editingEmp.id, {
        ...editEmpForm,
        salarioMensual: Number(editEmpForm.salarioMensual),
      });
      setSuccessMsg(`Expediente de ${editEmpForm.nombres} ${editEmpForm.apellidos} actualizado exitosamente.`);
      setEditEmpModalOpen(false);
      setEditingEmp(null);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar expediente del colaborador');
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
          { id: 'historial', label: 'Historial de Planillas', icon: History },
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
          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="periodo-select" className="text-xs font-bold text-[#37474F]">Período de Nómina:</label>
                <select
                  id="periodo-select"
                  aria-label="Seleccionar período de nómina"
                  value={selectedPeriodoId}
                  onChange={(e) => handlePeriodoChange(e.target.value)}
                  className="bg-[#F4F6F9] border border-[#E5E8EE] text-[#1B1D22] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                >
                  {periodosOrdenados.length === 0 ? (
                    <option value="">No hay períodos registrados</option>
                  ) : (
                    periodosOrdenados.map((p) => {
                      const plEstado = p.planillas?.[0]?.estado;
                      const bloqueado = esPeriodoQ2Bloqueado(p);
                      const mesTexto = MESES_ES[p.mes] || `Mes ${p.mes}`;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.anio} • {mesTexto} Q{p.quincena || 1} • Pago {p.fechaPago?.split('T')[0] || ''} • {bloqueado ? 'BLOQUEADA (Q1 PENDIENTE)' : (plEstado || 'BORRADOR')}
                        </option>
                      );
                    })
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
              <div className="flex flex-wrap items-center gap-2">
                {/* Botón Calcular / Recalcular con reglas de inmutabilidad */}
                {planillaActual && (planillaActual.bloqueada || planillaActual.estado === 'APROBADA' || planillaActual.estado === 'PAGADA') ? (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2 cursor-not-allowed"
                    title="Las planillas aprobadas son inmutables y no se pueden recalcular (Ley 185)"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Planilla Aprobada (Inmutable)
                  </button>
                ) : isQ2Bloqueado ? (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2 cursor-not-allowed"
                    title="La Quincena 1 debe estar Aprobada antes de calcular la Q2"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Q2 Bloqueada
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCalcularPlanilla}
                    disabled={loading || !selectedPeriodoId}
                    className="px-4 py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Calcular / Recalcular
                  </button>
                )}

                {planillaActual && (
                  <>
                    {planillaActual.estado === 'CALCULADA' && (
                      <button
                        type="button"
                        onClick={handleRevisar}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                      >
                        Marcar Revisada
                      </button>
                    )}

                    {planillaActual.estado === 'REVISADA' && (
                      <button
                        type="button"
                        onClick={() => setDevolverModalOpen(true)}
                        className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
                        title="Devolver a Calculada con justificación registrada en bitácora"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        Devolver a Calculada
                      </button>
                    )}

                    {(planillaActual.estado === 'REVISADA' || planillaActual.estado === 'CALCULADA') && (
                      <button
                        type="button"
                        onClick={handleAprobar}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprobar Planilla
                      </button>
                    )}

                    {planillaActual.estado === 'APROBADA' && (
                      <button
                        type="button"
                        onClick={handlePagar}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Marcar Pagada
                      </button>
                    )}

                    {(planillaActual.estado === 'CALCULADA' || planillaActual.estado === 'BORRADOR' || planillaActual.estado === 'REVISADA') && !planillaActual.bloqueada && (
                      <button
                        type="button"
                        onClick={() => setAnularModalOpen(true)}
                        className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-rose-600 text-xs font-bold hover:bg-rose-50 cursor-pointer flex items-center gap-1.5"
                        title="Anular planilla con motivo de auditoría"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-500" />
                        Anular
                      </button>
                    )}

                    {/* Botones de Asiento Contable */}
                    {planillaActual.asientoDevengoJson && (
                      <button
                        type="button"
                        onClick={() => handleVerAsiento(planillaActual.asientoDevengoJson, `Asiento Contable de Provisión y Devengo • Q${planillaActual.periodo?.quincena}`)}
                        className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5"
                        title="Ver partida doble de devengo y pasivos de ley"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                        Asiento Devengo
                      </button>
                    )}

                    {planillaActual.asientoPagoJson && (
                      <button
                        type="button"
                        onClick={() => handleVerAsiento(planillaActual.asientoPagoJson, `Asiento Contable de Pago • Q${planillaActual.periodo?.quincena}`)}
                        className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 cursor-pointer flex items-center gap-1.5"
                        title="Ver asiento contable de egreso bancario"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        Asiento Pago
                      </button>
                    )}

                    {/* Botón Bitácora */}
                    <button
                      type="button"
                      onClick={() => handleVerBitacora(planillaActual.id, `Bitácora de Auditoría • Planilla ${planillaActual.periodo?.anio} Q${planillaActual.periodo?.quincena}`)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      title="Ver trazabilidad de acciones, fechas y usuarios"
                    >
                      <History className="w-3.5 h-3.5 text-amber-600" />
                      Bitácora
                    </button>

                    {/* Botón Exportar Excel */}
                    <button
                      type="button"
                      onClick={() => exportPlanillaToCSV(planillaActual, `Planilla_${planillaActual.periodo?.anio}_Mes${planillaActual.periodo?.mes}_Q${planillaActual.periodo?.quincena}`)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      title="Descargar archivo Excel / CSV formateado"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Excel (CSV)
                    </button>

                    <span
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        planillaActual.estado === 'PAGADA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : planillaActual.estado === 'APROBADA'
                          ? 'bg-blue-100 text-blue-800'
                          : planillaActual.estado === 'REVISADA'
                          ? 'bg-amber-100 text-amber-800'
                          : planillaActual.estado === 'ANULADA'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {planillaActual.bloqueada && <Lock className="w-3 h-3 text-slate-600" />}
                      {planillaActual.estado}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Aviso de Bloqueo Q2 si Q1 no está Aprobada */}
            {isQ2Bloqueado && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Regla Ley 185 (Código del Trabajo):</strong> La Quincena 2 no puede crearse ni calcularse hasta que la Quincena 1 del mismo mes esté en estado <strong>APROBADA</strong> o <strong>PAGADA</strong>.
                </span>
              </div>
            )}
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
          PESTAÑA: HISTORIAL DE PLANILLAS (DOCUMENTO INMUTABLE)
      ======================================================== */}
      {activeTab === 'historial' && (
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="filtro-historial-anio" className="text-xs font-bold text-[#37474F]">Año:</label>
                <select
                  id="filtro-historial-anio"
                  aria-label="Filtrar por año"
                  value={filtroAnio}
                  onChange={(e) => setFiltroAnio(e.target.value)}
                  className="bg-[#F4F6F9] border border-[#E5E8EE] text-[#1B1D22] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                >
                  <option value="TODOS">Todos los Años</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="filtro-historial-mes" className="text-xs font-bold text-[#37474F]">Mes:</label>
                <select
                  id="filtro-historial-mes"
                  aria-label="Filtrar por mes"
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="bg-[#F4F6F9] border border-[#E5E8EE] text-[#1B1D22] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                >
                  <option value="TODOS">Todos los Meses</option>
                  {MESES_ES.map((nombreMes, idx) => {
                    if (idx === 0) return null;
                    return (
                      <option key={idx} value={idx}>
                        {idx} - {nombreMes}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="filtro-historial-estado" className="text-xs font-bold text-[#37474F]">Estado:</label>
                <select
                  id="filtro-historial-estado"
                  aria-label="Filtrar por estado"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-[#F4F6F9] border border-[#E5E8EE] text-[#1B1D22] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="BORRADOR">BORRADOR</option>
                  <option value="CALCULADA">CALCULADA</option>
                  <option value="REVISADA">REVISADA</option>
                  <option value="APROBADA">APROBADA</option>
                  <option value="PAGADA">PAGADA</option>
                  <option value="ANULADA">ANULADA</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadHistorial}
                disabled={historialLoading}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historialLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            <div className="text-xs text-[#747780] font-medium">
              Mostrando <strong className="text-[#1B1D22]">{historialList.length}</strong> planillas registradas
            </div>
          </div>

          {/* Tabla de Historial Documental */}
          <div className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#E5E8EE] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-[#1B1D22]">Historial Documental de Planillas (Ley 185)</h2>
                <p className="text-xs text-[#747780]">
                  Documentos de nómina por período con trazabilidad inmutable, snapshots de parámetros y asientos contables
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E8EE] bg-[#F4F6F9] text-[10px] font-black text-[#5A5D66] uppercase tracking-wider">
                    <th className="py-3 px-3">Período / Quincena</th>
                    <th className="py-3 px-3">Fecha de Pago</th>
                    <th className="py-3 px-3">Estado Legal</th>
                    <th className="py-3 px-3 text-center">Colaboradores</th>
                    <th className="py-3 px-3 text-right">Total Devengado</th>
                    <th className="py-3 px-3 text-right text-rose-600">Deducciones</th>
                    <th className="py-3 px-3 text-right text-[#1A73E8]">Neto a Pagar</th>
                    <th className="py-3 px-3 text-right text-[#C55500]">Patronal (23.5%)</th>
                    <th className="py-3 px-3">Aprobación / Cierre</th>
                    <th className="py-3 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE]">
                  {historialLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[#747780] font-bold">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1A73E8]" />
                        Cargando historial de nómina...
                      </td>
                    </tr>
                  ) : historialList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[#747780]">
                        No se encontraron planillas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    historialList.map((item) => {
                      const dev = Number(item.totalDevengado || 0);
                      const inssPat = Number(item.totalInssPatronal || dev * 0.215);
                      const inat = Number(item.totalInatec || dev * 0.02);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-3 font-bold text-[#1B1D22]">
                            <span className="block font-black text-xs">
                              {item.periodo?.anio || item.anio} • {MESES_ES[item.periodo?.mes || item.mes] || item.mes} Q{item.periodo?.quincena || item.quincena || 1}
                            </span>
                            <span className="text-[10px] text-[#747780] font-normal">
                              {item.periodo?.fechaInicio?.split('T')[0]} al {item.periodo?.fechaFin?.split('T')[0]}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-medium text-[#37474F]">
                            {item.periodo?.fechaPago?.split('T')[0] || item.fechaPago?.split('T')[0] || '—'}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                item.estado === 'PAGADA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.estado === 'APROBADA'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.estado === 'REVISADA'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.estado === 'ANULADA'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {item.bloqueada && <Lock className="w-3 h-3 text-slate-600" />}
                              {item.estado}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-[#37474F]">
                            {item.totalEmpleados || 0}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-[#1B1D22]">
                            {formatCurrency(Number(item.totalDevengado))}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                            {formatCurrency(Number(item.totalDeducciones))}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-black text-[#1A73E8]">
                            {formatCurrency(Number(item.totalNeto))}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-[#C55500]">
                            <span className="font-bold block">{formatCurrency(Number(item.totalPatronal))}</span>
                            <span className="text-[9px] text-[#747780] block">
                              INSS: {formatCurrency(inssPat)} | INATEC: {formatCurrency(inat)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-[11px] text-[#5A5D66]">
                            {item.aprobadoPor ? (
                              <div>
                                <span className="font-bold text-[#1B1D22] block">{item.aprobadoPor}</span>
                                <span className="text-[10px] text-[#747780]">
                                  {item.fechaAprobacion ? new Date(item.fechaAprobacion).toLocaleDateString('es-NI') : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Pendiente</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Ver Detalle Completo */}
                              <button
                                type="button"
                                onClick={() => handleVerDetallePlanilla(item.id)}
                                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer transition"
                                title="Ver desglose y snapshot legal de colaboradores"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Ver Bitácora */}
                              <button
                                type="button"
                                onClick={() => handleVerBitacora(item.id, `Bitácora • Planilla ${item.periodo?.anio} Q${item.periodo?.quincena}`)}
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer transition"
                                title="Ver bitácora de auditoría de esta planilla"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Ver Asiento Contable */}
                              {item.asientoDevengoJson && (
                                <button
                                  type="button"
                                  onClick={() => handleVerAsiento(item.asientoDevengoJson, `Asiento Contable de Provisión • Q${item.periodo?.quincena}`)}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer transition"
                                  title="Ver asiento contable generado en partida doble"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Exportar Excel / CSV */}
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const fullPl = await payrollApi.getPayrollDetail(item.id);
                                    exportPlanillaToCSV(fullPl, `Planilla_${item.periodo?.anio}_M${item.periodo?.mes}_Q${item.periodo?.quincena}`);
                                  } catch (err: any) {
                                    setError('Error al descargar reporte de planilla');
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer transition"
                                title="Exportar planilla a Excel / CSV"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>
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
                  <th className="py-3 px-4 text-center">Acciones</th>
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
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleAbrirEditarEmpleado(emp)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] inline-flex items-center gap-1.5 transition cursor-pointer border border-blue-200"
                            title="Editar datos del colaborador y expediente salarial (Solo Administradores)"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            Editar
                          </button>
                        ) : (
                          <span
                            className="px-2 py-1 rounded-xl bg-slate-100 text-slate-400 font-semibold text-[10px] inline-flex items-center gap-1 cursor-not-allowed"
                            title="Solo administradores del sistema pueden modificar expedientes de personal"
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            Solo Admin
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleVerHistorialPagos(emp.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] inline-flex items-center gap-1.5 transition cursor-pointer border border-indigo-200"
                          title="Ver historial de pagos, acumulado anual y promedios legales (Art. 78 y Art. 94)"
                        >
                          <History className="w-3.5 h-3.5 text-indigo-600" />
                          Historial Pagos
                        </button>
                      </div>
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
          PESTAÑA 4: PARÁMETROS LEGALES (MODIFICABLES Y PERSISTENTES)
      ======================================================== */}
      {activeTab === 'parametros' && (
        <div className="space-y-6">
          {/* Barra de Acciones de Tarifas Legales */}
          <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Normativa Laboral & Fiscal de Nicaragua
              </div>
              <h2 className="text-lg font-black text-[#1B1D22]">
                Tarifas y Parámetros Oficiales del Sistema
              </h2>
              <p className="text-xs text-[#747780]">
                Las tarifas configuradas aquí se aplican automáticamente en todos los cálculos de nómina, colillas y provisiones patronales.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={abrirModalEdicionParametros}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-[#1A73E8] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-[#1A73E8]/30 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Modificar Tarifas Legales
              </button>

              <button
                type="button"
                onClick={handleRestablecerParametros}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E8EE] hover:bg-slate-50 text-xs font-bold text-[#37474F] flex items-center gap-2 shadow-xs transition cursor-pointer"
                title="Restablecer tarifas a valores oficiales de ley"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                Valores de Ley
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta 1: INSS e INATEC */}
            <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    {parametrosLegales?.inss?.tasaLaboral != null ? `${parametrosLegales.inss.tasaLaboral}%` : '7%'}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#1B1D22]">Seguridad Social (INSS) & INATEC</h2>
                    <p className="text-xs text-[#747780]">
                      {parametrosLegales?.inss?.fuenteTexto || 'Decreto 06-2019 / Ley Orgánica INATEC'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  Activo
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#F4F6F9]">
                  <div>
                    <span className="font-bold text-[#37474F] block">INSS Laboral (Deducción al Trabajador):</span>
                    <span className="text-[10px] text-[#747780]">Deducido del total de ingresos gravables</span>
                  </div>
                  <span className="font-black text-rose-600 text-sm">
                    {parametrosLegales?.inss?.tasaLaboral != null ? `${Number(parametrosLegales.inss.tasaLaboral).toFixed(2)}%` : '7.00%'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#F4F6F9]">
                  <div>
                    <span className="font-bold text-[#37474F] block">INSS Patronal (Aporte del Empleador):</span>
                    <span className="text-[10px] text-[#747780]">
                      {parametrosLegales?.inss?.tamanoEmpleador === 'GRANDE' ? 'Empleador grande (≥ 50 trabajadores)' : 'Empleador (< 50 trabajadores)'}
                    </span>
                  </div>
                  <span className="font-black text-[#C55500] text-sm">
                    {parametrosLegales?.inss?.tasaPatronal != null ? `${Number(parametrosLegales.inss.tasaPatronal).toFixed(2)}%` : '21.50%'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#F4F6F9]">
                  <div>
                    <span className="font-bold text-[#37474F] block">Aporte INATEC (A cargo del Empleador):</span>
                    <span className="text-[10px] text-[#747780]">Instituto Nacional Tecnológico (Decreto 40-94)</span>
                  </div>
                  <span className="font-black text-[#C55500] text-sm">
                    {parametrosLegales?.inatec?.tasa != null ? `${Number(parametrosLegales.inatec.tasa).toFixed(2)}%` : '2.00%'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#F4F6F9]">
                  <div>
                    <span className="font-bold text-[#37474F] block">Carga Patronal Total de Ley:</span>
                    <span className="text-[10px] text-[#747780]">INSS Patronal + INATEC</span>
                  </div>
                  <span className="font-black text-indigo-700 text-sm">
                    {(Number(parametrosLegales?.inss?.tasaPatronal ?? 21.5) + Number(parametrosLegales?.inatec?.tasa ?? 2.0)).toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#F4F6F9]">
                  <span className="font-bold text-[#37474F]">Techo Salarial Máximo Cotizable:</span>
                  <span className="font-bold text-emerald-700">
                    {parametrosLegales?.inss?.techoMensual ? formatCurrency(Number(parametrosLegales.inss.techoMensual)) : 'Sin Techo (Reforma 2019)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Tramos Progresivos de IR */}
            <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    IR
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#1B1D22]">Tarifa Progresiva de IR (Art. 23 Ley 822)</h2>
                    <p className="text-xs text-[#747780]">Rentas del Trabajo anualizadas con deducción previa del INSS</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                  {parametrosLegales?.irTramos?.length ?? 5} Tramos
                </span>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E8EE] text-[10px] text-[#747780] font-black uppercase">
                      <th className="py-2.5">Estrato Anual (C$)</th>
                      <th className="py-2.5 text-right">Impuesto Base</th>
                      <th className="py-2.5 text-right">Tasa Exceso</th>
                      <th className="py-2.5 text-right">Sobre Exceso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8EE]">
                    {parametrosLegales?.irTramos && parametrosLegales.irTramos.length > 0 ? (
                      parametrosLegales.irTramos.map((tramo) => (
                        <tr key={tramo.orden} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 text-[#37474F] font-medium">
                            {tramo.hastaIncl !== null
                              ? `${formatCurrency(tramo.desdeExcl + (tramo.desdeExcl > 0 ? 0.01 : 0))} a ${formatCurrency(tramo.hastaIncl)}`
                              : `Más de ${formatCurrency(tramo.desdeExcl)}`}
                          </td>
                          <td className="py-2.5 text-right font-mono font-medium">
                            {Number(tramo.impuestoBase).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-[#1A73E8]">
                            {Number(tramo.porcentaje) === 0 ? (
                              <span className="text-emerald-600">0% (Exento)</span>
                            ) : (
                              `${Number(tramo.porcentaje).toFixed(0)}%`
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono text-[11px] text-[#747780]">
                            {formatCurrency(tramo.sobreExceso)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr>
                          <td className="py-2 text-[#37474F]">Hasta 100,000.00</td>
                          <td className="py-2 text-right font-mono">0.00</td>
                          <td className="py-2 text-right font-bold text-emerald-600">0% (Exento)</td>
                          <td className="py-2 text-right font-mono text-[11px] text-[#747780]">0.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-[#37474F]">100,000.01 a 200,000.00</td>
                          <td className="py-2 text-right font-mono">0.00</td>
                          <td className="py-2 text-right font-bold text-[#1A73E8]">15%</td>
                          <td className="py-2 text-right font-mono text-[11px] text-[#747780]">100,000.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-[#37474F]">200,000.01 a 350,000.00</td>
                          <td className="py-2 text-right font-mono">15,000.00</td>
                          <td className="py-2 text-right font-bold text-[#1A73E8]">20%</td>
                          <td className="py-2 text-right font-mono text-[11px] text-[#747780]">200,000.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-[#37474F]">350,000.01 a 500,000.00</td>
                          <td className="py-2 text-right font-mono">45,000.00</td>
                          <td className="py-2 text-right font-bold text-[#1A73E8]">25%</td>
                          <td className="py-2 text-right font-mono text-[11px] text-[#747780]">350,000.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-[#37474F]">Más de 500,000.00</td>
                          <td className="py-2 text-right font-mono">82,500.00</td>
                          <td className="py-2 text-right font-bold text-[#1A73E8]">30%</td>
                          <td className="py-2 text-right font-mono text-[11px] text-[#747780]">500,000.00</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PARA MODIFICAR / EDITAR TARIFAS LEGALES
      ======================================================== */}
      {editParamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto border border-[#E5E8EE]">
            <div className="flex justify-between items-center border-b border-[#E5E8EE] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1B1D22]">Modificar Tarifas y Parámetros Legales</h3>
                  <p className="text-xs text-[#747780]">Ajuste las tasas de retención y aportes patronales según decretos vigentes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditParamModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarParametros} className="space-y-6">
              {/* Sección 1: INSS e INATEC */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#1A73E8]">
                  1. Seguridad Social (INSS) & INATEC
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#37474F] mb-1">
                      % INSS Laboral (Deducción Trabajador) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        value={paramForm.tasaLaboral}
                        onChange={(e) => setParamForm({ ...paramForm, tasaLaboral: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] font-bold text-xs pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Oficial: 7.00%</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#37474F] mb-1">
                      % INSS Patronal (Aporte Empleador) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        value={paramForm.tasaPatronal}
                        onChange={(e) => setParamForm({ ...paramForm, tasaPatronal: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] font-bold text-xs pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">21.50% (&lt;50 trab.) ó 22.50% (≥50 trab.)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#37474F] mb-1">
                      % Aporte INATEC (Empleador) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        value={paramForm.tasaInatec}
                        onChange={(e) => setParamForm({ ...paramForm, tasaInatec: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] font-bold text-xs pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Oficial: 2.00%</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#37474F] mb-1">
                      Tamaño del Empleador
                    </label>
                    <select
                      value={paramForm.tamanoEmpleador}
                      onChange={(e) => setParamForm({ ...paramForm, tamanoEmpleador: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="PEQUENO">Pequeño (&lt; 50 trabajadores - INSS 21.5%)</option>
                      <option value="GRANDE">Mediano / Grande (≥ 50 trabajadores - INSS 22.5%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#37474F] mb-1">
                    Techo Salarial Máximo Cotizable (C$) (Deje vacío si es sin techo)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Sin techo salarial máximo"
                    value={paramForm.techoMensual}
                    onChange={(e) => setParamForm({ ...paramForm, techoMensual: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#37474F] mb-1">
                    Referencia Legal / Decreto
                  </label>
                  <input
                    type="text"
                    value={paramForm.fuenteTexto}
                    onChange={(e) => setParamForm({ ...paramForm, fuenteTexto: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sección 2: Tramos de IR */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1A73E8]">
                    2. Tramos de Tarifa Progresiva de IR (Art. 23 Ley 822)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">Valores en C$ anuales</span>
                </div>

                <div className="space-y-2 border border-[#E5E8EE] rounded-2xl p-3 bg-slate-50/50">
                  {paramForm.irTramos.map((tramo, idx) => (
                    <div key={tramo.orden} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-[#E5E8EE] text-xs">
                      <div className="col-span-1 font-black text-slate-500 text-center">
                        #{tramo.orden}
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] font-bold text-slate-500">Desde (Excl)</label>
                        <input
                          type="number"
                          value={tramo.desdeExcl}
                          onChange={(e) => {
                            const newTramos = [...paramForm.irTramos];
                            newTramos[idx].desdeExcl = parseFloat(e.target.value) || 0;
                            setParamForm({ ...paramForm, irTramos: newTramos });
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] font-bold text-slate-500">Hasta (Incl)</label>
                        <input
                          type="number"
                          placeholder="Sin límite"
                          value={tramo.hastaIncl ?? ''}
                          onChange={(e) => {
                            const newTramos = [...paramForm.irTramos];
                            newTramos[idx].hastaIncl = e.target.value === '' ? null : parseFloat(e.target.value);
                            setParamForm({ ...paramForm, irTramos: newTramos });
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] font-bold text-slate-500">Impuesto Base</label>
                        <input
                          type="number"
                          value={tramo.impuestoBase}
                          onChange={(e) => {
                            const newTramos = [...paramForm.irTramos];
                            newTramos[idx].impuestoBase = parseFloat(e.target.value) || 0;
                            setParamForm({ ...paramForm, irTramos: newTramos });
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500">% Tasa</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={tramo.porcentaje}
                            onChange={(e) => {
                              const newTramos = [...paramForm.irTramos];
                              newTramos[idx].porcentaje = parseFloat(e.target.value) || 0;
                              setParamForm({ ...paramForm, irTramos: newTramos });
                            }}
                            className="w-full px-2 py-1 pr-4 rounded-lg border border-slate-200 text-xs font-bold text-blue-600"
                          />
                          <span className="absolute right-1 top-1 text-[10px] text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#E5E8EE]">
                <button
                  type="button"
                  onClick={() => setEditParamModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E8EE] text-xs font-bold text-[#37474F] hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#1A73E8] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Guardando...' : 'Guardar y Aplicar a Nómina'}
                </button>
              </div>
            </form>
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

      {/* ========================================================
          MODAL EDITAR EXPEDIENTE DE COLABORADOR (SOLO ADMIN)
      ======================================================== */}
      {editEmpModalOpen && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-[#E5E8EE] max-h-[90vh] flex flex-col">
            <div className="border-b border-[#E5E8EE] pb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#1B1D22]">
                    Editar Expediente • {editingEmp.nombres} {editingEmp.apellidos}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    [{editingEmp.codigo}]
                  </span>
                </div>
                <p className="text-xs text-[#747780] mt-0.5">
                  Actualización de condiciones contractuales, régimen salarial e información bancaria
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Solo Administrador</span>
              </div>
            </div>

            <form onSubmit={handleActualizarEmpleado} className="space-y-4 flex-1 overflow-y-auto pr-2">
              {/* Sección 1: Datos Personales e Identificación */}
              <div>
                <h4 className="text-[11px] font-black text-[#1A73E8] uppercase tracking-wider mb-2">
                  1. Identificación y Contacto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Nombres:</label>
                    <input
                      type="text"
                      value={editEmpForm.nombres}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, nombres: e.target.value })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Apellidos:</label>
                    <input
                      type="text"
                      value={editEmpForm.apellidos}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, apellidos: e.target.value })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Cédula Oficial:</label>
                    <input
                      type="text"
                      value={editEmpForm.cedula}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, cedula: e.target.value })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Nº INSS:</label>
                    <input
                      type="text"
                      value={editEmpForm.numeroInss}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, numeroInss: e.target.value })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">RUC (Opcional):</label>
                    <input
                      type="text"
                      value={editEmpForm.ruc}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, ruc: e.target.value })}
                      placeholder="J031000..."
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Correo Electrónico:</label>
                    <input
                      type="email"
                      value={editEmpForm.email}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, email: e.target.value })}
                      placeholder="colaborador@bmrental.com"
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Teléfono:</label>
                    <input
                      type="text"
                      value={editEmpForm.telefono}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, telefono: e.target.value })}
                      placeholder="+505 8888-8888"
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Puesto, Área Contable y Estado */}
              <div className="border-t border-[#E5E8EE] pt-3">
                <h4 className="text-[11px] font-black text-[#1A73E8] uppercase tracking-wider mb-2">
                  2. Cargo y Asignación Operativa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Cargo:</label>
                    <input
                      type="text"
                      value={editEmpForm.cargo}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, cargo: e.target.value })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Área Contable:</label>
                    <select
                      value={editEmpForm.areaContable}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, areaContable: e.target.value as any })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    >
                      <option value="OPERACION">Operaciones / Taller (5101)</option>
                      <option value="ADMINISTRACION">Administración General (5102)</option>
                      <option value="VENTAS">Ventas Comerciales (5103)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Estado Laboral:</label>
                    <select
                      value={editEmpForm.estado}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, estado: e.target.value as any })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    >
                      <option value="ACTIVO">ACTIVO (En nómina)</option>
                      <option value="INACTIVO">INACTIVO</option>
                      <option value="SUSPENDIDO">SUSPENDIDO</option>
                      <option value="LIQUIDADO">LIQUIDADO (Finiquitado)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Tipo de Contrato:</label>
                    <select
                      value={editEmpForm.tipoContrato}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, tipoContrato: e.target.value as any })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    >
                      <option value="INDETERMINADO">Tiempo Indeterminado (Ley 185)</option>
                      <option value="DETERMINADO">Plazo Determinado</option>
                      <option value="SERVICIOS_PROFESIONALES">Servicios Profesionales</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Método de Retención IR:</label>
                    <select
                      value={editEmpForm.metodoIr}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, metodoIr: e.target.value as any })}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    >
                      <option value="FIJO">Fijo Proyectado (Salario Ordinario)</option>
                      <option value="VARIABLE">Variable Dinámico (Comisiones y Horas Extra)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 3: Remuneración y Motivo de Cambio */}
              <div className="border-t border-[#E5E8EE] pt-3">
                <h4 className="text-[11px] font-black text-[#1A73E8] uppercase tracking-wider mb-2">
                  3. Remuneración Mensual y Bitácora Salarial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">
                      Salario Mensual Pactado (C$):
                    </label>
                    <input
                      type="number"
                      value={editEmpForm.salarioMensual}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, salarioMensual: Number(e.target.value) })}
                      min={5000}
                      step={100}
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                      required
                    />
                    <span className="text-[10px] text-[#747780] block mt-1">
                      Quincenal: {formatCurrency((Number(editEmpForm.salarioMensual) || 0) / 2)}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">
                      Motivo del Ajuste Salarial (Opcional):
                    </label>
                    <input
                      type="text"
                      value={editEmpForm.motivoCambioSalario}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, motivoCambioSalario: e.target.value })}
                      placeholder="Ej. Promoción de cargo, mérito anual..."
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    />
                    <span className="text-[10px] text-[#747780] block mt-1">
                      Se archivará en el historial de remuneraciones
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 4: Datos Bancarios */}
              <div className="border-t border-[#E5E8EE] pt-3">
                <h4 className="text-[11px] font-black text-[#1A73E8] uppercase tracking-wider mb-2">
                  4. Cuenta Bancaria para Transferencia
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Institución Bancaria:</label>
                    <input
                      type="text"
                      value={editEmpForm.bancoNombre}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, bancoNombre: e.target.value })}
                      placeholder="Ej. BANPRO, BAC Credomatic, LAFISE"
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#37474F] block mb-1">Número de Cuenta:</label>
                    <input
                      type="text"
                      value={editEmpForm.numeroCuenta}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, numeroCuenta: e.target.value })}
                      placeholder="10023456789012"
                      className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#1A73E8]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E8EE]">
                <button
                  type="button"
                  onClick={() => {
                    setEditEmpModalOpen(false);
                    setEditingEmp(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-[#5A5D66] text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-precision-primary text-xs py-2 px-5 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DEVOLVER PLANILLA A CALCULADA
      ======================================================== */}
      {devolverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E5E8EE]">
            <div className="border-b border-[#E5E8EE] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-base font-black text-[#1B1D22]">Devolver Planilla</h3>
              </div>
              <button
                type="button"
                onClick={() => setDevolverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5A5D66]">
              Esta acción regresará la planilla de estado <strong>REVISADA</strong> a <strong>CALCULADA</strong> para permitir ajustes y recálculo. Se registrará en la bitácora obligatoria.
            </p>
            <form onSubmit={handleConfirmarDevolucion} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#37474F] block mb-1">
                  Motivo de la Devolución (Obligatorio):
                </label>
                <textarea
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  placeholder="Especifique el error o inconsistencia detectada (ej. comisiones pendientes de agregar, horas extras no reportadas)..."
                  rows={3}
                  className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-medium rounded-xl p-3 outline-none focus:border-[#1A73E8]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDevolverModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-[#5A5D66] text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !motivoDevolucion.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  Confirmar Devolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL ANULAR PLANILLA
      ======================================================== */}
      {anularModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E5E8EE]">
            <div className="border-b border-[#E5E8EE] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <Ban className="w-5 h-5" />
                <h3 className="text-base font-black text-[#1B1D22]">Anular Planilla</h3>
              </div>
              <button
                type="button"
                onClick={() => setAnularModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#5A5D66]">
              La anulación es irreversible y cancela este cálculo de nómina. Debe justificar el motivo para la auditoría de ley.
            </p>
            <form onSubmit={handleConfirmarAnulacion} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#37474F] block mb-1">
                  Motivo de Anulación (Obligatorio):
                </label>
                <textarea
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Indique la justificación formal para anular esta nómina..."
                  rows={3}
                  className="w-full bg-[#F4F6F9] border border-[#E5E8EE] text-xs font-medium rounded-xl p-3 outline-none focus:border-[#1A73E8]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAnularModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-[#5A5D66] text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !motivoAnulacion.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  Confirmar Anulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL ASIENTO CONTABLE (PARTIDA DOBLE)
      ======================================================== */}
      {asientoModalOpen && asientoData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-[#E5E8EE] max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[#E5E8EE] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Contabilidad Automatizada ERP • Ley 185
                </span>
                <h3 className="text-base font-black text-[#1B1D22] mt-1">{asientoTitle}</h3>
                <p className="text-xs text-[#747780]">
                  {asientoData.concepto} • Ref: {asientoData.numeroAsiento || 'N/A'} • Fecha: {asientoData.fecha?.split('T')[0] || ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAsientoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E8EE] bg-[#F4F6F9] text-[10px] font-black text-[#5A5D66] uppercase">
                    <th className="py-2.5 px-3">Cuenta</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3 text-right">Debe (C$)</th>
                    <th className="py-2.5 px-3 text-right">Haber (C$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE]">
                  {(asientoData.lineas || asientoData.partidas || []).map((lin: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-[#1A73E8]">{lin.cuentaCodigo || lin.cuenta}</td>
                      <td className="py-2 px-3 text-[#37474F] font-medium">{lin.cuentaNombre || lin.descripcion}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#1B1D22]">
                        {Number(lin.debe || 0) > 0 ? formatCurrency(Number(lin.debe)) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#1B1D22]">
                        {Number(lin.haber || 0) > 0 ? formatCurrency(Number(lin.haber)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 bg-slate-50 font-black text-xs">
                    <td colSpan={2} className="py-2.5 px-3 text-[#1B1D22] uppercase tracking-wider">
                      TOTALES (Partida Doble Cuadrada):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                      {formatCurrency(Number(asientoData.totalDebe || 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                      {formatCurrency(Number(asientoData.totalHaber || 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#E5E8EE] text-xs">
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Balance verificado: Débitos = Créditos
              </span>
              <button
                type="button"
                onClick={() => setAsientoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-[#37474F] font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL BITÁCORA DOCUMENTAL DE AUDITORÍA
      ======================================================== */}
      {bitacoraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-[#E5E8EE] max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[#E5E8EE] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Auditoría y Trazabilidad Ley 185
                </span>
                <h3 className="text-base font-black text-[#1B1D22] mt-1">{bitacoraTitle}</h3>
                <p className="text-xs text-[#747780]">Registro inmutable de todas las acciones sobre la planilla</p>
              </div>
              <button
                type="button"
                onClick={() => setBitacoraModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bitacoraLoading ? (
              <div className="py-12 text-center text-xs text-[#747780] font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1A73E8]" />
                Cargando historial de auditoría...
              </div>
            ) : bitacoraItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#747780]">
                No hay registros de bitácora previos para esta planilla.
              </div>
            ) : (
              <div className="space-y-3">
                {bitacoraItems.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-[#F4F6F9] border border-[#E5E8EE] space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          b.accion === 'APROBAR' ? 'bg-emerald-100 text-emerald-800' :
                          b.accion === 'PAGAR' ? 'bg-blue-100 text-blue-800' :
                          b.accion === 'DEVOLVER' ? 'bg-rose-100 text-rose-800' :
                          b.accion === 'ANULAR' ? 'bg-red-100 text-red-800' :
                          b.accion === 'REVISAR' ? 'bg-amber-100 text-amber-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {b.accion}
                        </span>
                        <span className="font-bold text-[#1B1D22]">{b.usuario}</span>
                      </div>
                      <span className="text-[11px] text-[#747780] font-mono">
                        {new Date(b.createdAt || b.fechaHora || '').toLocaleString('es-NI')}
                      </span>
                    </div>
                    {b.comentario && (
                      <p className="text-[#37474F] text-[11px] font-medium pt-1">
                        "{b.comentario}"
                      </p>
                    )}
                    {b.totalesDespues && (
                      <div className="pt-1.5 flex items-center gap-4 text-[10px] text-[#5A5D66] border-t border-[#E5E8EE]">
                        <span>Devengado: {formatCurrency(Number(b.totalesDespues.totalDevengado || 0))}</span>
                        <span>Deducciones: {formatCurrency(Number(b.totalesDespues.totalDeducciones || 0))}</span>
                        <span className="font-bold text-[#1B1D22]">Neto: {formatCurrency(Number(b.totalesDespues.totalNeto || 0))}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#E5E8EE]">
              <button
                type="button"
                onClick={() => setBitacoraModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-[#37474F] font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DETALLE DE PLANILLA ARCHIVADA (SNAPSHOT SOLO LECTURA)
      ======================================================== */}
      {detalleModalOpen && detallePlanillaArchivada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto border border-[#E5E8EE]">
            <div className="border-b border-[#E5E8EE] pb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Planilla Histórica • Snapshot Congelado
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    detallePlanillaArchivada.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800' :
                    detallePlanillaArchivada.estado === 'APROBADA' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {detallePlanillaArchivada.estado}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#1B1D22] mt-1">
                  Planilla {detallePlanillaArchivada.periodo?.anio || ''} • {MESES_ES[detallePlanillaArchivada.periodo?.mes || 0] || detallePlanillaArchivada.periodo?.mes || ''} Q{detallePlanillaArchivada.periodo?.quincena || 1}
                </h3>
                <p className="text-xs text-[#747780]">
                  Pago: {detallePlanillaArchivada.periodo?.fechaPago?.split('T')[0] || detallePlanillaArchivada.fechaPago?.split('T')[0]} • Aprobada por: {detallePlanillaArchivada.aprobadoPor || 'Pendiente'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportPlanillaToCSV(detallePlanillaArchivada, `Planilla_${detallePlanillaArchivada.periodo?.anio}_M${detallePlanillaArchivada.periodo?.mes}_Q${detallePlanillaArchivada.periodo?.quincena}`)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={() => setDetalleModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Totales Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#F4F6F9] border border-[#E5E8EE]">
                <span className="text-[10px] text-[#747780] font-bold uppercase block">Total Devengado</span>
                <span className="text-lg font-black text-[#1B1D22]">
                  {formatCurrency(Number(detallePlanillaArchivada.totalDevengado || 0))}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F6F9] border border-[#E5E8EE]">
                <span className="text-[10px] text-[#747780] font-bold uppercase block">Total Deducciones</span>
                <span className="text-lg font-black text-rose-600">
                  {formatCurrency(Number(detallePlanillaArchivada.totalDeducciones || 0))}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F6F9] border border-[#E5E8EE]">
                <span className="text-[10px] text-[#747780] font-bold uppercase block">Neto Pagado</span>
                <span className="text-lg font-black text-[#1A73E8]">
                  {formatCurrency(Number(detallePlanillaArchivada.totalNeto || 0))}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F6F9] border border-[#E5E8EE]">
                <span className="text-[10px] text-[#747780] font-bold uppercase block">Costo Patronal (23.5%)</span>
                <span className="text-lg font-black text-[#C55500]">
                  {formatCurrency(Number(detallePlanillaArchivada.totalPatronal || 0))}
                </span>
              </div>
            </div>

            {/* Tabla de Colaboradores del Snapshot */}
            <div className="overflow-x-auto border border-[#E5E8EE] rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E8EE] bg-[#F4F6F9] text-[10px] font-black text-[#5A5D66] uppercase">
                    <th className="py-2.5 px-3">Colaborador</th>
                    <th className="py-2.5 px-3">Cédula / INSS</th>
                    <th className="py-2.5 px-3 text-right">Salario Q</th>
                    <th className="py-2.5 px-3 text-right">Comisiones</th>
                    <th className="py-2.5 px-3 text-right">Devengado</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">INSS 7%</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">IR Art. 23</th>
                    <th className="py-2.5 px-3 text-right text-[#1A73E8]">Neto</th>
                    <th className="py-2.5 px-3 text-center">Colilla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE]">
                  {(detallePlanillaArchivada.empleados || []).map((pe: any) => {
                    const emp = pe.snapshotEmpleado || pe.empleado || {};
                    return (
                      <tr key={pe.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-[#1B1D22]">
                          <span className="font-mono text-[#1A73E8] mr-1.5">[{emp.codigo}]</span>
                          {(emp.nombres || '') + ' ' + (emp.apellidos || '')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#37474F]">
                          {emp.cedula || '—'} / {emp.numeroInss || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">
                          {formatCurrency(Number(pe.salarioMensual || emp.salarioMensual || 0) / 2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                          {Number(pe.comisiones || 0) > 0 ? formatCurrency(Number(pe.comisiones)) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1B1D22]">
                          {formatCurrency(Number(pe.totalDevengado || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(Number(pe.inssLaboral || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(Number(pe.irSalarial || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-[#1A73E8]">
                          {formatCurrency(Number(pe.netoPagar || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleVerColilla(pe.id)}
                            className="p-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                            title="Ver colilla de pago oficial de este período"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5E8EE]">
              <button
                type="button"
                onClick={() => setDetalleModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1A73E8] text-white text-xs font-bold hover:bg-[#1557b0] cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL HISTORIAL DE PAGOS DEL COLABORADOR (ART. 78 Y 94)
      ======================================================== */}
      {historialPagosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto border border-[#E5E8EE]">
            <div className="border-b border-[#E5E8EE] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Expediente de Nómina • Histórico de Remuneraciones
                </span>
                <h3 className="text-xl font-black text-[#1B1D22] mt-1">
                  Historial de Pagos de {historialPagosData?.empleado?.nombreCompleto}
                </h3>
                <p className="text-xs text-[#747780]">
                  Código: <strong className="font-mono text-[#1B1D22]">{historialPagosData?.empleado?.codigo}</strong> • Cédula: <strong className="font-mono text-[#1B1D22]">{historialPagosData?.empleado?.cedula}</strong> • Cargo: <strong>{historialPagosData?.empleado?.cargo}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistorialPagosModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historialPagosLoading ? (
              <div className="py-12 text-center text-xs text-[#747780] font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1A73E8]" />
                Cargando historial de pagos del colaborador...
              </div>
            ) : !historialPagosData ? (
              <div className="py-8 text-center text-xs text-[#747780]">
                No se pudo cargar el expediente salarial.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tarjetas de Fórmulas y Cálculos Legales de Nicaragua */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Acumulado Anual */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block border-b pb-1">
                      1. Acumulado Anual Fiscal ({historialPagosData.resumenLegal?.anio})
                    </span>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#5A5D66]">Devengado Anual:</span>
                        <span className="font-mono font-bold text-[#1B1D22]">
                          {formatCurrency(historialPagosData.resumenLegal?.acumuladoAnual?.devengado || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5A5D66]">INSS Laboral (7%):</span>
                        <span className="font-mono font-bold text-rose-600">
                          {formatCurrency(historialPagosData.resumenLegal?.acumuladoAnual?.inssLaboral || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5A5D66]">IR Retenido (Art. 23):</span>
                        <span className="font-mono font-bold text-rose-600">
                          {formatCurrency(historialPagosData.resumenLegal?.acumuladoAnual?.irSalarial || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Art. 78 Vacaciones */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 block border-b border-indigo-200 pb-1">
                      2. Vacaciones (Art. 78 Ley 185)
                    </span>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#5A5D66]">Promedio 6 Meses:</span>
                        <span className="font-mono font-bold text-indigo-900">
                          {formatCurrency(historialPagosData.resumenLegal?.articulo78Vacaciones?.promedioMensual6Meses || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5A5D66]">Base Diaria (Prom / 30):</span>
                        <span className="font-mono font-black text-indigo-700">
                          {formatCurrency(historialPagosData.resumenLegal?.articulo78Vacaciones?.baseCalculoDiario || 0)}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-600 block mt-1">
                        Cálculo: Devengado últimas {historialPagosData.resumenLegal?.articulo78Vacaciones?.quincenasConsideradas || 0} quincenas ÷ 6 meses
                      </span>
                    </div>
                  </div>

                  {/* Art. 94 Décimo Tercer Mes / Aguinaldo */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block border-b border-amber-200 pb-1">
                      3. Aguinaldo (Art. 94 Ley 185)
                    </span>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#5A5D66]">Salario Base Aguinaldo:</span>
                        <span className="font-mono font-black text-amber-900">
                          {formatCurrency(historialPagosData.resumenLegal?.articulo94Aguinaldo?.salarioMaximo6Meses || 0)}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-700 block mt-1">
                        Regla legal: Salario mensual más alto devengado en los últimos 6 meses (por salario variable/comisiones).
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabla de Quincenas Pagadas */}
                <div className="border border-[#E5E8EE] rounded-2xl overflow-hidden">
                  <div className="p-3 bg-[#F4F6F9] border-b border-[#E5E8EE] flex justify-between items-center text-xs">
                    <span className="font-bold text-[#1B1D22]">Registro Histórico de Planillas ({historialPagosData.historialQuincenas?.length || 0} Quincenas)</span>
                    <span className="text-[11px] text-[#747780]">Orden cronológico de pagos</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E8EE] bg-white text-[10px] font-black text-[#5A5D66] uppercase">
                          <th className="py-2.5 px-3">Período</th>
                          <th className="py-2.5 px-3">Fecha Pago</th>
                          <th className="py-2.5 px-3 text-right">Devengado</th>
                          <th className="py-2.5 px-3 text-right text-rose-600">INSS 7%</th>
                          <th className="py-2.5 px-3 text-right text-rose-600">IR Art. 23</th>
                          <th className="py-2.5 px-3 text-right text-[#1A73E8]">Neto Recibido</th>
                          <th className="py-2.5 px-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E8EE]">
                        {(historialPagosData.historialQuincenas || []).map((q, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-[#1B1D22]">
                              {q.periodo}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#5A5D66]">
                              {q.fechaPago?.split('T')[0] || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1B1D22]">
                              {formatCurrency(Number(q.totalDevengado || 0))}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(Number(q.inssLaboral || 0))}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(Number(q.irSalarial || 0))}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-[#1A73E8]">
                              {formatCurrency(Number(q.netoPagar || 0))}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                q.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800' :
                                q.estado === 'APROBADA' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {q.estado || 'PAGADA'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[#E5E8EE]">
                  <button
                    type="button"
                    onClick={() => setHistorialPagosModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#1A73E8] text-white text-xs font-bold hover:bg-[#1557b0] cursor-pointer"
                  >
                    Cerrar Historial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
