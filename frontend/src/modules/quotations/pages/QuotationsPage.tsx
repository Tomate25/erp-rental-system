import { LoadingState } from '../../../shared/components/LoadingState';
import { EmptyState } from '../../../shared/components/EmptyState';
import React, { useState, useEffect } from 'react';
import { getQuotations, acceptQuotationOnBehalf, approveInternalQuotation, cancelQuotation } from '../services/quotations.api';
import type { Cotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { Search, AlertCircle, Sparkles, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import { groupQuotationsByNumber, type QuotationGroup } from '../utils/quotation-groups';
import { QuotationForm } from '../components/QuotationForm';
import { QuotationPrintView } from '../components/QuotationPrintView';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { AcceptOnBehalfModal } from '../components/AcceptOnBehalfModal';
import { CancelQuotationModal } from '../components/CancelQuotationModal';
import { getStoredUser } from '../../../shared/utils/auth-storage';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Cotizacion[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<QuotationGroup[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'REVISION' | 'RETURNED' | 'APPROVED' | 'CANCELLED'>('ALL');
  const [selectedAdvisor, setSelectedAdvisor] = useState('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Cotizacion | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Cotizacion | null>(null);
  const [historyQuoteNumber, setHistoryQuoteNumber] = useState<string | null>(null);

  // Estados para aceptación en nombre del cliente y cancelación posterior a aprobación
  const [acceptingQuotation, setAcceptingQuotation] = useState<Cotizacion | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [cancellingQuotation, setCancellingQuotation] = useState<Cotizacion | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [startModification, setStartModification] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyPublicLink = async (tokenPublico?: string | null) => {
    if (!tokenPublico) return;
    const url = `${window.location.origin}/cotizacion/${tokenPublico}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(tokenPublico);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch {
      window.prompt('Copia el enlace de la cotización:', url);
    }
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

  const currentUser = getStoredUser<any>();

  const userRoles: string[] = (currentUser?.roles || []).map((r: any) =>
    typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || ''
  );
  const isAdvisorOnly = userRoles.includes('COMERCIAL') && !userRoles.includes('ADMIN') && !userRoles.includes('GERENTE');
  const canApproveInternal = userRoles.some((r) => ['ADMIN', 'GERENTE', 'SUPERADMIN'].includes(r));

  const canAcceptOnBehalf = (q: Cotizacion): boolean => {
    if (!canApproveInternal) return false;
    return (
      q.estado === EstadoCotizacionValues.ENVIADA ||
      q.estado === EstadoCotizacionValues.VISTA
    );
  };

  const canCancelQuotation = (q: Cotizacion): boolean =>
    q.estado === EstadoCotizacionValues.PENDIENTE ||
    q.estado === EstadoCotizacionValues.ENVIADA ||
    q.estado === EstadoCotizacionValues.VISTA ||
    q.estado === EstadoCotizacionValues.ACEPTADA ||
    q.estado === EstadoCotizacionValues.CONVERTIDA_A_CONTRATO;

  const handleConfirmCancelQuotation = async (motivo: string) => {
    if (!cancellingQuotation) return;
    setIsCancelling(true);
    try {
      const res = await cancelQuotation(cancellingQuotation.id, motivo);
      setActionFeedback({
        type: 'success',
        message: res.message || `Cotización ${cancellingQuotation.numeroCotizacion} cancelada con éxito.`,
      });
      await loadData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Error al cancelar la cotización.',
      });
      throw err;
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApproveInternal = async (q: Cotizacion) => {
    setApprovingId(q.id);
    try {
      const res = await approveInternalQuotation(q.id);
      setActionFeedback({
        type: 'success',
        message: res.message || `Cotización ${q.numeroCotizacion} aprobada internamente y marcada como enviada al cliente.`,
      });
      await loadData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Error al autorizar la cotización.',
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleSuggestModification = (q: Cotizacion) => {
    setEditingQuotation(q);
    setStartModification(true);
    setIsFormOpen(true);
  };

  const groupedQuotations = React.useMemo(
    () => groupQuotationsByNumber(quotations),
    [quotations],
  );

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getQuotations();
      setQuotations(data);
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
    let result = groupedQuotations;

    // Filtro por tab usando la versión vigente de cada carpeta
    if (activeTab === 'PENDING') {
      result = result.filter(
        ({ latest: q }) =>
          q.estado === EstadoCotizacionValues.BORRADOR ||
          q.estado === EstadoCotizacionValues.PENDIENTE,
      );
    } else if (activeTab === 'REVISION') {
      result = result.filter(
        ({ latest: q }) =>
          q.estado === EstadoCotizacionValues.EN_REVISION ||
          q.estado === EstadoCotizacionValues.ENVIADA ||
          q.estado === EstadoCotizacionValues.VISTA,
      );
    } else if (activeTab === 'RETURNED') {
      result = result.filter(
        ({ latest: q }) =>
          q.estado !== EstadoCotizacionValues.CANCELADA &&
          (q.estado === EstadoCotizacionValues.RECHAZADA ||
            !!q.motivoRechazo ||
            !!q.notasRevision),
      );
    } else if (activeTab === 'APPROVED') {
      result = result.filter(
        ({ latest: q }) =>
          q.estado === EstadoCotizacionValues.ACEPTADA ||
          q.estado === EstadoCotizacionValues.CONVERTIDA_A_CONTRATO,
      );
    } else if (activeTab === 'CANCELLED') {
      result = result.filter(
        ({ latest: q }) => q.estado === EstadoCotizacionValues.CANCELADA,
      );
    }

    // Filtro por asesor si es admin/gerente
    if (selectedAdvisor !== 'ALL') {
      result = result.filter(
        ({ latest: q }) => (q.asesorId || q.asesor?.id) === selectedAdvisor,
      );
    }

    // Filtro por búsqueda
    const query = searchQuery.toLowerCase().trim();
    if (query !== '') {
      result = result.filter(
        ({ latest: q }) =>
          q.numeroCotizacion?.toLowerCase().includes(query) ||
          q.cliente?.nombre.toLowerCase().includes(query) ||
          q.proyecto?.toLowerCase().includes(query) ||
          (q.asesor
            ? `${q.asesor.nombre} ${q.asesor.apellido}`
                .toLowerCase()
                .includes(query)
            : false),
      );
    }

    setFilteredGroups(result);
  }, [searchQuery, activeTab, selectedAdvisor, groupedQuotations]);

  const handleCreateNew = () => {
    setEditingQuotation(null);
    setStartModification(false);
    setIsFormOpen(true);
  };

  const handleEdit = (q: Cotizacion) => {
    setEditingQuotation(q);
    setStartModification(false);
    setIsFormOpen(true);
  };

  const handlePrint = (q: Cotizacion) => {
    setPrintingQuotation(q);
  };

  const canModifyQuotation = (q: Cotizacion) =>
    q.estado === EstadoCotizacionValues.PENDIENTE ||
    q.estado === EstadoCotizacionValues.ENVIADA ||
    q.estado === EstadoCotizacionValues.VISTA;

  const getStatusBadge = (q: Cotizacion) => {
    if (q.estado === EstadoCotizacionValues.CANCELADA) {
      return (
        <span className="px-2.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 w-max">
          Cancelada
        </span>
      );
    }
    if (q.estado === EstadoCotizacionValues.RECHAZADA || (q.estado !== EstadoCotizacionValues.PENDIENTE && !!q.notasRevision)) {
      return <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 w-max">Devuelta</span>;
    }
    switch (q.estado) {
      case EstadoCotizacionValues.ACEPTADA:
      case EstadoCotizacionValues.CONVERTIDA_A_CONTRATO:
        return <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 w-max">Aceptada</span>;
      case EstadoCotizacionValues.PENDIENTE:
        return <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200 w-max" title="Autorizada por Gerencia (Lista para enviar al cliente)">Autorizada</span>;
      case EstadoCotizacionValues.ENVIADA:
        return <span className="px-2.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-200 w-max">Enviada</span>;
      case EstadoCotizacionValues.VISTA:
        return <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[10px] font-bold border border-indigo-200 w-max">Vista</span>;
      case EstadoCotizacionValues.EN_REVISION:
        return <span className="px-2.5 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-bold border border-purple-200 w-max">En revisión</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 w-max">Borrador</span>;
    }
  };

  if (printingQuotation) {
    return <QuotationPrintView quotation={printingQuotation} onBack={() => setPrintingQuotation(null)} />;
  }

  if (isFormOpen) {
    return (
      <QuotationForm 
        initialData={editingQuotation} 
        startModification={startModification}
        onCancel={() => {
          setIsFormOpen(false);
          setStartModification(false);
        }} 
        onSubmitSuccess={() => {
          setIsFormOpen(false);
          setStartModification(false);
          loadData();
        }} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Cotizaciones y Presupuestos</h2>
          <p className="text-xs text-[#747780] font-medium">Presupuesto, versiones y autorización antes del contrato.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {isAdvisorOnly && (
            <span className="px-3.5 py-1.5 rounded-2xl bg-blue-50 text-[#1A73E8] text-xs font-black border border-[#1A73E8]/20 flex items-center gap-1.5 shadow-xs">
              Mis cotizaciones ({currentUser?.nombre || 'Asesor'})
            </span>
          )}
          <button
            onClick={handleCreateNew}
            className="btn-precision-tertiary"
          >
            <span>Nueva cotización</span>
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
        const latestQuotes = groupedQuotations.map((g) => g.latest);
        const countAll = latestQuotes.length;
        const countPending = latestQuotes.filter(q => q.estado === EstadoCotizacionValues.BORRADOR || q.estado === EstadoCotizacionValues.PENDIENTE).length;
        const countRevision = latestQuotes.filter(q => 
          q.estado === EstadoCotizacionValues.EN_REVISION ||
          q.estado === EstadoCotizacionValues.ENVIADA ||
          q.estado === EstadoCotizacionValues.VISTA
        ).length;
        const countReturned = latestQuotes.filter(q => q.estado !== EstadoCotizacionValues.CANCELADA && (q.estado === EstadoCotizacionValues.RECHAZADA || !!q.motivoRechazo || !!q.notasRevision)).length;
        const countApproved = latestQuotes.filter(q => q.estado === EstadoCotizacionValues.ACEPTADA || q.estado === EstadoCotizacionValues.CONVERTIDA_A_CONTRATO).length;
        const countCancelled = latestQuotes.filter(q => q.estado === EstadoCotizacionValues.CANCELADA).length;

        return (
          <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex bg-[#F4F6F9] p-1 rounded-xl w-full md:w-auto border border-[#E5E8EE] overflow-x-auto">
              {[
                { id: 'ALL', label: 'Todas', count: countAll },
                { id: 'PENDING', label: 'Pendientes', count: countPending },
                { id: 'REVISION', label: 'En Revisión', count: countRevision },
                { id: 'RETURNED', label: 'Devueltas', count: countReturned },
                { id: 'APPROVED', label: 'Aprobadas', count: countApproved },
                { id: 'CANCELLED', label: 'Canceladas', count: countCancelled }
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
      ) : filteredGroups.length === 0 ? (
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
                {filteredGroups.map((group) => {
                  const q = group.latest;
                  const hasFolder = group.archivedVersions.length > 0;
                  const isExpanded = Boolean(expandedFolders[group.key]);

                  return (
                    <React.Fragment key={group.key}>
                      <tr className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-4">
                          <div className="font-extrabold text-[#1B1D22] flex items-center gap-1.5">
                            {hasFolder && (
                              <button
                                type="button"
                                onClick={() => toggleFolder(group.key)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#D2E3FC] transition-colors cursor-pointer"
                                title={isExpanded ? 'Cerrar carpeta de versiones anteriores' : `Ver ${group.archivedVersions.length} versión(es) anterior(es) archivada(s)`}
                              >
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                {isExpanded ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <span>{q.numeroCotizacion}</span>
                          </div>
                          <div className="text-[10px] text-[#747780] font-mono mt-0.5 flex items-center gap-1.5">
                            <span>v{q.version}</span>
                            {hasFolder && (
                              <span className="text-[9.5px] font-sans font-bold text-[#1A73E8]">
                                ({group.versions.length} vers. en carpeta)
                              </span>
                            )}
                          </div>
                          {q.promocionNombre && (
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              <span className="truncate max-w-[120px]" title={q.promocionNombre}>
                                {q.promocionNombre}
                              </span>
                            </div>
                          )}
                        </td>
                    <td className="p-4">
                      <div className="font-extrabold text-[#1B1D22] flex items-center gap-1.5 flex-wrap">
                        <span>{q.cliente?.nombre || 'Sin cliente'}</span>
                        {(q.cliente?.nombre?.toUpperCase().includes('PRUEBA') || !q.asesor) && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            Prueba
                          </span>
                        )}
                      </div>
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
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(q)}
                        {q.estado === EstadoCotizacionValues.CANCELADA && q.motivoRechazo && (
                          <span
                            className="text-[10px] text-slate-500 max-w-[200px] truncate"
                            title={q.motivoRechazo}
                          >
                            Motivo: {q.motivoRechazo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {canApproveInternal && (q.estado === EstadoCotizacionValues.EN_REVISION || q.estado === EstadoCotizacionValues.BORRADOR || q.estado === EstadoCotizacionValues.PENDIENTE) && (
                          <button
                            onClick={() => handleApproveInternal(q)}
                            disabled={approvingId === q.id}
                            className="p-1.5 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 cursor-pointer flex items-center gap-1 font-bold text-[10px] px-2 shadow-xs"
                            title="Aprobar internamente y marcar como enviada al cliente"
                          >
                            {approvingId === q.id ? '...' : 'Aprobar'}
                          </button>
                        )}
                        {canAcceptOnBehalf(q) && (
                          <button
                            onClick={() => setAcceptingQuotation(q)}
                            className="p-1.5 text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer flex items-center gap-1 font-bold text-[10px] px-2 shadow-xs"
                            title="Confirmar que el cliente aprobó mediante los términos y generar contrato"
                          >
                            Aceptar
                          </button>
                        )}
                        {canModifyQuotation(q) && (
                          <button
                            onClick={() => handleSuggestModification(q)}
                            className="p-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer flex items-center gap-1 font-bold text-[10px] px-2"
                            title="Abrir en modo modificación; la nueva versión se creará solo al confirmar y guardar"
                          >
                            Modificar
                          </button>
                        )}
                        {canCancelQuotation(q) && (
                          <button
                            type="button"
                            onClick={() => setCancellingQuotation(q)}
                            className="px-2 py-1.5 text-[10px] font-bold text-red-700 bg-white hover:bg-red-50 rounded-lg transition-colors border border-red-200 cursor-pointer"
                            title="Cancelar cotización porque el cliente desistió"
                          >
                            Cancelar
                          </button>
                        )}
                        {q.tokenPublico && q.estado !== EstadoCotizacionValues.CANCELADA && (
                          <>
                            <button
                              onClick={() => window.open(`/cotizacion/${q.tokenPublico}`, '_blank', 'noopener,noreferrer')}
                              className="px-2 py-1.5 text-[10px] font-bold text-[#1A73E8] hover:bg-[#E8F0FE] rounded-lg transition-colors border border-[#1A73E8]/30 cursor-pointer"
                              title="Abrir visualización de la cotización"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => copyPublicLink(q.tokenPublico)}
                              className="px-2 py-1.5 text-[10px] font-bold text-[#37474F] hover:bg-[#F4F6F9] rounded-lg transition-colors border border-[#E5E8EE] cursor-pointer"
                              title={copiedToken === q.tokenPublico ? 'Enlace copiado' : 'Copiar enlace de visualización para el cliente'}
                            >
                              {copiedToken === q.tokenPublico ? 'Copiado' : 'Enlace'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setHistoryQuoteNumber(q.numeroCotizacion)}
                          className="px-2 py-1.5 text-[10px] font-bold text-[#37474F] hover:bg-[#F4F6F9] rounded-lg transition-colors border border-[#E5E8EE]"
                        >
                          Historial
                        </button>
                        <button
                          onClick={() => handleEdit(q)}
                          className="px-2 py-1.5 text-[10px] font-bold text-[#37474F] hover:bg-[#F4F6F9] rounded-lg transition-colors border border-[#E5E8EE]"
                        >
                          Abrir
                        </button>
                        <button
                          onClick={() => handlePrint(q)}
                          className="px-2 py-1.5 text-[10px] font-bold text-[#37474F] hover:bg-[#F4F6F9] rounded-lg transition-colors border border-[#E5E8EE]"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                      {isExpanded &&
                        group.archivedVersions.map((arch) => (
                          <tr key={arch.id} className="bg-slate-50/80 hover:bg-slate-100/70 transition-colors text-[11px]">
                            <td className="p-3 pl-8">
                              <div className="font-bold text-slate-600 flex items-center gap-1.5">
                                <span className="text-slate-400">↳</span>
                                <span>{arch.numeroCotizacion} · v{arch.version}</span>
                              </div>
                              <div className="text-[9.5px] text-slate-500 pl-4">Versión anterior archivada</div>
                            </td>
                            <td className="p-3 text-slate-600">
                              <div>{arch.cliente?.nombre || 'Sin cliente'}</div>
                              {arch.proyecto && <div className="text-[10px] text-slate-500">{arch.proyecto}</div>}
                            </td>
                            <td className="p-3 text-slate-500">
                              {arch.asesor ? `${arch.asesor.nombre} ${arch.asesor.apellido}` : '—'}
                            </td>
                            <td className="p-3 text-slate-500">{new Date(arch.fechaEmision).toLocaleDateString()}</td>
                            <td className="p-3 text-right font-bold text-slate-700">{formatCurrency(arch.total)}</td>
                            <td className="p-3">{getStatusBadge(arch)}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEdit(arch)}
                                  className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                >
                                  Consultar (Solo lectura)
                                </button>
                                <button
                                  onClick={() => handlePrint(arch)}
                                  className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                >
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
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

      <AcceptOnBehalfModal
        isOpen={!!acceptingQuotation}
        quotation={acceptingQuotation}
        onClose={() => setAcceptingQuotation(null)}
        onConfirm={handleConfirmAcceptOnBehalf}
        isLoading={isAccepting}
      />

      <CancelQuotationModal
        isOpen={!!cancellingQuotation}
        quotation={cancellingQuotation}
        onClose={() => setCancellingQuotation(null)}
        onConfirm={handleConfirmCancelQuotation}
        isLoading={isCancelling}
      />
    </div>
  );
};
