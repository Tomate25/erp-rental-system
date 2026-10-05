import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { calculateReturnTiming, returnClassificationLabel } from '../utils/returnTiming';

interface Props {
  retorno?: any;
  contrato?: any;
  onBack: () => void;
}

const showDate = (value?: string) =>
  value ? new Intl.DateTimeFormat('es-NI', { timeZone: 'America/Managua', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '';

const showTime = (value?: string) =>
  value ? new Intl.DateTimeFormat('es-NI', { timeZone: 'America/Managua', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(value)) : '';

const money = (value: unknown) =>
  `C$ ${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const settlementMoney = (settlement: any, field: string) => {
  if (settlement && settlement[field] !== undefined && settlement[field] !== null) {
    return money(settlement[field]);
  }
  return 'Pendiente de cálculo oficial';
};

const condition = (value?: string) => ({ BUENO: 'Buen estado', DESGASTE_NORMAL: 'Desgaste normal', DANADO: 'Dañado' }[value || ''] || 'Sin registrar');
const functionState = (value?: string) => ({ FUNCIONA: 'Funciona', NO_FUNCIONA: 'No funciona', NO_VERIFICADO: 'No verificado' }[value || ''] || 'Sin registrar');

const destinationLabel = (item: any) => {
  const requiresMaintenance = item.daniosDetectados ||
    (item.inspeccionesDanio || []).length > 0 ||
    item.inspeccionEstado?.estadoFisico === 'DANADO' ||
    item.inspeccionEstado?.funcionamiento === 'NO_FUNCIONA';
  const dest = item.cantidadPerdida ? 'FUERA_DE_SERVICIO' : requiresMaintenance ? 'MANTENIMIENTO' : 'DISPONIBLE';
  switch (dest) {
    case 'DISPONIBLE': return 'Disponible';
    case 'MANTENIMIENTO': return 'Taller / Mant.';
    case 'FUERA_DE_SERVICIO': return 'Baja / Pérdida';
    default: return dest;
  }
};

export const ActaRecepcionPrintView: React.FC<Props> = ({ retorno, contrato, onBack }) => {
  const actualContract = retorno?.contrato || contrato;
  const items: any[] = retorno?.items || [];
  const reference = retorno?.codigo || retorno?.id?.slice(0, 8).toUpperCase() || '';
  const receiptDate = retorno?.fechaDevolucion || retorno?.createdAt || new Date().toISOString();
  const fallback = actualContract ? calculateReturnTiming(actualContract, receiptDate) : null;
  const settlement = retorno?.liquidacionRetorno || retorno?.liquidacionCierre || retorno?.liquidacion;
  const daysContracted = settlement?.diasPactados ?? fallback?.contractedDays ?? 0;
  const daysCharged = settlement?.diasCobrados ?? fallback?.effectiveDays ?? 0;
  const daysEarly = settlement?.diasAnticipados ?? (fallback?.classification === 'ANTICIPADO' ? fallback.differenceDays : 0);
  const isEarly = Boolean(retorno?.esRetornoAnticipado ?? daysEarly > 0);
  const actaMeta = retorno?.actaRetornoData || {};
  const observations = items.flatMap((item) => [item.inspeccionEstado?.observaciones, item.descripcionDanios].filter(Boolean)).join(' · ');

  return (
    <div className="min-h-screen bg-slate-100 p-5 print:bg-white print:p-0 text-slate-900">
      <style>{`@media print {@page {size:letter landscape;margin:10mm}.reception-controls{display:none!important}.reception-sheet{box-shadow:none!important;border:0!important;padding:0!important}.reception-annex{break-before:page}}`}</style>

      <div className="reception-controls max-w-6xl mx-auto flex justify-between mb-4">
        <button type="button" onClick={onBack} className="btn-precision-outline text-xs">
          <ArrowLeft size={16} /> Volver a retornos
        </button>
        <button type="button" onClick={() => window.print()} disabled={!retorno} className="btn-precision-primary text-xs">
          <Printer size={16} /> Imprimir acta
        </button>
      </div>

      {!retorno && (
        <p className="reception-controls max-w-6xl mx-auto p-4 bg-amber-50 rounded-xl text-sm mb-4">
          Guarda el retorno antes de imprimir el acta oficial definitiva.
        </p>
      )}

      {/* Hoja Principal: Acta de Retorno y Recepción */}
      <article className="reception-sheet max-w-6xl mx-auto bg-white shadow-lg border border-slate-300 p-8 text-[12px]">
        <header className="text-center leading-tight mb-4">
          <h1 className="font-serif italic text-4xl tracking-wide">BM CONSTRUCCIONES</h1>
          <p className="text-sm">DISEÑO, CONSTRUCCIÓN REMODELACIÓN GENERAL, RENTA DE EQUIPOS MENORES DE CONSTRUCCIÓN</p>
          <p>Bismark Murillo Montes · INGENIERO CONTRATISTA</p>
          <p>Cel.: 8657-9832 · 8522-7626 · 5700-6521 · Correo: bismurillo@hotmail.com.ni</p>
        </header>

        <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-2">
          <span className={`px-2 py-1 border font-black text-xs ${isEarly ? 'border-emerald-700 text-emerald-800 bg-emerald-50' : 'border-slate-500'}`}>
            {isEarly ? `RETORNO ANTICIPADO · ${daysEarly} DÍA(S) ANTES` : fallback ? returnClassificationLabel(fallback).toUpperCase() : 'RETORNO CONTRATUAL'}
          </span>
          <h2 className="font-black text-xl tracking-wide">ACTA DE RETORNO Y RECEPCIÓN FÍSICA</h2>
          <span className="font-bold text-lg font-mono">N.º {reference}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 text-sm">
          <div><b>Recepción física:</b> {showDate(receiptDate)} {showTime(receiptDate) ? `· ${showTime(receiptDate)}` : ''}</div>
          <div><b>Contrato N.º:</b> {actualContract?.codigo || 'N/A'}</div>
          <div><b>Cliente / Razón Social:</b> {actualContract?.cliente?.nombre || actualContract?.cliente?.razonSocial || 'N/A'}</div>
          <div><b>Cédula / RUC Arrendatario:</b> {actualContract?.cliente?.rfc || actualContract?.cliente?.cedula || 'N/A'}</div>
          <div><b>Entregado por:</b> {retorno?.entregadoPor || actualContract?.cliente?.nombre || ''}</div>
          <div><b>Recibido por (Almacén BM):</b> {retorno?.recibidoPor || ''}</div>
          <div><b>Cédula quien entrega:</b> {retorno?.cedulaEntregante || 'N/A'}</div>
          <div><b>Motivo del retorno:</b> {actaMeta?.motivoRetorno || (isEarly ? 'Finalización anticipada de trabajos' : 'Vencimiento natural de contrato')}</div>
        </div>

        {/* Comparativa de Vigencia y Días Contratados / Usados / Anticipados */}
        <div className="grid grid-cols-6 border border-black mb-4 text-center text-xs">
          <div className="p-2 border-r border-black">
            <b className="block uppercase text-[10px] text-slate-600">Inicio pactado</b>
            <span>{showDate(settlement?.fechaInicioCobro || actualContract?.fechaInicio)}</span>
          </div>
          <div className="p-2 border-r border-black">
            <b className="block uppercase text-[10px] text-slate-600">Retorno previsto</b>
            <span>{showDate(settlement?.fechaFinPactada || actualContract?.fechaFinPactada || actualContract?.fechaFin)}</span>
          </div>
          <div className="p-2 border-r border-black">
            <b className="block uppercase text-[10px] text-slate-600">Retorno real</b>
            <span>{showDate(receiptDate)}</span>
          </div>
          <div className="p-2 border-r border-black">
            <b className="block uppercase text-[10px] text-slate-600">Días pactados</b>
            <b>{daysContracted} día(s)</b>
          </div>
          <div className="p-2 border-r border-black">
            <b className="block uppercase text-[10px] text-slate-600">Días cobrados</b>
            <b>{daysCharged} día(s)</b>
          </div>
          <div className="p-2">
            <b className="block uppercase text-[10px] text-slate-600">Días anticipados</b>
            <b className={daysEarly > 0 ? 'text-emerald-700' : ''}>{daysEarly > 0 ? `${daysEarly} día(s)` : '0 (A fecha)'}</b>
          </div>
        </div>

        {/* Rejilla de Equipos Retornados con Horómetros, Combustible y Destino */}
        <table className="w-full border-collapse border border-black text-xs">
          <thead className="bg-slate-800 text-white print:bg-white print:text-black">
            <tr>
              <th className="border border-black p-2 w-12 text-center">ÍTEM</th>
              <th className="border border-black p-2 w-14 text-center">CANT.</th>
              <th className="border border-black p-2 text-left">DESCRIPCIÓN Y SERIE</th>
              <th className="border border-black p-2 w-24 text-center">HORÓMETRO INICIAL</th>
              <th className="border border-black p-2 w-24 text-center">HORÓMETRO FINAL</th>
              <th className="border border-black p-2 w-20 text-center">USO (HRS)</th>
              <th className="border border-black p-2 w-24 text-center">COMBUSTIBLE</th>
              <th className="border border-black p-2 w-28 text-center">DESTINO EQUIPO</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const contractItem = actualContract?.items?.find((candidate: any) => candidate.equipoId === item.equipoId);
              const initial = item.horometroInicial ?? contractItem?.horometroInicial ?? Math.max(0, Number(item.horometroFinal || 0) - Number(item.horasCalculadas || item.horasTrabajadas || 0));
              const usage = item.horasTrabajadas ?? item.horasCalculadas ?? (item.horometroFinal !== undefined && item.horometroFinal !== '' ? Math.max(0, Number(item.horometroFinal) - Number(initial)) : 'N/A');
              return (
                <tr key={item.id || index}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2 text-center">{item.cantidadRetornada ?? 1}</td>
                  <td className="border border-black p-2">
                    <span className="font-bold">{item.equipo?.modelo || item.nombreEquipo || 'Equipo menor'}</span>
                    {item.numeroSerie ? <span className="block text-[11px] text-slate-600">S/N: {item.numeroSerie}</span> : ''}
                  </td>
                  <td className="border border-black p-2 text-center font-mono">{initial !== undefined ? `${Number(initial).toFixed(1)} hrs` : 'N/A'}</td>
                  <td className="border border-black p-2 text-center font-mono">{item.horometroFinal !== undefined && item.horometroFinal !== '' ? `${Number(item.horometroFinal).toFixed(1)} hrs` : 'N/A'}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold">{typeof usage === 'number' ? `+${usage.toFixed(1)} hrs` : usage}</td>
                  <td className="border border-black p-2 text-center">{item.combustibleRetorno || 'N/A'}</td>
                  <td className="border border-black p-2 text-center font-bold text-[11px]">{destinationLabel(item)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Observaciones */}
        <div className="border-b border-black min-h-12 py-2 mt-3 text-xs">
          <b>OBSERVACIONES:</b> {observations || 'Sin daños evidentes al momento de la entrega física. Equipos recibidos sujetos a revisión técnica en almacén.'}
        </div>

        {/* Constancia operativa de recepción */}
        <div className="mt-3 p-2 border border-black text-[10px] text-slate-700 leading-tight">
          <b>Constancia de recepción:</b> La firma de esta acta acredita la fecha y hora de entrega material del equipo a BM CONSTRUCCIONES. La liquidación económica, los daños, cualquier saldo y los documentos fiscales se determinan por separado conforme al contrato, la inspección técnica y la aprobación administrativa correspondiente.
        </div>

        {/* Bloque de Firmas Autorizadas */}
        <div className="grid grid-cols-2 gap-24 mt-10 text-center text-xs">
          <div>
            <div className="border-t border-black pt-2 font-bold uppercase">Entregado por (Cliente / Delegado)</div>
            <div className="text-slate-700">{retorno?.entregadoPor || actualContract?.cliente?.nombre || 'Nombre de quien entrega'}</div>
            {retorno?.cedulaEntregante && <div className="text-[11px] text-slate-500">Cédula: {retorno.cedulaEntregante}</div>}
          </div>
          <div>
            <div className="border-t border-black pt-2 font-bold uppercase">Recibido por (BM Construcciones)</div>
            <div className="text-slate-700">{retorno?.recibidoPor || 'Responsable de Almacén'}</div>
            <div className="text-[11px] text-slate-500">Control de Equipos y Maquinaria</div>
          </div>
        </div>
      </article>

      {/* Hoja Anexa: Inspección Técnica y Liquidación Económica Preliminar */}
      {items.length > 0 && (
        <article className="reception-annex max-w-6xl mx-auto bg-white border border-slate-300 shadow-lg p-8 mt-5 print:mt-0 text-sm">
          <header className="border-b-2 border-black pb-3 mb-4">
            <h2 className="font-black text-lg uppercase tracking-wide">Anexo Técnico de Inspección y Liquidación Preliminar</h2>
            <p className="text-xs text-slate-600">Acta de Retorno N.º {reference} · Contrato {actualContract?.codigo || ''} · Cliente: {actualContract?.cliente?.nombre || ''}</p>
          </header>

          {/* Checklist de Inspección por Equipo */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">1. Inspección Técnica y Estado Físico</h3>
            {items.map((item, index) => {
              const damages = item.inspeccionesDanio || item.danios || [];
              return (
                <div key={item.id || index} className="border border-slate-300 rounded-lg p-3 break-inside-avoid bg-slate-50/50">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                    <h4 className="font-bold text-xs uppercase">{index + 1}. {item.equipo?.modelo || item.nombreEquipo || 'Equipo'} {item.numeroSerie ? `· S/N: ${item.numeroSerie}` : ''}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 font-bold">Destino: {destinationLabel(item)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-slate-500 block text-[10px] uppercase font-bold">Funcionamiento</span><b>{functionState(item.inspeccionEstado?.funcionamiento)}</b></div>
                    <div><span className="text-slate-500 block text-[10px] uppercase font-bold">Estado físico</span><b>{condition(item.inspeccionEstado?.estadoFisico)}</b></div>
                    <div><span className="text-slate-500 block text-[10px] uppercase font-bold">Accesorios</span><b>{item.inspeccionEstado?.accesoriosCompletos ? 'Completos' : item.inspeccionEstado?.accesoriosCompletos === false ? 'Faltantes' : 'Sin registrar'}</b></div>
                    <div><span className="text-slate-500 block text-[10px] uppercase font-bold">Combustible</span><b>{item.combustibleRetorno || 'N/A'}</b></div>
                  </div>
                  {item.inspeccionEstado?.observaciones && (
                    <p className="mt-2 text-xs text-slate-700 bg-white p-2 border rounded"><b>Observaciones:</b> {item.inspeccionEstado.observaciones}</p>
                  )}
                  {damages.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <b className="text-[11px] text-amber-800 block">Detalle de Averías o Daños Reportados:</b>
                      {damages.map((damage: any, dIdx: number) => (
                        <div key={damage.id || dIdx} className="text-xs bg-amber-50 border border-amber-200 rounded p-1.5 flex justify-between">
                          <span><b>{damage.componente}:</b> {damage.tipoDano} ({damage.severidad || 'MEDIA'})</span>
                          <span className="font-bold">{damage.cobrable ? 'Atribuido al cliente' : 'Mantenimiento interno BM'} {damage.costoEstimado ? `· Est. ${money(damage.costoEstimado)}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Liquidación oficial del servidor */}
          <section className="border-t-2 border-black pt-4 mt-6 break-inside-avoid">
            <h3 className="font-black text-xs uppercase mb-3 text-slate-800 tracking-wider">2. Liquidación contractual · Requiere aprobación manual</h3>
            <div className="grid grid-cols-4 border border-black text-center text-xs">
              <div className="p-3 border-r border-black">
                <span className="block text-[10px] text-slate-600 uppercase font-bold">Monto pactado total</span>
                <b className="text-sm">{settlementMoney(settlement, 'montoPactado')}</b>
              </div>
              <div className="p-3 border-r border-black">
                <span className="block text-[10px] text-slate-600 uppercase font-bold">Monto devengado real</span>
                <b className="text-sm">{settlementMoney(settlement, 'montoDevengado')}</b>
              </div>
              <div className="p-3 border-r border-black">
                <span className="block text-[10px] text-slate-600 uppercase font-bold">Monto facturado</span>
                <b className="text-sm">{settlementMoney(settlement, 'montoFacturado')}</b>
              </div>
              <div className="p-3">
                <span className="block text-[10px] text-slate-600 uppercase font-bold">Saldo a favor cliente</span>
                <b className="text-sm text-emerald-800">{settlementMoney(settlement, 'creditoCliente')}</b>
              </div>
            </div>

            <div className="mt-3 p-3 bg-slate-50 border rounded-lg text-xs space-y-1 text-slate-700">
              <p><b>Política contractual aprobada:</b> Cobro por tiempo efectivo a tarifa pactada ({fallback?.dailyRate ? money(fallback.dailyRate) : 'N/D'} / día). El día en que se efectúa la recepción física no genera cobro de renta diaria; el cobro cesa formalmente a la fecha y hora de entrega material.</p>
              <p><b>Documento fiscal:</b> La nota de crédito se tramita de forma independiente y no decide por sí misma entre reembolso o saldo a favor del cliente.</p>
              <p className="font-bold text-slate-900 pt-1">
                Estado administrativo: <span className="uppercase text-emerald-700">{settlement?.estado || (isEarly ? 'PENDIENTE DE CÁLCULO OFICIAL' : 'SIN LIQUIDACIÓN ANTICIPADA')}</span>
              </p>
            </div>
          </section>

          {/* Firmas de Conformidad del Anexo */}
          <div className="grid grid-cols-2 gap-24 mt-12 text-center text-xs break-inside-avoid">
            <div className="border-t border-black pt-2 font-bold uppercase">Conformidad del Cliente / Delegado</div>
            <div className="border-t border-black pt-2 font-bold uppercase">Vo.Bo. Administración / Operaciones BM</div>
          </div>
        </article>
      )}
    </div>
  );
};
