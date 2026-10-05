import type { Contract } from '../services/operations.api';
import { dailyGrossRate, rentalCalendarDay } from '../../contracts/utils/cutPricing';

export type ReturnClassification = 'ANTICIPADO' | 'EN_FECHA' | 'TARDIO';

export interface ReturnTimingSummary {
  contractedDays: number;
  effectiveDays: number;
  differenceDays: number;
  classification: ReturnClassification;
  dailyRate: number;
  contractedAmount: number;
  accruedAmount: number;
  unearnedDifference: number;
}

export function calculateReturnTiming(
  contract: Pick<Contract, 'fechaInicio' | 'fechaFin' | 'items' | 'cotizacion'> & { fechaFinPactada?: string | null },
  physicalReceipt: string | Date,
): ReturnTimingSummary {
  const start = new Date(contract.fechaInicio);
  const plannedEnd = new Date(contract.fechaFinPactada || contract.fechaFin);
  const receipt = typeof physicalReceipt === 'string' ? new Date(physicalReceipt) : physicalReceipt;
  const startDay = rentalCalendarDay(start);
  const plannedEndDay = rentalCalendarDay(plannedEnd);
  const receiptDay = rentalCalendarDay(receipt);
  const toDays = (milliseconds: number) => Math.max(0, Math.round(milliseconds / 86400000));
  const contractedDays = toDays(plannedEndDay - startDay);
  // Política aprobada: el cobro cesa con la recepción física y no incluye ese día.
  const effectiveDays = toDays(receiptDay - startDay);
  const classification: ReturnClassification = receiptDay < plannedEndDay
    ? 'ANTICIPADO'
    : receiptDay > plannedEndDay
      ? 'TARDIO'
      : 'EN_FECHA';
  const differenceDays = classification === 'ANTICIPADO'
    ? toDays(plannedEndDay - receiptDay)
    : classification === 'TARDIO'
      ? toDays(receiptDay - plannedEndDay)
      : 0;
  const dailyRate = dailyGrossRate(contract) ?? 0;
  const contractedAmount = Math.round(dailyRate * contractedDays * 100) / 100;
  const accruedAmount = Math.round(dailyRate * effectiveDays * 100) / 100;

  return {
    contractedDays,
    effectiveDays,
    differenceDays,
    classification,
    dailyRate,
    contractedAmount,
    accruedAmount,
    unearnedDifference: Math.max(0, Math.round((contractedAmount - accruedAmount) * 100) / 100),
  };
}

export function returnClassificationLabel(summary: ReturnTimingSummary): string {
  if (summary.classification === 'ANTICIPADO') return `Retorno anticipado · ${summary.differenceDays} día(s) antes`;
  if (summary.classification === 'TARDIO') return `Retorno tardío · ${summary.differenceDays} día(s) después`;
  return 'Retorno en fecha pactada';
}
