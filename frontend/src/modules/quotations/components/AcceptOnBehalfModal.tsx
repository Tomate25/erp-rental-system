import React, { useId, useState } from 'react';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';

interface AcceptOnBehalfModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Cotizacion | null;
  onConfirm: (data: { medioConfirmacion: string; notas: string }) => Promise<void>;
  isLoading?: boolean;
}

const MEDIOS_CONFIRMACION = [
  { value: 'LLAMADA_TELEFONICA', label: '📞 Llamada telefónica' },
  { value: 'WHATSAPP', label: '💬 WhatsApp / Mensajería' },
  { value: 'PRESENCIAL', label: '🤝 Acuerdo presencial / En obra' },
  { value: 'CORREO_DIRECTO', label: '✉️ Correo electrónico directo' },
  { value: 'OTRO', label: '📝 Otro medio de confirmación' },
];

export const AcceptOnBehalfModal: React.FC<AcceptOnBehalfModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onConfirm,
  isLoading = false,
}) => {
  const [medioConfirmacion, setMedioConfirmacion] = useState('LLAMADA_TELEFONICA');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  if (!quotation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onConfirm({
        medioConfirmacion,
        notas: notas.trim(),
      });
      setNotas('');
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al procesar la aceptación de la cotización.',
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      overlayClassName="fixed inset-0 z-50 bg-[#1B1D22]/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
      className="bg-white w-full max-w-lg rounded-3xl border border-[#E5E8EE] shadow-2xl overflow-hidden animate-fadeIn"
    >
      <div className="p-5 border-b border-[#E5E8EE] flex items-center justify-between bg-emerald-50/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 id={titleId} className="font-black text-[#1B1D22] text-base">
              Aceptar Cotización en Nombre del Cliente
            </h3>
            <p className="text-xs text-[#747780] font-medium">
              {quotation.numeroCotizacion} (v{quotation.version}) · {quotation.cliente?.nombre}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="p-2 text-[#747780] hover:text-[#1B1D22] rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-[#F8FAFC] border border-[#E5E8EE] p-3.5 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Total a Formalizar</span>
            <span className="font-mono font-black text-sm text-[#1B1D22]">{formatCurrency(quotation.total)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Equipos / Líneas</span>
            <span className="font-bold text-[#1A73E8]">{quotation.items?.length || 0} ítems</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase mb-1.5">
            Medio de Confirmación del Cliente *
          </label>
          <select
            value={medioConfirmacion}
            onChange={(e) => setMedioConfirmacion(e.target.value)}
            className="precision-input text-xs"
          >
            {MEDIOS_CONFIRMACION.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase mb-1.5">
            Observaciones o Notas de Aceptación (Opcional)
          </label>
          <textarea
            rows={3}
            value={notas}
            maxLength={1000}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Confirmado por el Ing. Carlos para iniciar alquiler el lunes a primera hora..."
            className="precision-input text-xs resize-none"
          />
        </div>

        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium leading-relaxed">
            Al formalizar, el sistema registrará la cotización como <strong>ACEPTADA</strong>, creará automáticamente el <strong>Contrato de Arrendamiento Oficial</strong> y reservará los equipos en inventario.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn-precision-outline text-xs py-2 px-4"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-precision-primary text-xs py-2 px-4.5 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isLoading ? 'Formalizando...' : 'Aceptar y Generar Contrato'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
