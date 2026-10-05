import React, { useState, useEffect, useCallback } from 'react';
import { getPublicQuotation, acceptPublicQuotation, rejectPublicQuotation } from '../services/quotations.api';
import { LIMITS } from '../../../shared/validation/limits';
import { motivoRechazoSchema } from '../validators/quotation.validator';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { formatDuracion } from '../../../shared/utils/numbers';
import { CheckCircle, XCircle, Printer, AlertCircle, Building2, Check, ShieldCheck } from 'lucide-react';

interface PublicQuotationViewProps {
  token?: string;
}

export const PublicQuotationView: React.FC<PublicQuotationViewProps> = ({ token: propToken }) => {
  // Obtener token de prop o de la URL
  const token = propToken || (() => {
    const match = window.location.pathname.match(/^\/(?:cotizacion|quote)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  })();

  const [quotation, setQuotation] = useState<Cotizacion | null>(null);
  const [contractInfo, setContractInfo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de modales
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchQuotation = useCallback(async () => {
    if (!token) {
      setError('Token de cotización no proporcionado o inválido.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicQuotation(token);
      setQuotation(data);
      if (data.contratos && data.contratos.length > 0) {
        setContractInfo(data.contratos[0]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No fue posible cargar la cotización. El enlace puede haber expirado o haber sido revocado.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleAccept = async () => {
    if (!token) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await acceptPublicQuotation(token);
      setQuotation((current) => current ? { ...current, estado: 'ACEPTADA', fechaAceptacion: new Date().toISOString() } : current);
      if (res.contract) {
        setContractInfo(res.contract);
      }
      setIsAcceptModalOpen(false);
      setActionSuccessMessage(res.message || '¡Cotización aceptada con éxito! Se ha formalizado el contrato y reservado los equipos.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar la aceptación. Por favor intente nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    const motivo = motivoRechazoSchema.safeParse(rejectReason);
    if (!motivo.success) {
      setRejectError(motivo.error.issues[0].message);
      return;
    }
    const trimmed = motivo.data;
    setIsProcessing(true);
    setRejectError(null);
    try {
      const res = await rejectPublicQuotation(token, trimmed);
      setQuotation((current) => current ? { ...current, estado: 'RECHAZADA', motivoRechazo: trimmed } : current);
      setIsRejectModalOpen(false);
      setActionSuccessMessage(res.message || 'La cotización ha sido devuelta para revisión. Nuestro equipo comercial ajustará la propuesta.');
    } catch (err: any) {
      setRejectError(err.response?.data?.message || 'Error al registrar el rechazo.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-[#1A73E8] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-[#5A5D66]">Cargando cotización oficial...</p>
      </div>
    );
  }

  if (error && !quotation) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Enlace No Disponible</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">{error}</p>
          <div className="pt-2 text-[11px] text-slate-400">
            Si considera que esto es un error, por favor contacte a su asesor comercial de BM Construcciones.
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) return null;

  const isAccepted = quotation.estado === 'ACEPTADA' || quotation.estado === 'CONVERTIDA_A_CONTRATO' || !!contractInfo;
  const isRejected = quotation.estado === 'RECHAZADA';
  const isExpired = quotation.estado === 'VENCIDA';
  const canRespond = (quotation.estado === 'ENVIADA' || quotation.estado === 'VISTA') && !isAccepted && !isRejected && !isExpired;

  return (
    <div className="bg-[#F1F5F9] min-h-screen py-8 px-4 print:bg-white print:p-0 print:m-0 font-sans">
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 10mm;
          }
          html, body, #root, #root > div, main, div {
            background: white !important;
            background-color: white !important;
            box-shadow: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, nav, header, sidebar, footer, button, .modal-backdrop {
            display: none !important;
          }
          .print-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Barra superior de acciones (Oculta en Impresión) */}
      <div className="max-w-[215mm] mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#C55500]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">Portal de Aprobación de Cotizaciones</span>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
          
          {canRespond && (
            <>
              <button
                onClick={() => {
                  setRejectReason('');
                  setRejectError(null);
                  setIsRejectModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <XCircle className="w-4 h-4" /> Rechazar Cotización
              </button>
              <button
                onClick={() => setIsAcceptModalOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              >
                <Check className="w-4 h-4" /> Aceptar Cotización
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner de Mensajes de Éxito / Estado */}
      {actionSuccessMessage && (
        <div className="max-w-[215mm] mx-auto mb-6 bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl flex items-start gap-3 shadow-xs print:hidden">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Operación Completada</h4>
            <p className="text-xs font-medium mt-0.5">{actionSuccessMessage}</p>
          </div>
        </div>
      )}

      {isAccepted && (
        <div className="max-w-[215mm] mx-auto mb-6 bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl flex items-start justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Cotización Aceptada</h4>
              <p className="text-xs font-medium mt-0.5">
                Esta cotización fue aprobada y cuenta con contrato formalizado.
                {contractInfo?.numeroContrato && (
                  <span className="font-bold ml-1">Contrato N°: {contractInfo.numeroContrato}</span>
                )}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-300 uppercase tracking-wider">
            Aprobada
          </span>
        </div>
      )}

      {isRejected && (
        <div className="max-w-[215mm] mx-auto mb-6 bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-2xl flex items-start justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Cotización Rechazada</h4>
              <p className="text-xs font-medium mt-0.5">
                Esta cotización fue devuelta para revisión.
                {quotation.motivoRechazo && (
                  <span className="block mt-1 font-semibold text-amber-950">Motivo: &quot;{quotation.motivoRechazo}&quot;</span>
                )}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full border border-amber-300 uppercase tracking-wider">
            Rechazada
          </span>
        </div>
      )}

      {/* HOJA DE LA COTIZACIÓN (FORMATO OFICIAL IMPRIMIBLE) */}
      <div className="max-w-[215mm] mx-auto bg-white border border-slate-300 shadow-lg rounded-sm p-10 print-sheet print:border-none print:shadow-none print:p-0 print:m-0 space-y-6">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {quotation.empresa?.nombre || 'BM Construcciones'}
            </h1>
            <div className="text-xs text-slate-600 space-y-0.5 font-medium">
              <p>{quotation.empresa?.direccion || 'Km 10.5 Carretera a Masaya 150m al S.O. — Managua, Nicaragua'}</p>
              <p>PBX: {quotation.empresa?.telefono || '(505) 2255-8800'} | RUC: {quotation.empresa?.ruc || 'J0310000000000'}</p>
              <p>Correo: {quotation.empresa?.email || 'ventas@bmconstrucciones.com'}</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-widest">COTIZACIÓN</h2>
            <div className="inline-block bg-slate-100 text-slate-900 px-4 py-2 rounded border border-slate-300">
              <p className="text-xs font-semibold uppercase text-slate-500">Número</p>
              <p className="text-base font-black font-mono">{quotation.numeroCotizacion}</p>
              <p className="text-[10px] font-bold text-slate-600 uppercase">Versión: v{quotation.version}</p>
            </div>
          </div>
        </div>

        {/* Datos del Cliente y Fechas */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">Datos del Cliente</h3>
            <div className="grid grid-cols-[80px_1fr] gap-1">
              <span className="font-bold text-slate-500">Cliente:</span>
              <span className="font-bold text-slate-900">{quotation.cliente?.nombre || quotation.atencion || 'N/A'}</span>
              
              <span className="font-bold text-slate-500">Atención:</span>
              <span className="text-slate-800">{quotation.atencion || quotation.cliente?.nombre || 'A quien corresponda'}</span>
              
              <span className="font-bold text-slate-500">Proyecto:</span>
              <span className="text-slate-800 font-semibold">{quotation.proyecto || quotation.referencia || 'N/A'}</span>
              
              <span className="font-bold text-slate-500">Teléfono:</span>
              <span className="text-slate-800">{quotation.telefono || quotation.cliente?.telefono || 'N/A'}</span>
              
              <span className="font-bold text-slate-500">Correo:</span>
              <span className="text-slate-800">{quotation.email || quotation.cliente?.emailFacturacion || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">Condiciones Comerciales</h3>
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <span className="font-bold text-slate-500">Fecha Emisión:</span>
              <span className="font-bold text-slate-900">{new Date(quotation.fechaEmision).toLocaleDateString()}</span>
              
              <span className="font-bold text-slate-500">Vigencia:</span>
              <span className="text-slate-800">{quotation.validezDias} días ({new Date(quotation.fechaVence).toLocaleDateString()})</span>

              {quotation.fechaInicioRenta && quotation.fechaFinRenta && <><span className="font-bold text-slate-500">Período de renta:</span><span className="text-slate-800">{quotation.fechaInicioRenta.slice(0, 10)} al {quotation.fechaFinRenta.slice(0, 10)}</span></>}
              
              <span className="font-bold text-slate-500">Asesor Comercial:</span>
              <span className="text-slate-800">
                {quotation.asesor ? `${quotation.asesor.nombre} ${quotation.asesor.apellido}` : 'Ventas BM Construcciones'}
              </span>

              <span className="font-bold text-slate-500">Estado Documento:</span>
              <span className="font-bold text-slate-900 uppercase text-[11px]">
                {quotation.estado.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de Equipos y Partidas */}
        <div>
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <th className="p-2.5 border border-slate-800 text-center w-12">#</th>
                <th className="p-2.5 border border-slate-800">Descripción del Equipo / Servicio</th>
                <th className="p-2.5 border border-slate-800 text-center w-16">Cant.</th>
                <th className="p-2.5 border border-slate-800 text-center w-20">Días</th>
                <th className="p-2.5 border border-slate-800 text-right w-28">Tarifa Unit.</th>
                <th className="p-2.5 border border-slate-800 text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {(quotation.items || []).map((item, index) => (
                <tr key={item.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2.5 border border-slate-300 text-center font-bold text-slate-500">{index + 1}</td>
                  <td className="p-2.5 border border-slate-300">
                    <p className="font-bold text-slate-900">{item.descripcion}</p>
                    {item.equipo && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Código: {item.equipo.codigo} {item.equipo.marca ? `| Marca: ${item.equipo.marca}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="p-2.5 border border-slate-300 text-center font-semibold">{item.cantidad}</td>
                  <td className="p-2.5 border border-slate-300 text-center">{formatDuracion(item.dias)}</td>
                  <td className="p-2.5 border border-slate-300 text-right font-mono">{formatCurrency(item.precioUnitario)}</td>
                  <td className="p-2.5 border border-slate-300 text-right font-mono font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen Financiero y Depósito */}
        <div className="flex justify-between items-start gap-6 pt-2">
          <div className="w-7/12 text-xs space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">Términos y Observaciones</h4>
            <div className="text-slate-600 space-y-1 text-[11px] leading-relaxed">
              <p>1. Precios estipulados en Dólares Estadounidenses (USD) o su equivalente al tipo de cambio oficial.</p>
              <p>2. El combustible, lubricantes y operadores no están incluidos salvo especificación expresa.</p>
              <p>3. El cliente asume la responsabilidad y resguardo de los equipos durante el periodo de renta.</p>
              {quotation.condiciones && (
                <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 font-medium">
                  {quotation.condiciones}
                </div>
              )}
            </div>
          </div>

          <div className="w-5/12">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 text-slate-600 font-bold uppercase">Subtotal:</td>
                  <td className="py-1.5 text-right font-mono font-bold text-slate-900">{formatCurrency(quotation.subtotal)}</td>
                </tr>
                {Number(quotation.descuento || 0) > 0 && (
                  <tr>
                    <td className="py-1.5 text-slate-600 font-bold uppercase">Descuento:</td>
                    <td className="py-1.5 text-right font-mono font-bold text-rose-600">-{formatCurrency(quotation.descuento)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 text-slate-600 font-bold uppercase">I.V.A. (15%):</td>
                  <td className="py-1.5 text-right font-mono font-bold text-slate-900">{formatCurrency(quotation.iva)}</td>
                </tr>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-2 text-slate-900 font-black uppercase text-sm">TOTAL:</td>
                  <td className="py-2 text-right font-mono font-black text-slate-900 text-sm">{formatCurrency(quotation.total)}</td>
                </tr>
                {Number(quotation.depositoGarantia || 0) > 0 && (
                  <tr className="bg-slate-50">
                    <td className="py-1.5 px-2 text-slate-600 font-bold uppercase text-[10px]">Depósito Garantía:</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 text-[10px]">{formatCurrency(quotation.depositoGarantia!)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección de Firmas */}
        <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs">
          <div className="space-y-1">
            <div className="border-t border-slate-400 w-3/4 mx-auto pt-2"></div>
            <p className="font-bold text-slate-900 uppercase">
              {quotation.asesor ? `${quotation.asesor.nombre} ${quotation.asesor.apellido}` : 'Asesor Comercial'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Por: {quotation.empresa?.nombre || 'BM Construcciones'}</p>
          </div>
          <div className="space-y-1">
            <div className="border-t border-slate-400 w-3/4 mx-auto pt-2"></div>
            <p className="font-bold text-slate-900 uppercase">
              {quotation.cliente?.nombre || quotation.atencion || 'Firma Autorizada Cliente'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Aceptación de la Oferta</p>
          </div>
        </div>
      </div>

      {/* Modal de Aceptación */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Aceptar Cotización Oficial</h3>
                <p className="text-xs text-slate-500">Confirmación de propuesta comercial</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Cotización:</span>
                <span className="font-bold text-slate-900">{quotation.numeroCotizacion} (v{quotation.version})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Monto Total:</span>
                <span className="font-black text-emerald-700 font-mono text-sm">{formatCurrency(quotation.total)}</span>
              </div>
              <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-200 leading-relaxed">
                Al confirmar, aceptas formalmente los términos y condiciones de la cotización. El sistema formalizará el contrato comercial y reservará los equipos en inventario.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsAcceptModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAccept}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Confirmar Aceptación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Rechazar Cotización</h3>
                <p className="text-xs text-slate-500">Solicitud de ajustes o devolución</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Por favor indícanos el motivo por el cual no aceptas esta oferta para que nuestro asesor comercial pueda elaborar una nueva versión adaptada a tus requerimientos.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Motivo del Rechazo (Mínimo 5 caracteres) *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                maxLength={LIMITS.cotizacion.rechazo.motivo.max}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError(null);
                }}
                placeholder="Ejemplo: Requerimos una tarifa preferencial por volumen / Solicitamos cambio en fechas de inicio..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            {rejectError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing || rejectReason.trim().length < 5}
                onClick={handleReject}
                className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> Confirmar Rechazo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
