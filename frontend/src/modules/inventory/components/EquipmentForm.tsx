import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { equipmentSchema } from '../validators/inventory.validator';
import type { EquipmentFormValues } from '../validators/inventory.validator';
import type { Equipment, Category, Subcategory, Brand } from '../types/inventory.types';
import { createEquipment, updateEquipment, getCategories, getSubcategories } from '../services/inventory.api';
import { BrandSelectModal } from './BrandSelectModal';
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

  // Categorías y Subcategorías para los desplegables dinámicos
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const [selectedBrandName, setSelectedBrandName] = useState(initialData?.marca?.nombre || '');
  const [selectedCatId, setSelectedCatId] = useState(initialData?.categoriaId || '');

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
      subcategoriaId: initialData?.subcategoriaId || '',
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

  // Cargar Categorías principales
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
        if (!initialData?.categoriaId && cats.length > 0) {
          setSelectedCatId(cats[0].id);
          setValue('categoriaId', cats[0].id);
        }
      } catch (err) {
        console.error('Error cargando categorías', err);
      }
    };
    loadCategories();
  }, []);

  // Cargar Subcategorías dinámicamente según la Categoría seleccionada
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!selectedCatId) {
        setSubcategories([]);
        return;
      }
      try {
        const subs = await getSubcategories(selectedCatId);
        setSubcategories(subs);
      } catch (err) {
        console.error('Error cargando subcategorías', err);
      }
    };
    loadSubcategories();
  }, [selectedCatId]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value;
    setSelectedCatId(catId);
    setValue('categoriaId', catId, { shouldValidate: true });
    setValue('subcategoriaId', '', { shouldValidate: true });
  };

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

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-[#E5E8EE] shadow-xs font-sans">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="border-b border-[#E5E8EE] pb-4">
          <h3 className="text-base font-black text-[#1B1D22]">
            {isEditMode ? 'Editar Ficha del Activo' : 'Registrar Nuevo Equipo en Inventario'}
          </h3>
          <p className="text-xs text-[#747780] font-medium mt-0.5">
            Estructura tu inventario en Categoría → Subcategoría → Producto/Modelo con sus atributos.
          </p>
        </div>

        {apiError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-[#C55500] shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Grid del Formulario */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* 1. Categoría Principal */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Categoría Principal *
            </label>
            <div className="relative">
              <select
                value={selectedCatId}
                onChange={handleCategoryChange}
                className={`w-full px-3 py-2 bg-[#F4F6F9] border rounded-xl text-xs text-[#1B1D22] font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all ${
                  errors.categoriaId ? 'border-red-300' : 'border-[#E5E8EE]'
                }`}
              >
                <option value="">Selecciona Categoría...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            {errors.categoriaId && <p className="text-[10px] text-red-600 mt-1">{errors.categoriaId.message}</p>}
          </div>

          {/* 2. Subcategoría (Dependiente de Categoría) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Subcategoría
            </label>
            <select
              {...register('subcategoriaId')}
              disabled={subcategories.length === 0}
              className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all disabled:opacity-50 cursor-pointer"
            >
              <option value="">
                {subcategories.length === 0 ? 'Sin subcategorías' : 'Selecciona Subcategoría...'}
              </option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Producto / Nombre del Equipo (Modelo) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Producto / Nombre Equipo *
            </label>
            <input
              type="text"
              {...register('modelo')}
              placeholder="Ej. Retroexcavadora Backhoe, Placa de encofrado..."
              className={`w-full px-3 py-2 bg-[#F4F6F9] border rounded-xl text-xs text-[#1B1D22] font-bold placeholder-[#747780]/60 focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all ${
                errors.modelo ? 'border-red-300' : 'border-[#E5E8EE]'
              }`}
            />
            {errors.modelo && <p className="text-[10px] text-red-600 mt-1">{errors.modelo.message}</p>}
          </div>

          {/* 4. Marca (Selección AJAX Modal) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Marca / Fabricante *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                placeholder="Selecciona Marca..."
                value={selectedBrandName}
                className={`flex-1 px-3 py-2 bg-[#F4F6F9] border rounded-xl text-xs text-[#1B1D22] font-bold placeholder-[#747780]/60 focus:outline-none ${
                  errors.marcaId ? 'border-red-300' : 'border-[#E5E8EE]'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="btn-precision-secondary text-xs py-2 px-3"
              >
                <Search className="w-4 h-4" /> Buscar
              </button>
            </div>
            {errors.marcaId && <p className="text-[10px] text-red-600 mt-1">{errors.marcaId.message}</p>}
          </div>

          {/* 5. Código de Activo */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Código de Activo
            </label>
            <input
              type="text"
              {...register('codigo')}
              placeholder="Ej. 01-02, 02-64"
              className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold font-mono focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
            />
          </div>

          {/* 6. Número de Serie */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Número de Serie (Opcional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#747780]">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                {...register('numeroSerie')}
                placeholder="Ej. SD320/45064H00489540"
                className="w-full pl-9 pr-4 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-mono font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
              />
            </div>
          </div>

          {/* 7. Tarifa por Día */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Precio de Renta por Día ($) *
            </label>
            <input
              type="number"
              step="any"
              {...register('precioRentaDia', { valueAsNumber: true })}
              placeholder="0.00"
              className={`w-full px-3 py-2 bg-[#F4F6F9] border rounded-xl text-xs text-[#1B1D22] font-mono font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all ${
                errors.precioRentaDia ? 'border-red-300' : 'border-[#E5E8EE]'
              }`}
            />
            {errors.precioRentaDia && <p className="text-[10px] text-red-600 mt-1">{errors.precioRentaDia.message}</p>}
          </div>

          {/* 8. Cantidad Total */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Cantidad Total (Stock)
            </label>
            <input
              type="number"
              {...register('cantidadTotal', { valueAsNumber: true })}
              placeholder="1"
              className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
            />
          </div>

          {/* 9. Cantidad Disponible */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Cantidad Disponible
            </label>
            <input
              type="number"
              {...register('cantidadDisponible', { valueAsNumber: true })}
              placeholder="1"
              className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
            />
          </div>

          {/* 10. Horómetro */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Horómetro Actual (Horas)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('horometro', { valueAsNumber: true })}
              placeholder="0.0"
              className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
            />
          </div>

          {/* 11. Asignación de Sucursal */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Sucursal de Asignación *
            </label>
            <select
              {...register('sucursalId')}
              className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 12. Estado */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Estado de Disponibilidad
            </label>
            <select
              {...register('estado')}
              className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
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

          {/* 13. Descripción / Atributos / Medidas */}
          <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
              Atributos, Medidas y Características Técnicas
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 text-[#747780]">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                {...register('descripcion')}
                rows={3}
                placeholder="Ej. Tamaño: 24X8, Medidas: 4x8, Capacidad: 2 sacos, Potencia: 50kVA, Cuchilla frontal..."
                className="w-full pl-9 pr-4 py-2 bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] font-bold placeholder-[#747780]/60 focus:outline-none focus:bg-white focus:border-[#1A73E8] transition-all resize-none"
              />
            </div>
          </div>

        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E8EE]">
          <button
            type="button"
            onClick={onCancel}
            className="btn-precision-outline text-xs py-2 px-4"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-precision-primary text-xs py-2 px-5"
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
    </div>
  );
};
