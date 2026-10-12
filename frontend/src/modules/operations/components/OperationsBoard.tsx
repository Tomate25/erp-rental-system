import React, { useState } from 'react';
import type { SolicitudDespacho } from '../services/operations.api';
import { 
  Calendar, 
  Search, 
  Building2, 
  MapPin, 
  Clock, 
  ArrowRight,
  HardHat,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Package,
  ChevronDown,
  ChevronUp,
  Info,
  Layers
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
  periodoColumna: 'HOY' | 'MANANA' | 'ESTA_SEMANA' | 'PROXIMOS';
  rawContract?: any;
  scheduledDate?: string;
  isOverdue?: boolean;
}

interface OperationsBoardProps {
  contracts?: any[];
  despachos?: any[];
  retornos?: any[];
  solicitudesDespacho?: SolicitudDespacho[];
  onProcessDespacho: (contract: any) => void;
  onProcessRetorno: (contract: any) => void;
  onScheduleDespacho?: (contract: any, date: string) => Promise<void>;
}

export const OperationsBoard: React.FC<OperationsBoardProps> = ({
  contracts = [],
  despachos = [],
  retornos = [],
  solicitudesDespacho = [],
  onProcessDespacho,
  onProcessRetorno,
  onScheduleDespacho,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'DESPACHO' | 'RETORNO'>('TODOS');

  // El tablero muestra trabajo pendiente de patio; las órdenes ejecutadas quedan en sus pestañas.
  const realTasks: OperationTask[] = [];

  const schedule = (dateValue?: string | null) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const days = Math.round((date.getTime() - today.getTime()) / 86400000);

    let periodoColumna: OperationTask['periodoColumna'];
    let fechaStr: string;
    let isOverdue = false;

    if (days < 0) {
      periodoColumna = 'HOY';
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

    return {
      periodoColumna,
      fechaStr,
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
        periodoColumna: 'HOY' as const,
        fechaStr: 'Pendiente',
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
        horaStr: '',
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
      const due = schedule(c.fechaFin) || {
        periodoColumna: 'HOY' as const,
        fechaStr: 'Pendiente',
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
        horaStr: '',
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
      });
    }
  });

  const allTasks = realTasks;

  // Filtrado dinámico por texto y tipo (buscando también dentro de los productos del contrato)
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

    return matchesSearch && matchesTipo;
  });

  const despachosCount = allTasks.filter(t => t.tipo === 'DESPACHADO').length;
  const retornosCount = allTasks.filter(t => t.tipo === 'RETORNO').length;

  const hoyTasks = filteredTasks.filter(t => t.periodoColumna === 'HOY');
  const mananaTasks = filteredTasks.filter(t => t.periodoColumna === 'MANANA');
  const semanaTasks = filteredTasks.filter(t => t.periodoColumna === 'ESTA_SEMANA');
  const proximosTasks = filteredTasks.filter(t => t.periodoColumna === 'PROXIMOS');

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] space-y-3 font-sans animate-fadeIn">
      
      {/* Barra de Filtros y Control Superior */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 rounded-xl bg-[#37474F] text-white">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#1B1D22] tracking-tight">Agenda Operativa de Patio</h2>
            <p className="text-[11px] text-[#747780] font-medium">Control visual de salidas (Despachos) y entradas (Retornos) agrupado por contrato y flete.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Buscador de Patio */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#747780]" />
            <input
              type="text"
              placeholder="Buscar equipo, cliente o contrato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="precision-input pl-9 text-xs py-2 w-full font-bold"
            />
          </div>

          {/* Filtro por Tipo con Contadores en Tiempo Real */}
          <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-xs font-bold shrink-0">
            <button
              onClick={() => setTipoFilter('TODOS')}
              className={`px-3 py-1 rounded-lg transition-all ${
                tipoFilter === 'TODOS' ? 'bg-white text-[#1B1D22] shadow-xs' : 'text-[#747780]'
              }`}
            >
              Todos ({allTasks.length})
            </button>
            <button
              onClick={() => setTipoFilter('DESPACHO')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                tipoFilter === 'DESPACHO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
              }`}
            >
              🛫 Salidas ({despachosCount})
            </button>
            <button
              onClick={() => setTipoFilter('RETORNO')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                tipoFilter === 'RETORNO' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700'
              }`}
            >
              🛬 Retornos ({retornosCount})
            </button>
          </div>
        </div>
      </div>

      {/* TABLERO KANBAN DE 4 COLUMNAS CON SCROLL INTERNO */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        
        {/* COLUMNA 1: HOY / VENCIDOS */}
        <KanbanColumn
          title="HOY / VENCIDOS"
          subtext="Prioridad Inmediata"
          badgeColor={hoyTasks.some(t => t.isOverdue) ? "bg-red-100 text-red-800 border-red-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}
          tasks={hoyTasks}
          onProcessDespacho={onProcessDespacho}
          onProcessRetorno={onProcessRetorno}
          onScheduleDespacho={onScheduleDespacho}
        />

        {/* COLUMNA 2: MAÑANA */}
        <KanbanColumn
          title="MAÑANA"
          subtext="Planificación Próximo Día"
          badgeColor="bg-blue-100 text-blue-800 border-blue-300"
          tasks={mananaTasks}
          onProcessDespacho={onProcessDespacho}
          onProcessRetorno={onProcessRetorno}
          onScheduleDespacho={onScheduleDespacho}
        />

        {/* COLUMNA 3: ESTA SEMANA */}
        <KanbanColumn
          title="ESTA SEMANA"
          subtext="Próximos 2 a 7 Días"
          badgeColor="bg-purple-100 text-purple-800 border-purple-300"
          tasks={semanaTasks}
          onProcessDespacho={onProcessDespacho}
          onProcessRetorno={onProcessRetorno}
          onScheduleDespacho={onScheduleDespacho}
        />

        {/* COLUMNA 4: PRÓXIMAS FECHAS (+7 DÍAS) */}
        <KanbanColumn
          title="PRÓXIMAS FECHAS"
          subtext="Siguiente Semana y Futuros"
          badgeColor="bg-indigo-100 text-indigo-800 border-indigo-300"
          tasks={proximosTasks}
          onProcessDespacho={onProcessDespacho}
          onProcessRetorno={onProcessRetorno}
          onScheduleDespacho={onScheduleDespacho}
        />

      </div>
    </div>
  );
};

// COMPONENTE COLUMNA KANBAN DE ALTURA FIJA Y SCROLL INDEPENDIENTE
interface KanbanColumnProps {
  title: string;
  subtext?: string;
  badgeColor: string;
  tasks: OperationTask[];
  onProcessDespacho: (contract: any) => void;
  onProcessRetorno: (contract: any) => void;
  onScheduleDespacho?: (contract: any, date: string) => Promise<void>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  subtext,
  badgeColor,
  tasks,
  onProcessDespacho,
  onProcessRetorno,
  onScheduleDespacho,
}) => {
  return (
    <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-3xl p-3.5 flex flex-col h-full min-h-[420px] xl:min-h-0 shadow-xs">
      
      {/* Encabezado Fijo de Columna */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E8EE] shrink-0 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-[#1B1D22] text-xs uppercase tracking-wide">{title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
              {tasks.length}
            </span>
          </div>
          {subtext && (
            <span className="text-[10px] font-semibold text-[#747780] block mt-0.5">
              {subtext}
            </span>
          )}
        </div>
      </div>

      {/* Contenedor Interno con Scroll Vertical Independiente */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
        {tasks.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#E5E8EE] rounded-2xl bg-white/60">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[#1B1D22]">Sin operaciones pendientes</p>
            <p className="text-[10px] text-[#747780]">No hay contratos pendientes para este período.</p>
          </div>
        ) : (
          tasks.map(task => (
            <OperationCard
              key={task.id}
              task={task}
              onProcessDespacho={onProcessDespacho}
              onProcessRetorno={onProcessRetorno}
              onScheduleDespacho={onScheduleDespacho}
            />
          ))
        )}
      </div>
    </div>
  );
};

// COMPONENTE TARJETA DE CONTRATO (CON CONTROL DE CAPACIDAD DE CAMIONES Y DESPACHO PARCIAL)
interface OperationCardProps {
  task: OperationTask;
  onProcessDespacho: (contract: any) => void;
  onProcessRetorno: (contract: any) => void;
  onScheduleDespacho?: (contract: any, date: string) => Promise<void>;
}

const OperationCard: React.FC<OperationCardProps> = ({
  task,
  onProcessDespacho,
  onProcessRetorno,
  onScheduleDespacho,
}) => {
  const isDespacho = task.tipo === 'DESPACHADO';
  const localDate = (value?: string) => {
    const d = value ? new Date(value) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [showDetails, setShowDetails] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(localDate(task.scheduledDate));
  const [scheduleError, setScheduleError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Porcentaje de avance de flete / retorno
  const percentProgress = task.totalContratoUnidades > 0
    ? Math.min(100, Math.round((task.totalProcesadasUnidades / task.totalContratoUnidades) * 100))
    : 0;

  const saveSchedule = async () => {
    if (!scheduleDate || !task.rawContract || !onScheduleDespacho) return;
    setSavingSchedule(true);
    setScheduleError('');
    try {
      await onScheduleDespacho(task.rawContract, scheduleDate);
      setShowSchedule(false);
    } catch {
      setScheduleError('No se pudo guardar la fecha programada');
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
    <div className={`p-3.5 bg-white rounded-2xl border border-[#E5E8EE] shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group ${
      isDespacho ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'
    }`}>
      
      {/* Fila 1: Badges de Estado Operativo + Contrato + Horario */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {isDespacho ? (
            task.esParcial ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-700" /> FLETE PARCIAL EN CURSO
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Package className="w-3 h-3 text-emerald-700" /> SALIDA PENDIENTE
              </span>
            )
          ) : (
            task.esParcial ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-700" /> RETORNO PARCIAL EN CURSO
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                🛬 RETORNO DE OBRA
              </span>
            )
          )}
          <span className="text-[10px] font-mono font-black text-[#1A73E8] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
            {task.codigoContrato}
          </span>
        </div>

        <div className={`flex items-center gap-1 text-[11px] font-black ${
          task.isOverdue ? 'text-red-700 font-extrabold' : 'text-[#1B1D22]'
        }`}>
          {task.isOverdue ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          ) : (
            <Clock className="w-3 h-3 text-[#747780] shrink-0" />
          )}
          <span>{task.fechaStr}</span>
        </div>
      </div>

      {/* Fila 2: Resumen del Contrato / Equipos */}
      <div className="space-y-1">
        <h4 className="text-xs font-black text-[#1B1D22] group-hover:text-[#1A73E8] transition-colors leading-tight flex items-start gap-1.5">
          <HardHat className={`w-4 h-4 mt-0.5 shrink-0 ${isDespacho ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span>{task.equipoNombre}</span>
        </h4>
        {task.items.length > 1 && (
          <div className="flex items-center gap-1 text-[10px] text-[#747780] font-bold">
            <Layers className="w-3 h-3 text-[#1A73E8]" />
            <span>Contrato multiequipo: {task.items.length} productos combinados</span>
          </div>
        )}
      </div>

      {/* Fila 3: Cliente y Obra */}
      <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E5E8EE] text-[11px] space-y-1">
        <div className="flex items-center gap-1.5 text-[#37474F] font-extrabold truncate">
          <Building2 className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
          <span className="truncate">{task.clienteNombre}</span>
        </div>
        {task.ubicacionObra && (
          <div className="flex items-center gap-1.5 text-[#747780] font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-[#747780] shrink-0" />
            <span className="truncate">{task.ubicacionObra}</span>
          </div>
        )}
      </div>

      {/* Fila 4: APARTADO DE CONTROL DE CAMIONES / SALIDAS Y RETORNOS PARCIALES */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-[#1A73E8]" />
            {isDespacho ? 'Control de Fletes y Capacidad de Camión' : 'Control de Recepción en Patio'}
          </span>
          <span className="text-[10px] font-black text-slate-600 font-mono">
            {task.totalPendientesUnidades} u. por procesar
          </span>
        </div>

        {/* 3 Métricas Claras de Balance */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-white p-1.5 rounded-lg border border-slate-200">
            <span className="text-[9px] font-bold text-slate-500 block">
              {isDespacho ? 'Ya Salieron' : 'Retornaron'}
            </span>
            <span className="text-xs font-black text-emerald-700">
              {task.totalProcesadasUnidades} u.
            </span>
            <span className="text-[8px] text-slate-400 block font-medium">
              {task.fletesRealizados > 0 ? `${task.fletesRealizados} flete(s)` : '0 viajes'}
            </span>
          </div>

          <div className="bg-white p-1.5 rounded-lg border border-amber-200 bg-amber-50/40">
            <span className="text-[9px] font-bold text-amber-800 block">
              {isDespacho ? 'Faltan x Salir' : 'Faltan en Obra'}
            </span>
            <span className="text-xs font-black text-amber-700">
              {task.totalPendientesUnidades} u.
            </span>
            <span className="text-[8px] text-amber-600 block font-bold">
              Pendiente patio
            </span>
          </div>

          <div className="bg-white p-1.5 rounded-lg border border-slate-200">
            <span className="text-[9px] font-bold text-slate-500 block">
              Total Contrato
            </span>
            <span className="text-xs font-black text-slate-800">
              {task.totalContratoUnidades} u.
            </span>
            <span className="text-[8px] text-slate-400 block font-medium">
              100% acordado
            </span>
          </div>
        </div>

        {/* Barra de Progreso Visual */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-bold text-slate-600">
            <span>Progreso de {isDespacho ? 'despacho' : 'recepción'}:</span>
            <span className="font-mono text-[#1A73E8]">{percentProgress}% completado</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                percentProgress === 100 
                  ? 'bg-emerald-600' 
                  : percentProgress > 0 
                  ? 'bg-amber-500' 
                  : 'bg-slate-300'
              }`}
              style={{ width: `${percentProgress}%` }}
            />
          </div>
        </div>

        {/* Desglose Desplegable por Equipo */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-[10px] font-bold text-slate-700 hover:text-[#1A73E8] transition-colors py-1 px-1.5 rounded-lg hover:bg-slate-100/80"
          >
            <span>{showDetails ? 'Ocultar desglose por producto' : `Ver desglose por producto (${task.items.length})`}</span>
            {showDetails ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
          </button>

          {showDetails && (
            <div className="mt-1.5 space-y-1.5 max-h-44 overflow-y-auto pr-0.5 scrollbar-thin">
              {task.items.map((it) => (
                <div key={it.equipoId} className="bg-white p-2 rounded-lg border border-slate-200 text-[10px] space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="truncate">{it.nombre} {it.serial}</span>
                    <span className="font-mono text-amber-700 shrink-0 ml-1">
                      {it.pendientes} u. pendientes
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span>{isDespacho ? 'Salieron' : 'Retornaron'}: <strong className="text-emerald-700">{it.procesadas}</strong></span>
                    <span>Faltan: <strong className="text-amber-700">{it.pendientes}</strong></span>
                    <span>Total: <strong className="text-slate-700">{it.total}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nota explicativa: Cómo se afecta el tablero */}
        <div className="text-[10px] text-[#37474F] bg-blue-50/70 border border-blue-200/60 p-2 rounded-xl flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <span>
            {isDespacho ? (
              task.esParcial ? (
                <><strong>Flete parcial activo:</strong> Ya salieron {task.totalProcesadasUnidades} u. Restan {task.totalPendientesUnidades} u. por salir. Esta tarjeta se mantiene en el tablero hasta despachar el total.</>
              ) : (
                <><strong>Capacidad de camión:</strong> Si el vehículo no puede llevar todas las unidades juntas, puedes registrar un flete parcial. El tablero mantendrá el contrato activo mostrando el saldo pendiente.</>
              )
            ) : (
              task.esParcial ? (
                <><strong>Retorno parcial en proceso:</strong> Ingresaron {task.totalProcesadasUnidades} u. a patio. Restan {task.totalPendientesUnidades} u. pendientes en obra.</>
              ) : (
                <><strong>Recepción de flete:</strong> Valida en recepción cuántas unidades ingresan en este camión y su condición física.</>
              )
            )}
          </span>
        </div>
      </div>

      {/* Fila 5: Reprogramación (solo para despachos) */}
      {isDespacho && onScheduleDespacho && (
        <div className="space-y-1.5 pt-0.5">
          <button type="button" onClick={() => setShowSchedule(!showSchedule)} className="text-[11px] font-bold text-blue-700 hover:underline">
            {showSchedule ? 'Cerrar reprogramación' : 'Programar / Reprogramar salida'}
          </button>
          {showSchedule && (
            <div className="flex flex-wrap items-center gap-2 bg-[#F8FAFC] p-2 rounded-xl border border-[#E5E8EE]">
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="precision-input text-xs py-1" aria-label="Fecha programada de salida" />
              <button type="button" disabled={savingSchedule || !scheduleDate} onClick={saveSchedule} className="btn-precision-primary text-xs px-2.5 py-1 disabled:opacity-50">
                {savingSchedule ? 'Guardando...' : 'Guardar'}
              </button>
              {scheduleError && <span className="text-xs text-red-700">{scheduleError}</span>}
            </div>
          )}
        </div>
      )}

      {/* Fila 6: Botón de Acción Principal */}
      <div className="pt-1 flex justify-end">
        <button
          onClick={handleAction}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
            isDespacho 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600' 
              : 'bg-amber-600 text-white hover:bg-amber-700 border border-amber-600'
          }`}
        >
          <span>
            {isDespacho 
              ? `Procesar Salida en Camión (${task.totalPendientesUnidades} u.)` 
              : `Iniciar Recepción (${task.totalPendientesUnidades} u.)`}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};

