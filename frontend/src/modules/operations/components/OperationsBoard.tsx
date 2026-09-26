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
  CheckCircle2
} from 'lucide-react';

export interface OperationTask {
  id: string;
  tipo: 'DESPACHADO' | 'RETORNO';
  fechaStr: string;
  horaStr: string;
  equipoNombre: string;
  cantidad?: number;
  clienteNombre: string;
  ubicacionObra?: string;
  codigoContrato: string;
  periodoColumna: 'HOY' | 'MANANA' | 'ESTA_SEMANA';
  rawContract?: any;
  scheduledDate?: string;
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

  // El tablero muestra trabajo pendiente; las órdenes ejecutadas quedan en sus pestañas.
  const realTasks: OperationTask[] = [];

  const schedule = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const days = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (days > 7) return null;
    return {
      periodoColumna: (days <= 0 ? 'HOY' : days === 1 ? 'MANANA' : 'ESTA_SEMANA') as OperationTask['periodoColumna'],
      fechaStr: days < 0 ? 'Vencido' : days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : date.toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric' }),
    };
  };

  contracts.filter(c => c.estado === 'ACTIVO').forEach(c => {
    const solicitud = solicitudesDespacho.find(s =>
      s.contratoId === c.id && !['COMPLETADA', 'CANCELADA', 'RECHAZADA'].includes(s.estado)
    );
    (c.items || []).forEach((item: any) => {
      const equipoId = item.equipoId || item.equipo?.id;
      if (!equipoId) return;
      const sent = despachos
        .filter(d => (d.contratoId || d.contrato?.id) === c.id)
        .flatMap(d => d.items || [])
        .filter(di => (di.equipoId || di.equipo?.id) === equipoId)
        .reduce((sum, di) => sum + (Number(di.cantidad) || 1), 0);
      const received = retornos
        .filter(r => (r.contratoId || r.contrato?.id) === c.id)
        .flatMap(r => r.items || [])
        .filter(ri => (ri.equipoId || ri.equipo?.id) === equipoId)
        .reduce((sum, ri) => sum + (Number(ri.cantidadRetornada) || 1), 0);
      const pendingDispatch = Math.max(0, (Number(item.cantidad) || 1) - sent);
      const pendingReturn = Math.max(0, sent - received);
      const name = item.equipo?.modelo || 'Equipo de renta';
      const serial = item.equipo?.numeroSerie ? ` (S/N: ${item.equipo.numeroSerie})` : '';

      if (pendingDispatch > 0) {
        const fechaSalida = solicitud?.fechaProgramada || c.fechaInicio;
        const due = schedule(fechaSalida);
        if (due) realTasks.push({
          id: `salida-${c.id}-${item.id}`, tipo: 'DESPACHADO', ...due,
          horaStr: '', equipoNombre: `${pendingDispatch}x ${name}${serial}`,
          cantidad: pendingDispatch, clienteNombre: c.cliente?.nombre || 'Cliente',
          codigoContrato: c.codigo, rawContract: c,
          scheduledDate: fechaSalida,
        });
      }
      if (pendingReturn > 0) {
        const due = schedule(c.fechaFin);
        if (due) realTasks.push({
          id: `retorno-${c.id}-${item.id}`, tipo: 'RETORNO', ...due,
          horaStr: '', equipoNombre: `${pendingReturn}x ${name}${serial}`,
          cantidad: pendingReturn, clienteNombre: c.cliente?.nombre || 'Cliente',
          codigoContrato: c.codigo, rawContract: c,
        });
      }
    });
  });

  const allTasks = realTasks;

  // Filtrado dinámico por texto y tipo
  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = 
      task.equipoNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.codigoContrato.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.ubicacionObra && task.ubicacionObra.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTipo = 
      tipoFilter === 'TODOS' || 
      (tipoFilter === 'DESPACHO' && task.tipo === 'DESPACHADO') ||
      (tipoFilter === 'RETORNO' && task.tipo === 'RETORNO');

    return matchesSearch && matchesTipo;
  });

  const hoyTasks = filteredTasks.filter(t => t.periodoColumna === 'HOY');
  const mananaTasks = filteredTasks.filter(t => t.periodoColumna === 'MANANA');
  const semanaTasks = filteredTasks.filter(t => t.periodoColumna === 'ESTA_SEMANA');

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
            <p className="text-[11px] text-[#747780] font-medium">Control visual de salidas (Despachos) y entradas (Retornos) por columna.</p>
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

          {/* Filtro por Tipo (Despacho / Retorno / Todos) */}
          <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-xs font-bold shrink-0">
            <button
              onClick={() => setTipoFilter('TODOS')}
              className={`px-3 py-1 rounded-lg transition-all ${
                tipoFilter === 'TODOS' ? 'bg-white text-[#1B1D22] shadow-xs' : 'text-[#747780]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTipoFilter('DESPACHO')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                tipoFilter === 'DESPACHO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
              }`}
            >
              🛫 Despachos
            </button>
            <button
              onClick={() => setTipoFilter('RETORNO')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                tipoFilter === 'RETORNO' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700'
              }`}
            >
              🛬 Retornos
            </button>
          </div>
        </div>
      </div>

      {/* TABLERO KANBAN DE 3 COLUMNAS RÍGIDAS CON SCROLL INTERNO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
        
        {/* COLUMNA 1: HOY */}
        <KanbanColumn
          title="HOY"
          badgeColor="bg-emerald-100 text-emerald-800 border-emerald-300"
          tasks={hoyTasks}
          onProcessDespacho={onProcessDespacho}
          onProcessRetorno={onProcessRetorno}
          onScheduleDespacho={onScheduleDespacho}
        />

        {/* COLUMNA 2: MAÑANA */}
        <KanbanColumn
          title="MAÑANA"
          badgeColor="bg-blue-100 text-blue-800 border-blue-300"
          tasks={mananaTasks}
          onProcessDespacho={onProcessDespacho}
          onProcessRetorno={onProcessRetorno}
          onScheduleDespacho={onScheduleDespacho}
        />

        {/* COLUMNA 3: ESTA SEMANA */}
        <KanbanColumn
          title="ESTA SEMANA"
          badgeColor="bg-purple-100 text-purple-800 border-purple-300"
          tasks={semanaTasks}
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
  badgeColor: string;
  tasks: OperationTask[];
  onProcessDespacho: (contract: any) => void;
  onProcessRetorno: (contract: any) => void;
  onScheduleDespacho?: (contract: any, date: string) => Promise<void>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  badgeColor,
  tasks,
  onProcessDespacho,
  onProcessRetorno,
  onScheduleDespacho,
}) => {
  return (
    <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-3xl p-3.5 flex flex-col h-full min-h-0 shadow-xs">
      
      {/* Encabezado Fijo de Columna */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EE] shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-[#1B1D22] text-sm tracking-wide">{title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
            {tasks.length}
          </span>
        </div>
        <span className="text-[10px] font-extrabold text-[#747780] uppercase">
          {title === 'HOY' ? 'Prioridad Alta' : 'Programadas'}
        </span>
      </div>

      {/* Contenedor Interno con Scroll Vertical Independiente */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
        {tasks.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#E5E8EE] rounded-2xl bg-white/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[#1B1D22]">Sin tareas programadas</p>
            <p className="text-[10px] text-[#747780]">No hay operaciones de patio pendientes para este período.</p>
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

// COMPONENTE TARJETA MINIMALISTA (MICRO-CARD OPERATIVA)
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
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(localDate(task.scheduledDate));
  const [scheduleError, setScheduleError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

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
      // Notificación fallback para tarjetas mock
      alert(`Iniciando flujo operativo para: ${task.equipoNombre}\nCliente: ${task.clienteNombre}\nContrato: ${task.codigoContrato}`);
    }
  };

  return (
    <div className={`p-3.5 bg-white rounded-2xl border border-[#E5E8EE] shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-2.5 group ${
      isDespacho ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'
    }`}>
      
      {/* Fila 1: Semáforo / Badge + Hora */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isDespacho ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              🛫 DESPACHO
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              🛬 RETORNO
            </span>
          )}
          <span className="text-[10px] font-mono font-bold text-[#747780]">
            {task.codigoContrato}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-black text-[#1B1D22]">
          <Clock className="w-3 h-3 text-[#747780]" />
          <span>{task.fechaStr}</span>
        </div>
      </div>

      {/* Fila 2: Equipo / Producto (Qué) */}
      <div className="space-y-0.5">
        <h4 className="text-xs font-black text-[#1B1D22] group-hover:text-[#1A73E8] transition-colors leading-tight flex items-start gap-1.5">
          <HardHat className={`w-4 h-4 mt-0.5 shrink-0 ${isDespacho ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span>{task.equipoNombre}</span>
        </h4>
      </div>

      {/* Fila 3: Cliente y Obra (Quién y Dónde) */}
      <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E5E8EE] text-[11px] space-y-1">
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

      {/* Fila 4: Botón de Acción Rápido (Ghost Button) */}
      {isDespacho && onScheduleDespacho && (
        <div className="space-y-2">
          <button type="button" onClick={() => setShowSchedule(!showSchedule)} className="text-xs font-bold text-blue-700 hover:underline">
            Programar salida
          </button>
          {showSchedule && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="precision-input text-xs py-1" aria-label="Fecha programada de salida" />
              <button type="button" disabled={savingSchedule || !scheduleDate} onClick={saveSchedule} className="btn-precision-primary text-xs px-3 py-1 disabled:opacity-50">
                {savingSchedule ? 'Guardando...' : 'Guardar fecha'}
              </button>
              {scheduleError && <span className="text-xs text-red-700">{scheduleError}</span>}
            </div>
          )}
        </div>
      )}
      <div className="pt-1 flex justify-end">
        <button
          onClick={handleAction}
          className={`w-full py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isDespacho 
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200' 
              : 'bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200'
          }`}
        >
          <span>{isDespacho ? 'Procesar Salida' : 'Iniciar Inspección'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
