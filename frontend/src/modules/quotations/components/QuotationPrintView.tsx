import React from 'react';
import type { Cotizacion } from '../types/quotation.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { ArrowLeft, Printer, Building2, Phone, Mail, Globe } from 'lucide-react';

interface QuotationPrintViewProps {
  quotation: Cotizacion;
  onBack: () => void;
}

export const QuotationPrintView: React.FC<QuotationPrintViewProps> = ({ quotation, onBack }) => {

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:p-0 print:m-0 animate-fadeIn">
      
      {/* Controles NO imprimibles */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between px-4 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-6 py-2 rounded-xl shadow-md shadow-blue-500/20"
        >
          <Printer className="w-4 h-4" /> Imprimir Cotización
        </button>
      </div>

      {/* Hoja A4 para imprimir */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-xl rounded-sm print:border-none print:shadow-none print:rounded-none">
        
        <div className="p-12 print:p-8 space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">BM <span className="text-blue-600">CONSTRUCCIONES</span></h1>
              </div>
              <div className="text-xs text-slate-600 space-y-1 font-medium">
                <p className="flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400"/> Av. Principal 123, Ciudad, País</p>
                <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400"/> +1 234 567 8900</p>
                <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400"/> ventas@bmconstrucciones.com</p>
                <p className="flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400"/> www.bmconstrucciones.com</p>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-widest">Cotización</h2>
              <div className="inline-block bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-100">
                <p className="text-sm font-bold">N°: <span className="font-mono text-lg">{quotation.numeroCotizacion}</span></p>
                <p className="text-[10px] uppercase font-bold text-blue-600/80">Versión {quotation.version}</p>
              </div>
              <div className="mt-4 text-xs text-slate-600 font-bold space-y-1">
                <p>Fecha Emisión: {new Date(quotation.fechaEmision).toLocaleDateString()}</p>
                <p>Válido por: {quotation.validezDias} días</p>
                {quotation.referencia && <p>Ref: {quotation.referencia}</p>}
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preparado Para</h3>
              <p className="text-sm font-black text-slate-900">{quotation.cliente?.nombre || 'Consumidor Final'}</p>
              {quotation.cliente?.rfc && <p className="text-xs text-slate-600 font-mono">RUC: {quotation.cliente.rfc}</p>}
              {quotation.atencion && <p className="text-xs text-slate-600">Atención: {quotation.atencion}</p>}
              {quotation.proyecto && <p className="text-xs text-slate-600">Proyecto: {quotation.proyecto}</p>}
              {quotation.telefono && <p className="text-xs text-slate-600">Tel: {quotation.telefono}</p>}
            </div>
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Asesor Comercial</h3>
              <p className="text-sm font-black text-slate-900">{quotation.asesor?.nombre || 'Asesor Asignado'} {quotation.asesor?.apellido || ''}</p>
              <p className="text-xs text-slate-600">{quotation.asesor?.email || 'ventas@bmconstrucciones.com'}</p>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div>
            <table className="w-full text-left text-xs mb-8">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b-2 border-slate-300">
                  <th className="py-3 px-4 w-12 text-center">Cant.</th>
                  <th className="py-3 px-4">Descripción de Servicio/Equipo</th>
                  <th className="py-3 px-4 w-16 text-center">Días</th>
                  <th className="py-3 px-4 w-28 text-right">Precio Unit.</th>
                  <th className="py-3 px-4 w-24 text-right">Desc.</th>
                  <th className="py-3 px-4 w-32 text-right text-slate-900 font-black">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quotation.items || []).map((item, index) => (
                  <tr key={index} className="text-slate-700">
                    <td className="py-3 px-4 text-center font-bold">{item.cantidad}</td>
                    <td className="py-3 px-4 font-bold">{item.descripcion}</td>
                    <td className="py-3 px-4 text-center">{item.dias}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.precioUnitario)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-500">{item.descuento > 0 ? `-${formatCurrency(item.descuento)}` : '-'}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-xs text-slate-600 font-bold px-4">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(quotation.subtotal)}</span>
                </div>
                {quotation.descuento > 0 && (
                  <div className="flex justify-between text-xs text-red-500 font-bold px-4">
                    <span>Descuento Global:</span>
                    <span>-{formatCurrency(quotation.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-600 font-bold px-4">
                  <span>Subtotal con Desc.:</span>
                  <span>{formatCurrency(quotation.subtotal - quotation.descuento)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-bold px-4">
                  <span>I.V.A (15%):</span>
                  <span>{formatCurrency(quotation.iva)}</span>
                </div>
                <div className="flex justify-between text-lg text-slate-900 font-black bg-slate-100 p-4 rounded-lg mt-2 border border-slate-200">
                  <span>TOTAL:</span>
                  <span className="text-blue-600">{formatCurrency(quotation.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Condiciones */}
          {quotation.condiciones && (
            <div className="mt-12 p-6 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                Condiciones y Notas Adicionales
              </h3>
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {quotation.condiciones}
              </p>
            </div>
          )}

          {/* Firmas */}
          <div className="mt-24 grid grid-cols-2 gap-16 px-12">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                Firma Aceptación Cliente
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Nombre y Sello</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                Firma Asesor
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Por BM Construcciones</p>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="bg-blue-600 text-white p-4 text-center text-[10px] font-bold rounded-b-sm print:absolute print:bottom-0 print:w-full">
          Este documento es una cotización y no constituye una factura válida con fines tributarios.
        </div>
      </div>
      
    </div>
  );
};
