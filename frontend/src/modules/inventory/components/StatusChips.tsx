import React from 'react';
import type { StatusCounts } from '../types/grouped-inventory.types';

interface StatusChipsProps {
  counts: StatusCounts;
  compact?: boolean;
  className?: string;
}

export const StatusChips: React.FC<StatusChipsProps> = ({
  counts,
  compact = false,
  className = '',
}) => {
  const { DISPONIBLE, ALQUILADO, RESERVADO, EN_REPARACION, BAJA } = counts;

  if (compact) {
    // Formato conciso: "3 disp · 2 rent · 1 rep"
    const parts: React.ReactNode[] = [];
    if (DISPONIBLE > 0) {
      parts.push(
        <span key="disp" className="text-slate-700 font-semibold">
          <span>{DISPONIBLE} disp</span>
        </span>
      );
    }
    if (ALQUILADO > 0) {
      parts.push(
        <span key="rent" className="text-slate-700 font-semibold">
          <span>{ALQUILADO} rent</span>
        </span>
      );
    }
    if (RESERVADO > 0) {
      parts.push(
        <span key="res" className="text-slate-700 font-semibold">
          <span>{RESERVADO} res</span>
        </span>
      );
    }
    if (EN_REPARACION > 0) {
      parts.push(
        <span key="rep" className="text-slate-700 font-semibold">
          <span>{EN_REPARACION} rep</span>
        </span>
      );
    }
    if (BAJA > 0) {
      parts.push(
        <span key="baja" className="text-slate-700 font-semibold">
          <span>{BAJA} baja</span>
        </span>
      );
    }

    if (parts.length === 0) {
      return <span className="text-slate-400 text-xs italic">Sin unidades</span>;
    }

    return (
      <div className={`flex flex-wrap items-center gap-1.5 text-xs ${className}`}>
        {parts.map((p, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-slate-300 font-bold" aria-hidden="true">·</span>}
            {p}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Formato chips completos individuales
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {DISPONIBLE > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
          title={`${DISPONIBLE} unidades disponibles`}
        >
          <span>{DISPONIBLE} Disponibles</span>
        </span>
      )}
      {ALQUILADO > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200"
          title={`${ALQUILADO} unidades alquiladas`}
        >
          <span>{ALQUILADO} Alquilados</span>
        </span>
      )}
      {RESERVADO > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200"
          title={`${RESERVADO} unidades reservadas`}
        >
          <span>{RESERVADO} Reservados</span>
        </span>
      )}
      {EN_REPARACION > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200"
          title={`${EN_REPARACION} unidades en reparación`}
        >
          <span>{EN_REPARACION} En reparación</span>
        </span>
      )}
      {BAJA > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
          title={`${BAJA} unidades dadas de baja`}
        >
          <span>{BAJA} De baja</span>
        </span>
      )}
    </div>
  );
};
