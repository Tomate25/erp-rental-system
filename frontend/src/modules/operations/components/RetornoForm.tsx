import React, { useMemo, useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createRetorno } from '../services/operations.api';
import { ArrowLeft, RotateCcw, Check, AlertTriangle, ShieldAlert, Plus, Trash2, Gauge, CalendarClock, WalletCards } from 'lucide-react';
import { calculateReturnTiming, returnClassificationLabel } from '../utils/returnTiming';

interface RetornoFormProps {
  contract: Contract;
  onBack: () => void;
  onSuccess: (createdRetorno?: any) => void;
}

export const RetornoForm: React.FC<RetornoFormProps> = ({ contract, onBack, onSuccess }) => {
  const [recibidoPor, setRecibidoPor] = useState('');
  const [entregadoPor, setEntregadoPor] = useState('');
  const [cedulaEntregante, setCedulaEntregante] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptPreview] = useState(() => new Date());
  const [motivoRetorno, setMotivoRetorno] = useState('');
  const [confirmacion, setConfirmacion] = useState(false);

  // Formularios por ítem de retorno
  const [itemForms, setItemForms] = useState(
    contract.items.map((item) => {
      const isQuantity = (item.tipoControl || item.equipo?.tipoControl) === 'POR_CANTIDAD';
      const tieneHorometro =
        item.equipo?.tieneHorometro !== undefined
          ? Boolean(item.equipo.tieneHorometro)
          : !isQuantity &&
            (Boolean((item.equipo as any)?.categoria?.isLineaAmarilla) ||
              (item.equipo?.horometro || 0) > 0);

      return {
        equipoId: item.equipoId,
        nombreEquipo: item.equipo?.modelo || 'Equipo',
        tipoControl: item.tipoControl || item.equipo?.tipoControl || 'SERIALIZADO',
        tieneHorometro,
        numeroSerie: item.equipo?.numeroSerie || '',
        tipoMedicionCombustible: item.equipo?.tipoMedicionCombustible || 'NO_APLICA',
        cantidadDespachada: item.cantidad || 1,
        cantidadRetornada: item.cantidad || 1,
        cantidadDañada: 0,
        cantidadPerdida: 0,
        horometroInicial: tieneHorometro ? (item.equipo?.horometro || item.horometroInicial || 0) : 0,
        horometroFinal: (tieneHorometro ? '' : 0) as number | string,
        combustibleRetorno: '',
        inspeccionEstado: {
          funcionamiento: '' as '' | 'FUNCIONA' | 'NO_FUNCIONA' | 'NO_VERIFICADO',
          estadoFisico: '' as '' | 'BUENO' | 'DESGASTE_NORMAL' | 'DANADO',
          accesoriosCompletos: null as boolean | null,
          observaciones: '',
          fotosTexto: '',
        },
        daniosDetectados: false,
        descripcionDanios: '',
        danios: [] as any[]
      };
    })
  );

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...itemForms];
    (updated[index] as any)[field] = value;
    setItemForms(updated);
  };

  const handleAddDanio = (itemIndex: number) => {
    const updated = [...itemForms];
    updated[itemIndex].danios.push({
      componente: '',
      tipoDano: '',
      severidad: 'MEDIA',
      cobrable: false,
      costoEstimado: ''
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
    if (itemForms.some((item) => !item.inspeccionEstado.funcionamiento || !item.inspeccionEstado.estadoFisico || item.inspeccionEstado.accesoriosCompletos === null)) {
      setError('Complete la inspección de funcionamiento, estado físico y accesorios de cada equipo.');
      return;
    }
    if (itemForms.some((item) => item.tieneHorometro && (item.horometroFinal === '' || (item.tipoMedicionCombustible !== 'NO_APLICA' && !item.combustibleRetorno.trim())))) {
      setError('Registre la lectura real del horómetro y combustible de cada máquina.');
      return;
    }
    if (itemForms.some((item) => item.tieneHorometro && (Number(item.horometroFinal) < Number(item.horometroInicial) || !Number.isFinite(Number(item.horometroFinal))))) {
      setError('El horómetro final debe ser igual o mayor que la lectura inicial registrada.');
      return;
    }
    if (itemForms.some((item) => (item.inspeccionEstado.estadoFisico === 'DANADO' || item.inspeccionEstado.funcionamiento === 'NO_FUNCIONA' || item.inspeccionEstado.accesoriosCompletos === false) && item.danios.length === 0)) {
      setError('Describa el daño o faltante detectado y determine si es cobrable al cliente.');
      return;
    }
    if (itemForms.some((item) => item.tipoControl === 'POR_CANTIDAD' && item.danios.length > 0 && Number(item.cantidadDañada) < 1)) {
      setError('En equipos por cantidad, indique cuántas unidades retornaron dañadas.');
      return;
    }
    if (itemForms.some((item) => item.danios.some((danio) => danio.costoEstimado !== '' && (!Number.isFinite(Number(danio.costoEstimado)) || Number(danio.costoEstimado) < 0)))) {
      setError('El costo estimado debe ser un número válido o dejarse vacío hasta que taller registre el gasto real.');
      return;
    }
    if (timing.classification === 'ANTICIPADO' && !motivoRetorno.trim()) {
      setError('Indique el motivo del retorno anticipado para incorporarlo al acta.');
      return;
    }
    if (!confirmacion) {
      setError('Confirme que revisó la inspección y la liquidación preliminar.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createRetorno({
        contratoId: contract.id,
        actaRetornoData: {
          fechaInicioPactada: contract.fechaInicio,
          fechaFinPactada: contract.fechaFinPactada || contract.fechaFin,
          fechaRecepcionFisica: receiptPreview.toISOString(),
          clasificacionEstimada: timing.classification,
          motivoRetorno: motivoRetorno.trim() || undefined,
          politicaCobro: 'TIEMPO_EFECTIVO_TARIFA_PACTADA',
          excluirDiaDevolucion: true,
          ceseCobro: 'RECEPCION_FISICA',
          tipoRetorno: isTotalReturn ? 'TOTAL' : 'PARCIAL',
          liquidacionPreliminar: {
            diasPactados: timing.contractedDays,
            diasCobrados: timing.effectiveDays,
            diasAnticipados: timing.classification === 'ANTICIPADO' ? timing.differenceDays : 0,
          },
          items: itemForms.map((item) => ({
            equipoId: item.equipoId,
            nombreEquipo: item.nombreEquipo,
            numeroSerie: item.numeroSerie,
            cantidadRetornada: Number(item.cantidadRetornada),
            destinoEquipo: Number(item.cantidadPerdida) > 0
              ? 'FUERA_DE_SERVICIO'
              : item.daniosDetectados || item.danios.length > 0 || item.inspeccionEstado.estadoFisico === 'DANADO' || item.inspeccionEstado.funcionamiento === 'NO_FUNCIONA'
                ? 'MANTENIMIENTO'
                : 'DISPONIBLE',
            horometroInicial: item.tieneHorometro ? Number(item.horometroInicial) : 0,
            horometroFinal: !item.tieneHorometro || item.horometroFinal === '' ? undefined : Number(item.horometroFinal),
            horasTrabajadas: !item.tieneHorometro || item.horometroFinal === '' ? undefined : Math.max(0, Number(item.horometroFinal) - Number(item.horometroInicial)),
            combustibleRetorno: item.combustibleRetorno || undefined,
            inspeccionEstado: item.inspeccionEstado,
            danios: item.danios,
          })),
        },
        recibidoPor,
        entregadoPor,
        cedulaEntregante,
        items: itemForms.map((item) => ({
          equipoId: item.equipoId,
          numeroSerie: item.numeroSerie,
          cantidadRetornada: Number(item.cantidadRetornada),
          cantidadDañada: Number(item.cantidadDañada),
          cantidadPerdida: Number(item.cantidadPerdida),
          horometroFinal: !item.tieneHorometro || item.horometroFinal === '' ? undefined : Number(item.horometroFinal),
          combustibleRetorno: item.combustibleRetorno || undefined,
          inspeccionEstado: {
            funcionamiento: item.inspeccionEstado.funcionamiento as 'FUNCIONA' | 'NO_FUNCIONA' | 'NO_VERIFICADO',
            estadoFisico: item.inspeccionEstado.estadoFisico as 'BUENO' | 'DESGASTE_NORMAL' | 'DANADO',
            accesoriosCompletos: Boolean(item.inspeccionEstado.accesoriosCompletos),
            observaciones: item.inspeccionEstado.observaciones,
            fotosUrls: item.inspeccionEstado.fotosTexto.split(/[\n,]/).map(value => value.trim()).filter(Boolean),
          },
          daniosDetectados: item.daniosDetectados,
          descripcionDanios: item.descripcionDanios,
          danios: item.danios.map(({ costoEstimado, ...danio }) => ({
            ...danio,
            ...(costoEstimado === '' || costoEstimado == null ? {} : { costoEstimado: Number(costoEstimado) }),
          }))
        }))
      });

      onSuccess(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar la recepción de retorno');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateInspection = (index: number, field: string, value: string | boolean) => {
    setItemForms(current => current.map((item, position) => {
      if (position !== index) return item;
      const updatedInspection = { ...item.inspeccionEstado, [field]: value };
      return {
        ...item,
        inspeccionEstado: updatedInspection,
      };
    }));
  };

  const timing = useMemo(() => calculateReturnTiming(contract, receiptPreview), [contract, receiptPreview]);
  const isTotalReturn = itemForms.every((item) =>
    Number(item.cantidadRetornada) + Number(item.cantidadPerdida) >= Number(item.cantidadDespachada),
  );
  const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat('es-NI', {
    timeZone: 'America/Managua', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
  const money = (value: number) => `C$ ${value.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

        <section className="rounded-2xl border border-[#1A73E8]/25 bg-[#E8F0FE]/45 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2"><CalendarClock className="w-4 h-4 text-[#1A73E8]" /> Vigencia pactada vs. recepción física</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${timing.classification === 'ANTICIPADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : timing.classification === 'TARDIO' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
              {returnClassificationLabel(timing)}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Inicio pactado</span><b>{formatDateTime(contract.fechaInicio)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Retorno previsto</span><b>{formatDateTime(contract.fechaFinPactada || contract.fechaFin)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Recepción física</span><b>{formatDateTime(receiptPreview)}</b><small className="block text-[#747780] mt-1">Vista previa; el servidor fija la hora oficial al guardar.</small></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Tipo de retorno</span><b>{isTotalReturn ? 'TOTAL' : 'PARCIAL'}</b></div>
          </div>
          {timing.classification === 'ANTICIPADO' && <label className="text-xs font-extrabold uppercase block">Motivo del retorno anticipado
            <textarea value={motivoRetorno} onChange={e => setMotivoRetorno(e.target.value)} className="precision-input text-xs mt-1" placeholder="Motivo informado por el cliente" required />
          </label>}
          <p className="text-[11px] text-[#37474F]">El cobro termina al recibirse físicamente el equipo. El día de devolución no se cobra.</p>
        </section>

        {/* Información del Receptor */}
        <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E5E8EE] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-extrabold text-[#37474F] uppercase">Entregado por
              <input value={entregadoPor} onChange={e => setEntregadoPor(e.target.value)} className="precision-input text-xs mt-1" placeholder="Persona que devuelve el equipo" required />
            </label>
            <label className="text-xs font-extrabold text-[#37474F] uppercase">Cédula de quien entrega
              <input value={cedulaEntregante} onChange={e => setCedulaEntregante(e.target.value)} className="precision-input text-xs mt-1" placeholder="Número de identificación" />
            </label>
          </div>
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
              const horasUso = item.horometroFinal === '' ? null : Math.max(0, Number(item.horometroFinal) - Number(item.horometroInicial));
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

                  {item.tieneHorometro ? (
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
                            <span>{horasUso === null ? 'Pendiente de lectura' : `+${horasUso.toFixed(1)} hrs`}</span>
                            <span className="text-[9px] font-bold uppercase">Uso Registrado</span>
                          </div>
                        </div>
                      </div>
                      {item.tipoMedicionCombustible !== 'NO_APLICA' && <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Combustible al retornar ({item.tipoMedicionCombustible})</label>
                        <input value={item.combustibleRetorno} onChange={e => handleItemChange(idx, 'combustibleRetorno', e.target.value)} className="precision-input text-xs" placeholder="Lectura real del indicador" required />
                      </div>}
                    </div>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-[#747780]" />
                        <span className="font-bold text-[#37474F]">N/A (Equipo estático / sin motor)</span>
                      </div>
                      <span className="text-[11px] text-[#747780] font-medium">No requiere lectura de horómetro ni combustible</span>
                    </div>
                  )}

                  {item.tipoControl !== 'SERIALIZADO' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Cant. Recibida (incluye dañadas)
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

                  <div className="rounded-2xl border border-[#E5E8EE] bg-[#F8FAFC] p-4 space-y-3">
                    <h5 className="text-xs font-black uppercase text-[#37474F]">Lista de inspección al recibir</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-xs font-bold">Funcionamiento
                        <select value={item.inspeccionEstado.funcionamiento} onChange={e => updateInspection(idx, 'funcionamiento', e.target.value)} className="precision-input text-xs mt-1" required>
                          <option value="">Seleccione</option><option value="FUNCIONA">Funciona</option><option value="NO_FUNCIONA">No funciona</option><option value="NO_VERIFICADO">No se pudo verificar</option>
                        </select>
                      </label>
                      <label className="text-xs font-bold">Estado físico
                        <select value={item.inspeccionEstado.estadoFisico} onChange={e => updateInspection(idx, 'estadoFisico', e.target.value)} className="precision-input text-xs mt-1" required>
                          <option value="">Seleccione</option><option value="BUENO">Buen estado</option><option value="DESGASTE_NORMAL">Desgaste normal</option><option value="DANADO">Dañado</option>
                        </select>
                      </label>
                      <label className="text-xs font-bold">Accesorios
                        <select value={item.inspeccionEstado.accesoriosCompletos === null ? '' : String(item.inspeccionEstado.accesoriosCompletos)} onChange={e => updateInspection(idx, 'accesoriosCompletos', e.target.value === 'true')} className="precision-input text-xs mt-1" required>
                          <option value="">Seleccione</option><option value="true">Completos</option><option value="false">Faltantes</option>
                        </select>
                      </label>
                    </div>
                    <textarea value={item.inspeccionEstado.observaciones} onChange={e => updateInspection(idx, 'observaciones', e.target.value)} className="precision-input text-xs" placeholder="Observaciones de la inspección" aria-label="Observaciones de la inspección" />
                    <textarea value={item.inspeccionEstado.fotosTexto} onChange={e => updateInspection(idx, 'fotosTexto', e.target.value)} className="precision-input text-xs" placeholder="Enlaces de fotos, uno por línea" aria-label="Enlaces de fotos del retorno" />
                  </div>

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
                      <div key={dIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-[#FDF2E9] p-3 rounded-xl border border-[#C55500]/30 items-end">
                        <div>
                          <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Componente</label>
                          <input
                            type="text"
                            value={d.componente}
                            onChange={(e) => handleDanioChange(idx, dIdx, 'componente', e.target.value)}
                            className="precision-input text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Tipo de Daño</label>
                          <input
                            type="text"
                            value={d.tipoDano}
                            onChange={(e) => handleDanioChange(idx, dIdx, 'tipoDano', e.target.value)}
                            className="precision-input text-xs"
                            required
                          />
                        </div>
                        <label className="text-[9px] font-black text-[#C55500] uppercase">Responsabilidad
                          <select value={String(d.cobrable)} onChange={e => handleDanioChange(idx, dIdx, 'cobrable', e.target.value === 'true')} className="precision-input text-xs mt-1">
                            <option value="false">Costo interno</option><option value="true">Cobrar al cliente</option>
                          </select>
                        </label>
                        <div>
                          <label className="text-[9px] font-black text-[#C55500] uppercase block mb-1">Costo Estimado (C$)</label>
                          <input
                            type="number"
                            value={d.costoEstimado}
                            onChange={(e) => handleDanioChange(idx, dIdx, 'costoEstimado', e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="Opcional"
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

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2"><WalletCards className="w-4 h-4 text-emerald-700" /> Estimación preliminar · pendiente de cálculo oficial y aprobación manual</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Período pactado</span><b>{timing.contractedDays} días · {money(timing.contractedAmount)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Tiempo efectivo</span><b>{timing.effectiveDays} días · {money(timing.accruedAmount)}</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Tarifa pactada</span><b>{money(timing.dailyRate)} / día</b></div>
            <div className="bg-white p-3 rounded-xl border"><span className="text-[9px] uppercase font-extrabold text-[#747780] block">Diferencia no devengada</span><b className="text-emerald-700">{money(timing.unearnedDifference)}</b></div>
          </div>
          <div className="p-3 bg-white border rounded-xl text-[11px] text-[#37474F] space-y-1">
            <p><b>Importante:</b> esta estimación usa el período completo y puede variar si hubo despachos parciales o escalonados. El cálculo oficial lo realizará el servidor al registrar el retorno.</p>
            <p>Si existe facturación previa, la nota de crédito se tramita por separado. Después se seleccionará por separado el destino: reembolso o saldo a favor.</p>
          </div>
          <label className="flex items-start gap-2 text-xs font-bold cursor-pointer">
            <input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)} className="mt-0.5" />
            Confirmo que revisé los datos físicos, la inspección y el cálculo preliminar. La liquidación quedará pendiente de aprobación manual.
          </label>
        </section>

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
