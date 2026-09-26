import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle, CreditCard, Coins, X, Printer, FileText, FolderClosed, ArrowLeft, CalendarDays } from 'lucide-react';
import { getContractCortes, getDamageReturns, invoiceCorte, getInvoices, registerInvoicePayment } from '../services/billing.api';
import type { Factura, FacturaPago, CorteFacturacionResumen, RetornoConDanos } from '../types/billing.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { InvoicePrintView } from '../components/InvoicePrintView';
import { ReceiptPrintView } from '../components/ReceiptPrintView';
import { DamageChargesPanel } from '../components/DamageChargesPanel';

export const BillingDashboard: React.FC<{ canEditRepair?: boolean; canInvoiceDamage?: boolean }> = ({ canEditRepair = false, canInvoiceDamage = false }) => {
  const [activeTab, setActiveTab] = useState<'PENDING_CORTES' | 'DAMAGES' | 'INVOICES'>('PENDING_CORTES');
  const [contractCortes, setContractCortes] = useState<CorteFacturacionResumen[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Factura[]>([]);
  const [damageReturns, setDamageReturns] = useState<RetornoConDanos[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cortesError, setCortesError] = useState(false);
  const [invoicesError, setInvoicesError] = useState(false);
  const [damageError, setDamageError] = useState(false);

  // Modal State para Registrar Abono / Pago Parcial
  const [abonoInvoice, setAbonoInvoice] = useState<Factura | null>(null);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>('TRANSFERENCIA');
  const [referenciaAbono, setReferenciaAbono] = useState<string>('');
  const [bancoAbono, setBancoAbono] = useState<string>('');
  const [notasAbono, setNotasAbono] = useState<string>('');
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);

  // Invoice Print / View State
  const [viewingInvoice, setViewingInvoice] = useState<Factura | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ factura: Factura; pago: FacturaPago } | null>(null);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [cortesResult, invoicesResult, damageResult] = await Promise.allSettled([
        getContractCortes(),
        getInvoices(),
        getDamageReturns(),
      ]);
      setCortesError(cortesResult.status === 'rejected');
      setInvoicesError(invoicesResult.status === 'rejected');
      if (cortesResult.status === 'fulfilled') setContractCortes(cortesResult.value);
      else console.error('Error cargando cortes de contratos', cortesResult.reason);
      if (invoicesResult.status === 'fulfilled') setInvoices(invoicesResult.value);
      else console.error('Error cargando facturas', invoicesResult.reason);
      setDamageError(damageResult.status === 'rejected');
      if (damageResult.status === 'fulfilled') setDamageReturns(damageResult.value);
      else console.error('Error cargando retornos con daños', damageResult.reason);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const contractFolders = Array.from(
    contractCortes.reduce((groups, corte) => {
      const group = groups.get(corte.contratoId) || [];
      group.push(corte);
      groups.set(corte.contratoId, group);
      return groups;
    }, new Map<string, CorteFacturacionResumen[]>()),
  ).map(([id, cortes]) => ({ id, cortes: [...cortes].sort((a, b) => a.numeroCorte - b.numeroCorte) }));
  const selectedFolder = contractFolders.find(folder => folder.id === selectedContractId);
  const formatDate = (value: string) => new Intl.DateTimeFormat('es-NI', {
    timeZone: 'America/Managua', day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(value));

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
      const refreshed = await getInvoices();
      setInvoices(refreshed);
      setViewingInvoice(refreshed.find(inv => inv.id === createdInvoice.id) || createdInvoice);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al facturar corte de contrato');
    }
  };

  const handleOpenAbonoModal = (inv: Factura) => {
    setAbonoInvoice(inv);
    const saldo = inv.saldoPendiente !== undefined ? inv.saldoPendiente : (inv.total - (inv.totalPagado || 0));
    setMontoAbono(saldo > 0 ? saldo : inv.total);
    setMetodoPagoAbono('TRANSFERENCIA');
    setReferenciaAbono('');
    setBancoAbono('');
    setNotasAbono('');
  };

  const handleConfirmAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonoInvoice || montoAbono <= 0) return;
    setIsSubmittingAbono(true);
    try {
      const result = await registerInvoicePayment(abonoInvoice.id, {
        monto: Number(montoAbono),
        metodo: metodoPagoAbono,
        referencia: referenciaAbono,
        banco: bancoAbono,
      });
      setAbonoInvoice(null);
      setViewingReceipt({ factura: result.factura, pago: result.pago });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al registrar el abono');
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  if (viewingReceipt) {
    return <ReceiptPrintView factura={viewingReceipt.factura} pago={viewingReceipt.pago} onBack={() => setViewingReceipt(null)} />;
  }

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
            <p className="text-xs text-[#747780] font-medium">Facturación de cortes de contratos y gestión de cobros.</p>
          </div>
        </div>

        <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('PENDING_CORTES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING_CORTES' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Cortes de Contrato ({contractFolders.length})
          </button>

          <button
            onClick={() => setActiveTab('DAMAGES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'DAMAGES' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Reparaciones por Cobrar ({damageReturns.filter(retorno => !retorno.facturaCargo).length})
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

      {(activeTab === 'PENDING_CORTES' ? cortesError : activeTab === 'DAMAGES' ? damageError : invoicesError) && !isLoading && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center justify-between gap-4">
          <span>No se pudieron cargar los datos de facturación. Comprueba la conexión con el servidor.</span>
          <button type="button" onClick={() => fetchData()} className="underline whitespace-nowrap">Reintentar</button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-[#E5E8EE]">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#1A73E8] border-t-transparent"></div>
          </div>
        ) : activeTab === 'PENDING_CORTES' ? (
          selectedFolder ? (
            <div className="space-y-4">
              <button type="button" onClick={() => setSelectedContractId(null)} className="btn-precision-outline text-xs inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Volver a contratos
              </button>
              <div className="bg-white border border-[#E5E8EE] p-6 rounded-2xl">
                <div className="flex items-center gap-3">
                  <FolderClosed className="w-7 h-7 text-[#1A73E8]" />
                  <div>
                    <h2 className="font-extrabold text-[#1B1D22]">{selectedFolder.cortes[0].contrato.cliente.nombre}</h2>
                    <p className="text-xs text-[#747780] font-bold">Contrato {selectedFolder.cortes[0].contrato.codigo}</p>
                  </div>
                </div>
                <p className="text-xs text-[#747780] mt-4">Cada corte se puede facturar desde su primer día. El siguiente se habilita cuando termine el plazo anterior y esté facturado.</p>
              </div>
              {selectedFolder.cortes.map(corte => (
                <div key={corte.id} className="bg-white border border-[#E5E8EE] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#1B1D22]">Corte #{corte.numeroCorte}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${corte.estado === 'FACTURADO' ? 'bg-emerald-100 text-emerald-800' : corte.disponibleParaFacturar ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {corte.estado === 'FACTURADO' ? 'Facturado' : corte.disponibleParaFacturar ? 'Listo para facturar' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-xs text-[#37474F] inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {formatDate(corte.fechaInicio)} — {formatDate(corte.fechaFin)}</p>
                    {corte.detalleProyectado?.filter(line => line.unidades > 0).map((line, index) => (
                      <p key={`${line.equipoId}-${index}`} className="text-xs text-[#37474F]">
                        {line.descripcion}: {line.cantidad} equipo(s) · {Number(line.unidades.toFixed(2))} {line.unidad === 'HORA' ? 'horas' : 'días'} · {formatCurrency(line.importe)}
                      </p>
                    ))}
                    {corte.factura && <p className="text-xs text-emerald-700 font-bold">Factura {corte.factura.folio}</p>}
                    {corte.motivoBloqueo && corte.estado !== 'FACTURADO' && <p className="text-xs text-[#747780]">{corte.motivoBloqueo}{!corte.disponibleParaFacturar && corte.motivoBloqueo.includes('Disponible') ? `: ${formatDate(corte.fechaDisponible)}` : ''}</p>}
                  </div>
                  <div className="sm:text-right space-y-2">
                    <p className="font-black text-[#1B1D22]">{formatCurrency(corte.monto)}</p>
                    {corte.disponibleParaFacturar ? (
                      <button type="button" onClick={() => handleInvoiceCorteDirect(corte.id)} className="btn-precision-primary text-xs inline-flex items-center gap-1.5">
                        <Receipt className="w-4 h-4" /> Facturar corte #{corte.numeroCorte}
                      </button>
                    ) : corte.factura && invoices.some(invoice => invoice.id === corte.factura?.id) ? (
                      <button type="button" onClick={() => setViewingInvoice(invoices.find(invoice => invoice.id === corte.factura?.id) || null)} className="btn-precision-outline text-xs inline-flex items-center gap-1.5">
                        <Printer className="w-4 h-4" /> Ver factura
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {contractFolders.map(folder => {
                const first = folder.cortes[0];
                const ready = folder.cortes.filter(corte => corte.disponibleParaFacturar).length;
                const billed = folder.cortes.filter(corte => corte.estado === 'FACTURADO').length;
                return <button type="button" key={folder.id} onClick={() => setSelectedContractId(folder.id)} className="bg-white border border-[#E5E8EE] p-6 rounded-2xl text-left hover:border-[#1A73E8] hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[#E8F0FE] text-[#1A73E8]"><FolderClosed className="w-6 h-6" /></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-[#1B1D22] truncate">{first.contrato.cliente.nombre}</h3>
                      <p className="text-xs font-bold text-[#1A73E8] mt-1">Contrato {first.contrato.codigo}</p>
                      <p className="text-xs text-[#747780] mt-3">{billed} de {folder.cortes.length} cortes facturados · {ready} listos para facturar</p>
                    </div>
                  </div>
                </button>;
              })}
              {contractFolders.length === 0 && <div className="col-span-full text-center py-16 bg-white border border-[#E5E8EE] rounded-3xl shadow-xs">
                <FileText className="w-12 h-12 text-[#747780] mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-[#1B1D22]">No hay contratos con cortes de facturación</h3>
              </div>}
            </div>
          )
        ) : activeTab === 'DAMAGES' ? (
          <DamageChargesPanel returns={damageReturns} invoices={invoices} onRefresh={() => fetchData(false)} onOpenInvoice={setViewingInvoice} canEditRepair={canEditRepair} canInvoice={canInvoiceDamage} />
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
                      <td className="p-4 text-right font-mono">
                        <div className="font-black text-[#1B1D22] text-xs">
                          {formatCurrency(inv.total)}
                        </div>
                        {(inv.estado === 'PENDIENTE' || inv.estado === 'PAGADA_PARCIAL') && (
                          <div className="text-[10px] text-[#C55500] font-bold mt-0.5">
                            Saldo: {formatCurrency(inv.saldoPendiente !== undefined ? inv.saldoPendiente : inv.total)}
                          </div>
                        )}
                        {inv.totalPagado && inv.totalPagado > 0 ? (
                          <div className="text-[9px] text-emerald-600 font-medium">
                            Abonado: {formatCurrency(inv.totalPagado)}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                          inv.estado === 'PAGADA' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : inv.estado === 'PAGADA_PARCIAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : inv.estado === 'VENCIDA'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-blue-50 text-[#1A73E8] border-blue-200'
                        }`}>
                          {inv.estado === 'PAGADA' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600"/>
                          ) : (
                            <Coins className="w-3 h-3 text-amber-600"/>
                          )}
                          {inv.estado === 'PAGADA_PARCIAL' ? 'PAGADA PARCIAL' : inv.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="btn-precision-outline text-xs py-1.5 px-2.5"
                            title="Ver / Imprimir Factura PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#1A73E8]" /> Ver Factura
                          </button>

                          {(inv.pagos || []).map((pago, index) => <button
                            key={pago.id}
                            onClick={() => setViewingReceipt({ factura: inv, pago })}
                            className="btn-precision-outline text-xs py-1.5 px-2.5"
                            title={`Ver / imprimir recibo del pago ${index + 1}`}
                          ><Printer className="w-3.5 h-3.5" /> Recibo {index + 1}</button>)}

                          {(inv.estado === 'PENDIENTE' || inv.estado === 'PAGADA_PARCIAL') && (
                            <>
                              <button
                                onClick={() => handleOpenAbonoModal(inv)}
                                className="btn-precision-primary text-xs py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 border-amber-600 flex items-center gap-1"
                                title="Registrar un abono o pago parcial a esta factura"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Registrar pago
                              </button>
                            </>
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

      {/* Modal para Registrar Abono a Factura */}
      {abonoInvoice && (
        <div className="fixed inset-0 z-50 bg-[#1B1D22]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-[#E5E8EE] flex justify-between items-center bg-[#F4F6F9]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#1B1D22] text-base">
                    Registrar Abono / Pago Parcial
                  </h3>
                  <p className="text-[11px] text-[#747780]">
                    Factura: {abonoInvoice.folio} · {abonoInvoice.cliente?.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAbonoInvoice(null)}
                className="p-1 text-[#747780] hover:text-[#1B1D22] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAbono} className="p-6 space-y-4">
              {/* Resumen del Saldo */}
              <div className="bg-[#F4F6F9] p-3.5 rounded-2xl border border-[#E5E8EE] space-y-2 text-xs">
                <div className="flex justify-between text-[#747780]">
                  <span>Total Factura:</span>
                  <span className="font-bold text-[#1B1D22] font-mono">{formatCurrency(abonoInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-[#747780]">
                  <span>Monto Abonado Previo:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {formatCurrency(abonoInvoice.totalPagado || 0)}
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 border-t border-[#E5E8EE]">
                  <span className="text-[#C55500]">Saldo Pendiente:</span>
                  <span className="text-[#C55500] font-mono">
                    {formatCurrency(abonoInvoice.saldoPendiente !== undefined ? abonoInvoice.saldoPendiente : abonoInvoice.total)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Monto del Abono (C$) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={abonoInvoice.saldoPendiente !== undefined ? abonoInvoice.saldoPendiente : abonoInvoice.total}
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(Number(e.target.value))}
                    className="precision-input text-xs font-mono font-black pl-9"
                    required
                  />
                  <span className="text-xs font-black text-emerald-700 absolute left-2.5 top-2.5 select-none">
                    C$
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={metodoPagoAbono}
                    onChange={(e) => setMetodoPagoAbono(e.target.value)}
                    className="precision-input text-xs font-bold"
                  >
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="EFECTIVO">Efectivo / Caja</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="TARJETA">Tarjeta Débito/Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                    N° Comprobante / Ref.
                  </label>
                  <input
                    type="text"
                    value={referenciaAbono}
                    onChange={(e) => setReferenciaAbono(e.target.value)}
                    placeholder="Ej. TR-982341"
                    className="precision-input text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {(metodoPagoAbono === 'CHEQUE' || metodoPagoAbono === 'TRANSFERENCIA') && <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Banco</label>
                <input type="text" value={bancoAbono} onChange={e => setBancoAbono(e.target.value)} className="precision-input text-xs font-medium" placeholder="Nombre del banco" />
              </div>}

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  value={notasAbono}
                  onChange={(e) => setNotasAbono(e.target.value)}
                  placeholder="Detalles del pago o caja..."
                  className="precision-input text-xs font-medium"
                />
              </div>

              <div className="pt-4 border-t border-[#E5E8EE] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAbonoInvoice(null)}
                  className="btn-precision-outline text-xs py-2 px-4 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbono}
                  className="btn-precision-primary text-xs py-2 px-5 bg-amber-600 hover:bg-amber-700 border-amber-600 cursor-pointer"
                >
                  {isSubmittingAbono ? 'Registrando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
