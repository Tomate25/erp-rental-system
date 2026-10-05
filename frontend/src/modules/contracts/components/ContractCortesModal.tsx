import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Contract, CorteFacturacion, HorasPorDiaItem } from '../../operations/services/operations.api';
import {
  getCortes,
  createManualCorte,
  generateCortes,
  updateCorte,
  deleteCorte,
  getContractById,
} from '../../operations/services/operations.api';
import { invoiceCorte, getContractCortes } from '../../billing/services/billing.api';
import { FACTURA_CORTE_CREDITO_30 } from '../../billing/constants/invoice-payload';
import { serverErrorMessage } from '../../../shared/utils/errors';
import type { CorteFacturacionResumen } from '../../billing/types/billing.types';
import { amountForCumulativeDays, calendarDays, dailyGrossRate, getItemUnitsPerDay, rentalCalendarDay } from '../utils/cutPricing';
import {
  X,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  Check,
  Receipt,
  Layers,
  Settings2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Save,
} from 'lucide-react';

interface ContractCortesModalProps {
  contract: Contract;
  onClose: () => void;
  onUpdate?: () => void;
}

export const ContractCortesModal: React.FC<ContractCortesModalProps> = ({
  contract,
  onClose,
  onUpdate,
}) => {
  const [currentContract, setCurrentContract] = useState<Contract>(contract);
  const [cortes, setCortes] = useState<CorteFacturacion[]>([]);
  const [billingResumenList, setBillingResumenList] = useState<CorteFacturacionResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentContract(contract);
  }, [contract]);

  // Estado para Reconfigurar Plan de Cortes
  const [showConfigPlan, setShowConfigPlan] = useState(false);
  // Inputs basados en string para permitir borrar completamente con Backspace sin trabarse en 1
  const [cortesInput, setCortesInput] = useState<string>('4');
  const [diasInput, setDiasInput] = useState<string>('20');
  const [isApplyingPlan, setIsApplyingPlan] = useState(false);

  // Edición en línea de un corte específico
  const [editingCorteId, setEditingCorteId] = useState<string | null>(null);
  const [editFechaInicio, setEditFechaInicio] = useState<string>('');
  const [editFechaFin, setEditFechaFin] = useState<string>('');
  const [editMonto, setEditMonto] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingCorteId, setDeletingCorteId] = useState<string | null>(null);

  // Formulario de Corte Manual / Fecha Mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [fechaCorte, setFechaCorte] = useState(tomorrow.toISOString().split('T')[0]);
  const [montoManual, setMontoManual] = useState<string>('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [isFacturandoId, setIsFacturandoId] = useState<string | null>(null);

  const startDate = useMemo(() => new Date(currentContract.fechaInicio), [currentContract.fechaInicio]);

  // Configuración editable de horas estimadas por día para cada ítem tarifado por HORA
  const [horasPorDiaMap, setHorasPorDiaMap] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    (contract.items || []).forEach((item) => {
      if (item.tipoTarifa === 'HORA') {
        if (item.horasPorDia && Number(item.horasPorDia) > 0) {
          initialMap[item.id] = Number(item.horasPorDia);
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

  const perDay = useMemo(() => dailyGrossRate(currentContract, horasPorDiaMap), [currentContract, horasPorDiaMap]);

  // Valores numéricos seguros derivados del texto
  const planCortesCount = useMemo(() => {
    const val = parseInt(cortesInput, 10);
    return isNaN(val) || val < 1 ? 1 : val;
  }, [cortesInput]);

  const planPeriodoDias = useMemo(() => {
    const val = parseInt(diasInput, 10);
    return isNaN(val) || val < 1 ? 1 : val;
  }, [diasInput]);

  // Precio base vendido del contrato / cotización
  const totalAmount = useMemo(() => {
    if (perDay !== null) return Math.round(perDay * calendarDays(startDate, new Date(currentContract.fechaFin)) * 100) / 100;
    if (currentContract.cotizacion?.total) return Number(currentContract.cotizacion.total);
    const diffDays = calendarDays(startDate, new Date(currentContract.fechaFin));
    return (currentContract.items || []).reduce(
      (acc, it) => acc + Number(it.precioRenta) * (it.cantidad || 1) * getItemUnitsPerDay(it, diffDays, horasPorDiaMap) * diffDays,
      0,
    );
  }, [currentContract, startDate, perDay, horasPorDiaMap]);

  // Cortes ya facturados y saldo restante
  const facturadosList = useMemo(() => {
    return cortes.filter((c) => c.estado === 'FACTURADO');
  }, [cortes]);

  const montoFacturado = useMemo(() => {
    return facturadosList.reduce((acc, c) => acc + Number(c.monto), 0);
  }, [facturadosList]);

  const montoRestante = useMemo(() => {
    if (perDay !== null) {
      const lastEnd = facturadosList.length > 0 ? new Date(facturadosList[facturadosList.length - 1].fechaFin) : startDate;
      return Math.round(perDay * calendarDays(lastEnd, new Date(currentContract.fechaFin)) * 100) / 100;
    }
    return Math.max(0, totalAmount - montoFacturado);
  }, [totalAmount, montoFacturado, perDay, facturadosList, startDate, currentContract.fechaFin]);

  // Proyección interactiva de cortes para la vista previa
  const projectedPlan = useMemo(() => {
    const dias = Math.max(1, planPeriodoDias);

    // Si ya hay cortes facturados, proyectar el saldo restante
    const montoAProyectar = facturadosList.length > 0 ? montoRestante : totalAmount;
    const list: {
      numero: number;
      inicio: Date;
      fin: Date;
      monto: number;
    }[] = [];

    // Inicio a partir del último facturado o del inicio del contrato
    let currentStart = new Date(startDate);
    if (facturadosList.length > 0) {
      const lastFacturado = facturadosList[facturadosList.length - 1];
      currentStart = new Date(lastFacturado.fechaFin);
    }
    const targetEnd = new Date(currentContract.fechaFin);
    const numCortes = perDay !== null
      ? Math.ceil(calendarDays(currentStart, targetEnd) / dias)
      : Math.max(1, planCortesCount);
    const totalCentavos = Math.round(montoAProyectar * 100);
    const baseCentavos = Math.floor(totalCentavos / Math.max(1, numCortes));
    let remCentavos = totalCentavos - baseCentavos * numCortes;
    let elapsedDays = 0;

    const startOffset = facturadosList.length;

    for (let i = 1; i <= numCortes; i++) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + dias);
      if (perDay !== null && (currentEnd > targetEnd || i === numCortes)) currentEnd.setTime(targetEnd.getTime());
      const cutDays = calendarDays(currentStart, currentEnd);

      const corteCentavos = baseCentavos + (remCentavos > 0 ? 1 : 0);
      if (remCentavos > 0) remCentavos--;

      list.push({
        numero: startOffset + i,
        inicio: new Date(currentStart),
        fin: new Date(currentEnd),
        monto: perDay !== null
          ? amountForCumulativeDays(perDay, elapsedDays, cutDays)
          : Math.round(corteCentavos) / 100,
      });
      elapsedDays += cutDays;

      currentStart = new Date(currentEnd);
    }
    return list;
  }, [planCortesCount, planPeriodoDias, totalAmount, montoRestante, facturadosList, startDate, currentContract.fechaFin, perDay]);

  const loadCortes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, updatedContract, billingCortes] = await Promise.all([
        getCortes(currentContract.id),
        getContractById(currentContract.id).catch(() => null),
        getContractCortes().catch(() => []),
      ]);
      setCortes(data);
      if (updatedContract) {
        setCurrentContract(updatedContract);
      }
      if (billingCortes && billingCortes.length > 0) {
        setBillingResumenList(billingCortes);
      }

      // Si ya existen cortes en el contrato, tomar en cuenta los cortes existentes
      if (data.length > 0) {
        setCortesInput(String(data.length));
        if (data[0].fechaInicio && data[0].fechaFin) {
          const d1 = new Date(data[0].fechaInicio);
          const d2 = new Date(data[0].fechaFin);
          const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
          setDiasInput(String(diffDays));
        }
      } else {
        // Si no hay cortes, abrir el configurador
        setShowConfigPlan(true);
      }
    } catch {
      setError('Error al cargar la lista de cortes de facturación');
    } finally {
      setIsLoading(false);
    }
  }, [currentContract.id]);

  useEffect(() => {
    void loadCortes();
  }, [loadCortes]);

  const handleApplyNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (perDay === null && planCortesCount < 1) {
      setError('El número de cortes debe ser al menos 1');
      return;
    }
    if (planPeriodoDias < 1) {
      setError('El intervalo de días debe ser al menos 1');
      return;
    }
    if (projectedPlan.length === 0) {
      setError('No quedan días pendientes por programar.');
      return;
    }

    // Validar horas por día en líneas horarias
    for (const item of currentContract.items || []) {
      if (item.tipoTarifa === 'HORA') {
        const hpd = horasPorDiaMap[item.id];
        if (hpd === undefined || hpd <= 0) {
          setError(`Especifique las horas de operación diaria para el equipo: ${item.equipo?.modelo || 'equipo horario'}.`);
          return;
        }
      }
    }

    setIsApplyingPlan(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const horasPorDiaPayload: HorasPorDiaItem[] = (currentContract.items || [])
        .filter((it) => it.tipoTarifa === 'HORA')
        .map((it) => ({
          detalleContratoId: it.id,
          horasPorDia: Number(horasPorDiaMap[it.id] || 8),
        }));

      const updated = await generateCortes(
        currentContract.id,
        planPeriodoDias,
        projectedPlan.length,
        horasPorDiaPayload.length > 0 ? horasPorDiaPayload : undefined,
      );
      setCortes(updated);
      setSuccessMsg(
        `¡Plan de facturación actualizado con éxito! Se proyectaron ${projectedPlan.length} cortes cada ${planPeriodoDias} días.`,
      );
      setShowConfigPlan(false);
      onUpdate?.();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Error al aplicar el plan de cortes de facturación.',
      );
    } finally {
      setIsApplyingPlan(false);
    }
  };

  const handleStartEditCorte = (corte: CorteFacturacion) => {
    setEditingCorteId(corte.id);
    setEditFechaInicio(new Date(corte.fechaInicio).toISOString().split('T')[0]);
    setEditFechaFin(new Date(corte.fechaFin).toISOString().split('T')[0]);
    setEditMonto(String(corte.monto));
  };

  const handleCancelEditCorte = () => {
    setEditingCorteId(null);
    setEditFechaInicio('');
    setEditFechaFin('');
    setEditMonto('');
  };

  const handleSaveEditCorte = async (corteId: string) => {
    setIsSavingEdit(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const montoNum = editMonto ? parseFloat(editMonto) : undefined;
      await updateCorte(currentContract.id, corteId, {
        fechaInicio: editFechaInicio ? new Date(editFechaInicio).toISOString() : undefined,
        fechaFin: editFechaFin ? new Date(editFechaFin).toISOString() : undefined,
        monto: montoNum,
      });

      setSuccessMsg('¡Corte de facturación modificado exitosamente!');
      handleCancelEditCorte();
      loadCortes();
      onUpdate?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar el corte de facturación');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteCorte = async (corteId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este corte de facturación?')) return;

    setDeletingCorteId(corteId);
    setError(null);
    setSuccessMsg(null);

    try {
      await deleteCorte(currentContract.id, corteId);
      setSuccessMsg('¡Corte de facturación eliminado exitosamente!');
      loadCortes();
      onUpdate?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al eliminar el corte de facturación');
    } finally {
      setDeletingCorteId(null);
    }
  };

  const handleCreateManualCorte = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingManual(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const montoNum = montoManual ? Number(montoManual) : undefined;
      await createManualCorte(currentContract.id, fechaCorte, montoNum);
      setSuccessMsg(`¡Corte personalizado para la fecha ${fechaCorte} generado exitosamente!`);
      setMontoManual('');
      loadCortes();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar el corte manual');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleInvoiceCorte = async (corteId: string) => {
    setIsFacturandoId(corteId);
    setError(null);
    setSuccessMsg(null);

    try {
      const factura = await invoiceCorte(corteId, { ...FACTURA_CORTE_CREDITO_30 });

      setSuccessMsg(
        `¡Factura ${factura.folio || 'generada'} emitida a Crédito (30 Días) y cargada a CxC con éxito por C$ ${factura.total?.toLocaleString()}!`,
      );
      loadCortes();
      onUpdate?.();
    } catch (err: any) {
      setError(serverErrorMessage(err, 'Error al emitir la factura del corte'));
    } finally {
      setIsFacturandoId(null);
    }
  };

  const formatDate = (dateStr: string | Date) => {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return d.toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    const val = isNaN(Number(amount)) ? 0 : Number(amount);
    return `C$ ${val.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 bg-[#37474F]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#37474F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10">
              <CreditCard className="w-6 h-6 text-[#1A73E8]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">
                Cortes de Facturación — Contrato {currentContract.codigo}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                Cliente: {currentContract.cliente?.nombre} | Ciclos de cobro periódicos
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

        {/* Tarjeta de Resumen con Precio Base */}
        <div className="bg-linear-to-r from-blue-50/80 to-slate-50 border-b border-[#E5E8EE] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-[#1A73E8]" />
            <div>
              <span className="text-[10px] font-black uppercase text-[#747780] block">
                {perDay !== null ? 'Total proyectado por días de renta' : 'Precio Base Vendido Total'}
              </span>
              <span className="text-base font-black font-mono text-[#1B1D22]">
                {formatCurrency(totalAmount)}
              </span>
              {facturadosList.length > 0 && (
                <span className="text-[10px] text-emerald-700 font-bold block">
                  Facturado: {formatCurrency(montoFacturado)} | Restante: {formatCurrency(montoRestante)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-[#747780] uppercase block">
                Fecha Inicio Contrato
              </span>
              <span className="font-extrabold text-[#1B1D22]">{formatDate(startDate)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowConfigPlan(!showConfigPlan)}
              className="btn-precision-outline text-xs px-3 py-1.5 border-[#1A73E8] text-[#1A73E8] hover:bg-[#E8F0FE] flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showConfigPlan ? 'Ocultar Configuración' : 'Configurar / Dividir en Cortes'}
              {showConfigPlan ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Notificaciones de Éxito / Error */}
        <div className="px-6 pt-3 space-y-2">
          {error && (
            <div className="p-3 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* PANEL DE CONFIGURACIÓN FLEXIBLE DE CORTES (NÚMERO DE CORTES Y FRECUENCIA EN DÍAS) */}
          {showConfigPlan && (
            <form
              onSubmit={handleApplyNewPlan}
              className="bg-linear-to-br from-[#F8FAFC] to-[#EFF6FF] border-2 border-[#1A73E8]/30 rounded-3xl p-5 space-y-4 shadow-sm animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#1A73E8] text-white rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider">
                      Configuración del Plan de Cortes de Facturación
                    </h4>
                    <p className="text-[11px] text-[#747780]">
                      {perDay !== null
                        ? `La cantidad de cortes se calcula con la fecha final y la frecuencia. Tarifa diaria: ${formatCurrency(perDay)}.`
                        : `Define en cuántos cortes se divide el monto (${formatCurrency(facturadosList.length > 0 ? montoRestante : totalAmount)}) y la frecuencia en días.`}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#1A73E8] text-white uppercase">
                  Replanificación
                </span>
              </div>

              {/* Sección de Equipos y Unidades de Cobro Contratadas (para contratos mixtos) */}
              {(currentContract.items || []).length > 0 && (
                <div className="bg-white border border-[#E5E8EE] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
                    <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#1A73E8]" /> Equipos y Tarifas Contratadas
                    </span>
                    <span className="text-[10px] font-black uppercase text-[#1A73E8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {currentContract.items?.length} línea(s)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentContract.items?.map((item) => {
                      const isHora = item.tipoTarifa === 'HORA';
                      const currentHpd = horasPorDiaMap[item.id] ?? 8;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl border border-[#E5E8EE] text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                  isHora
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                                }`}
                              >
                                {isHora ? '⏱️ Tarifa Hora' : '📅 Tarifa Día'}
                              </span>
                              <span className="font-extrabold text-[#1B1D22]">
                                {item.equipo?.modelo || item.equipo?.codigo || 'Equipo'}
                              </span>
                              <span className="text-[11px] text-[#747780] font-bold">
                                ({item.cantidad || 1} un.)
                              </span>
                            </div>
                            <span className="text-[10px] text-[#747780] font-mono block">
                              Tarifa: {formatCurrency(item.precioRenta)} / {isHora ? 'hora' : 'día'}
                            </span>
                          </div>

                          {isHora ? (
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className="text-[10px] font-extrabold text-amber-900 uppercase">
                                Horas/día:
                              </span>
                              <input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={currentHpd || ''}
                                onChange={(e) => handleHorasPorDiaChange(item.id, e.target.value)}
                                className="precision-input w-16 text-center font-mono font-black text-xs py-1 bg-white border-amber-300"
                              />
                              <span className="text-[10px] text-amber-800 font-bold">hrs/d</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-500">
                              Día completo
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pregunta 1: Número de cortes */}
                {perDay !== null ? <div className="bg-white border border-[#E5E8EE] rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider block">Cantidad automática de cortes</label>
                  <p className="text-lg font-black text-[#1A73E8]">{projectedPlan.length}</p>
                  <p className="text-xs text-[#37474F]">Cada corte cobra sus días reales. El último termina en la fecha final del contrato.</p>
                </div> : <div className="bg-white border border-[#E5E8EE] rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider block">
                    ¿En cuántos cortes se va a realizar?
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cortesInput}
                      onChange={(e) => {
                        // Permite borrar todo el campo sin forzar número fijo
                        const val = e.target.value.replace(/\D/g, '');
                        setCortesInput(val);
                      }}
                      onBlur={() => {
                        if (!cortesInput || parseInt(cortesInput, 10) < 1) {
                          setCortesInput('1');
                        }
                      }}
                      className="precision-input w-24 text-center text-sm font-black font-mono"
                      placeholder="1"
                    />
                    <span className="text-xs font-bold text-[#37474F]">
                      {planCortesCount === 1 ? 'Corte único' : 'Cortes de facturación'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[1, 2, 3, 4, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCortesInput(String(num))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                          planCortesCount === num
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white text-[#37474F] border-[#E5E8EE] hover:bg-gray-100'
                        }`}
                      >
                        {num} {num === 1 ? 'corte' : 'cortes'}
                      </button>
                    ))}
                  </div>
                </div>}

                {/* Pregunta 2: Días por corte */}
                <div className="bg-white border border-[#E5E8EE] rounded-2xl p-3.5 space-y-2">
                  <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider block">
                    ¿Cada cuántos días se realizará la factura?
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={diasInput}
                      onChange={(e) => {
                        // Permite borrar todo el campo sin forzar número fijo
                        const val = e.target.value.replace(/\D/g, '');
                        setDiasInput(val);
                      }}
                      onBlur={() => {
                        if (!diasInput || parseInt(diasInput, 10) < 1) {
                          setDiasInput('1');
                        }
                      }}
                      className="precision-input w-24 text-center text-sm font-black font-mono"
                      placeholder="1"
                    />
                    <span className="text-xs font-bold text-[#37474F]">
                      Días por corte
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { dias: 7, label: '7d' },
                      { dias: 15, label: '15d' },
                      { dias: 20, label: '20d' },
                      { dias: 30, label: '30d' },
                    ].map((item) => (
                      <button
                        key={item.dias}
                        type="button"
                        onClick={() => setDiasInput(String(item.dias))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                          planPeriodoDias === item.dias
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white text-[#37474F] border-[#E5E8EE] hover:bg-gray-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vista previa de los cortes proyectados con fechas y montos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#1B1D22] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#1A73E8]" />
                    Vista Previa ({projectedPlan.length} cortes · cada {planPeriodoDias} días):
                  </span>
                  <span className="font-black text-[#1A73E8] font-mono">
                    {perDay !== null
                      ? `Total pendiente: ${formatCurrency(projectedPlan.reduce((sum, corte) => sum + corte.monto, 0))}`
                      : `~${formatCurrency((facturadosList.length > 0 ? montoRestante : totalAmount) / planCortesCount)} / corte`}
                  </span>
                </div>

                <div className="border border-[#E5E8EE] rounded-xl overflow-hidden divide-y divide-[#E5E8EE] max-h-36 overflow-y-auto bg-white">
                  {projectedPlan.map((c) => (
                    <div key={c.numero} className="px-3 py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[10px] bg-blue-50 text-[#1A73E8] px-2 py-0.5 rounded">
                          Corte #{c.numero}
                        </span>
                        <span className="text-[#37474F] text-[11px] font-bold">
                          {formatDate(c.inicio)} → {formatDate(c.fin)} ({calendarDays(c.inicio, c.fin)} días)
                        </span>
                      </div>
                      <span className="font-mono font-black text-[#1B1D22]">
                        {formatCurrency(c.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfigPlan(false)}
                  className="btn-precision-outline text-xs py-1.5 px-3"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isApplyingPlan}
                  className="btn-precision-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {isApplyingPlan
                    ? 'Aplicando plan...'
                    : `Aplicar Plan (${projectedPlan.length} cortes cada ${planPeriodoDias} días)`}
                </button>
              </div>
            </form>
          )}

          {/* Listado de Cortes Proyectados / Actuales */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1A73E8]" />
                Historial de Cortes Proyectados del Contrato ({cortes.length})
              </h4>
              {!showConfigPlan && (
                <button
                  type="button"
                  onClick={() => setShowConfigPlan(true)}
                  className="text-xs text-[#1A73E8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Reconfigurar Cortes
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs font-bold text-[#747780]">Cargando plan de cortes...</div>
            ) : cortes.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-[#747780] bg-gray-50 rounded-2xl border border-[#E5E8EE]">
                No hay cortes de facturación proyectados. Utiliza el configurador superior para planificar los cortes.
              </div>
            ) : (
              <div className="space-y-3">
                {cortes.map((corte) => {
                  const isEditing = editingCorteId === corte.id;

                  if (isEditing) {
                    return (
                      <div
                        key={corte.id}
                        className="p-4 rounded-2xl border-2 border-[#1A73E8] bg-blue-50/40 space-y-3 shadow-md animate-fadeIn"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#1A73E8] font-mono">
                            Editando Corte #{corte.numeroCorte}
                          </span>
                          <span className="text-[10px] text-[#747780] font-bold">
                            Modifica fechas o importe
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                              Fecha Inicio
                            </label>
                            <input
                              type="date"
                              value={editFechaInicio}
                              onChange={(e) => setEditFechaInicio(e.target.value)}
                              className="precision-input text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                              Fecha Fin
                            </label>
                            <input
                              type="date"
                              value={editFechaFin}
                              onChange={(e) => setEditFechaFin(e.target.value)}
                              className="precision-input text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                              Monto a Facturar (C$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editMonto}
                              onChange={(e) => setEditMonto(e.target.value)}
                              className="precision-input text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEditCorte}
                            className="btn-precision-outline text-xs py-1.5 px-3 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditCorte(corte.id)}
                            disabled={isSavingEdit}
                            className="btn-precision-primary bg-[#1A73E8] text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-bold"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const isBilled = corte.estado === 'FACTURADO' || (corte.facturas && corte.facturas.length > 0);
                  const billingInfo = billingResumenList.find((b) => b.id === corte.id);

                  const todayCal = rentalCalendarDay(new Date());
                  const corteInicioCal = rentalCalendarDay(corte.fechaInicio);
                  const periodStarted = todayCal >= corteInicioCal;

                  const priorCortes = cortes.filter((c) => c.numeroCorte < corte.numeroCorte);
                  const priorCortesFacturados = priorCortes.every(
                    (c) => c.estado === 'FACTURADO' || (c.facturas && c.facturas.length > 0),
                  );
                  const priorPeriodFinished = priorCortes.every(
                    (c) => todayCal >= rentalCalendarDay(c.fechaFin),
                  );
                  const hasDispatch = perDay === null || Boolean(currentContract.despachos?.length);

                  let canFacturar = false;
                  let tooltipReason = '';

                  if (isBilled) {
                    tooltipReason = 'Factura ya emitida';
                  } else if (billingInfo !== undefined) {
                    canFacturar = billingInfo.disponibleParaFacturar;
                    tooltipReason = billingInfo.motivoBloqueo || (canFacturar ? 'Emitir factura por este período' : 'No disponible para facturar');
                  } else {
                    if (!priorCortesFacturados) {
                      tooltipReason = 'Primero facture el corte anterior';
                    } else if (!priorPeriodFinished) {
                      tooltipReason = 'Disponible cuando termine el corte anterior';
                    } else if (!periodStarted) {
                      tooltipReason = 'Disponible a partir del inicio del período';
                    } else if (!hasDispatch) {
                      tooltipReason = 'Primero registre el despacho físico del equipo';
                    } else {
                      canFacturar = true;
                      tooltipReason = 'Emitir factura por los días realmente utilizados';
                    }
                  }

                  const displayMonto = billingInfo?.monto ?? corte.monto;

                  return (
                    <div
                      key={corte.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isBilled
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-[#E5E8EE] hover:border-[#1A73E8] shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#1B1D22] font-mono bg-white px-2.5 py-0.5 rounded-md border border-[#E5E8EE]">
                            Corte #{corte.numeroCorte}
                          </span>
                          {isBilled ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Facturado
                            </span>
                          ) : canFacturar ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Listo para Facturar
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1" title={tooltipReason}>
                              <Clock className="w-3 h-3" /> {tooltipReason || 'Pendiente de Cobro'}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-[#37474F] flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>
                            Período: <strong>{formatDate(corte.fechaInicio)}</strong> al{' '}
                            <strong>{formatDate(corte.fechaFin)}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E8EE]">
                        <div className="text-right">
                          <span className="text-[9px] font-extrabold text-[#747780] uppercase block">
                            {perDay !== null && !isBilled ? 'Monto calculado' : 'Monto facturado'}
                          </span>
                          <span className="text-base font-black font-mono text-[#1B1D22]">
                            {formatCurrency(displayMonto)}
                          </span>
                        </div>

                        {!isBilled ? (
                          <div className="flex items-center gap-2">
                            {perDay === null && <button
                              type="button"
                              onClick={() => handleStartEditCorte(corte)}
                              title="Modificar fechas o monto de este corte"
                              className="p-2 rounded-xl bg-gray-100 hover:bg-blue-50 text-[#37474F] hover:text-[#1A73E8] transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>}

                            {perDay === null && <button
                              type="button"
                              onClick={() => handleDeleteCorte(corte.id)}
                              disabled={deletingCorteId === corte.id}
                              title="Eliminar este corte"
                              className="p-2 rounded-xl bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>}

                            <button
                              type="button"
                              onClick={() => handleInvoiceCorte(corte.id)}
                              disabled={!canFacturar || !!isFacturandoId}
                              title={tooltipReason}
                              className={`btn-precision-primary text-xs flex items-center gap-1.5 shadow-xs font-bold cursor-pointer ${
                                !canFacturar
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                                  : 'bg-[#37474F] hover:bg-[#1A73E8] text-white'
                              }`}
                            >
                              {isFacturandoId === corte.id ? (
                                <span>Emitiendo Factura...</span>
                              ) : (
                                <>
                                  <Receipt className="w-4 h-4" /> Facturar Corte #{corte.numeroCorte} (C$)
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-extrabold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-300">
                            Factura Emitida
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel para Generar Corte Personalizado (Bajo Demanda) */}
          {perDay === null && <form
            onSubmit={handleCreateManualCorte}
            className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
              <span className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1A73E8]" /> Generar Corte Adicional / Manual
              </span>
              <span className="text-[10px] text-[#747780] font-bold">Corte Bajo Demanda</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Fecha de Corte
                </label>
                <input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  className="precision-input text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  Monto del Corte (C$ Opcional)
                </label>
                <input
                  type="number"
                  placeholder="Calculado automático"
                  value={montoManual}
                  onChange={(e) => setMontoManual(e.target.value)}
                  className="precision-input text-xs font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingManual}
                className="btn-precision-primary bg-[#1A73E8] text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isCreatingManual ? (
                  <span>Generando...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Crear Corte Manual
                  </>
                )}
              </button>
            </div>
          </form>}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E8EE] flex items-center justify-between text-xs text-[#747780]">
          <span>
            Cortes registrados: <strong className="text-[#1B1D22]">{cortes.length}</strong>
          </span>
          <button onClick={onClose} className="btn-precision-outline text-xs cursor-pointer">
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
