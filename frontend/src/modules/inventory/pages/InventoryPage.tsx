import React, { useState, useEffect } from 'react';
import type { Equipment, Category, Subcategory, Brand } from '../types/inventory.types';
import {
  getEquipments,
  deleteEquipment,
  getCategories,
  getSubcategories,
  createCategory,
  deleteCategory,
  getBrands,
  createBrand,
  deleteBrand
} from '../services/inventory.api';
import { EquipmentTable } from '../components/EquipmentTable';
import { EquipmentForm } from '../components/EquipmentForm';
import { Plus, Wrench, Search, AlertCircle, Filter, Trash2, FolderPlus, Building, LayoutList, LayoutGrid } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'categories' | 'brands'>('inventory');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Estados para maquinaria
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [selectedSubcatFilter, setSelectedSubcatFilter] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Control de formulario de maquinaria
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Estados para creación rápida de marcas y categorías en las pestañas independientes
  const [newCatName, setNewCatName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const sucursales = [
    {
      id: user.sucursalId || '3cc8a477-9503-4635-aeef-0c32a1a981ff',
      nombre: user.sucursal?.nombre || 'Sucursal Principal',
    },
  ];

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

      const nonVehicleCats = catsData.filter((c: Category) => 
        c && c.nombre && !c.nombre.toUpperCase().includes('VEHICULO') && 
        !c.nombre.toUpperCase().includes('TRANSPORTE')
      );
      
      const nonVehicleEqs = eqData.filter((eq: Equipment) => {
        const catName = eq.categoria?.nombre?.toUpperCase() || '';
        return !catName.includes('VEHICULO') && !catName.includes('TRANSPORTE');
      });

      setEquipments(nonVehicleEqs);
      setFilteredEquipments(nonVehicleEqs);
      setCategories(nonVehicleCats);
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

  useEffect(() => {
    const fetchSubcats = async () => {
      if (!selectedCatFilter) {
        setSubcategories([]);
        setSelectedSubcatFilter('');
        return;
      }
      try {
        const subs = await getSubcategories(selectedCatFilter);
        setSubcategories(subs);
        setSelectedSubcatFilter('');
      } catch (e) {
        console.error(e);
      }
    };
    fetchSubcats();
  }, [selectedCatFilter]);

  // Filtrado de equipos
  useEffect(() => {
    let result = equipments;
    const query = searchQuery.toLowerCase().trim();
    if (query !== '') {
      result = result.filter(
        (eq) =>
          (eq.codigo && eq.codigo.toLowerCase().includes(query)) ||
          eq.modelo.toLowerCase().includes(query) ||
          (eq.numeroSerie && eq.numeroSerie.toLowerCase().includes(query)) ||
          (eq.marca && eq.marca.nombre.toLowerCase().includes(query)) ||
          (eq.descripcion && eq.descripcion.toLowerCase().includes(query)) ||
          (eq.categoria && eq.categoria.nombre.toLowerCase().includes(query)) ||
          (eq.subcategoria && eq.subcategoria.nombre.toLowerCase().includes(query))
      );
    }

    if (selectedCatFilter !== '') {
      result = result.filter((eq) => eq.categoriaId === selectedCatFilter);
    }

    if (selectedSubcatFilter !== '') {
      result = result.filter((eq) => eq.subcategoriaId === selectedSubcatFilter);
    }

    if (selectedStateFilter !== '') {
      if (selectedStateFilter === 'EN_USO') {
        result = result.filter((eq) => (eq.cantidadTotal - eq.cantidadDisponible > 0) || (eq.estado as string) === 'RENTADO' || (eq.estado as string) === 'DESPACHADO');
      } else if (selectedStateFilter === 'DISPONIBLE') {
        result = result.filter((eq) => eq.cantidadDisponible > 0 || eq.estado === 'DISPONIBLE');
      } else {
        result = result.filter((eq) => eq.estado === selectedStateFilter);
      }
    }

    setFilteredEquipments(result);
  }, [searchQuery, selectedCatFilter, selectedSubcatFilter, selectedStateFilter, equipments]);

  const handleEditClick = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este equipo del catálogo? Si tiene contratos históricos se marcará como BAJA.')) {
      try {
        const response = await deleteEquipment(id);
        alert(response.message || 'Proceso completado.');
        loadData();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al intentar eliminar el equipo.');
      }
    }
  };

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

        {/* Pestañas de catálogos */}
        {!isFormOpen && (
          <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] self-start sm:self-auto text-[#37474F]">
            <button
              onClick={() => { setActiveTab('inventory'); setCatalogError(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'inventory' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Maquinaria
            </button>
            <button
              onClick={() => { setActiveTab('categories'); setCatalogError(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'categories' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Categorías
            </button>
            <button
              onClick={() => { setActiveTab('brands'); setCatalogError(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'brands' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Marcas
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-2xl p-16 text-center shadow-xs flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-[#747780] font-medium">Consultando catálogo de inventario...</p>
        </div>
      ) : error ? (
        <div className="bg-[#FDF2E9] border border-[#C55500]/20 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-8 h-8 text-[#C55500] mb-3" />
          <p className="text-xs font-bold text-[#C55500]">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 btn-precision-outline text-xs py-2 px-4"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="animate-fadeIn">
          
          {/* --- TAB: MAQUINARIA (INVENTARIO PRINCIPAL) --- */}
          {activeTab === 'inventory' && (
            isFormOpen ? (
              <EquipmentForm
                initialData={editingEquipment}
                sucursales={sucursales}
                onCancel={handleFormCancel}
                onSubmitSuccess={handleFormSuccess}
              />
            ) : (
              <div className="space-y-4 animate-fadeIn">
                {/* Resumen Métrica KPI de Inventario */}
                {(() => {
                  const totalEquipos = equipments.length;
                  const totalDisponibles = equipments.reduce((sum, e) => sum + e.cantidadDisponible, 0);
                  const totalEnUso = equipments.reduce((sum, e) => sum + Math.max(0, e.cantidadTotal - e.cantidadDisponible), 0);
                  const totalMantenimiento = equipments.filter(e => e.estado === 'MANTENIMIENTO').length;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs">
                        <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Modelos / Líneas</span>
                        <span className="text-lg font-black text-[#1B1D22] font-mono">{totalEquipos}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs">
                        <span className="text-[10px] font-extrabold text-[#1A73E8] uppercase block">🟢 Stock Disponible</span>
                        <span className="text-lg font-black text-[#1A73E8] font-mono">{totalDisponibles} u.</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs">
                        <span className="text-[10px] font-extrabold text-red-600 uppercase block">🔴 En Uso (Alquiladas)</span>
                        <span className="text-lg font-black text-red-600 font-mono">{totalEnUso} u.</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E8EE] shadow-xs">
                        <span className="text-[10px] font-extrabold text-[#C55500] uppercase block">🛠️ En Servicio</span>
                        <span className="text-lg font-black text-[#C55500] font-mono">{totalMantenimiento}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Filtros */}
                <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex flex-col md:flex-row gap-3 md:items-center md:justify-between shadow-xs">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por modelo, marca, serie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="precision-input pl-10 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-[#F4F6F9] border border-[#E5E8EE] px-3 py-1.5 rounded-xl text-xs text-[#37474F] font-bold">
                      <Filter className="w-3.5 h-3.5 text-[#747780]" />
                      <select
                        value={selectedCatFilter}
                        onChange={(e) => setSelectedCatFilter(e.target.value)}
                        className="bg-transparent focus:outline-none font-bold text-[#1B1D22] cursor-pointer"
                      >
                        <option value="">Todas las Categorías</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedCatFilter !== '' && (
                      <div className="flex items-center gap-1.5 bg-[#F4F6F9] border border-[#E5E8EE] px-3 py-1.5 rounded-xl text-xs text-[#37474F] font-bold animate-fadeIn">
                        <Filter className="w-3.5 h-3.5 text-[#1A73E8]" />
                        <select
                          value={selectedSubcatFilter}
                          onChange={(e) => setSelectedSubcatFilter(e.target.value)}
                          className="bg-transparent focus:outline-none font-bold text-[#1B1D22] cursor-pointer"
                        >
                          <option value="">Todas las Subcategorías</option>
                          {subcategories.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 bg-[#F4F6F9] border border-[#E5E8EE] px-3 py-1.5 rounded-xl text-xs text-[#37474F] font-bold">
                      <Filter className="w-3.5 h-3.5 text-[#747780]" />
                      <select
                        value={selectedStateFilter}
                        onChange={(e) => setSelectedStateFilter(e.target.value)}
                        className="bg-transparent focus:outline-none font-bold text-[#1B1D22] cursor-pointer"
                      >
                        <option value="">Todos los Estados</option>
                        <option value="DISPONIBLE">🟢 DISPONIBLES</option>
                        <option value="EN_USO">🔴 EN USO (Alquiladas)</option>
                        <option value="MANTENIMIENTO">🛠️ MANTENIMIENTO</option>
                        <option value="BAJA">BAJA</option>
                      </select>
                    </div>

                    {/* Selector de Métodos de Visualización (Modo Lista vs Modo Casilla) */}
                    <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] items-center shrink-0">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          viewMode === 'table'
                            ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                            : 'text-[#747780] hover:text-[#1B1D22]'
                        }`}
                        title="Modo Lista (Tabla con ordenamiento en encabezados)"
                      >
                        <LayoutList className="w-4 h-4" />
                        <span className="hidden sm:inline">Lista</span>
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          viewMode === 'grid'
                            ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                            : 'text-[#747780] hover:text-[#1B1D22]'
                        }`}
                        title="Modo Casilla (Cuadrícula y tarjetas destacadas)"
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="hidden sm:inline">Casilla</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="btn-precision-primary ml-auto"
                    >
                      <Plus className="w-4 h-4" /> Registrar Equipo
                    </button>
                  </div>
                </div>

                <EquipmentTable
                  equipments={filteredEquipments}
                  viewMode={viewMode}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              </div>
            )
          )}

          {/* --- TAB: CATEGORÍAS APARTE --- */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Formulario rápido Categorías */}
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

              {/* Lista Categorías */}
              <div className="md:col-span-2 bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold text-[#747780] uppercase tracking-wider border-b border-[#E5E8EE] pb-2">Listado de Categorías</h3>
                <div className="divide-y divide-[#E5E8EE] max-h-[400px] overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="py-3 flex items-center justify-between group">
                      <span className="text-xs font-bold text-[#1B1D22]">{cat.nombre}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                        className="p-1.5 rounded-lg border border-transparent hover:border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Formulario rápido Marcas */}
              <div className="md:col-span-1 bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4 self-start">
                <div className="flex items-center gap-2 border-b border-[#E5E8EE] pb-2">
                  <Building className="w-4.5 h-4.5 text-[#1A73E8]" />
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

              {/* Lista Marcas */}
              <div className="md:col-span-2 bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold text-[#747780] uppercase tracking-wider border-b border-[#E5E8EE] pb-2">Listado de Fabricantes / Marcas</h3>
                <div className="divide-y divide-[#E5E8EE] max-h-[400px] overflow-y-auto pr-1">
                  {brands.map((br) => (
                    <div key={br.id} className="py-3 flex items-center justify-between group">
                      <span className="text-xs font-bold text-[#1B1D22]">{br.nombre}</span>
                      <button
                        onClick={() => handleDeleteBrand(br.id, br.nombre)}
                        className="p-1.5 rounded-lg border border-transparent hover:border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar marca"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
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
