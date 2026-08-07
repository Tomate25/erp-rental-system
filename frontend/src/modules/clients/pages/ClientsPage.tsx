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
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shadow-blue-500/5">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Directorio de Clientes</h2>
            <p className="text-xs text-slate-500">Administra las fichas de contacto y datos de facturación de tus socios comerciales.</p>
          </div>
        </div>

        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-colors self-start sm:self-auto"
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
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-sm">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, RFC o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Loader y Estados */}
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs text-slate-500 font-medium">Consultando base de datos de clientes...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
              <p className="text-xs font-bold text-red-800">{error}</p>
              <button
                onClick={fetchClients}
                className="mt-4 px-4 py-2 bg-white hover:bg-slate-50 text-xs font-bold text-red-700 rounded-xl border border-red-200 shadow-sm transition-colors"
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
