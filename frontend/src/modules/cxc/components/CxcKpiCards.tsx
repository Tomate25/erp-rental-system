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
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case '1_30':
        return <Clock className="w-5 h-5 text-[#1A73E8]" />;
      case '31_60':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case '61_90':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case '90_mas':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColorForTramo = (id: string) => {
    switch (id) {
      case 'corriente':
        return 'border-emerald-200 bg-emerald-50/70 text-emerald-950';
      case '1_30':
        return 'border-blue-200 bg-blue-50/70 text-blue-950';
      case '31_60':
        return 'border-amber-200 bg-amber-50/70 text-amber-950';
      case '61_90':
        return 'border-orange-200 bg-orange-50/70 text-orange-950';
      case '90_mas':
        return 'border-rose-200 bg-rose-50/70 text-rose-950';
      default:
        return 'border-[#E5E8EE] bg-white text-[#1B1D22]';
    }
  };

  const formatMonto = (valor: number) => {
    const symbol = moneda === 'USD' ? '$' : 'C$';
    return `${symbol} ${valor.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Barra superior de Tipo de Cambio BCN y Switcher Moneda */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-[#E5E8EE] shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            <span>TC Oficial BCN:</span>
            <span className="font-extrabold text-sm text-[#1B1D22]">1 USD = {tipoCambioBcn.toFixed(4)} NIO</span>
          </div>
          {avisoFaltaTasaBcn && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 font-medium">
              (Tasa referencial BCN más reciente)
            </span>
          )}
        </div>

        {/* Toggle Moneda 1 Clic */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#747780] font-bold">Moneda de visualización:</span>
          <div className="inline-flex p-1 bg-[#F4F6F9] rounded-xl border border-[#E5E8EE]">
            <button
              type="button"
              onClick={() => onMonedaChange('NIO')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                moneda === 'NIO'
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              C$ Córdobas
            </button>
            <button
              type="button"
              onClick={() => onMonedaChange('USD')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                moneda === 'USD'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
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
            className={`p-4 rounded-2xl border transition-all hover:shadow-sm ${getBorderColorForTramo(kpi.tramoId)}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider">{kpi.nombre}</span>
              {getIconForTramo(kpi.tramoId)}
            </div>
            <div className="text-base font-black truncate tracking-tight text-[#1B1D22]">{formatMonto(kpi.montoVisualizado)}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 text-[11px]">
              <span className="font-extrabold">{kpi.porcentaje.toFixed(1)}%</span>
              <span className="text-[#747780] font-medium">{kpi.cantidadDocumentos} doc(s)</span>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-current opacity-70 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, kpi.porcentaje))}%` }}
              />
            </div>
          </div>
        ))}

        {/* Tarjeta Total Cartera - Brand Blue corporativo (sin color negro) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1A73E8] to-[#1557B0] text-white col-span-2 md:col-span-3 lg:col-span-1 shadow-sm border border-[#1A73E8]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-100">Total Cartera</span>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="text-base font-black truncate text-white tracking-tight">{formatMonto(totalCartera)}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20 text-[11px] text-blue-100">
            <span className="font-extrabold text-white">100.0%</span>
            <span>{totalDocumentos} documentos</span>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-white rounded-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
