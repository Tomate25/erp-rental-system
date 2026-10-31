import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getClients } from '../../clients/services/clients.api';
import type { Client } from '../../clients/types/client.types';
import { Search, X, UserCheck, Users } from 'lucide-react';

interface ClientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
}

export const ClientSearchModal: React.FC<ClientSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const [filterScope, setFilterScope] = useState<'MY_CLIENTS' | 'ALL'>('ALL');

  useEffect(() => {
    if (isOpen) {
      setFilterScope(isAdvisor && !isAdminOrManager ? 'MY_CLIENTS' : 'ALL');
      const load = async () => {
        setIsLoading(true);
        try {
          const data = await getClients();
          setClients(data);
        } catch (e) {
          console.error('Error al cargar clientes en modal:', e);
        } finally {
          setIsLoading(false);
        }
      };
      load();
      setSearch('');
    }
  }, [isOpen, isAdvisor, isAdminOrManager]);

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

  if (!isOpen) return null;

  const filtered = clients.filter((c) => {
    if (filterScope === 'MY_CLIENTS' && !isClientAssignedToUser(c)) {
      return false;
    }

    const s = search.toLowerCase().trim();
    if (!s) return true;

    return (
      c.nombre.toLowerCase().includes(s) ||
      (c.rfc && c.rfc.toLowerCase().includes(s)) ||
      (c.cedula && c.cedula.toLowerCase().includes(s)) ||
      (c.vendedor && c.vendedor.toLowerCase().includes(s)) ||
      (c.telefono && c.telefono.toLowerCase().includes(s)) ||
      (c.telMovistar && c.telMovistar.toLowerCase().includes(s)) ||
      (c.telClaro && c.telClaro.toLowerCase().includes(s)) ||
      (c.emailFacturacion && c.emailFacturacion.toLowerCase().includes(s))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Buscar Cliente para Cotización</h3>
            <p className="text-xs text-slate-500 font-medium">Selecciona un socio comercial de tu cartera</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtro de Ámbito y Buscador */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterScope('MY_CLIENTS')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterScope === 'MY_CLIENTS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Mis Clientes ({myClientsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterScope === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todos los Clientes ({clients.length})</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar por cliente, asesor comercial, RUC o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Consultando clientes...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm space-y-2">
              <p className="font-bold text-slate-700">No se encontraron clientes.</p>
              {filterScope === 'MY_CLIENTS' && (
                <button
                  type="button"
                  onClick={() => setFilterScope('ALL')}
                  className="text-xs text-blue-600 font-bold underline cursor-pointer"
                >
                  Buscar en el Directorio Completo ({clients.length} clientes)
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c);
                    onClose();
                  }}
                  className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-between group border border-transparent hover:border-blue-100 cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors">
                        {c.nombre}
                      </p>
                      {c.numeroCliente && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          #{c.numeroCliente}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3">
                      {c.rfc && <span>RUC: {c.rfc}</span>}
                      {c.cedula && <span>Cédula: {c.cedula}</span>}
                      {c.vendedor && (
                        <span className="text-blue-700 font-medium bg-blue-50 px-1.5 py-0.2 rounded">
                          Asesor: {c.vendedor}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Seleccionar →
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
