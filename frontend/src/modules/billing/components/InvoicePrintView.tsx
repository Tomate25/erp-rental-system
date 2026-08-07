import React from 'react';
import type { Factura } from '../types/billing.types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { ArrowLeft, Printer, Building2, Phone, Mail, Globe } from 'lucide-react';

interface InvoicePrintViewProps {
  factura: Factura;
  onBack: () => void;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ factura, onBack }) => {

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:p-0 print:m-0 animate-fadeIn">
      
      {/* Controles NO imprimibles */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between px-4 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Facturación
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors px-6 py-2 rounded-xl shadow-md shadow-emerald-500/20"
        >
          <Printer className="w-4 h-4" /> Imprimir Factura / Guardar PDF
        </button>
      </div>

      {/* Hoja A4 Imprimible */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-xl rounded-sm print:border-none print:shadow-none print:rounded-none relative overflow-hidden">
        
        {/* Sello de Estado Watermark */}
        <div className="absolute top-36 right-12 pointer-events-none opacity-15 rotate-[-12deg] select-none print:opacity-20">
          {factura.estado === 'PAGADA' ? (
            <div className="border-8 border-emerald-600 text-emerald-700 font-black text-6xl px-8 py-4 rounded-3xl uppercase tracking-widest text-center">
              PAGADO
            </div>
          ) : (
            <div className="border-8 border-amber-600 text-amber-700 font-black text-6xl px-8 py-4 rounded-3xl uppercase tracking-widest text-center">
              PENDIENTE
            </div>
          )}
        </div>

        <div className="p-12 print:p-8 space-y-8 relative z-10">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-8 h-8 text-emerald-600" />
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">BM <span className="text-emerald-600">CONSTRUCCIONES</span></h1>
              </div>
              <div className="text-xs text-slate-600 space-y-1 font-medium">
                <p className="flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400"/> Av. Principal 123, Managua, Nicaragua</p>
                <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400"/> +505 2233 4455 / +505 8899 0011</p>
                <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400"/> facturacion@bmconstrucciones.com</p>
                <p className="flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400"/> www.bmconstrucciones.com</p>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-widest">Factura</h2>
              <div className="inline-block bg-emerald-50 text-emerald-900 px-4 py-2 rounded-lg border border-emerald-200">
                <p className="text-xs font-bold">Folio: <span className="font-mono text-base font-black">{factura.folio}</span></p>
                <p className="text-[10px] uppercase font-bold text-emerald-700 mt-0.5">Tipo: {factura.tipoFactura}</p>
              </div>
              <div className="mt-4 text-xs text-slate-600 font-bold space-y-1">
                <p>Emisión: {new Date(factura.fechaEmision).toLocaleDateString('es-NI')}</p>
                {factura.fechaVence && <p>Vencimiento: {new Date(factura.fechaVence).toLocaleDateString('es-NI')}</p>}
                <p>Condición: <span className="text-emerald-700 font-black">{factura.condicionPago}</span> {factura.plazoCreditoDias ? `(${factura.plazoCreditoDias} días)` : ''}</p>
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Facturado A</h3>
              <p className="text-sm font-black text-slate-900">{factura.cliente?.nombre || 'Consumidor Final'}</p>
              {factura.cliente?.rfc && <p className="text-xs text-slate-600 font-mono">RUC / Cédula: {factura.cliente.rfc}</p>}
              {factura.cliente?.telefono && <p className="text-xs text-slate-600">Teléfono: {factura.cliente.telefono}</p>}
              {factura.cliente?.emailFacturacion && <p className="text-xs text-slate-600">Email: {factura.cliente.emailFacturacion}</p>}
            </div>
            <div className="space-y-1 text-right">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalles de Operación</h3>
              <p className="text-xs text-slate-600">Contrato Ref: <span className="font-bold text-slate-800 font-mono">{factura.contrato?.codigo || 'N/A'}</span></p>
              <p className="text-xs text-slate-600">Estado de Pago: <span className="font-bold text-emerald-700">{factura.estado}</span></p>
            </div>
          </div>

          {/* Totales */}
          <div className="pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-xs text-slate-600 font-bold px-4">
                  <span>Subtotal Neto:</span>
                  <span>{formatCurrency(factura.subtotal)}</span>
                </div>
                {factura.descuentoGlobal > 0 && (
                  <div className="flex justify-between text-xs text-red-500 font-bold px-4">
                    <span>Descuento Global:</span>
                    <span>-{formatCurrency(factura.descuentoGlobal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-600 font-bold px-4">
                  <span>I.V.A (15%):</span>
                  <span>{formatCurrency(factura.iva)}</span>
                </div>
                {factura.retencionIva > 0 && (
                  <div className="flex justify-between text-xs text-purple-700 font-bold px-4">
                    <span>Retención IVA:</span>
                    <span>-{formatCurrency(factura.retencionIva)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg text-slate-900 font-black bg-emerald-50 p-4 rounded-xl mt-2 border border-emerald-200">
                  <span>TOTAL GENERAL:</span>
                  <span className="text-emerald-700">{formatCurrency(factura.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Firmas */}
          <div className="mt-20 grid grid-cols-2 gap-16 px-12">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                Recibido Conforme (Cliente)
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Firma y Sello de Recibido</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                Emisor Autorizado
              </div>
              <p className="text-[10px] text-slate-400 mt-1">BM Construcciones</p>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="bg-emerald-700 text-white p-4 text-center text-[10px] font-bold rounded-b-sm print:absolute print:bottom-0 print:w-full">
          Documento Oficial de Facturación - BM Construcciones Nicaragua
        </div>
      </div>
      
    </div>
  );
};
