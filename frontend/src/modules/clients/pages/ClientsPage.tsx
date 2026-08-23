import React, { useState, useEffect } from 'react';
import type { Client } from '../types/client.types';
import { getClients, deleteClient } from '../services/clients.api';
import { ClientTable } from '../components/ClientTable';
import { ClientForm } from '../components/ClientForm';
import { Plus, Users, Search, AlertCircle } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Control del formulario de creación/edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getClients();
      setClients(data);
      setFilteredClients(data);
    } catch (err: any) {
      setError('No se pudo cargar la lista de clientes. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filtrado dinámico por búsqueda de texto
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(
        (c) =>
          c.nombre.toLowerCase().includes(query) ||
          (c.emailFacturacion && c.emailFacturacion.toLowerCase().includes(query)) ||
          (c.rfc && c.rfc.toLowerCase().includes(query)) ||
          (c.razonSocial && c.razonSocial.toLowerCase().includes(query))
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
      try {
        await deleteClient(id);
        fetchClients();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Ocurrió un error al intentar eliminar el cliente.');
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
            <p className="text-xs text-[#747780] font-medium">Administra las fichas de contacto y datos de facturación de tus socios comerciales.</p>
          </div>
        </div>

        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-precision-primary self-start sm:self-auto"
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
          <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex items-center justify-between shadow-xs">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, RFC o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="precision-input pl-10 text-xs"
              />
            </div>
            <div className="text-[10px] text-[#747780] font-extrabold uppercase tracking-wider hidden sm:block">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
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
                className="mt-4 btn-precision-outline text-xs py-2 px-4"
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
