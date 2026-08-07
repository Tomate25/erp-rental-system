import React, { useState, useEffect } from 'react';
import { getReservations } from '../services/availability.api';
import type { Reserva } from '../types/availability.types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Package, User, X } from 'lucide-react';

export const AvailabilityPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'TIMELINE'>('CALENDAR');

  const fetchReservations = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const data = await getReservations(startOfMonth.toISOString(), endOfMonth.toISOString());
      setReservations(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [currentDate]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const filteredReservations = reservations;

  const getReservationsForDay = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    targetDate.setHours(12, 0, 0, 0); // normalize noon

    return filteredReservations.filter(r => {
      const start = new Date(r.fechaInicio);
      start.setHours(0, 0, 0, 0);
      const end = new Date(r.fechaFin);
      end.setHours(23, 59, 59, 999);
      return targetDate >= start && targetDate <= end;
    });
  };

  // Determine total grid cells required (either 35 or 42 depending on month start)
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  return (
    <div className="p-4 sm:p-8 animate-fadeIn space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-purple-600" />
            Disponibilidad y Ocupación
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Calendario en tiempo real de rentas y reservas por equipo (BM Construcciones)
          </p>
        </div>
        
        {/* Controles de Mes y Modo */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'CALENDAR' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TIMELINE' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Línea de Tiempo
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-black text-slate-800 text-xs sm:text-sm min-w-[130px] text-center uppercase tracking-wider">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-lg transition-colors ml-1">
              Hoy
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-200 text-center">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, idx) => (
            <div key={day} className={`py-3 text-[11px] font-black uppercase tracking-wider ${idx === 0 || idx === 6 ? 'text-purple-600/70' : 'text-slate-500'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid de Días */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/50">
          {Array.from({ length: totalCells }).map((_, index) => {
            const dayNumber = index - firstDayOfMonth + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const isToday = isCurrentMonth && 
                            dayNumber === new Date().getDate() && 
                            currentDate.getMonth() === new Date().getMonth() && 
                            currentDate.getFullYear() === new Date().getFullYear();
            
            const dayReservations = isCurrentMonth ? getReservationsForDay(dayNumber) : [];

            return (
              <div 
                key={index} 
                className={`min-h-[110px] p-2 bg-white flex flex-col justify-between transition-colors ${
                  !isCurrentMonth ? 'bg-slate-50/60 text-slate-300' : isToday ? 'bg-purple-50/20' : 'hover:bg-slate-50/50'
                }`}
              >
                {isCurrentMonth ? (
                  <>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-700'
                      }`}>
                        {dayNumber}
                      </span>
                      {dayReservations.length > 0 && (
                        <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                          {dayReservations.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5 scrollbar-thin">
                      {dayReservations.map(res => (
                        <div 
                          key={res.id} 
                          onClick={() => setSelectedReserva(res)}
                          className={`p-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] border ${
                            res.estado === 'CONFIRMADA' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-black truncate">
                            <Package className="w-3 h-3 shrink-0" />
                            <span className="truncate">{res.equipo?.codigo || 'EQ'} · {res.equipo?.descripcion}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-medium opacity-80 truncate mt-0.5">
                            <User className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{res.contrato?.cliente?.nombre}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-slate-300 select-none p-1">
                    {new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber).getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"></span>
            <span>Renta Confirmada / En Uso</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30"></span>
            <span>Reserva Pendiente</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Haz clic en cualquier reserva para ver el detalle del contrato
        </span>
      </div>

      {/* Modal de Detalle de Reserva */}
      {selectedReserva && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl text-white ${selectedReserva.estado === 'CONFIRMADA' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">{selectedReserva.equipo?.descripcion}</h3>
                  <p className="text-xs text-slate-500 font-medium">Código: {selectedReserva.equipo?.codigo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReserva(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Cliente</span>
                  <span className="font-bold text-slate-800">{selectedReserva.contrato?.cliente?.nombre}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Contrato</span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{selectedReserva.contrato?.codigo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Estado</span>
                  <span className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                    selectedReserva.estado === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedReserva.estado}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Fecha Inicio</span>
                  <span className="font-black text-slate-800">
                    {new Date(selectedReserva.fechaInicio).toLocaleDateString('es-NI')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Fecha Devolución</span>
                  <span className="font-black text-slate-800">
                    {new Date(selectedReserva.fechaFin).toLocaleDateString('es-NI')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedReserva(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
