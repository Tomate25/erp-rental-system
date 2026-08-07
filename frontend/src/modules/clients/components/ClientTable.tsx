import React from 'react';
import type { Client } from '../types/client.types';
import { Edit2, Trash2, Mail, Phone, MapPin, Users as UsersIcon, CreditCard, DollarSign, UserCheck } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export const ClientTable: React.FC<ClientTableProps> = ({ clients, onEdit, onDelete }) => {
  if (clients.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-16 text-center shadow-sm">
        <div className="p-4 rounded-full bg-slate-50 inline-flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
          <UsersIcon className="w-8 h-8" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-800">No hay clientes registrados</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Comienza dando de alta a tu primer cliente comercial.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* VISTA MÓVIL: Tarjetas */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {clients.map((client) => (
          <div key={client.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <div className="font-extrabold text-slate-900 text-sm">{client.nombre}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {client.numeroCliente ? `ID: ${client.numeroCliente}` : ''}
              </div>
              <div className="flex gap-2 mt-1">
                {client.rfc && (
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/60">
                    RUC: {client.rfc}
                  </span>
                )}
                {client.cedula && (
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/60">
                    CÉDULA: {client.cedula}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t border-b border-slate-100 py-3 text-[11px]">
              <div className="flex items-center gap-2 text-slate-600">
                <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{client.vendedor || 'Sin vendedor'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{client.emailFacturacion || 'Sin correo'}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  {client.telMovistar && <span>Movistar: {client.telMovistar}</span>}
                  {client.telClaro && <span>Claro: {client.telClaro}</span>}
                  {client.telConvencional && <span>Conv: {client.telConvencional}</span>}
                  {!client.telMovistar && !client.telClaro && !client.telConvencional && <span>Sin teléfono</span>}
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{client.direccion || 'Sin dirección'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-slate-600 mt-2">
                <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Límite: {client.limiteCredito ? `$${client.limiteCredito}` : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Condición: {client.condicionPago || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => onEdit(client)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 text-[11px] font-bold"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => onDelete(client.id)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 text-[11px] font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* VISTA ESCRITORIO: Tabla Horizontal (Scrollable) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-3">Nombre</th>
                <th className="p-3">Cédula</th>
                <th className="p-3">RUC</th>
                <th className="p-3">Vendedor</th>
                <th className="p-3 max-w-[150px]">Dirección</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Telf. Movistar</th>
                <th className="p-3">Tel. Claro</th>
                <th className="p-3">Tel. Conv.</th>
                <th className="p-3">Lím. Crédito</th>
                <th className="p-3">Cond. Pago</th>
                <th className="p-3 text-right bg-slate-50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{client.nombre}</div>
                  </td>
                  <td className="p-3 font-mono text-slate-500">{client.cedula || '-'}</td>
                  <td className="p-3 font-mono text-slate-500">{client.rfc || '-'}</td>
                  <td className="p-3 text-slate-700">{client.vendedor || '-'}</td>
                  <td className="p-3 max-w-[200px] break-words">
                    {client.direccion || '-'}
                  </td>
                  <td className="p-3 text-slate-700">{client.emailFacturacion || '-'}</td>
                  <td className="p-3 text-slate-700">{client.telMovistar || '-'}</td>
                  <td className="p-3 text-slate-700">{client.telClaro || '-'}</td>
                  <td className="p-3 text-slate-700">{client.telConvencional || '-'}</td>
                  <td className="p-3 text-slate-700">
                    {client.limiteCredito != null ? `$${client.limiteCredito}` : '-'}
                  </td>
                  <td className="p-3 text-slate-700">{client.condicionPago || '-'}</td>
                  <td className="p-3 text-right bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-slate-100">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(client)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(client.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
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
      </div>
    </div>
  );
};
