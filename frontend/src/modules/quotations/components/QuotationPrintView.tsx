import React from 'react';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { ArrowLeft, Printer } from 'lucide-react';

interface QuotationPrintViewProps {
  quotation: Cotizacion;
  onBack: () => void;
}

export const QuotationPrintView: React.FC<QuotationPrintViewProps> = ({ quotation, onBack }) => {

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#F1F5F9] min-h-screen py-8 px-4 print:bg-white print:p-0 print:m-0 animate-fadeIn font-sans w-full">
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
            text-shadow: none !important;
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
      <div className="max-w-[215mm] mx-auto bg-white border border-slate-300 shadow-sm rounded-sm p-10 print-container print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full space-y-6">
        
        {/* Header Texto Puro sin Iconos */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">BM CONSTRUCCIONES S.A.</h1>
            <div className="text-xs text-slate-600 space-y-0.5 font-medium">
              <p>Km 10.5 Carretera a Masaya 150m al S.O. — Managua, Nicaragua</p>
              <p>PBX: (505) 2255-8800 | Cell: (505) 8786-6789</p>
              <p>Email: ventas@bmconstrucciones.com | www.bmconstrucciones.com</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-widest">COTIZACIÓN</h2>
            <div className="inline-block bg-slate-100 text-slate-900 px-4 py-2 rounded border border-slate-300">
              <p className="text-sm font-bold">N°: <span className="font-mono text-lg font-black text-red-600">{quotation.numeroCotizacion || 'COT-2026-0001'}</span></p>
              <p className="text-[10px] uppercase font-bold text-slate-600">Versión {quotation.version || 1}</p>
            </div>
            <div className="mt-3 text-xs text-slate-600 font-bold space-y-1">
              <p>Fecha Emisión: <span className="font-mono">{new Date(quotation.fechaEmision).toLocaleDateString('es-NI')}</span></p>
              <p>Validez de la Oferta: <span className="font-mono">{quotation.validezDias || 15} días</span></p>
              {quotation.referencia && <p>Ref: {quotation.referencia}</p>}
            </div>
          </div>
        </div>

        {/* Datos del Cliente y Asesor */}
        <div className="grid grid-cols-2 gap-8 border-b border-slate-300 pb-5">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">PREPARADO PARA / CLIENTE</h3>
            <p className="text-sm font-black text-slate-900 uppercase">{quotation.cliente?.nombre || 'Consumidor Final'}</p>
            {quotation.cliente?.rfc && <p className="text-xs text-slate-600 font-mono">RUC / Cédula: {quotation.cliente.rfc}</p>}
            {quotation.atencion && <p className="text-xs text-slate-600">Atención: <span className="font-bold">{quotation.atencion}</span></p>}
            {quotation.proyecto && <p className="text-xs text-slate-600">Proyecto: <span className="font-bold">{quotation.proyecto}</span></p>}
            {quotation.telefono && <p className="text-xs text-slate-600 font-mono">Teléfono: {quotation.telefono}</p>}
          </div>
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">ASESOR COMERCIAL ENCARGADO</h3>
            <p className="text-sm font-black text-slate-900">{quotation.asesor?.nombre || 'DEPARTAMENTO DE VENTAS'} {quotation.asesor?.apellido || ''}</p>
            <p className="text-xs text-slate-600 font-medium">{quotation.asesor?.email || 'ventas@bmconstrucciones.com'}</p>
            <p className="text-xs text-slate-500">BM CONSTRUCCIONES S.A.</p>
          </div>
        </div>

        {/* Tabla de Productos Monocromática */}
        <div>
          <table className="w-full text-left text-xs mb-6 border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black uppercase border-b border-slate-300 text-[10px]">
                <th className="py-2.5 px-3 w-16 text-center border-r border-slate-300">CANT.</th>
                <th className="py-2.5 px-3 border-r border-slate-300">DESCRIPCIÓN DEL EQUIPO / SERVICIO</th>
                <th className="py-2.5 px-3 w-28 text-center border-r border-slate-300">DURACIÓN</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">TARIFA (C$)</th>
                <th className="py-2.5 px-3 w-24 text-right border-r border-slate-300">DESC.</th>
                <th className="py-2.5 px-3 w-32 text-right text-slate-900 font-black">SUBTOTAL (C$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(quotation.items || []).map((item, index) => {
                const esPorHora = (item as any).tipoTarifa === 'HORA' || (item.precioUnitario && item.precioUnitario < 500);
                return (
                  <tr key={index} className="text-slate-800">
                    <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-300">{item.cantidad}</td>
                    <td className="py-2.5 px-3 font-bold uppercase border-r border-slate-300">{item.descripcion}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-xs border-r border-slate-300">
                      {item.dias} {esPorHora ? (item.dias === 1 ? 'Hora' : 'Horas') : (item.dias === 1 ? 'Día' : 'Días')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                      {formatCurrency(item.precioUnitario)} / {esPorHora ? 'hr' : 'día'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 border-r border-slate-300">{item.descuento > 0 ? `-${formatCurrency(item.descuento)}` : '-'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totales Monocromáticos */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2 border border-slate-300 rounded-sm p-3 font-mono text-xs">
              <div className="flex justify-between text-slate-700 font-bold">
                <span>SUBTOTAL BRUTO:</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.descuento > 0 && (
                <div className="flex justify-between text-slate-600 font-bold">
                  <span>DESCUENTO GLOBAL:</span>
                  <span>-{formatCurrency(quotation.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-bold">
                <span>IVA (15%):</span>
                <span>{formatCurrency(quotation.iva)}</span>
              </div>
              <div className="flex justify-between text-sm text-white font-black bg-slate-900 p-2.5 rounded-sm mt-1">
                <span>TOTAL GENERAL:</span>
                <span>{formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        {quotation.condiciones && (
          <div className="mt-8 p-4 bg-slate-50 border border-slate-300 rounded-sm">
            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
              CONDICIONES Y NOTAS COMERCIALES
            </h3>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
              {quotation.condiciones}
            </p>
          </div>
        )}

        {/* Firmas Protegidas contra Saltos de Página */}
        <div className="signature-section avoid-break mt-16 grid grid-cols-2 gap-16 px-12">
          <div className="text-center">
            <div className="border-t-2 border-slate-400 pt-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              FIRMA ACEPTACIÓN CLIENTE
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Nombre, Firma y Sello de Conforme</p>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-slate-400 pt-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              FIRMA ASESOR COMERCIAL
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Por BM Construcciones S.A.</p>
          </div>
        </div>

      </div>
      
    </div>
  );
};
