import React, { useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createRetorno } from '../services/operations.api';
import { X, RotateCcw, Check, AlertTriangle, ShieldAlert, Plus, Trash2, Gauge } from 'lucide-react';

interface RetornoModalProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: (createdRetorno?: any) => void;
}

export const RetornoModal: React.FC<RetornoModalProps> = ({ contract, onClose, onSuccess }) => {
  const [recibidoPor, setRecibidoPor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formularios por ítem de retorno
  const [itemForms, setItemForms] = useState(
    contract.items.map((item) => ({
      equipoId: item.equipoId,
      nombreEquipo: item.equipo?.modelo || 'Equipo',
      tipoControl: item.tipoControl || item.equipo?.tipoControl || 'SERIALIZADO',
      numeroSerie: item.equipo?.numeroSerie || '',
      cantidadDespachada: item.cantidad || 1,
      cantidadRetornada: item.cantidad || 1,
      cantidadDañada: 0,
      cantidadPerdida: 0,
      horometroInicial: item.equipo?.horometro || item.horometroInicial || 0,
      horometroFinal: (item.equipo?.horometro || item.horometroInicial || 0) + 10, // Sugerencia inicial
      daniosDetectados: false,
      descripcionDanios: '',
      danios: [] as {
        componente: string;
        tipoDano: string;
        severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'PERDIDA_TOTAL';
        cobrable: boolean;
        costoEstimado: number;
        observaciones?: string;
      }[]
    }))
  );

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...itemForms];
    (updated[index] as any)[field] = value;
    setItemForms(updated);
  };

  const handleAddDanio = (index: number) => {
    const updated = [...itemForms];
    updated[index].danios.push({
      componente: 'Estructura / Brazo',
      tipoDano: 'Golpe / Deformación',
      severidad: 'MEDIA',
      cobrable: true,
      costoEstimado: 1500,
      observaciones: 'Requiere enderezo y pintura'
    });
    updated[index].daniosDetectados = true;
    setItemForms(updated);
  };

  const handleRemoveDanio = (itemIdx: number, danioIdx: number) => {
    const updated = [...itemForms];
    updated[itemIdx].danios.splice(danioIdx, 1);
    if (updated[itemIdx].danios.length === 0) {
      updated[itemIdx].daniosDetectados = false;
    }
    setItemForms(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createRetorno({
        contratoId: contract.id,
        recibidoPor,
        items: itemForms.map((item) => ({
          equipoId: item.equipoId,
          numeroSerie: item.numeroSerie,
          cantidadRetornada: Number(item.cantidadRetornada),
          cantidadDañada: Number(item.cantidadDañada),
          cantidadPerdida: Number(item.cantidadPerdida),
          horometroFinal: Number(item.horometroFinal),
          daniosDetectados: item.daniosDetectados,
          descripcionDanios: item.descripcionDanios,
          danios: item.danios
        }))
      });

      onSuccess(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar la recepción de retorno');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#37474F]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-[#C55500] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Orden de Retorno e Inspección de Daños</h3>
              <p className="text-xs text-white/80 font-medium">Contrato: {contract.codigo} | Cliente: {contract.cliente?.nombre}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Persona que recibe */}
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
            <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
              Inspector / Recibido Por en Bodega
            </label>
            <input
              type="text"
              value={recibidoPor}
              onChange={(e) => setRecibidoPor(e.target.value)}
              placeholder="Ej. Ing. Roberto Mendoza (Control de Calidad)"
              className="precision-input text-xs"
              required
            />
          </div>

          {/* Ítems a retornar */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-2 border-b border-[#E5E8EE] pb-2">
              <ShieldAlert className="w-4 h-4 text-[#C55500]" />
              Verificación de Uso, Faltantes e Inspección de Daños
            </h4>

            {itemForms.map((item, idx) => {
              const horasUso = Math.max(0, Number(item.horometroFinal) - Number(item.horometroInicial));
              const faltantes = Math.max(0, Number(item.cantidadDespachada) - Number(item.cantidadRetornada));

              return (
                <div key={idx} className="bg-white border border-[#E5E8EE] rounded-2xl p-4 shadow-xs space-y-4">
                  
                  {/* Title Bar */}
                  <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        item.tipoControl === 'SERIALIZADO' ? 'bg-[#1A73E8]/10 text-[#1A73E8]' : 'bg-[#C55500]/10 text-[#C55500]'
                      }`}>
                        {item.tipoControl === 'SERIALIZADO' ? 'Maquinaria Serializada' : 'Control por Cantidad'}
                      </span>
                      <h5 className="font-extrabold text-[#1B1D22] text-sm">{item.nombreEquipo}</h5>
                    </div>

                    {item.numeroSerie && (
                      <span className="text-xs font-mono font-black text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-md border border-[#1A73E8]/20">
                        S/N: {item.numeroSerie}
                      </span>
                    )}
                  </div>

                  {/* SERIALIZADO: Control de Horómetro */}
                  {item.tipoControl === 'SERIALIZADO' ? (
                    <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE] grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Horómetro Inicial</span>
                        <span className="text-xs font-black font-mono text-[#37474F] mt-0.5 block">{item.horometroInicial} hrs</span>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Horómetro Final (Retorno)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={item.horometroFinal}
                            onChange={(e) => handleItemChange(idx, 'horometroFinal', e.target.value)}
                            className="precision-input text-xs font-mono font-black pl-8"
                            required
                          />
                          <Gauge className="w-4 h-4 text-[#C55500] absolute left-2.5 top-2.5" />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Horas de Uso Calculadas</span>
                        <span className="text-sm font-black font-mono text-[#1A73E8] mt-0.5 block">
                          +{horasUso.toFixed(1)} hrs
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* POR_CANTIDAD: Conteo de Unidades (Despachadas vs Retornadas vs Faltantes) */
                    <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE] space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Despachadas</span>
                          <span className="text-sm font-black font-mono text-[#37474F]">{item.cantidadDespachada}</span>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Retornadas Sanas</label>
                          <input
                            type="number"
                            value={item.cantidadRetornada}
                            onChange={(e) => handleItemChange(idx, 'cantidadRetornada', e.target.value)}
                            className="precision-input text-xs font-mono font-black"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Retornadas Dañadas</label>
                          <input
                            type="number"
                            value={item.cantidadDañada}
                            onChange={(e) => handleItemChange(idx, 'cantidadDañada', e.target.value)}
                            className="precision-input text-xs font-mono font-black"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-extrabold text-[#C55500] uppercase block">Faltantes / Perdidas</span>
                          <span className={`text-sm font-black font-mono block ${faltantes > 0 ? 'text-[#C55500]' : 'text-[#747780]'}`}>
                            {faltantes} u.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Registro de Daños Cobrables */}
                  <div className="border-t border-[#E5E8EE] pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider">
                        Reporte de Daños o Desgaste Inusual
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAddDanio(idx)}
                        className="px-2.5 py-1 rounded-lg bg-[#C55500]/10 text-[#C55500] hover:bg-[#C55500] hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar Daño
                      </button>
                    </div>

                    {item.danios.length > 0 ? (
                      <div className="space-y-2">
                        {item.danios.map((danio, dIdx) => (
                          <div key={dIdx} className="bg-[#FDF2E9] border border-[#C55500]/30 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs">
                            <div>
                              <span className="text-[9px] font-extrabold text-[#C55500] uppercase block">Componente / Tipo</span>
                              <span className="font-extrabold text-[#1B1D22]">{danio.componente}</span>
                              <span className="text-[10px] text-[#747780] block italic">{danio.tipoDano}</span>
                            </div>

                            <div>
                              <span className="text-[9px] font-extrabold text-[#C55500] uppercase block">Severidad</span>
                              <span className="font-extrabold text-[#C55500]">{danio.severidad}</span>
                            </div>

                            <div>
                              <span className="text-[9px] font-extrabold text-[#C55500] uppercase block">Costo Estimado (C$)</span>
                              <span className="font-mono font-black text-[#1B1D22]">C$ {danio.costoEstimado}</span>
                            </div>

                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveDanio(idx, dIdx)}
                                className="p-1.5 rounded-lg text-[#C55500] hover:bg-white transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#747780] italic">Sin reporte de daños en la inspección de entrada.</p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-[#E5E8EE] pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="btn-precision-outline text-xs"
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-precision-primary bg-[#C55500] hover:bg-[#A34400] text-xs"
            >
              {isSubmitting ? (
                <span>Procesando Retorno...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Finalizar Retorno e Inspección
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
