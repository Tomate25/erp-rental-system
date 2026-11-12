import React, { useState } from 'react';
import { X, ArrowUpDown, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import type { Insumo, AjustarStockPayload } from '../types/insumo.types';
import { ajustarStockInsumo } from '../services/insumo.api';

interface AjustarStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  insumo: Insumo;
}

export const AjustarStockModal: React.FC<AjustarStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  insumo,
}) => {
  const [tipoAjuste, setTipoAjuste] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE_DIRECTO'>('ENTRADA');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [motivo, setMotivo] = useState('');
  const [costoUnitario, setCostoUnitario] = useState<number | ''>(Number(insumo.costoUnitario));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const stockActual = Number(insumo.stockActual);
  const cantNum = Number(cantidad) || 0;

  let projectedStock = stockActual;
  if (tipoAjuste === 'ENTRADA') projectedStock = stockActual + cantNum;
  else if (tipoAjuste === 'SALIDA') projectedStock = Math.max(0, stockActual - cantNum);
  else if (tipoAjuste === 'AJUSTE_DIRECTO') projectedStock = cantNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cantidad || Number(cantidad) <= 0) {
      setError('La cantidad debe ser mayor a cero.');
      return;
    }
    if (tipoAjuste === 'SALIDA' && Number(cantidad) > stockActual) {
      setError(`Stock insuficiente. Stock actual en bodega: ${stockActual} ${insumo.unidadMedida}.`);
      return;
    }
    if (!motivo.trim()) {
      setError('El motivo del ajuste es requerido.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: AjustarStockPayload = {
        cantidad: Number(cantidad),
        tipoAjuste,
        motivo: motivo.trim(),
        costoUnitario:
          tipoAjuste === 'ENTRADA' && costoUnitario !== ''
            ? Number(costoUnitario)
            : undefined,
      };

      await ajustarStockInsumo(insumo.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al ajustar el stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-white rounded-lg">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Movimiento de Bodega</h2>
              <p className="text-xs text-zinc-500 font-medium">
                {insumo.nombre} ({insumo.unidadMedida})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTipoAjuste('ENTRADA')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                tipoAjuste === 'ENTRADA'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoAjuste('SALIDA')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                tipoAjuste === 'SALIDA'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-600/20'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <span>Salida</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoAjuste('AJUSTE_DIRECTO')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                tipoAjuste === 'AJUSTE_DIRECTO'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-600/20'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span>Conteo Físico</span>
            </button>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-500 block">Stock Actual en Bodega:</span>
              <span className="font-bold text-zinc-900 text-sm">
                {stockActual} {insumo.unidadMedida}
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 block">Stock Resultante:</span>
              <span className="font-extrabold text-zinc-900 text-sm font-mono">
                {projectedStock} {insumo.unidadMedida}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">
              {tipoAjuste === 'AJUSTE_DIRECTO'
                ? `Nuevo Stock Físico (${insumo.unidadMedida})`
                : `Cantidad a ${tipoAjuste === 'ENTRADA' ? 'Ingresar' : 'Retirar'} (${insumo.unidadMedida})`}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={cantidad}
              onChange={(e) =>
                setCantidad(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          {tipoAjuste === 'ENTRADA' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Costo Unitario de esta Entrada (C$, opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoUnitario}
                onChange={(e) =>
                  setCostoUnitario(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">
              Motivo o Referencia del Movimiento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Factura compra #1024 / Mantenimiento preventivo lote 3"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Registrando...' : 'Confirmar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
