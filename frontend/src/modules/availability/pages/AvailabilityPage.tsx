import React, { useState, useEffect } from 'react';
import { getReservations } from '../services/availability.api';
import type { Reserva } from '../types/availability.types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Package, User, X } from 'lucide-react';

import { OperationsBoard } from '../../operations/components/OperationsBoard';
import { LayoutGrid } from 'lucide-react';

export const AvailabilityPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'CALENDAR' | 'TIMELINE'>('KANBAN');

  const [selectedEquipoFilter, setSelectedEquipoFilter] = useState<string>('ALL');
  const [equiposList, setEquiposList] = useState<{ id: string; modelo: string; codigo?: string }[]>([]);

  const fetchReservations = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const data = await getReservations(startOfMonth.toISOString(), endOfMonth.toISOString());
      setReservations(data);

      // Extraer lista única de equipos presentes en las reservas/contratos
      const eqMap = new Map<string, { id: string; modelo: string; codigo?: string }>();
      data.forEach(r => {
        if (r.equipo) {
          eqMap.set(r.equipo.id, {
            id: r.equipo.id,
            modelo: r.equipo.modelo || r.equipo.descripcion || 'Equipo',
            codigo: r.equipo.codigo || undefined
          });
        }
      });
      setEquiposList(Array.from(eqMap.values()));
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

  const filteredReservations = selectedEquipoFilter === 'ALL'
    ? reservations
    : reservations.filter(r => r.equipoId === selectedEquipoFilter || r.equipo?.id === selectedEquipoFilter);

  const getReservationsForDay = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    targetDate.setHours(12, 0, 0, 0);

    return filteredReservations.filter(r => {
      const start = new Date(r.fechaInicio);
      start.setHours(0, 0, 0, 0);
      const end = new Date(r.fechaFin);
      end.setHours(23, 59, 59, 999);
      return targetDate >= start && targetDate <= end;
    });
  };

  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  return (
    <div className="animate-fadeIn space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#37474F] text-white shadow-md shadow-[#37474F]/20">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1B1D22] tracking-tight">Disponibilidad y Ocupación</h1>
            <p className="text-xs text-[#747780] font-medium">Filtra por equipo para ver exactamente su calendario de alquiler.</p>
          </div>
        </div>
        
        {/* Controles de Mes, Filtro de Equipo y Modo */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Equipo */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E5E8EE] px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold">
            <span className="text-[#747780]">🚜 Equipo:</span>
            <select
              value={selectedEquipoFilter}
              onChange={(e) => setSelectedEquipoFilter(e.target.value)}
              className="bg-transparent focus:outline-none font-bold text-[#1B1D22] cursor-pointer"
            >
              <option value="ALL">Ver Todos los Equipos ({equiposList.length})</option>
              {equiposList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.codigo ? `[${eq.codigo}] ` : ''}{eq.modelo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE]">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'KANBAN' ? 'bg-[#37474F] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Tablero Kanban
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'CALENDAR' ? 'bg-[#1A73E8] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Calendario Mes
            </button>
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TIMELINE' ? 'bg-[#1A73E8] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Timeline Equipos
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#E5E8EE] p-1 rounded-xl shadow-xs">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-[#F4F6F9] rounded-lg text-[#747780] hover:text-[#1B1D22]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-2.5 py-1 text-xs font-extrabold text-[#37474F]">
              Hoy
            </button>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-[#F4F6F9] rounded-lg text-[#747780] hover:text-[#1B1D22]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="font-black text-sm text-[#1B1D22] min-w-[120px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
      </div>

      {/* Renderizado según Modo Seleccionado */}
      {viewMode === 'KANBAN' ? (
        <OperationsBoard
          onProcessDespacho={() => {}}
          onProcessRetorno={() => {}}
        />
      ) : viewMode === 'CALENDAR' ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#E5E8EE] bg-[#F4F6F9] text-center text-[10px] font-extrabold uppercase tracking-wider text-[#747780] py-3">
            <div>Dom</div>
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E8EE] bg-white">
            {Array.from({ length: totalCells }).map((_, index) => {
              const dayNumber = index - firstDayOfMonth + 1;
              const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
              const isToday = isValidDay && dayNumber === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
              const dayReservations = isValidDay ? getReservationsForDay(dayNumber) : [];

              return (
                <div 
                  key={index}
                  className={`min-h-[110px] p-2 flex flex-col transition-colors ${
                    !isValidDay ? 'bg-[#F8FAFC]' : 'hover:bg-[#F4F6F9]/50'
                  }`}
                >
                  {isValidDay && (
                    <>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday ? 'bg-[#1A73E8] text-white shadow-xs' : 'text-[#37474F]'
                        }`}>
                          {dayNumber}
                        </span>
                        {dayReservations.length > 0 && (
                          <span className="text-[9px] font-extrabold text-[#C55500] bg-[#C55500]/10 px-1.5 py-0.5 rounded-md border border-[#C55500]/20">
                            {dayReservations.length} Renta{dayReservations.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                        {dayReservations.map(res => (
                          <button
                            key={res.id}
                            onClick={() => setSelectedReserva(res)}
                            className="w-full text-left p-1.5 rounded-lg text-[10px] bg-[#1A73E8]/10 text-[#1A73E8] hover:bg-[#1A73E8] hover:text-white border border-[#1A73E8]/20 transition-all font-bold truncate block"
                          >
                            <div className="truncate">{res.equipo?.descripcion || res.equipo?.modelo}</div>
                            <div className="text-[8px] opacity-80 truncate">{res.contrato?.cliente?.nombre}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Timeline equipos */
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-8 text-center shadow-xs">
          <CalendarIcon className="w-12 h-12 text-[#747780] mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-[#1B1D22]">Modo Timeline en tiempo real</h3>
          <p className="text-xs text-[#747780] mt-1 font-medium">Todos los equipos están mapeados al calendario de ocupación actual.</p>
        </div>
      )}

      {/* Modal Detalle de Reserva */}
      {selectedReserva && (
        <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-[#E5E8EE] pb-3">
              <h3 className="font-black text-[#1B1D22] text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-[#1A73E8]" />
                Detalle de Ocupación
              </h3>
              <button onClick={() => setSelectedReserva(null)} className="p-1 text-[#747780] hover:text-[#1B1D22]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE]">
                <span className="text-[10px] text-[#747780] font-extrabold uppercase">Equipo</span>
                <p className="font-extrabold text-[#1B1D22] text-sm mt-0.5">{selectedReserva.equipo?.descripcion || selectedReserva.equipo?.modelo}</p>
                <p className="text-[10px] font-mono text-[#1A73E8] font-extrabold mt-0.5">Serie: {selectedReserva.equipo?.numeroSerie || 'N/A'}</p>
              </div>

              <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE]">
                <span className="text-[10px] text-[#747780] font-extrabold uppercase">Cliente</span>
                <p className="font-extrabold text-[#1B1D22] flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-[#1A73E8]" />
                  {selectedReserva.contrato?.cliente?.nombre || 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE]">
                  <span className="text-[9px] text-[#747780] font-extrabold uppercase">Inicio Renta</span>
                  <p className="font-bold text-[#1B1D22] mt-0.5">{new Date(selectedReserva.fechaInicio).toLocaleDateString()}</p>
                </div>
                <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE]">
                  <span className="text-[9px] text-[#747780] font-extrabold uppercase">Fin Renta</span>
                  <p className="font-bold text-[#1B1D22] mt-0.5">{new Date(selectedReserva.fechaFin).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button onClick={() => setSelectedReserva(null)} className="btn-precision-primary text-xs py-2 px-5">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
