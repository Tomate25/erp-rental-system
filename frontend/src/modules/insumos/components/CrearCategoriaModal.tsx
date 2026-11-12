import React, { useState } from 'react';
import { X, Tag, Plus, AlertTriangle, Check } from 'lucide-react';
import { createCategoriaInsumo } from '../services/insumo.api';
import type { CategoriaInsumoRecord } from '../types/insumo.types';

interface CrearCategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (categoria: CategoriaInsumoRecord) => void;
}

const COLORES_SUGERIDOS = [
  { label: 'Zinc / Neutro', value: 'zinc', bg: 'bg-zinc-100 text-zinc-800 border-zinc-300' },
  { label: 'Azul / Eléctrico', value: 'blue', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'Ámbar / Lubricante', value: 'amber', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { label: 'Esmeralda / Filtros', value: 'emerald', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'Rojo / Desgaste', value: 'rose', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: 'Púrpura / Herramientas', value: 'purple', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
];

export const CrearCategoriaModal: React.FC<CrearCategoriaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('zinc');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await createCategoriaInsumo({
        nombre: nombre.trim().toUpperCase(),
        descripcion: descripcion.trim() || undefined,
        color,
      });

      onSuccess(res);
      setNombre('');
      setDescripcion('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la categoría.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-white rounded-xl shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900">
                Nueva Categoría de Insumos
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                Creación instantánea para clasificar consumibles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">
              Nombre de la Categoría <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. SISTEMA ELÉCTRICO / LLANTAS / PINTURA"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-bold uppercase"
            />
            <span className="text-[10px] text-zinc-400 block">
              Se guardará automáticamente en mayúsculas para mantener consistencia.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">
              Descripción o Alcance (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Baterías, alternadores, arrancadores, cableado y fusibles de maquinaria."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">
              Color o Distintivo Visual
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLORES_SUGERIDOS.map((c) => {
                const isSelected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      c.bg
                    } ${isSelected ? 'ring-2 ring-zinc-900 shadow-xs' : 'opacity-80 hover:opacity-100'}`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline" />}
                    <span>{c.label.split('/')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Categoría'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
