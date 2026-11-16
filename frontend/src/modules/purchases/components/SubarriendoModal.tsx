import React, { useState, useEffect, useMemo } from 'react';
import { X, Truck, AlertTriangle, Search, PlusCircle } from 'lucide-react';
import type { Provider } from '../../providers/types/provider.types';
import type {
  EquipoExternoInventario,
  ModalidadSubarriendoProveedor,
} from '../types/purchases.types';
import { createSubarriendo } from '../services/purchases.api';
import { getCategories, getBrands } from '../../inventory/services/inventory.api';
import { numberingApi } from '../../numbering/services/numbering.api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface SubarriendoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  equipos: EquipoExternoInventario[];
  providers: Provider[];
  initialEquipo?: EquipoExternoInventario | null;
}

export const SubarriendoModal: React.FC<SubarriendoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  equipos,
  providers,
  initialEquipo,
}) => {
  const [modoEquipo, setModoEquipo] = useState<'EXISTENTE' | 'NUEVO'>('EXISTENTE');
  const [equipoSearch, setEquipoSearch] = useState('');
  const [equipoId, setEquipoId] = useState('');

  // Campos para registrar nueva máquina de proveedor directo al Inventario
  const [nuevoModelo, setNuevoModelo] = useState('');
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoSerie, setNuevoSerie] = useState('');
  const [nuevoCategoriaId, setNuevoCategoriaId] = useState('');
  const [nuevoMarcaId, setNuevoMarcaId] = useState('');
  const [nuevoSucursalId, setNuevoSucursalId] = useState('');
  const [nuevoPrecioRentaDia, setNuevoPrecioRentaDia] = useState('');
  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string }>>([]);
  const [marcas, setMarcas] = useState<Array<{ id: string; nombre: string }>>([]);
  const [sucursales, setSucursales] = useState<Array<{ id: string; nombre: string }>>([]);

  const [proveedorId, setProveedorId] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadSubarriendoProveedor>('POR_DIA');
  const [tarifaProveedor, setTarifaProveedor] = useState('');
  const [cantidadUnidades, setCantidadUnidades] = useState('1');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [fechaFinEstimada, setFechaFinEstimada] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [duracionManual, setDuracionManual] = useState('');
  const [referenciaDocumento, setReferenciaDocumento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    Promise.allSettled([getCategories(), getBrands(), numberingApi.getSucursales()]).then(
      ([catRes, marRes, sucRes]) => {
        if (!active) return;
        if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
          setCategorias(catRes.value);
          if (catRes.value[0]) setNuevoCategoriaId((prev) => prev || catRes.value[0].id);
        }
        if (marRes.status === 'fulfilled' && Array.isArray(marRes.value)) {
          setMarcas(marRes.value);
          if (marRes.value[0]) setNuevoMarcaId((prev) => prev || marRes.value[0].id);
        }
        if (sucRes.status === 'fulfilled' && Array.isArray(sucRes.value)) {
          setSucursales(sucRes.value);
          if (sucRes.value[0]) setNuevoSucursalId((prev) => prev || sucRes.value[0].id);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const targetEq = initialEquipo || equipos[0] || null;
      setModoEquipo(targetEq ? 'EXISTENTE' : 'NUEVO');
      setEquipoSearch('');
      setEquipoId(targetEq?.id || '');

      setNuevoModelo('');
      setNuevoCodigo('');
      setNuevoSerie('');
      setNuevoPrecioRentaDia('');

      const provId = targetEq?.proveedorId || targetEq?.proveedor?.id || providers[0]?.id || '';
      setProveedorId(provId);
      setProveedorNombre(
        targetEq?.proveedor?.nombre ||
          targetEq?.proveedorNombre ||
          providers.find((p) => p.id === provId)?.nombre ||
          '',
      );
      setModalidad('POR_DIA');
      setTarifaProveedor(
        targetEq?.precioProveedor != null ? String(Number(targetEq.precioProveedor)) : '',
      );
      setCantidadUnidades('1');
      const hoy = new Date().toISOString().slice(0, 10);
      const fin = new Date();
      fin.setDate(fin.getDate() + 7);
      setFechaInicio(hoy);
      setFechaFinEstimada(fin.toISOString().slice(0, 10));
      setDuracionManual('');
      setReferenciaDocumento('');
      setObservaciones('');
      setError(null);
    }
  }, [isOpen, initialEquipo, equipos, providers]);

  const equiposFiltrados = useMemo(() => {
    const q = equipoSearch.trim().toLowerCase();
    const list = !q
      ? equipos
      : equipos.filter(
          (eq) =>
            eq.modelo.toLowerCase().includes(q) ||
            (eq.codigo && eq.codigo.toLowerCase().includes(q)) ||
            (eq.numeroSerie && eq.numeroSerie.toLowerCase().includes(q)) ||
            (eq.proveedorNombre && eq.proveedorNombre.toLowerCase().includes(q)),
        );
    return {
      deProveedor: list.filter((e) => e.origenEquipo === 'PROVEEDOR' || Boolean(e.proveedorId)),
      deInventario: list.filter((e) => e.origenEquipo !== 'PROVEEDOR' && !e.proveedorId),
    };
  }, [equipos, equipoSearch]);

  const montoEstimadoPreview = useMemo(() => {
    const tarifa = Number(tarifaProveedor) || 0;
    const unidades = Math.max(1, Number(cantidadUnidades) || 1);
    if (modalidad === 'MONTO_FIJO') {
      return Math.round(tarifa * unidades * 100) / 100;
    }
    let dur = Number(duracionManual) || 0;
    if (!dur && fechaInicio && fechaFinEstimada) {
      const d1 = new Date(fechaInicio).getTime();
      const d2 = new Date(fechaFinEstimada).getTime();
      const dias = Math.max(1, Math.ceil(Math.max(0, d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      if (modalidad === 'POR_MES') dur = Math.max(1, Math.round((dias / 30) * 100) / 100);
      else if (modalidad === 'POR_HORA') dur = dias * 8;
      else dur = dias;
    }
    return Math.round(tarifa * dur * unidades * 100) / 100;
  }, [tarifaProveedor, cantidadUnidades, modalidad, duracionManual, fechaInicio, fechaFinEstimada]);

  if (!isOpen) return null;

  const handleEquipoChange = (id: string) => {
    setEquipoId(id);
    const eq = equipos.find((x) => x.id === id);
    if (eq) {
      if (eq.proveedorId) setProveedorId(eq.proveedorId);
      if (eq.proveedor?.nombre || eq.proveedorNombre) {
        setProveedorNombre(eq.proveedor?.nombre || eq.proveedorNombre || '');
      }
      if (eq.precioProveedor != null) {
        setTarifaProveedor(String(Number(eq.precioProveedor)));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoEquipo === 'EXISTENTE' && !equipoId) {
      setError('Selecciona el equipo de inventario o cambia a "+ Registrar máquina nueva".');
      return;
    }
    if (modoEquipo === 'NUEVO' && !nuevoModelo.trim()) {
      setError('Indica el modelo o descripción de la maquinaria nueva.');
      return;
    }
    if (!proveedorId && !proveedorNombre.trim()) {
      setError('Indica el proveedor que presta o subarrienda la maquinaria.');
      return;
    }
    if (!tarifaProveedor || Number(tarifaProveedor) < 0) {
      setError('Indica la tarifa pactada con el proveedor.');
      return;
    }
    if (fechaFinEstimada < fechaInicio) {
      setError('La fecha fin estimada no puede ser menor a la fecha de inicio.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createSubarriendo({
        ...(modoEquipo === 'EXISTENTE'
          ? { equipoId }
          : {
              nuevoEquipo: {
                modelo: nuevoModelo.trim(),
                codigo: nuevoCodigo.trim() || undefined,
                numeroSerie: nuevoSerie.trim() || undefined,
                categoriaId: nuevoCategoriaId || undefined,
                marcaId: nuevoMarcaId || undefined,
                sucursalId: nuevoSucursalId || undefined,
                precioRentaDia: nuevoPrecioRentaDia ? Number(nuevoPrecioRentaDia) : undefined,
              },
            }),
        proveedorId: proveedorId || undefined,
        proveedorNombre: proveedorNombre.trim() || undefined,
        modalidad,
        tarifaProveedor: Number(tarifaProveedor),
        cantidadUnidades: Number(cantidadUnidades) || 1,
        fechaInicio,
        fechaFinEstimada,
        duracionEstimadaValor: duracionManual ? Number(duracionManual) : undefined,
        referenciaDocumento: referenciaDocumento.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar el período con proveedor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5E8EE] overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E8EE] bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C55500] text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1B1D22]">
                Registrar Período de Maquinaria Externa (Proveedor)
              </h2>
              <p className="text-xs text-[#747780]">
                Elige un equipo de Inventario o registra una máquina nueva prestada/subarrendada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
          {/* Selector de origen del equipo */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F6F9] rounded-xl border border-[#E5E8EE]">
            <button
              type="button"
              onClick={() => setModoEquipo('EXISTENTE')}
              className={`py-2 px-3 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modoEquipo === 'EXISTENTE'
                  ? 'bg-white text-[#C55500] shadow-xs border border-[#E5E8EE]'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Elegir del Inventario ({equipos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setModoEquipo('NUEVO')}
              className={`py-2 px-3 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modoEquipo === 'NUEVO'
                  ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Registrar Máquina Nueva</span>
            </button>
          </div>

          {modoEquipo === 'EXISTENTE' ? (
            <div className="space-y-2 p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE]">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-[#1B1D22]">
                  Equipo en Inventario <span className="text-red-500">*</span>
                </label>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={equipoSearch}
                    onChange={(e) => setEquipoSearch(e.target.value)}
                    placeholder="Filtrar código / modelo..."
                    className="w-full pl-8 pr-2.5 py-1 text-[11px] bg-white border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>
              <select
                value={equipoId}
                onChange={(e) => handleEquipoChange(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-semibold"
                required
              >
                {equiposFiltrados.deProveedor.length === 0 &&
                equiposFiltrados.deInventario.length === 0 ? (
                  <option value="">No hay equipos coincidentes (usa "+ Registrar Máquina Nueva")</option>
                ) : (
                  <>
                    {equiposFiltrados.deProveedor.length > 0 && (
                      <optgroup label="Ya clasificados como De Proveedor">
                        {equiposFiltrados.deProveedor.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.codigo ? `[${eq.codigo}] ` : ''}
                            {eq.modelo} {eq.numeroSerie ? `(S/N: ${eq.numeroSerie})` : ''} —{' '}
                            {eq.proveedor?.nombre || eq.proveedorNombre || 'Proveedor externo'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {equiposFiltrados.deInventario.length > 0 && (
                      <optgroup label="Equipos del Inventario (se clasificarán como De Proveedor)">
                        {equiposFiltrados.deInventario.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.codigo ? `[${eq.codigo}] ` : ''}
                            {eq.modelo} {eq.numeroSerie ? `(S/N: ${eq.numeroSerie})` : ''} · {eq.estado}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
              <p className="text-[10px] text-[#747780]">
                Al guardar, el equipo quedará marcado automáticamente como <strong>De Proveedor</strong> y <strong>Disponible para rentar</strong> en Inventario.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#1B1D22] mb-1">
                  Modelo / Nombre de la Maquinaria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nuevoModelo}
                  onChange={(e) => setNuevoModelo(e.target.value)}
                  placeholder="Ej. Excavadora CAT 320D / Vibrocompactadora"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1B1D22] mb-1">Código Interno</label>
                <input
                  type="text"
                  value={nuevoCodigo}
                  onChange={(e) => setNuevoCodigo(e.target.value)}
                  placeholder="Ej. EXT-01"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1B1D22] mb-1">Número de Serie</label>
                <input
                  type="text"
                  value={nuevoSerie}
                  onChange={(e) => setNuevoSerie(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1B1D22] mb-1">Categoría</label>
                <select
                  value={nuevoCategoriaId}
                  onChange={(e) => setNuevoCategoriaId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1B1D22] mb-1">Marca</label>
                <select
                  value={nuevoMarcaId}
                  onChange={(e) => setNuevoMarcaId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
                >
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1B1D22] mb-1">Sucursal</label>
                <select
                  value={nuevoSucursalId}
                  onChange={(e) => setNuevoSucursalId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1B1D22] mb-1">
                  Tarifa Renta al Cliente (C$ / día)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoPrecioRentaDia}
                  onChange={(e) => setNuevoPrecioRentaDia(e.target.value)}
                  placeholder="Si se omite usa la tarifa proveedor"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <select
                value={proveedorId}
                onChange={(e) => {
                  const id = e.target.value;
                  setProveedorId(id);
                  const found = providers.find((p) => p.id === id);
                  if (found) setProveedorNombre(found.nombre);
                }}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
              >
                <option value="">-- Nombre manual --</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {!proveedorId && (
                <input
                  type="text"
                  placeholder="Nombre del proveedor"
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                  className="mt-1.5 w-full px-3 py-1.5 border border-zinc-300 rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">
                Modalidad de Cobro del Proveedor
              </label>
              <select
                value={modalidad}
                onChange={(e) =>
                  setModalidad(e.target.value as ModalidadSubarriendoProveedor)
                }
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
              >
                <option value="POR_DIA">Por Día</option>
                <option value="POR_HORA">Por Hora</option>
                <option value="POR_MES">Por Mes</option>
                <option value="MONTO_FIJO">Monto Fijo del Período</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">
                Tarifa del Proveedor (C$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tarifaProveedor}
                onChange={(e) => setTarifaProveedor(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">
                Duración Estimada ({modalidad === 'POR_HORA' ? 'horas' : modalidad === 'POR_MES' ? 'meses' : 'días / opcional'})
              </label>
              <input
                type="number"
                step="0.5"
                min="0.01"
                value={duracionManual}
                onChange={(e) => setDuracionManual(e.target.value)}
                placeholder="Se calcula automático según fechas"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">
                Fecha Fin / Devolución Estimada <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaFinEstimada}
                onChange={(e) => setFechaFinEstimada(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">
                Contrato / Remisión del Proveedor
              </label>
              <input
                type="text"
                placeholder="Ej. REM-PROV-401"
                value={referenciaDocumento}
                onChange={(e) => setReferenciaDocumento(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1B1D22] mb-1">Cantidad Unidades</label>
              <input
                type="number"
                min="1"
                value={cantidadUnidades}
                onChange={(e) => setCantidadUnidades(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1B1D22] mb-1">Observaciones</label>
            <input
              type="text"
              placeholder="Notas sobre condiciones de entrega, combustible, devolución..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl"
            />
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between font-mono">
            <span className="text-amber-900 font-bold">Costo Estimado del Período al Proveedor:</span>
            <span className="text-base font-black text-amber-950">
              {formatCurrency(montoEstimadoPreview)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E8EE]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 font-black text-white bg-[#C55500] hover:bg-[#A64700] rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar Período y Habilitar en Inventario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
