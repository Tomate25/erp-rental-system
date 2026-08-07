import React, { useState, useEffect } from 'react';
import { getQuotations } from '../services/quotations.api';
import type { Cotizacion } from '../types/quotation.types';
import type { EstadoCotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { FileText, Plus, Search, CheckCircle, Clock, XCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import { QuotationForm } from '../components/QuotationForm';
import { QuotationPrintView } from '../components/QuotationPrintView';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Cotizacion[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Cotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'REVISION' | 'APPROVED'>('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Cotizacion | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Cotizacion | null>(null);

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

  const getStatusBadge = (estado: EstadoCotizacion) => {
    switch (estado) {
      case EstadoCotizacionValues.ACEPTADA:
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100 flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3"/> Aprobada</span>;
      case EstadoCotizacionValues.EN_REVISION:
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100 flex items-center gap-1 w-max"><RefreshCw className="w-3 h-3"/> En Revisión</span>;
      case EstadoCotizacionValues.RECHAZADA:
      case EstadoCotizacionValues.CANCELADA:
        return <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 flex items-center gap-1 w-max"><XCircle className="w-3 h-3"/> Rechazada</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100 flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Pendiente</span>;
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Cotizaciones y Facturación
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Gestiona solicitudes, versiones y cobros.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva Cotización
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex bg-slate-100/50 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PENDING', label: 'Pendientes' },
            { id: 'REVISION', label: 'En Revisión' },
            { id: 'APPROVED', label: 'Aprobadas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 md:flex-none px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar cotización..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-slate-800 font-bold mb-1">No hay cotizaciones</h3>
          <p className="text-slate-500 text-xs">Aún no tienes documentos en esta categoría.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-4">N° Cotización</th>
                  <th className="p-4">Cliente / Proyecto</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{q.numeroCotizacion}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">v{q.version}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{q.cliente?.nombre || 'Sin cliente'}</div>
                      {q.proyecto && <div className="text-[10px] text-slate-500 mt-0.5">{q.proyecto}</div>}
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(q.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">
                      {formatCurrency(q.total)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(q.estado)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEdit(q)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1"
                        title="Ver / Editar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrint(q)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Imprimir PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
