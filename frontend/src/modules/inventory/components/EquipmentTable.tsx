import React from 'react';
import type { Equipment } from '../types/inventory.types';
import { Edit2, Trash2, Wrench } from 'lucide-react';

interface EquipmentTableProps {
  equipments: Equipment[];
  onEdit: (equipment: Equipment) => void;
  onDelete: (id: string) => void;
}

export const EquipmentTable: React.FC<EquipmentTableProps> = ({ equipments, onEdit, onDelete }) => {
  
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'DISPONIBLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'RESERVADO':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'RENTADO':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'RETORNO':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'MANTENIMIENTO':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'BAJA':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount);
  };

  if (equipments.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-16 text-center shadow-sm">
        <div className="p-4 rounded-full bg-slate-50 inline-flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
          <Wrench className="w-8 h-8" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-800">No hay maquinaria registrada</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Comienza registrando tus equipos y maquinarias pesadas en tu inventario para poder rentarlas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* --- VISTA MÓVIL: Tarjetas adaptables (Oculto en pantallas medianas) --- */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {equipments.map((eq) => (
          <div key={eq.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Header Tarjeta */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  {eq.categoria?.nombre || 'General'}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {eq.codigo && (
                    <span className="shrink-0 inline-block px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-black font-mono tracking-wider">
                      {eq.codigo}
                    </span>
                  )}
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug break-words">
                    {eq.descripcion || `${eq.marca?.nombre} ${eq.modelo}`}
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {eq.marca?.nombre} · {eq.modelo}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold tracking-wider uppercase shrink-0 ${getStatusBadge(eq.estado)}`}>
                {eq.estado}
              </span>
            </div>

            {/* Info Técnica y Tarifas */}
            <div className="grid grid-cols-2 gap-3 border-t border-b border-slate-100 py-3 text-[11px]">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Cantidad (Total / Disp)</span>
                <span className="text-slate-700 font-bold">{eq.cantidadTotal} / {eq.cantidadDisponible}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Número de Serie</span>
                <span className="font-mono text-slate-700">{eq.numeroSerie || 'S/S'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Horómetro</span>
                <span className="text-slate-700 font-bold">{eq.horometro} hrs</span>
              </div>
              <div className="pt-1.5">
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Tarifa de Renta</span>
                <span className="text-slate-900 font-black text-sm">{formatCurrency(eq.precioRentaDia)} <span className="text-[10px] font-normal text-slate-500">/ día</span></span>
              </div>
            </div>

            {/* Footer Tarjeta: Acciones */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[10px] text-slate-400 font-bold">
                Sucursal: {eq.sucursal?.nombre || 'Global'}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(eq)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => onDelete(eq.id)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-650 hover:bg-red-50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Borrar
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* --- VISTA ESCRITORIO: Tabla tradicional --- */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="p-4">Código</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 text-center">Cant.</th>
                <th className="p-4 text-center">Disp.</th>
                <th className="p-4">Marca</th>
                <th className="p-4">Modelo</th>
                <th className="p-4">Serie</th>
                <th className="p-4 text-right">Renta / Día</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
              {equipments.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-50/40 transition-colors">
                  {/* Código */}
                  <td className="p-4">
                    {eq.codigo ? (
                      <span className="inline-block px-2 py-1 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black font-mono tracking-wider">
                        {eq.codigo}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Descripción */}
                  <td className="p-4">
                    <div className="font-bold text-slate-900 text-xs break-words min-w-[150px]">
                      {eq.descripcion}
                    </div>
                  </td>

                  {/* Cantidad Total */}
                  <td className="p-4 text-center font-bold text-slate-800">
                    {eq.cantidadTotal}
                  </td>

                  {/* Cantidad Disponible */}
                  <td className="p-4 text-center">
                    {(() => {
                      const total = eq.cantidadTotal;
                      const disp = eq.cantidadDisponible;
                      const pct = total > 0 ? disp / total : 1;
                      const color = pct === 0 ? 'text-red-650' : pct < 0.3 ? 'text-amber-600' : 'text-emerald-600';
                      return <span className={`font-black ${color}`}>{disp}</span>;
                    })()}
                  </td>

                  {/* Marca */}
                  <td className="p-4 font-semibold text-slate-700">
                    {eq.marca?.nombre}
                  </td>

                  {/* Modelo */}
                  <td className="p-4 text-slate-600 font-mono">
                    {eq.modelo}
                  </td>

                  {/* Serie */}
                  <td className="p-4 font-mono text-slate-500">
                    {eq.numeroSerie || <span className="text-slate-300">-</span>}
                  </td>

                  {/* Tarifa */}
                  <td className="p-4 text-right font-black text-slate-900">
                    {formatCurrency(eq.precioRentaDia)}
                  </td>

                  {/* Estado */}
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(eq.estado)}`}>
                      {eq.estado}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(eq)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar activo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(eq.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-650 hover:bg-red-50 transition-colors"
                        title="Eliminar activo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
