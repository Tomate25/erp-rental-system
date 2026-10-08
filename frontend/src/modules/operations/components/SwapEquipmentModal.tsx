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
  Search,
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
  const [equipoActualBackend, setEquipoActualBackend] = useState<any | null>(null);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [tabFiltro, setTabFiltro] = useState<'TODOS' | 'DIRECTO' | 'CATEGORIA'>('TODOS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Equipo saliente seleccionado actualmente desde el contrato
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
        setEquipoActualBackend(data.equipoActual || null);
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

  const eqSaliente = equipoActualBackend || equipoActualDetalle?.equipo;
  const eqNuevoSeleccionado = reemplazos.find((r) => r.id === selectedEquipoNuevoId);

  // Filtro dinámico de equipos reemplazantes
  const reemplazosFiltrados = reemplazos.filter((eq) => {
    const texto = filtroBusqueda.trim().toLowerCase();
    const matchesTexto =
      !texto ||
      [eq.codigo, eq.modelo, eq.numeroSerie, eq.marca?.nombre, eq.categoria?.nombre, eq.descripcion]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(texto));

    if (!matchesTexto) return false;
    if (tabFiltro === 'DIRECTO') return eq.esReemplazoDirecto;
    if (tabFiltro === 'CATEGORIA') return eq.mismaCategoria && !eq.esReemplazoDirecto;
    return true;
  });

  const countDirectos = reemplazos.filter((r) => r.esReemplazoDirecto).length;
  const countMismaCat = reemplazos.filter((r) => r.mismaCategoria && !r.esReemplazoDirecto).length;

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
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E5E8EE] my-8 overflow-hidden animate-fadeIn">
        
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
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
                El equipo dañado pasará automáticamente a taller (<strong>EN MANTENIMIENTO</strong>) con orden de trabajo correctivo sin costo para el cliente. El equipo sustituto se vinculará al contrato con sus tarifas pactadas y se emitirá el acta oficial de sustitución.
              </p>
            </div>
          </div>

          {/* PASO 1: SELECCIÓN DEL EQUIPO AVERIADO (SALIENTE) */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#C55500] tracking-wider">
                <Wrench className="w-4 h-4" />
                <span>Paso 1: Equipo averiado que se retira</span>
              </div>
              <span className="text-[10px] font-extrabold text-[#747780]">
                Retiro a Taller (Costo $0)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Equipo en Contrato a Sustituir *
                </label>
                <select
                  value={selectedEquipoActualId}
                  onChange={(e) => setSelectedEquipoActualId(e.target.value)}
                  className="precision-input text-xs font-bold"
                  required
                >
                  {contract.items?.map((it) => (
                    <option key={it.equipoId} value={it.equipoId}>
                      {it.equipo?.codigo ? `[${it.equipo.codigo}] ` : ''}
                      {it.equipo?.modelo || 'Equipo'}
                      {it.equipo?.numeroSerie ? ` (S/N: ${it.equipo.numeroSerie})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Horómetro Final de Retiro {eqSaliente?.tieneHorometro ? '*' : '(Opcional)'}
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
                  {eqSaliente?.tieneHorometro
                    ? 'Lectura física del horómetro al momento del retiro en obra.'
                    : 'Equipo sin motor o estructural: horómetro no exigido.'}
                </span>
              </div>
            </div>

            {/* Ficha Técnica Detallada del Equipo Averiado */}
            {eqSaliente && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-300">
                      {eqSaliente.codigo || 'SIN CÓDIGO'}
                    </span>
                    <h4 className="font-black text-sm text-[#1B1D22]">
                      {eqSaliente.marca?.nombre ? `${eqSaliente.marca.nombre} ` : ''}
                      {eqSaliente.modelo}
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 font-sans">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    Equipo Averiado
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-[#747780] font-extrabold uppercase block">Categoría</span>
                    <span className="font-bold text-[#1B1D22] text-[11px] truncate block mt-0.5">
                      {eqSaliente.categoria?.nombre || 'General'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-[#747780] font-extrabold uppercase block">Número de Serie</span>
                    <span className="font-mono font-bold text-[#1B1D22] text-[11px] truncate block mt-0.5">
                      {eqSaliente.numeroSerie || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-[#747780] font-extrabold uppercase block">Tipo de Control</span>
                    <span className="font-bold text-[#1B1D22] text-[11px] truncate block mt-0.5">
                      {eqSaliente.tipoControl || 'SERIALIZADO'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-[#747780] font-extrabold uppercase block">Horómetro Base</span>
                    <span className="font-mono font-black text-[#1A73E8] text-[11px] block mt-0.5">
                      {eqSaliente.tieneHorometro ? `${eqSaliente.horometro || 0} hrs` : 'Sin motor'}
                    </span>
                  </div>
                </div>

                {eqSaliente.descripcion && (
                  <p className="text-[11px] text-[#5F6368] italic border-t border-gray-100 pt-2">
                    {eqSaliente.descripcion}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                Motivo de la avería o falla técnica *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Falla en bomba de combustible detectada al encender en obra. Fuga de aceite hidráulico en cilindro principal."
                rows={2}
                className="precision-input text-xs"
                required
              />
            </div>
          </div>

          {/* PASO 2: SELECCIÓN DEL EQUIPO SUSTITUTO (ENTRANTE) */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E8EE] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#1A73E8] tracking-wider">
                <Truck className="w-4 h-4" />
                <span>Paso 2: Equipo sustituto disponible en almacén</span>
              </div>
              <span className="text-[10px] font-extrabold text-[#747780]">
                {reemplazos.length} disponible(s) en almacén
              </span>
            </div>

            {/* Barra de Búsqueda y Pestañas de Filtrado */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#747780] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  placeholder="Buscar por código (ej. 08-04), modelo, serie o marca..."
                  className="precision-input text-xs pl-9 py-1.5"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E5E8EE] text-[10px] font-bold shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setTabFiltro('TODOS')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    tabFiltro === 'TODOS'
                      ? 'bg-[#1A73E8] text-white shadow-xs'
                      : 'text-[#747780] hover:text-[#1B1D22]'
                  }`}
                >
                  Todos ({reemplazos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTabFiltro('DIRECTO')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    tabFiltro === 'DIRECTO'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#747780] hover:text-emerald-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Directos ({countDirectos})
                </button>
                <button
                  type="button"
                  onClick={() => setTabFiltro('CATEGORIA')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    tabFiltro === 'CATEGORIA'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[#747780] hover:text-blue-700'
                  }`}
                >
                  Categoría ({countMismaCat})
                </button>
              </div>
            </div>

            {isLoadingReplacements ? (
              <div className="py-8 text-center text-xs font-bold text-[#747780]">
                Consultando inventario disponible en tiempo real...
              </div>
            ) : reemplazos.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium">
                No hay unidades disponibles en almacén en este momento para reemplazar este equipo.
              </div>
            ) : reemplazosFiltrados.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-[#747780] text-xs font-medium text-center">
                No se encontraron equipos que coincidan con la búsqueda "{filtroBusqueda}".
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {reemplazosFiltrados.map((eq) => {
                  const isSelected = selectedEquipoNuevoId === eq.id;
                  return (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedEquipoNuevoId(eq.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-blue-50/70 border-2 border-[#1A73E8] shadow-md ring-2 ring-[#1A73E8]/10'
                          : 'bg-white border-[#E5E8EE] hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <input
                            type="radio"
                            name="equipoNuevoRadio"
                            checked={isSelected}
                            onChange={() => setSelectedEquipoNuevoId(eq.id)}
                            className="w-4 h-4 text-[#1A73E8] cursor-pointer mt-1"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] font-black bg-blue-100 text-[#1A73E8] px-2 py-0.5 rounded-md border border-blue-200">
                                {eq.codigo || 'SIN CÓDIGO'}
                              </span>
                              <h4 className="font-black text-xs text-[#1B1D22] uppercase truncate">
                                {eq.marca?.nombre ? `${eq.marca.nombre} ` : ''}
                                {eq.modelo}
                              </h4>
                              {eq.esReemplazoDirecto && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-sans">
                                  <Sparkles className="w-3 h-3" /> Reemplazo Directo
                                </span>
                              )}
                              {eq.mismaCategoria && !eq.esReemplazoDirecto && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200 font-sans">
                                  Misma Categoría
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-[#747780] flex flex-wrap items-center gap-3 mt-1.5 font-medium">
                              <span className="font-mono"><strong>S/N:</strong> {eq.numeroSerie || 'N/A'}</span>
                              <span><strong>Categoría:</strong> {eq.categoria?.nombre || 'General'}</span>
                              {eq.subcategoria?.nombre && (
                                <span><strong>Subcategoría:</strong> {eq.subcategoria.nombre}</span>
                              )}
                              {eq.tieneHorometro && (
                                <span className="font-mono text-emerald-700 font-bold">
                                  <Gauge className="w-3 h-3 inline mr-1" />
                                  {eq.horometro || 0} hrs
                                </span>
                              )}
                            </div>

                            {eq.descripcion && (
                              <p className="text-[10px] text-[#5F6368] italic mt-1 line-clamp-1">
                                {eq.descripcion}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Disponible
                          </span>
                          <span className="text-[9px] text-[#747780] font-mono block mt-1">
                            Stock: {eq.cantidadDisponible} un.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comparativa Visual Lado a Lado del Intercambio */}
          {eqSaliente && eqNuevoSeleccionado && (
            <div className="p-4 bg-gradient-to-r from-amber-50/80 via-white to-blue-50/80 border-2 border-[#1A73E8]/30 rounded-2xl shadow-xs space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#1B1D22] flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-[#1A73E8]" /> Resumen de Sustitución en Caliente
                </span>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-sans">
                  Sin cargo al cliente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-red-800 block">
                    🔴 Equipo que Sale (Averiado a Taller):
                  </span>
                  <p className="font-extrabold text-[#1B1D22] text-xs">
                    [{eqSaliente.codigo || 'S/C'}] {eqSaliente.marca?.nombre ? `${eqSaliente.marca.nombre} ` : ''}{eqSaliente.modelo}
                  </p>
                  <span className="text-[10px] text-[#747780] font-mono block">
                    S/N: {eqSaliente.numeroSerie || 'N/A'} · Horómetro Retiro: {horometroFinal || eqSaliente.horometro || 0} hrs
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block">
                    🟢 Equipo que Entra (Sustituto a Obra):
                  </span>
                  <p className="font-extrabold text-[#1B1D22] text-xs">
                    [{eqNuevoSeleccionado.codigo || 'S/C'}] {eqNuevoSeleccionado.marca?.nombre ? `${eqNuevoSeleccionado.marca.nombre} ` : ''}{eqNuevoSeleccionado.modelo}
                  </p>
                  <span className="text-[10px] text-[#747780] font-mono block">
                    S/N: {eqNuevoSeleccionado.numeroSerie || 'N/A'} · Horómetro Inicial: {eqNuevoSeleccionado.horometro || 0} hrs
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: LOGÍSTICA DE ENTREGA Y ACTA */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-5 space-y-4">
            <div className="text-xs font-black uppercase text-[#37474F] tracking-wider border-b border-[#E5E8EE] pb-2">
              Paso 3: Acta de Sustitución y Datos de Entrega
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Entregado por (Almacén / Logística) *
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
                  Recibido en obra por (Cliente / Encargado) *
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
