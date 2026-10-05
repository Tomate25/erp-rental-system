import React, { useState } from 'react';
import type { Contract } from '../services/operations.api';
import { createDespacho } from '../services/operations.api';
import { ArrowLeft, Truck, Check, AlertCircle, ShieldCheck, Gauge, FileText, Calendar, Clock, User, Building } from 'lucide-react';

interface DespachoFormProps {
  contract: Contract;
  onBack: () => void;
  onSuccess: (result: { despacho: any; actaData: any }) => void;
}

const FUEL_PRESETS = {
  BARRAS: [
    '10 BARRAS (LLENO)',
    '8 BARRAS',
    '6 BARRAS',
    '4 BARRAS',
    '2 BARRAS',
    '1 BARRA (RESERVA)'
  ],
  PORCENTAJE: [
    '100% (LLENO)',
    '75% (3/4)',
    '50% (1/2)',
    '25% (1/4)',
    '10% (RESERVA)'
  ],
  PULGADAS: [
    '14 PULGADAS (LLENO)',
    '12 PULGADAS',
    '10 PULGADAS',
    '8 PULGADAS',
    '6 PULGADAS',
    '4 PULGADAS',
    '2 PULGADAS'
  ]
};

const getDefaultFuel = (tipoMedicion?: string | null) => {
  if (tipoMedicion === 'BARRAS' || tipoMedicion === 'PULGADAS' || tipoMedicion === 'PORCENTAJE') {
    return ''; // Sin preseleccionar LLENO para exigir lectura real en salida
  }
  return 'N/A';
};

export const DespachoForm: React.FC<DespachoFormProps> = ({ contract, onBack, onSuccess }) => {
  // 1. Datos de Emisión del Acta Oficial y Logística
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const isPm = hours >= 12;
  hours = hours % 12 || 12;
  const defaultHora = `${hours.toString().padStart(2, '0')}:${minutes}`;
  const defaultAmpm: 'AM' | 'PM' = isPm ? 'PM' : 'AM';

  const defaultClient = contract.cliente?.nombre || '';
  const defaultCedula = contract.cliente?.rfc || contract.cliente?.cedula || '';

  const [fechaEntrega, setFechaEntrega] = useState(today);
  const [horaEntrega, setHoraEntrega] = useState(defaultHora);
  const [ampmEntrega, setAmpmEntrega] = useState<'AM' | 'PM'>(defaultAmpm);
  const [entregadoPor, setEntregadoPor] = useState('BM Construcciones / Almacén');
  const [recibidoPor, setRecibidoPor] = useState(defaultClient);
  const [cedula, setCedula] = useState(defaultCedula);
  const [vehiculoEnvio, setVehiculoEnvio] = useState('');
  const [operadorNombre, setOperadorNombre] = useState('');
  const [observacionesActa, setObservacionesActa] = useState(
    'Equipo entregado en perfecto estado de funcionamiento y limpieza.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Estado de ítems a despachar con tipo de medición de inventario
  // Calcular saldo pendiente por equipo para prevenir sobredespachos
  const despachosPrevios = contract.despachos || [];

  const [itemForms, setItemForms] = useState(() => {
    return (contract.items || [])
      .map((item) => {
        const isQuantity = (item.tipoControl || item.equipo?.tipoControl) === 'POR_CANTIDAD';
        const tipoMedicion = isQuantity ? null : (item.equipo?.tipoMedicionCombustible || null);

        const cantidadTotal = item.cantidad || 1;
        const cantidadYaDespachada = despachosPrevios.reduce((acc: number, d: any) => {
          const matches = (d.items || []).filter((di: any) => di.equipoId === item.equipoId);
          return acc + matches.reduce((iAcc: number, di: any) => iAcc + (di.cantidad || 1), 0);
        }, 0);

        const cantidadPendiente = Math.max(0, cantidadTotal - cantidadYaDespachada);

        return {
          equipoId: item.equipoId,
          nombreEquipo: item.equipo?.modelo || 'Equipo',
          descripcionEquipo: item.equipo?.descripcion || '',
          tipoControl: item.tipoControl || item.equipo?.tipoControl || 'SERIALIZADO',
          numeroSerie: item.equipo?.numeroSerie || '',
          cantidadTotal,
          cantidadYaDespachada,
          cantidad: cantidadPendiente,
          horometroInicial: item.equipo?.horometro || item.horometroInicial || 0,
          tipoMedicionCombustible: tipoMedicion,
          estadoSalida: 'BUENO',
          checklistOk: true,
          combustible: getDefaultFuel(tipoMedicion),
          aceiteOk: true,
          llantasOk: true,
          hidraulicoOk: true,
          motorOk: true,
          fugasDetectadas: false,
          observaciones: ''
        };
      })
      .filter((it) => it.cantidad > 0);
  });

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...itemForms];
    (updated[index] as any)[field] = value;
    setItemForms(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validación estricta: si el equipo es combustión y serializado, exigir lectura real antes de despachar
    for (const it of itemForms) {
      if (it.tipoControl !== 'POR_CANTIDAD' && it.tipoMedicionCombustible && ['BARRAS', 'PORCENTAJE', 'PULGADAS'].includes(it.tipoMedicionCombustible)) {
        if (!it.combustible || !it.combustible.trim() || it.combustible === 'N/A') {
          setError(`Debe registrar la lectura real de combustible en el indicador (${it.tipoMedicionCombustible}) para el equipo: ${it.nombreEquipo}`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      const fechaFormateada = fechaEntrega 
        ? new Date(`${fechaEntrega}T12:00:00`).toLocaleDateString('es-NI') 
        : new Date().toLocaleDateString('es-NI');

      // Preparar los datos definitivos del acta configurada directamente en la Salida
      const actaData = {
        fecha: fechaFormateada,
        hora: horaEntrega,
        ampm: ampmEntrega,
        entregadoPor,
        recibidoPor,
        cedula,
        contratoNo: contract.codigo,
        fechaInicioPactada: contract.fechaInicio,
        fechaFinPactada: contract.fechaFinPactada || contract.fechaFin,
        observaciones: observacionesActa,
        items: itemForms.map((it, idx) => ({
          itemNum: `0${idx + 1}`,
          cant: Number(it.cantidad) || 1,
          descripcion: `${it.nombreEquipo}${it.numeroSerie ? ` (Serie: ${it.numeroSerie})` : ''}`,
          horas: (it.horometroInicial || 0).toString(),
          combustible: it.combustible || 'N/A'
        }))
      };

      const res = await createDespacho({
        contratoId: contract.id,
        operadorNombre: operadorNombre.trim() || entregadoPor,
        vehiculoEnvio,
        comentarios: observacionesActa.trim() || undefined,
        actaEntregaData: actaData,
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

      onSuccess({ despacho: res, actaData });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar la orden de despacho');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (itemForms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border border-[#E5E8EE] rounded-3xl p-8 text-center space-y-4 shadow-sm animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
          <Check className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-[#1B1D22]">
          Contrato Totalmente Despachado
        </h3>
        <p className="text-xs text-[#747780] max-w-md mx-auto">
          Todos los equipos del contrato <strong>{contract.codigo}</strong> ya han sido despachados y entregados físicamente. No hay unidades pendientes de salida.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-precision-primary text-xs py-2 px-6 cursor-pointer"
          >
            Volver a Operaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full max-w-5xl mx-auto pb-16">
      
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
              Configuración de Salida y Acta de Entrega Oficial
            </h2>
            <p className="text-xs text-[#747780] font-medium">
              Cliente: <span className="font-bold text-[#1B1D22]">{contract.cliente?.nombre}</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-[#E8F0FE] text-[#1A73E8] px-4 py-2 rounded-xl border border-[#1A73E8]/20">
          <Truck className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Despacho Oficial</span>
        </div>
      </div>

      {/* Formulario Principal de Pantalla Completa */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E8EE] rounded-3xl p-8 shadow-xs space-y-8">
        
        {error && (
          <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. SECCIÓN: DATOS DE EMISIÓN DEL ACTA OFICIAL Y LOGÍSTICA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
            <h3 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1A73E8]" />
              1. Datos de Emisión del Acta Oficial de Entrega
            </h3>
            <span className="text-[11px] text-[#747780] font-semibold">
              Configura los datos del acta aquí. Tras despachar, pasarás directamente a imprimir sin pasos intermedios.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAFC] p-5 rounded-2xl border border-[#E5E8EE]">
            
            {/* Fecha y Hora de Entrega */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                  Fecha de Entrega *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="precision-input text-xs font-bold font-mono pl-8"
                    required
                  />
                  <Calendar className="w-3.5 h-3.5 text-[#747780] absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                  Hora de Entrega *
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={horaEntrega}
                      onChange={(e) => setHoraEntrega(e.target.value)}
                      placeholder="08:00"
                      className="precision-input text-xs font-bold font-mono pl-8"
                      required
                    />
                    <Clock className="w-3.5 h-3.5 text-[#747780] absolute left-2.5 top-2.5" />
                  </div>
                  <div className="inline-flex rounded-lg p-0.5 bg-[#E5E8EE] text-[10px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setAmpmEntrega('AM')}
                      className={`px-2 py-1 rounded font-black transition-all ${
                        ampmEntrega === 'AM' ? 'bg-white text-[#1B1D22] shadow-xs' : 'text-[#747780]'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmpmEntrega('PM')}
                      className={`px-2 py-1 rounded font-black transition-all ${
                        ampmEntrega === 'PM' ? 'bg-white text-[#1B1D22] shadow-xs' : 'text-[#747780]'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Entregado Por */}
            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                Entregado Por (Firma Almacén / Empresa) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={entregadoPor}
                  onChange={(e) => setEntregadoPor(e.target.value)}
                  placeholder="BM Construcciones / Almacén"
                  className="precision-input text-xs font-bold uppercase pl-8"
                  required
                />
                <Building className="w-3.5 h-3.5 text-[#747780] absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Recibido Por */}
            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                Recibido Por (Nombre del Cliente o Receptor en Obra) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recibidoPor}
                  onChange={(e) => setRecibidoPor(e.target.value)}
                  placeholder="Nombre de la persona o empresa receptora"
                  className="precision-input text-xs font-bold uppercase pl-8"
                  required
                />
                <User className="w-3.5 h-3.5 text-[#747780] absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Cédula / RUC */}
            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                Cédula de Identidad / RUC del Receptor
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="RUC o Cédula oficial"
                className="precision-input text-xs font-mono font-bold"
              />
            </div>

            {/* Vehículo de Envío */}
            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                Vehículo de Envío / Placa
              </label>
              <input
                type="text"
                value={vehiculoEnvio}
                onChange={(e) => setVehiculoEnvio(e.target.value)}
                placeholder="Ej. Camión Freightliner M2 (Placa M 245-891) o Retiro en Patio"
                className="precision-input text-xs font-medium"
              />
            </div>

            {/* Conductor / Operador Responsable */}
            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                Conductor / Operador de Entrega
              </label>
              <input
                type="text"
                value={operadorNombre}
                onChange={(e) => setOperadorNombre(e.target.value)}
                placeholder="Ej. Juan Pérez (Logística)"
                className="precision-input text-xs font-medium"
              />
            </div>

            {/* Observaciones Generales del Acta */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-extrabold text-[#747780] uppercase tracking-wider block mb-1">
                Observaciones Generales del Acta de Entrega
              </label>
              <textarea
                rows={2}
                value={observacionesActa}
                onChange={(e) => setObservacionesActa(e.target.value)}
                placeholder="Observaciones de recepción y condiciones de entrega física..."
                className="precision-input text-xs font-medium resize-none"
              />
            </div>

          </div>
        </div>

        {/* 2. SECCIÓN: EQUIPOS A DESPACHAR, HORÓMETROS E INDICADORES DE COMBUSTIBLE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
            <h3 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1A73E8]" />
              2. Equipos Contratados, Horómetros e Indicadores de Combustible
            </h3>
            <span className="text-[11px] text-[#747780] font-semibold">
              El tipo de indicador de combustible proviene automáticamente de Inventario.
            </span>
          </div>

          <div className="space-y-4">
            {itemForms.map((item, idx) => (
              <div key={idx} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4">
                
                {/* Banner de Item */}
                <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      item.tipoControl === 'SERIALIZADO' ? 'bg-[#1A73E8]/10 text-[#1A73E8]' : 'bg-[#C55500]/10 text-[#C55500]'
                    }`}>
                      {item.tipoControl === 'SERIALIZADO' ? 'Maquinaria Serializada' : 'Control por Cantidad'}
                    </span>
                    <h4 className="font-extrabold text-[#1B1D22] text-sm uppercase">{item.nombreEquipo}</h4>
                  </div>

                  <span className="text-xs font-black font-mono text-[#37474F]">
                    {item.cantidadYaDespachada > 0 ? (
                      <>
                        A Despachar: <span className="text-[#1A73E8] font-bold">{item.cantidad} u.</span>
                        <span className="text-[10px] text-[#747780] font-medium ml-1 font-sans">
                          ({item.cantidadYaDespachada} entregadas previas de {item.cantidadTotal})
                        </span>
                      </>
                    ) : (
                      <>Cantidad: {item.cantidad} u.</>
                    )}
                  </span>
                </div>

                {item.tipoControl === 'SERIALIZADO' ? (
                  <div className="space-y-4">
                    
                    {/* Fila de Serial, Horómetro e Indicador de Combustible */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
                      
                      {/* Número de Serie */}
                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Número de Serie Asignado *
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

                      {/* Horómetro Inicial (Diferenciado claramente del combustible) */}
                      <div>
                        <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                          Horómetro de Salida (Horas) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={item.horometroInicial}
                            onChange={(e) => handleItemChange(idx, 'horometroInicial', e.target.value)}
                            className="precision-input text-xs font-mono font-black pl-8 text-[#1B1D22]"
                            required
                          />
                          <Gauge className="w-4 h-4 text-[#1A73E8] absolute left-2.5 top-2.5" />
                        </div>
                        <span className="text-[9px] text-[#747780] font-bold block mt-1">
                          Lectura digital del horómetro en horas de uso.
                        </span>
                      </div>

                      {/* Nivel de Combustible con Selector Inteligente según Tipo de Medición */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-extrabold text-[#747780] uppercase">
                            Lectura de Combustible ⛽ *
                          </label>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                            item.tipoMedicionCombustible === 'BARRAS'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.tipoMedicionCombustible === 'PULGADAS'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : item.tipoMedicionCombustible === 'PORCENTAJE'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {item.tipoMedicionCombustible === 'BARRAS' && 'Panel: Barras'}
                            {item.tipoMedicionCombustible === 'PULGADAS' && 'Regla: Pulgadas'}
                            {item.tipoMedicionCombustible === 'PORCENTAJE' && 'Porcentaje %'}
                            {!item.tipoMedicionCombustible && 'Eléctrico / Manual (N/A)'}
                          </span>
                        </div>

                        {item.tipoMedicionCombustible ? (
                          <div className="space-y-1.5">
                            <select
                              value={item.combustible}
                              onChange={(e) => handleItemChange(idx, 'combustible', e.target.value)}
                              className="precision-input text-xs font-mono font-black cursor-pointer bg-white text-[#C55500]"
                              required
                            >
                              <option value="">-- Seleccionar lectura de panel/tanque --</option>
                              {FUEL_PRESETS[item.tipoMedicionCombustible as keyof typeof FUEL_PRESETS]?.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                              {item.combustible && !FUEL_PRESETS[item.tipoMedicionCombustible as keyof typeof FUEL_PRESETS]?.includes(item.combustible) && (
                                <option value={item.combustible}>{item.combustible}</option>
                              )}
                            </select>
                          </div>
                        ) : (
                          <input
                            type="text"
                            readOnly
                            value="N/A (No Aplica - Eléctrico/Manual)"
                            className="precision-input text-xs font-bold bg-[#F4F6F9] text-[#747780] cursor-not-allowed"
                          />
                        )}
                        
                        <span className="text-[9px] text-[#747780] font-bold block mt-1">
                          {item.tipoMedicionCombustible === 'BARRAS' && 'Mapeo: Backhoe, Minicargador, Rodo 3TM.'}
                          {item.tipoMedicionCombustible === 'PORCENTAJE' && 'Mapeo: Generadores Grandes, Compresores.'}
                          {item.tipoMedicionCombustible === 'PULGADAS' && 'Mapeo: Compactadoras, Torres, Rodos Menores, Generadores Pequeños.'}
                          {!item.tipoMedicionCombustible && 'Equipo sin motor de combustión interna.'}
                        </span>
                      </div>

                    </div>

                    {/* Checklist Técnico de Entregabilidad */}
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
            className="btn-precision-primary text-xs py-3 px-8 cursor-pointer font-black tracking-wide shadow-md flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Generando Salida y Preparando Acta...</span>
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
