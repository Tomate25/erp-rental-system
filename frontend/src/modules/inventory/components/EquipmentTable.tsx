import React, { useState } from 'react';
import type { Equipment } from '../types/inventory.types';
import { Edit2, Trash2, Wrench, ArrowUpDown, ArrowUp, ArrowDown, Package } from 'lucide-react';

interface EquipmentTableProps {
  equipments: Equipment[];
  viewMode?: 'table' | 'grid';
  onEdit: (equipment: Equipment) => void;
  onDelete: (id: string) => void;
}

type SortField = 'modelo' | 'categoria' | 'subcategoria' | 'marca' | 'cantidad' | 'precio' | 'estado';
type SortDirection = 'asc' | 'desc';

export const EquipmentTable: React.FC<EquipmentTableProps> = ({ equipments, viewMode = 'table', onEdit, onDelete }) => {
  const [sortField, setSortField] = useState<SortField>('modelo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'DISPONIBLE':
        return 'bg-[#1A73E8]/10 text-[#1A73E8] border-[#1A73E8]/20';
      case 'RESERVADO':
        return 'bg-[#37474F]/10 text-[#37474F] border-[#37474F]/20';
      case 'RENTADO':
        return 'bg-[#1A73E8] text-white border-[#1A73E8]';
      case 'RETORNO':
        return 'bg-[#C55500]/10 text-[#C55500] border-[#C55500]/20';
      case 'MANTENIMIENTO':
        return 'bg-[#C55500] text-white border-[#C55500]';
      case 'BAJA':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-[#747780]/10 text-[#747780] border-[#747780]/20';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount);
  };

  // Ordenamiento dinámico
  const sortedEquipments = [...equipments].sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';

    switch (sortField) {
      case 'modelo':
        aVal = a.modelo.toLowerCase();
        bVal = b.modelo.toLowerCase();
        break;
      case 'categoria':
        aVal = (a.categoria?.nombre || '').toLowerCase();
        bVal = (b.categoria?.nombre || '').toLowerCase();
        break;
      case 'subcategoria':
        aVal = (a.subcategoria?.nombre || '').toLowerCase();
        bVal = (b.subcategoria?.nombre || '').toLowerCase();
        break;
      case 'marca':
        aVal = (a.marca?.nombre || '').toLowerCase();
        bVal = (b.marca?.nombre || '').toLowerCase();
        break;
      case 'cantidad':
        aVal = a.cantidadDisponible;
        bVal = b.cantidadDisponible;
        break;
      case 'precio':
        aVal = a.precioRentaDia;
        bVal = b.precioRentaDia;
        break;
      case 'estado':
        aVal = a.estado;
        bVal = b.estado;
        break;
      default:
        aVal = a.modelo.toLowerCase();
        bVal = b.modelo.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-[#747780]/50 group-hover:text-[#1B1D22] transition-colors" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#1A73E8]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#1A73E8]" />
    );
  };

  if (equipments.length === 0) {
    return (
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-10 sm:p-16 text-center shadow-xs font-sans">
        <div className="p-4 rounded-2xl bg-[#E8F0FE] inline-flex items-center justify-center text-[#1A73E8] mb-4 border border-[#1A73E8]/10">
          <Wrench className="w-8 h-8" />
        </div>
        <h3 className="text-sm sm:text-base font-extrabold text-[#1B1D22]">No hay maquinaria registrada</h3>
        <p className="text-xs text-[#747780] max-w-sm mx-auto mt-1 leading-relaxed font-medium">
          Comienza registrando tus productos y equipos organizados en Categorías y Subcategorías.
        </p>
      </div>
    );
  }

  // --- MODO 2: CASILLA / CUADRÍCULA (GRID TARJETAS) ---
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 font-sans animate-fadeIn">
        {sortedEquipments.map((eq) => (
          <div
            key={eq.id}
            className="bg-white border border-[#E5E8EE] hover:border-[#1A73E8]/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#F4F6F9] border border-[#E5E8EE] flex items-center justify-center text-[#1A73E8] shrink-0 group-hover:bg-[#E8F0FE] group-hover:border-[#1A73E8]/20 transition-all">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block">
                      {eq.categoria?.nombre || 'General'}
                    </span>
                    <h4 className="font-black text-[#1B1D22] text-sm leading-tight line-clamp-1">
                      {eq.modelo}
                    </h4>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${getStatusBadge(eq.estado)}`}>
                  {eq.estado}
                </span>
              </div>

              {/* Badges de Subcategoría y Código */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {eq.subcategoria?.nombre && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#F4F6F9] text-[#37474F] border border-[#E5E8EE] text-[9px] font-bold">
                    {eq.subcategoria.nombre}
                  </span>
                )}
                {eq.marca?.nombre && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#37474F]/5 text-[#37474F] border border-[#E5E8EE] text-[9px] font-bold">
                    {eq.marca.nombre}
                  </span>
                )}
                {eq.codigo && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/20 text-[9px] font-mono font-black">
                    {eq.codigo}
                  </span>
                )}
              </div>

              {/* Descripción breve si existe */}
              {eq.descripcion && (
                <p className="text-xs text-[#747780] font-medium line-clamp-2 mb-3 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E5E8EE]/60 italic">
                  "{eq.descripcion}"
                </p>
              )}

              {/* Especificaciones clave */}
              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-[#E5E8EE] pt-3 mb-3">
                <div>
                  <span className="text-[#747780] font-extrabold text-[9px] uppercase block">Estado de Stock</span>
                  <div className="space-y-0.5 mt-0.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#1A73E8]">🟢 {eq.cantidadDisponible} Disp.</span>
                      <span className="text-[#747780] font-mono text-[10px]">Total: {eq.cantidadTotal}</span>
                    </div>
                    {eq.cantidadTotal - eq.cantidadDisponible > 0 ? (
                      <span className="text-red-600 font-extrabold block text-[10px]">
                        🔴 {eq.cantidadTotal - eq.cantidadDisponible} En Uso (Alquilados)
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold block text-[10px]">
                        100% Disponible
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[#747780] font-extrabold text-[9px] uppercase block">Serie / Horómetro</span>
                  <span className="font-mono text-[#1B1D22] font-extrabold block text-xs truncate">
                    {eq.numeroSerie || 'S/N'}
                  </span>
                  <span className="text-[10px] text-[#747780] font-medium block">
                    {eq.horometro} hrs uso
                  </span>
                </div>
              </div>
            </div>

            {/* Footer de Tarjeta: Precio y Acciones */}
            <div className="border-t border-[#E5E8EE] pt-3 flex items-center justify-between mt-1">
              <div>
                <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Tarifa de Renta</span>
                <span className="text-base font-black text-[#1B1D22] font-mono">
                  {formatCurrency(eq.precioRentaDia)}
                  <span className="text-[10px] font-normal text-[#747780] font-sans"> /día</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onEdit(eq)}
                  className="p-2 rounded-xl border border-[#E5E8EE] text-[#37474F] hover:text-[#1A73E8] hover:bg-[#E8F0FE] hover:border-[#1A73E8]/30 transition-all"
                  title="Editar ficha del equipo"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(eq.id)}
                  className="p-2 rounded-xl border border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] hover:border-[#C55500]/30 transition-all"
                  title="Eliminar activo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    );
  }

  // --- MODO 1: TABLA / LISTA CON ORDENAMIENTO EN ENCABEZADOS ---
  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      
      {/* Vista Escritorio: Tabla Completa con Encabezados Ordenables */}
      <div className="bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] uppercase tracking-wider text-[10px] font-extrabold select-none">
                
                {/* Categoría */}
                <th
                  onClick={() => handleSort('categoria')}
                  className="p-3.5 cursor-pointer hover:bg-[#E5E8EE]/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Categoría</span>
                    {renderSortIcon('categoria')}
                  </div>
                </th>

                {/* Subcategoría */}
                <th
                  onClick={() => handleSort('subcategoria')}
                  className="p-3.5 cursor-pointer hover:bg-[#E5E8EE]/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Subcategoría</span>
                    {renderSortIcon('subcategoria')}
                  </div>
                </th>

                {/* Producto / Modelo */}
                <th
                  onClick={() => handleSort('modelo')}
                  className="p-3.5 cursor-pointer hover:bg-[#E5E8EE]/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Producto / Modelo</span>
                    {renderSortIcon('modelo')}
                  </div>
                </th>

                {/* Marca */}
                <th
                  onClick={() => handleSort('marca')}
                  className="p-3.5 cursor-pointer hover:bg-[#E5E8EE]/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Marca</span>
                    {renderSortIcon('marca')}
                  </div>
                </th>

                {/* Serie */}
                <th className="p-3.5">
                  <span>Serie</span>
                </th>

                {/* Stock (Cantidad) */}
                <th
                  onClick={() => handleSort('cantidad')}
                  className="p-3.5 text-center cursor-pointer hover:bg-[#E5E8EE]/50 transition-colors group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Stock (Disp / Total)</span>
                    {renderSortIcon('cantidad')}
                  </div>
                </th>

                {/* Precio Renta Día */}
                <th
                  onClick={() => handleSort('precio')}
                  className="p-3.5 text-right cursor-pointer hover:bg-[#E5E8EE]/50 transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Renta / Día ($)</span>
                    {renderSortIcon('precio')}
                  </div>
                </th>

                {/* Estado */}
                <th
                  onClick={() => handleSort('estado')}
                  className="p-3.5 text-center cursor-pointer hover:bg-[#E5E8EE]/50 transition-colors group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Estado</span>
                    {renderSortIcon('estado')}
                  </div>
                </th>

                {/* Acciones */}
                <th className="p-3.5 text-right">
                  <span>Acciones</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E5E8EE] text-[#37474F] font-medium">
              {sortedEquipments.map((eq) => (
                <tr key={eq.id} className="hover:bg-[#F8FAFC] transition-colors">
                  
                  {/* Categoría */}
                  <td className="p-3.5 font-extrabold text-[#1A73E8]">
                    {eq.categoria?.nombre || '-'}
                  </td>

                  {/* Subcategoría */}
                  <td className="p-3.5">
                    {eq.subcategoria?.nombre ? (
                      <span className="px-2 py-0.5 rounded-lg bg-[#F4F6F9] border border-[#E5E8EE] text-[#37474F] font-bold text-[10px]">
                        {eq.subcategoria.nombre}
                      </span>
                    ) : (
                      <span className="text-[#747780] text-[10px] italic">General</span>
                    )}
                  </td>

                  {/* Producto / Modelo */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      {eq.codigo && (
                        <span className="px-1.5 py-0.5 rounded bg-[#E8F0FE] border border-[#1A73E8]/20 text-[#1A73E8] text-[9px] font-black font-mono">
                          {eq.codigo}
                        </span>
                      )}
                      <div className="font-black text-[#1B1D22] text-xs">
                        {eq.modelo}
                      </div>
                    </div>
                    {eq.descripcion && (
                      <div className="text-[10px] text-[#747780] font-normal mt-0.5 line-clamp-1">
                        {eq.descripcion}
                      </div>
                    )}
                  </td>

                  {/* Marca */}
                  <td className="p-3.5 font-bold text-[#37474F]">
                    {eq.marca?.nombre}
                  </td>

                  {/* Serie */}
                  <td className="p-3.5 font-mono text-[#747780]">
                    {eq.numeroSerie || <span className="text-[#747780]">-</span>}
                  </td>

                  {/* Stock (Disponibles vs En Uso) */}
                  <td className="p-3.5 text-center font-bold text-[#1B1D22]">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[#1A73E8] font-black">{eq.cantidadDisponible} Disp.</span>
                        <span className="text-[#747780] font-normal">/ {eq.cantidadTotal} Tot.</span>
                      </div>
                      {eq.cantidadTotal - eq.cantidadDisponible > 0 ? (
                        <span className="px-1.5 py-0.2 rounded bg-red-50 text-red-600 text-[9px] font-black border border-red-200 mt-0.5">
                          🔴 {eq.cantidadTotal - eq.cantidadDisponible} En Uso (Alquilados)
                        </span>
                      ) : (
                        <span className="text-[9px] text-emerald-600 font-bold mt-0.5">
                          🟢 100% Disponible
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Tarifa */}
                  <td className="p-3.5 text-right font-black text-[#1B1D22] font-mono">
                    {formatCurrency(eq.precioRentaDia)}
                  </td>

                  {/* Estado */}
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadge(eq.estado)}`}>
                      {eq.estado}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(eq)}
                        className="p-1.5 rounded-lg border border-[#E5E8EE] text-[#747780] hover:text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors"
                        title="Editar activo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(eq.id)}
                        className="p-1.5 rounded-lg border border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-colors"
                        title="Eliminar activo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
