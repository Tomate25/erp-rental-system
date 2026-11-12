import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Tag,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Promocion } from '../../promotions/types/promotion.types';
import { getPromotions } from '../../promotions/services/promotions.api';

interface ApplyPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPromotion: (promotion: Promocion) => void;
  selectedPromotionId?: string;
  diasRenta?: number;
}

export const ApplyPromotionModal: React.FC<ApplyPromotionModalProps> = ({
  isOpen,
  onClose,
  onSelectPromotion,
  selectedPromotionId,
  diasRenta = 1,
}) => {
  const [promotions, setPromotions] = useState<Promocion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getPromotions({ activo: true })
        .then((data) => {
          setPromotions(data || []);
          setError(null);
        })
        .catch((err) => {
          setError(err.message || 'Error al cargar promociones');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Promociones y Combos Disponibles
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Selecciona un combo para aplicar automáticamente los equipos y su tarifa especial a esta cotización.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 font-medium">
              Cargando paquetes y promociones vigentes...
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
              <Sparkles className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="text-sm font-black text-slate-800">
                No hay promociones activas registradas
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Puedes registrar nuevos combos desde el módulo de Promociones en el menú principal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promotions.map((promo) => {
                const isSelected = selectedPromotionId === promo.id;
                const precioComboNum = Number(promo.precioCombo) || 0;
                const meetsMinDays = diasRenta >= (promo.diasMinimos || 1);

                return (
                  <div
                    key={promo.id}
                    className={`flex flex-col justify-between p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Tag className="w-3 h-3 text-slate-600" />
                          {promo.codigo}
                        </span>

                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Seleccionada
                          </span>
                        )}
                      </div>

                      {/* Name & Desc */}
                      <h3 className="text-sm font-black text-slate-900 leading-snug">
                        {promo.nombre}
                      </h3>
                      {promo.descripcion && (
                        <p className="text-xs text-slate-600 font-medium mt-1">
                          {promo.descripcion}
                        </p>
                      )}

                      {/* Machines List */}
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Equipos incluidos ({promo.items?.length || 0}):
                        </div>
                        <div className="space-y-1">
                          {promo.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200"
                            >
                              <span className="text-slate-800 font-medium truncate max-w-[190px]">
                                {item.producto?.nombre || 'Equipo del combo'}
                              </span>
                              <span className="text-xs font-black text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-200">
                                x{item.cantidad}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Apply Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Tarifa Paquete ({promo.tipoCobro === 'POR_HORA' ? 'Hora' : 'Día'})
                        </span>
                        <div className="text-lg font-black text-emerald-700">
                          ${precioComboNum.toFixed(2)}
                        </div>
                        {promo.diasMinimos > 1 && (
                          <span
                            className={`text-[10px] flex items-center gap-1 mt-0.5 font-bold ${
                              meetsMinDays ? 'text-slate-500' : 'text-amber-700'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            Mín. {promo.diasMinimos} días (Cotización: {diasRenta}d)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectPromotion(promo);
                          onClose();
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        {isSelected ? 'Reaplicar' : 'Aplicar Combo'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
