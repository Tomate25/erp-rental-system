import React from 'react';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { formatDuracion, toNum } from '../../../shared/utils/numbers';
import { ArrowLeft, Printer } from 'lucide-react';
import { isContractContado } from '../../contracts/utils/contractCondition';

interface QuotationPrintViewProps {
  quotation: Cotizacion;
  onBack: () => void;
}

export const QuotationPrintView: React.FC<QuotationPrintViewProps> = ({ quotation, onBack }) => {
  const totalDescuentoItems = (quotation.items || []).reduce((acc, it) => acc + (toNum(it.descuento) || 0), 0);
  const subtotalBruto = (quotation.items || []).reduce((acc, it) => {
    const cant = toNum(it.cantidad) || 0;
    const dur = toNum(it.dias) || 1;
    const pu = toNum(it.precioUnitario) || 0;
    return acc + (cant * dur * pu);
  }, 0);
  const descuentoGlobal = toNum(quotation.descuento) || 0;
  const subtotalNeto = Math.max(0, subtotalBruto - totalDescuentoItems - descuentoGlobal);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#F1F5F9] min-h-screen py-8 px-4 print:bg-white print:p-0 print:m-0 animate-fadeIn font-sans w-full">
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
            text-shadow: none !important;
            font-size: 9.5px !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            box-shadow: none !important;
            text-shadow: none !important;
            border-radius: 0 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          .avoid-break, .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print\\:hidden, nav, header, sidebar, footer, button {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      
      {/* Controles NO imprimibles */}
      <div className="max-w-[215mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 text-sm font-bold text-white bg-slate-900 hover:bg-black transition-colors px-6 py-2 rounded-xl shadow-md"
        >
          <Printer className="w-4 h-4" /> Imprimir Cotización Formato Oficial
        </button>
      </div>

      {/* HOJA DE PAPEL FÍSICA PROPORCIONADA (ESTILO VISOR PDF / CARTA) */}
      <div className="max-w-[215mm] mx-auto bg-white border border-slate-300 shadow-sm rounded-sm p-6 print-container print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full space-y-4">
        
        {/* Header Texto Puro sin Iconos */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
          <div className="space-y-0.5">
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">{quotation.empresa?.nombre || 'BM Construcciones'}</h1>
            <div className="text-[9.5px] text-slate-600 space-y-0.5 font-medium leading-snug">
              <p>Km 10.5 Carretera a Masaya 150m al S.O. — Managua, Nicaragua</p>
              <p>PBX: (505) 2255-8800 | Móvil: (505) 8786-6789</p>
              <p>Correo: ventas@bmconstrucciones.com | www.bmconstrucciones.com</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-base font-black text-slate-900 mb-1 uppercase tracking-wider">COTIZACIÓN</h2>
            <div className="inline-block bg-slate-100 text-slate-900 px-3 py-1 rounded border border-slate-300">
              <p className="text-xs font-bold">N°: <span className="font-mono text-sm font-black text-red-600">{quotation.numeroCotizacion || 'COT-2026-0001'}</span></p>
              <p className="text-[9px] uppercase font-bold text-slate-600">Versión {quotation.version || 1}</p>
            </div>
            <div className="mt-2 text-[10px] text-slate-600 font-bold space-y-0.5">
              <p>Fecha Emisión: <span className="font-mono">{new Date(quotation.fechaEmision).toLocaleDateString('es-NI')}</span></p>
              <p>Validez de la Oferta: <span className="font-mono">{quotation.validezDias || 15} días</span></p>
              {quotation.fechaInicioRenta && quotation.fechaFinRenta && (() => {
                const start = quotation.fechaInicioRenta.slice(0, 10);
                const end = quotation.fechaFinRenta.slice(0, 10);
                const days = Math.round((Date.parse(`${end}T12:00:00.000Z`) - Date.parse(`${start}T12:00:00.000Z`)) / 86400000);
                return (
                  <p>Período de renta: <span className="font-mono">{start} al {end} ({days > 0 ? days : 1} {days === 1 ? 'día' : 'días'})</span></p>
                );
              })()}
              {quotation.referencia && <p>Ref: {quotation.referencia}</p>}
              <p className="pt-0.5">
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-slate-400 bg-slate-50 font-mono">
                  Condición: {isContractContado(quotation) ? 'CONTADO' : 'CRÉDITO'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Datos del Cliente y Asesor */}
        <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">PREPARADO PARA / CLIENTE</h3>
            <p className="text-xs font-black text-slate-900 uppercase">{quotation.cliente?.nombre || 'Consumidor Final'}</p>
            {quotation.cliente?.rfc && <p className="text-[10px] text-slate-600 font-mono">RUC / Cédula: {quotation.cliente.rfc}</p>}
            {quotation.atencion && <p className="text-[10px] text-slate-600">Atención: <span className="font-bold">{quotation.atencion}</span></p>}
            {quotation.proyecto && <p className="text-[10px] text-slate-600">Proyecto: <span className="font-bold">{quotation.proyecto}</span></p>}
            {quotation.telefono && <p className="text-[10px] text-slate-600 font-mono">Teléfono: {quotation.telefono}</p>}
          </div>
          <div className="space-y-0.5">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">ASESOR COMERCIAL ENCARGADO</h3>
            <p className="text-xs font-black text-slate-900">{quotation.asesor?.nombre || 'DEPARTAMENTO DE VENTAS'} {quotation.asesor?.apellido || ''}</p>
            <p className="text-[10px] text-slate-600 font-medium">{quotation.asesor?.email || 'ventas@bmconstrucciones.com'}</p>
            <p className="text-[10px] text-slate-500">{quotation.empresa?.nombre || 'BM Construcciones'}</p>
          </div>
        </div>

        {/* Tabla de Productos Monocromática */}
        <div>
          <table className="w-full text-left text-[10px] mb-3 border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black uppercase border-b border-slate-300 text-[8.5px]">
                <th className="py-1.5 px-2 w-12 text-center border-r border-slate-300">CANT.</th>
                <th className="py-1.5 px-2 border-r border-slate-300">DESCRIPCIÓN DEL EQUIPO / SERVICIO</th>
                <th className="py-1.5 px-2 w-24 text-center border-r border-slate-300">DURACIÓN</th>
                <th className="py-1.5 px-2 w-24 text-right border-r border-slate-300">TARIFA (C$)</th>
                <th className="py-1.5 px-2 w-20 text-right border-r border-slate-300">DESC.</th>
                <th className="py-1.5 px-2 w-28 text-right text-slate-900 font-black">SUBTOTAL (C$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(quotation.items || []).map((item, index) => {
                const esPorHora = item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA' || item.descripcion?.toUpperCase().includes('[POR HORA]');

                return (
                  <tr key={index} className="text-slate-800">
                    <td className="py-1.5 px-2 text-center font-mono font-bold border-r border-slate-300">{item.cantidad}</td>
                    <td className="py-1.5 px-2 font-bold uppercase border-r border-slate-300 leading-snug">
                      <div>{item.descripcion}</div>
                      {(item.equipo?.categoria?.nombre || (item.equipo as any)?.categoriaNombre) && (
                        <div className="text-[8px] text-slate-500 font-normal lowercase first-letter:uppercase">
                          Grupo: {item.equipo?.categoria?.nombre || (item.equipo as any)?.categoriaNombre}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-[9.5px] border-r border-slate-300">
                      {formatDuracion(item.dias)} {esPorHora ? (toNum(item.dias) === 1 ? 'Hora' : 'Horas') : (toNum(item.dias) === 1 ? 'Día' : 'Días')}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-slate-300">
                      <div>{formatCurrency(item.precioUnitario)} / {esPorHora ? 'hr' : 'día'}</div>
                      {item.nivelPrecio && item.nivelPrecio !== 'PRECIO_A' && (
                        <div className="text-[8px] text-slate-500 font-sans font-bold">
                          {item.nivelPrecio === 'PRECIO_B' ? '(Precio B)' : '(Precio C)'}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-500 border-r border-slate-300">{item.descuento > 0 ? `-${formatCurrency(item.descuento)}` : '-'}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totales Monocromáticos */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 border border-slate-300 rounded-sm p-2 font-mono text-[9.5px]">
              <div className="flex justify-between text-slate-700 font-bold">
                <span>SUBTOTAL BRUTO:</span>
                <span>{formatCurrency(subtotalBruto)}</span>
              </div>
              {totalDescuentoItems > 0 && (
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>DESC. POR PRODUCTO:</span>
                  <span>-{formatCurrency(totalDescuentoItems)}</span>
                </div>
              )}
              {descuentoGlobal > 0 && (
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>DESCUENTO GLOBAL:</span>
                  <span>-{formatCurrency(descuentoGlobal)}</span>
                </div>
              )}
              {(totalDescuentoItems > 0 || descuentoGlobal > 0) && (
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-0.5">
                  <span>SUBTOTAL NETO:</span>
                  <span>{formatCurrency(subtotalNeto)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-bold">
                <span>IVA (15%):</span>
                <span>{formatCurrency(quotation.iva)}</span>
              </div>
              <div className="flex justify-between text-xs text-white font-black bg-slate-900 p-1.5 rounded-sm mt-0.5">
                <span>TOTAL GENERAL:</span>
                <span>{formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        {quotation.condiciones && (
          <div className="mt-4 p-2.5 bg-slate-50 border border-slate-300 rounded-sm">
            <h3 className="text-[8.5px] font-black text-slate-700 uppercase tracking-wider mb-0.5">
              CONDICIONES Y NOTAS COMERCIALES
            </h3>
            <p className="text-[9.5px] text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
              {quotation.condiciones}
            </p>
          </div>
        )}

        {/* Firmas Protegidas contra Saltos de Página */}
        <div className="signature-section avoid-break mt-6 grid grid-cols-2 gap-8 px-6">
          <div className="text-center">
            <div className="border-t-2 border-slate-400 pt-1.5 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider">
              FIRMA ACEPTACIÓN CLIENTE
            </div>
            <p className="text-[8.5px] text-slate-500 mt-0.5">Nombre, Firma y Sello de Conforme</p>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-slate-400 pt-1.5 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider">
              FIRMA ASESOR COMERCIAL
            </div>
            <p className="text-[8.5px] text-slate-500 mt-0.5">Por {quotation.empresa?.nombre || 'BM Construcciones'}</p>
          </div>
        </div>

      </div>
      
    </div>
  );
};
