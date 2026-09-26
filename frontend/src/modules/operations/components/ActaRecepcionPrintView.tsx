import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

interface Props {
  retorno?: any;
  contrato?: any;
  onBack: () => void;
}

const showDate = (value?: string) => value ? new Intl.DateTimeFormat('es-NI', {
  timeZone: 'America/Managua', day: '2-digit', month: '2-digit', year: 'numeric',
}).format(new Date(value)) : '';
const showTime = (value?: string) => value ? new Intl.DateTimeFormat('es-NI', {
  timeZone: 'America/Managua', hour: '2-digit', minute: '2-digit', hour12: true,
}).format(new Date(value)) : '';
const condition = (value?: string) => ({ BUENO: 'Buen estado', DESGASTE_NORMAL: 'Desgaste normal', DANADO: 'Dañado' }[value || ''] || 'Sin registrar');
const functionState = (value?: string) => ({ FUNCIONA: 'Funciona', NO_FUNCIONA: 'No funciona', NO_VERIFICADO: 'No verificado' }[value || ''] || 'Sin registrar');

export const ActaRecepcionPrintView: React.FC<Props> = ({ retorno, contrato, onBack }) => {
  const actualContract = retorno?.contrato || contrato;
  const items: any[] = retorno?.items || [];
  const reference = retorno?.codigo || retorno?.id?.slice(0, 8).toUpperCase() || '';
  const observations = items.flatMap((item) => [
    item.inspeccionEstado?.observaciones,
    item.descripcionDanios,
  ].filter(Boolean)).join(' · ');

  return <div className="min-h-screen bg-slate-100 p-5 print:bg-white print:p-0 text-slate-900">
    <style>{`@media print {
      @page { size: letter landscape; margin: 10mm; }
      .reception-controls { display: none !important; }
      .reception-sheet { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
      .reception-annex { break-before: page; }
    }`}</style>
    <div className="reception-controls max-w-6xl mx-auto flex justify-between mb-4">
      <button type="button" onClick={onBack} className="btn-precision-outline text-xs"><ArrowLeft size={16} /> Volver a retornos</button>
      <button type="button" onClick={() => window.print()} disabled={!retorno} className="btn-precision-primary text-xs"><Printer size={16} /> Imprimir acta</button>
    </div>
    {!retorno && <p className="reception-controls max-w-6xl mx-auto p-4 bg-amber-50 rounded-xl text-sm">Guarda el retorno antes de imprimir el acta.</p>}
    <article className="reception-sheet max-w-6xl mx-auto bg-white shadow-lg border border-slate-300 p-8 text-[12px]">
      <header className="text-center leading-tight mb-5">
        <h1 className="font-serif italic text-4xl tracking-wide">BM CONSTRUCCIONES</h1>
        <p className="text-sm">DISEÑO, CONSTRUCCIÓN REMODELACIÓN GENERAL, RENTA DE EQUIPOS MENORES DE CONSTRUCCIÓN</p>
        <p>Bismark Murillo Montes · INGENIERO CONTRATISTA</p>
        <p>Revolvedoras · Vibradores · Compactadoras · Generadores de Energía</p>
        <p>Cel.: 8657-9832 · 8522-7626 · 5700-6521 · Correo: bismurillo@hotmail.com.ni</p>
        <p>Dirección: Km. 10.5 carretera a Masaya, 150 mts suroeste de gasolinera UNO · LIC. MTI 6985</p>
      </header>
      <div className="flex justify-between items-end mb-5">
        <span className="w-28" />
        <h2 className="font-black text-xl tracking-wide">ACTA DE RECEPCIÓN DE EQUIPOS</h2>
        <span className="font-bold text-lg">N.º {reference}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-5 text-sm">
        <div><b>Fecha:</b> {showDate(retorno?.fechaDevolucion)}</div><div><b>Hora:</b> {showTime(retorno?.fechaDevolucion)}</div>
        <div><b>Entregado por:</b> {retorno?.entregadoPor || ''}</div><div><b>Recibido por:</b> {retorno?.recibidoPor || ''}</div>
        <div><b>Cédula de identidad:</b> {retorno?.cedulaEntregante || ''}</div><div><b>Contrato N.º:</b> {actualContract?.codigo || ''}</div>
      </div>
      <table className="w-full border-collapse border border-black text-sm">
        <thead className="bg-slate-800 text-white print:bg-white print:text-black"><tr>
          <th className="border border-black p-2 w-14">ÍTEM</th><th className="border border-black p-2 w-16">CANT.</th>
          <th className="border border-black p-2">DESCRIPCIÓN</th><th className="border border-black p-2 w-24">HORAS</th><th className="border border-black p-2 w-28">COMBUSTIBLE</th>
        </tr></thead>
        <tbody>{items.map((item, index) => <tr key={item.id || index}>
          <td className="border border-black p-2 text-center">{index + 1}</td>
          <td className="border border-black p-2 text-center">{item.cantidadRetornada ?? ''}</td>
          <td className="border border-black p-2">{item.equipo?.modelo || ''}{item.numeroSerie ? ` · Serie ${item.numeroSerie}` : ''}</td>
          <td className="border border-black p-2 text-center">{item.horometroFinal ?? ''}</td>
          <td className="border border-black p-2 text-center">{item.combustibleRetorno || ''}</td>
        </tr>)}</tbody>
      </table>
      <div className="border-b border-black min-h-20 py-3 mt-5 text-sm"><b>OBSERVACIONES:</b> {observations}</div>
      <div className="grid grid-cols-2 gap-24 mt-14 text-center text-sm"><div className="border-t border-black pt-2">Entregado por</div><div className="border-t border-black pt-2">Recibido por</div></div>
    </article>
    {items.length > 0 && <article className="reception-annex max-w-6xl mx-auto bg-white border border-slate-300 shadow-lg p-8 mt-5 print:mt-0 text-sm">
      <h2 className="font-black text-lg mb-1">Anexo de inspección · Acta N.º {reference}</h2>
      <p className="text-xs text-slate-600 mb-5">Contrato {actualContract?.codigo || ''} · Cliente {actualContract?.cliente?.nombre || ''}</p>
      {items.map((item, index) => <section key={item.id || index} className="border-t border-slate-400 py-4 break-inside-avoid">
        <h3 className="font-bold">{index + 1}. {item.equipo?.modelo || 'Equipo'} {item.numeroSerie ? `· Serie ${item.numeroSerie}` : ''}</h3>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <p>Funcionamiento: <b>{functionState(item.inspeccionEstado?.funcionamiento)}</b></p>
          <p>Estado físico: <b>{condition(item.inspeccionEstado?.estadoFisico)}</b></p>
          <p>Accesorios: <b>{item.inspeccionEstado?.accesoriosCompletos === undefined ? 'Sin registrar' : item.inspeccionEstado.accesoriosCompletos ? 'Completos' : 'Faltantes'}</b></p>
        </div>
        {item.inspeccionEstado?.observaciones && <p className="mt-2">Observaciones: {item.inspeccionEstado.observaciones}</p>}
        {(item.inspeccionesDanio || []).map((damage: any) => <p key={damage.id} className="mt-1">Daño: {damage.componente} · {damage.tipoDano} · {damage.cobrable ? 'Atribuido al cliente' : 'No cobrable'}</p>)}
        {!!item.inspeccionEstado?.fotosUrls?.length && <div className="mt-2"><b>Evidencia fotográfica:</b>{item.inspeccionEstado.fotosUrls.map((url: string, photoIndex: number) => <p key={photoIndex} className="break-all text-xs">{url}</p>)}</div>}
      </section>)}
    </article>}
  </div>;
};
