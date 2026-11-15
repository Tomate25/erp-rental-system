import { useMemo, useState } from 'react';
import { Printer, RotateCcw, Search, Truck } from 'lucide-react';
import { EmptyState } from '../../../shared/components/EmptyState';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { formatEquipmentFullName } from '../../../shared/utils/equipment-description';

const dateText = (value?: string) => value ? new Date(value).toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const contractId = (record: any) => record.contratoId || record.contrato?.id || '';
const contractCode = (record: any) => record.contrato?.codigo || 'Sin código';
const money = (value: unknown) => `C$ ${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;

function grouped(records: any[]) {
  const map = new Map<string, any[]>();
  for (const record of records) {
    const key = contractId(record) || record.id;
    map.set(key, [...(map.get(key) || []), record]);
  }
  return [...map.entries()].map(([id, trips]) => ({ id, trips: trips.sort((a, b) => new Date(b.fechaDespacho || b.fechaDevolucion).getTime() - new Date(a.fechaDespacho || a.fechaDevolucion).getTime()) }));
}

function EquipmentSummary({ items, mode }: { items?: any[]; mode: 'dispatch' | 'return' }) {
  if (!items?.length) return <span className="text-xs text-precision-neutral">Sin detalle de equipos</span>;
  return <div className="flex flex-wrap gap-1">
    {items.map((item, index) => <span key={item.id || index} className="rounded-full bg-precision-neutral-light px-2 py-0.5 text-xs text-precision-secondary">
      {formatEquipmentFullName(item.equipo, { includeCode: true })} · {item.numeroSerie || `${mode === 'dispatch' ? item.cantidad : item.cantidadRetornada} u.`}
      {(item.equipo?.tieneHorometro || Number(item.horometroInicial || item.horometroFinal) > 0) && <span className="ml-1 text-precision-neutral">· {mode === 'dispatch' ? item.horometroInicial : item.horometroFinal} h</span>}
    </span>)}
  </div>;
}

export function DispatchHistory({ despachos, pendingUnitsByContract, openingRetornoId, onOpenRetorno, onPrint }: {
  despachos: any[]; pendingUnitsByContract: Map<string, number>; openingRetornoId: string | null;
  onOpenRetorno: (id: string) => void; onPrint: (despacho: any) => void;
}) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => grouped(despachos).filter(({ trips }) => {
    const haystack = trips.map(d => `${d.codigo || d.actaEntregaData?.folio || ''} ${contractCode(d)} ${d.contrato?.cliente?.nombre || ''} ${d.operadorNombre || ''} ${d.vehiculoEnvio || ''}`).join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [despachos, query]);
  return <div className="space-y-3">
    <label className="relative block max-w-sm"><Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-precision-neutral" />
      <input aria-label="Buscar despachos" placeholder="Buscar contrato, cliente u operador" value={query} onChange={e => setQuery(e.target.value)} className="precision-input w-full pl-9 text-sm" />
    </label>
    {!groups.length ? <EmptyState icon={Truck} title={query ? 'Sin despachos para esta búsqueda' : 'No hay despachos registrados'} tone="neutral" /> :
      groups.map(({ id, trips }) => {
        const latest = trips[0];
        const pending = pendingUnitsByContract.get(id) || 0;
        return <details key={id} open className="rounded-2xl border border-precision-neutral-border bg-white">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4 text-sm font-semibold text-precision-neutral-dark">
            <span>{contractCode(latest)} · {latest.contrato?.cliente?.nombre || 'Cliente'} <span className="ml-2 text-xs text-precision-neutral">({trips.length} viaje(s))</span></span>
            <StatusBadge tone={pending ? 'tertiary' : 'success'}>{pending ? `${pending} u. en obra` : 'Retornado'}</StatusBadge>
          </summary>
          <div className="border-t border-precision-neutral-border px-4 pb-4">
            {pending > 0 && <button type="button" disabled={openingRetornoId === id} onClick={() => onOpenRetorno(id)} className="btn-precision-outline my-3 inline-flex items-center gap-1 text-xs"><RotateCcw className="h-4 w-4" />{openingRetornoId === id ? 'Cargando…' : 'Registrar retorno'}</button>}
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-precision-neutral"><tr><th className="py-2 font-medium">Folio / Acta</th><th className="py-2 font-medium">Fecha</th><th className="font-medium">Operador / vehículo</th><th className="font-medium">Equipos</th><th className="text-right font-medium">Acciones</th></tr></thead>
              <tbody className="divide-y divide-precision-neutral-border">{trips.map(d => <tr key={d.id}>
                <td className="py-2 pr-3 font-mono font-semibold text-slate-700 whitespace-nowrap">{d.codigo || d.actaEntregaData?.folio || '—'}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{dateText(d.fechaDespacho)}</td>
                <td className="pr-3">{d.operadorNombre || '—'}<span className="block text-precision-neutral">{d.vehiculoEnvio || '—'}</span></td>
                <td className="pr-3"><EquipmentSummary items={d.items} mode="dispatch" /></td>
                <td className="text-right"><button type="button" onClick={() => onPrint(d)} className="btn-precision-outline inline-flex items-center gap-1 text-xs"><Printer className="h-3.5 w-3.5" />Acta</button></td>
              </tr>)}</tbody>
            </table></div>
          </div>
        </details>;
      })}
  </div>;
}

export function ReturnHistory({ retornos, canManageSettlements, processingLiquidationId, onPrint, onApprove, onCreditDestination }: {
  retornos: any[]; canManageSettlements: boolean; processingLiquidationId: string | null;
  onPrint: (retorno: any) => void; onApprove: (id: string) => void; onCreditDestination: (id: string, destination: 'REEMBOLSO' | 'SALDO_FAVOR') => void;
}) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => grouped(retornos).filter(({ trips }) =>
    trips.some(r => `${r.codigo || r.actaRetornoData?.folio || ''} ${contractCode(r)} ${r.contrato?.cliente?.nombre || ''} ${r.recibidoPor || ''}`.toLowerCase().includes(query.toLowerCase()))
  ), [retornos, query]);
  return <div className="space-y-3">
    <label className="relative block max-w-sm"><Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-precision-neutral" />
      <input aria-label="Buscar retornos" placeholder="Buscar contrato, cliente o receptor" value={query} onChange={e => setQuery(e.target.value)} className="precision-input w-full pl-9 text-sm" />
    </label>
    {!groups.length ? <EmptyState icon={RotateCcw} title={query ? 'Sin retornos para esta búsqueda' : 'No hay retornos registrados'} tone="neutral" /> :
      groups.map(({ id, trips }) => <details key={id} open className="rounded-2xl border border-precision-neutral-border bg-white">
        <summary className="cursor-pointer p-4 text-sm font-semibold text-precision-neutral-dark">{contractCode(trips[0])} · {trips[0].contrato?.cliente?.nombre || 'Cliente'} <span className="text-xs text-precision-neutral">({trips.length} retorno(s))</span></summary>
        <div className="overflow-x-auto border-t border-precision-neutral-border px-4 pb-4">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="text-precision-neutral"><tr><th className="py-2 font-medium">Folio / Acta</th><th className="py-2 font-medium">Fecha</th><th className="font-medium">Recibido por</th><th className="font-medium">Equipos</th><th className="font-medium">Liquidación</th><th className="text-right font-medium">Acciones</th></tr></thead>
            <tbody className="divide-y divide-precision-neutral-border">{trips.map(r => {
              const settlement = r.liquidacionRetorno;
              return <tr key={r.id}>
                <td className="py-3 pr-3 font-mono font-semibold text-slate-700 whitespace-nowrap">{r.codigo || r.actaRetornoData?.folio || '—'}</td>
                <td className="py-3 pr-3 whitespace-nowrap">{dateText(r.fechaDevolucion)}</td>
                <td className="pr-3">{r.recibidoPor || '—'}</td>
                <td className="pr-3"><EquipmentSummary items={r.items} mode="return" /></td>
                <td className="pr-3">{settlement ? <div className="space-y-1"><StatusBadge tone={settlement.estado === 'APROBADA' ? 'success' : 'warning'}>{settlement.estado === 'PENDIENTE_APROBACION' ? 'Pendiente de aprobación' : settlement.estado === 'APROBADA' ? 'Aprobada' : settlement.estado}</StatusBadge><p>{settlement.diasCobrados} de {settlement.diasPactados} días · {money(settlement.montoDevengado)}</p></div> : '—'}</td>
                <td className="space-x-1 py-2 text-right">
                  <button type="button" onClick={() => onPrint(r)} className="btn-precision-outline text-xs">Acta</button>
                  {canManageSettlements && r.actaRetornoData?.tipoRetorno === 'TOTAL' && settlement?.estado === 'PENDIENTE_APROBACION' && <button type="button" disabled={processingLiquidationId === r.id} onClick={() => onApprove(r.id)} className="btn-precision-primary text-xs">Aprobar</button>}
                  {canManageSettlements && settlement?.estado === 'APROBADA' && Number(settlement.creditoCliente) > 0 && <>
                    <button type="button" disabled={processingLiquidationId === r.id} onClick={() => onCreditDestination(r.id, 'REEMBOLSO')} className="btn-precision-outline text-xs">Reembolso</button>
                    <button type="button" disabled={processingLiquidationId === r.id} onClick={() => onCreditDestination(r.id, 'SALDO_FAVOR')} className="btn-precision-outline text-xs">Saldo a favor</button>
                  </>}
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </details>)}
  </div>;
}
