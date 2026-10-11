import React, { useState, useEffect, useId } from 'react';
import type { GroupedProduct } from '../types/grouped-inventory.types';
import { X, ArrowUpRight, ArrowDownRight, AlertCircle, Calendar, FileText } from 'lucide-react';

export type MotivoAjuste = 'COMPRA' | 'REPOSICION' | 'PERDIDA' | 'BAJA';

export interface AdjustQuantityPayload {
  productoId: string;
  deltaCantidad: number; // Positivo para incremento, negativo para decremento
  motivo: MotivoAjuste;
  fecha: string;
  nota: string;
}

interface AdjustQuantityModalProps {
  product: GroupedProduct;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AdjustQuantityPayload) => Promise<void>;
}

export const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({
  product,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const titleId = useId();
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [cantidad, setCantidad] = useState<number>(10);
  const [motivo, setMotivo] = useState<MotivoAjuste>('COMPRA');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTipo('ENTRADA');
      setCantidad(10);
      setMotivo('COMPRA');
      setFecha(new Date().toISOString().split('T')[0]);
      setNota('');
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTotal = product.total;
  const currentDisp = product.porEstado.DISPONIBLE;
  const delta = tipo === 'ENTRADA' ? Math.abs(cantidad) : -Math.abs(cantidad);
  const projectedTotal = currentTotal + delta;
  const projectedDisp = currentDisp + delta;

  const isInvalidStock = projectedTotal < 0 || projectedDisp < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cantidad <= 0) {
      setSubmitError('La cantidad a ajustar debe ser mayor a 0.');
      return;
    }
    if (isInvalidStock) {
      setSubmitError('No puedes reducir más unidades de las actualmente disponibles en inventario.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        productoId: product.productoId,
        deltaCantidad: delta,
        motivo,
        fecha,
        nota: nota.trim(),
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Error al registrar el ajuste de cantidad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Ajuste de Stock por Lote
            </span>
            <h3 id={titleId} className="text-base font-black text-slate-900 mt-1">
              {product.nombre}
            </h3>
            <p className="text-xs text-slate-500">
              Stock actual: <strong className="text-slate-800">{currentTotal.toLocaleString('es-NI')} u.</strong>{' '}
              ({currentDisp.toLocaleString('es-NI')} disponibles)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Tipo de movimiento */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipo('ENTRADA');
                  if (motivo === 'PERDIDA' || motivo === 'BAJA') setMotivo('COMPRA');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition-all ${
                  tipo === 'ENTRADA'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span>+ Entrada (Sumar)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo('SALIDA');
                  if (motivo === 'COMPRA' || motivo === 'REPOSICION') setMotivo('PERDIDA');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition-all ${
                  tipo === 'SALIDA'
                    ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>- Salida (Restar)</span>
              </button>
            </div>
          </div>

          {/* Cantidad y Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cantidad a {tipo === 'ENTRADA' ? 'agregar' : 'descontar'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full font-mono text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo del Movimiento <span className="text-rose-500">*</span>
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoAjuste)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {tipo === 'ENTRADA' ? (
                  <>
                    <option value="COMPRA">📦 Compra de lote nuevo</option>
                    <option value="REPOSICION">🔄 Reposición / Retorno extraordinario</option>
                  </>
                ) : (
                  <>
                    <option value="PERDIDA">⚠️ Pérdida / Extravío en obra</option>
                    <option value="BAJA">🗑️ Baja / Descarte por desgaste</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Fecha del movimiento */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha del Movimiento
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Justificación / Nota */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Justificación u Observaciones
            </label>
            <textarea
              rows={2}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. Factura de compra #9842 o reporte de merma en proyecto..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Proyección del stock resultante */}
          <div
            className={`p-3 rounded-2xl border text-xs space-y-1 transition-colors ${
              isInvalidStock
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-blue-50/70 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>Stock resultante tras el ajuste:</span>
              <span className="font-mono text-sm">
                {projectedTotal.toLocaleString('es-NI')} u.
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] opacity-80">
              <span>Disponibles proyectados:</span>
              <span className="font-mono">{projectedDisp.toLocaleString('es-NI')} u.</span>
            </div>
            {isInvalidStock && (
              <p className="text-[11px] text-rose-700 font-semibold pt-1">
                ⚠️ Stock insuficiente para ejecutar este descuento.
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isInvalidStock}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                tipo === 'ENTRADA'
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
                  : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
              }`}
            >
              {isSubmitting
                ? 'Registrando...'
                : tipo === 'ENTRADA'
                ? '+ Registrar Entrada de Stock'
                : '- Registrar Salida de Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
