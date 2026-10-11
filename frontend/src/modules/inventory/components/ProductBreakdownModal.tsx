import React, { useState, useEffect, useMemo } from 'react';
import type {
  GroupedProduct,
  ProductUnitsResponse,
  SerialUnitItem,
} from '../types/grouped-inventory.types';
import { StatusChips } from './StatusChips';
import { OccupancyBar } from './OccupancyBar';
import {
  X,
  Plus,
  Sliders,
  Layers,
  Search,
  Package,
  Clock,
  User,
  ShieldCheck,
  Building2,
  Calendar,
  Info,
  Tag,
} from 'lucide-react';

export interface ProductBreakdownModalProps {
  product: GroupedProduct | null;
  unitsData?: ProductUnitsResponse;
  isLoadingUnits?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectUnit: (unit: SerialUnitItem | { codigo: string; nombre: string; productoId: string }) => void;
  onAddSerialUnit?: (product: GroupedProduct) => void;
  onAdjustQuantity?: (product: GroupedProduct) => void;
  onOpenPricingModal?: (product: GroupedProduct) => void;
}

export const ProductBreakdownModal: React.FC<ProductBreakdownModalProps> = ({
  product,
  unitsData,
  isLoadingUnits = false,
  isOpen,
  onClose,
  onSelectUnit,
  onAddSerialUnit,
  onAdjustQuantity,
  onOpenPricingModal,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset filters when product changes
  useEffect(() => {
    setFilterQuery('');
    setStatusFilter('ALL');
  }, [product?.productoId]);

  const filteredSerialUnits = useMemo(() => {
    if (!unitsData || unitsData.tipoControl !== 'SERIALIZADO') return [];
    let list = unitsData.unidades;
    if (statusFilter !== 'ALL') {
      list = list.filter((u) => u.estado === statusFilter);
    }
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.codigo.toLowerCase().includes(q) ||
          (u.serie && u.serie.toLowerCase().includes(q)) ||
          (u.modelo && u.modelo.toLowerCase().includes(q)) ||
          (u.clienteAsignado && u.clienteAsignado.toLowerCase().includes(q)) ||
          (u.contratoNumero && u.contratoNumero.toLowerCase().includes(q))
      );
    }
    return list;
  }, [unitsData, statusFilter, filterQuery]);

  if (!isOpen || !product) return null;

  const isSerialized = product.tipoControl === 'SERIALIZADO';

  const getUnitStatusBadge = (estado: string) => {
    switch (estado) {
      case 'DISPONIBLE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'ALQUILADO':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'RESERVADO':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'EN_REPARACION':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'BAJA':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakdown-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isSerialized
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                {isSerialized ? 'Control Serializado (1 u./serie)' : 'Control por Cantidad (Lote masivo)'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                {product.familia}
              </span>
              {product.marca && product.marca !== 'N/D' && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  {product.marca}
                </span>
              )}
              {product.tarifa === 'HORA' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Clock className="w-3 h-3" /> Tarifa por Hora
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                  <Layers className="w-3 h-3 text-slate-400" /> Tarifa por Día
                </span>
              )}
            </div>

            <h2 id="breakdown-modal-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {product.nombre}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Desglose completo de existencias, asignaciones operativas en obra y trazabilidad de flota.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
            aria-label="Cerrar desglose"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DEL MODAL (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          {/* BARRA DE ESTADÍSTICAS Y RESUMEN KPI */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Total en Flota
                  </span>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {product.total.toLocaleString('es-NI')} <span className="text-xs font-normal text-slate-500">unidades</span>
                  </div>
                </div>
              </div>

              {/* Botones de acción principales integrados */}
              <div className="flex flex-wrap items-center gap-2">
                {onOpenPricingModal && (
                  <button
                    type="button"
                    onClick={() => onOpenPricingModal(product)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                    title="Configurar y editar tarifas A, B y C"
                  >
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span>Tarifas A/B/C</span>
                  </button>
                )}

                {isSerialized ? (
                  onAddSerialUnit && (
                    <button
                      type="button"
                      onClick={() => onAddSerialUnit(product)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Unidad Serializada</span>
                    </button>
                  )
                ) : (
                  onAdjustQuantity && (
                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(product)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Sliders className="w-4 h-4" />
                      <span>Ajustar Stock / Lote</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Fila de Tarifas Vigentes A, B y C */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                  Tarifas Activas ({product.tarifa === 'HORA' ? 'C$/hr' : 'C$/día'}):
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold" title="Tarifa A (Base regular ≤ 8d)">
                  Tarifa A: C${(product.tarifa === 'HORA' && product.precioHoraA ? product.precioHoraA : (product.precioDiaA || 0)).toLocaleString('es-NI')}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold" title="Tarifa B (> 8d)">
                  Tarifa B (&gt;8d): {((product.tarifa === 'HORA' ? product.precioHoraB : product.precioDiaB) !== null && (product.tarifa === 'HORA' ? product.precioHoraB : product.precioDiaB) !== undefined) ? `C$${Number(product.tarifa === 'HORA' ? product.precioHoraB : product.precioDiaB).toLocaleString('es-NI')}` : 'Sin definir'}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold" title="Tarifa C (Especial - requiere autorización)">
                  Tarifa C (Esp): {((product.tarifa === 'HORA' ? product.precioHoraC : product.precioDiaC) !== null && (product.tarifa === 'HORA' ? product.precioHoraC : product.precioDiaC) !== undefined) ? `C$${Number(product.tarifa === 'HORA' ? product.precioHoraC : product.precioDiaC).toLocaleString('es-NI')}` : 'Sin definir'}
                </span>
              </div>
            </div>

            {/* Chips por estado y barra de ocupación */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <StatusChips counts={product.porEstado} compact={false} />
                <span className="text-xs font-bold text-slate-600">
                  {product.porcentajeOcupacion}% ocupación activa
                </span>
              </div>
              <OccupancyBar
                counts={product.porEstado}
                total={product.total}
                rentedPercentage={product.porcentajeRentado}
              />
            </div>
          </div>

          {/* DESGLOSE ESPECÍFICO SEGÚN TIPO DE CONTROL */}
          {isLoadingUnits ? (
            <div className="py-12 text-center text-slate-400 space-y-2 animate-pulse">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Cargando inventario detallado de {product.nombre}...</p>
            </div>
          ) : isSerialized ? (
            /* ============================================================== */
            /* 1. SECCIÓN: EQUIPOS SERIALIZADOS                              */
            /* ============================================================== */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    Listado de Unidades Físicas ({unitsData?.tipoControl === 'SERIALIZADO' ? unitsData.unidades.length : 0})
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Selecciona cualquier unidad para ver su ficha técnica e historial.
                  </span>
                </div>

                {/* Filtros de unidades */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar código o serie..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="DISPONIBLE">Disponibles</option>
                    <option value="ALQUILADO">Alquilados</option>
                    <option value="RESERVADO">Reservados</option>
                    <option value="EN_REPARACION">En Reparación</option>
                    <option value="BAJA">De Baja</option>
                  </select>
                </div>
              </div>

              {filteredSerialUnits.length > 0 ? (
                <>
                  {/* Vista tabla en pantallas medianas y grandes */}
                  <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Serie</th>
                          <th className="py-2.5 px-3">Estado</th>
                          <th className="py-2.5 px-3">Ubicación / Asignación</th>
                          <th className="py-2.5 px-3">Contrato #</th>
                          <th className="py-2.5 px-3">F. Devolución</th>
                          <th className="py-2.5 px-2 text-center">Ficha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSerialUnits.map((u) => (
                          <tr
                            key={u.id}
                            onClick={() => onSelectUnit(u)}
                            className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                              {u.codigo}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {u.serie || 'S/N'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUnitStatusBadge(
                                  u.estado
                                )}`}
                              >
                                {u.estado}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              {u.clienteAsignado ? (
                                <span className="flex items-center gap-1 text-slate-900 font-bold">
                                  <User className="w-3 h-3 text-blue-600" />
                                  {u.clienteAsignado}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Bodega Central
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {u.contratoNumero ? `#${u.contratoNumero}` : '---'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                              {u.fechaDevolucion || '---'}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectUnit(u);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Ver Ficha Técnica"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista tarjetas en teléfonos móviles */}
                  <div className="sm:hidden space-y-2.5">
                    {filteredSerialUnits.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => onSelectUnit(u)}
                        className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 cursor-pointer active:bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-700 text-sm">{u.codigo}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUnitStatusBadge(
                              u.estado
                            )}`}
                          >
                            {u.estado}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block">Serie:</span>
                            <span className="font-mono font-bold text-slate-800">{u.serie || 'S/N'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Ubicación:</span>
                            <span className="font-medium text-slate-800 truncate block">
                              {u.clienteAsignado || 'En Bodega'}
                            </span>
                          </div>
                          {u.contratoNumero && (
                            <div>
                              <span className="text-slate-400 block">Contrato:</span>
                              <span className="font-mono font-bold text-blue-700">#{u.contratoNumero}</span>
                            </div>
                          )}
                          {u.fechaDevolucion && (
                            <div>
                              <span className="text-slate-400 block">Devolución:</span>
                              <span className="font-mono text-slate-700">{u.fechaDevolucion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  No se encontraron unidades con los filtros seleccionados.
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* 2. SECCIÓN: ARTÍCULOS POR CANTIDAD (LOTES / ENCOFRADOS)       */
            /* ============================================================== */
            <div className="space-y-5">
              {/* Desglose de Existencias por Estado */}
              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-900">
                  Desglose de Stock del Lote
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      En Bodega (Disponibles)
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-800">
                      {(product.porEstado.DISPONIBLE || 0).toLocaleString('es-NI')}
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">Listos para despachar</span>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block">
                      En Obra (Alquilados)
                    </span>
                    <span className="text-xl font-black font-mono text-blue-800">
                      {(product.porEstado.ALQUILADO || 0).toLocaleString('es-NI')}
                    </span>
                    <span className="text-[10px] text-blue-700 block mt-0.5">En manos de clientes</span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-amber-900 uppercase block">
                      Reservados
                    </span>
                    <span className="text-xl font-black font-mono text-amber-900">
                      {(product.porEstado.RESERVADO || 0).toLocaleString('es-NI')}
                    </span>
                    <span className="text-[10px] text-amber-800 block mt-0.5">En cotización ganada</span>
                  </div>

                  <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">
                      En Mantenimiento
                    </span>
                    <span className="text-xl font-black font-mono text-rose-800">
                      {(product.porEstado.EN_REPARACION || 0).toLocaleString('es-NI')}
                    </span>
                    <span className="text-[10px] text-rose-700 block mt-0.5">Revisión o limpieza</span>
                  </div>
                </div>
              </div>

              {/* Asignaciones activas por cliente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>
                      Asignaciones Activas por Cliente (
                      {unitsData?.tipoControl === 'POR_CANTIDAD'
                        ? unitsData.desglose.porCliente.length
                        : 0}
                      )
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Contratos en ejecución con este artículo asignado
                  </span>
                </div>

                {unitsData &&
                unitsData.tipoControl === 'POR_CANTIDAD' &&
                unitsData.desglose.porCliente.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unitsData.desglose.porCliente.map((c, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <span className="font-bold text-slate-900 text-xs block truncate" title={c.clienteNombre}>
                              {c.clienteNombre}
                            </span>
                            <span className="text-[11px] text-blue-700 font-mono font-bold">
                              Contrato #{c.contratoNumero}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-mono font-black text-xs shrink-0">
                            {c.cantidad} u.
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Dev: {c.fechaDevolucion || 'Indefinido'}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                            {c.estado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3 text-emerald-800">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs block">Todo el stock disponible en bodega</span>
                      <span className="text-[11px] text-emerald-700">
                        Actualmente no hay contratos activos que tengan retenidas unidades de este artículo. Todas las{' '}
                        <strong>{product.total.toLocaleString('es-NI')}</strong> unidades están listas para entrega inmediata.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
            <span>BM Construcciones · ERP Rental System</span>
            <span className="mx-2 text-slate-300">|</span>
            <span>ID: <code className="font-mono text-slate-700">{product.productoId}</code></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {!isSerialized && onAdjustQuantity && (
              <button
                type="button"
                onClick={() => onAdjustQuantity(product)}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-4 h-4" />
                <span>Ajustar Cantidad</span>
              </button>
            )}

            {isSerialized && onAddSerialUnit && (
              <button
                type="button"
                onClick={() => onAddSerialUnit(product)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Unidad</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
