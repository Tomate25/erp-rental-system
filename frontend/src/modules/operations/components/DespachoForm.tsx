import React, { useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createDespacho } from '../services/operations.api';
import { ArrowLeft, Truck, Check, AlertCircle, ShieldCheck, Gauge } from 'lucide-react';

interface DespachoFormProps {
  contract: Contract;
  onBack: () => void;
  onSuccess: (createdDespacho?: any) => void;
}

export const DespachoForm: React.FC<DespachoFormProps> = ({ contract, onBack, onSuccess }) => {
  const [operadorNombre, setOperadorNombre] = useState('');
  const [vehiculoEnvio, setVehiculoEnvio] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de ítems a despachar
  const [itemForms, setItemForms] = useState(
    contract.items.map((item) => ({
      equipoId: item.equipoId,
      nombreEquipo: item.equipo?.modelo || 'Equipo',
      tipoControl: item.tipoControl || item.equipo?.tipoControl || 'SERIALIZADO',
      numeroSerie: item.equipo?.numeroSerie || '',
      cantidad: item.cantidad || 1,
      horometroInicial: item.equipo?.horometro || item.horometroInicial || 0,
      estadoSalida: 'BUENO',
      checklistOk: true,
      combustible: 'LLENO',
      aceiteOk: true,
      llantasOk: true,
      hidraulicoOk: true,
      motorOk: true,
      fugasDetectadas: false,
      observaciones: ''
    }))
  );

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...itemForms];
    (updated[index] as any)[field] = value;
    setItemForms(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createDespacho({
        contratoId: contract.id,
        operadorNombre,
        vehiculoEnvio,
        comentarios,
        items: itemForms.map((item) => ({
          equipoId: item.equipoId,
          numeroSerie: item.numeroSerie,
          cantidad: Number(item.cantidad),
          horometroInicial: Number(item.horometroInicial),
          estadoSalida: item.estadoSalida,
          checklistOk: item.checklistOk,
          observaciones: item.observaciones,
          inspeccionSalida: item.tipoControl === 'SERIALIZADO' ? {
            combustible: item.combustible,
            aceiteOk: item.aceiteOk,
            llantasOk: item.llantasOk,
            hidraulicoOk: item.hidraulicoOk,
            motorOk: item.motorOk,
            fugasDetectadas: item.fugasDetectadas,
            observaciones: item.observaciones
          } : undefined
        }))
      });

      onSuccess(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar la orden de despacho');
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
            <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block font-mono">
              CONTRATO N°: {contract.codigo}
            </span>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">
              Generar Orden de Entrega de Equipos
            </h2>
            <p className="text-xs text-[#747780] font-medium">
              Arrendatario / Cliente: <span className="font-bold text-[#1B1D22]">{contract.cliente?.nombre}</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-[#E8F0FE] text-[#1A73E8] px-4 py-2 rounded-xl border border-[#1A73E8]/20">
          <Truck className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Despacho Oficial</span>
        </div>
      </div>

      {/* Formulario Principal de Pantalla Completa */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E8EE] rounded-3xl p-8 shadow-xs space-y-6">
        
        {error && (
          <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sección Logística */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider border-b border-[#E5E8EE] pb-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#1A73E8]" />
            1. Información Logística del Envío
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-5 rounded-2xl border border-[#E5E8EE]">
            <div>
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1.5">
                Operador / Entregador Responsable
              </label>
              <input
                type="text"
                value={operadorNombre}
                onChange={(e) => setOperadorNombre(e.target.value)}
                placeholder="Ej. Juan Pérez (Logística BM Construcciones)"
                className="precision-input text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1.5">
                Vehículo de Envío / Placa
              </label>
              <input
                type="text"
                value={vehiculoEnvio}
                onChange={(e) => setVehiculoEnvio(e.target.value)}
                placeholder="Ej. Camión Freightliner M2 (Placa M 245-891)"
                className="precision-input text-xs"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1.5">
                Observaciones y Comentarios Logísticos de Salida
              </label>
              <input
                type="text"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Ej. Entregar en portería principal de obra con Ing. Supervisor"
                className="precision-input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Sección de Equipos a Despachar */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider border-b border-[#E5E8EE] pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1A73E8]" />
            2. Equipos Contratados y Verificación de Salida
          </h3>

          <div className="space-y-4">
            {itemForms.map((item, idx) => (
              <div key={idx} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4">
                
                {/* Banner de Item */}
                <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      item.tipoControl === 'SERIALIZADO' ? 'bg-[#1A73E8]/10 text-[#1A73E8]' : 'bg-[#C55500]/10 text-[#C55500]'
                    }`}>
                      {item.tipoControl === 'SERIALIZADO' ? 'Maquinaria Serializada' : 'Control por Cantidad'}
                    </span>
                    <h4 className="font-extrabold text-[#1B1D22] text-sm uppercase">{item.nombreEquipo}</h4>
                  </div>

                  <span className="text-xs font-black font-mono text-[#37474F]">
                    Cantidad: {item.cantidad} u.
                  </span>
                </div>

                {item.tipoControl === 'SERIALIZADO' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Número de Serie Asignado
                        </label>
                        <input
                          type="text"
                          value={item.numeroSerie}
                          onChange={(e) => handleItemChange(idx, 'numeroSerie', e.target.value)}
                          placeholder="Ej. SD320/45064H00489540"
                          className="precision-input text-xs font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Horómetro Inicial de Salida (Hrs)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={item.horometroInicial}
                            onChange={(e) => handleItemChange(idx, 'horometroInicial', e.target.value)}
                            className="precision-input text-xs font-mono font-black pl-8"
                            required
                          />
                          <Gauge className="w-4 h-4 text-[#1A73E8] absolute left-2.5 top-2.5" />
                        </div>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="bg-[#F4F6F9] p-4 rounded-2xl border border-[#E5E8EE] space-y-2">
                      <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block">
                        Inspección Técnica de Entregabilidad
                      </span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-[#37474F] pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.aceiteOk}
                            onChange={(e) => handleItemChange(idx, 'aceiteOk', e.target.checked)}
                            className="rounded text-[#1A73E8] w-4 h-4 cursor-pointer"
                          />
                          <span>Aceite Motor OK</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.llantasOk}
                            onChange={(e) => handleItemChange(idx, 'llantasOk', e.target.checked)}
                            className="rounded text-[#1A73E8] w-4 h-4 cursor-pointer"
                          />
                          <span>Llantas / Orugas OK</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hidraulicoOk}
                            onChange={(e) => handleItemChange(idx, 'hidraulicoOk', e.target.checked)}
                            className="rounded text-[#1A73E8] w-4 h-4 cursor-pointer"
                          />
                          <span>Sist. Hidráulico OK</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!item.fugasDetectadas}
                            onChange={(e) => handleItemChange(idx, 'fugasDetectadas', !e.target.checked)}
                            className="rounded text-[#1A73E8] w-4 h-4 cursor-pointer"
                          />
                          <span>Sin Fugas de Fluido</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F4F6F9] p-4 rounded-2xl border border-[#E5E8EE]">
                    <div>
                      <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                        Cantidad Despachada
                      </label>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                        className="precision-input text-xs font-mono font-black"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                        Estado Físico de Salida
                      </label>
                      <select
                        value={item.estadoSalida}
                        onChange={(e) => handleItemChange(idx, 'estadoSalida', e.target.value)}
                        className="precision-input text-xs font-bold"
                      >
                        <option value="BUENO">BUENO (100% Operativo)</option>
                        <option value="REGULAR">REGULAR (Detalles de Pintura)</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>

        {/* Pie de Página de Botones */}
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
            className="btn-precision-primary text-xs py-3 px-8 cursor-pointer font-black"
          >
            {isSubmitting ? (
              <span>Generando Orden...</span>
            ) : (
              <>
                <Check className="w-4 h-4" /> Despachar e Imprimir Acta de Entrega
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
