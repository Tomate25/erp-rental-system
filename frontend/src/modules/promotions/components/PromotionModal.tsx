import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Promocion, CreatePromocionPayload } from '../types/promotion.types';
import { getProducts } from '../../inventory/services/inventory.api';
import type { Product } from '../../inventory/types/inventory.types';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreatePromocionPayload) => Promise<void>;
  promotionToEdit?: Promocion | null;
}

interface FormItem {
  productoId: string;
  cantidad: number;
  precioUnitarioSugerido: number;
  notas: string;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  promotionToEdit,
}) => {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioCombo, setPrecioCombo] = useState<number>(0);
  const [tipoCobro, setTipoCobro] = useState<'POR_DIA' | 'POR_HORA'>('POR_DIA');
  const [diasMinimos, setDiasMinimos] = useState<number>(1);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [activo, setActivo] = useState(true);

  const [items, setItems] = useState<FormItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getProducts()
        .then((prods) => setAvailableProducts(prods || []))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (promotionToEdit) {
      setCodigo(promotionToEdit.codigo || '');
      setNombre(promotionToEdit.nombre || '');
      setDescripcion(promotionToEdit.descripcion || '');
      setPrecioCombo(Number(promotionToEdit.precioCombo) || 0);
      setTipoCobro(promotionToEdit.tipoCobro || 'POR_DIA');
      setDiasMinimos(promotionToEdit.diasMinimos || 1);
      setFechaInicio(
        promotionToEdit.fechaInicio
          ? new Date(promotionToEdit.fechaInicio).toISOString().split('T')[0]
          : '',
      );
      setFechaFin(
        promotionToEdit.fechaFin
          ? new Date(promotionToEdit.fechaFin).toISOString().split('T')[0]
          : '',
      );
      setActivo(promotionToEdit.activo ?? true);

      if (promotionToEdit.items && promotionToEdit.items.length > 0) {
        setItems(
          promotionToEdit.items.map((i) => ({
            productoId: i.productoId || '',
            cantidad: i.cantidad || 1,
            precioUnitarioSugerido: Number(i.precioUnitarioSugerido) || 0,
            notas: i.notas || '',
          })),
        );
      } else {
        setItems([]);
      }
    } else {
      setCodigo('');
      setNombre('');
      setDescripcion('');
      setPrecioCombo(0);
      setTipoCobro('POR_DIA');
      setDiasMinimos(1);
      setFechaInicio('');
      setFechaFin('');
      setActivo(true);
      setItems([]);
    }
    setError(null);
  }, [promotionToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productoId: availableProducts[0]?.id || '',
        cantidad: 1,
        precioUnitarioSugerido: Number(availableProducts[0]?.precioRentaDia) || 0,
        notas: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Si cambió el producto, actualizar precio estándar por defecto si no se había fijado
    if (field === 'productoId') {
      const prod = availableProducts.find((p) => p.id === value);
      if (prod) {
        updated[index].precioUnitarioSugerido = Number(prod.precioRentaDia) || 0;
      }
    }

    setItems(updated);
  };

  // Cálculo de valor estándar de catálogo de los equipos del combo
  const precioEstandarTotal = items.reduce((sum, item) => {
    const prod = availableProducts.find((p) => p.id === item.productoId);
    const precioBase = prod ? Number(prod.precioRentaDia) || 0 : Number(item.precioUnitarioSugerido) || 0;
    return sum + precioBase * item.cantidad;
  }, 0);

  const ahorroEstimado = Math.max(0, precioEstandarTotal - precioCombo);
  const porcentajeAhorro =
    precioEstandarTotal > 0 && ahorroEstimado > 0
      ? Math.round((ahorroEstimado / precioEstandarTotal) * 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      setError('El código y el nombre del combo son requeridos.');
      return;
    }

    if (precioCombo <= 0) {
      setError('El precio combo debe ser un valor positivo mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreatePromocionPayload = {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precioCombo: Number(precioCombo),
        tipoCobro,
        diasMinimos: Number(diasMinimos) || 1,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        activo,
        items: items.map((i) => ({
          productoId: i.productoId || undefined,
          cantidad: Number(i.cantidad) || 1,
          precioUnitarioSugerido: Number(i.precioUnitarioSugerido) || undefined,
          notas: i.notas?.trim() || undefined,
        })),
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Error al guardar la promoción.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-surface-base border border-border-default rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-wide">
                {promotionToEdit
                  ? 'Editar Promoción / Combo'
                  : 'Nueva Promoción / Combo de Maquinaria'}
              </h2>
              <p className="text-xs text-text-secondary">
                Configura paquetes de equipos con tarifas especiales para cotizaciones.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Datos Principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Código Promo *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  required
                  placeholder="Ej. COMBO-CIMIENTO"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent font-mono uppercase"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Nombre del Combo / Promoción *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Combo Cimentación: 2 Bailarinas + 1 Cortadora"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Precios y Condiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-subtle border border-border-default">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                Precio Combo ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-emerald-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={precioCombo || ''}
                  onChange={(e) => setPrecioCombo(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-surface-elevated border border-emerald-500/40 rounded-lg text-text-primary font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Tipo Cobro
              </label>
              <select
                value={tipoCobro}
                onChange={(e) => setTipoCobro(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="POR_DIA">Por Día</option>
                <option value="POR_HORA">Por Hora</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Días Mínimos
              </label>
              <input
                type="number"
                min="1"
                value={diasMinimos}
                onChange={(e) => setDiasMinimos(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Estado
              </label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default text-accent focus:ring-accent bg-surface-elevated"
                />
                <span className="text-sm text-text-primary font-medium">
                  {activo ? 'Activa' : 'Inactiva'}
                </span>
              </label>
            </div>
          </div>

          {/* Fechas de Vigencia y Descripción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Vigencia (Desde / Hasta)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-text-tertiary" />
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-text-tertiary" />
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Condiciones o Notas del Combo
              </label>
              <input
                type="text"
                placeholder="Ej. Válido contratando al menos 3 días"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Máquinas / Equipos Incluidos en el Combo */}
          <div className="space-y-3 pt-2 border-t border-border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Máquinas / Equipos del Combo ({items.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface-elevated hover:bg-surface-subtle text-accent border border-accent/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Máquina al Combo
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-border-default bg-surface-subtle">
                <p className="text-xs text-text-tertiary">
                  No has agregado máquinas a este combo. Haz clic en "Agregar Máquina al Combo" para seleccionar los equipos y cantidades que incluye la promoción.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-lg bg-surface-elevated border border-border-default text-xs"
                  >
                    {/* Selector de Producto */}
                    <div className="w-full sm:flex-1">
                      <select
                        value={item.productoId}
                        onChange={(e) => handleItemChange(index, 'productoId', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-base border border-border-default rounded text-text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="">-- Seleccionar Máquina / Producto --</option>
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.codigo ? `[${p.codigo}] ` : ''}{p.nombre} (Tarifa cat: ${Number(p.precioRentaDia).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div className="w-full sm:w-24">
                      <div className="flex items-center gap-1">
                        <span className="text-text-tertiary text-[10px] uppercase">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.cantidad}
                          onChange={(e) =>
                            handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)
                          }
                          className="w-full px-2 py-1 bg-surface-base border border-border-default rounded text-text-primary font-bold text-center focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    {/* Notas / Observaciones */}
                    <div className="w-full sm:w-44">
                      <input
                        type="text"
                        placeholder="Nota (ej. Con operador)"
                        value={item.notas}
                        onChange={(e) => handleItemChange(index, 'notas', e.target.value)}
                        className="w-full px-2 py-1 bg-surface-base border border-border-default rounded text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-text-tertiary hover:text-red-400 hover:bg-surface-base rounded transition-colors"
                      title="Eliminar del combo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Resumen del Combo y Ahorro */}
            {items.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-surface-subtle border border-border-default text-xs">
                <div>
                  <span className="text-text-secondary">Tarifa individual sumada: </span>
                  <span className="font-bold text-text-primary">
                    ${precioEstandarTotal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Precio Combo: </span>
                  <span className="font-bold text-emerald-400">
                    ${precioCombo.toFixed(2)}
                  </span>
                </div>
                {ahorroEstimado > 0 && (
                  <div className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                    Ahorro cliente: ${ahorroEstimado.toFixed(2)} ({porcentajeAhorro}%)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting
                ? 'Guardando...'
                : promotionToEdit
                ? 'Actualizar Promoción'
                : 'Crear Promoción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
