import React, { useState, useEffect } from 'react';
import type { GroupedProduct } from '../types/grouped-inventory.types';
import { updateInventoryPricing } from '../services/inventory.api';
import {
  X,
  Tag,
  Clock,
  Layers,
  Save,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';

interface EditProductPricingModalProps {
  product: GroupedProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditProductPricingModal: React.FC<EditProductPricingModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [precioDiaA, setPrecioDiaA] = useState<number>(0);
  const [precioDiaB, setPrecioDiaB] = useState<number | string>('');
  const [precioDiaC, setPrecioDiaC] = useState<number | string>('');

  const [precioHoraA, setPrecioHoraA] = useState<number | string>('');
  const [precioHoraB, setPrecioHoraB] = useState<number | string>('');
  const [precioHoraC, setPrecioHoraC] = useState<number | string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      const diaA = product.precioDiaA ?? 0;
      setPrecioDiaA(diaA);
      setPrecioDiaB(product.precioDiaB !== null && product.precioDiaB !== undefined ? product.precioDiaB : '');
      setPrecioDiaC(product.precioDiaC !== null && product.precioDiaC !== undefined ? product.precioDiaC : '');

      setPrecioHoraA(product.precioHoraA !== null && product.precioHoraA !== undefined ? product.precioHoraA : '');
      setPrecioHoraB(product.precioHoraB !== null && product.precioHoraB !== undefined ? product.precioHoraB : '');
      setPrecioHoraC(product.precioHoraC !== null && product.precioHoraC !== undefined ? product.precioHoraC : '');

      setError(null);
      setSuccessMsg(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const isHourly = product.tarifa === 'HORA';

  const handleSuggestDiaB = () => {
    if (precioDiaA > 0) {
      // 15% de descuento sugerido para estancias mayores a 8 días
      const sugerido = Math.round(precioDiaA * 0.85 * 100) / 100;
      setPrecioDiaB(sugerido);
    }
  };

  const handleSuggestDiaC = () => {
    if (precioDiaA > 0) {
      // 25% de descuento especial sugerido para clientes estratégicos (requiere aprobación)
      const sugerido = Math.round(precioDiaA * 0.75 * 100) / 100;
      setPrecioDiaC(sugerido);
    }
  };

  const handleSuggestHoraB = () => {
    const valA = parseFloat(String(precioHoraA)) || 0;
    if (valA > 0) {
      const sugerido = Math.round(valA * 0.85 * 100) / 100;
      setPrecioHoraB(sugerido);
    }
  };

  const handleSuggestHoraC = () => {
    const valA = parseFloat(String(precioHoraA)) || 0;
    if (valA > 0) {
      const sugerido = Math.round(valA * 0.75 * 100) / 100;
      setPrecioHoraC(sugerido);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (precioDiaA < 0) {
      setError('La Tarifa A no puede ser menor a 0.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const numDiaB = precioDiaB !== '' ? parseFloat(String(precioDiaB)) : null;
      const numDiaC = precioDiaC !== '' ? parseFloat(String(precioDiaC)) : null;
      const numHoraA = precioHoraA !== '' ? parseFloat(String(precioHoraA)) : null;
      const numHoraB = precioHoraB !== '' ? parseFloat(String(precioHoraB)) : null;
      const numHoraC = precioHoraC !== '' ? parseFloat(String(precioHoraC)) : null;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.productoId);

      await updateInventoryPricing({
        productoId: isUuid ? product.productoId : undefined,
        equipoIds: product.equipoIds && product.equipoIds.length > 0 ? product.equipoIds : (!isUuid ? [product.productoId] : undefined),
        precioRentaDia: Number(precioDiaA),
        precioDiaB: numDiaB,
        precioDiaC: numDiaC,
        precioRentaHora: numHoraA,
        precioHoraB: numHoraB,
        precioHoraC: numHoraC,
      });

      setSuccessMsg('¡Tarifas A, B y C actualizadas con éxito!');
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error al actualizar tarifas:', err);
      setError(err?.response?.data?.message || err?.message || 'Error al guardar tarifas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Tarifas de Renta (A, B y C)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {product.nombre} · <span className="font-bold text-slate-700">{product.familia}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO FORMULARIO */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* EXPLICACIÓN DE REGLAS DE NEGOCIO */}
          <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-black text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Criterio de Aplicación de Tarifas en Cotizaciones</span>
            </div>
            <ul className="text-[11px] text-blue-800 space-y-1 font-medium pl-6 list-disc">
              <li>
                <strong>Tarifa A (Base Regular):</strong> Se asigna automáticamente para duraciones de hasta <strong>8 días</strong> (≤ 8d).
              </li>
              <li>
                <strong>Tarifa B (Prolongada / Volumen):</strong> Se asigna automáticamente cuando la duración supera los <strong>8 días</strong> (&gt; 8d).
              </li>
              <li>
                <strong>Tarifa C (Especial Negociada):</strong> Tarifa exclusiva con descuento preferencial; <strong>requiere autorización de Gerencia</strong> al cotizar.
              </li>
            </ul>
          </div>

          {/* SECCIÓN 1: TARIFAS POR DÍA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Tarifas por Día (C$/día)
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Modalidad diaria</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tarifa A */}
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-blue-800">Tarifa A (Base)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">≤ 8 días</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precioDiaA}
                    onChange={(e) => setPrecioDiaA(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">Tarifa regular del catálogo</span>
              </div>

              {/* Tarifa B */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-emerald-800">Tarifa B (&gt;8d)</span>
                  <button
                    type="button"
                    onClick={handleSuggestDiaB}
                    className="text-[9px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 underline cursor-pointer"
                    title="Calcular 15% de descuento sobre Tarifa A"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> -15%
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioDiaB}
                    onChange={(e) => setPrecioDiaB(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Opcional"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">Se aplica cuando renta &gt; 8 días</span>
              </div>

              {/* Tarifa C */}
              <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-800">Tarifa C (Esp)</span>
                  <button
                    type="button"
                    onClick={handleSuggestDiaC}
                    className="text-[9px] font-black text-amber-700 hover:text-amber-900 flex items-center gap-0.5 underline cursor-pointer"
                    title="Calcular 25% de descuento especial sobre Tarifa A"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> -25%
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioDiaC}
                    onChange={(e) => setPrecioDiaC(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Opcional"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">Requiere autorización Gerencia</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: TARIFAS POR HORA (OPCIONAL O REQUERIDO SI ES HORA) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Tarifas por Hora (C$/hr)
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {isHourly ? 'Modalidad principal de este equipo' : 'Opcional / Por demanda'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tarifa A Hora */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-[11px] font-black text-slate-700 block">Tarifa A (Hora Base)</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioHoraA}
                    onChange={(e) => setPrecioHoraA(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">Base regular por hora</span>
              </div>

              {/* Tarifa B Hora */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700">Tarifa B Hora</span>
                  <button
                    type="button"
                    onClick={handleSuggestHoraB}
                    className="text-[9px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 underline cursor-pointer"
                    title="Calcular 15% de descuento sobre Tarifa A Hora"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> -15%
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioHoraB}
                    onChange={(e) => setPrecioHoraB(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Opcional"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">Jornada prolongada (&gt;8d)</span>
              </div>

              {/* Tarifa C Hora */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700">Tarifa C Hora</span>
                  <button
                    type="button"
                    onClick={handleSuggestHoraC}
                    className="text-[9px] font-black text-amber-700 hover:text-amber-900 flex items-center gap-0.5 underline cursor-pointer"
                    title="Calcular 25% de descuento sobre Tarifa A Hora"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> -25%
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioHoraC}
                    onChange={(e) => setPrecioHoraC(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Opcional"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">Especial con autorización</span>
              </div>
            </div>
          </div>

          {/* ACCIONES */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Guardando Tarifas...' : 'Guardar Tarifas A, B y C'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
