import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

interface ActaEntregaPrintViewProps {
  despacho?: any;
  contrato?: any;
  actaData?: {
    fecha: string;
    hora: string;
    ampm: 'AM' | 'PM';
    entregadoPor: string;
    recibidoPor: string;
    cedula: string;
    contratoNo: string;
    observaciones: string;
    items: Array<{
      itemNum: string | number;
      cant: string | number;
      descripcion: string;
      horas: string;
      combustible: string;
    }>;
  };
  onBack: () => void;
}

export const ActaEntregaPrintView: React.FC<ActaEntregaPrintViewProps> = ({ despacho, contrato, actaData, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  // 1. Deserializar metadata guardada de forma permanente en actaEntregaData o comentarios
  let parsedMeta: any = null;
  try {
    if (despacho?.actaEntregaData) {
      parsedMeta = typeof despacho.actaEntregaData === 'string' ? JSON.parse(despacho.actaEntregaData) : despacho.actaEntregaData;
    } else if (despacho?.comentarios && typeof despacho.comentarios === 'string' && despacho.comentarios.startsWith('{')) {
      parsedMeta = JSON.parse(despacho.comentarios);
    }
  } catch {
    parsedMeta = null;
  }

  // 2. Datos auto-rellenados del sistema
  const defaultClient = despacho?.contrato?.cliente?.nombre || contrato?.cliente?.nombre || '';
  const defaultRfc = despacho?.contrato?.cliente?.rfc || (contrato?.cliente as any)?.cedula || contrato?.cliente?.rfc || '';
  const defaultContratoCode = despacho?.contrato?.codigo || contrato?.codigo || '';
  const defaultSerialNo = despacho?.codigo ? despacho.codigo.replace(/[^0-9]/g, '').padStart(6, '0') : '000001';
  
  const rawItems = despacho?.items || contrato?.items || [];
  const initialItems = rawItems.length > 0 ? rawItems.map((it: any, idx: number) => {
    const fuelReading = it.inspeccionesSalida?.[0]?.combustible || it.combustible || (
      it.equipo?.tipoMedicionCombustible ? 'N/D' : 'N/A'
    );
    return {
      itemNum: `0${idx + 1}`,
      cant: it.cantidad || 1,
      descripcion: `${it.equipo?.modelo || it.modelo || 'EQUIPO DE CONSTRUCCIÓN'}${it.equipo?.numeroSerie ? ` (Serie: ${it.equipo.numeroSerie})` : ''}`,
      horas: (it.horometroInicial !== undefined ? it.horometroInicial : (it.horometroSalida !== undefined ? it.horometroSalida : it.equipo?.horometro || 0)).toString(),
      combustible: fuelReading
    };
  }) : [
    { itemNum: '01', cant: '1', descripcion: 'REVOLVEDORA DE CONCRETO 1 SACO', horas: '0.00', combustible: 'N/D' }
  ];

  const getInitialTimeState = () => {
    const rawDate = despacho?.fechaDespacho || despacho?.createdAt;
    const d = rawDate ? new Date(rawDate) : new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const isPm = hours >= 12;
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');
    return {
      formattedHora: `${hoursStr}:${minutes}`,
      detectedAmpm: (isPm ? 'PM' : 'AM') as 'AM' | 'PM'
    };
  };

  const initialTime = getInitialTimeState();

  // 3. Valores definitivos preparados en Salida o recuperados del despacho persistido
  const fecha = (
    actaData?.fecha ||
    parsedMeta?.fecha ||
    parsedMeta?.fechaEntrega ||
    (despacho?.fechaDespacho 
      ? new Date(despacho.fechaDespacho).toLocaleDateString('es-NI') 
      : (despacho?.createdAt ? new Date(despacho.createdAt).toLocaleDateString('es-NI') : new Date().toLocaleDateString('es-NI')))
  );
  const hora = actaData?.hora || parsedMeta?.hora || parsedMeta?.horaEntrega || initialTime.formattedHora;
  const ampm = (actaData?.ampm || parsedMeta?.ampm || parsedMeta?.ampmEntrega || initialTime.detectedAmpm) as 'AM' | 'PM';
  const entregadoPor = actaData?.entregadoPor || parsedMeta?.entregadoPor || despacho?.operadorNombre || despacho?.despachadoPor || 'BM Construcciones / Almacén';
  const recibidoPor = actaData?.recibidoPor || parsedMeta?.recibidoPor || defaultClient;
  const cedula = actaData?.cedula || parsedMeta?.cedula || defaultRfc;
  const contratoNo = actaData?.contratoNo || parsedMeta?.contratoNo || defaultContratoCode;
  const items = actaData?.items || parsedMeta?.items || initialItems;
  const observaciones = (
    actaData?.observaciones ||
    parsedMeta?.observaciones ||
    (despacho?.comentarios && !despacho.comentarios.startsWith('{') ? despacho.comentarios : null) ||
    'Equipo entregado en perfecto estado de funcionamiento y limpieza.'
  );

  return (
    <div className="bg-[#F1F5F9] min-h-screen py-8 px-4 print:bg-white print:p-0 print:m-0 animate-fadeIn font-sans w-full">
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 8mm 10mm;
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
          input, textarea, select {
            border: none !important;
            background: transparent !important;
            outline: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            appearance: none !important;
            -webkit-appearance: none !important;
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

      {/* Controles de Acción NO Imprimibles */}
      <div className="max-w-[215mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Operaciones
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs font-bold text-white bg-slate-900 hover:bg-black px-6 py-2 rounded-xl shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir / Descargar PDF Oficial
          </button>
        </div>
      </div>

      {/* FORMATO FÍSICO OFICIAL BM CONSTRUCCIONES */}
      <div className="max-w-[215mm] mx-auto bg-white border border-slate-400 p-8 shadow-sm print-container print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 space-y-4 rounded-sm">
        
        {/* Encabezado Principal BM CONSTRUCCIONES */}
        <div className="text-center space-y-0.5 border-b border-slate-800 pb-3">
          <h1 className="text-2xl font-black italic tracking-wide text-slate-900 font-serif">BM CONSTRUCCIONES</h1>
          <p className="text-[10px] font-extrabold tracking-tight uppercase text-slate-800">
            DISEÑO, CONSTRUCCIÓN REMODELACIÓN GENERAL, RENTA DE EQUIPOS MENORES DE CONSTRUCCIÓN
          </p>
          <p className="text-[10.5px] font-bold text-slate-900">
            Bismarck Murillo Montes — INGENIERO CONTRATISTA
          </p>
          <p className="text-[9.5px] font-medium text-slate-700">
            * Revolvedoras * Vibradores * Compactadoras * Generadores de Energía
          </p>
          <p className="text-[9.5px] font-medium text-slate-700">
            Cel.: 8657-9832 • 8522-7626 • 5700-6521 • Correo.: bismurillo@hotmail.com.ni
          </p>
          <p className="text-[9px] font-medium text-slate-600 pt-0.5">
            Dirección: Km. 10.5 carretera a Masaya de la gasolinera UNO 150mts suroeste contiguo al Restaurante Chino • LIC. MTI 6985
          </p>
        </div>

        {/* Título de Documento y Folio Secuencial */}
        <div className="flex justify-between items-center pt-1 border-b-2 border-slate-900 pb-2">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">ACTA DE ENTREGA</h2>
          <div className="text-base font-mono font-black text-red-600">
            N° <span className="text-red-600">{defaultSerialNo}</span>
          </div>
        </div>

        {/* Campos del Acta con Líneas y Formato Oficial */}
        <div className="text-xs space-y-2 font-medium text-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold">Fecha:</span>
              <span className="font-mono font-bold border-b border-slate-400 px-2 py-0.5 w-32 inline-block">
                {fecha}
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold">Hora:</span>
              <span className="font-mono font-bold border-b border-slate-400 px-2 py-0.5 w-24 inline-block text-center">
                {hora}
              </span>
              <div className="flex items-center gap-2 text-[11px] font-bold ml-2">
                <label className="flex items-center gap-1">
                  <span>AM</span>
                  <input
                    type="checkbox"
                    checked={ampm === 'AM'}
                    readOnly
                    disabled
                    className="w-3.5 h-3.5 accent-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span>PM</span>
                  <input
                    type="checkbox"
                    checked={ampm === 'PM'}
                    readOnly
                    disabled
                    className="w-3.5 h-3.5 accent-slate-900"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold shrink-0">Entregado por:</span>
            <span className="font-bold text-slate-900 border-b border-slate-400 w-full uppercase px-1 py-0.5 block">
              {entregadoPor}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold shrink-0">Recibido por:</span>
            <span className="font-bold text-slate-900 border-b border-slate-400 w-full uppercase px-1 py-0.5 block">
              {recibidoPor}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-1/2">
              <span className="font-bold shrink-0">Cédula de Identidad No:</span>
              <span className="font-mono font-bold text-slate-900 border-b border-slate-400 w-full px-1 py-0.5 block">
                {cedula}
              </span>
            </div>
            <div className="flex items-center gap-2 w-1/2 justify-end">
              <span className="font-bold shrink-0">Contrato No:</span>
              <span className="font-mono font-bold text-slate-900 border-b border-slate-400 w-full px-1 py-0.5 text-right block">
                {contratoNo}
              </span>
            </div>
          </div>
        </div>

        {/* Rejilla de Tabla Exacta Oficial */}
        <div className="pt-2">
          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-black text-[10px] uppercase">
                <th className="border border-slate-800 p-1.5 text-center w-12">ÍTEM</th>
                <th className="border border-slate-800 p-1.5 text-center w-14">CANT</th>
                <th className="border border-slate-800 p-1.5 text-left">DESCRIPCIÓN</th>
                <th className="border border-slate-800 p-1.5 text-center w-24">HORAS</th>
                <th className="border border-slate-800 p-1.5 text-center w-28">COMBUSTIBLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-900">
              {items.map((row: any, idx: number) => (
                <tr key={idx} className="h-9">
                  <td className="border border-slate-800 p-1 text-center font-mono font-bold">
                    {row.itemNum || `0${idx + 1}`}
                  </td>
                  <td className="border border-slate-800 p-1 text-center font-mono font-bold">
                    {row.cant}
                  </td>
                  <td className="border border-slate-800 p-1 font-bold uppercase">
                    {row.descripcion}
                  </td>
                  <td className="border border-slate-800 p-1 text-center font-mono font-bold">
                    {row.horas}
                  </td>
                  <td className="border border-slate-800 p-1 text-center font-bold uppercase font-mono text-[11px]">
                    {row.combustible}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[8px] font-mono text-slate-500 text-right pt-0.5">
            10 B 50J Q (2)R.A. N° 12,301 - 12,800 06/2026
          </div>
        </div>

        {/* Sección de Observaciones Oficial */}
        <div className="space-y-1.5 pt-2 text-xs">
          <span className="font-bold text-slate-900 uppercase">OBSERVACIONES:</span>
          <div className="w-full border-b border-slate-400 text-[11px] italic font-medium p-1 min-h-[2.5rem] leading-relaxed">
            {observaciones}
          </div>
        </div>

        {/* Firmas Oficiales de Entrega */}
        <div className="signature-section avoid-break grid grid-cols-2 gap-16 pt-12 text-center text-xs mt-6">
          <div className="space-y-1">
            <div className="border-b border-slate-800 w-3/4 mx-auto pb-4 font-mono font-bold text-slate-400">
              
            </div>
            <span className="font-bold block uppercase text-xs text-slate-900">Entregado por</span>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-800 w-3/4 mx-auto pb-4 font-mono font-bold text-slate-400">
              
            </div>
            <span className="font-bold block uppercase text-xs text-slate-900">Recibido por</span>
          </div>
        </div>

      </div>
    </div>
  );
};
