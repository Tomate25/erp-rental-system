import React, { useState, useMemo } from 'react';
import type { Contract, HorasPorDiaItem } from '../../operations/services/operations.api';
import { openContract } from '../../operations/services/operations.api';
import {
  X,
  Calendar,
  Key,
  AlertCircle,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Info,
  Lock,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import {
  amountForCumulativeDays,
  calendarDays,
  dailyGrossRate,
} from '../utils/cutPricing';
import { isContractContado } from '../utils/contractCondition';
import { serverErrorMessage } from '../../../shared/utils/errors';

interface ContractOpenModalProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: () => void;
}

// Helpers para manejo preciso de fechas en formato ISO YYYY-MM-DD
const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addMonthsToStr = (baseDateStr: string, months: number): string => {
  try {
    const d = new Date(baseDateStr + 'T12:00:00');
    d.setMonth(d.getMonth() + months);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return baseDateStr;
  }
};

export const ContractOpenModal: React.FC<ContractOpenModalProps> = ({
  contract,
  onClose,
  onSuccess,
}) => {
  const todayStr = useMemo(() => getTodayStr(), []);
  const fechaInicioCotizada = contract.cotizacion?.fechaInicioRenta?.slice(0, 10);
  const fechaFinCotizada = contract.cotizacion?.fechaFinRenta?.slice(0, 10);
  const fechasCotizadas = Boolean(fechaInicioCotizada && fechaFinCotizada);

  // Condición de Pago: CONTADO vs CREDITO (heredada de la cotización por defecto)
  const initialIsContado = useMemo(() => isContractContado(contract), [contract]);
  const hasQuotedCondition = Boolean(contract.cotizacion || contract.cotizacionId);
  const isConditionLocked = hasQuotedCondition;
  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>(
    initialIsContado ? 'CONTADO' : 'CREDITO',
  );
  const isContado = isConditionLocked ? initialIsContado : condicionPago === 'CONTADO';

  // 1. Fechas de vigencia
  const [fechaInicio, setFechaInicio] = useState<string>(fechaInicioCotizada || todayStr);

  const [fechaFin, setFechaFin] = useState<string>(() => {
    if (fechaFinCotizada) return fechaFinCotizada;
    if (contract.fechaFin) {
      const origFin = contract.fechaFin.split('T')[0];
      if (origFin > todayStr) return origFin;
    }
    return addMonthsToStr(todayStr, 1);
  });

  // 2. Depósito de garantía
  const quotedDeposito = useMemo(() => {
    return Number(contract.cotizacion?.depositoGarantia || 0);
  }, [contract.cotizacion]);

  const initialDeposito = useMemo(() => {
    if (contract.depositoGarantia !== undefined && contract.depositoGarantia !== null && Number(contract.depositoGarantia) > 0) {
      return Number(contract.depositoGarantia);
    }
    return quotedDeposito;
  }, [contract.depositoGarantia, quotedDeposito]);

  const [depositoGarantiaInput, setDepositoGarantiaInput] = useState<string>(
    initialDeposito > 0 ? String(initialDeposito) : '0'
  );

  // 3. Frecuencia de corte para crédito (para contado es corte único)
  const [periodoDiasInput, setPeriodoDiasInput] = useState<string>('10');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duración total en días
  const diffDiasTotal = useMemo(() => {
    return calendarDays(new Date(fechaInicio), new Date(fechaFin));
  }, [fechaInicio, fechaFin]);

  // Período numérico para crédito
  const periodoDias = useMemo(() => {
    if (isContado) return diffDiasTotal;
    const n = parseInt(periodoDiasInput, 10);
    return isNaN(n) || n < 1 ? 10 : n;
  }, [isContado, diffDiasTotal, periodoDiasInput]);

  // Cantidad de cortes proyectados
  const cantidadCortes = useMemo(() => {
    if (isContado) return 1;
    if (diffDiasTotal <= 0 || periodoDias <= 0) return 1;
    return Math.ceil(diffDiasTotal / periodoDias);
  }, [isContado, diffDiasTotal, periodoDias]);

  // Horas por día para ítems por hora
  const [horasPorDiaMap, setHorasPorDiaMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    (contract.items || []).forEach((it) => {
      if (it.tipoTarifa === 'HORA') {
        map[it.id] = Number(it.horasPorDia || 8);
      }
    });
    return map;
  });

  const handleHorasChange = (itemId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setHorasPorDiaMap((prev) => ({ ...prev, [itemId]: val }));
  };

  // Cálculo de tarifa diaria proyectada
  const pricedContract = useMemo(() => {
    const items = (contract.items || []).map((it) => {
      if (it.tipoTarifa === 'HORA') {
        const hpd = Number(horasPorDiaMap[it.id] || 8);
        return {
          ...it,
          horasPorDia: hpd,
          horasPactadas: hpd * diffDiasTotal,
        };
      }
      return { ...it, dias: diffDiasTotal };
    });
    return {
      ...contract,
      items,
      fechaInicio: new Date(`${fechaInicio}T12:00:00.000Z`),
      fechaFin: new Date(`${fechaFin}T12:00:00.000Z`),
    };
  }, [contract, horasPorDiaMap, diffDiasTotal, fechaInicio, fechaFin]);

  const dailyRate = useMemo(() => {
    try {
      return dailyGrossRate(pricedContract as any);
    } catch {
      return null;
    }
  }, [pricedContract]);

  const duracionCotizadaDias = useMemo(() => {
    if (!fechaInicioCotizada || !fechaFinCotizada) return 0;
    return calendarDays(new Date(fechaInicioCotizada), new Date(fechaFinCotizada));
  }, [fechaInicioCotizada, fechaFinCotizada]);

  // Monto total del contrato proyectado
  const totalAmount = useMemo(() => {
    if (contract.cotizacion?.total && (fechasCotizadas || diffDiasTotal === duracionCotizadaDias)) {
      return Number(contract.cotizacion.total);
    }
    if (dailyRate && diffDiasTotal > 0) {
      return Math.round(dailyRate * diffDiasTotal * 100) / 100;
    }
    if (contract.cotizacion?.total) {
      return Number(contract.cotizacion.total);
    }
    return 0;
  }, [contract.cotizacion, fechasCotizadas, diffDiasTotal, duracionCotizadaDias, dailyRate]);

  // Proyección de cortes
  const projectedCortes = useMemo(() => {
    if (diffDiasTotal <= 0 || totalAmount <= 0) return [];
    if (isContado) {
      const dStart = new Date(`${fechaInicio}T12:00:00`);
      const dEnd = new Date(`${fechaFin}T12:00:00`);
      return [
        {
          numero: 1,
          inicio: dStart,
          fin: dEnd,
          dias: diffDiasTotal,
          monto: totalAmount,
          resumenItems: `${contract.items?.length || 0} equipos · Período completo de contado`,
        },
      ];
    }

    const list: Array<{
      numero: number;
      inicio: Date;
      fin: Date;
      dias: number;
      monto: number;
      resumenItems?: string;
    }> = [];

    let currentDayOffset = 0;
    const baseDate = new Date(`${fechaInicio}T12:00:00`);
    const effectiveRate = dailyRate ?? (diffDiasTotal > 0 ? totalAmount / diffDiasTotal : 0);

    for (let i = 1; i <= cantidadCortes; i++) {
      const diasEsteCorte = Math.min(periodoDias, diffDiasTotal - currentDayOffset);
      if (diasEsteCorte <= 0) break;

      const dStart = new Date(baseDate.getTime() + currentDayOffset * 86400000);
      const dEnd = new Date(dStart.getTime() + diasEsteCorte * 86400000);

      const montoCorte = amountForCumulativeDays(
        effectiveRate,
        currentDayOffset,
        diasEsteCorte,
      );

      list.push({
        numero: i,
        inicio: dStart,
        fin: dEnd,
        dias: diasEsteCorte,
        monto: montoCorte,
        resumenItems: `${contract.items?.length || 0} equipos programados`,
      });

      currentDayOffset += diasEsteCorte;
    }
    return list;
  }, [dailyRate, diffDiasTotal, isContado, fechaInicio, fechaFin, totalAmount, cantidadCortes, periodoDias, contract.items]);

  const projectedTotal = useMemo(() => {
    return projectedCortes.reduce((sum, c) => sum + c.monto, 0);
  }, [projectedCortes]);

  const parsedDeposito = useMemo(() => {
    const val = parseFloat(depositoGarantiaInput);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [depositoGarantiaInput]);

  const handleConfirmOpen = async () => {
    if (diffDiasTotal <= 0) {
      setError('La fecha de finalización debe ser posterior a la fecha de inicio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const horasPorDiaPorItem: HorasPorDiaItem[] = (contract.items || [])
        .filter((it) => it.tipoTarifa === 'HORA')
        .map((it) => ({
          detalleContratoId: it.id,
          horasPorDia: Number(horasPorDiaMap[it.id] || 8),
        }));

      await openContract(
        contract.id,
        isContado ? diffDiasTotal : periodoDias,
        isContado ? 1 : cantidadCortes,
        fechaInicio,
        fechaFin,
        horasPorDiaPorItem,
        isContado ? 'Condición de pago: CONTADO' : 'Condición de pago: CRÉDITO',
        parsedDeposito,
      );

      onSuccess();
    } catch (err: any) {
      setError(
        serverErrorMessage(err, 'Error al abrir el contrato y programar los cortes.'),
      );
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-NI', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl border border-neutral-300 shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Encabezado Corporativo Formal (Estilo APA / ERP Ejecutivo) */}
        <div className="px-6 py-5 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900">
              <Key className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight">
                  Apertura Operativa de Contrato
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-900 border border-neutral-300 font-mono">
                  {isContado ? 'CONTADO' : 'CRÉDITO'}
                </span>
              </div>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">
                Contrato <span className="font-bold text-neutral-900">{contract.codigo}</span> · Cliente: <span className="font-bold text-neutral-900">{contract.cliente?.nombre || 'General'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {error && (
            <div className="p-3.5 bg-neutral-100 border border-neutral-400 text-neutral-900 text-xs font-bold rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-neutral-800 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bloque 1: Condición Comercial de Pago */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="max-w-md">
              <span className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-1.5">
                {isConditionLocked && <Lock className="w-3.5 h-3.5 text-neutral-700" />}
                Condición Comercial de Pago {isConditionLocked ? '(Bloqueada por Cotización)' : ''}
              </span>
              <p className="text-[11px] text-neutral-600 font-normal leading-relaxed mt-1">
                {isConditionLocked
                  ? `Acuerdo pactado en cotización como ${isContado ? 'CONTADO' : 'CRÉDITO'}. Permanece vinculado para mantener la consistencia contable.`
                  : isContado
                  ? 'Modalidad Contado: Se genera un corte único por el período completo para emisión de factura comercial.'
                  : 'Modalidad Crédito: Se programan cortes escalonados para facturación periódica según el intervalo establecido.'}
              </p>
            </div>

            {isConditionLocked ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-neutral-300 bg-white text-neutral-950">
                  <Lock className="w-3.5 h-3.5 text-neutral-700" />
                  {isContado ? 'CONTADO (Pactado)' : 'CRÉDITO (Pactado)'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-300 shrink-0">
                <button
                  type="button"
                  onClick={() => setCondicionPago('CONTADO')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    isContado
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  CONTADO
                </button>
                <button
                  type="button"
                  onClick={() => setCondicionPago('CREDITO')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    !isContado
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  CRÉDITO
                </button>
              </div>
            )}
          </div>

          {/* Bloque 2: Fechas de Vigencia y Duración */}
          <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-700" />
                1. Vigencia y Período del Servicio
              </span>
              <span className="text-xs font-mono font-bold text-neutral-950 bg-white px-2.5 py-0.5 rounded border border-neutral-300">
                {diffDiasTotal} días calendario
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-neutral-200 text-xs text-neutral-700">
              <p className="font-bold text-neutral-950">
                Período Operativo: del {fechaInicio} al {fechaFin} ({diffDiasTotal} días de renta)
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {fechasCotizadas
                  ? 'Fechas sincronizadas directamente desde la cotización aprobada.'
                  : 'Defina la fecha de inicio y finalización proyectada para el cómputo de la renta.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-900 uppercase tracking-wide block mb-1">
                  Fecha de Inicio:
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  disabled={fechasCotizadas}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-500"
                />
                {fechasCotizadas && (
                  <span className="text-[10px] text-neutral-500 block mt-1">Pactada en cotización comercial</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-900 uppercase tracking-wide block mb-1">
                  Fecha de Finalización:
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  disabled={fechasCotizadas}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-500"
                />
                {fechasCotizadas && (
                  <span className="text-[10px] text-neutral-500 block mt-1">Pactada en cotización comercial</span>
                )}
              </div>
            </div>
          </div>

          {/* Bloque 3: Depósito de Garantía (NUEVA SECCIÓN PROFESIONAL) */}
          <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-neutral-700" />
                2. Depósito de Garantía (Custodia Preventiva)
              </span>
              {quotedDeposito > 0 && (
                <span className="text-[11px] font-mono text-neutral-700 bg-white px-2 py-0.5 rounded border border-neutral-300">
                  Cotizado: <strong className="text-neutral-950">{formatCurrency(quotedDeposito)}</strong>
                </span>
              )}
            </div>

            <p className="text-[11px] text-neutral-600 font-normal leading-relaxed">
              Monto en custodia como garantía de cumplimiento y protección de los equipos en obra. No forma parte de la renta devengada; será liquidado o devuelto al cliente tras la inspección física y firma del acta de recepción en retorno.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-6 flex">
                <span className="inline-flex items-center px-3 py-2 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-lg text-xs font-black text-neutral-800">
                  C$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositoGarantiaInput}
                  onChange={(e) => setDepositoGarantiaInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-neutral-300 rounded-r-lg px-3 py-2 text-sm font-bold font-mono text-neutral-950 focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Botones de ajuste rápido de presets */}
              <div className="sm:col-span-6 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">Rápido:</span>
                <button
                  type="button"
                  onClick={() => setDepositoGarantiaInput('0')}
                  className="text-[10px] font-bold px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer"
                >
                  C$ 0 (Sin depósito)
                </button>
                {quotedDeposito > 0 && (
                  <button
                    type="button"
                    onClick={() => setDepositoGarantiaInput(String(quotedDeposito))}
                    className="text-[10px] font-bold px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-950 transition-colors cursor-pointer"
                  >
                    Cotizado ({formatCurrency(quotedDeposito)})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDepositoGarantiaInput('3000')}
                  className="text-[10px] font-bold px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer"
                >
                  C$ 3,000
                </button>
                <button
                  type="button"
                  onClick={() => setDepositoGarantiaInput('5000')}
                  className="text-[10px] font-bold px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer"
                >
                  C$ 5,000
                </button>
              </div>
            </div>
          </div>

          {/* Bloque 4: Horas Previstas por Día (si hay equipos horarios) */}
          {(contract.items || []).some((it) => it.tipoTarifa === 'HORA') && (
            <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-4 space-y-3">
              <span className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-700" />
                3. Horas Pautadas por Día (Tarificación Horaria)
              </span>

              <div className="space-y-2">
                {(contract.items || [])
                  .filter((it) => it.tipoTarifa === 'HORA')
                  .map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200 text-xs"
                    >
                      <span className="font-bold text-neutral-950 truncate max-w-xs">
                        {it.equipo?.modelo || it.equipo?.descripcion || 'Equipo en renta por hora'}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={horasPorDiaMap[it.id] ?? 8}
                          onChange={(e) => handleHorasChange(it.id, e.target.value)}
                          className="w-20 bg-white border border-neutral-300 rounded px-2 py-1 text-xs text-right font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-900"
                        />
                        <span className="text-[11px] text-neutral-600 font-medium">horas/día</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Bloque 5: Programación de Cortes (Contado vs Crédito) */}
          {isContado ? (
            <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-neutral-200 text-neutral-900 border border-neutral-300">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <label className="text-xs font-black text-neutral-950 uppercase tracking-wide block">
                      4. Modalidad: Venta de CONTADO (Corte Único Integral)
                    </label>
                    <span className="text-[11px] text-neutral-600 font-medium block">
                      Se programa un corte único por los {diffDiasTotal} días de contrato pactados.
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-neutral-950 bg-white px-3 py-1 rounded border border-neutral-300">
                  Renta Total: {formatCurrency(totalAmount)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-neutral-200 text-xs text-neutral-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-neutral-950">
                  <CheckCircle2 className="w-4 h-4 text-neutral-800 shrink-0" />
                  <span>Flujo Operativo de Salida:</span>
                </div>
                <p className="text-[11px] text-neutral-600 pl-6 leading-relaxed">
                  Al confirmar la apertura, el contrato pasará a estado <strong>ACTIVO</strong> para habilitar las órdenes de despacho y retiro de equipos en patio. La factura oficial y su cobranza se gestionan en el <strong>Módulo de Facturación</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-700" />
                    4. Frecuencia de Cortes de Facturación (Crédito)
                  </span>
                  <span className="text-[11px] text-neutral-600 font-medium block mt-0.5">
                    Definición de intervalos periódicos para generación escalonada de cobros.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-neutral-900 uppercase tracking-wide block mb-1">
                    Días entre cada corte:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={periodoDiasInput}
                    onChange={(e) => setPeriodoDiasInput(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-bold font-mono text-neutral-950 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-neutral-900 uppercase tracking-wide block mb-1">
                    Cortes calculados:
                  </label>
                  <div className="w-full bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-between text-neutral-950">
                    <span>{cantidadCortes} cortes programados</span>
                    <span className="text-[11px] text-neutral-600 font-mono">cada {periodoDias} días</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bloque 6: Proyección Formal de Cortes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-neutral-700" />
                Proyección de Cortes de Facturación ({projectedCortes.length})
              </span>
              <span className="text-xs font-mono font-black text-neutral-950">
                Total Proyectado: {formatCurrency(projectedTotal)}
              </span>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-200 max-h-52 overflow-y-auto bg-white">
              {projectedCortes.map((c) => (
                <div
                  key={c.numero}
                  className="p-3 bg-white hover:bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] border border-neutral-300 bg-neutral-100 text-neutral-950">
                        {isContado ? 'Corte Único' : `Corte #${c.numero}`}
                      </span>
                      <span className="text-neutral-800 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="font-bold text-neutral-950">{formatDate(c.inicio)}</span>
                        <span className="text-neutral-400">al</span>
                        <span className="font-bold text-neutral-950">{formatDate(c.fin)}</span>
                        <span className="text-neutral-600 font-bold text-[11px]">({c.dias}d)</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="font-mono font-black text-neutral-950 text-sm">
                      {formatCurrency(c.monto)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nota Técnica de Separación de Responsabilidades */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center gap-2.5 text-xs text-neutral-700">
            <Info className="w-4 h-4 text-neutral-700 shrink-0" />
            <p className="leading-relaxed">
              La confirmación cambia el estado a <strong className="text-neutral-950">ACTIVO</strong> para permitir salidas de bodega. La emisión de facturas y aplicación de pagos se realizan en el <strong className="text-neutral-950">Módulo de Facturación</strong>.
            </p>
          </div>
        </div>

        {/* Pie del Modal / Botones de Acción */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-700">
            <span>Depósito Garantía: <strong className="text-neutral-950 font-mono">{formatCurrency(parsedDeposito)}</strong></span>
            <span className="mx-2 text-neutral-400">|</span>
            <span>Renta Total: <strong className="text-neutral-950 font-mono">{formatCurrency(totalAmount)}</strong></span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-bold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmOpen}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-black text-white bg-neutral-950 hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Abriendo contrato...'
                  : isContado
                  ? 'Confirmar y Abrir Contrato (Contado)'
                  : `Confirmar y Abrir Contrato (${cantidadCortes} cortes cada ${periodoDias}d)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
