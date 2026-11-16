import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertTriangle } from 'lucide-react';
import { CUENTAS_EGRESO } from './CompraInsumoModal';
import { formatCurrency } from '../../../shared/utils/formatters';
import type { RegistrarPagoCompraPayload } from '../types/purchases.types';

interface PagoCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  saldoPendiente: number;
  onSubmitPago: (payload: RegistrarPagoCompraPayload) => Promise<void>;
}

export const PagoCompraModal: React.FC<PagoCompraModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  saldoPendiente,
  onSubmitPago,
}) => {
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [cuentaPagoCodigo, setCuentaPagoCodigo] = useState('110201');
  const [metodoPago, setMetodoPago] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMonto(saldoPendiente > 0 ? String(saldoPendiente) : '');
      setFechaPago(new Date().toISOString().slice(0, 10));
      setCuentaPagoCodigo('110201');
      setMetodoPago('TRANSFERENCIA');
      setReferencia('');
      setObservaciones('');
      setError(null);
    }
  }, [isOpen, saldoPendiente]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(monto);
    if (!num || num <= 0) {
      setError('El monto del pago debe ser mayor a cero.');
      return;
    }
    if (num > saldoPendiente + 0.01) {
      setError(`El monto excede el saldo pendiente (${formatCurrency(saldoPendiente)}).`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmitPago({
        monto: num,
        fechaPago,
        metodoPago,
        cuentaPagoCodigo,
        referencia: referencia.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar el pago al proveedor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900">{title}</h3>
              <p className="text-[11px] text-zinc-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-center">
            <span className="text-zinc-600 font-semibold">Saldo Pendiente Actual:</span>
            <span className="font-mono font-black text-sm text-zinc-900">
              {formatCurrency(saldoPendiente)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">Monto a Pagar (C$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-700 mb-1">Fecha de Pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Cuenta Banco / Caja</label>
            <select
              value={cuentaPagoCodigo}
              onChange={(e) => {
                const code = e.target.value;
                setCuentaPagoCodigo(code);
                setMetodoPago(code.startsWith('1101') ? 'EFECTIVO' : 'TRANSFERENCIA');
              }}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
            >
              {CUENTAS_EGRESO.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Referencia / Cheque / Transferencia</label>
            <input
              type="text"
              placeholder="Ej. TRF-889210"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Observaciones</label>
            <input
              type="text"
              placeholder="Opcional"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Registrando...' : 'Confirmar Pago (210101)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
