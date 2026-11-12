import React from 'react';
import type { InventorySummary } from '../types/grouped-inventory.types';
import { Package, CheckCircle2, Building2, CalendarClock, Wrench, TrendingUp } from 'lucide-react';

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
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 ${className}`}>
      {/* 1. Total Unidades */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Total Unidades
          </span>
          <Package className="w-4 h-4 text-slate-400" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {totalUnidades.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Flota completa registrada</span>
        </div>
      </div>

      {/* 2. Unidades Disponibles */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Disponibles en Bodega
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
            {unidadesDisponibles.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Listas para despacho inmediato</span>
        </div>
      </div>

      {/* 3. En Uso / Rentadas en Obra */}
      <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
            En Uso / Rentadas
          </span>
          <Building2 className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div className="text-2xl font-black text-blue-700 font-mono tracking-tight">
            {unidadesAlquiladas.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Activas en obra con clientes</span>
        </div>
      </div>

      {/* 4. Reservadas (En cotizaciones / contratos) */}
      <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Reservadas
          </span>
          <CalendarClock className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="text-2xl font-black text-amber-800 font-mono tracking-tight">
            {unidadesReservadas.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">En cotización o por despachar</span>
        </div>
      </div>

      {/* 5. En Reparación / Mantenimiento */}
      <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
            En Reparación / Taller
          </span>
          <Wrench className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <div className="text-2xl font-black text-rose-700 font-mono tracking-tight">
            {unidadesEnReparacion.toLocaleString('es-NI')}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Mantenimiento preventivo o avería</span>
        </div>
      </div>

      {/* 6. % Ocupación General */}
      <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
            % Ocupación General
          </span>
          <TrendingUp className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <div className="text-2xl font-black text-indigo-700 font-mono tracking-tight">
            {porcentajeOcupacion}%
          </div>
          <span className="text-[11px] text-indigo-600 font-medium">
            {(unidadesAlquiladas + unidadesReservadas).toLocaleString('es-NI')} rentadas + reservadas
          </span>
        </div>
      </div>
    </div>
  );
};
