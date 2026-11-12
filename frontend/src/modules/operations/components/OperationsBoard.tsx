import React, { useState, useMemo } from 'react';
import type { SolicitudDespacho, SolicitudRetorno } from '../services/operations.api';
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
        periodoColumna: 'HOY' as const,
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
        periodoColumna: 'HOY' as const,
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
    let yaSalieron = 0;
    let totalContrato = 0;
    let salidasHoyCount = 0;
    let retornosPendientes = 0;

    for (const t of allTasks) {
      if (t.tipo === 'DESPACHADO') {
        faltanPorSalir += t.totalPendientesUnidades;
        yaSalieron += t.totalProcesadasUnidades;
        totalContrato += t.totalContratoUnidades;
        if (t.periodoColumna === 'HOY') {
          salidasHoyCount++;
        }
      } else {
        retornosPendientes += t.totalPendientesUnidades;
      }
    }

    return {
      faltanPorSalir,
      yaSalieron,
      totalContrato,
      salidasHoyCount,
      retornosPendientes,
    };
  }, [allTasks]);

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
      matchesPeriodo = Boolean(task.isOverdue);
    }

    return matchesSearch && matchesTipo && matchesPeriodo;
  });

  const despachosCount = allTasks.filter(t => t.tipo === 'DESPACHADO').length;
  const retornosCount = allTasks.filter(t => t.tipo === 'RETORNO').length;

  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      
      {/* 1. TARJETAS DE CONTROL Y BALANCE OPERATIVO (KPIS EJECUTIVOS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* KPI 1: FALTAN POR SALIR */}
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-800 tracking-wide">
              Faltan por Salir
            </span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 tracking-tight font-mono">
              {kpiStats.faltanPorSalir}
            </span>
            <span className="text-xs font-bold text-amber-700">unidades en bodega</span>
          </div>
          <p className="text-[10px] text-amber-700 mt-1 font-medium">
            {despachosCount} orden(es) de despacho con balance pendiente
          </p>
        </div>

        {/* KPI 2: YA SALIERON */}
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wide">
              Ya Salieron
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900 tracking-tight font-mono">
              {kpiStats.yaSalieron}
            </span>
            <span className="text-xs font-bold text-emerald-700">unidades despachadas</span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-1 font-medium">
            Equipos actualmente operando en obras
          </p>
        </div>

        {/* KPI 3: PROGRAMADAS PARA HOY */}
        <div className="bg-blue-50/70 border border-blue-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-[#1A73E8] tracking-wide">
              Salidas de Hoy
            </span>
            <span className="p-1.5 rounded-lg bg-blue-100 text-[#1A73E8]">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#1A73E8] tracking-tight font-mono">
              {kpiStats.salidasHoyCount}
            </span>
            <span className="text-xs font-bold text-blue-700">órdenes para hoy</span>
          </div>
          <p className="text-[10px] text-blue-700 mt-1 font-medium">
            Despachos con fecha y hora programada prioritaria
          </p>
        </div>

        {/* KPI 4: RETORNOS / TOTAL ACORDADO */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-700 tracking-wide">
              Retornos Pendientes
            </span>
            <span className="p-1.5 rounded-lg bg-slate-200 text-slate-700">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {kpiStats.retornosPendientes}
            </span>
            <span className="text-xs font-bold text-slate-600">unidades en obra</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            Total pactado: {kpiStats.totalContrato} u. en contratos vigentes
          </p>
        </div>

      </div>

      {/* 2. BARRA DE HERRAMIENTAS, BÚSQUEDA Y FILTROS OPERATIVOS */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Título de Sección */}
          <div>
            <h3 className="text-base font-black text-[#1B1D22] tracking-tight flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1A73E8]" />
              Centro de Control de Salidas y Despachos
            </h3>
            <p className="text-xs text-[#747780] font-medium">
              Cola de órdenes que están llegando y pendientes de salida. Al despacharlas salen de la bandeja para mantener el patio al día.
            </p>
          </div>

          {/* Buscador de Órdenes */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#747780]" />
            <input
              type="text"
              placeholder="Buscar contrato, cliente, equipo u obra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="precision-input pl-9 text-xs py-2 w-full font-bold"
            />
          </div>

        </div>

        {/* Fila de Filtros Rápidos (Tipo y Estado) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E8EE] pt-3">
          
          {/* Tipo de Operación: Salidas primero y por defecto */}
          <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-xs font-bold">
            <button
              type="button"
              onClick={() => setTipoFilter('DESPACHO')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                tipoFilter === 'DESPACHO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Cola de Salidas ({despachosCount})
            </button>
            <button
              type="button"
              onClick={() => setTipoFilter('RETORNO')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                tipoFilter === 'RETORNO' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retornos de Obra ({retornosCount})
            </button>
            <button
              type="button"
              onClick={() => setTipoFilter('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                tipoFilter === 'TODOS' ? 'bg-white text-[#1B1D22] shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Todos ({allTasks.length})
            </button>
          </div>

          {/* Filtros de Tiempo y Parciales */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriodoFilter('TODOS')}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                periodoFilter === 'TODOS'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todas las Órdenes
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFilter('HOY')}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                periodoFilter === 'HOY'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              Por Salir Hoy
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFilter('PARCIALES')}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                periodoFilter === 'PARCIALES'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              Fletes Parciales en Curso
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFilter('PROXIMOS')}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                periodoFilter === 'PROXIMOS'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Próximas Salidas
            </button>
          </div>

        </div>
      </div>

      {/* 3. LISTADO OPERATIVO DE ÓRDENES (VISTA AMPLIA Y DETALLADA) */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-black text-[#1B1D22]">
              {tipoFilter === 'DESPACHO'
                ? 'Bandeja de Despacho al Día · No hay órdenes pendientes por salir'
                : 'No hay órdenes que coincidan con los filtros'}
            </h4>
            <p className="text-xs text-[#747780] max-w-md mx-auto mt-1">
              {tipoFilter === 'DESPACHO'
                ? 'Todos los equipos y contratos activos han sido despachados a obra. Cuando se apruebe una nueva cotización o contrato, caerá aquí automáticamente para su entrega.'
                : 'Prueba cambiando los filtros de fecha o el término de búsqueda para ver otras órdenes de patio.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
    <div className={`bg-white rounded-2xl border border-[#E5E8EE] shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-4 space-y-3.5 group ${
      isDespacho ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'
    }`}>
      
      {/* 1. CABECERA: ESTADO DE LA ORDEN + CONTRATO + FECHA Y HORA PROGRAMADA */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8EE] pb-2.5">
        
        {/* Badges de Estado y Contrato */}
        <div className="flex flex-wrap items-center gap-2">
          {isDespacho ? (
            task.esParcial ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300">
                FLETE PARCIAL EN CURSO
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300">
                SALIDA PENDIENTE
              </span>
            )
          ) : (
            task.esParcial ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300">
                RETORNO PARCIAL EN CURSO
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                RETORNO DE OBRA
              </span>
            )
          )}

          <span className="text-[11px] font-mono font-black text-[#1A73E8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {task.codigoContrato}
          </span>
        </div>

        {/* FECHA Y HORA PROGRAMADA DE SALIDA */}
        <div className={`flex items-center gap-2 text-xs font-black ${
          task.isOverdue ? 'text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-200' : 'text-[#1B1D22] bg-[#F8FAFC] px-2 py-1 rounded-lg border border-[#E5E8EE]'
        }`}>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#747780]" />
            <span>{task.isOverdue ? 'Vencido · ' : ''}{task.fechaStr}</span>
          </div>
          {task.horaStr ? (
            <div className="flex items-center gap-1 border-l border-[#E5E8EE] pl-2 text-[#1A73E8]">
              <Clock className="w-3.5 h-3.5" />
              <span>{task.horaStr}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 border-l border-[#E5E8EE] pl-2 text-[#747780] text-[10px] font-normal">
              <Clock className="w-3 h-3" />
              <span>Hora por definir</span>
            </div>
          )}
        </div>

      </div>

      {/* 2. INFORMACIÓN DEL EQUIPO / CONTRATO MULTIEQUIPO */}
      <div className="space-y-1">
        <h4 className="text-sm font-black text-[#1B1D22] leading-snug">
          {task.equipoNombre}
        </h4>
        {task.items.length > 1 && (
          <p className="text-xs text-[#747780] font-bold">
            Contrato multiequipo: {task.items.length} productos combinados
          </p>
        )}
      </div>

      {/* 3. CLIENTE Y DESTINO DE OBRA */}
      <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E8EE] text-xs space-y-1.5">
        <div className="text-[#1B1D22] font-black truncate flex items-center gap-1.5">
          <span className="text-[#747780] text-[10px] uppercase font-bold tracking-wider">Cliente:</span>
          <span className="truncate">{task.clienteNombre}</span>
        </div>
        {task.ubicacionObra && (
          <div className="text-[#747780] font-medium flex items-center gap-1.5 truncate text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
            <span className="truncate">Obra: {task.ubicacionObra}</span>
          </div>
        )}
      </div>

      {/* 4. BLOQUE DE CONTROL DE FLETES Y CAPACIDAD DE CAMIONES */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2.5">
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
            {isDespacho ? 'Control de fletes' : 'Recepción en patio'}
          </span>
          <span className="text-[10px] font-black text-slate-600 font-mono">
            {task.totalPendientesUnidades} u. por procesar
          </span>
        </div>

        {/* 3 Métricas Claras de Balance: Ya Salieron, Faltan x Salir, Total Contrato */}
        <div className="grid grid-cols-3 gap-2 text-center">
          
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block">
              {isDespacho ? 'Ya Salieron' : 'Retornaron'}
            </span>
            <span className="text-sm font-black text-emerald-700 font-mono">
              {task.totalProcesadasUnidades} u.
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">
              {task.fletesRealizados > 0 ? `${task.fletesRealizados} flete(s)` : '0 viajes'}
            </span>
          </div>

          <div className="bg-white p-2 rounded-xl border border-amber-300 bg-amber-50/50 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-900 block">
              {isDespacho ? 'Faltan x Salir' : 'Faltan en Obra'}
            </span>
            <span className="text-sm font-black text-amber-700 font-mono">
              {task.totalPendientesUnidades} u.
            </span>
            <span className="text-[9px] text-amber-600 block font-bold">
              Pendiente patio
            </span>
          </div>

          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block">
              Total Contrato
            </span>
            <span className="text-sm font-black text-slate-800 font-mono">
              {task.totalContratoUnidades} u.
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">
              100% acordado
            </span>
          </div>

        </div>

        {/* Barra de Progreso Visual */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-600">
            <span>Progreso de {isDespacho ? 'despacho' : 'recepción'}:</span>
            <span className="font-mono text-[#1A73E8]">{percentProgress}% completado</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
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
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-[#1A73E8] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <span>{showDetails ? 'Ocultar desglose por producto' : `Ver desglose por producto (${task.items.length})`}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {showDetails && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {task.items.map((it) => (
                <div key={it.equipoId} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="truncate">{it.nombre} {it.serial}</span>
                    <span className="font-mono text-amber-700 shrink-0 ml-1">
                      {it.pendientes} u. pendientes
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{isDespacho ? 'Salieron' : 'Retornaron'}: <strong className="text-emerald-700">{it.procesadas}</strong></span>
                    <span>Faltan: <strong className="text-amber-700">{it.pendientes}</strong></span>
                    <span>Total: <strong className="text-slate-700">{it.total}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nota explicativa contextual */}
        <div className="text-[10px] text-[#37474F] bg-white border border-slate-200 p-2 rounded-lg">
          {isDespacho ? (
            task.esParcial ? (
              <><strong>Flete parcial activo:</strong> Ya salieron {task.totalProcesadasUnidades} u. Restan {task.totalPendientesUnidades} u. por salir. Esta orden se mantiene visible mostrando el saldo pendiente.</>
            ) : (
              <><strong>Capacidad de camión:</strong> Si el vehículo no puede llevar todas las unidades juntas, puedes registrar un flete parcial. El sistema mantendrá el contrato activo mostrando el saldo pendiente.</>
            )
          ) : (
            task.esParcial ? (
              <><strong>Retorno parcial en proceso:</strong> Ingresaron {task.totalProcesadasUnidades} u. a patio. Restan {task.totalPendientesUnidades} u. pendientes en obra.</>
            ) : (
              <><strong>Recepción de flete:</strong> Valida en recepción cuántas unidades ingresan en este camión y su condición física.</>
            )
          )}
        </div>

      </div>

      {/* 5. PROGRAMACIÓN / REPROGRAMACIÓN (FECHA Y HORA EXACTA DE SALIDA) */}
      {((isDespacho && onScheduleDespacho) || (!isDespacho && onScheduleRetorno)) && (
        <div className="space-y-1.5 pt-0.5">
          <button 
            type="button" 
            onClick={() => setShowSchedule(!showSchedule)} 
            className="text-xs font-bold text-[#1A73E8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {showSchedule 
                ? 'Cerrar programación' 
                : isDespacho ? 'Programar fecha y hora de salida' : 'Programar fecha y hora de retorno'}
            </span>
          </button>

          {showSchedule && (
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E8EE] space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[#747780] block mb-1">
                    Fecha de salida:
                  </label>
                  <input 
                    type="date" 
                    value={scheduleDate} 
                    onChange={e => setScheduleDate(e.target.value)} 
                    className="precision-input text-xs py-1.5 w-full font-bold" 
                    aria-label={isDespacho ? 'Fecha programada de salida' : 'Fecha programada de retorno'} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#747780] block mb-1">
                    Hora de salida:
                  </label>
                  <input 
                    type="time" 
                    value={scheduleTime} 
                    onChange={e => setScheduleTime(e.target.value)} 
                    className="precision-input text-xs py-1.5 w-full font-bold" 
                    aria-label="Hora programada de salida" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSchedule(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#747780] hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  disabled={savingSchedule || !scheduleDate} 
                  onClick={saveSchedule} 
                  className="btn-precision-primary text-xs px-3 py-1 disabled:opacity-50 cursor-pointer"
                >
                  {savingSchedule ? 'Guardando...' : 'Guardar Programación'}
                </button>
              </div>
              {scheduleError && <p className="text-xs text-red-700 font-bold">{scheduleError}</p>}
            </div>
          )}
        </div>
      )}

      {/* 6. BOTÓN DE ACCIÓN PRINCIPAL DIRECTO: "PASAR A QUE YA SALIERON" / "PROCESAR SALIDA" */}
      <div className="pt-1">
        <button
          onClick={handleAction}
          className={`w-full py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
            isDespacho 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 hover:shadow-md' 
              : 'bg-amber-600 text-white hover:bg-amber-700 border border-amber-600 hover:shadow-md'
          }`}
        >
          {isDespacho ? (
            <>
              <Truck className="w-4 h-4" />
              <span>Procesar salida ({task.totalPendientesUnidades} u.)</span>
              <span className="text-[10px] font-normal opacity-90 block sm:inline">· Pasar a que ya salieron</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              <span>Iniciar recepción ({task.totalPendientesUnidades} u.)</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
