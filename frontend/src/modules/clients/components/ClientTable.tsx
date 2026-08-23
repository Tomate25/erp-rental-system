import React, { useState } from 'react';
import type { Client } from '../types/client.types';
import {
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Users as UsersIcon,
  UserCheck,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Building2,
  FileText
} from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export const ClientTable: React.FC<ClientTableProps> = ({ clients, onEdit, onDelete }) => {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  if (clients.length === 0) {
    return (
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-10 sm:p-16 text-center shadow-xs font-sans">
        <div className="p-4 rounded-2xl bg-[#E8F0FE] inline-flex items-center justify-center text-[#1A73E8] mb-4 border border-[#1A73E8]/10">
          <UsersIcon className="w-8 h-8" />
        </div>
        <h3 className="text-sm sm:text-base font-extrabold text-[#1B1D22]">No hay clientes registrados</h3>
        <p className="text-xs text-[#747780] max-w-sm mx-auto mt-1 leading-relaxed font-medium">
          Comienza dando de alta a tu primer cliente comercial.
        </p>
      </div>
    );
  }

  // Cálculos de Paginación
  const totalPages = Math.ceil(clients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentClients = clients.slice(startIndex, startIndex + pageSize);

  const toggleExpand = (id: string) => {
    setExpandedClientId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4 font-sans">
      
      {/* VISTA MÓVIL / CARDS ACCESIBLES */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {currentClients.map((client) => {
          const isExpanded = expandedClientId === client.id;
          return (
            <div key={client.id} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer" onClick={() => toggleExpand(client.id)}>
                  <div className="font-extrabold text-[#1B1D22] text-sm hover:text-[#1A73E8] transition-colors">{client.nombre}</div>
                  <div className="text-[10px] text-[#747780] mt-0.5 font-medium">
                    {client.numeroCliente ? `ID: ${client.numeroCliente}` : ''}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {client.rfc && (
                      <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-[#F4F6F9] text-[#37474F] border border-[#E5E8EE]">
                        RUC: {client.rfc}
                      </span>
                    )}
                    {client.cedula && (
                      <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-[#F4F6F9] text-[#37474F] border border-[#E5E8EE]">
                        CÉDULA: {client.cedula}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleExpand(client.id)}
                  className="p-1.5 rounded-lg bg-[#F4F6F9] text-[#37474F] hover:bg-[#E8F0FE] hover:text-[#1A73E8] transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Contenido contraído vs extendido */}
              <div className="space-y-2 border-t border-b border-[#E5E8EE] py-3 text-[11px]">
                <div className="flex items-center gap-2 text-[#37474F]">
                  <UserCheck className="w-4 h-4 text-[#747780] shrink-0" />
                  <span className="truncate font-medium">Vendedor: {client.vendedor || 'Sin asignar'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#37474F]">
                  <Mail className="w-4 h-4 text-[#747780] shrink-0" />
                  <span className="truncate font-medium">{client.emailFacturacion || 'Sin correo'}</span>
                </div>

                {isExpanded && (
                  <div className="space-y-3 pt-2 border-t border-[#E5E8EE] animate-fadeIn">
                    <div className="flex items-start gap-2 text-[#37474F]">
                      <Phone className="w-4 h-4 text-[#747780] shrink-0 mt-0.5" />
                      <div className="flex flex-col font-medium">
                        {client.telMovistar && <span>Movistar: {client.telMovistar}</span>}
                        {client.telClaro && <span>Claro: {client.telClaro}</span>}
                        {client.telConvencional && <span>Convencional: {client.telConvencional}</span>}
                        {!client.telMovistar && !client.telClaro && !client.telConvencional && <span>Sin teléfono registrado</span>}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-[#37474F]">
                      <MapPin className="w-4 h-4 text-[#747780] shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{client.direccion || 'Sin dirección registrada'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-[#F4F6F9] p-2.5 rounded-xl border border-[#E5E8EE]">
                        <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Límite Crédito</span>
                        <span className="font-extrabold text-[#C55500] text-xs">{client.limiteCredito ? `$${client.limiteCredito}` : 'Sin límite'}</span>
                      </div>
                      <div className="bg-[#F4F6F9] p-2.5 rounded-xl border border-[#E5E8EE]">
                        <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Condición Pago</span>
                        <span className="font-extrabold text-[#1A73E8] text-xs">{client.condicionPago || 'Contado'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => toggleExpand(client.id)}
                  className="text-[11px] font-extrabold text-[#1A73E8] flex items-center gap-1"
                >
                  {isExpanded ? 'Ver menos datos' : 'Ver ficha completa'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E8EE] text-[#37474F] hover:text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-colors flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* VISTA ESCRITORIO CON FILAS EXPANDIBLES (FICHA DE CLIENTE SIN RECORTE DE TEXTO) */}
      <div className="hidden md:block bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] uppercase tracking-wider font-extrabold text-[10px]">
              <th className="p-3.5 w-10"></th>
              <th className="p-3.5">Cliente / Razón Social</th>
              <th className="p-3.5">RUC / Cédula</th>
              <th className="p-3.5">Vendedor</th>
              <th className="p-3.5">Teléfono / Correo</th>
              <th className="p-3.5">Límite Crédito</th>
              <th className="p-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E8EE] text-[#37474F] font-medium">
            {currentClients.map((client) => {
              const isExpanded = expandedClientId === client.id;
              return (
                <React.Fragment key={client.id}>
                  {/* Fila Principal */}
                  <tr
                    onClick={() => toggleExpand(client.id)}
                    className={`cursor-pointer transition-colors ${
                      isExpanded ? 'bg-[#E8F0FE]/30' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <td className="p-3.5 text-center text-[#747780]">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#1A73E8]" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-[#1B1D22] text-xs hover:text-[#1A73E8] transition-colors">
                        {client.nombre}
                      </div>
                      {client.razonSocial && (
                        <div className="text-[10px] text-[#747780] font-normal truncate max-w-xs">
                          {client.razonSocial}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[#37474F]">
                      {client.rfc ? (
                        <span className="font-bold text-[#1A73E8]">RUC: {client.rfc}</span>
                      ) : client.cedula ? (
                        <span>CÉD: {client.cedula}</span>
                      ) : (
                        <span className="text-[#747780]">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-[#37474F] font-semibold">
                      {client.vendedor || <span className="text-[#747780] font-normal">Sin asignar</span>}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-[#1B1D22]">
                        {client.telMovistar || client.telClaro || client.telConvencional || 'Sin teléfono'}
                      </div>
                      {client.emailFacturacion && (
                        <div className="text-[10px] text-[#747780] truncate max-w-xs">
                          {client.emailFacturacion}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-black text-[#C55500]">
                        {client.limiteCredito ? `$${client.limiteCredito}` : 'Contado'}
                      </div>
                      <div className="text-[9px] text-[#747780] uppercase font-bold">
                        {client.condicionPago || 'Contado'}
                      </div>
                    </td>
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleExpand(client.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E5E8EE] bg-white text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors text-[10px] font-extrabold flex items-center gap-1"
                          title="Expandir Ficha"
                        >
                          {isExpanded ? 'Ocultar Ficha' : 'Ver Ficha'}
                        </button>
                        <button
                          onClick={() => onEdit(client)}
                          className="p-1.5 rounded-lg border border-[#E5E8EE] text-[#747780] hover:text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(client.id)}
                          className="p-1.5 rounded-lg border border-[#E5E8EE] text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Fila Extendida (Ficha Completa del Cliente sin Recortes) */}
                  {isExpanded && (
                    <tr className="bg-[#F8FAFC]">
                      <td colSpan={7} className="p-5 border-t border-b border-[#1A73E8]/20">
                        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EE] shadow-xs space-y-4 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-[#1A73E8]" />
                              <h4 className="font-black text-sm text-[#1B1D22]">
                                Ficha Comercial del Cliente: {client.nombre}
                              </h4>
                              {client.numeroCliente && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#1A73E8]">
                                  Código #{client.numeroCliente}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onEdit(client)}
                                className="btn-precision-primary text-xs py-1.5 px-3"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Editar Ficha
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                            {/* Sección 1: Identificación Fiscal */}
                            <div className="space-y-2.5">
                              <h5 className="font-extrabold text-[10px] text-[#747780] uppercase tracking-wider flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-[#1A73E8]" /> Datos Fiscales
                              </h5>
                              <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE] space-y-1.5">
                                <div>
                                  <span className="text-[10px] text-[#747780] font-bold block">Razón Social:</span>
                                  <span className="font-extrabold text-[#1B1D22]">{client.razonSocial || client.nombre}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#747780] font-bold block">RUC / Identificación Fiscal:</span>
                                  <span className="font-mono font-bold text-[#1A73E8]">{client.rfc || 'No registrado'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#747780] font-bold block">Cédula de Identidad:</span>
                                  <span className="font-mono font-bold text-[#37474F]">{client.cedula || 'No registrada'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Sección 2: Contacto y Teléfonos */}
                            <div className="space-y-2.5">
                              <h5 className="font-extrabold text-[10px] text-[#747780] uppercase tracking-wider flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-[#1A73E8]" /> Teléfonos y Correo
                              </h5>
                              <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE] space-y-1.5">
                                <div>
                                  <span className="text-[10px] text-[#747780] font-bold block">Vendedor Asignado:</span>
                                  <span className="font-extrabold text-[#1B1D22]">{client.vendedor || 'Sin vendedor asignado'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#747780] font-bold block">Email de Facturación:</span>
                                  <span className="font-bold text-[#1B1D22] break-all">{client.emailFacturacion || 'Sin correo registrado'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#747780] font-bold block">Teléfonos Directos:</span>
                                  <div className="font-medium text-[#37474F] space-y-0.5 mt-0.5">
                                    {client.telMovistar && <div>· Movistar: <span className="font-bold text-[#1B1D22]">{client.telMovistar}</span></div>}
                                    {client.telClaro && <div>· Claro: <span className="font-bold text-[#1B1D22]">{client.telClaro}</span></div>}
                                    {client.telConvencional && <div>· Convencional: <span className="font-bold text-[#1B1D22]">{client.telConvencional}</span></div>}
                                    {!client.telMovistar && !client.telClaro && !client.telConvencional && <div>No hay teléfonos registrados</div>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Sección 3: Dirección y Crédito */}
                            <div className="space-y-2.5">
                              <h5 className="font-extrabold text-[10px] text-[#747780] uppercase tracking-wider flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#1A73E8]" /> Dirección y Crédito
                              </h5>
                              <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE] space-y-2">
                                <div>
                                  <span className="text-[10px] text-[#747780] font-bold block">Dirección Completa:</span>
                                  <p className="font-medium text-[#1B1D22] leading-relaxed whitespace-pre-wrap">
                                    {client.direccion || 'Sin dirección registrada'}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E8EE]">
                                  <div>
                                    <span className="text-[9px] text-[#747780] font-bold block">Límite Crédito:</span>
                                    <span className="font-black text-[#C55500] text-sm">{client.limiteCredito ? `$${client.limiteCredito}` : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[#747780] font-bold block">Condición:</span>
                                    <span className="font-extrabold text-[#1A73E8] text-xs">{client.condicionPago || 'Contado'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* BARRA DE PAGINACIÓN */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-[#747780]">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 bg-[#F4F6F9] border border-[#E5E8EE] rounded-lg text-xs font-bold text-[#1B1D22] focus:outline-none"
          >
            <option value={15}>15 clientes</option>
            <option value={30}>30 clientes</option>
            <option value={50}>50 clientes</option>
            <option value={100}>100 clientes</option>
          </select>
          <span>por página · Mostrando <strong className="text-[#1B1D22]">{startIndex + 1}</strong> a <strong className="text-[#1B1D22]">{Math.min(startIndex + pageSize, clients.length)}</strong> de <strong className="text-[#1B1D22]">{clients.length}</strong></span>
        </div>

        {/* Controles de página */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl border border-[#E5E8EE] text-[#747780] hover:text-[#1B1D22] hover:bg-[#F4F6F9] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Página Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="px-3 py-1 bg-[#E8F0FE] text-[#1A73E8] font-black text-xs rounded-xl border border-[#1A73E8]/20">
            {currentPage} / {totalPages || 1}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 rounded-xl border border-[#E5E8EE] text-[#747780] hover:text-[#1B1D22] hover:bg-[#F4F6F9] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Página Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
