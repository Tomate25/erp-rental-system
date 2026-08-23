import React from 'react';
import type { Contract } from '../../operations/services/operations.api';
import { Printer, ArrowLeft } from 'lucide-react';

interface ContractPrintViewProps {
  contract: Contract;
  onBack: () => void;
}

export const ContractPrintView: React.FC<ContractPrintViewProps> = ({ contract, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-NI', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount);
  };

  // Cálculo de totales para el formato impreso
  const subtotal = contract.items?.reduce((sum, item) => sum + (item.precioRenta * item.cantidad * ((item as any).dias || 1)), 0) || 0;
  const iva = subtotal * 0.15;
  const totalGeneral = subtotal + iva;

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

      {/* Botones de Acción (Se ocultan al imprimir) */}
      <div className="max-w-[215mm] mx-auto mb-6 flex items-center justify-between print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onBack}
          className="btn-precision-outline text-xs flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Listado
        </button>

        <button
          onClick={handlePrint}
          className="btn-precision-primary bg-slate-900 text-white hover:bg-black text-xs flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Imprimir Documento Oficial
        </button>
      </div>

      {/* HOJA DE PAPEL FÍSICA PROPORCIONADA (ESTILO VISOR PDF / CARTA) */}
      <div className="max-w-[215mm] mx-auto bg-white border border-slate-300 shadow-sm p-10 print-container print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full space-y-5 rounded-sm">
        
        {/* Encabezado Principal Texto Puro */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">BM CONSTRUCCIONES S.A.</h1>
            <p className="text-xs text-slate-600 font-medium">Km 10.5 Carretera a Masaya, 150m al S.O. — Managua, Nicaragua</p>
            <p className="text-[11px] text-slate-500 font-medium">PBX: (505) 2255-8800 | Email: contacto@bmconstrucciones.com</p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-sm mb-1">
              CONTRATO DE ARRENDAMIENTO
            </span>
            <div className="text-lg font-mono font-black text-slate-900">
              No. <span className="text-red-600">{contract.codigo || 'CTR-2026-0001'}</span>
            </div>
            <div className="text-[11px] text-slate-600 font-bold mt-0.5">
              Emisión: <span className="font-mono">{formatDate(contract.fechaInicio)}</span>
            </div>
          </div>
        </div>

        {/* Ficha del Arrendatario */}
        <div className="border border-slate-300 rounded-sm text-xs divide-y divide-slate-300">
          <div className="grid grid-cols-3 divide-x divide-slate-300 bg-slate-50/50">
            <div className="p-3 col-span-2 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">ARRENDATARIO / RAZÓN SOCIAL</span>
              <span className="font-black text-sm text-slate-900 block uppercase tracking-tight">{contract.cliente?.nombre || contract.cliente?.razonSocial || 'N/A'}</span>
            </div>
            <div className="p-3 col-span-1 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">RUC / CÉDULA DE IDENTIDAD</span>
              <span className="font-mono font-black text-slate-900 block">{(contract.cliente as any)?.rfc || (contract.cliente as any)?.ruc || '201-310789-0001B'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-300">
            <div className="p-3 col-span-2 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">DIRECCIÓN / UBICACIÓN DEL PROYECTO</span>
              <span className="font-medium text-slate-800 block leading-tight">{(contract.cliente as any)?.direccion || 'MANAGUA, NICARAGUA'}</span>
            </div>
            <div className="p-3 col-span-1 space-y-1 bg-slate-50/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">CONTACTO DIRECTO</span>
              <span className="font-bold text-slate-900 block">{(contract.cliente as any)?.personaContacto || contract.cliente?.nombre}</span>
              <span className="font-mono text-slate-600 block text-[11px]">{contract.cliente?.telefono || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-300 bg-slate-50/50 text-[11px]">
            <div className="p-2.5">
              <span className="text-[9px] font-black uppercase text-slate-500 block">FECHA DE SALIDA</span>
              <span className="font-mono font-bold text-slate-900">{formatDate(contract.fechaInicio)}</span>
            </div>
            <div className="p-2.5">
              <span className="text-[9px] font-black uppercase text-slate-500 block">FECHA VENCIMIENTO ESTIMADA</span>
              <span className="font-mono font-bold text-slate-900">{formatDate(contract.fechaFin)}</span>
            </div>
            <div className="p-2.5">
              <span className="text-[9px] font-black uppercase text-slate-500 block">ASESOR COMERCIAL</span>
              <span className="font-bold text-slate-900">DEPARTAMENTO DE VENTAS</span>
            </div>
          </div>
        </div>

        {/* Declaración Legal Breve */}
        <div className="border border-slate-300 p-3 text-[10.5px] leading-relaxed text-slate-700 text-justify bg-slate-50/40 rounded-sm space-y-1">
          <p>
            El Arrendatario declara recibir a satisfacción los equipos detallados a continuación y acepta los términos de uso y devolución. Ninguna promesa verbal no incluida en este documento posee validez legal.
          </p>
          <p className="font-bold text-slate-900">
            El Arrendatario asume responsabilidad total por la custodia, operación y pagos derivados del servicio contratado.
          </p>
        </div>

        {/* Descripción de Entrega de Equipos */}
        <div className="space-y-1">
          <div className="text-center font-black text-[11px] uppercase tracking-wider py-1.5 bg-slate-100 border border-slate-300 text-slate-900">
            DESCRIPCIÓN DE ENTREGA — EQUIPOS Y ACCESORIOS REGISTRADOS
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase text-slate-700">
                <th className="border-r border-slate-300 p-2 text-center w-16">ARTÍCULO</th>
                <th className="border-r border-slate-300 p-2 text-left">DESCRIPCIÓN DE MAQUINARIA / EQUIPO</th>
                <th className="border-r border-slate-300 p-2 text-left w-32">SERIE</th>
                <th className="border-r border-slate-300 p-2 text-center w-28">DURACIÓN</th>
                <th className="border-r border-slate-300 p-2 text-right w-20">CANT.</th>
                <th className="border-r border-slate-300 p-2 text-right w-28">TARIFA (C$)</th>
                <th className="p-2 text-right w-28 font-black text-slate-900">TOTAL (C$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {contract.items && contract.items.length > 0 ? (
                contract.items.map((item, idx) => {
                  const lineTotal = item.precioRenta * item.cantidad * ((item as any).dias || 1);
                  const esPorHora = (item as any).tipoTarifa === 'HORA' || (item.precioRenta && item.precioRenta < 500);
                  const duracionVal = (item as any).dias || 1;
                  return (
                    <tr key={item.id || idx} className="h-8">
                      <td className="border-r border-slate-300 p-2 text-center font-mono font-bold">06-0{idx + 3}</td>
                      <td className="border-r border-slate-300 p-2 font-bold uppercase">{item.equipo?.modelo || 'EQUIPO DE CONSTRUCCIÓN Y ARRENDAMIENTO'}</td>
                      <td className="border-r border-slate-300 p-2 font-mono text-[11px]">{item.equipo?.numeroSerie || 'ESTÁNDAR'}</td>
                      <td className="border-r border-slate-300 p-2 text-center font-mono font-bold text-xs">
                        {duracionVal} {esPorHora ? (duracionVal === 1 ? 'Hora' : 'Horas') : (duracionVal === 1 ? 'Día' : 'Días')}
                      </td>
                      <td className="border-r border-slate-300 p-2 text-right font-mono font-bold">{item.cantidad.toFixed(2)}</td>
                      <td className="border-r border-slate-300 p-2 text-right font-mono">
                        {formatCurrency(item.precioRenta)} / {esPorHora ? 'hr' : 'día'}
                      </td>
                      <td className="p-2 text-right font-mono font-black text-slate-900">{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr className="h-8">
                  <td className="border-r border-slate-300 p-2 text-center font-mono font-bold">06-03</td>
                  <td className="border-r border-slate-300 p-2 font-bold uppercase">ANDAMIO ESTÁNDAR Y RODOS</td>
                  <td className="border-r border-slate-300 p-2 font-mono text-[11px]">SN-ANDAMIO-01</td>
                  <td className="border-r border-slate-300 p-2 text-center font-bold">3 Días</td>
                  <td className="border-r border-slate-300 p-2 text-right font-mono font-bold">1.00</td>
                  <td className="border-r border-slate-300 p-2 text-right font-mono">C$ 500.00 / día</td>
                  <td className="p-2 text-right font-mono font-black">C$ 1,500.00</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Observaciones y Resumen Financiero */}
        <div className="grid grid-cols-3 gap-4 pt-1">
          <div className="col-span-2 border border-slate-300 p-3 text-xs space-y-1.5 rounded-sm">
            <span className="font-black block uppercase text-[10px] text-slate-500 tracking-wider">OBSERVACIONES / CONDICIONES DE ENTREGA:</span>
            <p className="text-[11px] text-slate-700 font-medium italic">
              {contract.condiciones || 'El equipo se entrega inspeccionado, limpio y en óptimo estado de operación. Se requiere devolución bajo las mismas condiciones.'}
            </p>
          </div>

          <div className="col-span-1 border border-slate-300 rounded-sm text-xs divide-y divide-slate-200 font-mono">
            <div className="p-2 flex justify-between">
              <span className="font-bold text-slate-600">SUB TOTAL:</span>
              <span className="font-black text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="p-2 flex justify-between text-slate-500">
              <span>DESCUENTO:</span>
              <span>C$ 0.00</span>
            </div>
            <div className="p-2 flex justify-between">
              <span className="font-bold text-slate-600">IVA (15%):</span>
              <span className="font-bold text-slate-900">{formatCurrency(iva)}</span>
            </div>
            <div className="p-2.5 flex justify-between bg-slate-900 text-white text-xs font-black">
              <span>TOTAL GENERAL:</span>
              <span>{formatCurrency(totalGeneral)}</span>
            </div>
          </div>
        </div>

        {/* Firmas de Conformidad */}
        <div className="signature-section avoid-break grid grid-cols-2 gap-16 pt-12 text-center text-xs mt-6">
          <div className="space-y-1">
            <div className="border-b-2 border-slate-400 w-3/4 mx-auto pb-8 font-mono text-slate-400">
              
            </div>
            <span className="font-black block uppercase text-xs text-slate-900">ENTREGADO POR</span>
            <span className="text-[10px] text-slate-500 block">BM CONSTRUCCIONES S.A.</span>
          </div>

          <div className="space-y-1">
            <div className="border-b-2 border-slate-400 w-3/4 mx-auto pb-8 font-mono text-slate-400">
              
            </div>
            <span className="font-black block uppercase text-xs text-slate-900">RECIBIDO CONFORME (ARRENDATARIO)</span>
            <span className="text-[10px] text-slate-500 block">NOMBRE, FIRMA Y SELLO DE RECIBIDO</span>
          </div>
        </div>

      </div>

    </div>
  );
};
