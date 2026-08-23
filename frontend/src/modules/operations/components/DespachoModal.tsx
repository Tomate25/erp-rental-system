import React, { useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createDespacho } from '../services/operations.api';
import { X, Truck, Check, AlertCircle, ShieldCheck, Gauge } from 'lucide-react';

interface DespachoModalProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: (createdDespacho?: any) => void;
}

export const DespachoModal: React.FC<DespachoModalProps> = ({ contract, onClose, onSuccess }) => {
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
      combustible: '100%',
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
    <div className="fixed inset-0 bg-[#37474F]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-[#1A73E8] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Nueva Orden de Despacho e Inspección de Salida</h3>
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Datos Logísticos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
            <div>
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                Operador / Entregador Responsable
              </label>
              <input
                type="text"
                value={operadorNombre}
                onChange={(e) => setOperadorNombre(e.target.value)}
                placeholder="Ej. Juan Pérez (Logística)"
                className="precision-input text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                Vehículo de Envío / Placa
              </label>
              <input
                type="text"
                value={vehiculoEnvio}
                onChange={(e) => setVehiculoEnvio(e.target.value)}
                placeholder="Ej. Camión Freightliner M2 (Placa M 245-891)"
                className="precision-input text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                Observaciones y Comentarios Logísticos
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

          {/* Lista de Equipos a Despachar (Diferenciados por tipoControl) */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-2 border-b border-[#E5E8EE] pb-2">
              <ShieldCheck className="w-4 h-4 text-[#1A73E8]" />
              Equipos y Verificación de Salida por Tipo de Control
            </h4>

            {itemForms.map((item, idx) => (
              <div key={idx} className="bg-white border border-[#E5E8EE] rounded-2xl p-4 shadow-xs space-y-4">
                
                {/* Banner de Item */}
                <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      item.tipoControl === 'SERIALIZADO' ? 'bg-[#1A73E8]/10 text-[#1A73E8]' : 'bg-[#C55500]/10 text-[#C55500]'
                    }`}>
                      {item.tipoControl === 'SERIALIZADO' ? 'Control Serializado' : 'Control por Cantidad'}
                    </span>
                    <h5 className="font-extrabold text-[#1B1D22] text-sm">{item.nombreEquipo}</h5>
                  </div>

                  <span className="text-xs font-black font-mono text-[#37474F]">
                    Cant: {item.cantidad} u.
                  </span>
                </div>

                {/* Si es SERIALIZADO */}
                {item.tipoControl === 'SERIALIZADO' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          Horómetro Inicial (Hrs)
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

                    {/* Checklist de Inspección de Salida */}
                    <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE] space-y-2">
                      <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block">
                        Inspección Técnica de Entregabilidad
                      </span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-[#37474F]">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.aceiteOk}
                            onChange={(e) => handleItemChange(idx, 'aceiteOk', e.target.checked)}
                            className="rounded text-[#1A73E8]"
                          />
                          <span>Aceite Motor OK</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.llantasOk}
                            onChange={(e) => handleItemChange(idx, 'llantasOk', e.target.checked)}
                            className="rounded text-[#1A73E8]"
                          />
                          <span>Llantas / Orugas OK</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hidraulicoOk}
                            onChange={(e) => handleItemChange(idx, 'hidraulicoOk', e.target.checked)}
                            className="rounded text-[#1A73E8]"
                          />
                          <span>Sist. Hidráulico OK</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!item.fugasDetectadas}
                            onChange={(e) => handleItemChange(idx, 'fugasDetectadas', !e.target.checked)}
                            className="rounded text-[#1A73E8]"
                          />
                          <span>Sin Fugas de Fluido</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Si es POR_CANTIDAD */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE]">
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
                        <option value="BUENO">BUENO (100% Funcional)</option>
                        <option value="REGULAR">REGULAR (Detalles de Pintura)</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Footer de Botones */}
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
              className="btn-precision-primary text-xs"
            >
              {isSubmitting ? (
                <span>Generando Orden...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Despachar e Iniciar Alquiler
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
