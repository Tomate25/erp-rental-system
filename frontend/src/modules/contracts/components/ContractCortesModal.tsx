import React, { useState, useEffect } from 'react';
import type { Contract, CorteFacturacion } from '../../operations/services/operations.api';
import { getCortes, createManualCorte } from '../../operations/services/operations.api';
import { invoiceCorte } from '../../billing/services/billing.api';
import { X, CreditCard, Calendar, CheckCircle2, Clock, Plus, AlertCircle, Check, DollarSign } from 'lucide-react';

interface ContractCortesModalProps {
  contract: Contract;
  onClose: () => void;
}

export const ContractCortesModal: React.FC<ContractCortesModalProps> = ({ contract, onClose }) => {
  const [cortes, setCortes] = useState<CorteFacturacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario de Corte Manual / Fecha Mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [fechaCorte, setFechaCorte] = useState(tomorrow.toISOString().split('T')[0]);
  const [montoManual, setMontoManual] = useState<string>('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [isFacturandoId, setIsFacturandoId] = useState<string | null>(null);

  const loadCortes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCortes(contract.id);
      setCortes(data);
    } catch (err: any) {
      setError('Error al cargar la lista de cortes de facturación');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCortes();
  }, [contract.id]);

  const handleCreateManualCorte = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingManual(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const montoNum = montoManual ? Number(montoManual) : undefined;
      await createManualCorte(contract.id, fechaCorte, montoNum);
      setSuccessMsg(`¡Corte personalizado para la fecha ${fechaCorte} generado exitosamente!`);
      setMontoManual('');
      loadCortes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar el corte manual');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleInvoiceCorte = async (corteId: string) => {
    setIsFacturandoId(corteId);
    setError(null);
    setSuccessMsg(null);

    try {
      const factura = await invoiceCorte(corteId, {
        tipoFactura: 'ESTANDAR',
        condicionPago: 'CREDITO',
        plazoCreditoDias: 30,
        estado: 'PENDIENTE'
      });

      setSuccessMsg(`¡Factura ${factura.folio || 'generada'} emitida a Crédito (30 Días) y cargada a CxC con éxito por C$ ${factura.total?.toLocaleString()}!`);
      loadCortes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al emitir la factura del corte');
    } finally {
      setIsFacturandoId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-[#37474F]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-[#37474F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10">
              <CreditCard className="w-6 h-6 text-[#1A73E8]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Cortes de Facturación — Contrato {contract.codigo}</h3>
              <p className="text-xs text-white/80 font-medium">Cliente: {contract.cliente?.nombre} | Ciclos de cobro periódicos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones de Éxito / Error */}
        <div className="px-6 pt-4 space-y-2">
          {error && (
            <div className="p-3 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Panel para Generar Corte Personalizado (Fecha Mañana u Otra Fecha) */}
          <form onSubmit={handleCreateManualCorte} className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
              <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1A73E8]" /> Generar Corte Personalizado (ej. Mañana)
              </span>
              <span className="text-[10px] text-[#747780] font-bold">Corte Bajo Demanda</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Fecha de Corte</label>
                <input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  className="precision-input text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Monto del Corte (C$ Opcional)</label>
                <input
                  type="number"
                  placeholder="Calculado automático"
                  value={montoManual}
                  onChange={(e) => setMontoManual(e.target.value)}
                  className="precision-input text-xs font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingManual}
                className="btn-precision-primary bg-[#1A73E8] text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isCreatingManual ? (
                  <span>Generando...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Crear Corte Manual
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Listado de Cortes Proyectados */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider">
              Historial de Cortes Proyectados del Contrato ({cortes.length})
            </h4>

            {isLoading ? (
              <div className="p-8 text-center text-xs font-bold text-[#747780]">Cargando plan de cortes...</div>
            ) : cortes.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-[#747780] bg-gray-50 rounded-2xl border border-[#E5E8EE]">
                No hay cortes de facturación proyectados. Utiliza la sección superior para crear un corte manual.
              </div>
            ) : (
              <div className="space-y-3">
                {cortes.map((corte) => {
                  const isFacturado = corte.estado === 'FACTURADO';
                  return (
                    <div
                      key={corte.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isFacturado
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-[#E5E8EE] hover:border-[#1A73E8]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#1B1D22] font-mono bg-white px-2 py-0.5 rounded-md border border-[#E5E8EE]">
                            Corte #{corte.numeroCorte}
                          </span>
                          {isFacturado ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Facturado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pendiente de Cobro
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-[#37474F] flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>Período: <strong>{formatDate(corte.fechaInicio)}</strong> al <strong>{formatDate(corte.fechaFin)}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E8EE]">
                        <div className="text-right">
                          <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Monto a Facturar</span>
                          <span className="text-base font-black font-mono text-[#1B1D22]">
                            {formatCurrency(corte.monto)}
                          </span>
                        </div>

                        {!isFacturado ? (
                          <button
                            type="button"
                            onClick={() => handleInvoiceCorte(corte.id)}
                            disabled={!!isFacturandoId}
                            className="btn-precision-primary bg-[#37474F] hover:bg-[#1A73E8] text-xs flex items-center gap-1.5 shadow-xs"
                          >
                            {isFacturandoId === corte.id ? (
                              <span>Emitiendo Factura...</span>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4" /> Facturar Corte #{corte.numeroCorte}
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs font-extrabold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-300">
                            Factura Emitida
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E8EE] flex items-center justify-between text-xs text-[#747780]">
          <span>Cortes registrados: <strong className="text-[#1B1D22]">{cortes.length}</strong></span>
          <button
            onClick={onClose}
            className="btn-precision-outline text-xs"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};
