import React, { useState, useEffect } from 'react';
import type { Contract } from '../services/operations.api';
import { getCompatibleReplacements, swapEquipment } from '../services/operations.api';
import {
  X,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Wrench,
  Truck,
  Sparkles,
  Info,
} from 'lucide-react';

interface SwapEquipmentModalProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const SwapEquipmentModal: React.FC<SwapEquipmentModalProps> = ({
  contract,
  onClose,
  onSuccess,
}) => {
  const [selectedEquipoActualId, setSelectedEquipoActualId] = useState<string>(
    contract.items?.[0]?.equipoId || '',
  );
  const [selectedEquipoNuevoId, setSelectedEquipoNuevoId] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [horometroFinal, setHorometroFinal] = useState<string | number>('');
  const [combustible, setCombustible] = useState('100%');
  const [observaciones, setObservaciones] = useState('');
  const [responsableEntrega, setResponsableEntrega] = useState('Almacén BM Construcciones');
  const [responsableRecepcion, setResponsableRecepcion] = useState(
    contract.cliente?.nombre || '',
  );
  const [cedulaReceptor, setCedulaReceptor] = useState(
    (contract.cliente as any)?.rfc || (contract.cliente as any)?.cedula || '',
  );

  const [isLoadingReplacements, setIsLoadingReplacements] = useState(false);
  const [reemplazos, setReemplazos] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Equipo saliente seleccionado actualmente
  const equipoActualDetalle = contract.items?.find(
    (it) => it.equipoId === selectedEquipoActualId,
  );

  // Inicializar horómetro al cambiar de equipo saliente
  useEffect(() => {
    if (equipoActualDetalle) {
      setHorometroFinal(
        equipoActualDetalle.equipo?.horometro ||
          equipoActualDetalle.horometroInicial ||
          0,
      );
    }
  }, [selectedEquipoActualId]);

  // Cargar reemplazos compatibles cuando cambia el equipo saliente
  useEffect(() => {
    if (!contract.id || !selectedEquipoActualId) return;

    let mounted = true;
    setIsLoadingReplacements(true);
    setError(null);
    setSelectedEquipoNuevoId('');

    getCompatibleReplacements(contract.id, selectedEquipoActualId)
      .then((data) => {
        if (!mounted) return;
        const lista = data.reemplazosDisponibles || [];
        setReemplazos(lista);
        if (lista.length > 0) {
          setSelectedEquipoNuevoId(lista[0].id);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err.response?.data?.message ||
            'Error al consultar equipos compatibles disponibles en almacén',
        );
      })
      .finally(() => {
        if (mounted) setIsLoadingReplacements(false);
      });

    return () => {
      mounted = false;
    };
  }, [contract.id, selectedEquipoActualId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipoActualId) {
      setError('Seleccione el equipo averiado a retirar.');
      return;
    }
    if (!selectedEquipoNuevoId) {
      setError('Seleccione el equipo sustituto disponible.');
      return;
    }
    if (!motivo.trim()) {
      setError('Describa el motivo de la avería o falla que origina la sustitución.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await swapEquipment({
        contratoId: contract.id,
        equipoActualId: selectedEquipoActualId,
        equipoNuevoId: selectedEquipoNuevoId,
        motivo: motivo.trim(),
        horometroFinalActual:
          horometroFinal === '' ? undefined : Number(horometroFinal),
        combustibleRetornoActual: combustible,
        observaciones: observaciones.trim() || undefined,
        responsableEntrega: responsableEntrega.trim() || undefined,
        responsableRecepcion: responsableRecepcion.trim() || undefined,
        cedulaReceptor: cedulaReceptor.trim() || undefined,
      });

      onSuccess(res);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Ocurrió un error al procesar la sustitución del equipo',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E5E8EE] my-8 overflow-hidden animate-fadeIn">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E8EE] bg-gradient-to-r from-blue-50/50 via-white to-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1A73E8]/10 text-[#1A73E8] flex items-center justify-center border border-[#1A73E8]/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block font-mono">
                CONTRATO N°: {contract.codigo}
              </span>
              <h3 className="text-base font-black text-[#1B1D22]">
                Sustitución de Equipo por Avería (Cambio en Caliente)
              </h3>
              <p className="text-xs text-[#747780] font-medium">
                Cliente: <span className="font-bold text-[#1B1D22]">{contract.cliente?.nombre}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#747780] hover:text-[#1B1D22] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Banner explicativo */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-[#1B1D22]">
            <Info className="w-5 h-5 text-[#1A73E8] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">
                Garantía técnica y continuidad operativa de alquiler
              </p>
              <p className="text-[#5F6368] mt-0.5">
                El equipo dañado pasará automáticamente a taller (<strong>EN MANTENIMIENTO</strong>) con orden de trabajo correctivo sin costo para el cliente. El equipo sustituto se vinculará al contrato con sus tarifas originales y se emitirá el acta oficial de sustitución.
              </p>
            </div>
          </div>

          {/* PASO 1: SELECCIÓN DEL EQUIPO AVERIADO (SALIENTE) */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#C55500] tracking-wider border-b border-[#E5E8EE] pb-2">
              <Wrench className="w-4 h-4" />
              <span>Paso 1: Equipo averiado que se retira</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Equipo en Contrato *
                </label>
                <select
                  value={selectedEquipoActualId}
                  onChange={(e) => setSelectedEquipoActualId(e.target.value)}
                  className="precision-input text-xs font-bold"
                  required
                >
                  {contract.items?.map((it) => (
                    <option key={it.equipoId} value={it.equipoId}>
                      {it.equipo?.modelo || 'Equipo'}{' '}
                      {it.equipo?.numeroSerie ? `(S/N: ${it.equipo.numeroSerie})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Horómetro Final de Retiro
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={horometroFinal}
                    onChange={(e) => setHorometroFinal(e.target.value)}
                    className="precision-input text-xs font-mono font-bold pl-8"
                    placeholder="0.0"
                  />
                  <Gauge className="w-4 h-4 text-[#747780] absolute left-2.5 top-2.5" />
                </div>
                <span className="text-[10px] text-[#747780] mt-1 block">
                  Si el equipo no se utilizó en obra, conserve la lectura inicial registrada.
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                Motivo de la avería o falla técnica *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Fuga en manguera hidráulica principal detectada al bajar del camión en obra. Motor no enciende."
                rows={2}
                className="precision-input text-xs"
                required
              />
            </div>
          </div>

          {/* PASO 2: SELECCIÓN DEL EQUIPO SUSTITUTO (ENTRANTE) */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#1A73E8] tracking-wider">
                <Truck className="w-4 h-4" />
                <span>Paso 2: Equipo sustituto disponible en almacén</span>
              </div>
              <span className="text-[10px] font-extrabold text-[#747780]">
                {reemplazos.length} disponible(s)
              </span>
            </div>

            {isLoadingReplacements ? (
              <div className="py-8 text-center text-xs font-bold text-[#747780]">
                Consultando inventario disponible en tiempo real...
              </div>
            ) : reemplazos.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium">
                No hay unidades disponibles en almacén en este momento para reemplazar directamente este modelo. Verifique si existen equipos disponibles en otra categoría.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {reemplazos.map((eq) => {
                  const isSelected = selectedEquipoNuevoId === eq.id;
                  return (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedEquipoNuevoId(eq.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#E8F0FE] border-[#1A73E8] shadow-xs'
                          : 'bg-white border-[#E5E8EE] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="equipoNuevoRadio"
                          checked={isSelected}
                          onChange={() => setSelectedEquipoNuevoId(eq.id)}
                          className="w-4 h-4 text-[#1A73E8] cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-[#1B1D22] uppercase">
                              {eq.modelo}
                            </span>
                            {eq.esReemplazoDirecto && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Reemplazo Directo
                              </span>
                            )}
                            {eq.mismaCategoria && !eq.esReemplazoDirecto && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                Misma Categoría
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#747780] flex items-center gap-3 mt-0.5 font-mono">
                            <span>S/N: {eq.numeroSerie || 'S/N'}</span>
                            <span>Código: {eq.codigo}</span>
                            <span>Horómetro: {eq.horometro || 0} hrs</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Disponible
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PASO 3: LOGÍSTICA DE ENTREGA Y ACTA */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-5 space-y-4">
            <div className="text-xs font-black uppercase text-[#37474F] tracking-wider border-b border-[#E5E8EE] pb-2">
              Paso 3: Acta de Sustitución y Datos de Entrega
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Entregado por (Almacén / Logística)
                </label>
                <input
                  type="text"
                  value={responsableEntrega}
                  onChange={(e) => setResponsableEntrega(e.target.value)}
                  className="precision-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Recibido en obra por (Cliente / Encargado)
                </label>
                <input
                  type="text"
                  value={responsableRecepcion}
                  onChange={(e) => setResponsableRecepcion(e.target.value)}
                  className="precision-input text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Cédula / Identificación de quien recibe
                </label>
                <input
                  type="text"
                  value={cedulaReceptor}
                  onChange={(e) => setCedulaReceptor(e.target.value)}
                  placeholder="Ej. 001-201090-0002A"
                  className="precision-input text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Nivel de Combustible al Despachar Sustituto
                </label>
                <select
                  value={combustible}
                  onChange={(e) => setCombustible(e.target.value)}
                  className="precision-input text-xs"
                >
                  <option value="100%">100% (Tanque Lleno)</option>
                  <option value="75%">75% (3/4 Tanque)</option>
                  <option value="50%">50% (1/2 Tanque)</option>
                  <option value="N/A">N/A (Equipo Eléctrico / Sin Motor)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                Observaciones para el Acta Oficial
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales para el conductor o constancia de entrega..."
                rows={2}
                className="precision-input text-xs"
              />
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E8EE]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-[#E5E8EE] text-xs font-bold text-[#747780] hover:text-[#1B1D22] hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedEquipoNuevoId}
              className="btn-precision-primary text-xs py-2.5 px-6 font-black tracking-tight flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Procesando Sustitución...' : 'Confirmar y Sustituir Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
