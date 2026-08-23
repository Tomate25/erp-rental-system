import React, { useState, useEffect } from 'react';
import { Receipt, ArrowRight, FileCheck, CheckCircle, CreditCard, DollarSign, Calendar, X, Printer, FileText } from 'lucide-react';
import { getPendingQuotations, getPendingCortes, invoiceQuotation, invoiceCorte, getInvoices, markInvoiceAsPaid } from '../services/billing.api';
import type { Cotizacion } from '../../quotations/types/quotation.types';
import type { Factura } from '../types/billing.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { InvoicePrintView } from '../components/InvoicePrintView';

export const BillingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING_QUOTES' | 'PENDING_CORTES' | 'INVOICES'>('PENDING_QUOTES');
  const [pendingQuotes, setPendingQuotes] = useState<Cotizacion[]>([]);
  const [pendingCortes, setPendingCortes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Factura[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State para Facturar Cotización
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
      const [quotesRes, cortesRes, invoicesRes] = await Promise.all([
        getPendingQuotations(),
        getPendingCortes(),
        getInvoices()
      ]);
      setPendingQuotes(quotesRes);
      setPendingCortes(cortesRes);
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

  const handleConfirmInvoiceQuote = async () => {
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
      setViewingInvoice(createdInvoice);
      fetchData();
    } catch (error) {
      console.error('Error billing quote', error);
      alert('Error al generar la factura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoiceCorteDirect = async (corteId: string) => {
    if (!confirm('¿Deseas emitir la factura a crédito (30 Días) para este corte de contrato?')) return;
    try {
      const createdInvoice = await invoiceCorte(corteId, {
        tipoFactura: 'ESTANDAR',
        condicionPago: 'CREDITO',
        plazoCreditoDias: 30,
        estado: 'PENDIENTE'
      });
      setActiveTab('INVOICES');
      setViewingInvoice(createdInvoice);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al facturar corte de contrato');
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
    <div className="animate-fadeIn h-full flex flex-col font-sans max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#C55500] text-white shadow-md shadow-[#C55500]/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1B1D22] tracking-tight">Módulo de Facturación y Finanzas</h1>
            <p className="text-xs text-[#747780] font-medium">Facturación directa de Cotizaciones y Cortes de Contratos.</p>
          </div>
        </div>

        <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('PENDING_QUOTES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING_QUOTES' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Cotizaciones por Facturar ({pendingQuotes.length})
          </button>

          <button
            onClick={() => setActiveTab('PENDING_CORTES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING_CORTES' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Cortes de Contrato ({pendingCortes.length})
          </button>

          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'INVOICES' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Facturas Emitidas ({invoices.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-[#E5E8EE]">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#1A73E8] border-t-transparent"></div>
          </div>
        ) : activeTab === 'PENDING_QUOTES' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingQuotes.map(quote => (
              <div key={quote.id} className="bg-white border border-[#E5E8EE] p-6 rounded-2xl shadow-xs hover:border-[#1A73E8]/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-extrabold text-[#1B1D22] text-base">{quote.cliente?.nombre}</h3>
                    <span className="text-xs font-black text-[#1A73E8] bg-[#E8F0FE] border border-[#1A73E8]/20 px-2.5 py-0.5 rounded-md mt-1 inline-block">
                      {quote.numeroCotizacion} (Comercial Directa)
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#1B1D22]">{formatCurrency(quote.total)}</p>
                    <p className="text-[11px] text-[#747780] font-extrabold uppercase tracking-wider mt-0.5">Monto Total</p>
                  </div>
                </div>
                
                <div className="bg-[#F4F6F9] rounded-xl p-4 mb-4 grid grid-cols-2 gap-4 border border-[#E5E8EE]">
                  <div>
                    <p className="text-[10px] text-[#747780] font-extrabold uppercase tracking-wider">Depósito Garantía</p>
                    <p className="font-bold text-[#1B1D22] text-xs mt-0.5">{formatCurrency(quote.depositoGarantia || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#747780] font-extrabold uppercase tracking-wider">Proyecto / Ref</p>
                    <p className="font-bold text-[#1B1D22] text-xs mt-0.5 truncate">{quote.proyecto || quote.referencia || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => handleOpenInvoiceModal(quote)}
                    className="btn-precision-primary w-full sm:w-auto text-xs"
                  >
                    Emitir Factura de Cotización <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {pendingQuotes.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white border border-[#E5E8EE] rounded-3xl shadow-xs">
                <FileCheck className="w-12 h-12 text-[#747780] mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-[#1B1D22]">No hay cotizaciones comerciales pendientes por facturar</h3>
                <p className="text-xs text-[#747780] mt-1 font-medium">Aprueba una cotización en Cotizaciones para emitir su factura directamente sin pasar por Contratos.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'PENDING_CORTES' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingCortes.map(corte => (
              <div key={corte.id} className="bg-white border border-[#E5E8EE] p-6 rounded-2xl shadow-xs hover:border-[#1A73E8]/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-extrabold text-[#1B1D22] text-base">{corte.contrato?.cliente?.nombre}</h3>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md mt-1 inline-block font-mono">
                      Corte #{corte.numeroCorte} — Contrato {corte.contrato?.codigo}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#1B1D22]">{formatCurrency(corte.monto)}</p>
                    <p className="text-[11px] text-[#747780] font-extrabold uppercase tracking-wider mt-0.5">Monto de Corte</p>
                  </div>
                </div>

                <div className="bg-[#F4F6F9] rounded-xl p-4 mb-4 grid grid-cols-2 gap-4 border border-[#E5E8EE]">
                  <div>
                    <p className="text-[10px] text-[#747780] font-extrabold uppercase tracking-wider">Período Inicio</p>
                    <p className="font-bold text-[#1B1D22] text-xs mt-0.5">{new Date(corte.fechaInicio).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#747780] font-extrabold uppercase tracking-wider">Período Fin</p>
                    <p className="font-bold text-[#1B1D22] text-xs mt-0.5">{new Date(corte.fechaFin).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => handleInvoiceCorteDirect(corte.id)}
                    className="btn-precision-primary bg-[#37474F] hover:bg-[#1A73E8] w-full sm:w-auto text-xs flex items-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" /> Facturar Corte de Contrato
                  </button>
                </div>
              </div>
            ))}
            {pendingCortes.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white border border-[#E5E8EE] rounded-3xl shadow-xs">
                <FileText className="w-12 h-12 text-[#747780] mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-[#1B1D22]">No hay cortes de contratos pendientes por facturar</h3>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[10px] uppercase tracking-wider text-[#747780] font-extrabold">
                    <th className="p-4">Folio</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Condición</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE] text-xs font-medium">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-4 font-black text-[#1B1D22]">
                        <div>{inv.folio}</div>
                        {inv.corteNumero || (inv as any).corteId ? (
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 inline-block mt-0.5">
                            Corte #{inv.corteNumero || 1} (Contrato)
                          </span>
                        ) : inv.cotizacion ? (
                          <span className="text-[9px] font-black text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-md border border-[#1A73E8]/30 inline-block mt-0.5">
                            Cotización {inv.cotizacion.numeroCotizacion}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Estándar
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-extrabold text-[#1B1D22]">{inv.cliente?.nombre}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                          inv.condicionPago === 'CONTADO' 
                            ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/20' 
                            : 'bg-[#37474F]/10 text-[#37474F] border-[#37474F]/20'
                        }`}>
                          {inv.condicionPago} {inv.plazoCreditoDias ? `(${inv.plazoCreditoDias} días)` : ''}
                        </span>
                      </td>
                      <td className="p-4 font-black text-[#1B1D22] text-right">{formatCurrency(inv.total)}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                          inv.estado === 'PAGADA' 
                            ? 'bg-[#1A73E8]/10 text-[#1A73E8] border-[#1A73E8]/20' 
                            : 'bg-[#C55500]/10 text-[#C55500] border-[#C55500]/20'
                        }`}>
                          {inv.estado === 'PAGADA' ? <CheckCircle className="w-3 h-3 text-[#1A73E8]"/> : <DollarSign className="w-3 h-3 text-[#C55500]"/>}
                          {inv.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="btn-precision-outline text-xs py-1.5 px-3"
                            title="Ver / Imprimir Factura PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#1A73E8]" /> Ver Factura
                          </button>

                          {inv.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => handlePayInvoice(inv.id)}
                              className="btn-precision-primary text-xs py-1.5 px-3"
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
                <Receipt className="w-12 h-12 text-[#747780] mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-[#1B1D22]">No hay facturas emitidas</h3>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Emisión de Factura de Cotización */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-[#E5E8EE] flex justify-between items-center bg-[#F4F6F9]">
              <div>
                <h3 className="font-black text-[#1B1D22] text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#1A73E8]" />
                  Emitir Factura de Cotización
                </h3>
                <p className="text-xs text-[#747780] font-medium mt-0.5">
                  Cotización {selectedQuote.numeroCotizacion} · {selectedQuote.cliente?.nombre}
                </p>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="p-1 text-[#747780] hover:text-[#1B1D22] rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-extrabold text-[#747780] uppercase mb-2">Condición de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCondicionPago('CONTADO');
                      setMarcarComoPagada(true);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      condicionPago === 'CONTADO' 
                        ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8] shadow-xs' 
                        : 'border-[#E5E8EE] text-[#37474F] hover:bg-[#F4F6F9]'
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
                        ? 'border-[#37474F] bg-[#37474F]/10 text-[#37474F] shadow-xs' 
                        : 'border-[#E5E8EE] text-[#37474F] hover:bg-[#F4F6F9]'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    Crédito
                  </button>
                </div>
              </div>

              {condicionPago === 'CREDITO' && (
                <div className="bg-[#F4F6F9] border border-[#E5E8EE] p-4 rounded-xl space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#37474F] uppercase">Plazo de Crédito (Días)</label>
                  <select 
                    value={plazoCredito}
                    onChange={(e) => setPlazoCredito(Number(e.target.value))}
                    className="precision-input text-xs font-bold"
                  >
                    <option value={15}>15 Días</option>
                    <option value={30}>30 Días</option>
                    <option value={60}>60 Días</option>
                    <option value={90}>90 Días</option>
                  </select>
                </div>
              )}

              {condicionPago === 'CONTADO' && (
                <div className="flex items-center gap-3 bg-[#E8F0FE] border border-[#1A73E8]/20 p-3 rounded-xl">
                  <input 
                    type="checkbox"
                    id="marcarPagada"
                    checked={marcarComoPagada}
                    onChange={(e) => setMarcarComoPagada(e.target.checked)}
                    className="w-4 h-4 accent-[#1A73E8] rounded cursor-pointer"
                  />
                  <label htmlFor="marcarPagada" className="text-xs font-bold text-[#1A73E8] cursor-pointer">
                    Marcar como Factura Pagada (Cobrado al contado)
                  </label>
                </div>
              )}

              <div className="bg-[#F4F6F9] p-4 rounded-xl border border-[#E5E8EE] space-y-2 text-xs">
                <div className="flex justify-between text-[#747780] font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold text-[#1B1D22]">{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#747780] font-medium">
                  <span>IVA (15%):</span>
                  <span className="font-bold text-[#1B1D22]">{formatCurrency(selectedQuote.iva)}</span>
                </div>
                <div className="flex justify-between text-[#1B1D22] font-black text-sm pt-2 border-t border-[#E5E8EE]">
                  <span>Total Factura:</span>
                  <span className="text-[#1A73E8]">{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F4F6F9] border-t border-[#E5E8EE] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="px-4 py-2 text-xs font-bold text-[#747780] hover:text-[#1B1D22]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmInvoiceQuote}
                className="btn-precision-primary text-xs"
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
