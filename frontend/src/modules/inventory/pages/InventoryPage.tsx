import React, { useState, useEffect } from 'react';
import type { Equipment, Category, Brand } from '../types/inventory.types';
import {
  getEquipments,
  deleteEquipment,
  getCategories,
  createCategory,
  deleteCategory,
  getBrands,
  createBrand,
  deleteBrand
} from '../services/inventory.api';
import { EquipmentTable } from '../components/EquipmentTable';
import { EquipmentForm } from '../components/EquipmentForm';
import { Plus, Wrench, Search, AlertCircle, Filter, Trash2, FolderPlus, Building } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'categories' | 'brands'>('inventory');
  
  // Estados para maquinaria
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
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
      const eqData = await getEquipments();
      const catsData = await getCategories();
      const brsData = await getBrands();
      // Filtrar para ocultar vehículos en Inventario
      const nonVehicleCats = catsData.filter((c: Category) => 
        !c.nombre.toUpperCase().includes('VEHICULO') && 
        !c.nombre.toUpperCase().includes('TRANSPORTE')
      );
      
      const nonVehicleEqs = eqData.filter((eq: Equipment) => {
        const catName = eq.categoria?.nombre.toUpperCase() || '';
        return !catName.includes('VEHICULO') && !catName.includes('TRANSPORTE');
      });

      setEquipments(nonVehicleEqs);
      setFilteredEquipments(nonVehicleEqs);
      setCategories(nonVehicleCats);
      setBrands(brsData);
    } catch (err: any) {
      setError('No se pudo cargar el inventario de maquinaria. Por favor reintenta.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
          (eq.descripcion && eq.descripcion.toLowerCase().includes(query))
      );
    }

    if (selectedCatFilter !== '') {
      result = result.filter((eq) => eq.categoriaId === selectedCatFilter);
    }

    if (selectedStateFilter !== '') {
      result = result.filter((eq) => eq.estado === selectedStateFilter);
    }

    setFilteredEquipments(result);
  }, [searchQuery, selectedCatFilter, selectedStateFilter, equipments]);

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
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm shadow-indigo-500/5">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Inventario de Maquinaria</h2>
            <p className="text-xs text-slate-500">Controla el catálogo de equipos, estados de disponibilidad, marcas y categorías independientes.</p>
          </div>
        </div>

        {/* Pestañas de catálogos */}
        {!isFormOpen && (
          <div className="flex bg-slate-200/60 p-1 rounded-xl self-start sm:self-auto text-slate-700">
            <button
              onClick={() => { setActiveTab('inventory'); setCatalogError(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Maquinaria
            </button>
            <button
              onClick={() => { setActiveTab('categories'); setCatalogError(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'categories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Categorías
            </button>
            <button
              onClick={() => { setActiveTab('brands'); setCatalogError(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'brands' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Marcas
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-slate-500 font-medium">Consultando catálogo de inventario...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-xs font-bold text-red-800">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-white hover:bg-slate-50 text-xs font-bold text-red-700 rounded-xl border border-red-200 shadow-sm transition-colors"
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
                {/* Filtros */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 md:items-center md:justify-between shadow-sm">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por modelo, marca, serie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-655 font-bold">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={selectedCatFilter}
                        onChange={(e) => setSelectedCatFilter(e.target.value)}
                        className="bg-transparent focus:outline-none font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="">Todas las Categorías</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-655 font-bold">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={selectedStateFilter}
                        onChange={(e) => setSelectedStateFilter(e.target.value)}
                        className="bg-transparent focus:outline-none font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="">Todos los Estados</option>
                        <option value="DISPONIBLE">DISPONIBLE</option>
                        <option value="RESERVADO">RESERVADO</option>
                        <option value="RENTADO">RENTADO</option>
                        <option value="RETORNO">RETORNO</option>
                        <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                        <option value="BAJA">BAJA</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors font-sans ml-auto"
                    >
                      <Plus className="w-4 h-4" /> Registrar Equipo
                    </button>
                  </div>
                </div>

                <EquipmentTable
                  equipments={filteredEquipments}
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
              <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 self-start">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FolderPlus className="w-4.5 h-4.5 text-blue-655" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Nueva Categoría</h3>
                </div>

                {catalogError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{catalogError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateCategory} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre de Categoría</label>
                    <input
                      type="text"
                      placeholder="Ej. Compactación"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1 font-sans"
                  >
                    <Plus className="w-4 h-4" /> Registrar Categoría
                  </button>
                </form>
              </div>

              {/* Lista Categorías */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Listado de Categorías</h3>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="py-3 flex items-center justify-between group">
                      <span className="text-xs font-bold text-slate-800">{cat.nombre}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                        className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-red-650 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-xs italic text-slate-400 text-center py-6">No hay categorías configuradas.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* --- TAB: MARCAS APARTE --- */}
          {activeTab === 'brands' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Formulario rápido Marcas */}
              <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 self-start">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building className="w-4.5 h-4.5 text-blue-655" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Nueva Marca</h3>
                </div>

                {catalogError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{catalogError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateBrand} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Fabricante</label>
                    <input
                      type="text"
                      placeholder="Ej. Sany"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1 font-sans"
                  >
                    <Plus className="w-4 h-4" /> Registrar Marca
                  </button>
                </form>
              </div>

              {/* Lista Marcas */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Listado de Fabricantes / Marcas</h3>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
                  {brands.map((br) => (
                    <div key={br.id} className="py-3 flex items-center justify-between group">
                      <span className="text-xs font-bold text-slate-800">{br.nombre}</span>
                      <button
                        onClick={() => handleDeleteBrand(br.id, br.nombre)}
                        className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-red-650 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar marca"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                  {brands.length === 0 && (
                    <p className="text-xs italic text-slate-400 text-center py-6">No hay marcas configuradas.</p>
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
