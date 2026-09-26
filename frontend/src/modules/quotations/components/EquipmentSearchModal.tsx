import React, { useState, useEffect } from 'react';
import { getEquipments, getCategories } from '../../inventory/services/inventory.api';
import { getEquipmentPeriodAvailability } from '../../availability/services/availability.api';
import type { Equipment, Category } from '../../inventory/types/inventory.types';
import type { EquipmentPeriodStatus } from '../../availability/types/availability.types';
import { Search, X, Package, Calendar, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';

interface EquipmentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
  fechaInicioRenta?: string;
  fechaFinRenta?: string;
}

export const EquipmentSearchModal: React.FC<EquipmentSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  fechaInicioRenta,
  fechaFinRenta,
}) => {
  const [equipments, setEquipments] = useState<(Equipment & Partial<EquipmentPeriodStatus>)[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loadTrigger, setLoadTrigger] = useState(0);

  const hasRentalPeriod = Boolean(fechaInicioRenta && fechaFinRenta);

  const diasCalculados = React.useMemo(() => {
    if (!fechaInicioRenta || !fechaFinRenta) return 0;
    const start = new Date(fechaInicioRenta);
    const end = new Date(fechaFinRenta);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [fechaInicioRenta, fechaFinRenta]);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        setIsLoading(true);
        setApiError(null);
        try {
          const catData = await getCategories();
          setCategories(catData);

          if (hasRentalPeriod && fechaInicioRenta && fechaFinRenta) {
            const periodData = await getEquipmentPeriodAvailability(
              fechaInicioRenta,
              fechaFinRenta,
            );
            // Mapear EquipmentPeriodStatus a Equipment compatible
            const mapped = periodData.map((item) => ({
              id: item.id,
              codigo: item.codigo,
              descripcion: item.descripcion,
              modelo: item.modelo,
              numeroSerie: item.numeroSerie,
              categoriaId: item.categoriaId,
              categoria: { id: item.categoriaId, nombre: item.categoriaNombre || '' } as any,
              marca: item.marcaNombre ? ({ nombre: item.marcaNombre } as any) : undefined,
              tipoControl: item.tipoControl,
              cantidadTotal: item.cantidadTotal,
              cantidadDisponible: item.cantidadDisponibleActual,
              cantidadDisponiblePeriodo: item.cantidadDisponiblePeriodo,
              estado: (item.estadoEquipo || (item.statusPeriodo === 'OCUPADO' ? 'RENTADO' : item.statusPeriodo === 'MANTENIMIENTO' ? 'MANTENIMIENTO' : 'DISPONIBLE')) as Equipment['estado'],
              precioRentaDia: item.precioRentaDia,
              precioRentaHora: item.precioRentaHora,
              statusPeriodo: item.statusPeriodo,
              isAvailable: item.isAvailable,
              fechaEstimadaLiberacion: item.fechaEstimadaLiberacion,
              motivoOcupacion: item.motivoOcupacion,
              sucursalId: '',
              empresaId: '',
              createdAt: '',
              updatedAt: '',
            })) as (Equipment & Partial<EquipmentPeriodStatus>)[];
            setEquipments(mapped);
          } else {
            const eqData = await getEquipments();
            setEquipments(eqData as (Equipment & Partial<EquipmentPeriodStatus>)[]);
          }
        } catch (e: any) {
          console.error('Error cargando inventario o disponibilidad:', e);
          // Fail-closed estricto: limpia equipos y bloquea selección
          setEquipments([]);
          setApiError(
            e?.response?.data?.message ||
            'No fue posible consultar la disponibilidad en tiempo real. Por seguridad operacional (fail-closed), la selección de equipos queda bloqueada hasta reintentar.'
          );
        } finally {
          setIsLoading(false);
        }
      };
      load();
      setSearch('');
      setSelectedCategory('ALL');
    }
  }, [isOpen, hasRentalPeriod, fechaInicioRenta, fechaFinRenta, loadTrigger]);

  if (!isOpen) return null;

  const filtered = equipments.filter((e) => {
    const matchesCategory = selectedCategory === 'ALL' || e.categoria?.id === selectedCategory;
    if (!matchesCategory) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.descripcion && e.descripcion.toLowerCase().includes(q)) ||
      (e.modelo && e.modelo.toLowerCase().includes(q)) ||
      (e.codigo && e.codigo.toLowerCase().includes(q)) ||
      (e.numeroSerie && e.numeroSerie.toLowerCase().includes(q)) ||
      (e.marca?.nombre && e.marca.nombre.toLowerCase().includes(q))
    );
  });

  const handleEquipmentClick = (item: Equipment & Partial<EquipmentPeriodStatus>) => {
    const estadoStr = String(item.estado || '');
    const isMaint =
      item.statusPeriodo === 'MANTENIMIENTO' ||
      estadoStr === 'MANTENIMIENTO' ||
      estadoStr === 'EN_MANTENIMIENTO' ||
      estadoStr === 'FUERA_DE_SERVICIO' ||
      estadoStr === 'BAJA';

    const dispPeriodo =
      item.cantidadDisponiblePeriodo !== undefined
        ? item.cantidadDisponiblePeriodo
        : item.cantidadDisponible;

    const isOccupied = hasRentalPeriod
      ? item.statusPeriodo === 'OCUPADO' || dispPeriodo <= 0 || !item.isAvailable
      : item.cantidadDisponible <= 0 ||
        estadoStr === 'RENTADO' ||
        estadoStr === 'DESPACHADO';

    // Bloqueo estricto: no se permite agregar bajo ninguna circunstancia si no está disponible
    if (isMaint || isOccupied || dispPeriodo <= 0) {
      return;
    }

    // Disponible: seleccionar directamente
    onSelect(item as Equipment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] relative">
        {/* Cabecera del modal */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Agregar Equipo o Servicio</h3>
            <p className="text-xs text-slate-500 font-medium">
              Consulta disponibilidad y tarifas de catálogo para la cotización
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Período de Renta Activo */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          {hasRentalPeriod ? (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50/80 border border-blue-200/90 rounded-xl px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-blue-900 font-bold">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Disponibilidad calculada del{' '}
                  <span className="font-mono text-blue-800 font-black">{fechaInicioRenta}</span> al{' '}
                  <span className="font-mono text-blue-800 font-black">{fechaFinRenta}</span>
                </span>
              </div>
              <span className="text-[11px] font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                {diasCalculados} días de renta
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/80 rounded-xl px-3 py-1.5 text-xs text-blue-900 font-medium">
              <Package className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Mostrando catálogo y disponibilidad de inventario en tiempo real.
              </span>
            </div>
          )}
        </div>

        {/* Filtros de Categorías y Buscador */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({equipments.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, descripción, modelo, serie o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Listado de Equipos */}
        <div className="overflow-y-auto flex-1 p-2">
          {apiError ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-red-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-sm font-black text-slate-800">
                  Error de Consulta de Disponibilidad
                </h4>
                <p className="text-xs text-red-600 mt-1 font-medium leading-relaxed">
                  {apiError}
                </p>
                <button
                  type="button"
                  onClick={() => setLoadTrigger((prev) => prev + 1)}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  Reintentar Consulta
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Consultando inventario y disponibilidad en tiempo real...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No se encontraron equipos para el criterio seleccionado.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((e) => {
                const estadoStr = String(e.estado || '');
                const isMaint =
                  e.statusPeriodo === 'MANTENIMIENTO' ||
                  estadoStr === 'MANTENIMIENTO' ||
                  estadoStr === 'EN_MANTENIMIENTO' ||
                  estadoStr === 'FUERA_DE_SERVICIO' ||
                  estadoStr === 'BAJA';

                const dispPeriodo =
                  e.cantidadDisponiblePeriodo !== undefined
                    ? e.cantidadDisponiblePeriodo
                    : e.cantidadDisponible;

                const isOccupied = hasRentalPeriod
                  ? e.statusPeriodo === 'OCUPADO' || dispPeriodo <= 0 || !e.isAvailable
                  : e.cantidadDisponible <= 0 ||
                    estadoStr === 'RENTADO' ||
                    estadoStr === 'DESPACHADO';

                const isPartial =
                  hasRentalPeriod && e.statusPeriodo === 'PARCIAL' && dispPeriodo > 0;
                const isFree = hasRentalPeriod
                  ? e.statusPeriodo === 'DISPONIBLE' && dispPeriodo > 0
                  : !isOccupied && !isMaint && e.cantidadDisponible > 0;

                const isDisabled = isMaint || isOccupied || dispPeriodo <= 0;

                const pDia = Number(e.precioRentaDia) || 0;
                const pHora =
                  Number(e.precioRentaHora) || (pDia > 0 ? Math.round((pDia / 8) * 100) / 100 : 0);

                return (
                  <button
                    key={e.id}
                    disabled={isDisabled}
                    onClick={() => handleEquipmentClick(e)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group border ${
                      isMaint
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : isOccupied || dispPeriodo <= 0
                          ? 'bg-red-50/40 border-red-200 opacity-75 cursor-not-allowed'
                          : isPartial
                            ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-50 cursor-pointer'
                            : 'hover:bg-blue-50/60 border-slate-100 hover:border-blue-200 cursor-pointer bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          isMaint
                            ? 'bg-slate-200 border-slate-300 text-slate-500'
                            : isOccupied || dispPeriodo <= 0
                              ? 'bg-red-100 border-red-200 text-red-600'
                              : isPartial
                                ? 'bg-amber-100 border-amber-200 text-amber-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}
                      >
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {e.codigo && (
                            <span className="text-blue-700 font-mono bg-blue-100/80 px-1.5 py-0.5 rounded text-[10px] font-black">
                              {e.codigo}
                            </span>
                          )}
                          <span className="font-bold text-slate-800 text-sm truncate">
                            {e.descripcion || `${e.marca?.nombre || ''} ${e.modelo}`}
                          </span>

                          {/* Insignias de Estado de Disponibilidad */}
                          {isMaint ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-black text-[9px] uppercase border border-slate-300">
                              {estadoStr === 'EN_MANTENIMIENTO' || estadoStr === 'MANTENIMIENTO' ? 'En reparación' : estadoStr === 'BAJA' ? 'Dado de baja' : 'Fuera de servicio'}
                            </span>
                          ) : isOccupied || dispPeriodo <= 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-black text-[9px] uppercase border border-red-200">
                              🔴 {hasRentalPeriod ? 'Ocupado en ese período' : 'Sin Stock Actual'}
                            </span>
                          ) : isPartial ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[9px] uppercase border border-amber-200">
                              🟡 Parcial ({dispPeriodo} disponibles)
                            </span>
                          ) : isFree ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase border border-emerald-200">
                              🟢 {hasRentalPeriod ? 'Disponible en período' : 'Disponible'}
                            </span>
                          ) : null}
                        </div>

                        {/* Detalles del equipo y fechas */}
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <span>
                            {e.marca?.nombre} {e.modelo && e.modelo !== 'S/M' ? `· ${e.modelo}` : ''}
                          </span>
                          {e.numeroSerie && (
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                              Serie: {e.numeroSerie}
                            </span>
                          )}
                          <span className="text-slate-400">|</span>
                          <span>
                            Stock período:{' '}
                            <span
                              className={`font-black ${
                                isOccupied || dispPeriodo <= 0
                                  ? 'text-red-600'
                                  : isPartial
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {dispPeriodo} u.
                            </span>
                          </span>

                          {/* Fecha estimada de liberación si está ocupado */}
                          {isOccupied && e.fechaEstimadaLiberacion && (
                            <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-100/70 px-2 py-0.5 rounded-md text-[10px] border border-red-200">
                              <Calendar className="w-3 h-3 text-red-600" />
                              Liberación est.:{' '}
                              {new Date(e.fechaEstimadaLiberacion).toLocaleDateString('es-NI', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              <span className="text-[9px] font-normal text-red-600">(sujeta a retorno)</span>
                            </span>
                          )}

                          {/* Motivo de ocupación */}
                          {isOccupied && e.motivoOcupacion && (
                            <span className="text-[10px] text-slate-500 italic">
                              ({e.motivoOcupacion})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      {pDia > 0 && (
                        <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                          {formatCurrency(pDia)} <span className="text-[10px] text-slate-500 font-medium">/ día</span>
                        </div>
                      )}
                      {(pHora > 0 || pDia > 0) && (
                        <div className="text-[11px] font-bold text-emerald-700 font-mono">
                          {formatCurrency(pHora)} <span className="text-[10px] font-medium text-emerald-600">/ hr</span>
                        </div>
                      )}
                      {pDia <= 0 && pHora <= 0 && (
                        <div className="text-xs text-slate-400 font-medium">Sin tarifa base</div>
                      )}

                      {/* Botón de Acción */}
                      {isMaint ? (
                        <div className="text-[10px] font-black text-slate-400 mt-1 uppercase">
                          ⚙️ En Mantenimiento
                        </div>
                      ) : isOccupied || dispPeriodo <= 0 ? (
                        <div className="inline-flex items-center justify-center rounded-lg bg-red-100 border border-red-200 px-2.5 py-1 text-[11px] font-black text-red-700 mt-1 cursor-not-allowed">
                          ⛔ No Disponible
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-[11px] font-black text-white mt-1 shadow-xs transition-colors">
                          + Agregar
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
