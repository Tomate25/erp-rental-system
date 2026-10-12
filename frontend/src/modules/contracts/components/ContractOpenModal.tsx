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
  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>(
    initialIsContado ? 'CONTADO' : 'CREDITO',
  );
  const isContado = condicionPago === 'CONTADO';

  // 1. Fechas de apertura
  const [fechaInicio, setFechaInicio] = useState<string>(fechaInicioCotizada || todayStr);

  // 2. Fecha de finalización
  const [fechaFin, setFechaFin] = useState<string>(() => {
    if (fechaFinCotizada) return fechaFinCotizada;
    if (contract.fechaFin) {
      const origFin = contract.fechaFin.split('T')[0];
      if (origFin > todayStr) return origFin;
    }
    return addMonthsToStr(todayStr, 1);
  });

  // 3. Frecuencia de corte para crédito (para contado se bloquea / no se pide)
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

  // Subtotal de equipos
  const subtotalEquipos = useMemo(() => {
    if (!dailyRate || diffDiasTotal <= 0) return 0;
    return amountForCumulativeDays(dailyRate, 0, diffDiasTotal);
  }, [dailyRate, diffDiasTotal]);

  const montoIva = useMemo(() => {
    return Math.round(subtotalEquipos * 0.15 * 100) / 100;
  }, [subtotalEquipos]);

  const totalAmount = useMemo(() => {
    return Math.round((subtotalEquipos + montoIva) * 100) / 100;
  }, [subtotalEquipos, montoIva]);

  // Proyección de cortes
  const projectedCortes = useMemo(() => {
    if (!dailyRate || diffDiasTotal <= 0) return [];
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

    for (let i = 1; i <= cantidadCortes; i++) {
      const diasEsteCorte = Math.min(periodoDias, diffDiasTotal - currentDayOffset);
      if (diasEsteCorte <= 0) break;

      const dStart = new Date(baseDate.getTime() + currentDayOffset * 86400000);
      const dEnd = new Date(dStart.getTime() + diasEsteCorte * 86400000);

      const subtotalCorte = amountForCumulativeDays(
        dailyRate,
        currentDayOffset,
        currentDayOffset + diasEsteCorte,
      );
      const ivaCorte = Math.round(subtotalCorte * 0.15 * 100) / 100;
      const montoCorte = Math.round((subtotalCorte + ivaCorte) * 100) / 100;

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
    <div className="fixed inset-0 bg-[#37474F]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-white flex items-center justify-between shrink-0 ${
          isContado ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-[#1A73E8]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">
                  Abrir Contrato Operativo
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white font-mono">
                  {isContado ? '💵 CONTADO' : '💳 CRÉDITO'}
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium">
                Contrato {contract.codigo} · {contract.cliente?.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector / Indicador de Condición Comercial de Pago */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider block">
                Condición Comercial (Definida en Cotización)
              </span>
              <span className="text-[11px] text-[#747780] font-medium block">
                {isContado
                  ? 'Modalidad de Contado: Período completo con facturación centralizada en Módulo de Facturación.'
                  : 'Modalidad a Crédito: Cortes escalonados programados para facturación periódica en Módulo de Facturación.'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#E5E8EE]">
              <button
                type="button"
                onClick={() => setCondicionPago('CONTADO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isContado
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[#747780] hover:text-[#1B1D22]'
                }`}
              >
                💵 CONTADO
              </button>
              <button
                type="button"
                onClick={() => setCondicionPago('CREDITO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  !isContado
                    ? 'bg-[#1A73E8] text-white shadow-xs'
                    : 'text-[#747780] hover:text-[#1B1D22]'
                }`}
              >
                💳 CRÉDITO
              </button>
            </div>
          </div>

          {/* 1. Fechas de Inicio y Finalización */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1A73E8]" /> 1. Fechas de Vigencia y Período
              </span>
              <span className="text-[11px] font-mono font-bold text-[#1A73E8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {diffDiasTotal} días de servicio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                  Fecha Inicio de Renta:
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  disabled={fechasCotizadas}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="precision-input w-full text-xs font-bold disabled:bg-slate-100 disabled:text-slate-500"
                />
                {fechasCotizadas && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pactada en cotización oficial</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                  Fecha Fin de Renta:
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  disabled={fechasCotizadas}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="precision-input w-full text-xs font-bold disabled:bg-slate-100 disabled:text-slate-500"
                />
                {fechasCotizadas && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pactada en cotización oficial</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Horas Previstas por Día (si hay equipos horarios) */}
          {(contract.items || []).some((it) => it.tipoTarifa === 'HORA') && (
            <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#1A73E8]" /> 2. Horas Previstas por Día (Equipos por Hora)
              </span>

              <div className="space-y-2">
                {(contract.items || [])
                  .filter((it) => it.tipoTarifa === 'HORA')
                  .map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-[#E5E8EE] text-xs"
                    >
                      <span className="font-bold text-[#1B1D22] truncate">
                        {it.equipo?.modelo || 'Equipo horario'}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={horasPorDiaMap[it.id] ?? 8}
                          onChange={(e) => handleHorasChange(it.id, e.target.value)}
                          className="precision-input w-20 text-xs text-right font-mono font-bold"
                        />
                        <span className="text-[11px] text-[#747780]">hrs/día</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 3. Programación de Cortes según Condición Comercial */}
          {isContado ? (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-600 text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <label className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                      3. Modalidad: Venta de CONTADO (Período Completo)
                    </label>
                    <span className="text-[11px] text-emerald-800 font-medium block">
                      Se programa un corte único por los {diffDiasTotal} días de contrato.
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-black uppercase text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                  Total: {formatCurrency(totalAmount)}
                </span>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Flujo Operativo: Al confirmar, el contrato pasará a ACTIVO para habilitar despachos en patio.</span>
                </div>
                <span className="text-[11px] text-emerald-700 pl-5.5 block">
                  La factura fiscal y el registro del cobro se realizarán en el <strong>Módulo de Facturación</strong>.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#1A73E8]" /> 3. Frecuencia de Cortes de Facturación (Crédito)
                  </span>
                  <span className="text-[11px] text-[#747780] font-medium block mt-0.5">
                    Distribución de cortes sucesivos según el intervalo de días fijado.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                    Días entre cada corte:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={periodoDiasInput}
                    onChange={(e) => setPeriodoDiasInput(e.target.value)}
                    className="precision-input w-full text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                    Cortes calculados:
                  </label>
                  <div className="precision-input w-full text-xs font-bold bg-slate-100 flex items-center justify-between text-[#1B1D22]">
                    <span>{cantidadCortes} cortes sucesivos</span>
                    <span className="text-[10px] text-[#747780]">cada {periodoDias}d</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Proyección de Cortes a Programar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1A73E8]" /> Proyección de Cortes ({projectedCortes.length})
              </span>
              <span className="text-[11px] font-black font-mono text-[#1A73E8]">
                Total: {formatCurrency(projectedTotal)}
              </span>
            </div>

            <div className="border border-[#E5E8EE] rounded-2xl overflow-hidden divide-y divide-[#E5E8EE] max-h-48 overflow-y-auto">
              {projectedCortes.map((c) => (
                <div
                  key={c.numero}
                  className="p-3 bg-white hover:bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-black px-2.5 py-0.5 rounded-md text-[11px] border ${
                        isContado
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/20'
                      }`}>
                        {isContado ? 'Corte Único (Contado)' : `Corte #${c.numero}`}
                      </span>
                      <span className="text-[#37474F] font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#747780]" />
                        <strong>{formatDate(c.inicio)}</strong>
                        <span className="text-gray-400">→</span>
                        <strong>{formatDate(c.fin)}</strong>
                        <span className="text-gray-500 font-bold text-[10px]">({c.dias}d)</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="font-mono font-black text-[#1B1D22] text-sm">
                      {formatCurrency(c.monto)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nota informativa de separación con Módulo de Facturación */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-2 text-xs text-[#37474F]">
            <Info className="w-4 h-4 text-[#1A73E8] shrink-0" />
            <span>
              La apertura del contrato pasa su estado a <strong>ACTIVO</strong> para habilitar despachos y salidas en patio. La facturación y cobro se gestionan en el <strong>Módulo de Facturación</strong>.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E8EE] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-precision-outline text-xs cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmOpen}
            disabled={isSubmitting}
            className={`btn-precision-primary text-xs flex items-center gap-1.5 shadow-xs font-bold cursor-pointer ${
              isContado
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white'
            }`}
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
  );
};
