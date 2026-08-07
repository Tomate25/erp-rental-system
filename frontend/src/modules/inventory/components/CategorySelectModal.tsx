import React, { useState, useEffect } from 'react';
import type { Category } from '../types/inventory.types';
import { getCategories, createCategory } from '../services/inventory.api';
import { Search, Plus, Check, X, RefreshCw } from 'lucide-react';

interface CategorySelectModalProps {
  onClose: () => void;
  onSelect: (category: Category) => void;
}

export const CategorySelectModal: React.FC<CategorySelectModalProps> = ({ onClose, onSelect }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
      setFilteredCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query === '') {
      setFilteredCategories(categories);
    } else {
      setFilteredCategories(categories.filter((c) => c.nombre.toLowerCase().includes(query)));
    }
  }, [searchQuery, categories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim() === '') return;
    setIsCreating(true);
    try {
      const cat = await createCategory(newCatName);
      onSelect(cat);
      onClose();
    } catch (err) {
      alert('Error al registrar la categoría en el catálogo.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-250 rounded-3xl p-6 shadow-2xl max-w-md w-full relative max-h-[90vh] flex flex-col">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-900">Buscar Categoría de Maquinaria</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Selecciona o da de alta una categoría en el catálogo.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador */}
        <div className="my-4 relative shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar categoría (ej: Elevación)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-205 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
            autoFocus
          />
        </div>

        {/* Listado */}
        <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[250px] pr-1 space-y-1">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold flex flex-col items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mb-2" />
              Cargando catálogo...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs italic">
              No se encontraron resultados en el catálogo.
            </div>
          ) : (
            filteredCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between group transition-all"
              >
                <span>{c.nombre}</span>
                <Check className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>

        {/* Creación rápida */}
        <form onSubmit={handleCreateCategory} className="border-t border-slate-100 pt-4 mt-4 shrink-0 space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Crear y seleccionar categoría nueva</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría (ej: Demolición)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50/50 border border-slate-205 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={isCreating || newCatName.trim() === ''}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-1 transition-colors disabled:opacity-50 font-sans"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
