import React, { useState } from 'react';
import type { Client } from '../../clients/types/client.types';
import { Search, UserCheck, X, Building, Phone, Mail, MapPin, CreditCard } from 'lucide-react';

interface ClientSelectorModalProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onClose: () => void;
}

export const ClientSelectorModal: React.FC<ClientSelectorModalProps> = ({ clients, onSelectClient, onClose }) => {
  const [query, setQuery] = useState('');

  const filteredClients = clients.filter(c => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.razonSocial && c.razonSocial.toLowerCase().includes(q)) ||
      (c.rfc && c.rfc.toLowerCase().includes(q)) ||
      (c.cedula && c.cedula.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.toLowerCase().includes(q))
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
              <p className="text-xs text-white/80 font-medium">Selecciona el cliente para auto-capturar su ficha legal en el contrato</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador de Clientes */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E8EE]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#747780] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Razón Social, RUC / Cédula, Teléfono..."
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
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-[#1B1D22] group-hover:text-[#1A73E8] transition-colors">
                            {c.nombre}
                          </h4>
                          {c.razonSocial && (
                            <span className="text-[10px] font-bold text-[#747780] bg-[#F4F6F9] px-2 py-0.5 rounded-md border border-[#E5E8EE]">
                              {c.razonSocial}
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

                        {c.direccion && (
                          <div className="flex items-center gap-1 text-[11px] text-[#747780]">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                            <span className="truncate max-w-md">{c.direccion}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-precision-primary bg-[#37474F] group-hover:bg-[#1A73E8] text-xs shrink-0 self-end sm:self-center flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" /> Seleccionar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E8EE] flex items-center justify-between text-xs text-[#747780]">
          <span>Total clientes registrados: <strong className="text-[#1B1D22]">{clients.length}</strong></span>
          <button
            onClick={onClose}
            className="btn-precision-outline text-xs"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};
