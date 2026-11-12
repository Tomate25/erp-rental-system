import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Truck,
  Wrench,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import type { Provider, TipoProveedor } from '../types/provider.types';
import { getProviders, deleteProvider } from '../services/providers.api';
import { ProviderModal } from '../components/ProviderModal';
import { ProviderDetailModal } from '../components/ProviderDetailModal';

export const ProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal de alta/edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Modal de detalle y maquinaria vinculada
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailProviderId, setDetailProviderId] = useState<string | null>(null);

  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProviders();
      setProviders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar proveedores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedProvider(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (provider: Provider) => {
    const hasEquipments = (provider._count?.equipos || 0) > 0;
    const confirmMessage = hasEquipments
      ? `El proveedor "${provider.nombre}" tiene equipos vinculados. ¿Deseas desactivarlo en el sistema?`
      : `¿Estás seguro de eliminar al proveedor "${provider.nombre}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteProvider(provider.id);
        await fetchProviders();
      } catch (err: any) {
        alert(err.response?.data?.message || 'No se pudo eliminar el proveedor.');
      }
    }
  };

  // Métricas
  const metrics = useMemo(() => {
    const total = providers.length;
    const maquinaria = providers.filter((p) => p.tipo === 'MAQUINARIA_EXTERNA').length;
    const insumos = providers.filter((p) => p.tipo === 'INSUMOS_Y_REPUESTOS').length;
    const taller = providers.filter((p) => p.tipo === 'SERVICIOS_TALLER').length;
    return { total, maquinaria, insumos, taller };
  }, [providers]);

  // Lista filtrada
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.razonSocial && p.razonSocial.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.identificacion && p.identificacion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.contacto && p.contacto.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = !typeFilter || p.tipo === typeFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'ACTIVO' && p.activo) ||
        (statusFilter === 'INACTIVO' && !p.activo);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [providers, searchTerm, typeFilter, statusFilter]);

  const getTypeBadge = (tipo: TipoProveedor) => {
    switch (tipo) {
      case 'MAQUINARIA_EXTERNA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-950 border border-amber-300">
            <Truck className="w-3 h-3 text-amber-700" />
            Maquinaria Externa
          </span>
        );
      case 'INSUMOS_Y_REPUESTOS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-950 border border-blue-300">
            <Package className="w-3 h-3 text-blue-700" />
            Insumos y Repuestos
          </span>
        );
      case 'SERVICIOS_TALLER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-950 border border-emerald-300">
            <Wrench className="w-3 h-3 text-emerald-700" />
            Servicio de Taller
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Layers className="w-3 h-3 text-slate-600" />
            General
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-slate-800" />
            Catálogo de Proveedores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Proveedores para subarrendamiento de maquinaria externa, insumos y servicios de taller
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Proveedores
          </span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {metrics.total}
          </span>
          <span className="text-[11px] text-slate-500">Registrados en catálogo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-amber-600" /> Maquinaria Externa
          </span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {metrics.maquinaria}
          </span>
          <span className="text-[11px] text-slate-500">Subarrendamiento / Préstamo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-blue-600" /> Insumos y Repuestos
          </span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {metrics.insumos}
          </span>
          <span className="text-[11px] text-slate-500">Aceites, filtros, consumibles</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Servicios Taller
          </span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {metrics.taller}
          </span>
          <span className="text-[11px] text-slate-500">Torno, mecánica especializada</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, RUC, contacto..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-auto"
          >
            <option value="">Todos los tipos</option>
            <option value="MAQUINARIA_EXTERNA">Maquinaria Externa</option>
            <option value="INSUMOS_Y_REPUESTOS">Insumos y Repuestos</option>
            <option value="SERVICIOS_TALLER">Servicios de Taller</option>
            <option value="GENERAL">General</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-auto"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla de Proveedores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Cargando catálogo de proveedores...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-rose-600 font-bold">
            {error}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 italic">
            No se encontraron proveedores registrados con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <th scope="col" className="py-3 px-4">Proveedor / Razón Social</th>
                  <th scope="col" className="py-3 px-3">Tipo</th>
                  <th scope="col" className="py-3 px-3">Identificación</th>
                  <th scope="col" className="py-3 px-3">Contacto</th>
                  <th scope="col" className="py-3 px-3">Teléfono / Email</th>
                  <th scope="col" className="py-3 px-3 text-center">Equipos Subalquilados</th>
                  <th scope="col" className="py-3 px-3">Estado</th>
                  <th scope="col" className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProviders.map((provider) => (
                  <tr key={provider.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailProviderId(provider.id);
                          setIsDetailOpen(true);
                        }}
                        className="font-bold text-slate-900 hover:text-blue-700 text-left block text-xs cursor-pointer"
                      >
                        {provider.nombre}
                      </button>
                      {provider.razonSocial && (
                        <span className="text-[11px] text-slate-500 block">
                          {provider.razonSocial}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getTypeBadge(provider.tipo)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {provider.identificacion || '---'}
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      {provider.contacto || '---'}
                    </td>
                    <td className="py-3 px-3">
                      {provider.telefono && (
                        <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" /> {provider.telefono}
                        </div>
                      )}
                      {provider.email && (
                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" /> {provider.email}
                        </div>
                      )}
                      {!provider.telefono && !provider.email && (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {provider._count?.equipos || 0}
                    </td>
                    <td className="py-3 px-3">
                      {provider.activo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="w-3 h-3 text-slate-400" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailProviderId(provider.id);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Ver ficha técnica y equipos"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(provider)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar proveedor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(provider)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar o desactivar proveedor"
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
        )}
      </div>

      {/* Modal de alta/edición */}
      <ProviderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProviders}
        providerToEdit={selectedProvider}
      />

      {/* Modal de ficha técnica y maquinaria vinculada */}
      <ProviderDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailProviderId(null);
        }}
        providerId={detailProviderId}
      />
    </div>
  );
};
