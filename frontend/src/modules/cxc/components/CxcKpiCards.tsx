import React from 'react';
import type { KpiTramoItem, MonedaTipo } from '../types/cxc.types';
import { DollarSign, AlertCircle, Clock, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface CxcKpiCardsProps {
  kpis: KpiTramoItem[];
  totalCartera: number;
  totalDocumentos: number;
  moneda: MonedaTipo;
  onMonedaChange: (m: MonedaTipo) => void;
  tipoCambioBcn: number;
  avisoFaltaTasaBcn?: boolean;
}

export const CxcKpiCards: React.FC<CxcKpiCardsProps> = ({
  kpis,
  totalCartera,
  totalDocumentos,
  moneda,
  onMonedaChange,
  tipoCambioBcn,
  avisoFaltaTasaBcn,
}) => {
  const getIconForTramo = (id: string) => {
    switch (id) {
      case 'corriente':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case '1_30':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case '31_60':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case '61_90':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case '90_mas':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColorForTramo = (id: string) => {
    switch (id) {
      case 'corriente':
        return 'border-emerald-200 bg-emerald-50/40 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20';
      case '1_30':
        return 'border-blue-200 bg-blue-50/40 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/20';
      case '31_60':
        return 'border-amber-200 bg-amber-50/40 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20';
      case '61_90':
        return 'border-orange-200 bg-orange-50/40 text-orange-950 dark:border-orange-900/40 dark:bg-orange-950/20';
      case '90_mas':
        return 'border-rose-200 bg-rose-50/40 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/20';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-900';
    }
  };

  const formatMonto = (valor: number) => {
    const symbol = moneda === 'USD' ? '$' : 'C$';
    return `${symbol} ${valor.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Barra superior de Tipo de Cambio BCN y Switcher Moneda */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-800 dark:text-amber-300 text-xs font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>TC Oficial BCN:</span>
            <span className="font-bold text-sm">1 USD = {tipoCambioBcn.toFixed(4)} NIO</span>
          </div>
          {avisoFaltaTasaBcn && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              (Tasa referencial BCN más reciente)
            </span>
          )}
        </div>

        {/* Toggle Moneda 1 Clic */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Moneda de visualización:</span>
          <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg border border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={() => onMonedaChange('NIO')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                moneda === 'NIO'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              C$ Córdobas
            </button>
            <button
              type="button"
              onClick={() => onMonedaChange('USD')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                moneda === 'USD'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              $ Dólares (USD)
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas KPI por Rango */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.tramoId}
            className={`p-3.5 rounded-xl border transition-all hover:shadow-md ${getBorderColorForTramo(kpi.tramoId)}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">{kpi.nombre}</span>
              {getIconForTramo(kpi.tramoId)}
            </div>
            <div className="text-lg font-bold truncate tracking-tight">{formatMonto(kpi.montoVisualizado)}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
              <span className="font-semibold">{kpi.porcentaje.toFixed(1)}%</span>
              <span className="text-gray-500 dark:text-gray-400">{kpi.cantidadDocumentos} doc(s)</span>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-current opacity-70 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, kpi.porcentaje))}%` }}
              />
            </div>
          </div>
        ))}

        {/* Tarjeta Total Cartera */}
        <div className="p-3.5 rounded-xl border border-gray-800 bg-gray-900 text-white dark:border-gray-700 dark:bg-gray-800 col-span-2 md:col-span-3 lg:col-span-1 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Total Cartera</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-lg font-bold truncate text-white tracking-tight">{formatMonto(totalCartera)}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[11px] text-gray-300">
            <span className="font-semibold">100.0%</span>
            <span>{totalDocumentos} documentos</span>
          </div>
          <div className="w-full bg-blue-900/60 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-blue-400 rounded-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
