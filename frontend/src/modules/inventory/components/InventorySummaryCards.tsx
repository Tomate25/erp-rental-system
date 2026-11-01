import React from 'react';
import type { InventorySummary } from '../types/grouped-inventory.types';

interface InventorySummaryCardsProps {
  summary: InventorySummary;
  className?: string;
}

export const InventorySummaryCards: React.FC<InventorySummaryCardsProps> = ({
  summary,
  className = '',
}) => {
  const {
    totalUnidades,
    porcentajeOcupacion,
    unidadesDisponibles,
    unidadesAlquiladas,
    unidadesReservadas,
    unidadesEnReparacion,
  } = summary;

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {/* 1. Total Unidades */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Total Unidades
          </span>
        </div>
        <div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {totalUnidades.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Flota completa registrada</span>
        </div>
      </div>

      {/* 2. % Ocupación General */}
      <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            % Ocupación General
          </span>
        </div>
        <div>
          <div className="text-2xl font-black text-blue-700 font-mono tracking-tight">
            {porcentajeOcupacion}%
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {(unidadesAlquiladas + unidadesReservadas).toLocaleString('es-NI')} rentadas + reservadas
          </span>
        </div>
      </div>

      {/* 3. Unidades Disponibles */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Disponibles en Bodega
          </span>
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
            {unidadesDisponibles.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Listas para despacho inmediato</span>
        </div>
      </div>

      {/* 4. En Reparación / Mantenimiento */}
      <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            En Reparación / Taller
          </span>
        </div>
        <div>
          <div className="text-2xl font-black text-rose-700 font-mono tracking-tight">
            {unidadesEnReparacion.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Mantenimiento preventivo o avería</span>
        </div>
      </div>
    </div>
  );
};
