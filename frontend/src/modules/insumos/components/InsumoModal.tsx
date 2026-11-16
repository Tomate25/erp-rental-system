import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Tag,
  Warehouse,
  Plus,
  Check,
  AlertTriangle,
  ShoppingBag,
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
import { CrearCategoriaModal } from './CrearCategoriaModal';

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
  const [isCrearCategoriaOpen, setIsCrearCategoriaOpen] = useState(false);
  const [tieneExistenciaInicial, setTieneExistenciaInicial] = useState(false);
  const [stockActualStr, setStockActualStr] = useState<string>(
    insumoToEdit && Number(insumoToEdit.stockActual) > 0
      ? String(Number(insumoToEdit.stockActual))
      : '',
  );
  const [stockMinimoStr, setStockMinimoStr] = useState<string>(
    insumoToEdit && Number(insumoToEdit.stockMinimo) > 0
      ? String(Number(insumoToEdit.stockMinimo))
      : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (insumoToEdit) {
        const stockInicial = Number(insumoToEdit.stockActual) || 0;
        const stockMinInicial = Number(insumoToEdit.stockMinimo) || 0;
        setTieneExistenciaInicial(stockInicial > 0);
        setStockActualStr(stockInicial > 0 ? String(stockInicial) : '');
        setStockMinimoStr(stockMinInicial > 0 ? String(stockMinInicial) : '');
        setFormData({
          nombre: insumoToEdit.nombre || '',
          codigo: insumoToEdit.codigo || '',
          descripcion: insumoToEdit.descripcion || '',
          categoria: insumoToEdit.categoria || 'LUBRICANTES',
          unidadMedida: insumoToEdit.unidadMedida || 'UNIDAD',
          stockActual: stockInicial,
          stockMinimo: stockMinInicial,
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
        setTieneExistenciaInicial(false);
        setStockActualStr('');
        setStockMinimoStr('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre del insumo es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const stockEnviar =
        isEditing || tieneExistenciaInicial ? Math.max(0, Number(stockActualStr) || 0) : 0;

      const payload: CreateInsumoPayload = {
        ...formData,
        nombre: formData.nombre.trim(),
        codigo: formData.codigo?.trim() || undefined,
        descripcion: formData.descripcion?.trim() || undefined,
        categoria: formData.categoria?.trim().toUpperCase() || 'LUBRICANTES',
        proveedorId: formData.proveedorId || null,
        stockActual: stockEnviar,
        stockMinimo: Math.max(0, Number(stockMinimoStr) || 0),
        costoUnitario: isEditing ? Number(formData.costoUnitario) || 0 : 0,
        precioVenta: isEditing && formData.precioVenta !== null && formData.precioVenta !== undefined && formData.precioVenta !== ('' as any)
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
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
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
                Catálogo de bodega y control de existencias. Costos, IVA y CxP se registran desde Compras.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-5">
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
                    <button
                      type="button"
                      onClick={() => setIsCrearCategoriaOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Agregar Categoría (AJAX)</span>
                    </button>
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
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 text-zinc-900">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-zinc-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Control de Existencias en Bodega
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                    Unidad: {formData.unidadMedida}
                  </span>
                </div>

                {/* Aviso de integración Compras -> Contabilidad */}
                <div className="flex items-start gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950">
                  <ShoppingBag className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-900">
                      Ingresos, costos e IVA se gestionan desde Compras
                    </p>
                    <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                      Al registrar una orden en <span className="font-bold">Compras</span> se actualizan automáticamente las existencias de bodega, el costo promedio, el inventario contable (121002), IVA acreditable (110702) y Cuentas por Pagar / Bancos.
                    </p>
                  </div>
                </div>

                {!isEditing && (
                  <label className="flex items-center gap-2.5 p-3 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100/70 transition-colors">
                    <input
                      type="checkbox"
                      id="tieneExistenciaInicial"
                      checked={tieneExistenciaInicial}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTieneExistenciaInicial(checked);
                        if (!checked) {
                          setStockActualStr('');
                          setFormData((prev) => ({ ...prev, stockActual: 0 }));
                        }
                      }}
                      className="rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-zinc-900 block">
                        ¿Cuenta con existencias físicas iniciales? (opcional)
                      </span>
                      <span className="text-[11px] text-zinc-500 block">
                        Activa esta opción solo si ya existe inventario físico previo en bodega antes de registrar compras.
                      </span>
                    </div>
                  </label>
                )}

                <div className={`grid grid-cols-1 ${isEditing || tieneExistenciaInicial ? 'sm:grid-cols-2' : ''} gap-4`}>
                  {(isEditing || tieneExistenciaInicial) && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">
                        {isEditing ? 'Stock Físico Actual' : 'Cantidad Inicial en Bodega'} (
                        {formData.unidadMedida})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={stockActualStr}
                        onChange={(e) => {
                          setStockActualStr(e.target.value);
                          setFormData({
                            ...formData,
                            stockActual: e.target.value === '' ? 0 : Number(e.target.value),
                          });
                        }}
                        className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">
                      Stock Mínimo de Alerta ({formData.unidadMedida})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={stockMinimoStr}
                      onChange={(e) => {
                        setStockMinimoStr(e.target.value);
                        setFormData({
                          ...formData,
                          stockMinimo: e.target.value === '' ? 0 : Number(e.target.value),
                        });
                      }}
                      className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
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
                    Insumo activo y disponible para despachos de bodega y órdenes de compra
                  </label>
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

      <CrearCategoriaModal
        isOpen={isCrearCategoriaOpen}
        onClose={() => setIsCrearCategoriaOpen(false)}
        onSuccess={(nuevaCat) => {
          setAvailableCategories((prev) => Array.from(new Set([nuevaCat.nombre, ...prev])));
          setFormData((prev) => ({ ...prev, categoria: nuevaCat.nombre }));
        }}
      />
    </div>
  );
};
