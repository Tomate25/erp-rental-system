import { LoadingState } from '../../../shared/components/LoadingState';
import { EmptyState } from '../../../shared/components/EmptyState';
import React, { useState, useEffect } from 'react';
import { getQuotations, sendQuotationEmail, acceptQuotationOnBehalf } from '../services/quotations.api';
import type { Cotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { FileText, Plus, Search, CheckCircle, Clock, XCircle, AlertCircle, Eye, RefreshCw, History, Users, Send, Mail } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import { QuotationForm } from '../components/QuotationForm';
import { QuotationPrintView } from '../components/QuotationPrintView';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { AcceptOnBehalfModal } from '../components/AcceptOnBehalfModal';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Cotizacion[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Cotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'REVISION' | 'RETURNED' | 'APPROVED'>('ALL');
  const [selectedAdvisor, setSelectedAdvisor] = useState('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Cotizacion | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Cotizacion | null>(null);
  const [historyQuoteNumber, setHistoryQuoteNumber] = useState<string | null>(null);

  // Estados para envío al cliente por correo
  const [sendingQuotation, setSendingQuotation] = useState<Cotizacion | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailFeedback, setSendEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados para aceptación en nombre del cliente
  const [acceptingQuotation, setAcceptingQuotation] = useState<Cotizacion | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canAcceptOnBehalf = (q: Cotizacion): boolean => {
    const nonAcceptable = [
      EstadoCotizacionValues.ACEPTADA,
      EstadoCotizacionValues.CONVERTIDA_A_CONTRATO,
      EstadoCotizacionValues.RECHAZADA,
      EstadoCotizacionValues.VENCIDA,
      EstadoCotizacionValues.CANCELADA,
    ];
    return !nonAcceptable.includes(q.estado as any);
  };

  const handleConfirmAcceptOnBehalf = async (data: { medioConfirmacion: string; notas: string }) => {
    if (!acceptingQuotation) return;
    setIsAccepting(true);
    try {
      const res = await acceptQuotationOnBehalf(acceptingQuotation.id, data);
      setActionFeedback({
        type: 'success',
        message: res.message || `Cotización aceptada y Contrato ${res.data.codigoContrato || ''} generado con éxito.`,
      });
      await loadData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Error al aceptar la cotización.',
      });
      throw err;
    } finally {
      setIsAccepting(false);
    }
  };

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const userRoles: string[] = (currentUser?.roles || []).map((r: any) =>
    typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || ''
  );
  const isAdvisorOnly = userRoles.includes('COMERCIAL') && !userRoles.includes('ADMIN') && !userRoles.includes('GERENTE');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getQuotations();
      setQuotations(data);
      setFilteredQuotations(data);
    } catch (error) {
      console.error('Error loading quotations', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = quotations;
    
    // Filtro por tab
    if (activeTab === 'PENDING') {
      result = result.filter(q => q.estado === EstadoCotizacionValues.BORRADOR || q.estado === EstadoCotizacionValues.PENDIENTE);
    } else if (activeTab === 'REVISION') {
      result = result.filter(q => 
        q.estado === EstadoCotizacionValues.EN_REVISION ||
        q.estado === EstadoCotizacionValues.ENVIADA ||
        q.estado === EstadoCotizacionValues.VISTA
      );
    } else if (activeTab === 'RETURNED') {
      result = result.filter(q => q.estado === EstadoCotizacionValues.RECHAZADA || !!q.motivoRechazo || !!q.notasRevision);
    } else if (activeTab === 'APPROVED') {
      result = result.filter(q => q.estado === EstadoCotizacionValues.ACEPTADA || q.estado === EstadoCotizacionValues.CONVERTIDA_A_CONTRATO);
    }

    // Filtro por asesor si es admin/gerente
    if (selectedAdvisor !== 'ALL') {
      result = result.filter(q => (q.asesorId || q.asesor?.id) === selectedAdvisor);
    }

    // Filtro por búsqueda
    const query = searchQuery.toLowerCase().trim();
    if (query !== '') {
      result = result.filter(
        q => 
          q.numeroCotizacion?.toLowerCase().includes(query) ||
          q.cliente?.nombre.toLowerCase().includes(query) ||
          q.proyecto?.toLowerCase().includes(query) ||
          (q.asesor ? `${q.asesor.nombre} ${q.asesor.apellido}`.toLowerCase().includes(query) : false)
      );
    }

    setFilteredQuotations(result);
  }, [searchQuery, activeTab, selectedAdvisor, quotations]);

  const handleCreateNew = () => {
    setEditingQuotation(null);
    setIsFormOpen(true);
  };

  const handleEdit = (q: Cotizacion) => {
    setEditingQuotation(q);
    setIsFormOpen(true);
  };

  const handlePrint = (q: Cotizacion) => {
    setPrintingQuotation(q);
  };

  const openSendModal = (q: Cotizacion) => {
    setSendingQuotation(q);
    setRecipientEmail(q.email || q.cliente?.emailFacturacion || '');
    setSendEmailFeedback(null);
  };

  const handleSendToClient = async () => {
    if (!sendingQuotation) return;
    setIsSendingEmail(true);
    setSendEmailFeedback(null);
    try {
      const response = await sendQuotationEmail(sendingQuotation.id, {
        emailDestino: recipientEmail.trim() || undefined,
      });
      setSendEmailFeedback({ type: 'success', message: response.message });
      await loadData();
    } catch (error: any) {
      setSendEmailFeedback({
        type: 'error',
        message: error?.response?.data?.message || 'No fue posible poner el correo en la cola de envío.',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const canSendQuotation = (q: Cotizacion) => {
    return (
      q.estado !== EstadoCotizacionValues.ACEPTADA &&
      q.estado !== EstadoCotizacionValues.CONVERTIDA_A_CONTRATO &&
      q.estado !== EstadoCotizacionValues.CANCELADA &&
      q.estado !== EstadoCotizacionValues.FACTURADA
    );
  };

  const getStatusBadge = (q: Cotizacion) => {
    if (q.estado === EstadoCotizacionValues.RECHAZADA || !!q.notasRevision) {
      return <span className="px-2.5 py-0.5 rounded-full bg-[#C55500]/10 text-[#C55500] text-[10px] font-bold border border-[#C55500]/20 flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Devuelta</span>;
    }
    switch (q.estado) {
      case EstadoCotizacionValues.ACEPTADA:
      case EstadoCotizacionValues.CONVERTIDA_A_CONTRATO:
        return <span className="px-2.5 py-0.5 rounded-full bg-[#1A73E8]/10 text-[#1A73E8] text-[10px] font-bold border border-[#1A73E8]/20 flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3"/> Aprobada</span>;
      case EstadoCotizacionValues.ENVIADA:
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-max"><Send className="w-3 h-3"/> Enviada</span>;
      case EstadoCotizacionValues.VISTA:
        return <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 flex items-center gap-1 w-max"><Eye className="w-3 h-3"/> Vista</span>;
      case EstadoCotizacionValues.EN_REVISION:
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200 flex items-center gap-1 w-max"><RefreshCw className="w-3 h-3"/> En Revisión</span>;
      case EstadoCotizacionValues.CANCELADA:
        return <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200 flex items-center gap-1 w-max"><XCircle className="w-3 h-3"/> Cancelada</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-[#37474F]/10 text-[#37474F] text-[10px] font-bold border border-[#37474F]/20 flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Pendiente</span>;
    }
  };

  if (printingQuotation) {
    return <QuotationPrintView quotation={printingQuotation} onBack={() => setPrintingQuotation(null)} />;
  }

  if (isFormOpen) {
    return (
      <QuotationForm 
        initialData={editingQuotation} 
        onCancel={() => setIsFormOpen(false)} 
        onSubmitSuccess={() => {
          setIsFormOpen(false);
          loadData();
        }} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#C55500] text-white shadow-md shadow-[#C55500]/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Cotizaciones y Presupuestos</h2>
            <p className="text-xs text-[#747780] font-medium">Gestiona solicitudes comerciales, versiones y autorizaciones.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {isAdvisorOnly && (
            <span className="px-3.5 py-1.5 rounded-2xl bg-blue-50 text-[#1A73E8] text-xs font-black border border-[#1A73E8]/20 flex items-center gap-1.5 shadow-xs">
              <Users className="w-3.5 h-3.5" />
              Mis Cotizaciones ({currentUser?.nombre || 'Asesor'})
            </span>
          )}
          <button
            onClick={handleCreateNew}
            className="btn-precision-tertiary"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cotización</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs underline font-normal cursor-pointer ml-3"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Toolbar y Pestañas con Contadores de Cotizaciones */}
      {(() => {
        const countAll = quotations.length;
        const countPending = quotations.filter(q => q.estado === EstadoCotizacionValues.BORRADOR || q.estado === EstadoCotizacionValues.PENDIENTE).length;
        const countRevision = quotations.filter(q => 
          q.estado === EstadoCotizacionValues.EN_REVISION ||
          q.estado === EstadoCotizacionValues.ENVIADA ||
          q.estado === EstadoCotizacionValues.VISTA
        ).length;
        const countReturned = quotations.filter(q => q.estado === EstadoCotizacionValues.RECHAZADA || !!q.motivoRechazo || !!q.notasRevision).length;
        const countApproved = quotations.filter(q => q.estado === EstadoCotizacionValues.ACEPTADA || q.estado === EstadoCotizacionValues.CONVERTIDA_A_CONTRATO).length;

        return (
          <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex bg-[#F4F6F9] p-1 rounded-xl w-full md:w-auto border border-[#E5E8EE] overflow-x-auto">
              {[
                { id: 'ALL', label: 'Todas', count: countAll },
                { id: 'PENDING', label: 'Pendientes', count: countPending },
                { id: 'REVISION', label: 'En Revisión', count: countRevision },
                { id: 'RETURNED', label: 'Devueltas', count: countReturned },
                { id: 'APPROVED', label: 'Aprobadas', count: countApproved }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 md:flex-none px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                      : 'text-[#747780] hover:text-[#1B1D22]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === tab.id
                      ? 'bg-[#E8F0FE] text-[#1A73E8]'
                      : 'bg-[#E5E8EE] text-[#747780]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {!isAdvisorOnly && (
                <div className="relative">
                  <select
                    value={selectedAdvisor}
                    onChange={(e) => setSelectedAdvisor(e.target.value)}
                    className="bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl px-3 py-2 text-xs font-bold text-[#1B1D22] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Todos los Asesores</option>
                    {Array.from(
                      new Map(
                        quotations
                          .filter((q) => q.asesor)
                          .map((q) => [q.asesor!.id, `${q.asesor!.nombre} ${q.asesor!.apellido}`])
                      ).entries()
                    ).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative w-full md:w-64 shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar cotización..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="precision-input pl-10 text-xs w-full"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lista */}
      {isLoading ? (
        <LoadingState message="Cargando cotizaciones..." />
      ) : filteredQuotations.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          tone="neutral"
          title="No hay cotizaciones registradas"
          description="Aún no tienes documentos en esta categoría."
        />
      ) : (
        <div className="bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] uppercase tracking-wider text-[10px] font-extrabold">
                  <th className="p-4">N° Cotización</th>
                  <th className="p-4">Cliente / Proyecto</th>
                  <th className="p-4">Asesor</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE] text-[#37474F] font-medium">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-[#1B1D22]">{q.numeroCotizacion}</div>
                      <div className="text-[10px] text-[#747780] font-mono mt-0.5">v{q.version}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-[#1B1D22]">{q.cliente?.nombre || 'Sin cliente'}</div>
                      {q.proyecto && <div className="text-[10px] text-[#747780] mt-0.5">{q.proyecto}</div>}
                    </td>
                    <td className="p-4">
                      {q.asesor ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center">
                            {q.asesor.nombre.charAt(0)}
                          </span>
                          <span className="font-semibold text-[#1B1D22] text-xs">
                            {q.asesor.nombre} {q.asesor.apellido}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#747780] text-[11px] italic">Sin Asesor</span>
                      )}
                    </td>
                    <td className="p-4 text-[#747780]">
                      {new Date(q.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right font-black text-[#1B1D22]">
                      {formatCurrency(q.total)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(q)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canAcceptOnBehalf(q) && (
                          <button
                            onClick={() => setAcceptingQuotation(q)}
                            className="p-1.5 text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer flex items-center gap-1 font-bold text-[10px] px-2 shadow-xs"
                            title="Aceptar cotización en nombre del cliente y generar contrato"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                            Aceptar
                          </button>
                        )}
                        {canSendQuotation(q) && (
                          <button
                            onClick={() => openSendModal(q)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 cursor-pointer flex items-center gap-1 font-bold text-[10px] px-2"
                            title={
                              q.estado === EstadoCotizacionValues.ENVIADA || q.estado === EstadoCotizacionValues.VISTA
                                ? 'Reenviar cotización al cliente'
                                : 'Enviar cotización al cliente para aceptar o rechazar'
                            }
                          >
                            <Send className="w-3.5 h-3.5" />
                            {q.estado === EstadoCotizacionValues.ENVIADA || q.estado === EstadoCotizacionValues.VISTA
                              ? 'Reenviar'
                              : 'Enviar'}
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryQuoteNumber(q.numeroCotizacion)}
                          className="p-1.5 text-[#C55500] hover:bg-[#FDF2E9] rounded-lg transition-colors border border-[#E5E8EE]"
                          title="Ver Historial de Versiones"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(q)}
                          className="p-1.5 text-[#1A73E8] hover:bg-[#E8F0FE] rounded-lg transition-colors border border-[#E5E8EE]"
                          title="Ver / Editar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(q)}
                          className="p-1.5 text-[#37474F] hover:bg-[#F4F6F9] rounded-lg transition-colors border border-[#E5E8EE]"
                          title="Imprimir PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Historial Completo de Versiones (v1, v2, v3...) */}
      <VersionHistoryModal
        isOpen={!!historyQuoteNumber}
        numeroCotizacion={historyQuoteNumber}
        onClose={() => setHistoryQuoteNumber(null)}
        onSelectVersion={(selectedVersion) => {
          setHistoryQuoteNumber(null);
          handleEdit(selectedVersion);
        }}
      />

      {sendingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><Mail className="h-5 w-5" /></div>
              <div>
                <h3 className="font-black text-slate-900">
                  {sendingQuotation.estado === EstadoCotizacionValues.ENVIADA || sendingQuotation.estado === EstadoCotizacionValues.VISTA
                    ? 'Reenviar cotización al cliente'
                    : 'Enviar cotización al cliente'}
                </h3>
                <p className="text-xs text-slate-500">{sendingQuotation.numeroCotizacion} · v{sendingQuotation.version}</p>
              </div>
            </div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Correo destinatario</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              className="precision-input w-full text-xs"
              placeholder="cliente@empresa.com"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">El cliente recibirá un enlace seguro con las acciones Aceptar y Rechazar. Solo la aceptación desde ese enlace genera el contrato.</p>
            {sendEmailFeedback && (
              <div className={`mt-4 rounded-xl border p-3 text-xs ${sendEmailFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {sendEmailFeedback.message}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={isSendingEmail} onClick={() => setSendingQuotation(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Cerrar</button>
              <button type="button" disabled={isSendingEmail || !recipientEmail.trim()} onClick={handleSendToClient} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                <Send className="h-4 w-4" /> {isSendingEmail ? 'Encolando…' : (sendingQuotation.estado === EstadoCotizacionValues.ENVIADA || sendingQuotation.estado === EstadoCotizacionValues.VISTA ? 'Reenviar al cliente' : 'Enviar al cliente')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AcceptOnBehalfModal
        isOpen={!!acceptingQuotation}
        quotation={acceptingQuotation}
        onClose={() => setAcceptingQuotation(null)}
        onConfirm={handleConfirmAcceptOnBehalf}
        isLoading={isAccepting}
      />
    </div>
  );
};
