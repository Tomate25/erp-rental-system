import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorAlert } from '../../../shared/components/ErrorAlert';
import React, { useState, useEffect, useMemo } from 'react';
import type { Equipment, Category, Brand } from '../types/inventory.types';
import {
  getEquipments,
  getCategories,
  createCategory,
  deleteCategory,
  getBrands,
  createBrand,
  deleteBrand
} from '../services/inventory.api';
import { EquipmentForm } from '../components/EquipmentForm';
import { GroupedInventoryView } from '../components/GroupedInventoryView';
import { buildGroupedDataFromEquipments } from '../utils/groupEquipments';
import { Plus, Wrench, AlertCircle, Trash2, FolderPlus, Layers, Building2 } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grouped' | 'categories' | 'brands'>('grouped');
  
  // Estados de inventario
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Control de formulario de maquinaria
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Estados para creación rápida de marcas y categorías en las pestañas independientes
  const [newCatName, setNewCatName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const isAdmin = useMemo(() => {
    const rawRoles = user?.roles || user?.rol || user?.role || [];
    const rolesArray = Array.isArray(rawRoles) ? rawRoles : [rawRoles];
    return rolesArray.some((r: any) => {
      const val = typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || '';
      return String(val).toUpperCase() === 'ADMIN';
    });
  }, [user]);

  const sucursales = useMemo(() => [
    {
      id: user.sucursalId || 'a98976b2-12ba-4995-a541-6526e0e68405',
      nombre: user.sucursal?.nombre || 'Sucursal Central Nicaragua',
    },
  ], [user]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eqResult, catsResult, brsResult] = await Promise.allSettled([
        getEquipments(),
        getCategories(),
        getBrands()
      ]);

      const eqData = eqResult.status === 'fulfilled' && Array.isArray(eqResult.value) ? eqResult.value : [];
      const catsData = catsResult.status === 'fulfilled' && Array.isArray(catsResult.value) ? catsResult.value : [];
      const brsData = brsResult.status === 'fulfilled' && Array.isArray(brsResult.value) ? brsResult.value : [];

      if (eqResult.status === 'rejected') console.error('Error al cargar equipos:', eqResult.reason);
      if (catsResult.status === 'rejected') console.error('Error al cargar categorías:', catsResult.reason);
      if (brsResult.status === 'rejected') console.error('Error al cargar marcas:', brsResult.reason);

      setEquipments(eqData);
      setCategories(catsData);
      setBrands(brsData);
    } catch (err: any) {
      console.error('Error al cargar inventario:', err);
      setError(err.response?.data?.message || err.message || 'No se pudo cargar el inventario de maquinaria. Por favor reintenta.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Gestión de categorías
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim() === '') return;
    setCatalogError(null);
    try {
      await createCategory(newCatName);
      setNewCatName('');
      const updatedCats = await getCategories();
      setCategories(updatedCats);
    } catch (err: any) {
      setCatalogError(err.response?.data?.message || 'Error al intentar guardar la categoría.');
    }
  };

  const handleDeleteCategory = async (catId: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${name}" del catálogo?`)) {
      try {
        await deleteCategory(catId);
        const updatedCats = await getCategories();
        setCategories(updatedCats);
      } catch (err: any) {
        alert(err.response?.data?.message || 'No se puede borrar. Verifica si tiene equipos asignados.');
      }
    }
  };

  // Gestión de marcas
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBrandName.trim() === '') return;
    setCatalogError(null);
    try {
      await createBrand(newBrandName);
      setNewBrandName('');
      const updatedBrs = await getBrands();
      setBrands(updatedBrs);
    } catch (err: any) {
      setCatalogError(err.response?.data?.message || 'Error al intentar guardar la marca.');
    }
  };

  const handleDeleteBrand = async (brandId: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el fabricante "${name}" del catálogo?`)) {
      try {
        await deleteBrand(brandId);
        const updatedBrs = await getBrands();
        setBrands(updatedBrs);
      } catch (err: any) {
        alert(err.response?.data?.message || 'No se puede borrar. Verifica si tiene equipos asignados.');
      }
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingEquipment(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEquipment(null);
    loadData();
  };

  return (
    <div className="space-y-6 w-full font-sans">
      
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E8EE] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Inventario de Maquinaria</h2>
            <p className="text-xs text-[#747780] font-medium">Controla el catálogo de equipos, estados de disponibilidad, marcas y categorías.</p>
          </div>
        </div>

        {/* Pestañas de catálogos y acción */}
        {!isFormOpen && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-[#37474F] gap-1">
              <button
                onClick={() => { setActiveTab('grouped'); setCatalogError(null); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'grouped' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Inventario por Producto
              </button>
              <button
                onClick={() => { setActiveTab('categories'); setCatalogError(null); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'categories' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
                }`}
              >
                Categorías
              </button>
              <button
                onClick={() => { setActiveTab('brands'); setCatalogError(null); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'brands' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
                }`}
              >
                Marcas
              </button>
            </div>

            {activeTab !== 'grouped' && isAdmin && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="btn-precision-primary flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors ml-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Registrar Equipo
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Consultando catálogo de inventario..." />
      ) : error ? (
        <ErrorAlert message={error} onRetry={loadData} />
      ) : isFormOpen ? (
        <EquipmentForm
          initialData={editingEquipment}
          sucursales={sucursales}
          onCancel={handleFormCancel}
          onSubmitSuccess={handleFormSuccess}
        />
      ) : (
        <div className="animate-fadeIn">
          {/* --- TAB: INVENTARIO AGRUPADO POR PRODUCTO (VISTA PRINCIPAL LIMPIA) --- */}
          {activeTab === 'grouped' && (
            <GroupedInventoryView
              mockData={buildGroupedDataFromEquipments(equipments)}
              categories={categories}
              brands={brands}
              sucursales={sucursales}
              onRefreshData={loadData}
            />
          )}

          {/* --- TAB: CATEGORÍAS APARTE --- */}
          {activeTab === 'categories' && (
            <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 animate-fadeIn`}>
              
              {/* Formulario rápido Categorías (Solo Administrador) */}
              {isAdmin && (
                <div className="md:col-span-1 bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4 self-start">
                  <div className="flex items-center gap-2 border-b border-[#E5E8EE] pb-2">
                    <FolderPlus className="w-4.5 h-4.5 text-[#1A73E8]" />
                    <h3 className="text-xs font-extrabold text-[#1B1D22] uppercase tracking-wider">Nueva Categoría</h3>
                  </div>

                  {catalogError && (
                    <div className="p-3 bg-[#FDF2E9] border border-[#C55500]/20 text-[#C55500] text-[11px] rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#C55500] shrink-0" />
                      <span className="font-medium">{catalogError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateCategory} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-[#747780] uppercase tracking-wider">Nombre de Categoría</label>
                      <input
                        type="text"
                        placeholder="Ej. Compactación"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="precision-input text-xs"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-precision-primary w-full"
                    >
                      <Plus className="w-4 h-4" /> Registrar Categoría
                    </button>
                  </form>
                </div>
              )}

              {/* Lista Categorías */}
              <div className={`${isAdmin ? 'md:col-span-2' : 'md:col-span-1'} bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-3`}>
                <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
                  <h3 className="text-xs font-extrabold text-[#747780] uppercase tracking-wider">Listado de Categorías</h3>
                  {!isAdmin && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Modo Consulta
                    </span>
                  )}
                </div>
                <div className="divide-y divide-[#E5E8EE] max-h-[400px] overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="py-3 flex items-center justify-between group">
                      <span className="text-xs font-bold text-[#1B1D22]">{cat.nombre}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                          className="p-1.5 rounded-lg border border-transparent hover:border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-all opacity-0 group-hover:opacity-100"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-xs italic text-[#747780] text-center py-6">No hay categorías configuradas.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* --- TAB: MARCAS APARTE --- */}
          {activeTab === 'brands' && (
            <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 animate-fadeIn`}>
              
              {/* Formulario rápido Marcas (Solo Administrador) */}
              {isAdmin && (
                <div className="md:col-span-1 bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4 self-start">
                  <div className="flex items-center gap-2 border-b border-[#E5E8EE] pb-2">
                    <Building2 className="w-4.5 h-4.5 text-[#1A73E8]" />
                    <h3 className="text-xs font-extrabold text-[#1B1D22] uppercase tracking-wider">Nueva Marca</h3>
                  </div>

                  {catalogError && (
                    <div className="p-3 bg-[#FDF2E9] border border-[#C55500]/20 text-[#C55500] text-[11px] rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#C55500] shrink-0" />
                      <span className="font-medium">{catalogError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateBrand} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-[#747780] uppercase tracking-wider">Nombre del Fabricante</label>
                      <input
                        type="text"
                        placeholder="Ej. Sany"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        className="precision-input text-xs"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-precision-primary w-full"
                    >
                      <Plus className="w-4 h-4" /> Registrar Marca
                    </button>
                  </form>
                </div>
              )}

              {/* Lista Marcas */}
              <div className={`${isAdmin ? 'md:col-span-2' : 'md:col-span-1'} bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-3`}>
                <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
                  <h3 className="text-xs font-extrabold text-[#747780] uppercase tracking-wider">Listado de Fabricantes / Marcas</h3>
                  {!isAdmin && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Modo Consulta
                    </span>
                  )}
                </div>
                <div className="divide-y divide-[#E5E8EE] max-h-[400px] overflow-y-auto pr-1">
                  {brands.map((br) => (
                    <div key={br.id} className="py-3 flex items-center justify-between group">
                      <span className="text-xs font-bold text-[#1B1D22]">{br.nombre}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteBrand(br.id, br.nombre)}
                          className="p-1.5 rounded-lg border border-transparent hover:border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-all opacity-0 group-hover:opacity-100"
                          title="Eliminar marca"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {brands.length === 0 && (
                    <p className="text-xs italic text-[#747780] text-center py-6">No hay marcas configuradas.</p>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
