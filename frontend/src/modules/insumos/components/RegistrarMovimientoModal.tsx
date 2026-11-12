import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import type { Insumo, TipoMovimientoInsumo, RegistrarMovimientoPayload } from '../types/insumo.types';
import { registrarMovimientoInsumo } from '../services/insumo.api';

interface RegistrarMovimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  insumos: Insumo[];
  initialInsumo?: Insumo | null;
  initialTipo?: TipoMovimientoInsumo;
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
  initialTipo = 'SALIDA',
}) => {
  const [tipo, setTipo] = useState<TipoMovimientoInsumo>(initialTipo);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>(
    initialInsumo?.id || (insumos[0]?.id ?? ''),
  );
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [motivo, setMotivo] = useState('');
  const [destino, setDestino] = useState(initialTipo === 'SALIDA' ? DESTINOS_RAPIDOS[0] : '');
  const [referencia, setReferencia] = useState('');
  const [costoUnitario, setCostoUnitario] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTipo(initialTipo);
      if (initialInsumo) {
        setSelectedInsumoId(initialInsumo.id);
        setCostoUnitario(Number(initialInsumo.costoUnitario) || '');
      } else if (insumos.length > 0) {
        setSelectedInsumoId(insumos[0].id);
        setCostoUnitario(Number(insumos[0].costoUnitario) || '');
      }
      setCantidad('');
      setMotivo('');
      setDestino(initialTipo === 'SALIDA' ? DESTINOS_RAPIDOS[0] : '');
      setReferencia('');
      setError(null);
    }
  }, [isOpen, initialInsumo, initialTipo, insumos]);

  if (!isOpen) return null;

  const currentInsumo = insumos.find((item) => item.id === selectedInsumoId) || initialInsumo || null;
  const stockActual = currentInsumo ? Number(currentInsumo.stockActual) : 0;
  const cantNum = Number(cantidad) || 0;

  let stockResultante = stockActual;
  if (tipo === 'SALIDA') {
    stockResultante = Math.max(0, stockActual - cantNum);
  } else if (tipo === 'ENTRADA') {
    stockResultante = stockActual + cantNum;
  }

  const handleInsumoChange = (id: string) => {
    setSelectedInsumoId(id);
    const found = insumos.find((item) => item.id === id);
    if (found) {
      setCostoUnitario(Number(found.costoUnitario) || '');
    }
  };

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
    if (tipo === 'SALIDA' && Number(cantidad) > stockActual) {
      setError(
        `Stock insuficiente en bodega. Stock actual: ${stockActual} ${currentInsumo?.unidadMedida || 'unidades'}.`,
      );
      return;
    }
    if (!motivo.trim()) {
      setError('El motivo o justificación del movimiento es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: RegistrarMovimientoPayload = {
        insumoId: selectedInsumoId,
        tipo,
        cantidad: Number(cantidad),
        motivo: motivo.trim(),
        destino: destino.trim() || undefined,
        referencia: referencia.trim() || undefined,
        costoUnitario:
          tipo === 'ENTRADA' && costoUnitario !== '' ? Number(costoUnitario) : undefined,
      };

      await registrarMovimientoInsumo(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar el movimiento en bodega.');
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
            <div
              className={`p-2.5 rounded-xl border ${
                tipo === 'SALIDA'
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-emerald-600 text-white border-emerald-700'
              }`}
            >
              {tipo === 'SALIDA' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownLeft className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900">
                {tipo === 'SALIDA' ? 'Salida Manual de Bodega' : 'Entrada / Recepción de Insumo'}
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                {tipo === 'SALIDA'
                  ? 'Despacho directo de insumos sin requerir orden de mantenimiento'
                  : 'Ingreso directo al inventario de bodega o compras'}
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
          {/* Tipo Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTipo('SALIDA');
                if (!destino) setDestino(DESTINOS_RAPIDOS[0]);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tipo === 'SALIDA'
                  ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
              <span>📤 Salida Manual (Despacho)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo('ENTRADA');
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tipo === 'ENTRADA'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>📥 Entrada / Compra</span>
            </button>
          </div>

          {/* Insumo Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700">
              Insumo de Bodega <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedInsumoId}
              onChange={(e) => handleInsumoChange(e.target.value)}
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
                <span className="text-zinc-500 block">Stock Previsto tras Movimiento:</span>
                <span
                  className={`font-black text-sm font-mono ${
                    tipo === 'SALIDA' && cantNum > stockActual
                      ? 'text-red-600 font-extrabold'
                      : 'text-zinc-900'
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
              Cantidad a {tipo === 'SALIDA' ? 'Retirar / Despachar' : 'Ingresar'} (
              {currentInsumo?.unidadMedida || 'Unidades'}) <span className="text-red-500">*</span>
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

          {/* Destino (for Salidas) */}
          {tipo === 'SALIDA' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">
                Destino / Área Receptora
              </label>
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
          )}

          {/* Costo unitario (for Entradas) */}
          {tipo === 'ENTRADA' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">
                Costo Unitario de Compra (C$, opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={costoUnitario}
                onChange={(e) =>
                  setCostoUnitario(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700">
              Motivo o Justificación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                tipo === 'SALIDA'
                  ? 'Ej. Cambio de aceite en compactadora / Despacho a cuadrilla terracería'
                  : 'Ej. Factura #9821 Proveedor Total / Reposición stock quincenal'
              }
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
              placeholder="Ej. Vale #045, Factura #1029, Remisión #881"
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
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs ${
                tipo === 'SALIDA'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {saving
                ? 'Registrando...'
                : tipo === 'SALIDA'
                ? 'Confirmar Salida de Bodega'
                : 'Confirmar Entrada a Bodega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
