import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Tag,
  DollarSign,
  Warehouse,
  Plus,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type {
  Insumo,
  CreateInsumoPayload,
  UnidadMedidaInsumo,
} from '../types/insumo.types';
import { CATEGORIAS_SUGERIDAS } from '../types/insumo.types';
import { createInsumo, updateInsumo, getCategoriasInsumos } from '../services/insumo.api';
import { getProviders } from '../../providers/services/providers.api';
import type { Provider } from '../../providers/types/provider.types';
import { formatCurrency } from '../../../shared/utils/formatters';

interface InsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  insumoToEdit?: Insumo | null;
}

const UNIDADES: { value: UnidadMedidaInsumo; label: string }[] = [
  { value: 'GALON', label: 'Galón (gal)' },
  { value: 'LITRO', label: 'Litro (L)' },
  { value: 'PIEZA', label: 'Pieza (pza)' },
  { value: 'UNIDAD', label: 'Unidad (und)' },
  { value: 'PAR', label: 'Par' },
  { value: 'KG', label: 'Kilogramo (kg)' },
  { value: 'METRO', label: 'Metro (m)' },
];

export const InsumoModal: React.FC<InsumoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  insumoToEdit,
}) => {
  const isEditing = Boolean(insumoToEdit);

  const [formData, setFormData] = useState<CreateInsumoPayload>({
    nombre: '',
    codigo: '',
    descripcion: '',
    categoria: 'LUBRICANTES',
    unidadMedida: 'UNIDAD',
    stockActual: 0,
    stockMinimo: 0,
    costoUnitario: 0,
    costoIncluyeIva: true,
    aplicaIva: true,
    precioVenta: null,
    proveedorId: '',
    activo: true,
  });

  const [providers, setProviders] = useState<Provider[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>(CATEGORIAS_SUGERIDAS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (insumoToEdit) {
        setFormData({
          nombre: insumoToEdit.nombre || '',
          codigo: insumoToEdit.codigo || '',
          descripcion: insumoToEdit.descripcion || '',
          categoria: insumoToEdit.categoria || 'LUBRICANTES',
          unidadMedida: insumoToEdit.unidadMedida || 'UNIDAD',
          stockActual: Number(insumoToEdit.stockActual) || 0,
          stockMinimo: Number(insumoToEdit.stockMinimo) || 0,
          costoUnitario: Number(insumoToEdit.costoUnitario) || 0,
          costoIncluyeIva: insumoToEdit.costoIncluyeIva ?? true,
          aplicaIva: insumoToEdit.aplicaIva ?? true,
          precioVenta:
            insumoToEdit.precioVenta !== null && insumoToEdit.precioVenta !== undefined
              ? Number(insumoToEdit.precioVenta)
              : null,
          proveedorId: insumoToEdit.proveedorId || '',
          activo: insumoToEdit.activo ?? true,
        });
      } else {
        setFormData({
          nombre: '',
          codigo: '',
          descripcion: '',
          categoria: 'LUBRICANTES',
          unidadMedida: 'UNIDAD',
          stockActual: 0,
          stockMinimo: 0,
          costoUnitario: 0,
          costoIncluyeIva: true,
          aplicaIva: true,
          precioVenta: null,
          proveedorId: '',
          activo: true,
        });
      }

      setError(null);

      // Cargar proveedores y categorías dinámicas
      void getProviders({ activo: true })
        .then(setProviders)
        .catch(() => setProviders([]));

      void getCategoriasInsumos()
        .then((cats) => {
          const merged = Array.from(new Set([...CATEGORIAS_SUGERIDAS, ...cats]));
          setAvailableCategories(merged);
        })
        .catch(() => setAvailableCategories(CATEGORIAS_SUGERIDAS));
    }
  }, [isOpen, insumoToEdit]);

  if (!isOpen) return null;

  const costoNum = Number(formData.costoUnitario) || 0;
  const precioVentaNum = Number(formData.precioVenta) || 0;
  const stockNum = Number(formData.stockActual) || 0;

  // Desglose fiscal calculado
  const costoNeto = formData.costoIncluyeIva ? costoNum / 1.15 : costoNum;
  const ivaCosto = formData.costoIncluyeIva ? costoNum - costoNeto : costoNum * 0.15;
  const valorTotalInicial = stockNum * costoNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre del insumo es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateInsumoPayload = {
        ...formData,
        nombre: formData.nombre.trim(),
        codigo: formData.codigo?.trim() || undefined,
        descripcion: formData.descripcion?.trim() || undefined,
        categoria: formData.categoria?.trim().toUpperCase() || 'LUBRICANTES',
        proveedorId: formData.proveedorId || null,
        stockActual: Number(formData.stockActual) || 0,
        stockMinimo: Number(formData.stockMinimo) || 0,
        costoUnitario: Number(formData.costoUnitario) || 0,
        precioVenta:
          formData.precioVenta !== null &&
          formData.precioVenta !== undefined &&
          formData.precioVenta !== ('' as any)
            ? Number(formData.precioVenta)
            : null,
      };

      if (isEditing && insumoToEdit) {
        await updateInsumo(insumoToEdit.id, payload);
      } else {
        await createInsumo(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el insumo en el catálogo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 text-white rounded-2xl shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-zinc-900">
                  {isEditing ? 'Editar Insumo de Bodega' : 'Registrar Nuevo Insumo / Consumible'}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800 uppercase tracking-wider">
                  {isEditing ? 'Modo Edición' : 'Alta de Catálogo'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Configuración completa de catálogo, categorías personalizadas, tratamiento fiscal y existencias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Cerrar</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Identificación y Categoría (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Datos Básicos */}
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 text-zinc-900">
                  <Tag className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Identificación del Insumo
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-zinc-700">
                      Nombre del Insumo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Aceite 15W-40 Premium Diésel"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">Código Interno</label>
                    <input
                      type="text"
                      placeholder="INS-001"
                      value={formData.codigo || ''}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Categoría Personalizable / Flexible */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-700">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      Escribe una categoría nueva o selecciona una sugerida
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      list="categorias-disponibles"
                      placeholder="Ej. LUBRICANTES, FILTROS, ELECTRICO, HERRAMIENTAS..."
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-bold uppercase"
                    />
                    <datalist id="categorias-disponibles">
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  {/* Pills de categorías frecuentes para un clic rápido */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Sugeridas:</span>
                    {availableCategories.slice(0, 8).map((cat) => {
                      const isSelected = formData.categoria?.toUpperCase() === cat.toUpperCase();
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, categoria: cat })}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-zinc-900 text-white border-zinc-900'
                              : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unidad de medida & Proveedor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">Unidad de Medida</label>
                    <select
                      value={formData.unidadMedida}
                      onChange={(e) =>
                        setFormData({ ...formData, unidadMedida: e.target.value as UnidadMedidaInsumo })
                      }
                      className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-medium cursor-pointer"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">Proveedor Habitual</label>
                    <select
                      value={formData.proveedorId || ''}
                      onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value || null })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-medium cursor-pointer"
                    >
                      <option value="">-- Sin proveedor asociado / Compra libre --</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.tipo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Descripción o Especificaciones</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles técnicos, viscosidad, tipo de rosca, números de parte compatibles..."
                    value={formData.descripcion || ''}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Card 2: Control de Stock */}
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 text-zinc-900">
                  <Warehouse className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Control de Existencias en Bodega
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">
                      {isEditing ? 'Stock Físico Actual' : 'Stock Inicial de Bodega'} (
                      {formData.unidadMedida})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.stockActual}
                      onChange={(e) =>
                        setFormData({ ...formData, stockActual: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">
                      Stock Mínimo de Alerta ({formData.unidadMedida})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.stockMinimo}
                      onChange={(e) =>
                        setFormData({ ...formData, stockMinimo: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="insumoActivo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                  <label
                    htmlFor="insumoActivo"
                    className="text-xs font-bold text-zinc-800 cursor-pointer select-none"
                  >
                    Insumo activo y disponible para despachos de bodega
                  </label>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Costos, Precios y Tratamiento Fiscal (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 text-zinc-900">
                  <DollarSign className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Costos & Tratamiento de IVA
                  </h3>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">
                    Costo Unitario de Compra (C$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costoUnitario}
                    onChange={(e) =>
                      setFormData({ ...formData, costoUnitario: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-base font-black bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                  />
                </div>

                {/* Tratamiento IVA Compra */}
                <label className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.costoIncluyeIva}
                    onChange={(e) =>
                      setFormData({ ...formData, costoIncluyeIva: e.target.checked })
                    }
                    className="mt-0.5 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-900 block">
                      El costo de compra ya incluye IVA (15%)
                    </span>
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      {formData.costoIncluyeIva
                        ? `Costo neto: ${formatCurrency(costoNeto)} + IVA: ${formatCurrency(ivaCosto)}`
                        : `Costo neto: ${formatCurrency(costoNum)} (IVA se sumará en facturación si aplica)`}
                    </span>
                  </div>
                </label>

                {/* Precio Venta al Cliente */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-zinc-700">
                    Precio Sugerido Venta / Cobro al Cliente (C$, opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.precioVenta ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precioVenta: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                  />
                </div>

                {/* Tratamiento IVA Venta */}
                <label className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.aplicaIva}
                    onChange={(e) =>
                      setFormData({ ...formData, aplicaIva: e.target.checked })
                    }
                    className="mt-0.5 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-900 block">
                      Afecto a IVA al facturar al cliente
                    </span>
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      {formData.aplicaIva
                        ? 'Se aplicará 15% de IVA regular en cotizaciones y facturas.'
                        : 'Exento de IVA en facturación (tarifa 0%).'}
                    </span>
                  </div>
                </label>

                {/* Resumen Financiero del Insumo */}
                <div className="p-4 bg-zinc-900 text-white rounded-2xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Valor Inicial en Inventario:</span>
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {formatCurrency(valorTotalInicial)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Unidad de Medida:</span>
                    <span className="font-bold">{formData.unidadMedida}</span>
                  </div>
                  {precioVentaNum > 0 && costoNum > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                      <span className="text-zinc-400">Margen Bruto Proyectado:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {Math.round(((precioVentaNum - costoNum) / precioVentaNum) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Actions Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
            <span className="text-xs text-zinc-400 font-medium">
              Los campos marcados con <span className="text-red-500">*</span> son obligatorios.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {saving
                    ? 'Guardando insumo...'
                    : isEditing
                    ? 'Guardar Modificaciones'
                    : 'Registrar Insumo en Bodega'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
