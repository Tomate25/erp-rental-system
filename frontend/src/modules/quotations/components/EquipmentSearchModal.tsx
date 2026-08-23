import React, { useState, useEffect } from 'react';
import { getEquipments, getCategories } from '../../inventory/services/inventory.api';
import type { Equipment, Category } from '../../inventory/types/inventory.types';
import { Search, X, Package } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';

interface EquipmentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
}

export const EquipmentSearchModal: React.FC<EquipmentSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        setIsLoading(true);
        try {
          const [eqData, catData] = await Promise.all([
            getEquipments(),
            getCategories()
          ]);
          setEquipments(eqData);
          setCategories(catData);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      load();
      setSearch('');
      setSelectedCategory('ALL');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = equipments.filter(e => {
    const matchesCategory = selectedCategory === 'ALL' || e.categoria?.id === selectedCategory;
    const matchesSearch = 
      e.descripcion?.toLowerCase().includes(search.toLowerCase()) || 
      e.modelo?.toLowerCase().includes(search.toLowerCase()) ||
      e.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      e.marca?.nombre.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-black text-slate-800 text-lg">Agregar Equipo o Servicio</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
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
              Todos
            </button>
            {categories.map(cat => (
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
              placeholder="Buscar por código, descripción, modelo o marca..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Cargando inventario...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No se encontraron equipos.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map(e => {
                const isOccupied = e.cantidadDisponible <= 0 || (e.estado as string) === 'RENTADO' || (e.estado as string) === 'DESPACHADO';
                return (
                  <button
                    key={e.id}
                    disabled={isOccupied}
                    onClick={() => {
                      if (isOccupied) return;
                      onSelect(e);
                      onClose();
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between group border ${
                      isOccupied 
                        ? 'bg-red-50/40 border-red-200 opacity-60 cursor-not-allowed' 
                        : 'hover:bg-blue-50 border-transparent hover:border-blue-100 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                        isOccupied ? 'bg-red-100 border-red-200 text-red-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {e.codigo && <span className="text-blue-600 font-mono bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">{e.codigo}</span>}
                          <span>{e.descripcion || `${e.marca?.nombre} ${e.modelo}`}</span>
                          {isOccupied && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-[9px] uppercase border border-red-200">
                              🔴 Ocupado / Sin Stock
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {e.marca?.nombre} · {e.modelo} | Stock Disp: <span className={`font-bold ${isOccupied ? 'text-red-600' : 'text-emerald-600'}`}>{e.cantidadDisponible} u.</span>
                          {isOccupied && <span className="text-red-600 font-bold ml-2">(Actualmente en Alquiler)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">{formatCurrency(e.precioRentaDia)} / día</div>
                      {isOccupied ? (
                        <div className="text-[10px] font-black text-red-600 mt-1 uppercase">
                          No Seleccionable
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1 uppercase">
                          Agregar
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
