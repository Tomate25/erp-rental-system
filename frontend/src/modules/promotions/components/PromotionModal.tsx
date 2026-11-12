import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  Search,
} from 'lucide-react';
import type { Promocion, CreatePromocionPayload } from '../types/promotion.types';
import { MachineryPickerModal } from './MachineryPickerModal';
import { getEquipments } from '../../inventory/services/inventory.api';
import type { Equipment } from '../../inventory/types/inventory.types';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreatePromocionPayload) => Promise<void>;
  promotionToEdit?: Promocion | null;
}

interface FormItem {
  machineryId: string;
  type: 'EQUIPO' | 'PRODUCTO';
  codigo?: string | null;
  nombre?: string;
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [allEquipments, setAllEquipments] = useState<Equipment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getEquipments()
        .then((eqs) => setAllEquipments(eqs || []))
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
          promotionToEdit.items.map((i) => {
            const isEquipo = !!i.equipoId || (!!i.equipo && !i.productoId);
            const eq = i.equipo;
            const prod = i.producto;
            return {
              machineryId:
                i.equipoId ||
                i.productoId ||
                eq?.id ||
                prod?.id ||
                '',
              type: isEquipo ? 'EQUIPO' : 'PRODUCTO',
              codigo: eq?.codigo || prod?.codigo || null,
              nombre: eq?.descripcion || eq?.modelo || prod?.nombre || 'Maquinaria',
              cantidad: i.cantidad || 1,
              precioUnitarioSugerido:
                Number(i.precioUnitarioSugerido) ||
                Number(eq?.precioRentaDia) ||
                Number(prod?.precioRentaDia) ||
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

  const handlePickerConfirm = (
    selected: Array<{ equipo: Equipment; cantidad: number }>,
  ) => {
    // Mezclar con los items actuales: si ya existe el equipo, actualizar su cantidad
    const newItems = [...items];

    selected.forEach(({ equipo, cantidad }) => {
      const idx = newItems.findIndex((it) => it.machineryId === equipo.id);
      if (idx >= 0) {
        newItems[idx].cantidad = cantidad;
      } else {
        newItems.push({
          machineryId: equipo.id,
          type: 'EQUIPO',
          codigo: equipo.codigo,
          nombre: equipo.descripcion || equipo.modelo || 'Maquinaria',
          cantidad,
          precioUnitarioSugerido: Number(equipo.precioRentaDia) || 0,
          notas: '',
        });
      }
    });

    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Cálculo de valor estándar de catálogo de los equipos del combo
  const precioEstandarTotal = items.reduce((sum, item) => {
    const eq = allEquipments.find((e) => e.id === item.machineryId);
    const precioBase = eq ? Number(eq.precioRentaDia) || 0 : Number(item.precioUnitarioSugerido) || 0;
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
        items: items.map((i) => ({
          equipoId: i.type === 'EQUIPO' ? i.machineryId : undefined,
          productoId: i.type === 'PRODUCTO' ? i.machineryId : undefined,
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
        <div className="relative w-full max-w-4xl my-8 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
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
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
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
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Máquinas / Equipos del Combo ({items.length})
                  </h3>
                </div>

                {/* Botón AJAX Pantalla Completa para Seleccionar Múltiples Equipos */}
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all cursor-pointer w-fit"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Agregar Máquina al Combo (Catálogo Pantalla Completa)</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div
                  onClick={() => setIsPickerOpen(true)}
                  className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-all cursor-pointer group"
                >
                  <Search className="w-8 h-8 mx-auto text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
                  <p className="text-xs font-black text-slate-800">
                    No has agregado maquinarias a este combo
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Haz clic aquí o en el botón azul para abrir el catálogo en pantalla completa y marcar varias máquinas a la vez.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const eqInfo = allEquipments.find((e) => e.id === item.machineryId);
                    const disp = eqInfo ? Number(eqInfo.cantidadDisponible) || 0 : undefined;
                    const hasStock = disp !== undefined ? disp > 0 && eqInfo?.estado === 'DISPONIBLE' : true;

                    return (
                      <div
                        key={index}
                        className={`flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl border text-xs shadow-xs transition-colors ${
                          !hasStock
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* Código y Nombre */}
                        <div className="w-full sm:flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.codigo && (
                              <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                                {item.codigo}
                              </span>
                            )}
                            <span className="font-bold text-slate-900 text-xs">
                              {item.nombre || 'Maquinaria seleccionada'}
                            </span>

                            {/* Badge de Stock en Almacén */}
                            {eqInfo && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  hasStock
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                }`}
                              >
                                {hasStock ? (
                                  `🟢 ${disp} disp.`
                                ) : (
                                  <>
                                    <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                    <span>0 disp. ({eqInfo.estado})</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Tarifa estándar catálogo: ${item.precioUnitarioSugerido.toFixed(2)}/día
                          </div>
                        </div>

                        {/* Cantidad con botones +/- */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-500 text-[10px] uppercase font-bold">Cant:</span>
                          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() =>
                                handleItemChange(index, 'cantidad', Math.max(1, item.cantidad - 1))
                              }
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) =>
                                handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)
                              }
                              className="w-10 text-center font-black text-xs text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleItemChange(index, 'cantidad', item.cantidad + 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Nota o instrucción */}
                        <div className="w-full sm:w-48">
                          <input
                            type="text"
                            placeholder="Nota (ej. Con operador)"
                            value={item.notas}
                            onChange={(e) => handleItemChange(index, 'notas', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs"
                          />
                        </div>

                        {/* Botón eliminar */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
                          title="Quitar del combo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Banner si hay equipos con stock 0 */}
                  {items.some((it) => {
                    const eq = allEquipments.find((e) => e.id === it.machineryId);
                    return eq && ((Number(eq.cantidadDisponible) || 0) <= 0 || eq.estado !== 'DISPONIBLE');
                  }) && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 mt-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Aviso de inventario:</strong> Uno o más equipos seleccionados tienen 0 unidades disponibles hoy en almacén. Puedes guardar el combo en catálogo, pero al cotizarlo con clientes deberás elegir fechas cuando el equipo ya esté libre o devuelto.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Resumen del Combo y Ahorro */}
              {items.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
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
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-black">
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

      {/* Modal Pantalla Completa Selector Múltiple de Maquinaria */}
      <MachineryPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onConfirmSelection={handlePickerConfirm}
        alreadySelectedEquipmentIds={items.map((i) => i.machineryId)}
      />
    </>
  );
};
