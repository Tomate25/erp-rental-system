import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Client } from '../types/client.types';
import { getClients, deleteClient } from '../services/clients.api';
import { ClientTable } from '../components/ClientTable';
import { ClientForm } from '../components/ClientForm';
import { Plus, Users, Search, AlertCircle, UserCheck } from 'lucide-react';
import { useConfirm, useToast } from '../../../shared/components/Toast';

export const ClientsPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usuario activo en sesión
  const currentUser = useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const userRoles: string[] = useMemo(() => {
    return (currentUser?.roles || []).map((r: any) => {
      const val = typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || '';
      return String(val).toUpperCase();
    });
  }, [currentUser]);

  const isAdminOrManager = userRoles.includes('ADMIN') || userRoles.includes('GERENTE');
  const isAdvisor = userRoles.includes('COMERCIAL') || userRoles.includes('VENDEDOR');

  // Si es asesor, iniciamos filtrando por su cartera personal para inmediatez visual
  const [filterScope, setFilterScope] = useState<'MY_CLIENTS' | 'ALL'>(() => {
    return isAdvisor && !isAdminOrManager ? 'MY_CLIENTS' : 'ALL';
  });

  // Control del formulario de creación/edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      setError('No se pudo cargar la lista de clientes. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Verificar si un cliente pertenece al usuario conectado
  const isClientAssignedToUser = useCallback(
    (c: Client): boolean => {
      if (!currentUser?.id) return false;
      if (c.vendedorId && c.vendedorId === currentUser.id) return true;
      if (c.vendedorAsignado?.id && c.vendedorAsignado.id === currentUser.id) return true;

      const userName = `${currentUser.nombre || ''} ${currentUser.apellido || ''}`.trim().toLowerCase();
      const clientVendedor = (c.vendedor || '').trim().toLowerCase();
      if (userName && clientVendedor && (clientVendedor.includes(userName) || userName.includes(clientVendedor))) {
        return true;
      }
      return false;
    },
    [currentUser]
  );

  const myClientsCount = useMemo(() => {
    return clients.filter(isClientAssignedToUser).length;
  }, [clients, isClientAssignedToUser]);

  // Filtrado dinámico por ámbito (Mis Clientes vs Todos) y búsqueda de texto
  useEffect(() => {
    let list = clients;

    if (filterScope === 'MY_CLIENTS') {
      list = list.filter(isClientAssignedToUser);
    }

    const query = searchQuery.toLowerCase().trim();
    if (query !== '') {
      list = list.filter(
        (c) =>
          c.nombre.toLowerCase().includes(query) ||
          (c.emailFacturacion && c.emailFacturacion.toLowerCase().includes(query)) ||
          (c.rfc && c.rfc.toLowerCase().includes(query)) ||
          (c.cedula && c.cedula.toLowerCase().includes(query)) ||
          (c.numeroCliente && c.numeroCliente.toLowerCase().includes(query)) ||
          (c.nombreContacto && c.nombreContacto.toLowerCase().includes(query)) ||
          (c.departamento && c.departamento.toLowerCase().includes(query)) ||
          (c.razonSocial && c.razonSocial.toLowerCase().includes(query)) ||
          (c.vendedor && c.vendedor.toLowerCase().includes(query)) ||
          (c.telMovistar && c.telMovistar.toLowerCase().includes(query)) ||
          (c.telClaro && c.telClaro.toLowerCase().includes(query)) ||
          (c.telConvencional && c.telConvencional.toLowerCase().includes(query))
      );
    }

    setFilteredClients(list);
  }, [searchQuery, clients, filterScope, isClientAssignedToUser]);

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar cliente',
      confirmText: 'Eliminar',
      variant: 'danger',
      message: '¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.',
    });
    if (confirmed) {
      try {
        await deleteClient(id);
        fetchClients();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Ocurrió un error al intentar eliminar el cliente.');
      }
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingClient(null);
    fetchClients();
  };

  return (
    <div className="space-y-6 w-full font-sans">
      {/* Encabezado del Módulo con Paleta Precision */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Directorio de Clientes</h2>
            <p className="text-xs text-[#747780] font-medium">
              Administra las fichas de contacto y datos de facturación de tus socios comerciales.
            </p>
          </div>
        </div>

        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-precision-primary self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        )}
      </div>

      {/* Renderizado de Formulario o Lista */}
      {isFormOpen ? (
        <div className="animate-fadeIn">
          <ClientForm
            initialData={editingClient}
            onCancel={handleFormCancel}
            onSubmitSuccess={handleFormSuccess}
          />
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            {/* Selector de Ámbito: Mis Clientes vs Todos */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterScope('MY_CLIENTS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterScope === 'MY_CLIENTS'
                    ? 'bg-[#1A73E8] text-white shadow-xs'
                    : 'bg-[#F4F6F9] text-[#747780] hover:text-[#1B1D22] hover:bg-[#E8F0FE] border border-[#E5E8EE]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Mis Clientes Asignados ({myClientsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterScope === 'ALL'
                    ? 'bg-[#1A73E8] text-white shadow-xs'
                    : 'bg-[#F4F6F9] text-[#747780] hover:text-[#1B1D22] hover:bg-[#E8F0FE] border border-[#E5E8EE]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Directorio Completo ({clients.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por cliente, asesor, RUC o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="precision-input pl-10 text-xs w-full"
                />
              </div>
              <div className="text-[10px] text-[#747780] font-extrabold uppercase tracking-wider shrink-0 hidden sm:block">
                {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Loader y Estados */}
          {isLoading ? (
            <div className="bg-white border border-[#E5E8EE] rounded-2xl p-16 text-center shadow-xs flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs text-[#747780] font-medium">Consultando base de datos de clientes...</p>
            </div>
          ) : error ? (
            <div className="bg-[#FDF2E9] border border-[#C55500]/20 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-[#C55500] mb-3" />
              <p className="text-xs font-bold text-[#C55500]">{error}</p>
              <button
                onClick={fetchClients}
                className="mt-4 btn-precision-outline text-xs py-2 px-4 cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <ClientTable
              clients={filteredClients}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          )}
        </div>
      )}
    </div>
  );
};
