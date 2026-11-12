import React, { useState, useEffect } from 'react';
import { X, Package, Info } from 'lucide-react';
import type {
  Insumo,
  CreateInsumoPayload,
  CategoriaInsumo,
  UnidadMedidaInsumo,
} from '../types/insumo.types';
import { createInsumo, updateInsumo } from '../services/insumo.api';
import { getProviders } from '../../providers/services/providers.api';
import type { Provider } from '../../providers/types/provider.types';

interface InsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  insumoToEdit?: Insumo | null;
}

const CATEGORIAS: { value: CategoriaInsumo; label: string }[] = [
  { value: 'LUBRICANTES', label: 'Aceites y Lubricantes' },
  { value: 'FILTROS', label: 'Filtros (Aceite, Aire, Combustible)' },
  { value: 'DESGASTE', label: 'Piezas de Desgaste (Cuchillas, Dientes, Bandas)' },
  { value: 'FERRETERIA', label: 'Ferretería y Tornillería' },
  { value: 'COMBUSTIBLE', label: 'Combustible y Aditivos' },
  { value: 'OTROS', label: 'Otros Insumos de Taller' },
];

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
    nombre: insumoToEdit?.nombre || '',
    codigo: insumoToEdit?.codigo || '',
    descripcion: insumoToEdit?.descripcion || '',
    categoria: insumoToEdit?.categoria || 'LUBRICANTES',
    unidadMedida: insumoToEdit?.unidadMedida || 'UNIDAD',
    stockActual: insumoToEdit ? Number(insumoToEdit.stockActual) : 0,
    stockMinimo: insumoToEdit ? Number(insumoToEdit.stockMinimo) : 0,
    costoUnitario: insumoToEdit ? Number(insumoToEdit.costoUnitario) : 0,
    costoIncluyeIva: insumoToEdit?.costoIncluyeIva ?? true,
    aplicaIva: insumoToEdit?.aplicaIva ?? true,
    precioVenta:
      insumoToEdit?.precioVenta !== null && insumoToEdit?.precioVenta !== undefined
        ? Number(insumoToEdit.precioVenta)
        : null,
    proveedorId: insumoToEdit?.proveedorId || '',
    activo: insumoToEdit?.activo ?? true,
  });

  const [providers, setProviders] = useState<Provider[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getProviders({ activo: true })
        .then(setProviders)
        .catch(() => setProviders([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre del insumo es requerido.');
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
        proveedorId: formData.proveedorId || null,
        stockActual: Number(formData.stockActual) || 0,
        stockMinimo: Number(formData.stockMinimo) || 0,
        costoUnitario: Number(formData.costoUnitario) || 0,
        precioVenta:
          formData.precioVenta !== null && formData.precioVenta !== undefined && formData.precioVenta !== ('' as any)
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
      setError(err.response?.data?.message || 'Error al guardar el insumo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-white rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {isEditing ? 'Editar Insumo de Taller' : 'Registrar Nuevo Insumo / Consumible'}
              </h2>
              <p className="text-xs text-zinc-500">
                Catálogo de aceites, filtros, repuestos y consumibles para mantenimiento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Nombre del Insumo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Aceite 15W-40 Premium (Galón)"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Código Interno</label>
              <input
                type="text"
                placeholder="INS-001"
                value={formData.codigo || ''}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Categoría</label>
              <select
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value as CategoriaInsumo })
                }
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden bg-white"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">Unidad de Medida</label>
              <select
                value={formData.unidadMedida}
                onChange={(e) =>
                  setFormData({ ...formData, unidadMedida: e.target.value as UnidadMedidaInsumo })
                }
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden bg-white"
              >
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                {isEditing ? 'Stock Actual en Bodega' : 'Stock Inicial en Bodega'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.stockActual}
                onChange={(e) => setFormData({ ...formData, stockActual: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Stock Mínimo de Alerta
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Alerta de reorden"
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Costo Unitario de Compra (C$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.costoUnitario}
                onChange={(e) => setFormData({ ...formData, costoUnitario: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Precio Sugerido Venta / Cobro Cliente (C$, opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                value={formData.precioVenta ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precioVenta: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tratamiento de IVA */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Control Fiscal y Tratamiento de IVA</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer p-2 bg-white rounded-lg border border-zinc-200 hover:border-zinc-300">
                <input
                  type="checkbox"
                  checked={formData.costoIncluyeIva}
                  onChange={(e) =>
                    setFormData({ ...formData, costoIncluyeIva: e.target.checked })
                  }
                  className="mt-0.5 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <div>
                  <span className="font-semibold text-zinc-800 block">
                    Costo de compra incluye IVA
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Marca esto si la factura del proveedor por este insumo ya trae el 15% de IVA
                    incorporado.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer p-2 bg-white rounded-lg border border-zinc-200 hover:border-zinc-300">
                <input
                  type="checkbox"
                  checked={formData.aplicaIva}
                  onChange={(e) => setFormData({ ...formData, aplicaIva: e.target.checked })}
                  className="mt-0.5 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <div>
                  <span className="font-semibold text-zinc-800 block">
                    Afecto a IVA al facturar al cliente
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Si se desmarca, se facturará como renglón exento (sin 15% de IVA).
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Proveedor Habitual</label>
            <select
              value={formData.proveedorId || ''}
              onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden bg-white"
            >
              <option value="">-- Sin proveedor asociado / Compra libre --</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.tipo})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Descripción / Especificaciones</label>
            <textarea
              rows={2}
              placeholder="Grado de viscosidad, compatibilidad con motores diésel, marca recomendada..."
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="insumoActivo"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <label htmlFor="insumoActivo" className="text-xs font-semibold text-zinc-700 cursor-pointer">
              Insumo disponible para consumos en taller
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
