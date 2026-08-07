import React, { useState, useEffect } from 'react';
import { getClients } from '../../clients/services/clients.api';
import type { Client } from '../../clients/types/client.types';
import { Search, X } from 'lucide-react';

interface ClientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
}

export const ClientSearchModal: React.FC<ClientSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        setIsLoading(true);
        try {
          const data = await getClients();
          setClients(data);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      load();
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = clients.filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (c.rfc && c.rfc.toLowerCase().includes(search.toLowerCase())) ||
    (c.cedula && c.cedula.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-black text-slate-800 text-lg">Buscar Cliente</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              autoFocus
              placeholder="Buscar por nombre, RUC o cédula..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Cargando clientes...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No se encontraron clientes.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c);
                    onClose();
                  }}
                  className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-between group border border-transparent hover:border-blue-100"
                >
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{c.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.rfc && <span className="mr-2">RUC: {c.rfc}</span>}
                      {c.cedula && <span>Cédula: {c.cedula}</span>}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Seleccionar
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
