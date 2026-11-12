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
  TrendingDown,
} from 'lucide-react';
import type { Promocion, CreatePromocionPayload } from '../types/promotion.types';
import { getEquipments, getProducts } from '../../inventory/services/inventory.api';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreatePromocionPayload) => Promise<void>;
  promotionToEdit?: Promocion | null;
}

interface MachineryOption {
  id: string;
  type: 'EQUIPO' | 'PRODUCTO';
  codigo?: string | null;
  nombre: string;
  precioRentaDia: number;
}

interface FormItem {
  machineryId: string;
  type: 'EQUIPO' | 'PRODUCTO';
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
  const [availableMachinery, setAvailableMachinery] = useState<MachineryOption[]>([]);
  const [isLoadingMachinery, setIsLoadingMachinery] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingMachinery(true);
      Promise.all([
        getEquipments().catch(() => []),
        getProducts().catch(() => []),
      ])
        .then(([eqs, prods]) => {
          const unified: MachineryOption[] = [];

          // Agregar equipos reales de inventario (maquinarias)
          (eqs || []).forEach((eq: any) => {
            unified.push({
              id: eq.id,
              type: 'EQUIPO',
              codigo: eq.codigo,
              nombre: eq.descripcion || eq.modelo || 'Equipo sin nombre',
              precioRentaDia: Number(eq.precioRentaDia) || 0,
            });
          });

          // Agregar productos del catálogo si los hubiera
          (prods || []).forEach((p: any) => {
            unified.push({
              id: p.id,
              type: 'PRODUCTO',
              codigo: p.codigo,
              nombre: p.nombre,
              precioRentaDia: Number(p.precioRentaDia) || 0,
            });
          });

          // Ordenar alfabéticamente por nombre
          unified.sort((a, b) => a.nombre.localeCompare(b.nombre));
          setAvailableMachinery(unified);
        })
        .finally(() => setIsLoadingMachinery(false));
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
          promotionToEdit.items.map((i) => {
            const isEquipo = !!i.equipoId || (!!i.equipo && !i.productoId);
            return {
              machineryId:
                i.equipoId ||
                i.productoId ||
                i.equipo?.id ||
                i.producto?.id ||
                '',
              type: isEquipo ? 'EQUIPO' : 'PRODUCTO',
              cantidad: i.cantidad || 1,
              precioUnitarioSugerido:
                Number(i.precioUnitarioSugerido) ||
                Number(i.equipo?.precioRentaDia) ||
                Number(i.producto?.precioRentaDia) ||
                0,
              notas: i.notas || '',
            };
          }),
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
    const firstOption = availableMachinery[0];
    setItems([
      ...items,
      {
        machineryId: firstOption?.id || '',
        type: firstOption?.type || 'EQUIPO',
        cantidad: 1,
        precioUnitarioSugerido: firstOption ? Number(firstOption.precioRentaDia) : 0,
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

    // Si cambió la máquina seleccionada, actualizar precio de catálogo y tipo
    if (field === 'machineryId') {
      const mach = availableMachinery.find((m) => m.id === value);
      if (mach) {
        updated[index].type = mach.type;
        updated[index].precioUnitarioSugerido = Number(mach.precioRentaDia) || 0;
      }
    }

    setItems(updated);
  };

  // Cálculo de valor estándar de catálogo de los equipos del combo
  const precioEstandarTotal = items.reduce((sum, item) => {
    const mach = availableMachinery.find((m) => m.id === item.machineryId);
    const precioBase = mach ? Number(mach.precioRentaDia) || 0 : Number(item.precioUnitarioSugerido) || 0;
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
      setError('El precio del combo debe ser mayor a 0.');
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
        items: items.map((i) => {
          const selected = availableMachinery.find((m) => m.id === i.machineryId);
          const isEq = selected ? selected.type === 'EQUIPO' : i.type === 'EQUIPO';
          return {
            equipoId: isEq ? i.machineryId : undefined,
            productoId: !isEq ? i.machineryId : undefined,
            cantidad: Number(i.cantidad) || 1,
            precioUnitarioSugerido: Number(i.precioUnitarioSugerido) || undefined,
            notas: i.notas?.trim() || undefined,
          };
        }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {promotionToEdit
                  ? 'Editar Promoción / Combo'
                  : 'Nueva Promoción / Combo de Maquinaria'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configura paquetes de equipos con tarifas especiales aplicables en cotizaciones.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Datos Principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Código Promo *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej. COMBO-CIMIENTO"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre del Combo / Promoción *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Combo Cimentación: 2 Bailarinas + 1 Cortadora"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>
          </div>

          {/* Precios y Condiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
                Precio Combo ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-emerald-600" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={precioCombo || ''}
                  onChange={(e) => setPrecioCombo(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-emerald-400 rounded-xl text-slate-900 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo Cobro
              </label>
              <select
                value={tipoCobro}
                onChange={(e) => setTipoCobro(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
              >
                <option value="POR_DIA">Por Día</option>
                <option value="POR_HORA">Por Hora</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Días Mínimos
              </label>
              <input
                type="number"
                min="1"
                value={diasMinimos}
                onChange={(e) => setDiasMinimos(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estado
              </label>
              <label className="flex items-center gap-2.5 mt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  {activo ? 'Activa' : 'Inactiva'}
                </span>
              </label>
            </div>
          </div>

          {/* Fechas de Vigencia y Descripción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vigencia (Desde / Hasta)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Condiciones o Notas del Combo
              </label>
              <input
                type="text"
                placeholder="Ej. Válido contratando al menos 3 días"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Máquinas / Equipos Incluidos en el Combo */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Máquinas / Equipos del Combo ({items.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-700" />
                Agregar Máquina al Combo
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <p className="text-xs text-slate-500 font-medium">
                  {isLoadingMachinery
                    ? 'Cargando inventario de maquinaria...'
                    : 'No has agregado máquinas a este combo. Haz clic en "Agregar Máquina al Combo" para seleccionar los equipos y cantidades que incluye el paquete promocional.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    {/* Selector de Producto / Máquina */}
                    <div className="w-full sm:flex-1">
                      <select
                        value={item.machineryId}
                        onChange={(e) => handleItemChange(index, 'machineryId', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                      >
                        <option value="">
                          -- Seleccionar Máquina ({availableMachinery.length} disponibles) --
                        </option>
                        {availableMachinery.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.codigo ? `[${m.codigo}] ` : ''}{m.nombre} (Tarifa Cat: ${Number(m.precioRentaDia).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div className="w-full sm:w-28">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.cantidad}
                          onChange={(e) =>
                            handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-black text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Notas / Observaciones */}
                    <div className="w-full sm:w-48">
                      <input
                        type="text"
                        placeholder="Nota (ej. Con operador)"
                        value={item.notas}
                        onChange={(e) => handleItemChange(index, 'notas', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>

                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Suma tarifa individual: </span>
                  <span className="font-bold text-slate-800">
                    ${precioEstandarTotal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Tarifa del combo: </span>
                  <span className="font-black text-emerald-700 text-sm">
                    ${precioCombo.toFixed(2)}
                  </span>
                </div>
                {ahorroEstimado > 0 ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-black">
                    <TrendingDown className="w-4 h-4 text-emerald-700" />
                    <span>Ahorro cliente: ${ahorroEstimado.toFixed(2)} ({porcentajeAhorro}%)</span>
                  </div>
                ) : (
                  <div className="text-slate-500 font-medium italic">
                    Sin descuento respecto a catálogo
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {isSubmitting
                ? 'Guardando...'
                : promotionToEdit
                ? 'Actualizar Promoción'
                : 'Guardar Promoción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
