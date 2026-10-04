import { DecimalLike, positiveHorasOr, toNumberHoras } from '../../common/utils/decimal.util';

type RentalItem = { id?: string; equipoId: string; cantidad: number; precioRenta: unknown; dias?: DecimalLike; horasPactadas?: DecimalLike; tipoTarifa?: string | null; equipo?: { descripcion?: string | null; modelo?: string | null } };
type Dispatch = { fechaDespacho: Date; items: Array<{ equipoId: string; cantidad: number }> };
type Return = { fechaDevolucion: Date; items: Array<{ equipoId: string; cantidadRetornada: number }> };

export type DailyRentalContract = {
  fechaInicio?: Date;
  fechaFin?: Date;
  items: RentalItem[];
  cotizacion?: { total: unknown; items?: Array<{ precioUnitario: unknown; cantidad: number; dias?: DecimalLike; horas?: DecimalLike; tipoCobro?: string | null }> } | null;
  despachos: Dispatch[];
  devoluciones: Return[];
};

export function rentalCalendarDay(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'));
}

// La fecha final de cada corte es exclusiva: [inicio, fin).
export function rentalCutUsage(contract: DailyRentalContract, start: Date, end: Date) {
  if (!contract.items?.length) return null;
  const contractDays = contract.fechaInicio && contract.fechaFin
    ? Math.round((rentalCalendarDay(contract.fechaFin) - rentalCalendarDay(contract.fechaInicio)) / 86400000)
    : 0;
  if (contract.items.some(item => item.tipoTarifa === 'HORA') && contractDays < 1) return null;
  const quotedBase = contract.cotizacion?.items?.length
    ? contract.cotizacion.items.reduce((sum, item) => {
        const units = item.tipoCobro === 'POR_HORA' ? item.horas ?? item.dias : item.dias;
        return sum + Number(item.precioUnitario) * item.cantidad * positiveHorasOr(units, 1);
      }, 0)
    : contract.items.reduce(
        (sum, item) => sum + Number(item.precioRenta) * item.cantidad * (
          item.tipoTarifa === 'HORA'
            ? toNumberHoras(item.horasPactadas ?? item.dias, 1)
            : positiveHorasOr(item.dias, 1)
        ), 0,
      );
  if (!Number.isFinite(quotedBase) || quotedBase <= 0) return null;
  const multiplier = contract.cotizacion ? Number(contract.cotizacion.total) / quotedBase : 1;
  const startDay = rentalCalendarDay(start);
  const endDay = rentalCalendarDay(end);
  let total = 0;
  const rawLines: Array<{ item: RentalItem; unidades: number; importe: number }> = [];
  const billedQuantityByEquipmentDay = new Map<string, number>();

  for (const item of contract.items) {
    let unidades = 0;
    let importe = 0;
    const events = new Map<number, number>();
    for (const dispatch of contract.despachos || []) {
      const day = rentalCalendarDay(dispatch.fechaDespacho);
      for (const detail of dispatch.items || []) {
        if (detail.equipoId === item.equipoId) events.set(day, (events.get(day) || 0) + detail.cantidad);
      }
    }
    for (const returned of contract.devoluciones || []) {
      const day = rentalCalendarDay(returned.fechaDevolucion);
      for (const detail of returned.items || []) {
        if (detail.equipoId === item.equipoId) events.set(day, (events.get(day) || 0) - detail.cantidadRetornada);
      }
    }
    let active = 0;
    const sorted = [...events].sort((a, b) => a[0] - b[0]);
    let index = 0;
    for (let day = startDay; day < endDay; day += 86400000) {
      while (index < sorted.length && sorted[index][0] <= day) {
        active += sorted[index][1];
        index++;
      }
      const key = `${item.equipoId}:${day}`;
      const alreadyBilled = billedQuantityByEquipmentDay.get(key) || 0;
      const billableQuantity = Math.min(item.cantidad, Math.max(0, active - alreadyBilled));
      billedQuantityByEquipmentDay.set(key, alreadyBilled + billableQuantity);
      const unitsPerDay = item.tipoTarifa === 'HORA'
        ? toNumberHoras(item.horasPactadas ?? item.dias) / contractDays
        : 1;
      const billedUnits = billableQuantity * unitsPerDay;
      unidades += billedUnits;
      importe += billedUnits * Number(item.precioRenta) * multiplier;
    }
    rawLines.push({ item, unidades, importe });
    total += importe;
  }
  const totalCents = Math.round((total + Number.EPSILON) * 100);
  let assignedCents = 0;
  const lines = rawLines.map((line, index) => {
    const cents = index === rawLines.length - 1
      ? totalCents - assignedCents
      : Math.round((line.importe + Number.EPSILON) * 100);
    assignedCents += cents;
    return {
      equipoId: line.item.equipoId,
      descripcion: line.item.equipo?.descripcion || line.item.equipo?.modelo || line.item.equipoId,
      cantidad: line.item.cantidad,
      unidad: line.item.tipoTarifa === 'HORA' ? 'HORA' : 'DIA',
      unidades: line.unidades,
      tarifa: Number(line.item.precioRenta),
      importe: cents / 100,
    };
  });
  return { total: totalCents / 100, lines };
}

export function actualDailyRentalAmount(contract: DailyRentalContract, start: Date, end: Date): number | null {
  return rentalCutUsage(contract, start, end)?.total ?? null;
}
