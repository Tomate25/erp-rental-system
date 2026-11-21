import React, { useId, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import type { Cotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';

interface CancelQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Cotizacion | null;
  onConfirm: (motivo: string) => Promise<void>;
  isLoading?: boolean;
}

const MOTIVOS_RAPIDOS = [
  'El cliente decidió no continuar con la renta',
  'Proyecto u obra cancelada / pospuesta por el cliente',
  'El cliente optó por otro proveedor o equipo propio',
];

export const CancelQuotationModal: React.FC<CancelQuotationModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onConfirm,
  isLoading = false,
}) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const motivoId = useId();

  if (!quotation) return null;

  const hasAcceptedOrContract =
    quotation.estado === EstadoCotizacionValues.ACEPTADA ||
    quotation.estado === EstadoCotizacionValues.CONVERTIDA_A_CONTRATO ||
    (quotation.contratos || []).some((c) => c.estado !== 'CANCELADO');

  const handleClose = () => {
    setError(null);
    setMotivo('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = motivo.trim();
    if (clean.length < 5) {
      setError('Indica el motivo de cancelación (mínimo 5 caracteres).');
      return;
    }
    setError(null);
    try {
      await onConfirm(clean);
      setMotivo('');
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No se pudo cancelar la cotización.',
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      labelledBy={titleId}
      overlayClassName="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4 font-sans"
      className="bg-white w-full max-w-lg rounded-xl border border-slate-200 shadow-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 id={titleId} className="text-sm font-bold text-slate-900">
            Cancelar Cotización
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {quotation.numeroCotizacion} (v{quotation.version}) · {quotation.cliente?.nombre || 'Sin cliente'}
          </p>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={handleClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-50 text-red-800 text-xs font-medium rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total cotizado</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(quotation.total)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Estado actual</span>
            <span className="font-semibold text-slate-800">{quotation.estado.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {hasAcceptedOrContract && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 border-l-4 border-l-amber-500 text-xs text-slate-700 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Esta cotización ya fue aceptada. Al cancelarla, si el contrato asociado no tiene despachos ejecutados ni facturas activas, también se cancelará automáticamente y los equipos reservados volverán a estar disponibles.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold text-slate-700">
            Motivos frecuentes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_RAPIDOS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setMotivo(preset);
                  setError(null);
                }}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 font-medium transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor={motivoId} className="block text-[11px] font-semibold text-slate-700">
            Motivo de cancelación *
          </label>
          <textarea
            id={motivoId}
            rows={3}
            value={motivo}
            maxLength={1000}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Describe por qué el cliente desistió o se cancela la cotización..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 cursor-pointer"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={isLoading || motivo.trim().length < 5}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
