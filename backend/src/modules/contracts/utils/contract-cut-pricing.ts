import { rentalCalendarDay } from '../../billing/daily-usage';
import {
  DecimalLike,
  positiveHorasOr,
  toNumberHoras,
} from '../../../common/utils/decimal.util';

type Item = {
  id?: string;
  equipoId: string;
  tipoTarifa?: string | null;
  precioRenta: unknown;
  cantidad: number;
  // Campo histórico: en HORA guarda horas totales pactadas; en DIA, días cotizados.
  // number en memoria; Prisma.Decimal/string al leer de BD (ver decimal.util).
  dias?: DecimalLike;
  horasPactadas?: DecimalLike;
  horasPorDia?: unknown;
};

export type PricedContract = {
  fechaInicio: Date;
  fechaFin: Date;
  items: Item[];
  cotizacion?: { total: unknown; items?: Array<{
    precioUnitario: unknown; cantidad: number; dias?: DecimalLike; horas?: DecimalLike;
    tipoCobro?: string | null;
  }> } | null;
};

export function cutDays(start: Date, end: Date): number {
  return Math.max(0, Math.round((rentalCalendarDay(end) - rentalCalendarDay(start)) / 86400000));
}

export function quotationMultiplier(contract: PricedContract): number | null {
  if (!contract.items?.length) return null;
  const base = contract.cotizacion?.items?.length
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
  if (!Number.isFinite(base) || base <= 0) return null;
  return contract.cotizacion ? Number(contract.cotizacion.total) / base : 1;
}

export function plannedDailyGrossRate(contract: PricedContract): number | null {
  const days = cutDays(contract.fechaInicio, contract.fechaFin);
  const multiplier = quotationMultiplier(contract);
  if (!days || multiplier === null) return null;
  const perDayBase = contract.items.reduce((sum, item) => {
    const units = item.tipoTarifa === 'HORA'
      ? toNumberHoras(item.horasPactadas ?? item.dias) / days : 1;
    return sum + Number(item.precioRenta) * item.cantidad * units;
  }, 0);
  return perDayBase * multiplier;
}

export function plannedHourlyAmount(contract: PricedContract, start: Date, end: Date): number {
  const days = cutDays(contract.fechaInicio, contract.fechaFin);
  const multiplier = quotationMultiplier(contract);
  if (!days || multiplier === null) return 0;
  const startOffset = Math.max(0, Math.min(days, cutDays(contract.fechaInicio, start)));
  const endOffset = Math.max(startOffset, Math.min(days, cutDays(contract.fechaInicio, end)));
  const hourlyBase = contract.items
    .filter((item) => item.tipoTarifa === 'HORA')
    .reduce((sum, item) => sum + Number(item.precioRenta) * item.cantidad * toNumberHoras(item.horasPactadas ?? item.dias), 0);
  // Redondeo acumulado: los cortes cortos y el último suman exactamente el total horario.
  return (Math.round(hourlyBase * multiplier * endOffset / days * 100)
    - Math.round(hourlyBase * multiplier * startOffset / days * 100)) / 100;
}

export function hourlyBreakdown(contract: PricedContract, start: Date, end: Date) {
  const days = cutDays(contract.fechaInicio, contract.fechaFin);
  const cutLength = cutDays(start, end);
  return contract.items.filter((item) => item.tipoTarifa === 'HORA').map((item) => ({
    equipoId: item.equipoId,
    cantidad: item.cantidad,
    tarifaHora: Number(item.precioRenta),
    horasPactadasTotalesPorEquipo: toNumberHoras(item.horasPactadas ?? item.dias),
    horasProyectadasPorEquipo: days ? toNumberHoras(item.horasPactadas ?? item.dias) * cutLength / days : 0,
  }));
}
