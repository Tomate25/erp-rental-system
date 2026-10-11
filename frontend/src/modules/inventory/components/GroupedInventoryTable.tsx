import React, { useState } from 'react';
import type {
  GroupedProduct,
  ProductUnitsResponse,
  SerialUnitItem,
} from '../types/grouped-inventory.types';
import { OccupancyBar } from './OccupancyBar';
import { StatusChips } from './StatusChips';
import {
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Clock,
  Layers,
  AlertTriangle,
  RotateCcw,
  Search,
  Plus,
} from 'lucide-react';

export type GroupedSortField = 'nombre' | 'total' | 'ocupacion';
export type GroupedSortDirection = 'asc' | 'desc';

interface GroupedInventoryTableProps {
  products: GroupedProduct[];
  expandedUnitsMap: Record<string, ProductUnitsResponse>;
  loadingUnitsMap: Record<string, boolean>;
  onToggleExpand: (productoId: string) => void;
  onSelectUnit: (unit: SerialUnitItem | { codigo: string; nombre: string; productoId: string }) => void;
  onAddSerialUnit?: (product: GroupedProduct) => void;
  onAdjustQuantity?: (product: GroupedProduct) => void;
  sortField: GroupedSortField;
  sortDirection: GroupedSortDirection;
  onSortChange: (field: GroupedSortField) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const GroupedInventoryTable: React.FC<GroupedInventoryTableProps> = ({
  products,
  expandedUnitsMap,
  loadingUnitsMap,
  onToggleExpand,
  onSelectUnit,
  onAddSerialUnit,
  onAdjustQuantity,
  sortField,
  sortDirection,
  onSortChange,
  isLoading = false,
  error = null,
  onRetry,
  className = '',
}) => {
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  const handleRowToggle = (productoId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productoId)) {
        next.delete(productoId);
      } else {
        next.add(productoId);
      }
      return next;
    });
    onToggleExpand(productoId);
  };

  const getSortIcon = (field: GroupedSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

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
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Estado de error
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Error al cargar inventario</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors focus:ring-2 focus:ring-rose-500"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reintentar
          </button>
        )}
      </div>
    );
  }

  // Estado de carga Skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-slate-100">
            <div className="space-y-2 w-1/3">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
            <div className="h-6 bg-slate-200 rounded w-20" />
            <div className="h-6 bg-slate-100 rounded w-28" />
            <div className="h-3 bg-slate-200 rounded w-36" />
          </div>
        ))}
      </div>
    );
  }

  // Estado vacío
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No hay artículos con estos filtros</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Verifica los términos de búsqueda, la familia o el estado seleccionado para encontrar equipos.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ============================================================== */}
      {/* VISTA ESCRITORIO (md y superior): TABLA CON ROWS EXPANDIBLES   */}
      {/* ============================================================== */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-4 w-12 text-center">
                  <span className="sr-only">Expandir / Colapsar</span>
                </th>
                <th scope="col" className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => onSortChange('nombre')}
                    className="group inline-flex items-center gap-1.5 font-bold hover:text-slate-900 focus:outline-none"
                  >
                    <span>Producto Normalizado</span>
                    {getSortIcon('nombre')}
                  </button>
                </th>
                <th scope="col" className="py-3.5 px-3">
                  Familia
                </th>
                <th scope="col" className="py-3.5 px-3">
                  Tarifa
                </th>
                <th scope="col" className="py-3.5 px-3">
                  <button
                    type="button"
                    onClick={() => onSortChange('total')}
                    className="group inline-flex items-center gap-1.5 font-bold hover:text-slate-900 focus:outline-none"
                  >
                    <span>Total</span>
                    {getSortIcon('total')}
                  </button>
                </th>
                <th scope="col" className="py-3.5 px-3">
                  Desglose por Estado
                </th>
                <th scope="col" className="py-3.5 px-4 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => onSortChange('ocupacion')}
                    className="group inline-flex items-center gap-1.5 font-bold hover:text-slate-900 focus:outline-none"
                  >
                    <span>% Ocupación / Ocupadas</span>
                    {getSortIcon('ocupacion')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {products.map((p) => {
                const isExpanded = expandedProductIds.has(p.productoId);
                const unitsData = expandedUnitsMap[p.productoId];
                const isLoadingUnits = Boolean(loadingUnitsMap[p.productoId]);

                return (
                  <React.Fragment key={p.productoId}>
                    {/* Fila Principal del Producto */}
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isExpanded ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRowToggle(p.productoId)}
                          aria-expanded={isExpanded}
                          aria-controls={`units-detail-${p.productoId}`}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title={isExpanded ? 'Colapsar unidades' : 'Expandir unidades'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{p.nombre}</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            {p.marca !== 'N/D' ? p.marca : ''}{' '}
                            {p.tipoControl === 'SERIALIZADO' ? '(Serializado)' : '(Por cantidad)'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{p.familia}</td>
                      <td className="py-3 px-3">
                        {p.tarifa === 'HORA' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3" /> Por hora
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                            <Layers className="w-3 h-3 text-slate-400" /> Por día
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-sm">
                        {p.total.toLocaleString('es-NI')}
                      </td>
                      <td className="py-3 px-3">
                        <StatusChips counts={p.porEstado} compact={true} />
                      </td>
                      <td className="py-3 px-4">
                        <OccupancyBar
                          counts={p.porEstado}
                          total={p.total}
                          rentedPercentage={p.porcentajeRentado}
                        />
                      </td>
                    </tr>

                    {/* Subfila Expandida */}
                    {isExpanded && (
                      <tr id={`units-detail-${p.productoId}`} className="bg-slate-50/50">
                        <td colSpan={7} className="p-4 pl-12 border-t border-slate-100">
                          {isLoadingUnits ? (
                            <div className="py-4 text-center text-slate-400 text-xs animate-pulse">
                              Consultando inventario de {p.nombre}...
                            </div>
                          ) : !unitsData ? (
                            <div className="py-3 text-center text-slate-400 text-xs italic">
                              No hay registros de unidades disponibles para este producto.
                            </div>
                          ) : unitsData.tipoControl === 'SERIALIZADO' ? (
                            /* Subtabla para Equipos con Serie */
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                              <div className="px-3.5 py-2 bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 flex items-center justify-between">
                                <span>Unidades serializadas de {p.nombre} ({unitsData.unidades.length})</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Haz clic en una unidad para ver detalles</span>
                                  {onAddSerialUnit && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAddSerialUnit(p);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                                      title="Agregar nueva unidad con número de serie a este producto"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Agregar unidad</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                                    <th scope="col" className="py-2 px-3">Código</th>
                                    <th scope="col" className="py-2 px-3">Marca / Modelo</th>
                                    <th scope="col" className="py-2 px-3">Serie</th>
                                    <th scope="col" className="py-2 px-3">Estado</th>
                                    <th scope="col" className="py-2 px-3">Cliente / Asignación</th>
                                    <th scope="col" className="py-2 px-3">Contrato</th>
                                    <th scope="col" className="py-2 px-3">F. Devolución</th>
                                    <th scope="col" className="py-2 px-2 text-center">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {unitsData.unidades.map((unit) => (
                                    <tr
                                      key={unit.id}
                                      onClick={() => onSelectUnit(unit)}
                                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                                    >
                                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                        {unit.codigo}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-800">
                                        {unit.marca} {unit.modelo ? `· ${unit.modelo}` : ''}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-slate-600">
                                        {unit.serie || 'S/N'}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUnitStatusBadge(
                                            unit.estado
                                          )}`}
                                        >
                                          {unit.estado}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 font-medium text-slate-800">
                                        {unit.clienteAsignado || (
                                          <span className="text-slate-400 italic">En Bodega</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-slate-700">
                                        {unit.contratoNumero ? `#${unit.contratoNumero}` : '---'}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                        {unit.fechaDevolucion || '---'}
                                      </td>
                                      <td className="py-2.5 px-2 text-center">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectUnit(unit);
                                          }}
                                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                          title="Ver detalle"
                                        >
                                          <Info className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            /* Desglose para Artículos por Cantidad */
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Desglose de Lote: {p.nombre}
                                  </span>
                                  {onAdjustQuantity && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAdjustQuantity(p);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                                      title="Ajustar inventario por cantidad (compras, reposición, bajas)"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Ajustar cantidad</span>
                                    </button>
                                  )}
                                </div>
                                <StatusChips counts={unitsData.desglose.porEstado} />
                              </div>

                              <div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">
                                  Asignaciones activas por cliente ({unitsData.desglose.porCliente.length}):
                                </span>
                                {unitsData.desglose.porCliente.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {unitsData.desglose.porCliente.map((c, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-slate-800 truncate">
                                            {c.clienteNombre}
                                          </span>
                                          <span className="font-mono font-bold text-blue-700">
                                            {c.cantidad} u.
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                          <span>Contrato #{c.contratoNumero}</span>
                                          <span>Dev: {c.fechaDevolucion || 'Indefinido'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">
                                    Todo el stock se encuentra actualmente en bodega o sin contratos vigentes.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VISTA MÓVIL (< md): TARJETAS RESPONSIVE CON BARRA DE OCUPACIÓN */}
      {/* ============================================================== */}
      <div className="md:hidden space-y-3">
        {products.map((p) => {
          const isExpanded = expandedProductIds.has(p.productoId);
          const unitsData = expandedUnitsMap[p.productoId];
          const isLoadingUnits = Boolean(loadingUnitsMap[p.productoId]);

          return (
            <div
              key={p.productoId}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
            >
              {/* Encabezado tarjeta */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">{p.nombre}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{p.familia}</span>
                    <span className="text-slate-300">·</span>
                    {p.tarifa === 'HORA' ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        Por hora
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        Por día
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono text-slate-900">
                    {p.total}
                  </span>
                  <span className="text-[10px] text-slate-400 block uppercase">Total u.</span>
                </div>
              </div>

              {/* Chips y Barra */}
              <StatusChips counts={p.porEstado} compact={true} />
              <OccupancyBar
                counts={p.porEstado}
                total={p.total}
                rentedPercentage={p.porcentajeRentado}
              />

              {/* Botón de expandir */}
              <button
                type="button"
                onClick={() => handleRowToggle(p.productoId)}
                aria-expanded={isExpanded}
                className="w-full mt-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
              >
                <span>{isExpanded ? 'Ocultar unidades' : 'Ver desglose de unidades'}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {/* Detalle desplegado en móvil */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  {isLoadingUnits ? (
                    <div className="text-center text-xs text-slate-400 py-2">Cargando...</div>
                  ) : !unitsData ? (
                    <div className="text-center text-xs text-slate-400 py-2 italic">Sin datos</div>
                  ) : unitsData.tipoControl === 'SERIALIZADO' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[11px] font-bold text-slate-700">Unidades con serie ({unitsData.unidades.length})</span>
                        {onAddSerialUnit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddSerialUnit(p);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Unidad
                          </button>
                        )}
                      </div>
                      {unitsData.unidades.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => onSelectUnit(u)}
                          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div>
                            <span className="font-mono font-bold text-blue-700 block">{u.codigo}</span>
                            <span className="text-slate-600 text-[11px]">
                              {u.clienteAsignado ? `Rentado a: ${u.clienteAsignado}` : 'En bodega'}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUnitStatusBadge(
                              u.estado
                            )}`}
                          >
                            {u.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[11px] font-bold text-slate-700">Lote por cantidad</span>
                        {onAdjustQuantity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAdjustQuantity(p);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Ajustar
                          </button>
                        )}
                      </div>
                      {unitsData.desglose.porCliente.map((c, idx) => (
                        <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>{c.clienteNombre}</span>
                            <span className="font-mono text-blue-700">{c.cantidad} u.</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Contrato #{c.contratoNumero}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
