import React, { useState, useEffect } from 'react';
import { getQuotations, updateQuotation } from '../services/quotations.api';
import type { Cotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { FileText, Plus, Search, CheckCircle, Clock, XCircle, AlertCircle, Eye, RefreshCw, History } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import { QuotationForm } from '../components/QuotationForm';
import { QuotationPrintView } from '../components/QuotationPrintView';
import { VersionHistoryModal } from '../components/VersionHistoryModal';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Cotizacion[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Cotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'REVISION' | 'RETURNED' | 'APPROVED'>('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Cotizacion | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Cotizacion | null>(null);
  const [historyQuoteNumber, setHistoryQuoteNumber] = useState<string | null>(null);

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
      result = result.filter(q => q.estado === EstadoCotizacionValues.EN_REVISION);
    } else if (activeTab === 'RETURNED') {
      result = result.filter(q => q.estado === EstadoCotizacionValues.RECHAZADA);
    } else if (activeTab === 'APPROVED') {
      result = result.filter(q => q.estado === EstadoCotizacionValues.ACEPTADA);
    }

    // Filtro por búsqueda
    const query = searchQuery.toLowerCase().trim();
    if (query !== '') {
      result = result.filter(
        q => 
          q.numeroCotizacion?.toLowerCase().includes(query) ||
          q.cliente?.nombre.toLowerCase().includes(query) ||
          q.proyecto?.toLowerCase().includes(query)
      );
    }

    setFilteredQuotations(result);
  }, [searchQuery, activeTab, quotations]);

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

  const getStatusBadge = (q: Cotizacion) => {
    if (q.estado === EstadoCotizacionValues.RECHAZADA || !!q.notasRevision) {
      return <span className="px-2.5 py-0.5 rounded-full bg-[#C55500]/10 text-[#C55500] text-[10px] font-bold border border-[#C55500]/20 flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Devuelta</span>;
    }
    switch (q.estado) {
      case EstadoCotizacionValues.ACEPTADA:
        return <span className="px-2.5 py-0.5 rounded-full bg-[#1A73E8]/10 text-[#1A73E8] text-[10px] font-bold border border-[#1A73E8]/20 flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3"/> Aprobada</span>;
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

        <button
          onClick={handleCreateNew}
          className="btn-precision-tertiary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cotización</span>
        </button>
      </div>

      {/* Toolbar y Pestañas con Contadores de Cotizaciones */}
      {(() => {
        const countAll = quotations.length;
        const countPending = quotations.filter(q => q.estado === EstadoCotizacionValues.BORRADOR || q.estado === EstadoCotizacionValues.PENDIENTE).length;
        const countRevision = quotations.filter(q => q.estado === EstadoCotizacionValues.EN_REVISION).length;
        const countReturned = quotations.filter(q => q.estado === EstadoCotizacionValues.RECHAZADA).length;
        const countApproved = quotations.filter(q => q.estado === EstadoCotizacionValues.ACEPTADA).length;

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

            <div className="relative w-full md:w-64 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar cotización..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="precision-input pl-10 text-xs"
              />
            </div>
          </div>
        );
      })()}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center p-12 bg-white rounded-2xl border border-[#E5E8EE]">
          <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-[#F4F6F9] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E5E8EE]">
            <AlertCircle className="w-7 h-7 text-[#747780]" />
          </div>
          <h3 className="text-[#1B1D22] font-extrabold mb-1 text-sm">No hay cotizaciones registrados</h3>
          <p className="text-[#747780] text-xs font-medium">Aún no tienes documentos en esta categoría.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] uppercase tracking-wider text-[10px] font-extrabold">
                  <th className="p-4">N° Cotización</th>
                  <th className="p-4">Cliente / Proyecto</th>
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
                        {q.estado !== EstadoCotizacionValues.ACEPTADA && (
                          <button
                            onClick={async () => {
                              try {
                                await updateQuotation(q.id, { estado: EstadoCotizacionValues.ACEPTADA });
                                loadData();
                              } catch (err) {
                                console.error('Error al aprobar cotización', err);
                              }
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 cursor-pointer flex items-center gap-1 font-bold text-[10px] px-2"
                            title="Aprobar Cotización y pasar a Operaciones"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Aprobar
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
    </div>
  );
};
