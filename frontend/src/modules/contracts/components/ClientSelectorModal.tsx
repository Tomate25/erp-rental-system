import React, { useState, useMemo, useCallback } from 'react';
import type { Client } from '../../clients/types/client.types';
import { Search, UserCheck, Users, X, Building, Phone, Mail, CreditCard } from 'lucide-react';

interface ClientSelectorModalProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onClose: () => void;
}

export const ClientSelectorModal: React.FC<ClientSelectorModalProps> = ({ clients, onSelectClient, onClose }) => {
  const [query, setQuery] = useState('');

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

  const [filterScope, setFilterScope] = useState<'MY_CLIENTS' | 'ALL'>(() => {
    return isAdvisor && !isAdminOrManager ? 'MY_CLIENTS' : 'ALL';
  });

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

  const filteredClients = clients.filter((c) => {
    if (filterScope === 'MY_CLIENTS' && !isClientAssignedToUser(c)) {
      return false;
    }

    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.razonSocial && c.razonSocial.toLowerCase().includes(q)) ||
      (c.rfc && c.rfc.toLowerCase().includes(q)) ||
      (c.cedula && c.cedula.toLowerCase().includes(q)) ||
      (c.vendedor && c.vendedor.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.toLowerCase().includes(q)) ||
      (c.telMovistar && c.telMovistar.toLowerCase().includes(q)) ||
      (c.telClaro && c.telClaro.toLowerCase().includes(q)) ||
      (c.emailFacturacion && c.emailFacturacion.toLowerCase().includes(q))
    );
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-[#37474F]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#37474F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10">
              <Building className="w-6 h-6 text-[#1A73E8]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Directorio de Clientes / Arrendatarios</h3>
              <p className="text-xs text-white/80 font-medium">Selecciona el cliente para formalizar el contrato</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador y Filtro por Ámbito */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E8EE] space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterScope('MY_CLIENTS')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterScope === 'MY_CLIENTS'
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
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
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Directorio Completo ({clients.length})</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#747780] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Asesor, Razón Social, RUC / Cédula, Teléfono..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="precision-input pl-10 text-xs py-2.5 font-bold"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de Tarjetas de Cliente */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 max-h-[55vh]">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Building className="w-10 h-10 text-[#747780] mx-auto opacity-50" />
              <h4 className="text-sm font-extrabold text-[#1B1D22]">No se encontraron clientes</h4>
              <p className="text-xs text-[#747780]">Intenta con otros términos de búsqueda.</p>
              {filterScope === 'MY_CLIENTS' && (
                <button
                  type="button"
                  onClick={() => setFilterScope('ALL')}
                  className="text-xs text-blue-600 font-bold underline cursor-pointer mt-2 inline-block"
                >
                  Consultar Directorio Completo ({clients.length} clientes)
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredClients.map((c) => {
                const rucCedula = c.rfc || c.cedula || '201-310789-0001B';
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectClient(c);
                      onClose();
                    }}
                    className="p-4 rounded-2xl border border-[#E5E8EE] bg-white hover:border-[#1A73E8] hover:shadow-md hover:bg-[#E8F0FE]/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Avatar / Iniciales */}
                      <div className="w-11 h-11 rounded-2xl bg-[#37474F] text-white flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-[#1A73E8] transition-colors shadow-xs">
                        {getInitials(c.nombre)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-[#1B1D22] group-hover:text-[#1A73E8] transition-colors">
                            {c.nombre}
                          </h4>
                          {c.razonSocial && (
                            <span className="text-[10px] font-bold text-[#747780] bg-[#F4F6F9] px-2 py-0.5 rounded-md border border-[#E5E8EE]">
                              {c.razonSocial}
                            </span>
                          )}
                          {c.vendedor && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Asesor: {c.vendedor}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#747780]">
                          <div className="flex items-center gap-1 font-mono font-bold text-[#1B1D22]">
                            <CreditCard className="w-3.5 h-3.5 text-[#1A73E8]" />
                            <span>RUC/Cédula: {rucCedula}</span>
                          </div>

                          {c.telefono && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-500" />
                              <span>{c.telefono}</span>
                            </div>
                          )}

                          {c.emailFacturacion && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-gray-500" />
                              <span>{c.emailFacturacion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="self-end sm:self-center shrink-0">
                      <span className="px-3.5 py-1.5 rounded-xl bg-[#F4F6F9] text-[#1A73E8] font-black text-xs border border-[#E5E8EE] group-hover:bg-[#1A73E8] group-hover:text-white transition-all shadow-2xs">
                        Seleccionar →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
