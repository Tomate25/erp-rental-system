import React, { useState, useMemo } from 'react';
import type { SolicitudDespacho, SolicitudRetorno } from '../services/operations.api';
import { EmptyState } from '../../../shared/components/EmptyState';
import { KpiCard } from '../../../shared/components/KpiCard';
import { FilterTabs } from '../../../shared/components/FilterTabs';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Modal } from '../../../shared/components/Modal';
import { 
  Search, 
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Truck,
  RotateCcw,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

export interface ContractItemProgress {
  equipoId: string;
  nombre: string;
  serial?: string;
  total: number;
  procesadas: number;
  pendientes: number;
}

export interface OperationTask {
  id: string;
  tipo: 'DESPACHADO' | 'RETORNO';
  fechaStr: string;
  horaStr: string;
  fechaCompletaStr?: string;
  equipoNombre: string;
  cantidad?: number;
  totalContratoUnidades: number;
  totalProcesadasUnidades: number;
  totalPendientesUnidades: number;
  fletesRealizados: number;
  esParcial: boolean;
  items: ContractItemProgress[];
  clienteNombre: string;
  ubicacionObra?: string;
  codigoContrato: string;
  periodoColumna: 'SIN_FECHA' | 'VENCIDO' | 'HOY' | 'MANANA' | 'ESTA_SEMANA' | 'PROXIMOS';
  rawContract?: any;
  scheduledDate?: string;
  isOverdue?: boolean;
}

interface OperationsBoardProps {
  contracts?: any[];
  despachos?: any[];
  retornos?: any[];
  solicitudesDespacho?: SolicitudDespacho[];
  solicitudesRetorno?: SolicitudRetorno[];
  onProcessDespacho: (contract: any) => void;
  onProcessRetorno: (contract: any) => void;
  onScheduleDespacho?: (contract: any, date: string, time?: string) => Promise<void>;
  onScheduleRetorno?: (contract: any, date: string, time?: string) => Promise<void>;
}

export const OperationsBoard: React.FC<OperationsBoardProps> = ({
  contracts = [],
  despachos = [],
  retornos = [],
  solicitudesDespacho = [],
  solicitudesRetorno = [],
  onProcessDespacho,
  onProcessRetorno,
  onScheduleDespacho,
  onScheduleRetorno,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'DESPACHO' | 'RETORNO'>('DESPACHO');
  const [periodoFilter, setPeriodoFilter] = useState<'TODOS' | 'HOY' | 'PARCIALES' | 'PROXIMOS' | 'VENCIDOS'>('TODOS');

  // Procesamiento de tareas operativas pendientes de patio
  const realTasks: OperationTask[] = [];

  const schedule = (dateValue?: string | null) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const days = Math.round((compareDate.getTime() - today.getTime()) / 86400000);

    let periodoColumna: OperationTask['periodoColumna'];
    let fechaStr: string;
    let isOverdue = false;

    if (days < 0) {
      periodoColumna = 'VENCIDO';
      fechaStr = `Vencido (${Math.abs(days)}d)`;
      isOverdue = true;
    } else if (days === 0) {
      periodoColumna = 'HOY';
      fechaStr = 'Hoy';
    } else if (days === 1) {
      periodoColumna = 'MANANA';
      fechaStr = 'Mañana';
    } else if (days <= 7) {
      periodoColumna = 'ESTA_SEMANA';
      fechaStr = date.toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short' });
    } else {
      periodoColumna = 'PROXIMOS';
      fechaStr = date.toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    const rawHours = date.getHours();
    const rawMinutes = date.getMinutes();
    const hasSpecificTime = !(rawHours === 0 && rawMinutes === 0) && !(rawHours === 12 && rawMinutes === 0);
    const horaStr = date.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fechaCompletaStr = date.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return {
      periodoColumna,
      fechaStr,
      horaStr: hasSpecificTime ? horaStr : (dateValue.includes('T') && !dateValue.includes('T00:00:00') ? horaStr : ''),
      fechaCompletaStr,
      isOverdue,
    };
  };

  contracts.filter(c => ['ACTIVO', 'SIN_ABRIR'].includes(c.estado)).forEach(c => {
    const solicitud = solicitudesDespacho.find(s =>
      s.contratoId === c.id && !['COMPLETADA', 'CANCELADA', 'RECHAZADA'].includes(s.estado)
    );

    const contractDespachos = despachos.filter(d => (d.contratoId || d.contrato?.id) === c.id);
    const contractRetornos = retornos.filter(r => (r.contratoId || r.contrato?.id) === c.id);

    const itemsProgress: Array<{
      equipoId: string;
      nombre: string;
      serial: string;
      total: number;
      sent: number;
      received: number;
      pendingDispatch: number;
      pendingReturn: number;
    }> = [];

    (c.items || []).forEach((item: any) => {
      const equipoId = item.equipoId || item.equipo?.id || item.id;
      if (!equipoId) return;

      const sent = contractDespachos
        .flatMap(d => d.items || [])
        .filter(di => (di.equipoId || di.equipo?.id) === equipoId)
        .reduce((sum, di) => sum + (Number(di.cantidad) || 1), 0);

      const received = contractRetornos
        .flatMap(r => r.items || [])
        .filter(ri => (ri.equipoId || ri.equipo?.id) === equipoId)
        .reduce((sum, ri) => sum + (Number(ri.cantidadRetornada) || 0) + (Number(ri.cantidadPerdida) || 0), 0);

      const itemTotal = Number(item.cantidad) || 1;
      const pendingDispatch = Math.max(0, itemTotal - sent);
      const pendingReturn = Math.max(0, sent - received);

      const name = item.equipo?.modelo || item.descripcion || 'Equipo de renta';
      const serial = item.equipo?.numeroSerie ? ` (S/N: ${item.equipo.numeroSerie})` : '';

      itemsProgress.push({
        equipoId,
        nombre: name,
        serial,
        total: itemTotal,
        sent,
        received,
        pendingDispatch,
        pendingReturn,
      });
    });

    const itemsWithPendingDispatch = itemsProgress.filter(it => it.pendingDispatch > 0);
    const itemsWithPendingReturn = itemsProgress.filter(it => it.pendingReturn > 0);

    // 1. Tarea agrupada de Salida (Despacho): una sola tarjeta por contrato
    if (itemsWithPendingDispatch.length > 0) {
      const fechaSalida = solicitud?.fechaProgramada || c.fechaInicio;
      const due = schedule(fechaSalida) || {
        periodoColumna: 'SIN_FECHA' as const,
        fechaStr: 'Pendiente',
        horaStr: '',
        fechaCompletaStr: '',
        isOverdue: false,
      };

      const totalContrato = itemsProgress.reduce((s, it) => s + it.total, 0);
      const totalSalieron = itemsProgress.reduce((s, it) => s + it.sent, 0);
      const totalPendientes = itemsWithPendingDispatch.reduce((s, it) => s + it.pendingDispatch, 0);
      const esParcial = totalSalieron > 0;

      let equipoNombre: string;
      if (itemsWithPendingDispatch.length === 1) {
        const it = itemsWithPendingDispatch[0];
        equipoNombre = `${it.pendingDispatch}x ${it.nombre}${it.serial}`;
      } else {
        equipoNombre = `${itemsWithPendingDispatch.length} tipos de equipos (${totalPendientes} u. pendientes de salida)`;
      }

      realTasks.push({
        id: `salida-${c.id}`,
        tipo: 'DESPACHADO',
        ...due,
        equipoNombre,
        cantidad: totalPendientes,
        totalContratoUnidades: totalContrato,
        totalProcesadasUnidades: totalSalieron,
        totalPendientesUnidades: totalPendientes,
        fletesRealizados: contractDespachos.length,
        esParcial,
        items: itemsWithPendingDispatch.map(it => ({
          equipoId: it.equipoId,
          nombre: it.nombre,
          serial: it.serial,
          total: it.total,
          procesadas: it.sent,
          pendientes: it.pendingDispatch,
        })),
        clienteNombre: c.cliente?.nombre || 'Cliente',
        ubicacionObra: c.cliente?.direccion,
        codigoContrato: c.codigo,
        rawContract: c,
        scheduledDate: fechaSalida,
      });
    }

    // 2. Tarea agrupada de Retorno: una sola tarjeta por contrato si hay unidades en obra
    if (itemsWithPendingReturn.length > 0) {
      const solicitudRet = solicitudesRetorno.find(s =>
        s.contratoId === c.id && !['COMPLETADA', 'CANCELADA', 'RECHAZADA'].includes(s.estado)
      );
      const fechaRetorno = solicitudRet?.fechaProgramada || c.fechaFinPactada || c.fechaFin;
      const due = schedule(fechaRetorno) || {
        periodoColumna: 'SIN_FECHA' as const,
        fechaStr: 'Pendiente',
        horaStr: '',
        fechaCompletaStr: '',
        isOverdue: false,
      };

      const totalContrato = itemsProgress.reduce((s, it) => s + it.total, 0);
      const totalEnObra = itemsProgress.reduce((s, it) => s + it.sent, 0);
      const totalRetornadas = itemsProgress.reduce((s, it) => s + it.received, 0);
      const totalPendientes = itemsWithPendingReturn.reduce((s, it) => s + it.pendingReturn, 0);
      const esParcial = totalRetornadas > 0;

      let equipoNombre: string;
      if (itemsWithPendingReturn.length === 1) {
        const it = itemsWithPendingReturn[0];
        equipoNombre = `${it.pendingReturn}x ${it.nombre}${it.serial}`;
      } else {
        equipoNombre = `${itemsWithPendingReturn.length} tipos de equipos (${totalPendientes} u. en obra)`;
      }

      realTasks.push({
        id: `retorno-${c.id}`,
        tipo: 'RETORNO',
        ...due,
        equipoNombre,
        cantidad: totalPendientes,
        totalContratoUnidades: totalEnObra || totalContrato,
        totalProcesadasUnidades: totalRetornadas,
        totalPendientesUnidades: totalPendientes,
        fletesRealizados: contractRetornos.length,
        esParcial,
        items: itemsWithPendingReturn.map(it => ({
          equipoId: it.equipoId,
          nombre: it.nombre,
          serial: it.serial,
          total: it.sent,
          procesadas: it.received,
          pendientes: it.pendingReturn,
        })),
        clienteNombre: c.cliente?.nombre || 'Cliente',
        ubicacionObra: c.cliente?.direccion,
        codigoContrato: c.codigo,
        rawContract: c,
        scheduledDate: fechaRetorno,
      });
    }
  });

  const allTasks = realTasks;

  // Cálculo de KPIs Consolidados de Patio
  const kpiStats = useMemo(() => {
    let faltanPorSalir = 0;
    let totalContrato = 0;
    let salidasHoyCount = 0;
    let vencidasCount = 0;
    let retornosPendientes = 0;

    for (const t of allTasks) {
      if (t.tipo === 'DESPACHADO') {
        faltanPorSalir += t.totalPendientesUnidades;
        totalContrato += t.totalContratoUnidades;
        if (t.periodoColumna === 'HOY') {
          salidasHoyCount++;
        }
        if (t.isOverdue) vencidasCount++;
      } else {
        retornosPendientes += t.totalPendientesUnidades;
      }
    }

    // Incluir también contratos totalmente despachados, que ya no generan tarjeta de salida.
    const activeContractIds = new Set(contracts.filter(c => ['ACTIVO', 'SIN_ABRIR'].includes(c.estado)).map(c => c.id));
    const yaSalieron = despachos
      .filter(d => activeContractIds.has(d.contratoId || d.contrato?.id))
      .flatMap(d => d.items || [])
      .reduce((sum, item) => sum + (Number(item.cantidad) || 1), 0);

    return {
      faltanPorSalir,
      yaSalieron,
      totalContrato,
      salidasHoyCount,
      vencidasCount,
      retornosPendientes,
    };
  }, [allTasks, contracts, despachos]);

  // Filtrado dinámico por texto, tipo y periodo
  const filteredTasks = allTasks.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      task.equipoNombre.toLowerCase().includes(q) ||
      task.clienteNombre.toLowerCase().includes(q) ||
      task.codigoContrato.toLowerCase().includes(q) ||
      (task.ubicacionObra && task.ubicacionObra.toLowerCase().includes(q)) ||
      task.items.some(it => it.nombre.toLowerCase().includes(q));

    const matchesTipo = 
      tipoFilter === 'TODOS' || 
      (tipoFilter === 'DESPACHO' && task.tipo === 'DESPACHADO') ||
      (tipoFilter === 'RETORNO' && task.tipo === 'RETORNO');

    let matchesPeriodo = true;
    if (periodoFilter === 'HOY') {
      matchesPeriodo = task.periodoColumna === 'HOY';
    } else if (periodoFilter === 'PARCIALES') {
      matchesPeriodo = task.esParcial;
    } else if (periodoFilter === 'PROXIMOS') {
      matchesPeriodo = task.periodoColumna === 'MANANA' || task.periodoColumna === 'ESTA_SEMANA' || task.periodoColumna === 'PROXIMOS';
    } else if (periodoFilter === 'VENCIDOS') {
      matchesPeriodo = task.periodoColumna === 'VENCIDO';
    }

    return matchesSearch && matchesTipo && matchesPeriodo;
  });

  const despachosCount = allTasks.filter(t => t.tipo === 'DESPACHADO').length;
  const retornosCount = allTasks.filter(t => t.tipo === 'RETORNO').length;
  const periodTasks = allTasks.filter(t => tipoFilter === 'TODOS' || (tipoFilter === 'DESPACHO' ? t.tipo === 'DESPACHADO' : t.tipo === 'RETORNO'));

  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Faltan por salir" value={kpiStats.faltanPorSalir} caption={`${despachosCount} órdenes · unidades en bodega`} icon={Truck} tone="tertiary" />
        <KpiCard label="Total despachadas" value={kpiStats.yaSalieron} caption="En contratos activos, incluidas las retornadas" icon={CheckCircle2} tone="primary" />
        <KpiCard label="Salidas de hoy" value={kpiStats.salidasHoyCount} caption="Órdenes con fecha de hoy" icon={Clock} tone="primary" />
        <KpiCard label="Salidas vencidas" value={kpiStats.vencidasCount} caption="Órdenes pendientes anteriores a hoy" icon={Calendar} tone="danger" />
        <KpiCard label="Retornos pendientes" value={kpiStats.retornosPendientes} caption="Unidades en obra" icon={RotateCcw} tone="tertiary" />
      </div>

      {/* 2. BARRA DE HERRAMIENTAS, BÚSQUEDA Y FILTROS OPERATIVOS */}
      <div className="bg-white p-4 rounded-2xl border border-precision-neutral-border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Título de Sección */}
          <div>
            <h3 className="text-base font-black text-precision-neutral-dark tracking-tight flex items-center gap-2">
              <Truck className="w-4 h-4 text-precision-primary" />
              {tipoFilter === 'RETORNO' ? 'Retornos de obra' : tipoFilter === 'DESPACHO' ? 'Salidas pendientes' : 'Operaciones pendientes'}
            </h3>
          </div>

          {/* Buscador de Órdenes */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-precision-neutral" />
            <input
              type="text"
              placeholder="Buscar contrato, cliente, equipo u obra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="precision-input pl-9 text-xs py-2 w-full font-bold"
            />
          </div>

        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-precision-neutral-border pt-3">
          <FilterTabs label="Tipo de operación" variant="chips" value={tipoFilter} onChange={setTipoFilter} options={[
            { value: 'DESPACHO', label: 'Salidas', count: despachosCount, icon: Truck },
            { value: 'RETORNO', label: 'Retornos', count: retornosCount, icon: RotateCcw },
            { value: 'TODOS', label: 'Todos', count: allTasks.length },
          ]} />
          <FilterTabs label="Período" variant="chips" value={periodoFilter} onChange={setPeriodoFilter} options={[
            { value: 'TODOS', label: 'Todas', count: periodTasks.length },
            { value: 'HOY', label: 'Hoy', count: periodTasks.filter(t => t.periodoColumna === 'HOY').length },
            { value: 'VENCIDOS', label: 'Vencidas', count: periodTasks.filter(t => t.periodoColumna === 'VENCIDO').length },
            { value: 'PARCIALES', label: 'Parciales', count: periodTasks.filter(t => t.esParcial).length },
            { value: 'PROXIMOS', label: 'Próximos', count: periodTasks.filter(t => ['MANANA', 'ESTA_SEMANA', 'PROXIMOS'].includes(t.periodoColumna)).length },
          ]} />
        </div>
      </div>

      {/* 3. LISTADO OPERATIVO DE ÓRDENES (VISTA AMPLIA Y DETALLADA) */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={periodoFilter === 'TODOS' && !searchQuery && tipoFilter === 'DESPACHO' && despachosCount === 0 ? CheckCircle2 : Search}
          tone="neutral"
          title={searchQuery ? 'Sin resultados para la búsqueda'
            : periodoFilter === 'HOY' ? 'No hay órdenes para hoy'
            : periodoFilter === 'VENCIDOS' ? 'No hay órdenes vencidas'
            : periodoFilter === 'PARCIALES' ? 'No hay operaciones parciales'
            : periodoFilter === 'PROXIMOS' ? 'No hay próximas operaciones'
            : tipoFilter === 'DESPACHO' ? 'Bandeja de despacho al día'
            : tipoFilter === 'RETORNO' ? 'No hay retornos pendientes'
            : 'No hay operaciones pendientes'}
          description={periodoFilter !== 'TODOS' || searchQuery
            ? 'Hay operaciones fuera de este filtro. Revisa todas las órdenes o cambia la búsqueda.'
            : 'Las nuevas operaciones aparecerán aquí cuando tengan un saldo pendiente.'}
        >
          {(periodoFilter !== 'TODOS' || searchQuery) && (
            <button type="button" className="btn-precision-outline" onClick={() => { setPeriodoFilter('TODOS'); setSearchQuery(''); }}>
              Ver todas
            </button>
          )}
        </EmptyState>
      ) : (
        <div className={`grid grid-cols-1 xl:grid-cols-2 gap-4 items-start ${filteredTasks.length === 1 ? 'max-w-3xl' : ''}`}>
          {filteredTasks.map(task => (
            <OperationOrderCard
              key={task.id}
              task={task}
              onProcessDespacho={onProcessDespacho}
              onProcessRetorno={onProcessRetorno}
              onScheduleDespacho={onScheduleDespacho}
              onScheduleRetorno={onScheduleRetorno}
            />
          ))}
        </div>
      )}

    </div>
  );
};

// COMPONENTE TARJETA DE ORDEN OPERATIVA (CON FECHA, HORA, CONTROL DE FLETES Y ACCIÓN DIRECTA)
interface OperationOrderCardProps {
  task: OperationTask;
  onProcessDespacho: (contract: any) => void;
  onProcessRetorno: (contract: any) => void;
  onScheduleDespacho?: (contract: any, date: string, time?: string) => Promise<void>;
  onScheduleRetorno?: (contract: any, date: string, time?: string) => Promise<void>;
}

const OperationOrderCard: React.FC<OperationOrderCardProps> = ({
  task,
  onProcessDespacho,
  onProcessRetorno,
  onScheduleDespacho,
  onScheduleRetorno,
}) => {
  const isDespacho = task.tipo === 'DESPACHADO';

  const localDate = (value?: string) => {
    const d = value ? new Date(value) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const localTime = (value?: string) => {
    if (!value) return '08:00';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '08:00';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [showDetails, setShowDetails] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(localDate(task.scheduledDate));
  const [scheduleTime, setScheduleTime] = useState(localTime(task.scheduledDate));
  const [scheduleError, setScheduleError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Porcentaje de avance de flete / retorno
  const percentProgress = task.totalContratoUnidades > 0
    ? Math.min(100, Math.round((task.totalProcesadasUnidades / task.totalContratoUnidades) * 100))
    : 0;

  const saveSchedule = async () => {
    if (!scheduleDate || !task.rawContract || (!onScheduleDespacho && !onScheduleRetorno)) return;
    setSavingSchedule(true);
    setScheduleError('');
    try {
      if (isDespacho && onScheduleDespacho) {
        await onScheduleDespacho(task.rawContract, scheduleDate, scheduleTime);
      } else if (!isDespacho && onScheduleRetorno) {
        await onScheduleRetorno(task.rawContract, scheduleDate, scheduleTime);
      }
      setShowSchedule(false);
    } catch {
      setScheduleError('No se pudo guardar la fecha y hora programada');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAction = () => {
    if (task.rawContract) {
      if (isDespacho) {
        onProcessDespacho(task.rawContract);
      } else {
        onProcessRetorno(task.rawContract);
      }
    } else {
      alert(`Iniciando flujo operativo para: ${task.equipoNombre}\nCliente: ${task.clienteNombre}\nContrato: ${task.codigoContrato}`);
    }
  };

  return (
    <article className={`rounded-2xl border border-precision-neutral-border border-l-4 bg-white p-4 shadow-xs space-y-3 ${isDespacho ? 'border-l-precision-primary' : 'border-l-precision-tertiary'}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={isDespacho ? 'primary' : 'tertiary'}>
            {isDespacho ? (task.esParcial ? 'Flete parcial en curso' : 'Salida pendiente') : (task.esParcial ? 'Retorno parcial en curso' : 'Retorno de obra')}
          </StatusBadge>
          <span className="text-xs font-mono font-semibold text-precision-secondary">{task.codigoContrato}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${task.isOverdue ? 'text-red-700' : 'text-precision-secondary'}`}>
          <Calendar aria-hidden="true" className="h-4 w-4" />{task.fechaStr}{task.horaStr && <span>· {task.horaStr}</span>}
        </span>
      </header>
      <div>
        <h4 className="text-sm font-semibold text-precision-neutral-dark">{task.equipoNombre}</h4>
        <p className="mt-1 text-xs text-precision-secondary">{task.clienteNombre}</p>
        {task.ubicacionObra && <p className="mt-1 flex items-center gap-1 text-xs text-precision-neutral"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />Dirección: {task.ubicacionObra}</p>}
      </div>
      <div className="border-t border-precision-neutral-border pt-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-precision-secondary">{isDespacho ? 'Salieron' : 'Retornaron'} {task.totalProcesadasUnidades} de {task.totalContratoUnidades} u.</span>
          <strong className="tabular-nums text-precision-neutral-dark">Faltan {task.totalPendientesUnidades}</strong>
        </div>
        {task.esParcial && <div className="mt-2 h-2 overflow-hidden rounded-full bg-precision-neutral-light" role="progressbar" aria-valuenow={percentProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de operación">
          <div className={`h-full ${isDespacho ? 'bg-precision-primary' : 'bg-precision-tertiary'}`} style={{ width: `${percentProgress}%` }} />
        </div>}
        {task.items.length > 1 && <>
          <button type="button" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-precision-primary">
            {showDetails ? 'Ocultar' : 'Ver'} desglose por producto ({task.items.length}){showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showDetails && <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-precision-neutral"><th className="py-1 font-medium">Producto</th><th className="text-right font-medium">{isDespacho ? 'Salieron' : 'Retornaron'}</th><th className="text-right font-medium">Faltan</th><th className="text-right font-medium">Total</th></tr></thead>
              <tbody className="divide-y divide-precision-neutral-border">{task.items.map(it => <tr key={it.equipoId}><td className="py-1.5 text-precision-secondary">{it.nombre} {it.serial}</td><td className="text-right tabular-nums">{it.procesadas}</td><td className="text-right tabular-nums">{it.pendientes}</td><td className="text-right tabular-nums">{it.total}</td></tr>)}</tbody>
            </table>
          </div>}
        </>}
        {task.esParcial && <p className="mt-2 text-xs text-precision-neutral">{isDespacho ? 'Flete parcial activo' : 'Retorno parcial en curso'} · {task.fletesRealizados} viaje(s)</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-precision-neutral-border pt-3">
        {((isDespacho && onScheduleDespacho) || (!isDespacho && onScheduleRetorno)) && <button type="button" onClick={() => setShowSchedule(true)} className="btn-precision-outline text-xs">Programar</button>}
        <button type="button" onClick={handleAction} className={isDespacho ? 'btn-precision-primary text-xs' : 'btn-precision-tertiary text-xs'}>
          {isDespacho ? `Procesar salida (${task.totalPendientesUnidades} u.)` : `Iniciar recepción (${task.totalPendientesUnidades} u.)`}
        </button>
      </footer>
      <Modal isOpen={showSchedule} onClose={() => setShowSchedule(false)} ariaLabel={isDespacho ? 'Programar salida' : 'Programar retorno'}>
        <div className="space-y-4 p-5">
          <h3 className="text-base font-semibold text-precision-neutral-dark">Programar {isDespacho ? 'salida' : 'retorno'} · {task.codigoContrato}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-precision-secondary">Fecha de {isDespacho ? 'salida' : 'retorno'}
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="precision-input mt-1 h-10 w-full text-sm" aria-label={isDespacho ? 'Fecha programada de salida' : 'Fecha programada de retorno'} />
            </label>
            <label className="text-xs font-medium text-precision-secondary">Hora de {isDespacho ? 'salida' : 'retorno'}
              <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="precision-input mt-1 h-10 w-full text-sm" aria-label={isDespacho ? 'Hora programada de salida' : 'Hora programada de retorno'} />
            </label>
          </div>
          {scheduleError && <p role="alert" className="text-xs text-red-700">{scheduleError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowSchedule(false)} className="btn-precision-outline">Cancelar</button>
            <button type="button" onClick={saveSchedule} disabled={savingSchedule || !scheduleDate} className="btn-precision-primary disabled:opacity-50">{savingSchedule ? 'Guardando…' : 'Guardar programación'}</button>
          </div>
        </div>
      </Modal>
    </article>
  );
};
