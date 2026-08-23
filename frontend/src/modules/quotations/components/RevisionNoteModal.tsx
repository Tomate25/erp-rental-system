import React, { useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';

interface RevisionNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nota: string) => void;
  isLoading?: boolean;
}

export const RevisionNoteModal: React.FC<RevisionNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) {
      setError('Debes especificar la razón u observación de la devolución.');
      return;
    }
    setError(null);
    onSubmit(nota.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1B1D22]/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#E5E8EE] shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-5 border-b border-[#E5E8EE] flex items-center justify-between bg-[#FDF2E9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C55500] text-white shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-[#1B1D22] text-base">
                Devolver Cotización con Observaciones
              </h3>
              <p className="text-xs text-[#747780] font-medium">
                Especifica las razones por las cuales se requiere modificar esta cotización.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#747780] hover:text-[#1B1D22] rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase mb-1.5">
              Motivo u Observación de Devolución *
            </label>
            <textarea
              rows={4}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. El precio del equipo X está por debajo del margen autorizado. Por favor ajustar a $150..."
              className="precision-input text-xs resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-precision-outline text-xs py-2 px-4"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#C55500] text-white hover:bg-[#A34500] font-extrabold text-xs rounded-xl shadow-md shadow-[#C55500]/20 transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Devolver con Observaciones</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
