import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, AlertTriangle } from 'lucide-react';
import type { Insumo, RegistrarMovimientoPayload } from '../types/insumo.types';
import { registrarMovimientoInsumo } from '../services/insumo.api';

interface RegistrarMovimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  insumos: Insumo[];
  initialInsumo?: Insumo | null;
}

const DESTINOS_RAPIDOS = [
  'Despacho a Cuadrilla en Obra',
  'Uso General de Taller Central',
  'Entrega / Venta Directa a Cliente',
  'Merma / Avería / Pérdida',
  'Reabastecimiento de Vehículo de Servicio',
];

export const RegistrarMovimientoModal: React.FC<RegistrarMovimientoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  insumos,
  initialInsumo,
}) => {
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>(
    initialInsumo?.id || (insumos[0]?.id ?? ''),
  );
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [motivo, setMotivo] = useState('');
  const [destino, setDestino] = useState(DESTINOS_RAPIDOS[0]);
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialInsumo) {
        setSelectedInsumoId(initialInsumo.id);
      } else if (insumos.length > 0) {
        setSelectedInsumoId(insumos[0].id);
      }
      setCantidad('');
      setMotivo('');
      setDestino(DESTINOS_RAPIDOS[0]);
      setReferencia('');
      setError(null);
    }
  }, [isOpen, initialInsumo, insumos]);

  if (!isOpen) return null;

  const currentInsumo =
    insumos.find((item) => item.id === selectedInsumoId) || initialInsumo || null;
  const stockActual = currentInsumo ? Number(currentInsumo.stockActual) : 0;
  const cantNum = Number(cantidad) || 0;
  const stockResultante = Math.max(0, stockActual - cantNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsumoId) {
      setError('Por favor selecciona un insumo de la bodega.');
      return;
    }
    if (!cantidad || Number(cantidad) <= 0) {
      setError('La cantidad debe ser mayor que cero.');
      return;
    }
    if (Number(cantidad) > stockActual) {
      setError(
        `Stock insuficiente en bodega. Stock actual: ${stockActual} ${currentInsumo?.unidadMedida || 'unidades'}.`,
      );
      return;
    }
    if (!motivo.trim()) {
      setError('El motivo o justificación de la salida es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: RegistrarMovimientoPayload = {
        insumoId: selectedInsumoId,
        tipo: 'SALIDA',
        cantidad: Number(cantidad),
        motivo: motivo.trim(),
        destino: destino.trim() || undefined,
        referencia: referencia.trim() || undefined,
      };

      await registrarMovimientoInsumo(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar la salida en bodega.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-amber-500 text-white border-amber-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900">Salida Manual de Bodega</h2>
              <p className="text-xs text-zinc-500 font-medium">
                Despacho directo de insumos sin requerir orden de mantenimiento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Insumo Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700">
              Insumo de Bodega <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedInsumoId}
              onChange={(e) => setSelectedInsumoId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              required
            >
              {insumos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo ? `[${item.codigo}] ` : ''}
                  {item.nombre} — Stock: {Number(item.stockActual)} {item.unidadMedida}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Info Bar */}
          {currentInsumo && (
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-500 block">Stock Actual en Bodega:</span>
                <span className="font-black text-zinc-900 text-sm">
                  {stockActual} {currentInsumo.unidadMedida}
                </span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 block">Stock Previsto tras Salida:</span>
                <span
                  className={`font-black text-sm font-mono ${
                    cantNum > stockActual ? 'text-red-600 font-extrabold' : 'text-zinc-900'
                  }`}
                >
                  {stockResultante} {currentInsumo.unidadMedida}
                </span>
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700">
              Cantidad a Retirar / Despachar ({currentInsumo?.unidadMedida || 'Unidades'}){' '}
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
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          {/* Destino */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">Destino / Área Receptora</label>
            <input
              type="text"
              list="destinos-sugeridos"
              placeholder="Ej. Cuadrilla en Bypass / Taller Central / Obra San Patricio"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
            <datalist id="destinos-sugeridos">
              {DESTINOS_RAPIDOS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          {/* Motivo */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700">
              Motivo o Justificación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cambio de aceite en compactadora / Despacho a cuadrilla terracería"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          {/* Referencia Documental */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700">
              Referencia / No. Documento (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Vale #045, Remisión #881"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs bg-amber-600 hover:bg-amber-700"
            >
              {saving ? 'Registrando...' : 'Confirmar Salida de Bodega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
