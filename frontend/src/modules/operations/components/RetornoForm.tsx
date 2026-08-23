import React, { useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createRetorno } from '../services/operations.api';
import { ArrowLeft, RotateCcw, Check, AlertTriangle, ShieldAlert, Plus, Trash2, Gauge } from 'lucide-react';

interface RetornoFormProps {
  contract: Contract;
  onBack: () => void;
  onSuccess: (createdRetorno?: any) => void;
}

export const RetornoForm: React.FC<RetornoFormProps> = ({ contract, onBack, onSuccess }) => {
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
      horometroFinal: (item.equipo?.horometro || item.horometroInicial || 0) + 10,
      daniosDetectados: false,
      descripcionDanios: '',
      danios: [] as any[]
    }))
  );

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...itemForms];
    (updated[index] as any)[field] = value;
    setItemForms(updated);
  };

  const handleAddDanio = (itemIndex: number) => {
    const updated = [...itemForms];
    updated[itemIndex].danios.push({
      componente: 'Estructura / Motor',
      tipoDano: 'Golpe / Desgaste',
      severidad: 'MODERADO',
      costoEstimado: 500
    });
    updated[itemIndex].daniosDetectados = true;
    setItemForms(updated);
  };

  const handleRemoveDanio = (itemIndex: number, danioIndex: number) => {
    const updated = [...itemForms];
    updated[itemIndex].danios = updated[itemIndex].danios.filter((_, i) => i !== danioIndex);
    if (updated[itemIndex].danios.length === 0) {
      updated[itemIndex].daniosDetectados = false;
    }
    setItemForms(updated);
  };

  const handleDanioChange = (itemIndex: number, danioIndex: number, field: string, value: any) => {
    const updated = [...itemForms];
    updated[itemIndex].danios[danioIndex][field] = value;
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
    <div className="space-y-6 animate-fadeIn font-sans w-full max-w-5xl mx-auto">
      
      {/* Encabezado Principal Completo de Pantalla */}
      <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-4 bg-white p-6 rounded-2xl border shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="btn-precision-outline text-xs flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          
          <div>
            <span className="text-[10px] font-black text-[#C55500] uppercase tracking-wider block font-mono">
              RETORNO DE CONTRATO N°: {contract.codigo}
            </span>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">
              Registrar Retorno de Equipos e Inspección de Recepción
            </h2>
            <p className="text-xs text-[#747780] font-medium">
              Cliente: <span className="font-bold text-[#1B1D22]">{contract.cliente?.nombre}</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-[#FDF2E9] text-[#C55500] px-4 py-2 rounded-xl border border-[#C55500]/20">
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Recepción Oficial</span>
        </div>
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E8EE] rounded-3xl p-8 shadow-xs space-y-6">
        
        {error && (
          <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Información del Receptor */}
        <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E5E8EE] space-y-3">
          <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block">
            Personal Responsable de la Recepción en Almacén
          </label>
          <input
            type="text"
            value={recibidoPor}
            onChange={(e) => setRecibidoPor(e.target.value)}
            placeholder="Ej. Pedro Morales (Jefe de Almacén BM)"
            className="precision-input text-xs"
            required
          />
        </div>

        {/* Inspección por Ítem */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider border-b border-[#E5E8EE] pb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C55500]" />
            Inspección de Estado y Horómetro Final por Maquinaria
          </h3>

          <div className="space-y-4">
            {itemForms.map((item, idx) => {
              const horasUso = Math.max(0, item.horometroFinal - item.horometroInicial);
              return (
                <div key={idx} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#C55500]/10 text-[#C55500]">
                        {item.tipoControl}
                      </span>
                      <h4 className="font-extrabold text-[#1B1D22] text-sm uppercase">{item.nombreEquipo}</h4>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#747780]">
                      {item.numeroSerie ? `S/N: ${item.numeroSerie}` : `Despachadas: ${item.cantidadDespachada}`}
                    </span>
                  </div>

                  {item.tipoControl === 'SERIALIZADO' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                            Horómetro Inicial
                          </label>
                          <input
                            type="text"
                            value={`${item.horometroInicial} hrs`}
                            disabled
                            className="precision-input text-xs font-mono font-bold bg-[#EFF3F8]"
                          />
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
                              className="precision-input text-xs font-mono font-black pl-8 border-[#C55500]/40 focus:border-[#C55500]"
                              required
                            />
                            <Gauge className="w-4 h-4 text-[#C55500] absolute left-2.5 top-2.5" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                            Horas de Uso Calculadas
                          </label>
                          <div className="precision-input text-xs font-mono font-black bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-between">
                            <span>+{horasUso.toFixed(1)} hrs</span>
                            <span className="text-[9px] font-bold uppercase">Uso Registrado</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Cant. Retornada en Buen Estado
                        </label>
                        <input
                          type="number"
                          value={item.cantidadRetornada}
                          onChange={(e) => handleItemChange(idx, 'cantidadRetornada', e.target.value)}
                          className="precision-input text-xs font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Cant. Dañada / Reparación
                        </label>
                        <input
                          type="number"
                          value={item.cantidadDañada}
                          onChange={(e) => handleItemChange(idx, 'cantidadDañada', e.target.value)}
                          className="precision-input text-xs font-mono font-bold text-[#C55500]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Cant. Faltante / Perdida
                        </label>
                        <input
                          type="number"
                          value={item.cantidadPerdida}
                          onChange={(e) => handleItemChange(idx, 'cantidadPerdida', e.target.value)}
                          className="precision-input text-xs font-mono font-bold text-red-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sección Reporte de Daños */}
                  <div className="border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#1B1D22] uppercase tracking-wider">
                        ¿Presenta Daños o Averías Cobrables?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddDanio(idx)}
                        className="text-xs font-bold text-[#C55500] hover:text-[#A04400] flex items-center gap-1 cursor-pointer bg-[#FDF2E9] px-3 py-1.5 rounded-xl border border-[#C55500]/20"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Detalle de Daño
                      </button>
                    </div>

                    {item.danios.map((d: any, dIdx: number) => (
                      <div key={dIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#FDF2E9] p-3 rounded-xl border border-[#C55500]/30 items-end">
                        <div>
                          <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Componente</label>
                          <input
                            type="text"
                            value={d.componente}
                            onChange={(e) => handleDanioChange(idx, dIdx, 'componente', e.target.value)}
                            className="precision-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Tipo de Daño</label>
                          <input
                            type="text"
                            value={d.tipoDano}
                            onChange={(e) => handleDanioChange(idx, dIdx, 'tipoDano', e.target.value)}
                            className="precision-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Costo Estimado (C$)</label>
                          <input
                            type="number"
                            value={d.costoEstimado}
                            onChange={(e) => handleDanioChange(idx, dIdx, 'costoEstimado', e.target.value)}
                            className="precision-input text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveDanio(idx, dIdx)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Pie de Página */}
        <div className="border-t border-[#E5E8EE] pt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="btn-precision-outline text-xs"
            disabled={isSubmitting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-precision-primary bg-[#C55500] hover:bg-[#A04400] text-xs py-3 px-8 cursor-pointer font-black"
          >
            {isSubmitting ? (
              <span>Procesando Retorno...</span>
            ) : (
              <>
                <Check className="w-4 h-4" /> Registrar Retorno e Imprimir Acta de Recepción
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
