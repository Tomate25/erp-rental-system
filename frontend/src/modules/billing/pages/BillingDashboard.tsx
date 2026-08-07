import React, { useState, useEffect } from 'react';
import { Receipt, ArrowRight, FileCheck, CheckCircle, CreditCard, DollarSign, Calendar, X, Printer } from 'lucide-react';
import { getPendingQuotations, invoiceQuotation, getInvoices, markInvoiceAsPaid } from '../services/billing.api';
import type { Cotizacion } from '../../quotations/types/quotation.types';
import type { Factura } from '../types/billing.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { InvoicePrintView } from '../components/InvoicePrintView';

export const BillingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'INVOICES'>('PENDING');
  const [pendingQuotes, setPendingQuotes] = useState<Cotizacion[]>([]);
  const [invoices, setInvoices] = useState<Factura[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Invoicing
  const [selectedQuote, setSelectedQuote] = useState<Cotizacion | null>(null);
  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [plazoCredito, setPlazoCredito] = useState<number>(30);
  const [marcarComoPagada, setMarcarComoPagada] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice Print / View State
  const [viewingInvoice, setViewingInvoice] = useState<Factura | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [quotesRes, invoicesRes] = await Promise.all([
        getPendingQuotations(),
        getInvoices()
      ]);
      setPendingQuotes(quotesRes);
      setInvoices(invoicesRes);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenInvoiceModal = (quote: Cotizacion) => {
    setSelectedQuote(quote);
    setCondicionPago('CONTADO');
    setMarcarComoPagada(true);
  };

  const handleConfirmInvoice = async () => {
    if (!selectedQuote) return;
    setIsSubmitting(true);
    try {
      const createdInvoice = await invoiceQuotation(selectedQuote.id, {
        tipoFactura: 'ESTANDAR',
        condicionPago,
        plazoCreditoDias: condicionPago === 'CREDITO' ? plazoCredito : 0,
        estado: (condicionPago === 'CONTADO' && marcarComoPagada) ? 'PAGADA' : 'PENDIENTE'
      });
      setSelectedQuote(null);
      setActiveTab('INVOICES');
      setViewingInvoice(createdInvoice); // Automatically open print view for the newly generated invoice!
      fetchData();
    } catch (error) {
      console.error('Error billing quote', error);
      alert('Error al generar la factura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    if (!confirm('¿Deseas registrar y marcar el pago completo de esta factura?')) return;
    try {
      await markInvoiceAsPaid(invoiceId);
      fetchData();
    } catch (error) {
      console.error('Error paying invoice', error);
      alert('Error al registrar pago');
    }
  };

  if (viewingInvoice) {
    return (
      <InvoicePrintView 
        factura={viewingInvoice} 
        onBack={() => setViewingInvoice(null)} 
      />
    );
  }

  return (
    <div className="p-4 sm:p-8 animate-fadeIn h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-8 h-8 text-emerald-600" />
            Módulo de Facturación
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de ingresos, facturas de contado/crédito e impresión de comprobantes (BM Construcciones)
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Cotizaciones por Facturar ({pendingQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'INVOICES' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Facturas Emitidas ({invoices.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : activeTab === 'PENDING' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingQuotes.map(quote => (
              <div key={quote.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{quote.cliente?.nombre}</h3>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md mt-1 inline-block">
                      {quote.numeroCotizacion}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900">{formatCurrency(quote.total)}</p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Monto Total</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-4 border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Depósito Garantía</p>
                    <p className="font-bold text-slate-700 text-xs mt-0.5">{formatCurrency(quote.depositoGarantia || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Proyecto / Ref</p>
                    <p className="font-bold text-slate-700 text-xs mt-0.5 truncate">{quote.proyecto || quote.referencia || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => handleOpenInvoiceModal(quote)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    Facturar Ahora <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {pendingQuotes.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white border border-slate-200 rounded-2xl">
                <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No hay cotizaciones pendientes por facturar</h3>
                <p className="text-xs text-slate-400 mt-1">Aprueba una cotización desde el módulo de Cotizaciones para emitir su factura.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                    <th className="p-4">Folio</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Condición</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{inv.folio}</td>
                      <td className="p-4 font-bold text-slate-700">{inv.cliente?.nombre}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          inv.condicionPago === 'CONTADO' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {inv.condicionPago} {inv.plazoCreditoDias ? `(${inv.plazoCreditoDias} días)` : ''}
                        </span>
                      </td>
                      <td className="p-4 font-black text-slate-900 text-right">{formatCurrency(inv.total)}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                          inv.estado === 'PAGADA' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {inv.estado === 'PAGADA' ? <CheckCircle className="w-3 h-3 text-emerald-600"/> : <DollarSign className="w-3 h-3 text-amber-600"/>}
                          {inv.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all text-xs inline-flex items-center gap-1"
                            title="Ver / Imprimir Factura PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" /> Ver Factura
                          </button>

                          {inv.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => handlePayInvoice(inv.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Registrar Pago
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invoices.length === 0 && (
              <div className="text-center py-16">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No hay facturas emitidas</h3>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Emisión de Factura */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Emitir Factura
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Cotización {selectedQuote.numeroCotizacion} · {selectedQuote.cliente?.nombre}
                </p>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Condición de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCondicionPago('CONTADO');
                      setMarcarComoPagada(true);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      condicionPago === 'CONTADO' 
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 shadow-sm' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    Pago de Contado
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCondicionPago('CREDITO');
                      setMarcarComoPagada(false);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      condicionPago === 'CREDITO' 
                        ? 'border-purple-600 bg-purple-50/50 text-purple-800 shadow-sm' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    Crédito
                  </button>
                </div>
              </div>

              {condicionPago === 'CREDITO' && (
                <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl space-y-2">
                  <label className="block text-[11px] font-bold text-purple-900 uppercase">Plazo de Crédito (Días)</label>
                  <select 
                    value={plazoCredito}
                    onChange={(e) => setPlazoCredito(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value={15}>15 Días</option>
                    <option value={30}>30 Días</option>
                    <option value={60}>60 Días</option>
                    <option value={90}>90 Días</option>
                  </select>
                </div>
              )}

              {condicionPago === 'CONTADO' && (
                <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                  <input 
                    type="checkbox"
                    id="marcarPagada"
                    checked={marcarComoPagada}
                    onChange={(e) => setMarcarComoPagada(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="marcarPagada" className="text-xs font-bold text-emerald-900 cursor-pointer">
                    Marcar como Factura Pagada (Cobrado al contado)
                  </label>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold">{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>IVA (15%):</span>
                  <span className="font-bold">{formatCurrency(selectedQuote.iva)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                  <span>Total Factura:</span>
                  <span className="text-emerald-600">{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmInvoice}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Generando...' : 'Confirmar y Emitir Factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
