import React, { useState } from 'react';
import { ArrowLeft, Printer, Plus, Trash2 } from 'lucide-react';

interface ActaRecepcionPrintViewProps {
  retorno?: any;
  contrato?: any;
  onBack: () => void;
}

export const ActaRecepcionPrintView: React.FC<ActaRecepcionPrintViewProps> = ({ retorno, contrato, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  // Datos auto-rellenados del sistema
  const defaultClient = retorno?.contrato?.cliente?.nombre || contrato?.cliente?.nombre || '';
  const defaultRfc = retorno?.contrato?.cliente?.rfc || (contrato?.cliente as any)?.cedula || contrato?.cliente?.rfc || '';
  const defaultContratoCode = retorno?.contrato?.codigo || contrato?.codigo || '';
  const defaultSerialNo = retorno?.codigo ? retorno.codigo.replace(/[^0-9]/g, '').padStart(6, '0') : '000001';

  const rawItems = retorno?.items || contrato?.items || [];
  const initialItems = rawItems.length > 0 ? rawItems.map((it: any, idx: number) => ({
    itemNum: `0${idx + 1}`,
    cant: (it.cantidadRetornada || it.cantidad || 1).toString(),
    descripcion: `${it.equipo?.modelo || it.modelo || 'EQUIPO DE CONSTRUCCIÓN'}${it.equipo?.numeroSerie ? ` (S/N: ${it.equipo.numeroSerie})` : ''}`,
    horas: (it.horometroFinal !== undefined ? it.horometroFinal : it.equipo?.horometro || 0).toString(),
    combustible: it.nivelCombustible || 'LLENO'
  })) : [
    { itemNum: '01', cant: '1', descripcion: 'REVOLVEDORA DE CONCRETO 1 SACO', horas: '16.00', combustible: 'LLENO' },
    { itemNum: '02', cant: '', descripcion: '', horas: '', combustible: '' }
  ];

  const getInitialTimeState = () => {
    const rawDate = retorno?.fechaDevolucion || retorno?.createdAt;
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

  // Estados editables en vivo
  const [fecha, setFecha] = useState(
    retorno?.fechaDevolucion 
      ? new Date(retorno.fechaDevolucion).toLocaleDateString('es-NI') 
      : (retorno?.createdAt ? new Date(retorno.createdAt).toLocaleDateString('es-NI') : new Date().toLocaleDateString('es-NI'))
  );
  const [hora, setHora] = useState(initialTime.formattedHora);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initialTime.detectedAmpm);
  const [entregadoPor, setEntregadoPor] = useState(defaultClient);
  const [recibidoPor, setRecibidoPor] = useState(retorno?.recibidoPor || 'BM CONSTRUCCIONES S.A. / ALMACÉN');
  const [cedula, setCedula] = useState(defaultRfc);
  const [contratoNo, setContratoNo] = useState(defaultContratoCode);
  const [items, setItems] = useState<any[]>(initialItems);
  const [observaciones, setObservaciones] = useState(
    retorno?.comentarios || 'Equipo recibido de retorno en buenas condiciones mecánicas e inspeccionado.'
  );

  const addItemRow = () => {
    setItems([
      ...items,
      { itemNum: `0${items.length + 1}`, cant: '1', descripcion: '', horas: '0.00', combustible: 'LLENO' }
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: string, value: any) => {
    const updated = [...items];
    updated[idx][field] = value;
    setItems(updated);
  };

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
            onClick={addItemRow}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl border border-slate-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Fila
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs font-bold text-white bg-slate-900 hover:bg-black px-6 py-2 rounded-xl shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir / Descargar PDF Oficial
          </button>
        </div>
      </div>

      {/* FORMATO FÍSICO INTERACTIVO CON DATOS AUTO-COMPLETADOS Y EDITABLES */}
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
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">ACTA DE RECEPCIÓN DE EQUIPOS</h2>
          <div className="text-base font-mono font-black text-red-600">
            N° <span className="text-red-600">{defaultSerialNo}</span>
          </div>
        </div>

        {/* Campos Editables Digitados */}
        <div className="text-xs space-y-2 font-medium text-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold">Fecha:</span>
              <input
                type="text"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                placeholder="__/__/____"
                className="font-mono font-bold border-b border-slate-400 px-2 py-0.5 w-32 outline-none bg-slate-50/50 print:bg-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold">Hora:</span>
              <input
                type="text"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                placeholder="04:30"
                className="font-mono font-bold border-b border-slate-400 px-2 py-0.5 w-24 outline-none bg-slate-50/50 print:bg-transparent"
              />
              <div className="flex items-center gap-2 text-[11px] font-bold ml-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <span>AM</span>
                  <input
                    type="checkbox"
                    checked={ampm === 'AM'}
                    onChange={() => setAmpm('AM')}
                    className="w-3.5 h-3.5 accent-slate-900 cursor-pointer"
                  />
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <span>PM</span>
                  <input
                    type="checkbox"
                    checked={ampm === 'PM'}
                    onChange={() => setAmpm('PM')}
                    className="w-3.5 h-3.5 accent-slate-900 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold shrink-0">Entregado por:</span>
            <input
              type="text"
              value={entregadoPor}
              onChange={(e) => setEntregadoPor(e.target.value)}
              placeholder="Nombre del cliente o transportista que devuelve"
              className="font-bold text-slate-900 border-b border-slate-400 w-full uppercase px-1 py-0.5 outline-none bg-slate-50/50 print:bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold shrink-0">Recibido por:</span>
            <input
              type="text"
              value={recibidoPor}
              onChange={(e) => setRecibidoPor(e.target.value)}
              placeholder="Personal de BM Construcciones / Almacén"
              className="font-bold text-slate-900 border-b border-slate-400 w-full uppercase px-1 py-0.5 outline-none bg-slate-50/50 print:bg-transparent"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-1/2">
              <span className="font-bold shrink-0">Cédula de Identidad No:</span>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="RUC o Cédula"
                className="font-mono font-bold text-slate-900 border-b border-slate-400 w-full px-1 py-0.5 outline-none bg-slate-50/50 print:bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 w-1/2 justify-end">
              <span className="font-bold shrink-0">Contrato No:</span>
              <input
                type="text"
                value={contratoNo}
                onChange={(e) => setContratoNo(e.target.value)}
                placeholder="CTR-2026-0001"
                className="font-mono font-bold text-slate-900 border-b border-slate-400 w-full px-1 py-0.5 text-right outline-none bg-slate-50/50 print:bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Rejilla de Tabla Exacta con Celdas Editables */}
        <div className="pt-2">
          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-black text-[10px] uppercase">
                <th className="border border-slate-800 p-1.5 text-center w-12">ITEM</th>
                <th className="border border-slate-800 p-1.5 text-center w-14">CANT</th>
                <th className="border border-slate-800 p-1.5 text-left">DESCRIPCIÓN</th>
                <th className="border border-slate-800 p-1.5 text-center w-24">HORAS</th>
                <th className="border border-slate-800 p-1.5 text-center w-28">COMBUSTIBLE</th>
                <th className="border border-slate-800 p-1.5 text-center w-10 print:hidden">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-900">
              {items.map((row: any, idx: number) => (
                <tr key={idx} className="h-9">
                  <td className="border border-slate-800 p-1 text-center font-mono font-bold">
                    <input
                      type="text"
                      value={row.itemNum || `0${idx + 1}`}
                      onChange={(e) => updateItemRow(idx, 'itemNum', e.target.value)}
                      className="w-full text-center font-mono font-bold outline-none bg-transparent"
                    />
                  </td>
                  <td className="border border-slate-800 p-1 text-center font-mono font-bold">
                    <input
                      type="text"
                      value={row.cant}
                      onChange={(e) => updateItemRow(idx, 'cant', e.target.value)}
                      placeholder="1"
                      className="w-full text-center font-mono font-bold outline-none bg-transparent"
                    />
                  </td>
                  <td className="border border-slate-800 p-1 font-bold uppercase">
                    <input
                      type="text"
                      value={row.descripcion}
                      onChange={(e) => updateItemRow(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción de maquinaria recibida"
                      className="w-full font-bold uppercase outline-none bg-transparent"
                    />
                  </td>
                  <td className="border border-slate-800 p-1 text-center font-mono font-bold">
                    <input
                      type="text"
                      value={row.horas}
                      onChange={(e) => updateItemRow(idx, 'horas', e.target.value)}
                      placeholder="16.00"
                      className="w-full text-center font-mono font-bold outline-none bg-transparent"
                    />
                  </td>
                  <td className="border border-slate-800 p-1 text-center font-bold uppercase">
                    <select
                      value={row.combustible}
                      onChange={(e) => updateItemRow(idx, 'combustible', e.target.value)}
                      className="w-full text-center font-bold uppercase outline-none bg-transparent cursor-pointer"
                    >
                      <option value="LLENO">LLENO</option>
                      <option value="3/4">3/4</option>
                      <option value="1/2">1/2</option>
                      <option value="1/4">1/4</option>
                      <option value="VACÍO">VACÍO</option>
                    </select>
                  </td>
                  <td className="border border-slate-800 p-1 text-center print:hidden">
                    <button
                      onClick={() => removeItemRow(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[8px] font-mono text-slate-500 text-right pt-0.5">
            10 B 50J Q (3)A,R N° 20,551 - 21,050 06/2026
          </div>
        </div>

        {/* Sección de Observaciones Editable */}
        <div className="space-y-1.5 pt-2 text-xs">
          <span className="font-bold text-slate-900 uppercase">OBSERVACIONES:</span>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Anotar hallazgos de inspección, limpieza, horómetro final o daños..."
            className="w-full border-b border-slate-400 text-[11px] italic font-medium outline-none bg-slate-50/40 p-1 resize-none print:bg-transparent print:border-b"
          />
        </div>

        {/* Firmas Oficiales de Recepción */}
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
