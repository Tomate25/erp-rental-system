import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { equipmentSchema } from '../validators/inventory.validator';
import type { EquipmentFormValues } from '../validators/inventory.validator';
import type { Equipment, Category, Brand } from '../types/inventory.types';
import { createEquipment, updateEquipment } from '../services/inventory.api';
import { BrandSelectModal } from './BrandSelectModal';
import { CategorySelectModal } from './CategorySelectModal';
import { Check, AlertTriangle, FileText, Search, Tag } from 'lucide-react';

interface EquipmentFormProps {
  initialData?: Equipment | null;
  sucursales: { id: string; nombre: string }[];
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  initialData,
  sucursales,
  onCancel,
  onSubmitSuccess
}) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para modales Ajax de selección
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Nombres seleccionados visualmente
  const [selectedBrandName, setSelectedBrandName] = useState(initialData?.marca?.nombre || '');
  const [selectedCatName, setSelectedCatName] = useState(initialData?.categoria?.nombre || '');

  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      codigo: initialData?.codigo || '',
      modelo: initialData?.modelo || '',
      numeroSerie: initialData?.numeroSerie || '',
      categoriaId: initialData?.categoriaId || '',
      marcaId: initialData?.marcaId || '',
      precioRentaDia: initialData?.precioRentaDia || 0,
      cantidadTotal: initialData?.cantidadTotal ?? 1,
      cantidadDisponible: initialData?.cantidadDisponible ?? 1,
      horometro: initialData?.horometro || 0,
      sucursalId: initialData?.sucursalId || (sucursales[0]?.id || ''),
      descripcion: initialData?.descripcion || '',
      estado: initialData?.estado || 'DISPONIBLE',
    },
  });

  const onSubmit = async (data: EquipmentFormValues) => {
    setIsLoading(true);
    setApiError(null);

    try {
      if (isEditMode && initialData) {
        await updateEquipment(initialData.id, data);
      } else {
        await createEquipment(data);
      }
      onSubmitSuccess();
    } catch (error: any) {
      if (error.response?.data?.message) {
        const errMsg = error.response.data.message;
        setApiError(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      } else {
        setApiError('Ocurrió un error al guardar el equipo. Por favor verifica los datos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBrand = (brand: Brand) => {
    setValue('marcaId', brand.id, { shouldValidate: true });
    setSelectedBrandName(brand.nombre);
  };

  const handleSelectCategory = (cat: Category) => {
    setValue('categoriaId', cat.id, { shouldValidate: true });
    setSelectedCatName(cat.nombre);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">
            {isEditMode ? 'Editar Ficha del Activo' : 'Dar de Alta Equipo en Inventario'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registra el número de serie, modelo, marca y tarifas diarias para rentas y control de horómetro.
          </p>
        </div>

        {apiError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Grid del Formulario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Marca (Selección AJAX Modal) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Marca / Fabricante
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                placeholder="Haz clic en Buscar..."
                value={selectedBrandName}
                className={`flex-1 px-3 py-2 bg-slate-50/70 border rounded-xl text-xs text-slate-800 font-bold placeholder-slate-400 focus:outline-none ${
                  errors.marcaId ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-250 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-colors font-sans"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>
            {errors.marcaId && <p className="text-[10px] text-red-650 mt-1">{errors.marcaId.message}</p>}
          </div>

          {/* Código de Activo */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Código de Activo
            </label>
            <input
              type="text"
              {...register('codigo')}
              placeholder="Ej. 01-02, 02-64"
              className={`w-full px-3 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.codigo ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {errors.codigo && <p className="text-[10px] text-red-650 mt-1">{errors.codigo.message}</p>}
          </div>

          {/* Modelo */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Modelo
            </label>
            <input
              type="text"
              {...register('modelo')}
              placeholder="Ej. 320D, S70, Genie 1930"
              className={`w-full px-3 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.modelo ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {errors.modelo && <p className="text-[10px] text-red-600 mt-1">{errors.modelo.message}</p>}
          </div>

          {/* Categoría (Selección AJAX Modal) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Categoría de Maquinaria
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                placeholder="Haz clic en Buscar..."
                value={selectedCatName}
                className={`flex-1 px-3 py-2 bg-slate-50/70 border rounded-xl text-xs text-slate-800 font-bold placeholder-slate-400 focus:outline-none ${
                  errors.categoriaId ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsCatModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-250 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-colors font-sans"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>
            {errors.categoriaId && <p className="text-[10px] text-red-655 mt-1">{errors.categoriaId.message}</p>}
          </div>

          {/* Número de Serie */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Número de Serie (Opcional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                {...register('numeroSerie')}
                placeholder="Ej. CAT0320D123456"
                className={`w-full pl-9 pr-4 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                  errors.numeroSerie ? 'border-red-300' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.numeroSerie && <p className="text-[10px] text-red-650 mt-1">{errors.numeroSerie.message}</p>}
          </div>

          {/* Tarifa por Día */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Precio de Renta por Día ($)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('precioRentaDia', { valueAsNumber: true })}
              placeholder="0.00"
              className={`w-full px-3 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.precioRentaDia ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {errors.precioRentaDia && <p className="text-[10px] text-red-650 mt-1">{errors.precioRentaDia.message}</p>}
          </div>

          {/* Cantidad Total */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cantidad Total
            </label>
            <input
              type="number"
              {...register('cantidadTotal', { valueAsNumber: true })}
              placeholder="1"
              className={`w-full px-3 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.cantidadTotal ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {errors.cantidadTotal && <p className="text-[10px] text-red-650 mt-1">{errors.cantidadTotal.message}</p>}
          </div>

          {/* Cantidad Disponible */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cantidad Disponible
            </label>
            <input
              type="number"
              {...register('cantidadDisponible', { valueAsNumber: true })}
              placeholder="1"
              className={`w-full px-3 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.cantidadDisponible ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {errors.cantidadDisponible && <p className="text-[10px] text-red-650 mt-1">{errors.cantidadDisponible.message}</p>}
          </div>

          {/* Horómetro */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Horómetro Actual (Horas)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('horometro', { valueAsNumber: true })}
              placeholder="0.0"
              className={`w-full px-3 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.horometro ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {errors.horometro && <p className="text-[10px] text-red-650 mt-1">{errors.horometro.message}</p>}
          </div>

          {/* Asignación de Sucursal */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sucursal de Asignación
            </label>
            <select
              {...register('sucursalId')}
              className={`w-full px-3 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.sucursalId ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {errors.sucursalId && <p className="text-[10px] text-red-650 mt-1">{errors.sucursalId.message}</p>}
          </div>

          {/* Estado */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Estado de Disponibilidad
            </label>
            <select
              {...register('estado')}
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              disabled={!isEditMode}
            >
              <option value="DISPONIBLE">DISPONIBLE</option>
              <option value="RESERVADO">RESERVADO</option>
              <option value="RENTADO">RENTADO</option>
              <option value="RETORNO">RETORNO</option>
              <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              <option value="BAJA">BAJA</option>
            </select>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Descripción Técnica / Notas de Logística
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                {...register('descripcion')}
                rows={3}
                placeholder="Ej. Tracción por orugas, cuchilla frontal de 3 metros, cabina climatizada con protección FOPS..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
              />
            </div>
          </div>

        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditMode ? 'Guardar Cambios' : 'Registrar Equipo'}</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* MODAL AJAX MARCAS */}
      {isBrandModalOpen && (
        <BrandSelectModal
          onClose={() => setIsBrandModalOpen(false)}
          onSelect={handleSelectBrand}
        />
      )}

      {/* MODAL AJAX CATEGORÍAS */}
      {isCatModalOpen && (
        <CategorySelectModal
          onClose={() => setIsCatModalOpen(false)}
          onSelect={handleSelectCategory}
        />
      )}
    </div>
  );
};
