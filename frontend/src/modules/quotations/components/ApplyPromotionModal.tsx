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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-surface-base border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-wide">
                Promociones y Combos Disponibles
              </h2>
              <p className="text-xs text-text-secondary">
                Selecciona un combo para aplicar automáticamente los equipos y su tarifa especial a esta cotización.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-xs text-text-tertiary">
              Cargando promociones vigentes...
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-border-default bg-surface-subtle">
              <Sparkles className="w-8 h-8 mx-auto text-text-tertiary mb-2 opacity-40" />
              <p className="text-sm font-semibold text-text-primary">
                No hay promociones activas registradas
              </p>
              <p className="text-xs text-text-tertiary mt-1">
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
                    className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                        : 'border-border-default bg-surface-elevated hover:border-emerald-500/40'
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-base text-emerald-400 border border-emerald-500/20">
                          <Tag className="w-3 h-3" />
                          {promo.codigo}
                        </span>

                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Seleccionada
                          </span>
                        )}
                      </div>

                      {/* Name & Desc */}
                      <h3 className="text-sm font-bold text-text-primary leading-tight">
                        {promo.nombre}
                      </h3>
                      {promo.descripcion && (
                        <p className="text-xs text-text-secondary mt-1">
                          {promo.descripcion}
                        </p>
                      )}

                      {/* Machines List */}
                      <div className="mt-3 pt-2 border-t border-border-default space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Equipos incluidos ({promo.items?.length || 0}):
                        </div>
                        <div className="space-y-1">
                          {promo.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs px-2 py-1 rounded bg-surface-base border border-border-default"
                            >
                              <span className="text-text-primary font-medium truncate max-w-[180px]">
                                {item.producto?.nombre || 'Equipo del combo'}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10">
                                x{item.cantidad}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Apply Button */}
                    <div className="mt-4 pt-3 border-t border-border-default flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">
                          Tarifa Paquete ({promo.tipoCobro === 'POR_HORA' ? 'Hora' : 'Día'})
                        </span>
                        <div className="text-lg font-black text-emerald-400">
                          ${precioComboNum.toFixed(2)}
                        </div>
                        {promo.diasMinimos > 1 && (
                          <span
                            className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                              meetsMinDays ? 'text-text-tertiary' : 'text-amber-400 font-semibold'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            Min. {promo.diasMinimos} días (Cotización: {diasRenta}d)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectPromotion(promo);
                          onClose();
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
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
        <div className="flex items-center justify-end px-6 py-3 border-t border-border-default bg-surface-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-base transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
