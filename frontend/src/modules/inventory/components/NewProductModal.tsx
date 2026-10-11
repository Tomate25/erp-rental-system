import React, { useState, useEffect, useId } from 'react';
import type { GroupedProduct } from '../types/grouped-inventory.types';
import type { Category, Brand } from '../types/inventory.types';
import {
  findSimilarProducts,
  suggestNextEquipmentCode,
  isSerialNumberDuplicate,
  type SimilarProductMatch,
} from '../utils/inventory-similarity';
import {
  X,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export interface NewProductSubmitPayload {
  tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD';
  nombre: string;
  categoriaId: string;
  marcaId: string;
  sucursalId: string;
  tarifa: 'HORA' | 'DIA';
  precioRentaDia: number;
  precioDiaB?: number | null;
  precioDiaC?: number | null;
  precioRentaHora?: number;
  precioHoraB?: number | null;
  precioHoraC?: number | null;
  // Si es serializado:
  codigo: string;
  numeroSerie?: string;
  modelo?: string;
  // Si es por cantidad:
  cantidadInicial?: number;
}

interface NewProductModalProps {
  existingProducts: GroupedProduct[];
  existingCodes: string[];
  existingSerials: string[];
  categories: Category[];
  brands: Brand[];
  sucursales: Array<{ id: string; nombre: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: NewProductSubmitPayload) => Promise<void>;
  onSelectExistingProduct: (product: GroupedProduct) => void;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  existingProducts,
  existingCodes,
  existingSerials,
  categories,
  brands,
  sucursales,
  isOpen,
  onClose,
  onSubmit,
  onSelectExistingProduct,
}) => {
  const titleId = useId();
  const [tipoControl, setTipoControl] = useState<'SERIALIZADO' | 'POR_CANTIDAD'>('SERIALIZADO');
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState(categories[0]?.id || '');
  const [marcaId, setMarcaId] = useState(brands[0]?.id || '');
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id || '');
  const [tarifa, setTarifa] = useState<'HORA' | 'DIA'>('DIA');
  const [precioDia, setPrecioDia] = useState<number>(100);
  const [precioDiaB, setPrecioDiaB] = useState<string>('');
  const [precioDiaC, setPrecioDiaC] = useState<string>('');
  const [precioHora, setPrecioHora] = useState<number>(50);
  const [precioHoraB, setPrecioHoraB] = useState<string>('');
  const [precioHoraC, setPrecioHoraC] = useState<string>('');

  // Serializado
  const [codigo, setCodigo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [modelo, setModelo] = useState('');

  // Por cantidad
  const [cantidadInicial, setCantidadInicial] = useState<number>(100);

  // Errores y estado de envío
  const [serialError, setSerialError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Buscar similitudes en tiempo real con debounce
  const [similarMatches, setSimilarMatches] = useState<SimilarProductMatch[]>([]);

  useEffect(() => {
    if (!nombre.trim() || nombre.trim().length < 3) {
      setSimilarMatches([]);
      return;
    }

    const timer = setTimeout(() => {
      const matches = findSimilarProducts(
        nombre,
        existingProducts.map((p) => ({
          id: p.productoId,
          nombre: p.nombre,
          familia: p.familia,
          marca: p.marca,
        })),
        0.70
      );
      setSimilarMatches(matches);
    }, 200);

    return () => clearTimeout(timer);
  }, [nombre, existingProducts]);

  // Al abrir el modal, resetear campos y sugerir código
  useEffect(() => {
    if (isOpen) {
      setTipoControl('SERIALIZADO');
      setNombre('');
      setCategoriaId(categories[0]?.id || '');
      setMarcaId(brands[0]?.id || '');
      setSucursalId(sucursales[0]?.id || '');
      setTarifa('DIA');
      setPrecioDia(100);
      setPrecioDiaB('');
      setPrecioDiaC('');
      setPrecioHora(50);
      setPrecioHoraB('');
      setPrecioHoraC('');
      setModelo('');
      setNumeroSerie('');
      setCantidadInicial(100);
      setSerialError(null);
      setCodeError(null);
      setSubmitError(null);
      setSimilarMatches([]);

      const suggested = suggestNextEquipmentCode(existingCodes, '01');
      setCodigo(suggested);
    }
  }, [isOpen, existingCodes, categories, brands, sucursales]);

  // Validar cambio de serie
  const handleSerialChange = (val: string) => {
    setNumeroSerie(val);
    if (!val.trim()) {
      setSerialError('El número de serie es obligatorio.');
    } else if (isSerialNumberDuplicate(val, existingSerials)) {
      setSerialError(`La serie "${val}" ya se encuentra registrada en otro equipo.`);
    } else {
      setSerialError(null);
    }
  };

  // Validar cambio de código
  const handleCodeChange = (val: string) => {
    setCodigo(val);
    if (!val.trim()) {
      setCodeError('El código es obligatorio.');
    } else if (existingCodes.some((c) => c.toLowerCase() === val.trim().toLowerCase())) {
      setCodeError(`El código "${val}" ya está asignado.`);
    } else {
      setCodeError(null);
    }
  };

  const handleRedirectToExisting = (match: SimilarProductMatch) => {
    const existing = existingProducts.find((p) => p.productoId === match.id);
    if (existing) {
      onClose();
      onSelectExistingProduct(existing);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      setSubmitError('El nombre del producto es obligatorio.');
      return;
    }
    if (!codigo.trim()) {
      setCodeError('El código es obligatorio.');
      return;
    }
    if (tipoControl === 'SERIALIZADO') {
      if (!numeroSerie.trim()) {
        setSerialError('El número de serie es obligatorio.');
        return;
      }
      if (isSerialNumberDuplicate(numeroSerie, existingSerials)) {
        setSerialError(`La serie "${numeroSerie}" ya existe.`);
        return;
      }
    } else {
      if (cantidadInicial <= 0) {
        setSubmitError('La cantidad inicial debe ser mayor a 0.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        tipoControl,
        nombre: nombre.trim(),
        categoriaId,
        marcaId,
        sucursalId,
        tarifa,
        precioRentaDia: Number(precioDia),
        precioDiaB: precioDiaB !== '' ? Number(precioDiaB) : null,
        precioDiaC: precioDiaC !== '' ? Number(precioDiaC) : null,
        precioRentaHora: tarifa === 'HORA' ? Number(precioHora) : undefined,
        precioHoraB: precioHoraB !== '' ? Number(precioHoraB) : null,
        precioHoraC: precioHoraC !== '' ? Number(precioHoraC) : null,
        codigo: codigo.trim(),
        numeroSerie: tipoControl === 'SERIALIZADO' ? numeroSerie.trim() : undefined,
        modelo: modelo.trim() || nombre.trim(),
        cantidadInicial: tipoControl === 'POR_CANTIDAD' ? cantidadInicial : 1,
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Error al crear el nuevo producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp my-8 max-h-[92vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              Catálogo Maestro
            </span>
            <h3 id={titleId} className="text-base font-black text-slate-900 mt-1">
              + Registrar Nuevo Producto en Inventario
            </h3>
            <p className="text-xs text-slate-500">
              Crea la ficha del producto y su primera unidad o stock inicial preservando la integridad del catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Selector de Tipo de Control */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Clase de Producto / Control de Inventario
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoControl('SERIALIZADO')}
                className={`py-2.5 px-3 rounded-xl border text-left font-bold text-xs transition-all ${
                  tipoControl === 'SERIALIZADO'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Equipo con Serie</span>
                </div>
                <p className="text-[10px] font-normal text-slate-500 mt-1">
                  1 unidad única con número de serie (ej. Compactadora, Rodillo, Generador)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTipoControl('POR_CANTIDAD')}
                className={`py-2.5 px-3 rounded-xl border text-left font-bold text-xs transition-all ${
                  tipoControl === 'POR_CANTIDAD'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>Artículo por Cantidad</span>
                </div>
                <p className="text-[10px] font-normal text-slate-500 mt-1">
                  Material por lote o masa sin serie (ej. Cuñas, Andamios, Tablas, Placas)
                </p>
              </button>
            </div>
          </div>

          {/* Nombre del Producto con Detección Anti-Duplicados */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre Normalizado del Producto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Mezcladora 2 sacos CIPSA, Compactadora Masalta MS60..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />

            {/* Banner Anti-Duplicados */}
            {similarMatches.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Posible duplicado detectado: Ya existe un producto muy parecido</span>
                </div>
                {similarMatches.slice(0, 2).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-amber-200 text-xs"
                  >
                    <div>
                      <strong className="text-slate-800">{m.nombre}</strong>
                      <span className="text-[10px] text-amber-700 block">
                        {Math.round(m.similarity * 100)}% de coincidencia léxica · {m.familia || 'General'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRedirectToExisting(m)}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <span>Agregar a este grupo</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categoría, Marca y Sucursal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Familia / Categoría <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Marca <span className="text-rose-500">*</span>
              </label>
              <select
                value={marcaId}
                onChange={(e) => setMarcaId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sucursal <span className="text-rose-500">*</span>
              </label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarifa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Modalidad de Tarifa
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTarifa('DIA')}
                  className={`flex-1 py-1.5 px-2 rounded-xl border font-bold text-xs ${
                    tarifa === 'DIA'
                      ? 'bg-slate-200 border-slate-400 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Por día
                </button>
                <button
                  type="button"
                  onClick={() => setTarifa('HORA')}
                  className={`flex-1 py-1.5 px-2 rounded-xl border font-bold text-xs ${
                    tarifa === 'HORA'
                      ? 'bg-amber-100 border-amber-400 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Por hora
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tarifa A Día (C$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={precioDia}
                onChange={(e) => setPrecioDia(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                placeholder="≤ 8 días"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tarifa B Día (&gt;8d)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioDiaB}
                onChange={(e) => setPrecioDiaB(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-bold"
                placeholder="Opcional (> 8d)"
              />
            </div>
          </div>

          {/* Tarifas C Día y Tarifas Horarias */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tarifa C Día (Esp)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioDiaC}
                onChange={(e) => setPrecioDiaC(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-bold"
                placeholder="Especial c/autorización"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tarifa A Hora (C$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioHora}
                onChange={(e) => setPrecioHora(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                placeholder="Por hora"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tarifa B/C Hora
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioHoraB}
                  onChange={(e) => setPrecioHoraB(e.target.value)}
                  className="w-1/2 text-xs px-2 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-bold"
                  placeholder="B hr"
                  title="Tarifa B por hora"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioHoraC}
                  onChange={(e) => setPrecioHoraC(e.target.value)}
                  className="w-1/2 text-xs px-2 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-bold"
                  placeholder="C hr"
                  title="Tarifa C por hora"
                />
              </div>
            </div>
          </div>

          {/* Campos específicos según si es SERIALIZADO o POR CANTIDAD */}
          {tipoControl === 'SERIALIZADO' ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[11px] font-extrabold uppercase text-slate-700 block">
                Primera Unidad del Grupo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Código <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="Ej. 01-17"
                    className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  {codeError && <p className="text-[10px] text-rose-600 mt-1">{codeError}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Número de Serie <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => handleSerialChange(e.target.value)}
                    placeholder="Serie de fábrica"
                    className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  {serialError && <p className="text-[10px] text-rose-600 mt-1">{serialError}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej. MS60-4"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[11px] font-extrabold uppercase text-slate-700 block">
                Stock Inicial del Lote
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Código de Lote <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="Ej. CUN-01, AND-01"
                    className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Cantidad Inicial (Unidades) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={cantidadInicial}
                    onChange={(e) => setCantidadInicial(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full font-mono text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(serialError) || Boolean(codeError)}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? 'Creando...' : '+ Crear Producto y Registrar Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
