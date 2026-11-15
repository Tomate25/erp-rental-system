import React, { useState, useEffect, useCallback } from 'react';
import { getPublicQuotation } from '../services/quotations.api';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { formatDuracion } from '../../../shared/utils/numbers';
import { XCircle, Printer, AlertCircle, Building2, ShieldCheck } from 'lucide-react';
import { isContractContado } from '../../contracts/utils/contractCondition';
import { formatEquipmentFullName } from '../../../shared/utils/equipment-description';

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

  const totalDescuentoItems = (quotation.items || []).reduce((acc, it) => acc + (Number(it.descuento) || 0), 0);
  const subtotalBruto = (quotation.items || []).reduce((acc, it) => {
    const cant = Number(it.cantidad) || 0;
    const dur = Number(it.dias) || 1;
    const pu = Number(it.precioUnitario) || 0;
    return acc + (cant * dur * pu);
  }, 0);
  const descuentoGlobal = Number(quotation.descuento) || 0;
  const subtotalNeto = Math.max(0, subtotalBruto - totalDescuentoItems - descuentoGlobal);

  return (
    <div className="bg-[#F1F5F9] min-h-screen py-8 px-4 print:bg-white print:p-0 print:m-0 font-sans">
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 8mm;
          }
          html, body, #root, #root > div, main, div {
            background: white !important;
            background-color: white !important;
            box-shadow: none !important;
            font-size: 9.5px !important;
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
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">Visualización de Cotización</span>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

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
      <div className="max-w-[215mm] mx-auto bg-white border border-slate-300 shadow-lg rounded-sm p-6 print-sheet print:border-none print:shadow-none print:p-0 print:m-0 space-y-4">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
          <div className="space-y-0.5">
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              {quotation.empresa?.nombre || 'BM Construcciones'}
            </h1>
            <div className="text-[9.5px] text-slate-600 space-y-0.5 font-medium leading-snug">
              <p>{quotation.empresa?.direccion || 'Km 10.5 Carretera a Masaya 150m al S.O. — Managua, Nicaragua'}</p>
              <p>PBX: {quotation.empresa?.telefono || '(505) 2255-8800'} | RUC: {quotation.empresa?.ruc || 'J0310000000000'}</p>
              <p>Correo: {quotation.empresa?.email || 'ventas@bmconstrucciones.com'}</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-base font-black text-slate-900 mb-1 uppercase tracking-wider">COTIZACIÓN</h2>
            <div className="inline-block bg-slate-100 text-slate-900 px-3 py-1 rounded border border-slate-300">
              <p className="text-[9.5px] font-semibold uppercase text-slate-500">Número</p>
              <p className="text-sm font-black font-mono">{quotation.numeroCotizacion}</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase">Versión: v{quotation.version}</p>
            </div>
          </div>
        </div>

        {/* Datos del Cliente y Fechas */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200 text-[9.5px]">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-0.5 text-[9px]">Datos del Cliente</h3>
            <div className="grid grid-cols-[70px_1fr] gap-0.5">
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

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-0.5 text-[9px]">Condiciones Comerciales</h3>
            <div className="grid grid-cols-[105px_1fr] gap-0.5">
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
              <span className="font-bold text-slate-900 uppercase text-[9.5px]">
                {quotation.estado.replace(/_/g, ' ')}
              </span>

              <span className="font-bold text-slate-500">Condición de Pago:</span>
              <span className="font-bold text-slate-900 uppercase text-[9.5px]">
                {isContractContado(quotation) ? 'Contado' : 'Crédito'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de Equipos y Partidas */}
        <div>
          <table className="w-full text-left text-[9.5px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[8.5px] tracking-wider">
                <th className="p-1.5 border border-slate-800 text-center w-10">#</th>
                <th className="p-1.5 border border-slate-800">Descripción del Equipo / Servicio</th>
                <th className="p-1.5 border border-slate-800 text-center w-14">Cant.</th>
                <th className="p-1.5 border border-slate-800 text-center w-16">Días</th>
                <th className="p-1.5 border border-slate-800 text-right w-24">Tarifa Unit.</th>
                {totalDescuentoItems > 0 && <th className="p-1.5 border border-slate-800 text-right w-20">Desc.</th>}
                <th className="p-1.5 border border-slate-800 text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {(quotation.items || []).map((item, index) => (
                <tr key={item.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-500">{index + 1}</td>
                  <td className="p-1.5 border border-slate-300 leading-snug">
                    <p className="font-bold text-slate-900">
                      {item.equipo
                        ? formatEquipmentFullName(item.equipo, {
                            fallback: item.descripcion,
                            includeCode: true,
                          })
                        : item.descripcion}
                    </p>
                    {item.equipo && (
                      <p className="text-[8.5px] text-slate-500 font-mono">
                        Código: {item.equipo.codigo} {item.equipo.marca ? `| Marca: ${item.equipo.marca}` : ''}
                        {((item.equipo as any).categoria?.nombre || (item.equipo as any).categoriaNombre) ? ` | Grupo: ${(item.equipo as any).categoria?.nombre || (item.equipo as any).categoriaNombre}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-center font-semibold">{item.cantidad}</td>
                  <td className="p-1.5 border border-slate-300 text-center">{formatDuracion(item.dias)}</td>
                  <td className="p-1.5 border border-slate-300 text-right font-mono">{formatCurrency(item.precioUnitario)}</td>
                  {totalDescuentoItems > 0 && (
                    <td className="p-1.5 border border-slate-300 text-right font-mono text-amber-700 font-bold">
                      {Number(item.descuento || 0) > 0 ? `-${formatCurrency(item.descuento)}` : '-'}
                    </td>
                  )}
                  <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen Financiero y Depósito */}
        <div className="flex justify-between items-start gap-4 pt-1">
          <div className="w-7/12 text-[9.5px] space-y-1.5">
            <h4 className="font-bold text-slate-900 uppercase text-[9px] border-b border-slate-200 pb-0.5">Términos y Observaciones</h4>
            <div className="text-slate-600 space-y-0.5 text-[9px] leading-relaxed">
              <p>1. Precios estipulados en Dólares Estadounidenses (USD) o su equivalente al tipo de cambio oficial.</p>
              <p>2. El combustible, lubricantes y operadores no están incluidos salvo especificación expresa.</p>
              <p>3. El cliente asume la responsabilidad y resguardo de los equipos durante el periodo de renta.</p>
              {quotation.condiciones && (
                <div className="mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-200 font-medium">
                  {quotation.condiciones}
                </div>
              )}
            </div>
          </div>

          <div className="w-5/12">
            <table className="w-full text-[9.5px]">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1 text-slate-600 font-bold uppercase">Subtotal Bruto:</td>
                  <td className="py-1 text-right font-mono font-bold text-slate-900">{formatCurrency(subtotalBruto)}</td>
                </tr>
                {totalDescuentoItems > 0 && (
                  <tr>
                    <td className="py-1 text-amber-700 font-bold uppercase">Descuento por Producto:</td>
                    <td className="py-1 text-right font-mono font-bold text-amber-700">-{formatCurrency(totalDescuentoItems)}</td>
                  </tr>
                )}
                {descuentoGlobal > 0 && (
                  <tr>
                    <td className="py-1 text-amber-700 font-bold uppercase">Descuento Global:</td>
                    <td className="py-1 text-right font-mono font-bold text-amber-700">-{formatCurrency(descuentoGlobal)}</td>
                  </tr>
                )}
                {(totalDescuentoItems > 0 || descuentoGlobal > 0) && (
                  <tr className="border-t border-slate-200">
                    <td className="py-1 text-slate-800 font-black uppercase">Subtotal Neto:</td>
                    <td className="py-1 text-right font-mono font-black text-slate-900">{formatCurrency(subtotalNeto)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 text-slate-600 font-bold uppercase">I.V.A. (15%):</td>
                  <td className="py-1 text-right font-mono font-bold text-slate-900">{formatCurrency(quotation.iva)}</td>
                </tr>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-1.5 text-slate-900 font-black uppercase text-xs">TOTAL:</td>
                  <td className="py-1.5 text-right font-mono font-black text-slate-900 text-xs">{formatCurrency(quotation.total)}</td>
                </tr>
                {Number(quotation.depositoGarantia || 0) > 0 && (
                  <tr className="bg-slate-50">
                    <td className="py-1 px-1.5 text-slate-600 font-bold uppercase text-[9px]">Depósito Garantía:</td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900 text-[9px]">{formatCurrency(quotation.depositoGarantia!)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección de Firmas */}
        <div className="grid grid-cols-2 gap-10 pt-6 text-center text-[9.5px]">
          <div className="space-y-0.5">
            <div className="border-t border-slate-400 w-3/4 mx-auto pt-1.5"></div>
            <p className="font-bold text-slate-900 uppercase">
              {quotation.asesor ? `${quotation.asesor.nombre} ${quotation.asesor.apellido}` : 'Asesor Comercial'}
            </p>
            <p className="text-[8.5px] text-slate-500 uppercase">Por: {quotation.empresa?.nombre || 'BM Construcciones'}</p>
          </div>
          <div className="space-y-0.5">
            <div className="border-t border-slate-400 w-3/4 mx-auto pt-1.5"></div>
            <p className="font-bold text-slate-900 uppercase">
              {quotation.cliente?.nombre || quotation.atencion || 'Firma Autorizada Cliente'}
            </p>
            <p className="text-[8.5px] text-slate-500 uppercase">Aceptación de la Oferta</p>
          </div>
        </div>
      </div>
    </div>
  );
};
