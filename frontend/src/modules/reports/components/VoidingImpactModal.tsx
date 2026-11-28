import { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Package,
  Calculator,
  Link2,
  CheckCircle2,
  ArrowRight,
  Ban,
  Info,
} from 'lucide-react';
import type {
  ExecuteVoidingResult,
  VoidingImpactPreview,
} from '../types/reports.types';

interface VoidingImpactModalProps {
  preview: VoidingImpactPreview | null;
  loading: boolean;
  canExecute: boolean;
  onClose: () => void;
  onConfirmVoid: (motivo: string) => Promise<ExecuteVoidingResult>;
}

const fmtCurrency = (val: number) =>
  `C$ ${Number(val || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function VoidingImpactModal({
  preview,
  loading,
  canExecute,
  onClose,
  onConfirmVoid,
}: VoidingImpactModalProps) {
  const [motivo, setMotivo] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExecuteVoidingResult | null>(null);

  if (!loading && !preview) return null;

  const handleExecute = async () => {
    if (!preview || !preview.puedeAnular) return;
    if (motivo.trim().length < 5) {
      setError('Debe indicar un motivo de anulación de al menos 5 caracteres.');
      return;
    }
    if (!confirmed) {
      setError(
        'Marque la casilla de confirmación para autorizar los ajustes en inventario y contabilidad.',
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await onConfirmVoid(motivo.trim());
      setResult(res);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          'No se pudo ejecutar la anulación del documento.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Anulación de Documento e Impacto en Inventario y Contabilidad"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black tracking-tight truncate">
                {preview
                  ? preview.puedeAnular
                    ? `Anular ${preview.tipoDocumento.replace(/_/g, ' ')} ${preview.codigo}`
                    : `Detalle de Anulación · ${preview.tipoDocumento.replace(/_/g, ' ')} ${preview.codigo}`
                  : 'Cargando detalle de anulación...'}
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Revisa el efecto real en Inventario, Cuentas Contables y documentos vinculados antes de confirmar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/70">
          {loading ? (
            <div className="py-16 text-center text-sm font-semibold text-slate-500">
              Calculando saldos de cuentas contables y reservas de inventario...
            </div>
          ) : result ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-black text-emerald-950">
                    Documento {result.codigo} anulado correctamente
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Registrado en bitácora forense el{' '}
                    {new Date(result.fechaAnulacion).toLocaleString('es-NI')}.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white rounded-xl p-3 border border-emerald-200">
                  <span className="text-slate-500 block font-semibold">Motivo registrado</span>
                  <span className="font-bold text-slate-900">{result.motivo}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-emerald-200">
                  <span className="text-slate-500 block font-semibold">Asiento de Reversión</span>
                  <span className="font-bold text-slate-900">
                    {result.asientoReversionNumero || 'Exclusión automática en Libro Diario'}
                  </span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-emerald-200">
                  <span className="text-slate-500 block font-semibold">Ítems de Inventario ajustados</span>
                  <span className="font-bold text-slate-900">
                    {result.impactoAplicado.inventario.items.length} registro(s)
                  </span>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Volver al listado
                </button>
              </div>
            </div>
          ) : preview ? (
            <>
              {/* Resumen del documento */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 shadow-xs">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Documento</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{preview.codigo}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Fecha</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{preview.fecha || '-'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Cliente / Tercero</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate" title={preview.tercero}>
                    {preview.tercero}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Monto</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">
                    {fmtCurrency(preview.monto)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Transición Estado</span>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-extrabold">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {preview.estadoActual}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                      {preview.estadoResultante}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloqueos */}
              {preview.bloqueos.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    Anulación bloqueada por integridad operativa / contable
                  </div>
                  <ul className="list-disc pl-5 text-xs text-rose-900 space-y-1">
                    {preview.bloqueos.map((b, i) => (
                      <li key={i} className="font-semibold">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advertencias */}
              {preview.advertencias.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Consideraciones importantes
                  </div>
                  {preview.advertencias.map((adv, i) => (
                    <p key={i} className="text-xs text-amber-900 font-medium">
                      • {adv}
                    </p>
                  ))}
                </div>
              )}

              {/* SECCIÓN 1: COMPORTAMIENTO DEL INVENTARIO */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-900/5 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      1. Comportamiento del Inventario ({preview.impactoInventario.tipoInventario.replace(/_/g, ' ')})
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                      preview.impactoInventario.tieneImpacto
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {preview.impactoInventario.tieneImpacto
                      ? `${preview.impactoInventario.items.length} ítem(s) afectados`
                      : 'Sin afectación física'}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{preview.impactoInventario.resumen}</span>
                  </p>
                  {preview.impactoInventario.items.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold">Código</th>
                            <th className="px-3 py-2 text-left font-bold">Equipo / Insumo</th>
                            <th className="px-3 py-2 text-center font-bold">Estado Actual</th>
                            <th className="px-3 py-2 text-center font-bold">Estado Resultante</th>
                            <th className="px-3 py-2 text-right font-bold">Stock Actual</th>
                            <th className="px-3 py-2 text-right font-bold">Cambio</th>
                            <th className="px-3 py-2 text-right font-bold">Stock Final</th>
                            <th className="px-3 py-2 text-left font-bold">Efecto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.impactoInventario.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">
                                {item.codigo}
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                {item.nombre}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                  {item.estadoActual}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  {item.estadoResultante}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {item.stockActual}
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-black tabular-nums ${
                                  item.cambioStock > 0
                                    ? 'text-emerald-600'
                                    : item.cambioStock < 0
                                      ? 'text-rose-600'
                                      : 'text-slate-500'
                                }`}
                              >
                                {item.cambioStock > 0
                                  ? `+${item.cambioStock}`
                                  : item.cambioStock}
                              </td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums">
                                {item.stockResultante}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{item.detalle}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 2: IMPACTO EN CUENTAS CONTABLES */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-900/5 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      2. Impacto en Cuentas Contables (Partida Doble y Saldos Antes / Después)
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                      preview.impactoContable.tieneImpacto
                        ? preview.impactoContable.cuadrado
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {preview.impactoContable.tieneImpacto
                      ? preview.impactoContable.cuadrado
                        ? 'Partida Cuadrada ✓'
                        : 'Descuadre detectado'
                      : 'Sin movimiento contable'}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {preview.impactoContable.resumen}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">
                        Efecto en Balance General
                      </span>
                      <p className="text-slate-800 font-medium">
                        {preview.impactoContable.efectoBalanceGeneral}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">
                        Efecto en Estado de Resultados (P&amp;L)
                      </span>
                      <p className="text-slate-800 font-medium">
                        {preview.impactoContable.efectoEstadoResultados}
                      </p>
                    </div>
                  </div>

                  {preview.impactoContable.partidasReversion.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-900 text-white uppercase text-[10px]">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold">Código</th>
                            <th className="px-3 py-2 text-left font-bold">Cuenta Contable</th>
                            <th className="px-3 py-2 text-center font-bold">Naturaleza</th>
                            <th className="px-3 py-2 text-right font-bold">Saldo Antes</th>
                            <th className="px-3 py-2 text-right font-bold">Debe (C$)</th>
                            <th className="px-3 py-2 text-right font-bold">Haber (C$)</th>
                            <th className="px-3 py-2 text-right font-bold">Saldo Después</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.impactoContable.partidasReversion.map((linea, idx) => (
                            <tr key={`${linea.cuentaCodigo}-${idx}`} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">
                                {linea.cuentaCodigo}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-bold text-slate-900">{linea.cuentaNombre}</div>
                                <div className="text-[11px] text-slate-500">{linea.concepto}</div>
                              </td>
                              <td className="px-3 py-2 text-center text-[11px] font-semibold text-slate-600">
                                {linea.naturaleza}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                                {fmtCurrency(linea.saldoAntes)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-bold text-blue-700">
                                {linea.debe > 0 ? fmtCurrency(linea.debe) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-bold text-rose-700">
                                {linea.haber > 0 ? fmtCurrency(linea.haber) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-black text-slate-900">
                                {fmtCurrency(linea.saldoDespues)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black text-slate-900">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-right uppercase text-[11px]">
                              Totales Reversión:
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-blue-800">
                              {fmtCurrency(preview.impactoContable.totalDebe)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-rose-800">
                              {fmtCurrency(preview.impactoContable.totalHaber)}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-700 text-[11px]">
                              {preview.impactoContable.cuadrado ? 'CUADRADO' : 'REVISAR'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 3: DOCUMENTOS RELACIONADOS */}
              {preview.documentosRelacionados.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="px-5 py-3 bg-slate-900/5 border-b border-slate-200 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      3. Documentos Vinculados que se Actualizarán
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {preview.documentosRelacionados.map((rel, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-900">
                            {rel.tipo.replace(/_/g, ' ')} · {rel.codigo}
                          </span>
                          <p className="text-slate-600 mt-0.5">{rel.detalle}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-bold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {rel.estadoActual}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            {rel.estadoResultante}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONFIRMACIÓN DE ANULACIÓN */}
              {preview.puedeAnular && canExecute && (
                <div className="bg-white border-2 border-rose-200 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">
                    Confirmar Anulación Permanente
                  </h4>
                  <div>
                    <label
                      htmlFor="motivo-anulacion-input"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Motivo oficial de anulación (obligatorio para bitácora y contabilidad) *
                    </label>
                    <textarea
                      id="motivo-anulacion-input"
                      rows={2}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej.: Error en tarifa aplicada / Cliente desistió antes del despacho / Factura duplicada..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      He verificado el comportamiento detallado en <strong>Inventario</strong> y{' '}
                      <strong>Cuentas Contables</strong>, y autorizo ejecutar la anulación de{' '}
                      <strong>{preview.codigo}</strong>.
                    </span>
                  </label>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleExecute}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Ban className="w-4 h-4" />
                      {submitting ? 'Anulando documento...' : 'Confirmar Anulación'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
