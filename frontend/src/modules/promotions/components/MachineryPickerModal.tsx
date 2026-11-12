import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Check,
  Plus,
  Minus,
  Sparkles,
  Tag,
  CheckCircle2,
  DollarSign,
  Package,
} from 'lucide-react';
import { getEquipments, getCategories } from '../../inventory/services/inventory.api';
import type { Equipment, Category } from '../../inventory/types/inventory.types';

interface MachineryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSelection: (selected: Array<{ equipo: Equipment; cantidad: number }>) => void;
  alreadySelectedEquipmentIds?: string[];
}

export const MachineryPickerModal: React.FC<MachineryPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirmSelection,
  alreadySelectedEquipmentIds = [],
}) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mapa de selección temporal: { [equipoId]: cantidad }
  const [selectionMap, setSelectionMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([
        getEquipments().catch(() => []),
        getCategories().catch(() => []),
      ])
        .then(([eqs, cats]) => {
          setEquipments(eqs || []);
          setCategories(cats || []);
        })
        .finally(() => setIsLoading(false));

      // Inicializar con los que ya estaban seleccionados
      const initialMap: Record<string, number> = {};
      alreadySelectedEquipmentIds.forEach((id) => {
        initialMap[id] = 1;
      });
      setSelectionMap(initialMap);
      setSearch('');
      setSelectedCategory('ALL');
    }
  }, [isOpen, alreadySelectedEquipmentIds]);

  // Filtrado de equipos en vivo
  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      // Filtro por categoría
      if (selectedCategory !== 'ALL' && eq.categoriaId !== selectedCategory) {
        return false;
      }

      // Filtro de búsqueda por texto
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchCode = eq.codigo?.toLowerCase().includes(s);
        const matchDesc = eq.descripcion?.toLowerCase().includes(s);
        const matchModel = eq.modelo?.toLowerCase().includes(s);
        const matchSerie = eq.numeroSerie?.toLowerCase().includes(s);
        const matchCat = (eq.categoria as any)?.nombre?.toLowerCase().includes(s);
        return matchCode || matchDesc || matchModel || matchSerie || matchCat;
      }

      return true;
    });
  }, [equipments, selectedCategory, search]);

  if (!isOpen) return null;

  const toggleSelectEquipment = (eqId: string) => {
    setSelectionMap((prev) => {
      const copy = { ...prev };
      if (copy[eqId]) {
        delete copy[eqId];
      } else {
        copy[eqId] = 1;
      }
      return copy;
    });
  };

  const handleQuantityChange = (eqId: string, delta: number) => {
    setSelectionMap((prev) => {
      const current = prev[eqId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[eqId];
        return copy;
      }
      return { ...prev, [eqId]: next };
    });
  };

  const selectedCount = Object.keys(selectionMap).length;
  const totalUnitsSelected = Object.values(selectionMap).reduce((sum, qty) => sum + qty, 0);

  // Cálculo de valor estándar de catálogo de la selección actual
  const estimatedCatalogSum = Object.entries(selectionMap).reduce((sum, [eqId, qty]) => {
    const eq = equipments.find((e) => e.id === eqId);
    return sum + (Number(eq?.precioRentaDia) || 0) * qty;
  }, 0);

  const handleApply = () => {
    const selectedList: Array<{ equipo: Equipment; cantidad: number }> = [];
    Object.entries(selectionMap).forEach(([eqId, qty]) => {
      const eq = equipments.find((e) => e.id === eqId);
      if (eq && qty > 0) {
        selectedList.push({ equipo: eq, cantidad: qty });
      }
    });
    onConfirmSelection(selectedList);
    onClose();
  };

  const clearSelection = () => {
    setSelectionMap({});
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-slate-200">
        {/* Header Principal */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Catálogo de Maquinaria para Combo
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {equipments.length} Equipos en Inventario
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Selecciona varias maquinarias con sus cantidades antes de cerrar. Los equipos elegidos se añadirán en bloque al combo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros Rápidos */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Buscador en Vivo */}
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por código (ej. 02-115), nombre, modelo o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Contador de Selección Activa */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{selectedCount} modelos ({totalUnitsSelected} unidades)</span>
              </div>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Categorías Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Categoría:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({equipments.length})
              </button>
              {categories.map((cat) => {
                const count = equipments.filter((e) => e.categoriaId === cat.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.nombre} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Catálogo de Maquinarias (Grid / Cards) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          {isLoading ? (
            <div className="p-16 text-center text-xs font-medium text-slate-400">
              Cargando catálogo completo de maquinaria...
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="p-16 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">
                No se encontraron equipos
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Intenta con otro término de búsqueda o selecciona otra categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEquipments.map((eq) => {
                const isSelected = Boolean(selectionMap[eq.id]);
                const qty = selectionMap[eq.id] || 0;
                const tarifaNum = Number(eq.precioRentaDia) || 0;

                return (
                  <div
                    key={eq.id}
                    onClick={() => toggleSelectEquipment(eq.id)}
                    className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Código & Categoría */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                          <Tag className="w-2.5 h-2.5 text-slate-500" />
                          {eq.codigo || 'SIN-COD'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                          {(eq.categoria as any)?.nombre || 'Equipo'}
                        </span>
                      </div>

                      {/* Descripción / Modelo */}
                      <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                        {eq.descripcion || eq.modelo || 'Maquinaria sin descripción'}
                      </h4>

                      {eq.modelo && eq.descripcion && eq.modelo !== eq.descripcion && (
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                          Mod: {eq.modelo}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Tarifa y Selector de Cantidad */}
                    <div
                      className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Tarifa Catálogo
                        </span>
                        <div className="text-xs font-black text-slate-900 flex items-center">
                          <DollarSign className="w-3 h-3 text-emerald-600 inline" />
                          {tarifaNum.toFixed(2)}
                          <span className="text-[10px] text-slate-500 font-medium ml-1">/día</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1.5 bg-white border border-emerald-300 rounded-xl p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(eq.id, -1)}
                            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Disminuir cantidad"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-emerald-800">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(eq.id, 1)}
                            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Aumentar cantidad"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSelectEquipment(eq.id)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con Resumen y Botón de Aplicar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Equipos marcados: </span>
              <span className="font-black text-slate-900">
                {selectedCount} modelos ({totalUnitsSelected} piezas)
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Suma catálogo: </span>
              <span className="font-black text-emerald-700">
                ${estimatedCatalogSum.toFixed(2)}/día
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cerrar sin Cambios
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedCount === 0}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Listo, Agregar ({selectedCount}) al Combo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
