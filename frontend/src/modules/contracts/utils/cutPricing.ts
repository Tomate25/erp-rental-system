import type { Contract, ContractItem } from '../../operations/services/operations.api';

export function calendarDays(start: Date, end: Date): number {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((utcEnd - utcStart) / 86400000));
}

export function amountForCumulativeDays(rate: number, previousDays: number, days: number): number {
  return (Math.round((previousDays + days) * rate * 100) - Math.round(previousDays * rate * 100)) / 100;
}

export function getItemUnitsPerDay(
  item: ContractItem,
  days: number,
  horasPorDiaMap?: Record<string, number>,
): number {
  if (item.tipoTarifa !== 'HORA') return 1;
  if (horasPorDiaMap?.[item.id] !== undefined && Number(horasPorDiaMap[item.id]) > 0) {
    return Number(horasPorDiaMap[item.id]);
  }
  if (item.horasPorDia && Number(item.horasPorDia) > 0) {
    return Number(item.horasPorDia);
  }
  if (item.dias && days > 0) {
    return Math.round((Number(item.dias) / days) * 10) / 10;
  }
  return 8; // Jornada estimada por defecto para equipo horario
}

export function dailyGrossRate(
  contract: Pick<Contract, 'items' | 'cotizacion' | 'fechaInicio' | 'fechaFin'>,
  horasPorDiaMap?: Record<string, number>,
): number | null {
  if (!contract.items?.length) return null;
  const days = calendarDays(new Date(contract.fechaInicio), new Date(contract.fechaFin));
  if (days < 1) return null;

  const basePerDay = contract.items.reduce((sum, item) => {
    const unitsPerDay = getItemUnitsPerDay(item, days, horasPorDiaMap);
    return sum + Number(item.precioRenta) * item.cantidad * unitsPerDay;
  }, 0);

  const quotedBase = contract.cotizacion?.items?.length
    ? contract.cotizacion.items.reduce((sum, qItem) => {
        const units = qItem.tipoCobro === 'POR_HORA' ? qItem.horas ?? qItem.dias : qItem.dias;
        return sum + Number(qItem.precioUnitario) * qItem.cantidad * Number(units || 1);
      }, 0)
    : contract.items.reduce(
        (sum, item) => sum + Number(item.precioRenta) * item.cantidad * Number(
          item.tipoTarifa === 'HORA'
            ? (item.horasPorDia ? Number(item.horasPorDia) * days : item.dias || 1)
            : item.dias || 1,
        ),
        0,
      );

  if (!Number.isFinite(basePerDay) || basePerDay <= 0 || quotedBase <= 0) return null;
  return contract.cotizacion ? (basePerDay * Number(contract.cotizacion.total)) / quotedBase : basePerDay;
}

export function rentalCalendarDay(dateInput: string | Date): number {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Managua',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'));
}
