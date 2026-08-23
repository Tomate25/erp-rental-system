import React, { useState, useEffect } from 'react';
import { getQuotationVersions } from '../services/quotations.api';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { History, X, Eye, Calendar, Package } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  numeroCotizacion: string | null;
  onClose: () => void;
  onSelectVersion: (quotation: Cotizacion) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  numeroCotizacion,
  onClose,
  onSelectVersion,
}) => {
  const [versions, setVersions] = useState<Cotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && numeroCotizacion) {
      const loadHistory = async () => {
        setIsLoading(true);
        try {
          const data = await getQuotationVersions(numeroCotizacion);
          setVersions(data);
        } catch (error) {
          console.error('Error al cargar versiones:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadHistory();
    }
  }, [isOpen, numeroCotizacion]);

  if (!isOpen || !numeroCotizacion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-[#E5E8EE] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-[#E5E8EE] flex items-center justify-between bg-[#F4F6F9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1A73E8] text-white shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-[#1B1D22] text-base">
                Historial de Versiones: {numeroCotizacion}
              </h3>
              <p className="text-xs text-[#747780] font-medium">
                Se encontraron {versions.length} versión{versions.length !== 1 ? 'es' : ''} registradas para este presupuesto.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#747780] hover:text-[#1B1D22] hover:bg-[#E5E8EE] rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-[#747780] text-xs font-bold flex flex-col items-center">
              <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin mb-3" />
              Cargando historial de versiones...
            </div>
          ) : (
            versions.map((v, index) => {
              const isLatest = index === 0;
              return (
                <div
                  key={v.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isLatest
                      ? 'border-[#1A73E8] bg-[#E8F0FE]/20 shadow-xs'
                      : 'border-[#E5E8EE] bg-white hover:border-[#1A73E8]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E8EE]">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
                        isLatest ? 'bg-[#1A73E8] text-white border-[#1A73E8]' : 'bg-[#F4F6F9] text-[#37474F] border-[#E5E8EE]'
                      }`}>
                        Versión {v.version} {isLatest ? '(Vigente)' : ''}
                      </span>
                      <span className="text-xs font-extrabold text-[#1B1D22]">
                        {v.cliente?.nombre}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#747780] font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(v.fechaEmision).toLocaleDateString()}
                      </span>
                      <span className="font-black text-sm text-[#1B1D22]">
                        {formatCurrency(v.total)}
                      </span>
                      <button
                        onClick={() => {
                          onSelectVersion(v);
                          onClose();
                        }}
                        className={`text-xs py-1.5 px-3 rounded-xl font-extrabold flex items-center gap-1.5 transition-all ${
                          isLatest
                            ? 'btn-precision-primary'
                            : 'bg-white text-[#747780] border border-[#E5E8EE] hover:bg-[#F4F6F9] hover:text-[#1B1D22]'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isLatest ? 'Ver / Editar' : 'Consultar (Solo Lectura)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista resumida de ítems en esta versión */}
                  <div className="pt-3">
                    <span className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Package className="w-3 h-3 text-[#1A73E8]" /> Equipos y Servicios en esta Versión ({v.items?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {v.items?.map((item, idx) => (
                        <span key={idx} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#F4F6F9] text-[#37474F] border border-[#E5E8EE]">
                          {item.descripcion} (x{item.cantidad}) · {formatCurrency(item.subtotal)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
