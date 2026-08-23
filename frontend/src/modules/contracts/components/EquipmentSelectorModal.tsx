import React, { useState } from 'react';
import type { Equipment } from '../../inventory/types/inventory.types';
import { Search, X, Truck, HardHat, CheckCircle2, Clock, ShieldAlert, Tag, Wrench } from 'lucide-react';

interface EquipmentSelectorModalProps {
  equipments: Equipment[];
  onSelectEquipment: (equipment: Equipment) => void;
  onClose: () => void;
}

export const EquipmentSelectorModal: React.FC<EquipmentSelectorModalProps> = ({ equipments, onSelectEquipment, onClose }) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DISPONIBLE'>('DISPONIBLE');

  const filteredEquipments = equipments.filter(eq => {
    if (statusFilter === 'DISPONIBLE' && eq.estado !== 'DISPONIBLE' && eq.estado !== 'RENTADO') {
      // Mostrar prioritariamente disponibles
    }

    const q = query.toLowerCase().trim();
    if (!q) return true;

    return (
      eq.modelo.toLowerCase().includes(q) ||
      (eq.numeroSerie && eq.numeroSerie.toLowerCase().includes(q)) ||
      (eq.codigo && eq.codigo.toLowerCase().includes(q)) ||
      (eq.marca && eq.marca.nombre.toLowerCase().includes(q)) ||
      (eq.categoria && eq.categoria.nombre.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'DISPONIBLE':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Disponible</span>;
      case 'RENTADO':
      case 'DESPACHADO':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1"><Clock className="w-3 h-3"/> En Obra</span>;
      case 'EN_MANTENIMIENTO':
      case 'MANTENIMIENTO':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1"><Wrench className="w-3 h-3"/> En Servicio</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-300"><ShieldAlert className="w-3 h-3"/> {estado}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#37474F]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-[#37474F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10">
              <Truck className="w-6 h-6 text-[#1A73E8]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Catálogo de Maquinaria y Equipos</h3>
              <p className="text-xs text-white/80 font-medium">Selecciona el equipo para incluirlo en la entrega del contrato</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador y Filtros */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E8EE] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-[#747780] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por Modelo, Número de Serie, Código, Marca, Categoría..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="precision-input pl-10 text-xs py-2.5 font-bold"
              autoFocus
            />
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-[#E5E8EE] text-xs shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('DISPONIBLE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'DISPONIBLE' ? 'bg-[#1A73E8] text-white' : 'text-[#747780]'
              }`}
            >
              Solo Disponibles
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-[#1A73E8] text-white' : 'text-[#747780]'
              }`}
            >
              Todos los Equipos
            </button>
          </div>
        </div>

        {/* Grilla / Lista de Tarjetas de Equipos */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 max-h-[55vh]">
          {filteredEquipments.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <HardHat className="w-10 h-10 text-[#747780] mx-auto opacity-50" />
              <h4 className="text-sm font-extrabold text-[#1B1D22]">No se encontraron equipos</h4>
              <p className="text-xs text-[#747780]">Intenta ajustar los filtros de búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEquipments.map((eq) => {
                const isOccupied = eq.cantidadDisponible <= 0 || (eq.estado as string) === 'RENTADO' || (eq.estado as string) === 'DESPACHADO' || eq.estado === 'MANTENIMIENTO';
                return (
                  <div
                    key={eq.id}
                    onClick={() => {
                      if (isOccupied) return;
                      onSelectEquipment(eq);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                      isOccupied 
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                        : 'bg-white border-[#E5E8EE] hover:border-[#1A73E8] hover:shadow-md hover:bg-[#E8F0FE]/20 cursor-pointer group'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                          isOccupied ? 'bg-red-50 border-red-200 text-red-500' : 'bg-[#F4F6F9] border-[#E5E8EE] text-[#37474F] group-hover:bg-[#1A73E8] group-hover:text-white'
                        }`}>
                          <HardHat className="w-5 h-5" />
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-[#1B1D22] group-hover:text-[#1A73E8] transition-colors leading-tight">
                            {eq.modelo}
                          </h4>
                          <span className="text-[10px] text-[#747780] font-bold block">
                            Marca: {eq.marca?.nombre || 'General'}
                          </span>
                        </div>
                      </div>

                      {isOccupied ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          🔴 Ocupado (0 Disp)
                        </span>
                      ) : (
                        getStatusBadge(eq.estado)
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E5E8EE]">
                      <div>
                        <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Stock Disponible</span>
                        <span className={`font-mono font-black ${isOccupied ? 'text-red-600' : 'text-[#1A73E8]'}`}>
                          {eq.cantidadDisponible} u. / {eq.cantidadTotal} tot.
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Serie / Código</span>
                        <span className="font-mono font-bold text-[#37474F]">
                          {eq.numeroSerie || eq.codigo || 'ESTÁNDAR'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#E5E8EE] pt-2.5">
                      <div>
                        <span className="text-[9px] font-extrabold text-[#747780] uppercase block">
                          Tarifa Renta Día
                        </span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-sm font-black text-[#1A73E8]">
                            C$ {eq.precioRentaDia?.toLocaleString()} / día
                          </span>
                        </div>
                      </div>

                      {isOccupied ? (
                        <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                          No Seleccionable
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-precision-primary bg-[#37474F] group-hover:bg-[#1A73E8] text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5" /> Seleccionar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E8EE] flex items-center justify-between text-xs text-[#747780]">
          <span>Total equipos en catálogo: <strong className="text-[#1B1D22]">{equipments.length}</strong></span>
          <button
            onClick={onClose}
            className="btn-precision-outline text-xs"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};
