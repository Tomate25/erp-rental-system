import React, { useState, useEffect, useId } from 'react';
import type { GroupedProduct } from '../types/grouped-inventory.types';
import { suggestNextEquipmentCode, isSerialNumberDuplicate } from '../utils/inventory-similarity';
import { X, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface AddSerialUnitPayload {
  productoId: string;
  codigo: string;
  numeroSerie: string;
  modelo: string;
  marcaId?: string;
  categoriaId?: string;
  sucursalId: string;
  estado: 'DISPONIBLE' | 'EN_REPARACION' | 'RESERVADO';
  precioRentaDia: number;
  precioRentaHora?: number;
}

interface AddSerialUnitModalProps {
  product: GroupedProduct;
  existingCodes: string[];
  existingSerials: string[];
  sucursales: Array<{ id: string; nombre: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AddSerialUnitPayload) => Promise<void>;
}

export const AddSerialUnitModal: React.FC<AddSerialUnitModalProps> = ({
  product,
  existingCodes,
  existingSerials,
  sucursales,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const titleId = useId();
  const [codigo, setCodigo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [modelo, setModelo] = useState(product.nombre);
  const [estado, setEstado] = useState<'DISPONIBLE' | 'EN_REPARACION' | 'RESERVADO'>('DISPONIBLE');
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id || '');
  const [precioDia, setPrecioDia] = useState<number>(100);
  const [precioHora, setPrecioHora] = useState<number | undefined>(undefined);

  const [serialError, setSerialError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Inicializar sugerencias al abrir modal
  useEffect(() => {
    if (isOpen) {
      const suggested = suggestNextEquipmentCode(existingCodes, '01');
      setCodigo(suggested);
      setNumeroSerie('');
      setModelo(product.nombre);
      setEstado('DISPONIBLE');
      setSerialError(null);
      setCodeError(null);
      setSubmitError(null);
      setSucursalId(sucursales[0]?.id || '');
    }
  }, [isOpen, product, existingCodes, sucursales]);

  // Validación de serie en tiempo real
  const handleSerialChange = (val: string) => {
    setNumeroSerie(val);
    if (!val.trim()) {
      setSerialError('El número de serie es obligatorio para equipos con serie.');
    } else if (isSerialNumberDuplicate(val, existingSerials)) {
      setSerialError(`La serie "${val}" ya está registrada en otra unidad del inventario.`);
    } else {
      setSerialError(null);
    }
  };

  // Validación de código
  const handleCodeChange = (val: string) => {
    setCodigo(val);
    if (!val.trim()) {
      setCodeError('El código de activo es obligatorio.');
    } else if (existingCodes.some((c) => c.toLowerCase() === val.trim().toLowerCase())) {
      setCodeError(`El código "${val}" ya está asignado a otro equipo.`);
    } else {
      setCodeError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim()) {
      setCodeError('Ingresa un código de equipo válido.');
      return;
    }
    if (!numeroSerie.trim()) {
      setSerialError('El número de serie es obligatorio.');
      return;
    }
    if (isSerialNumberDuplicate(numeroSerie, existingSerials)) {
      setSerialError(`La serie "${numeroSerie}" ya existe.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        productoId: product.productoId,
        codigo: codigo.trim(),
        numeroSerie: numeroSerie.trim(),
        modelo: modelo.trim(),
        sucursalId,
        estado,
        precioRentaDia: Number(precioDia),
        precioRentaHora: product.tarifa === 'HORA' ? Number(precioHora || 50) : undefined,
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Error al guardar la nueva unidad.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              + Agregar Unidad Serializada
            </span>
            <h3 id={titleId} className="text-base font-black text-slate-900 mt-1">
              {product.nombre}
            </h3>
            <p className="text-xs text-slate-500">
              Familia: <span className="font-medium text-slate-700">{product.familia}</span> · Tarifa:{' '}
              <span className="font-semibold text-slate-700">
                {product.tarifa === 'HORA' ? 'Por hora' : 'Por día'}
              </span>
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
          {/* Código y Serie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código de Equipo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="Ej. 01-17"
                  className={`w-full font-mono text-xs px-3 py-2 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                    codeError
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                  required
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-blue-600 font-semibold bg-blue-50 px-1 rounded">
                  Sugerido
                </span>
              </div>
              {codeError && <p className="text-[11px] text-rose-600 mt-1 font-medium">{codeError}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Número de Serie <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={numeroSerie}
                  onChange={(e) => handleSerialChange(e.target.value)}
                  placeholder="Serie de fábrica"
                  className={`w-full font-mono text-xs px-3 py-2 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                    serialError
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                  required
                />
                {!serialError && numeroSerie.trim() && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-2.5 top-2.5" />
                )}
              </div>
              {serialError && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {serialError}
                </p>
              )}
            </div>
          </div>

          {/* Modelo y Sucursal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Modelo / Variante
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Modelo o especificación"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sucursal de Asignación
              </label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estado inicial y Tarifa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estado Inicial
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="DISPONIBLE">🟢 DISPONIBLE (Listo para renta)</option>
                <option value="EN_REPARACION">🔴 EN REPARACIÓN (Mantenimiento)</option>
                <option value="RESERVADO">🟠 RESERVADO</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tarifa ({product.tarifa === 'HORA' ? 'USD/hora' : 'USD/día'})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.tarifa === 'HORA' ? (precioHora || 50) : precioDia}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (product.tarifa === 'HORA') setPrecioHora(val);
                  else setPrecioDia(val);
                }}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

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
              {isSubmitting ? 'Guardando...' : '+ Guardar Unidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
