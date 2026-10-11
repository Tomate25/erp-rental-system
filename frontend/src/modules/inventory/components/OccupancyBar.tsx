import React from 'react';
import type { StatusCounts } from '../types/grouped-inventory.types';

interface OccupancyBarProps {
  counts: StatusCounts;
  total: number;
  rentedPercentage?: number;
  className?: string;
  showLabels?: boolean;
}

export const OccupancyBar: React.FC<OccupancyBarProps> = ({
  counts,
  total,
  rentedPercentage,
  className = '',
  showLabels = true,
}) => {
  const { DISPONIBLE, ALQUILADO, RESERVADO, EN_REPARACION, BAJA } = counts;
  const totalActivo = DISPONIBLE + ALQUILADO + RESERVADO + EN_REPARACION;
  const totalConBaja = total > 0 ? total : totalActivo + BAJA;

  // Calculamos porcentajes respecto al total con baja para la barra completa
  const pAlquilado = totalConBaja > 0 ? (ALQUILADO / totalConBaja) * 100 : 0;
  const pReservado = totalConBaja > 0 ? (RESERVADO / totalConBaja) * 100 : 0;
  const pDisponible = totalConBaja > 0 ? (DISPONIBLE / totalConBaja) * 100 : 0;
  const pReparacion = totalConBaja > 0 ? (EN_REPARACION / totalConBaja) * 100 : 0;
  const pBaja = totalConBaja > 0 ? (BAJA / totalConBaja) * 100 : 0;

  // Porcentaje de ocupación sobre unidades activas (sin contar baja)
  const calcRentedPercent =
    rentedPercentage !== undefined
      ? rentedPercentage
      : totalActivo > 0
        ? Math.round((ALQUILADO / totalActivo) * 100)
        : 0;

  const accessibleLabel = `Ocupación: ${calcRentedPercent}% rentado. Desglose: ${ALQUILADO} alquilados, ${RESERVADO} reservados, ${DISPONIBLE} disponibles, ${EN_REPARACION} en reparación, ${BAJA} dados de baja de un total de ${totalConBaja} unidades.`;

  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-slate-700">
            {calcRentedPercent}% <span className="font-normal text-slate-500">rentado</span>
          </span>
          <span className="text-[11px] text-slate-500">
            {ALQUILADO + RESERVADO}/{totalActivo} ocupadas
          </span>
        </div>
      )}

      {/* Barra apilada con accesibilidad completa */}
      <div
        className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner"
        role="progressbar"
        aria-valuenow={calcRentedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={accessibleLabel}
        tabIndex={0}
        title={accessibleLabel}
      >
        <span className="sr-only">{accessibleLabel}</span>

        {pAlquilado > 0 && (
          <div
            style={{ width: `${pAlquilado}%` }}
            className="bg-blue-600 transition-all duration-300 relative group"
            title={`Alquilado: ${ALQUILADO} (${Math.round(pAlquilado)}%)`}
          />
        )}
        {pReservado > 0 && (
          <div
            style={{ width: `${pReservado}%` }}
            className="bg-amber-500 transition-all duration-300 relative group"
            title={`Reservado: ${RESERVADO} (${Math.round(pReservado)}%)`}
          />
        )}
        {pDisponible > 0 && (
          <div
            style={{ width: `${pDisponible}%` }}
            className="bg-emerald-600 transition-all duration-300 relative group"
            title={`Disponible: ${DISPONIBLE} (${Math.round(pDisponible)}%)`}
          />
        )}
        {pReparacion > 0 && (
          <div
            style={{ width: `${pReparacion}%` }}
            className="bg-rose-600 transition-all duration-300 relative group"
            title={`En Reparación: ${EN_REPARACION} (${Math.round(pReparacion)}%)`}
          />
        )}
        {pBaja > 0 && (
          <div
            style={{ width: `${pBaja}%` }}
            className="bg-slate-400 transition-all duration-300 relative group"
            title={`Baja: ${BAJA} (${Math.round(pBaja)}%)`}
          />
        )}
      </div>
    </div>
  );
};
