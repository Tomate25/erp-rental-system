import React, { useState, useMemo } from 'react';
import type { Contract, HorasPorDiaItem } from '../../operations/services/operations.api';
import { openContract } from '../../operations/services/operations.api';
import {
  X,
  Calendar,
  Key,
  AlertCircle,
  Layers,
  DollarSign,
  Clock,
  ShieldCheck,
  Receipt,
  CheckCircle2,
  CreditCard,
  Check,
} from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import {
  amountForCumulativeDays,
  calendarDays,
  dailyGrossRate,
} from '../utils/cutPricing';
import { isContractContado } from '../utils/contractCondition';
import { invoiceCorte, registerInvoicePayment } from '../../billing/services/billing.api';
import { FACTURA_CORTE_CONTADO } from '../../billing/constants/invoice-payload';
import type { Factura } from '../../billing/types/billing.types';
import {
  validatePayment,
  METODOS_PAGO,
  METODOS_CON_BANCO,
} from '../../billing/validators/payment.validator';
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

  // Paso del modal: 'CONFIG' para configuración o 'PAYMENT' para realizar pago de contado
  const [step, setStep] = useState<'CONFIG' | 'PAYMENT'>('CONFIG');

  // Condición de Pago: CONTADO vs CREDITO (detectada automáticamente por defecto)
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

  // Estado del paso de Pago (Cobro de Factura de Contado)
  const [generatedInvoice, setGeneratedInvoice] = useState<Factura | null>(null);
  const [montoAbono, setMontoAbono] = useState<string>('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>('EFECTIVO');
  const [bancoAbono, setBancoAbono] = useState<string>('');
  const [referenciaAbono, setReferenciaAbono] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Duración total entre fechaInicio y fechaFin en días
  const diffDiasTotal = useMemo(() => {
    try {
      const d1 = new Date(fechaInicio + 'T12:00:00');
      const d2 = new Date(fechaFin + 'T12:00:00');
      const diffMs = d2.getTime() - d1.getTime();
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } catch {
      return 30;
    }
  }, [fechaInicio, fechaFin]);

  const periodoDias = useMemo(() => {
    if (isContado) return diffDiasTotal;
    const val = parseInt(periodoDiasInput, 10);
    return isNaN(val) || val < 1 ? 1 : val;
  }, [isContado, diffDiasTotal, periodoDiasInput]);

  // Estimación en meses de la duración
  const duracionMesesAprox = useMemo(() => {
    const meses = diffDiasTotal / 30;
    return meses >= 1 ? `${meses.toFixed(1)} meses` : `${diffDiasTotal} días`;
  }, [diffDiasTotal]);

  // 4. Configuración editable de horas estimadas por día para cada ítem tarifado por HORA
  const [horasPorDiaMap, setHorasPorDiaMap] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    (contract.items || []).forEach((item) => {
      if (item.tipoTarifa === 'HORA') {
        if (item.horasPorDia && Number(item.horasPorDia) > 0) {
          initialMap[item.id] = Number(item.horasPorDia);
        } else if (item.dias && diffDiasTotal > 0) {
          initialMap[item.id] = Math.max(1, Math.round((Number(item.dias) / diffDiasTotal) * 10) / 10);
        } else {
          initialMap[item.id] = 8;
        }
      }
    });
    return initialMap;
  });

  const handleHorasPorDiaChange = (itemId: string, valueStr: string) => {
    const val = parseFloat(valueStr);
    setHorasPorDiaMap((prev) => ({
      ...prev,
      [itemId]: isNaN(val) || val <= 0 ? 0 : val,
    }));
  };

  // Cantidad total de cortes según duración del contrato y días de intervalo
  const cantidadCortes = useMemo(() => {
    if (isContado) return 1;
    return Math.max(1, Math.ceil(diffDiasTotal / periodoDias));
  }, [isContado, diffDiasTotal, periodoDias]);

  // Tarifa diaria combinada exacta (suma de ítems DIA + ítems HORA con sus horas diarias previstas)
  const perDay = useMemo(() => {
    return dailyGrossRate(
      {
        ...contract,
        fechaInicio: `${fechaInicio}T12:00:00.000Z`,
        fechaFin: `${fechaFin}T12:00:00.000Z`,
      },
      horasPorDiaMap,
    );
  }, [contract, fechaInicio, fechaFin, horasPorDiaMap]);

  // Subtotal base de equipos
  const subtotalEquipos = useMemo(() => {
    if (contract.cotizacion?.subtotal) return Number(contract.cotizacion.subtotal);
    return (contract.items || []).reduce((acc, it) => {
      const isHora = it.tipoTarifa === 'HORA';
      const currentHpd = horasPorDiaMap[it.id] ?? 8;
      const totalUnits = isHora ? currentHpd * diffDiasTotal : diffDiasTotal;
      return acc + Number(it.precioRenta) * (it.cantidad || 1) * totalUnits;
    }, 0);
  }, [contract, diffDiasTotal, horasPorDiaMap]);

  // Monto total contratado
  const totalAmount = useMemo(() => {
    if (contract.cotizacion?.total) return Number(contract.cotizacion.total);
    if (perDay !== null) return Math.round(perDay * diffDiasTotal * 100) / 100;
    return subtotalEquipos;
  }, [contract, diffDiasTotal, perDay, subtotalEquipos]);

  // Monto de IVA calculado o proveniente de cotización
  const montoIva = useMemo(() => {
    if (contract.cotizacion?.iva !== undefined && Number(contract.cotizacion.iva) > 0) {
      return Number(contract.cotizacion.iva);
    }
    const diff = totalAmount - subtotalEquipos;
    return diff > 0 ? Math.round(diff * 100) / 100 : 0;
  }, [contract, totalAmount, subtotalEquipos]);

  // Proyección exacta de cortes
  const projectedCortes = useMemo(() => {
    if (isContado) {
      // Venta de CONTADO: Un solo corte por el 100% de la duración
      return [
        {
          numero: 1,
          inicio: new Date(fechaInicio + 'T12:00:00'),
          fin: new Date(fechaFin + 'T12:00:00'),
          dias: diffDiasTotal,
          monto: Math.round(totalAmount * 100) / 100,
          resumenItems: 'Cobro único al contado por el total de la renta contratada',
        },
      ];
    }

    const totalCentavos = Math.round(totalAmount * 100);
    const baseCentavos = Math.floor(totalCentavos / cantidadCortes);
    let remCentavos = totalCentavos - baseCentavos * cantidadCortes;

    const list: {
      numero: number;
      inicio: Date;
      fin: Date;
      dias: number;
      monto: number;
      resumenItems: string;
    }[] = [];

    const targetEnd = new Date(fechaFin + 'T12:00:00');
    let currentStart = new Date(fechaInicio + 'T12:00:00');
    let elapsedDays = 0;

    for (let i = 1; i <= cantidadCortes; i++) {
      let currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + periodoDias);

      if (i === cantidadCortes || currentEnd > targetEnd) {
        currentEnd = new Date(targetEnd);
      }

      const diasCorte = calendarDays(currentStart, currentEnd);
      const corteCentavos = baseCentavos + (remCentavos > 0 ? 1 : 0);
      if (remCentavos > 0) remCentavos--;

      const resumenPartes: string[] = [];
      (contract.items || []).forEach((it) => {
        const isHora = it.tipoTarifa === 'HORA';
        const name = it.equipo?.modelo || it.equipo?.codigo || 'Equipo';
        if (isHora) {
          const hpd = horasPorDiaMap[it.id] ?? 8;
          const horasCorte = diasCorte * hpd;
          resumenPartes.push(`${name}: ${horasCorte.toFixed(1)} hrs (${diasCorte}d × ${hpd}h/d)`);
        } else {
          resumenPartes.push(`${name}: ${diasCorte} días`);
        }
      });

      list.push({
        numero: i,
        inicio: new Date(currentStart),
        fin: new Date(currentEnd),
        dias: diasCorte,
        monto:
          perDay !== null
            ? amountForCumulativeDays(perDay, elapsedDays, diasCorte)
            : Math.round(corteCentavos) / 100,
        resumenItems: resumenPartes.join(' · '),
      });

      elapsedDays += diasCorte;
      currentStart = new Date(currentEnd);
    }
    return list;
  }, [
    isContado,
    cantidadCortes,
    periodoDias,
    totalAmount,
    perDay,
    fechaInicio,
    fechaFin,
    contract.items,
    horasPorDiaMap,
    diffDiasTotal,
  ]);

  const projectedTotal = projectedCortes.reduce((sum, corte) => sum + corte.monto, 0);

  const handleConfirmOpen = async () => {
    if (!isContado && periodoDias < 1) {
      setError('La frecuencia en días debe ser al menos 1.');
      return;
    }
    if (
      new Date(fechaFin + 'T12:00:00').getTime() <=
      new Date(fechaInicio + 'T12:00:00').getTime()
    ) {
      setError('La fecha de finalización debe ser posterior a la fecha de inicio.');
      return;
    }

    // Validar que los ítems por hora tengan horas previstas mayores a 0
    for (const item of contract.items || []) {
      if (item.tipoTarifa === 'HORA') {
        const hpd = horasPorDiaMap[item.id];
        if (hpd === undefined || hpd <= 0) {
          setError(`Especifique las horas de operación diaria para el equipo: ${item.equipo?.modelo || 'equipo horario'}.`);
          return;
        }
      }
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

      const opened = await openContract(
        contract.id,
        isContado ? diffDiasTotal : periodoDias,
        isContado ? 1 : cantidadCortes,
        fechaInicio,
        fechaFin,
        horasPorDiaPorItem,
        isContado ? 'Condición de pago: CONTADO' : 'Condición de pago: CRÉDITO',
      );

      // Si es venta de CONTADO: Pasar directamente a crear factura y luego realizar pago
      if (isContado) {
        const primerCorte = opened.cortesFacturacion?.[0];
        if (primerCorte) {
          const factura = await invoiceCorte(primerCorte.id, { ...FACTURA_CORTE_CONTADO });
          setGeneratedInvoice(factura);
          setMontoAbono(String(factura.total));
          setStep('PAYMENT');
          setIsSubmitting(false);
          return;
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(
        serverErrorMessage(err, 'Error al abrir el contrato y generar cortes.'),
      );
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedInvoice) return;
    setPaymentError(null);

    const validacion = validatePayment({
      monto: montoAbono,
      metodo: metodoPagoAbono,
      referencia: referenciaAbono,
      banco: bancoAbono,
    });

    if (!validacion.ok) {
      setPaymentError(validacion.error);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await registerInvoicePayment(generatedInvoice.id, validacion.payload);
      setPaymentSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: unknown) {
      setPaymentError(serverErrorMessage(err, 'Error al registrar el cobro de la factura'));
    } finally {
      setIsSubmittingPayment(false);
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
              {step === 'PAYMENT' ? (
                <Receipt className="w-6 h-6 text-white" />
              ) : isContado ? (
                <ShieldCheck className="w-6 h-6 text-white" />
              ) : (
                <Key className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">
                  {step === 'PAYMENT'
                    ? 'Factura de Contado — Registrar Pago'
                    : isContado
                    ? 'Abrir Contrato de CONTADO'
                    : 'Abrir Contrato y Programar Cortes'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white font-mono">
                  {isContado ? 'CONTADO' : 'CRÉDITO'}
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

        {/* --- PASO 2: REALIZAR PAGO DE CONTADO --- */}
        {step === 'PAYMENT' && generatedInvoice ? (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {paymentSuccess ? (
              <div className="p-8 text-center space-y-3 bg-emerald-50 border border-emerald-200 rounded-3xl">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-emerald-950">
                  ¡Factura y Pago de Contado Registrados Exitosamente!
                </h4>
                <p className="text-xs text-emerald-800">
                  El contrato {contract.codigo} ha sido abierto y la factura {generatedInvoice.folio} pagada en su totalidad por {formatCurrency(generatedInvoice.total)}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmPayment} className="space-y-5">
                {paymentError && (
                  <div className="p-3 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Banner de Factura Generada */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-xs">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                        Factura de Contado Emitida
                      </span>
                      <span className="text-lg font-black font-mono text-[#1B1D22]">
                        {generatedInvoice.folio}
                      </span>
                      <span className="text-[11px] text-[#747780] font-medium block">
                        Cliente: {contract.cliente?.nombre} · {diffDiasTotal} días de servicio
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-[#747780] uppercase block">
                      Total a Pagar (Contado)
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-800">
                      {formatCurrency(generatedInvoice.total)}
                    </span>
                  </div>
                </div>

                {/* Formulario de Pago */}
                <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-700" /> Datos del Cobro / Recibo de Caja
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                        Monto Recibido (C$):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={montoAbono}
                        onChange={(e) => setMontoAbono(e.target.value)}
                        className="precision-input w-full text-sm font-black font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                        Método de Pago:
                      </label>
                      <select
                        value={metodoPagoAbono}
                        onChange={(e) => setMetodoPagoAbono(e.target.value)}
                        className="precision-input w-full text-xs font-bold bg-white"
                      >
                        {METODOS_PAGO.map((m) => (
                          <option key={m} value={m}>
                            {m === 'EFECTIVO' ? '💵 Efectivo (Caja)' :
                             m === 'TRANSFERENCIA' ? '🏦 Transferencia Bancaria' :
                             m === 'CHEQUE' ? '📝 Cheque' : '💳 Tarjeta de Crédito/Débito'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {METODOS_CON_BANCO.includes(metodoPagoAbono) && (
                      <div>
                        <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                          Banco Receptor / Emisor:
                        </label>
                        <input
                          type="text"
                          value={bancoAbono}
                          onChange={(e) => setBancoAbono(e.target.value)}
                          placeholder="Ej. BAC, Banpro, Lafise, BDF"
                          className="precision-input w-full text-xs font-bold"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                        N° Referencia / Recibo de Caja:
                      </label>
                      <input
                        type="text"
                        value={referenciaAbono}
                        onChange={(e) => setReferenciaAbono(e.target.value)}
                        placeholder="Ej. REC-2026-001 ó TRF-987654"
                        className="precision-input w-full text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E8EE] -mx-6 -mb-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onSuccess}
                    className="btn-precision-outline text-xs cursor-pointer"
                  >
                    Omitir Cobro por Ahora (Dejar Pendiente)
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="btn-precision-primary bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5 shadow-xs font-black cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {isSubmittingPayment ? 'Registrando cobro...' : 'Confirmar Pago y Registrar Recibo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* --- PASO 1: CONFIGURACIÓN Y APERTURA DE CONTRATO --- */
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="p-3 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Selector de Condición de Pago: CONTADO vs CREDITO */}
            <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider block">
                  Condición Comercial de la Venta
                </span>
                <span className="text-[11px] text-[#747780] font-medium block">
                  {isContado
                    ? 'Venta de Contado: Se genera factura única y se pasa a cobro inmediato.'
                    : 'Venta a Crédito: Se programan cortes escalonados para cobro a 30 días.'}
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

            {/* Tarjeta de Tarifa Diaria / Precio Base */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#1A73E8] text-white shadow-xs">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#1A73E8] tracking-wider block">
                    {contract.cotizacion ? 'Monto Total' : 'Precio Total'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black font-mono text-[#1B1D22]">
                      {formatCurrency(totalAmount)}
                    </span>
                    {perDay !== null && !contract.cotizacion && (
                      <span className="text-xs font-mono font-bold text-[#747780]">
                        ({formatCurrency(perDay)}/día)
                      </span>
                    )}
                  </div>
                  {montoIva > 0 ? (
                    <span className="text-[11px] text-[#747780] font-mono font-medium block mt-0.5">
                      Subtotal: {formatCurrency(subtotalEquipos)} + IVA (15%): {formatCurrency(montoIva)}
                    </span>
                  ) : contract.cotizacion ? (
                    <span className="text-[10px] text-[#747780] font-medium block">
                      Cotización #{contract.cotizacion.numeroCotizacion}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="text-left sm:text-right text-xs">
                <span className="text-[10px] font-bold text-[#747780] uppercase block">
                  Inicio de renta
                </span>
                <span className="font-extrabold text-[#1B1D22] flex items-center sm:justify-end gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#1A73E8]" />
                  {fechaInicio === todayStr ? 'Hoy' : formatDate(new Date(fechaInicio + 'T12:00:00'))} ({fechaInicio})
                </span>
              </div>
            </div>

            {/* Sección 1: Fechas de Vigencia del Contrato */}
            <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#1A73E8]" /> 1. Fechas de Vigencia del Contrato
                  </label>
                  <span className="text-[11px] text-[#747780] font-medium block">
                    {fechasCotizadas
                      ? 'Fechas pactadas en la cotización aceptada.'
                      : 'Define las fechas de apertura y culminación del contrato.'}
                  </span>
                </div>
                <span className="text-[11px] font-extrabold text-[#1A73E8] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {diffDiasTotal} días ({duracionMesesAprox})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fecha Inicio (Hoy) */}
                <div>
                  <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                    Fecha de Apertura (Inicio):
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      disabled={fechasCotizadas}
                      className="precision-input w-full text-xs font-bold disabled:bg-slate-100"
                    />
                    {fechaInicio === todayStr && (
                      <span className="absolute right-2 top-2 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm">
                        Hoy
                      </span>
                    )}
                  </div>
                </div>

                {/* Fecha Fin */}
                <div>
                  <label className="text-[11px] font-bold text-[#37474F] block mb-1">
                    Fecha de Finalización:
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    min={fechaInicio}
                    onChange={(e) => setFechaFin(e.target.value)}
                    disabled={fechasCotizadas}
                    className="precision-input w-full text-xs font-bold font-mono disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Desglose de Equipos y Horas Previstas por Día */}
            <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#1A73E8]" /> 2. Equipos y Unidades de Cobro Contratadas
                  </label>
                  <span className="text-[11px] text-[#747780] font-medium block">
                    Cada equipo conserva su modalidad pactada. En productos por hora, define las horas previstas por día de operación.
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase text-[#1A73E8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {contract.items?.length || 0} línea(s)
                </span>
              </div>

              <div className="space-y-3">
                {contract.items?.map((item) => {
                  const isHora = item.tipoTarifa === 'HORA';
                  const currentHpd = horasPorDiaMap[item.id] ?? 8;
                  const totalUnits = isHora ? currentHpd * diffDiasTotal : diffDiasTotal;
                  const subtotalItem = Number(item.precioRenta) * (item.cantidad || 1) * totalUnits;

                  return (
                    <div key={item.id} className="bg-white border border-[#E5E8EE] rounded-2xl p-4 space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E8EE] pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                isHora
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {isHora ? '⏱️ Tarifa por Hora' : '📅 Tarifa por Día'}
                            </span>
                            <span className="font-extrabold text-[#1B1D22] text-xs">
                              {item.equipo?.modelo || item.equipo?.codigo || 'Equipo contratado'}
                            </span>
                          </div>
                          {item.equipo?.numeroSerie && (
                            <span className="text-[10px] font-mono text-[#747780] block">
                              Serie: {item.equipo.numeroSerie}
                            </span>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold text-[#747780] uppercase block">
                            Tarifa Base Pactada
                          </span>
                          <span className="font-mono font-black text-xs text-[#1B1D22]">
                            {formatCurrency(item.precioRenta)} / {isHora ? 'hora' : 'día'}
                          </span>
                        </div>
                      </div>

                      {/* Fila de Parámetros de Operación y Subtotal */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E8EE]">
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-[#747780] uppercase block">
                              Cantidad
                            </span>
                            <span className="font-mono font-bold text-[#1B1D22]">
                              {item.cantidad || 1} un.
                            </span>
                          </div>

                          {isHora ? (
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-amber-900 uppercase block">
                                  Horas previstas / día:
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={currentHpd || ''}
                                    onChange={(e) => handleHorasPorDiaChange(item.id, e.target.value)}
                                    className="precision-input w-20 text-center font-mono font-black text-xs py-1 bg-white border-amber-300"
                                  />
                                  <span className="text-[11px] text-amber-800 font-bold">hrs/día</span>
                                </div>
                              </div>
                              <span className="text-[11px] text-[#747780] font-mono self-end pb-1">
                                = {(currentHpd * diffDiasTotal).toFixed(1)} hrs en {diffDiasTotal}d
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] font-bold text-[#747780] uppercase block">
                                Días de Servicio
                              </span>
                              <span className="font-mono font-bold text-[#1B1D22]">
                                {diffDiasTotal} días completos
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold text-[#747780] uppercase block">
                            Subtotal Línea ({diffDiasTotal} días)
                          </span>
                          <span className="font-mono font-black text-sm text-[#1A73E8]">
                            {formatCurrency(subtotalItem)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen de importes de las líneas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-xl border border-[#E5E8EE] text-xs font-mono">
                <span className="text-[11px] text-[#747780] font-sans font-medium">
                  Desglose de importes ({diffDiasTotal} días)
                </span>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-[#747780] uppercase font-sans font-bold block">Subtotal</span>
                    <span className="font-bold text-[#1B1D22]">{formatCurrency(subtotalEquipos)}</span>
                  </div>
                  {montoIva > 0 && (
                    <div>
                      <span className="text-[10px] text-[#747780] uppercase font-sans font-bold block">IVA (15%)</span>
                      <span className="font-bold text-[#1B1D22]">{formatCurrency(montoIva)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-[#1A73E8] uppercase font-sans font-black block">Total</span>
                    <span className="font-black text-[#1A73E8] text-sm">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Venta de CONTADO (sin pedir frecuencia) vs CRÉDITO (con frecuencia) */}
            {isContado ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <label className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                        3. Venta de CONTADO — Factura Única
                      </label>
                      <span className="text-[11px] text-emerald-800 font-medium block">
                        Facturación del 100% del período en un solo cobro de contado.
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-black uppercase text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                    Factura Única ({diffDiasTotal} días)
                  </span>
                </div>

                <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Flujo directo: Al confirmar, se abrirá el contrato, se emitirá la factura y pasarás al registro del pago.</span>
                  </div>
                  <span className="text-[11px] text-[#747780] pl-5.5 block">
                    Total a facturar: <strong>{formatCurrency(totalAmount)}</strong>
                    {montoIva > 0 && ` (Subtotal ${formatCurrency(subtotalEquipos)} + IVA ${formatCurrency(montoIva)})`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#1A73E8]" /> 3. Frecuencia de Cortes de Facturación (Crédito)
                    </label>
                    <span className="text-[11px] text-[#747780] font-medium block">
                      El sistema distribuye los cortes sucesivamente respetando el intervalo de días fijado.
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    Cada {periodoDias} días
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[#E5E8EE]">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={periodoDiasInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPeriodoDiasInput(val);
                    }}
                    onBlur={() => {
                      if (!periodoDiasInput || parseInt(periodoDiasInput, 10) < 1) {
                        setPeriodoDiasInput('10');
                      }
                    }}
                    className="precision-input w-28 text-center text-sm font-black font-mono"
                    placeholder="10"
                  />
                  <span className="text-xs font-bold text-[#1B1D22]">
                    Días entre cada corte de facturación
                  </span>
                </div>
              </div>
            )}

            {/* Sección 4: Proyección de Cortes con Montos y Fechas */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1A73E8]" /> {isContado ? 'Detalle de Facturación (Contado)' : `Plan de Cortes a Facturar (${projectedCortes.length})`}
                </span>
                <span className="text-[11px] font-black font-mono text-[#1A73E8]">
                  Total: {formatCurrency(projectedTotal)}
                </span>
              </div>

              <div className="border border-[#E5E8EE] rounded-2xl overflow-hidden divide-y divide-[#E5E8EE] max-h-56 overflow-y-auto">
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
                          {isContado ? 'Factura Única (Contado)' : `Corte #${c.numero}`}
                        </span>
                        <span className="text-[#37474F] font-medium flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#747780]" />
                          <strong>{formatDate(c.inicio)}</strong>
                          <span className="text-gray-400">→</span>
                          <strong>{formatDate(c.fin)}</strong>
                          <span className="text-gray-500 font-bold text-[10px]">({c.dias}d)</span>
                        </span>
                      </div>
                      {c.resumenItems && (
                        <span className="text-[10px] text-[#747780] block font-mono pl-1">
                          ↳ {c.resumenItems}
                        </span>
                      )}
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
          </div>
        )}

        {/* Footer para Paso 1 */}
        {step === 'CONFIG' && (
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
              {isSubmitting ? (
                <span>Abriendo y procesando...</span>
              ) : isContado ? (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Abrir, Emitir Factura y Cobrar</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Confirmar y Abrir ({cantidadCortes} cortes cada {periodoDias}d)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
