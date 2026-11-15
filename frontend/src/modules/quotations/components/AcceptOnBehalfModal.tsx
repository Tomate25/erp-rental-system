import React, { useId, useState } from 'react';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { isContractContado } from '../../contracts/utils/contractCondition';

interface AcceptOnBehalfModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Cotizacion | null;
  onConfirm: (data: { medioConfirmacion: string; notas: string }) => Promise<void>;
  isLoading?: boolean;
}

const MEDIOS_CONFIRMACION = [
  { value: 'LLAMADA_TELEFONICA', label: 'Llamada telefónica' },
  { value: 'WHATSAPP', label: 'WhatsApp / Mensajería' },
  { value: 'PRESENCIAL', label: 'Acuerdo presencial / En obra' },
  { value: 'CORREO_DIRECTO', label: 'Correo electrónico directo' },
  { value: 'OTRO', label: 'Otro medio de confirmación' },
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const termsCheckboxId = useId();

  if (!quotation) return null;

  const handleClose = () => {
    setAcceptedTerms(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Debes confirmar que el cliente aprobó los términos y condiciones mostrados en la cotización.');
      return;
    }
    setError(null);
    const termsNote = '[Cliente aprobó mediante términos y condiciones de la cotización]';
    const combinedNotes = notas.trim() ? `${termsNote} ${notas.trim()}` : termsNote;
    try {
      await onConfirm({
        medioConfirmacion,
        notas: combinedNotes,
      });
      setNotas('');
      setAcceptedTerms(false);
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
          onClick={handleClose}
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
          <div className="text-center">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Condición</span>
            <span className="font-bold text-[#1B1D22]">{isContractContado(quotation) ? 'Contado' : 'Crédito'}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Equipos / Líneas</span>
            <span className="font-bold text-[#1A73E8]">{quotation.items?.length || 0} ítems</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-[11px] text-slate-600">
          <span className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
            Términos y Condiciones de la Cotización
          </span>
          <p>1. Precios estipulados en USD o su equivalente al tipo de cambio oficial.</p>
          <p>2. El combustible, lubricantes y operadores no están incluidos salvo especificación expresa.</p>
          <p>3. El cliente asume la responsabilidad y resguardo de los equipos durante el periodo de renta.</p>
          {Number(quotation.depositoGarantia || 0) > 0 && (
            <p className="font-bold text-slate-800">
              Depósito en garantía: {formatCurrency(quotation.depositoGarantia!)}
            </p>
          )}
          {quotation.condiciones && (
            <div className="mt-1.5 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700">
              {quotation.condiciones}
            </div>
          )}
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
            rows={2}
            value={notas}
            maxLength={900}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Confirmado por el Ing. Carlos para iniciar alquiler el lunes a primera hora..."
            className="precision-input text-xs resize-none"
          />
        </div>

        <label
          htmlFor={termsCheckboxId}
          className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/70 cursor-pointer select-none"
        >
          <input
            id={termsCheckboxId}
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked && error) setError(null);
            }}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-[11px] font-bold text-slate-800 leading-relaxed">
            El cliente aprobó mediante los términos y condiciones mostrados en la cotización.
          </span>
        </label>

        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium leading-relaxed">
            Al formalizar, el sistema registrará la cotización como <strong>ACEPTADA</strong>, creará automáticamente el <strong>Contrato de Arrendamiento Oficial</strong> y reservará los equipos en inventario.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="btn-precision-outline text-xs py-2 px-4"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || !acceptedTerms}
            className="btn-precision-primary text-xs py-2 px-4.5 flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isLoading ? 'Formalizando...' : 'Aceptar y Generar Contrato'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
