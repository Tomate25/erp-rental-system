import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Wrench,
  Receipt,
  CheckCircle2,
  Search,
  Layers,
  ArrowLeft,
  FileCheck,
  X,
} from 'lucide-react';
import type { Factura, GastoReparacion, ReparacionRetorno, RetornoConDanos } from '../types/billing.types';
import { invoiceDamageReturn, saveRepair } from '../services/billing.api';
import { formatCurrency } from '../../../shared/utils/formatters';

type Props = {
  returns: RetornoConDanos[];
  invoices: Factura[];
  onRefresh: () => Promise<void>;
  onOpenInvoice: (invoice: Factura) => void;
  canEditRepair: boolean;
  canInvoice: boolean;
};

const emptyExpense = (chargeable = true): GastoReparacion => ({
  tipo: 'REPUESTO',
  descripcion: '',
  monto: 0,
  comprobanteUrl: '',
  cobrableCliente: chargeable,
});

function isReturnFinalizado(retorno: RetornoConDanos): boolean {
  if (retorno.facturaCargo) return true;
  const repairs = retorno.items.flatMap((item) => item.reparaciones);
  return repairs.length > 0 && repairs.every((r) => r.estado === 'COMPLETADO');
}

function RepairEditor({
  repair,
  onRefresh,
  editable,
}: {
  repair: ReparacionRetorno;
  onRefresh: () => Promise<void>;
  editable: boolean;
}) {
  const [expenses, setExpenses] = useState<GastoReparacion[]>(
    repair.gastos?.length ? repair.gastos : [emptyExpense(repair.cobrableCliente)],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const total = expenses.reduce((sum, expense) => sum + Number(expense.monto || 0), 0);

  const update = (index: number, field: keyof GastoReparacion, value: string | number | boolean) => {
    setExpenses((current) =>
      current.map((expense, position) =>
        position === index ? { ...expense, [field]: value } : expense,
      ),
    );
  };

  const submit = async () => {
    if (
      expenses.some(
        (expense) =>
          !expense.descripcion.trim() ||
          !Number.isFinite(Number(expense.monto)) ||
          Number(expense.monto) <= 0,
      )
    ) {
      setError('Cada gasto necesita descripción y monto mayor que cero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveRepair(
        repair.id,
        expenses.map((expense) => ({ ...expense, monto: Number(expense.monto) })),
      );
      await onRefresh();
    } catch (reason: any) {
      setError(reason.response?.data?.message || 'No se pudo guardar la reparación.');
    } finally {
      setSaving(false);
    }
  };

  if (repair.estado === 'COMPLETADO') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-900 font-extrabold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reparación terminada
          </span>
          <span className="text-xs font-black font-mono text-emerald-900">
            Costo real: {formatCurrency(repair.costo)}
          </span>
        </div>
        {repair.gastos && repair.gastos.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-emerald-200/60">
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider block">
              Desglose de gastos registrados:
            </span>
            <div className="divide-y divide-emerald-200/40 text-xs">
              {repair.gastos.map((g, idx) => (
                <div key={idx} className="py-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800">
                      {g.tipo}
                    </span>
                    <span className="text-gray-700 font-medium">{g.descripcion}</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">
                    {formatCurrency(g.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!editable) {
    return (
      <p className="text-xs text-[#747780]">
        Reparación en proceso. Taller registrará los gastos reales antes de facturar.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-amber-900">Gastos reales de reparación</span>
        <span className="text-xs font-black text-amber-900">Total: {formatCurrency(total)}</span>
      </div>
      {expenses.map((expense, index) => (
        <div
          key={index}
          className="grid grid-cols-1 sm:grid-cols-[110px_1fr_115px_1fr_110px_32px] gap-2"
        >
          <select
            value={expense.tipo}
            onChange={(event) => update(index, 'tipo', event.target.value)}
            className="precision-input text-xs"
            aria-label="Tipo de gasto"
          >
            <option value="REPUESTO">Repuesto</option>
            <option value="MANO_OBRA">Mano de obra</option>
            <option value="TERCERO">Servicio externo</option>
          </select>
          <input
            value={expense.descripcion}
            onChange={(event) => update(index, 'descripcion', event.target.value)}
            className="precision-input text-xs"
            placeholder="Descripción del gasto"
            aria-label="Descripción del gasto"
          />
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={expense.monto || ''}
            onChange={(event) => update(index, 'monto', event.target.value)}
            className="precision-input text-xs"
            placeholder="C$"
            aria-label="Monto del gasto"
          />
          <input
            value={expense.comprobanteUrl || ''}
            onChange={(event) => update(index, 'comprobanteUrl', event.target.value)}
            className="precision-input text-xs"
            placeholder="URL del comprobante"
            aria-label="Comprobante del gasto"
          />
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={expense.cobrableCliente !== false}
              onChange={(event) => update(index, 'cobrableCliente', event.target.checked)}
            />{' '}
            Cobrar cliente
          </label>
          <button
            type="button"
            onClick={() => setExpenses((current) => current.filter((_, position) => position !== index))}
            className="text-red-700 cursor-pointer"
            aria-label="Quitar gasto"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpenses((current) => [...current, emptyExpense(repair.cobrableCliente)])}
          className="btn-precision-outline text-xs cursor-pointer"
        >
          <Plus size={14} /> Agregar gasto
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !expenses.length}
          className="btn-precision-primary text-xs cursor-pointer"
        >
          {saving ? 'Guardando...' : 'Terminar reparación y guardar costo'}
        </button>
      </div>
    </div>
  );
}

export function DamageChargesPanel({
  returns,
  invoices,
  onRefresh,
  onOpenInvoice,
  canEditRepair,
  canInvoice,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'EN_MANTENIMIENTO' | 'FINALIZADOS' | 'TODOS'>('EN_MANTENIMIENTO');
  const [searchTerm, setSearchTerm] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');
  const selected = returns.find((retorno) => retorno.id === selectedId);

  const { enMantenimientoList, finalizadosList } = useMemo(() => {
    const enMantenimiento: RetornoConDanos[] = [];
    const finalizados: RetornoConDanos[] = [];

    for (const r of returns) {
      if (isReturnFinalizado(r)) {
        finalizados.push(r);
      } else {
        enMantenimiento.push(r);
      }
    }

    return { enMantenimientoList: enMantenimiento, finalizadosList: finalizados };
  }, [returns]);

  // Contadores para KPIs
  const totalEquiposEnTaller = useMemo(() => {
    return enMantenimientoList.reduce((acc, r) => acc + (r.items?.length || 1), 0);
  }, [enMantenimientoList]);

  const totalEquiposFinalizados = useMemo(() => {
    return finalizadosList.reduce((acc, r) => acc + (r.items?.length || 1), 0);
  }, [finalizadosList]);

  const totalFacturadoOrCosto = useMemo(() => {
    return finalizadosList.reduce((sum, r) => {
      if (r.facturaCargo?.total) return sum + Number(r.facturaCargo.total);
      const repairsCost = r.items
        .flatMap((i) => i.reparaciones)
        .reduce((s, rep) => s + Number(rep.costo || 0), 0);
      return sum + repairsCost;
    }, 0);
  }, [finalizadosList]);

  // Filtrado según tab y búsqueda
  const displayedReturns = useMemo(() => {
    let list =
      activeTab === 'EN_MANTENIMIENTO'
        ? enMantenimientoList
        : activeTab === 'FINALIZADOS'
          ? finalizadosList
          : returns;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) => {
        const matchClient = r.contrato?.cliente?.nombre?.toLowerCase().includes(q);
        const matchContract = r.contrato?.codigo?.toLowerCase().includes(q);
        const matchFolio = r.facturaCargo?.folio?.toLowerCase().includes(q);
        const matchEquipment = r.items?.some(
          (it) =>
            it.equipo?.modelo?.toLowerCase().includes(q) ||
            it.equipo?.codigo?.toLowerCase().includes(q) ||
            it.inspeccionesDanio?.some(
              (d) =>
                d.componente?.toLowerCase().includes(q) ||
                d.tipoDano?.toLowerCase().includes(q),
            ),
        );
        return matchClient || matchContract || matchFolio || matchEquipment;
      });
    }
    return list;
  }, [activeTab, enMantenimientoList, finalizadosList, returns, searchTerm]);

  const issue = async (id: string) => {
    if (!confirm('¿Emitir factura por los gastos reales de esta reparación?')) return;
    setIssuing(true);
    setError('');
    try {
      const invoice = await invoiceDamageReturn(id);
      await onRefresh();
      onOpenInvoice(invoice);
    } catch (reason: any) {
      setError(reason.response?.data?.message || 'No se pudo emitir la factura por daños.');
    } finally {
      setIssuing(false);
    }
  };

  if (!selected) {
    return (
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
              <Wrench className="w-6 h-6 text-[#C55500]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#747780] tracking-wider block">
                En Mantenimiento
              </span>
              <span className="text-2xl font-black text-[#1B1D22]">
                {totalEquiposEnTaller}
              </span>
              <p className="text-[11px] text-[#747780] font-medium">Equipos en taller activo</p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#747780] tracking-wider block">
                Finalizados y Facturación
              </span>
              <span className="text-2xl font-black text-[#1B1D22]">
                {totalEquiposFinalizados}
              </span>
              <p className="text-[11px] text-[#747780] font-medium">Reparaciones concluidas</p>
            </div>
          </div>

          <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
              <Receipt className="w-6 h-6 text-[#1A73E8]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#747780] tracking-wider block">
                Monto en Reparaciones
              </span>
              <span className="text-2xl font-black font-mono text-[#1B1D22]">
                {formatCurrency(totalFacturadoOrCosto)}
              </span>
              <p className="text-[11px] text-[#747780] font-medium">Facturado / concluido</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5E8EE]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('EN_MANTENIMIENTO')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'EN_MANTENIMIENTO'
                  ? 'bg-[#37474F] text-white shadow-xs'
                  : 'bg-transparent text-[#747780] hover:bg-gray-100'
              }`}
            >
              <Wrench className="w-4 h-4 text-[#C55500]" />
              <span>En Mantenimiento</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === 'EN_MANTENIMIENTO'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-900 font-extrabold'
                }`}
              >
                {enMantenimientoList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FINALIZADOS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'FINALIZADOS'
                  ? 'bg-[#37474F] text-white shadow-xs'
                  : 'bg-transparent text-[#747780] hover:bg-gray-100'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Finalizados y Facturación</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === 'FINALIZADOS'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-900 font-extrabold'
                }`}
              >
                {finalizadosList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TODOS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'TODOS'
                  ? 'bg-[#37474F] text-white shadow-xs'
                  : 'bg-transparent text-[#747780] hover:bg-gray-100'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Todos los Equipos</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === 'TODOS'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-800 font-extrabold'
                }`}
              >
                {returns.length}
              </span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por equipo, cliente, contrato..."
              className="precision-input text-xs pl-9 pr-8 w-full"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List / Cards of Returns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedReturns.map((retorno) => {
            const repairs = retorno.items.flatMap((item) => item.reparaciones);
            const isFinalizado = isReturnFinalizado(retorno);
            const isFacturado = Boolean(retorno.facturaCargo);
            const completedRepairs = repairs.filter((r) => r.estado === 'COMPLETADO').length;
            const totalRepairsCost = repairs.reduce((sum, r) => sum + Number(r.costo || 0), 0);

            return (
              <button
                type="button"
                key={retorno.id}
                onClick={() => setSelectedId(retorno.id)}
                className={`group bg-white border rounded-2xl p-5 text-left transition-all hover:shadow-md cursor-pointer ${
                  isFacturado
                    ? 'border-emerald-200 hover:border-emerald-400'
                    : isFinalizado
                      ? 'border-blue-200 hover:border-blue-400'
                      : 'border-[#E5E8EE] hover:border-[#C55500]'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-3 border-b border-[#E5E8EE] pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#1A73E8] font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {retorno.contrato.codigo}
                      </span>
                      <span className="text-[11px] text-[#747780] font-medium">
                        Retorno: {new Date(retorno.fechaDevolucion).toLocaleDateString('es-NI')}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-[#1B1D22] text-sm line-clamp-1">
                      {retorno.contrato.cliente.nombre}
                    </h3>
                  </div>

                  <div>
                    {isFacturado ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <Receipt className="w-3.5 h-3.5" /> Facturado
                      </span>
                    ) : isFinalizado ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Listo para Facturar
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                        <Wrench className="w-3.5 h-3.5 text-[#C55500]" /> En Mantenimiento {repairs.length > 0 ? `(${completedRepairs}/${repairs.length})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lista de Equipos y Daños */}
                <div className="space-y-2 py-3">
                  {retorno.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-gray-50 rounded-xl border border-[#E5E8EE] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#1B1D22]">
                          <Wrench className="w-3.5 h-3.5 text-gray-500" />
                          <span>{item.equipo.modelo}</span>
                          {item.equipo.codigo && (
                            <span className="text-[10px] font-mono font-black text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                              {item.equipo.codigo}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#747780]">
                          {item.reparaciones?.some((r) => r.estado === 'COMPLETADO')
                            ? 'Reparación Concluida'
                            : 'En Taller'}
                        </span>
                      </div>

                      {item.inspeccionesDanio && item.inspeccionesDanio.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {item.inspeccionesDanio.map((d) => (
                            <span
                              key={d.id}
                              className="text-[9px] font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-[#C55500]" />
                              {d.componente}: {d.tipoDano}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer de la tarjeta */}
                <div className="flex items-center justify-between border-t border-[#E5E8EE] pt-3 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#747780] block">
                      {isFacturado ? 'Monto Facturado' : 'Costo de Reparación'}
                    </span>
                    <span className="font-mono font-black text-sm text-[#1B1D22]">
                      {formatCurrency(totalRepairsCost)}
                    </span>
                    {isFacturado && retorno.facturaCargo?.folio && (
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        Folio: {retorno.facturaCargo.folio}
                      </span>
                    )}
                  </div>

                  <span className="font-bold text-[#1A73E8] flex items-center gap-1 text-xs group-hover:translate-x-0.5 transition-transform">
                    {isFinalizado ? 'Ver detalle y factura →' : 'Gestionar reparación →'}
                  </span>
                </div>
              </button>
            );
          })}

          {!displayedReturns.length && (
            <div className="col-span-full bg-white border border-[#E5E8EE] p-12 rounded-3xl text-center shadow-xs">
              <Wrench className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h4 className="text-sm font-black text-[#1B1D22]">
                {searchTerm
                  ? `No se encontraron resultados para "${searchTerm}"`
                  : activeTab === 'EN_MANTENIMIENTO'
                    ? 'No hay equipos actualmente en mantenimiento en el taller'
                    : activeTab === 'FINALIZADOS'
                      ? 'No hay reparaciones finalizadas o enviadas a facturación'
                      : 'No hay retornos con daños registrados'}
              </h4>
              <p className="text-xs text-[#747780] mt-1">
                {activeTab === 'EN_MANTENIMIENTO'
                  ? 'Cuando un cliente retorne un equipo con daños detectados, aparecerá en esta sección para registro de gastos.'
                  : 'Las reparaciones concluidas y transferidas a facturación se archivarán aquí.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de Detalle de un Retorno Seleccionado
  const chargeable = selected.items
    .flatMap((item) => item.reparaciones)
    .filter((repair) => repair.cobrableCliente);
  const total = chargeable
    .flatMap((repair) => repair.gastos || [])
    .filter((expense) => expense.cobrableCliente !== false)
    .reduce((sum, expense) => sum + Number(expense.monto), 0);
  const ready =
    chargeable.length > 0 &&
    total > 0 &&
    chargeable.every((repair) => repair.estado === 'COMPLETADO' && Number(repair.costo) > 0);
  const existing = invoices.find((invoice) => invoice.id === selected.facturaCargo?.id);
  const isSelectedFinalizado = isReturnFinalizado(selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            setError('');
          }}
          className="btn-precision-outline text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={14} /> Volver a equipos
        </button>

        <div>
          {selected.facturaCargo ? (
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Facturado ({selected.facturaCargo.folio})
            </span>
          ) : isSelectedFinalizado ? (
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Listo para Facturar
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#C55500]" /> En Mantenimiento (Taller)
            </span>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E5E8EE] p-5 rounded-2xl shadow-xs">
        <h2 className="font-extrabold text-base text-[#1B1D22]">
          {selected.contrato.cliente.nombre}
        </h2>
        <p className="text-xs text-[#747780] font-medium mt-0.5">
          Contrato <strong className="text-[#1A73E8]">{selected.contrato.codigo}</strong> · Recepción de Retorno:{' '}
          {new Date(selected.fechaDevolucion).toLocaleDateString('es-NI')}
        </p>
      </div>

      {selected.items.map((item) => (
        <div key={item.id} className="bg-white border border-[#E5E8EE] p-5 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
            <h3 className="font-extrabold text-sm text-[#1B1D22] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#C55500]" />
              {item.equipo.modelo} · {item.equipo.codigo || 'Sin código'}
            </h3>
          </div>

          {item.inspeccionesDanio.map((damage) => (
            <p key={damage.id} className="text-xs text-[#37474F] flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#C55500]" />
              <span>
                <strong>{damage.componente}:</strong> {damage.tipoDano} ·{' '}
                <span className={damage.cobrable ? 'text-amber-800 font-bold' : 'text-gray-500'}>
                  {damage.cobrable ? 'Cobrable al cliente' : 'Costo interno de taller'}
                </span>
              </span>
            </p>
          ))}

          {item.reparaciones.map((repair) => (
            <div key={repair.id} className="space-y-2 pt-2">
              <p className="text-xs font-bold text-[#1B1D22]">
                {repair.descripcion} ·{' '}
                <span className={repair.cobrableCliente ? 'text-blue-700' : 'text-gray-500'}>
                  {repair.cobrableCliente ? 'Cargo al cliente' : 'No cobrable'}
                </span>
              </p>
              <RepairEditor repair={repair} onRefresh={onRefresh} editable={canEditRepair} />
            </div>
          ))}

          {!item.reparaciones.length && (
            <p className="text-xs text-red-700 font-medium">
              Este equipo aún no tiene una orden de reparación registrada en taller.
            </p>
          )}
        </div>
      ))}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="bg-white border border-[#E5E8EE] p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <p className="text-xs text-[#747780] font-bold">Gastos cobrables terminados</p>
          <p className="text-lg font-black font-mono text-[#1B1D22]">{formatCurrency(total)}</p>
        </div>

        {selected.facturaCargo ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Factura: {selected.facturaCargo.folio}
            </span>
            {existing && (
              <button
                type="button"
                onClick={() => onOpenInvoice(existing)}
                className="btn-precision-outline text-xs flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <Receipt size={14} /> Ver Factura
              </button>
            )}
          </div>
        ) : canInvoice ? (
          <button
            type="button"
            disabled={!ready || issuing}
            onClick={() => issue(selected.id)}
            className="btn-precision-primary text-xs flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <Receipt size={15} /> {issuing ? 'Emitiendo Factura...' : 'Emitir factura por daños'}
          </button>
        ) : (
          <div className="text-right">
            {ready ? (
              <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Reparación terminada · Enviada a Facturación
              </span>
            ) : (
              <span className="text-xs font-medium text-[#747780]">
                Facturación emitirá el cargo cuando taller concluya la reparación.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
