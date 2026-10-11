import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';

export interface InventoryFilterValues {
  query: string;
  familia: string;
  estado: string;
  marca: string;
}

interface InventoryFiltersProps {
  values: InventoryFilterValues;
  onChange: (newValues: InventoryFilterValues) => void;
  familias: string[];
  marcas: string[];
  estados?: Array<{ value: string; label: string }>;
  className?: string;
}

const DEFAULT_ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'DISPONIBLE', label: '🟢 Disponibles' },
  { value: 'ALQUILADO', label: '🔵 Alquilados' },
  { value: 'RESERVADO', label: '🟠 Reservados' },
  { value: 'EN_REPARACION', label: '🔴 En reparación' },
  { value: 'BAJA', label: '⚪ Dados de baja' },
];

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  values,
  onChange,
  familias,
  marcas,
  estados = DEFAULT_ESTADOS,
  className = '',
}) => {
  // Estado local para input de búsqueda con debounce de 300ms
  const [localSearch, setLocalSearch] = useState(values.query);

  useEffect(() => {
    setLocalSearch(values.query);
  }, [values.query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== values.query) {
        onChange({ ...values, query: localSearch });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, values, onChange]);

  const handleClearSearch = () => {
    setLocalSearch('');
    onChange({ ...values, query: '' });
  };

  const handleSelectChange = (field: keyof Omit<InventoryFilterValues, 'query'>, val: string) => {
    onChange({ ...values, [field]: val });
  };

  const hasActiveFilters = Boolean(
    values.query || values.familia || values.estado || values.marca
  );

  const handleResetAll = () => {
    setLocalSearch('');
    onChange({
      query: '',
      familia: '',
      estado: '',
      marca: '',
    });
  };

  return (
    <div
      className={`bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between ${className}`}
    >
      {/* Buscador con debounce de 300ms */}
      <div className="relative w-full md:max-w-md">
        <label htmlFor="inventory-search-input" className="sr-only">
          Buscar por código, descripción o serie
        </label>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" aria-hidden="true" />
        </div>
        <input
          id="inventory-search-input"
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar por código, descripción o serie..."
          className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selectores de Filtro */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Familia */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <label htmlFor="filter-familia" className="sr-only">
            Filtrar por familia
          </label>
          <select
            id="filter-familia"
            value={values.familia}
            onChange={(e) => handleSelectChange('familia', e.target.value)}
            className="bg-transparent focus:outline-none font-semibold text-slate-800 cursor-pointer pr-1"
          >
            <option value="">Todas las familias</option>
            {familias.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Marca */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <label htmlFor="filter-marca" className="sr-only">
            Filtrar por marca
          </label>
          <select
            id="filter-marca"
            value={values.marca}
            onChange={(e) => handleSelectChange('marca', e.target.value)}
            className="bg-transparent focus:outline-none font-semibold text-slate-800 cursor-pointer pr-1"
          >
            <option value="">Todas las marcas</option>
            {marcas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <label htmlFor="filter-estado" className="sr-only">
            Filtrar por estado
          </label>
          <select
            id="filter-estado"
            value={values.estado}
            onChange={(e) => handleSelectChange('estado', e.target.value)}
            className="bg-transparent focus:outline-none font-semibold text-slate-800 cursor-pointer pr-1"
          >
            {estados.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botón Reset si hay filtros aplicados */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
};
