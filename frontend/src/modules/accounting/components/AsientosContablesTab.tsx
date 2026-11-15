import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Ban,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import catalogoBmJson from '../data/catalogo-cuentas-bm.json';
import {
  anularAsientoManual,
  type AsientoContableItem,
  crearAsientoManual,
  type CuentaCatalogo,
  getCatalogoCuentas,
  listarAsientosContables,
} from '../services/accounting.api';

interface LineaDraft {
  key: string;
  cuentaCodigo: string;
  debe: string;
  haber: string;
  conceptoLinea: string;
}

interface PlantillaContable {
  id: string;
  titulo: string;
  descripcion: string;
  tipoAsiento: 'INGRESOS' | 'EGRESOS' | 'DIARIO' | 'AJUSTE' | 'APERTURA' | 'CIERRE';
  concepto: string;
  lineas: Array<{ cuentaCodigo: string; lado: 'DEBE' | 'HABER'; conceptoLinea: string }>;
}

const PLANTILLAS_OPERATIVAS: PlantillaContable[] = [
  {
    id: 'PAGO_PROVEEDOR',
    titulo: 'Pago a Proveedor (CxP)',
    descripcion: 'Cancela factura o saldo de proveedor contra banco LA FISE / BANPRO',
    tipoAsiento: 'EGRESOS',
    concepto: 'Abono / Cancelación a proveedor según comprobante de egreso',
    lineas: [
      { cuentaCodigo: '210113', lado: 'DEBE', conceptoLinea: 'Cancelación cuenta por pagar proveedor' },
      { cuentaCodigo: '110201', lado: 'HABER', conceptoLinea: 'Transferencia bancaria LA FISE' },
    ],
  },
  {
    id: 'GASTO_CAJA_CHICA',
    titulo: 'Gasto Operativo / Caja Chica',
    descripcion: 'Viáticos, papelería, combustibles o gastos menores pagados de Caja Chica',
    tipoAsiento: 'EGRESOS',
    concepto: 'Reembolso / Gasto operativo pagado por Caja Chica',
    lineas: [
      { cuentaCodigo: '610103', lado: 'DEBE', conceptoLinea: 'Gasto operativo / viáticos' },
      { cuentaCodigo: '110102', lado: 'HABER', conceptoLinea: 'Desembolso de Caja Chica' },
    ],
  },
  {
    id: 'TRASPASO_BANCOS',
    titulo: 'Traspaso Caja / Bancos',
    descripcion: 'Depósito de Caja General a Banco o traslado entre cuentas bancarias',
    tipoAsiento: 'INGRESOS',
    concepto: 'Traslado de efectivo de Caja General hacia Banco',
    lineas: [
      { cuentaCodigo: '110201', lado: 'DEBE', conceptoLinea: 'Ingreso a cuenta bancaria destino' },
      { cuentaCodigo: '110101', lado: 'HABER', conceptoLinea: 'Salida de Caja General' },
    ],
  },
  {
    id: 'PRESTAMO_BANCARIO',
    titulo: 'Abono Préstamo e Intereses',
    descripcion: 'Amortización de capital préstamo bancario más intereses y comisiones',
    tipoAsiento: 'EGRESOS',
    concepto: 'Pago de cuota de préstamo bancario e intereses del mes',
    lineas: [
      { cuentaCodigo: '220101', lado: 'DEBE', conceptoLinea: 'Abono a capital de préstamo bancario' },
      { cuentaCodigo: '610203', lado: 'DEBE', conceptoLinea: 'Intereses bancarios del periodo' },
      { cuentaCodigo: '110201', lado: 'HABER', conceptoLinea: 'Débito en cuenta bancaria' },
    ],
  },
  {
    id: 'PAGO_IMPUESTOS_INSS',
    titulo: 'Pago Impuestos / INSS / INATEC',
    descripcion: 'Declaración y pago DGI (IVA / IR), Alcaldía ALMA, INSS o INATEC',
    tipoAsiento: 'EGRESOS',
    concepto: 'Liquidación y pago mensual de impuestos / cargas sociales',
    lineas: [
      { cuentaCodigo: '210201', lado: 'DEBE', conceptoLinea: 'Cancelación IVA / Impuesto por pagar' },
      { cuentaCodigo: '110201', lado: 'HABER', conceptoLinea: 'Pago electrónico DGI / Banco' },
    ],
  },
  {
    id: 'DEPRECIACION_ACTIVOS',
    titulo: 'Depreciación Mensual Flota',
    descripcion: 'Reconocimiento mensual de depreciación acumulada de maquinaria o vehículos',
    tipoAsiento: 'AJUSTE',
    concepto: 'Registro de depreciación mensual de maquinaria y equipos',
    lineas: [
      { cuentaCodigo: '610112', lado: 'DEBE', conceptoLinea: 'Gasto por depreciación / flota del periodo' },
      { cuentaCodigo: '120904', lado: 'HABER', conceptoLinea: 'Depreciación acumulada de maquinaria' },
    ],
  },
  {
    id: 'ASIENTO_LIBRE',
    titulo: 'Asiento Libre / Ajuste',
    descripcion: 'Comprobante personalizado con cualquier cuenta de detalle BM',
    tipoAsiento: 'DIARIO',
    concepto: '',
    lineas: [
      { cuentaCodigo: '110101', lado: 'DEBE', conceptoLinea: '' },
      { cuentaCodigo: '410401', lado: 'HABER', conceptoLinea: '' },
    ],
  },
];

const formatCurrency = (val: number) =>
  `C$ ${Number(val || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const AsientosContablesTab: React.FC<{ onAsientoRegistrado?: () => void }> = ({
  onAsientoRegistrado,
}) => {
  const fallbackDetalle = useMemo(
    () =>
      (catalogoBmJson as CuentaCatalogo[]).filter((c) => c.aceptaMovimiento === true),
    [],
  );

  const [cuentasDetalle, setCuentasDetalle] = useState<CuentaCatalogo[]>(fallbackDetalle);
  const [asientos, setAsientos] = useState<AsientoContableItem[]>([]);
  const [filtroOrigen, setFiltroOrigen] = useState<string>('TODOS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Formulario del nuevo asiento
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [tipoAsiento, setTipoAsiento] = useState<
    'INGRESOS' | 'EGRESOS' | 'DIARIO' | 'AJUSTE' | 'APERTURA' | 'CIERRE'
  >('DIARIO');
  const [documentoReferencia, setDocumentoReferencia] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('');
  const [lineas, setLineas] = useState<LineaDraft[]>([
    { key: 'l-1', cuentaCodigo: '610103', debe: '', haber: '', conceptoLinea: '' },
    { key: 'l-2', cuentaCodigo: '110102', debe: '', haber: '', conceptoLinea: '' },
  ]);

  const cargarDatos = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [resAsientos, resCat] = await Promise.all([
        listarAsientosContables({ origenModulo: filtroOrigen, limit: 100 }),
        getCatalogoCuentas(4),
      ]);
      if (resAsientos?.asientos) setAsientos(resAsientos.asientos);
      if (resCat?.cuentas?.length) {
        setCuentasDetalle(resCat.cuentas.filter((c) => c.aceptaMovimiento));
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Error al cargar comprobantes contables');
    } finally {
      setIsLoading(false);
    }
  }, [filtroOrigen]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const aplicarPlantilla = (tpl: PlantillaContable) => {
    setTipoAsiento(tpl.tipoAsiento);
    if (tpl.concepto) setConcepto(tpl.concepto);
    setLineas(
      tpl.lineas.map((l, idx) => ({
        key: `tpl-${tpl.id}-${idx}-${Date.now()}`,
        cuentaCodigo: l.cuentaCodigo,
        debe: l.lado === 'DEBE' ? '0.00' : '',
        haber: l.lado === 'HABER' ? '0.00' : '',
        conceptoLinea: l.conceptoLinea,
      })),
    );
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
      {
        key: `l-${Date.now()}-${prev.length}`,
        cuentaCodigo: cuentasDetalle[0]?.codigo || '110101',
        debe: '',
        haber: '',
        conceptoLinea: '',
      },
    ]);
  };

  const eliminarLinea = (key: string) => {
    if (lineas.length <= 2) return;
    setLineas((prev) => prev.filter((l) => l.key !== key));
  };

  const actualizarLinea = (key: string, campo: keyof LineaDraft, valor: string) => {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const updated = { ...l, [campo]: valor };
        if (campo === 'debe' && Number(valor) > 0) updated.haber = '';
        if (campo === 'haber' && Number(valor) > 0) updated.debe = '';
        return updated;
      }),
    );
  };

  const totalDebe = useMemo(
    () =>
      Math.round(
        lineas.reduce((acc, l) => acc + (Number(l.debe || 0) || 0), 0) * 100,
      ) / 100,
    [lineas],
  );
  const totalHaber = useMemo(
    () =>
      Math.round(
        lineas.reduce((acc, l) => acc + (Number(l.haber || 0) || 0), 0) * 100,
      ) / 100,
    [lineas],
  );
  const diferencia = Math.round((totalDebe - totalHaber) * 100) / 100;
  const estaCuadrado = totalDebe > 0 && Math.abs(diferencia) <= 0.01;

  const handleGuardarAsiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!concepto.trim()) {
      setErrorMsg('Debe ingresar el concepto contable del comprobante.');
      return;
    }
    if (!estaCuadrado) {
      setErrorMsg(
        `El comprobante debe cuadrar en partida doble (Debe: ${totalDebe.toFixed(2)}, Haber: ${totalHaber.toFixed(2)}).`,
      );
      return;
    }

    const lineasEnviar = lineas
      .map((l) => ({
        cuentaCodigo: l.cuentaCodigo,
        debe: Number(l.debe || 0) || 0,
        haber: Number(l.haber || 0) || 0,
        conceptoLinea: l.conceptoLinea.trim() || concepto.trim(),
      }))
      .filter((l) => l.debe > 0 || l.haber > 0);

    if (lineasEnviar.length < 2) {
      setErrorMsg('Se requieren al menos 2 líneas con monto mayor a 0.');
      return;
    }

    setIsSaving(true);
    try {
      const creado = await crearAsientoManual({
        fecha,
        tipoAsiento,
        documentoReferencia: documentoReferencia.trim() || undefined,
        concepto: concepto.trim(),
        lineas: lineasEnviar,
      });
      setSuccessMsg(
        `Comprobante ${creado.numeroAsiento} contabilizado y reflejado en Balanza, P&L y Balance General.`,
      );
      setDocumentoReferencia('');
      setConcepto('');
      setLineas([
        { key: `r1-${Date.now()}`, cuentaCodigo: '610103', debe: '', haber: '', conceptoLinea: '' },
        { key: `r2-${Date.now()}`, cuentaCodigo: '110102', debe: '', haber: '', conceptoLinea: '' },
      ]);
      await cargarDatos();
      onAsientoRegistrado?.();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Error al guardar asiento contable');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnular = async (asiento: AsientoContableItem) => {
    const motivo = window.prompt(
      `Motivo para anular y revertir el comprobante ${asiento.numeroAsiento}:`,
      'Corrección de registro manual',
    );
    if (motivo === null) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await anularAsientoManual(asiento.id, motivo);
      setSuccessMsg(`Comprobante ${asiento.numeroAsiento} anulado y revertido en libro.`);
      await cargarDatos();
      onAsientoRegistrado?.();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo anular el comprobante');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Plantillas Rápidas */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E8EE] pb-4">
          <div>
            <h3 className="text-base font-black text-[#1B1D22] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#1A73E8]" />
              <span>Comprobantes y Asientos Contables BM</span>
            </h3>
            <p className="text-xs text-[#747780] font-medium">
              Registre pagos a proveedores, gastos de caja chica, traspasos bancarios, préstamos, impuestos o depreciaciones directamente en el catálogo BM (250 cuentas).
            </p>
          </div>
          <button
            type="button"
            onClick={cargarDatos}
            className="px-3 py-2 rounded-xl border border-[#E5E8EE] text-xs font-bold text-[#1B1D22] hover:bg-[#F4F6F9] flex items-center gap-1.5 self-start"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Selector de Plantillas Rápidas */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-[#747780]">
            <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>Plantillas Rápidas de Operación (1 clic para prellenar cuentas BM)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PLANTILLAS_OPERATIVAS.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => aplicarPlantilla(tpl)}
                className="text-left p-3 rounded-2xl border border-[#E5E8EE] bg-[#F8FAFC] hover:border-[#1A73E8] hover:bg-[#E8F0FE]/40 transition-all"
              >
                <div className="text-xs font-black text-[#1B1D22]">{tpl.titulo}</div>
                <div className="text-[10px] text-[#747780] leading-tight mt-0.5">{tpl.descripcion}</div>
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulario de Nuevo Comprobante */}
        <form onSubmit={handleGuardarAsiento} className="space-y-4 pt-2 border-t border-[#E5E8EE]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[#747780] mb-1">
                Fecha Contable
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-[#E5E8EE] text-xs font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[#747780] mb-1">
                Tipo de Póliza
              </label>
              <select
                value={tipoAsiento}
                onChange={(e) => setTipoAsiento(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E8EE] text-xs font-bold bg-white"
              >
                <option value="EGRESOS">EGRESOS (Pagos / Gastos)</option>
                <option value="INGRESOS">INGRESOS (Depósitos / Traspasos)</option>
                <option value="DIARIO">DIARIO (Operación General)</option>
                <option value="AJUSTE">AJUSTE (Depreciación / Reclasificación)</option>
                <option value="APERTURA">APERTURA</option>
                <option value="CIERRE">CIERRE</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[#747780] mb-1">
                Doc. Referencia (Opcional)
              </label>
              <input
                type="text"
                value={documentoReferencia}
                onChange={(e) => setDocumentoReferencia(e.target.value)}
                placeholder="Ej. CK-4501, FAC-PROV-92"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E8EE] text-xs font-medium bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[#747780] mb-1">
                Concepto / Glosa Contable
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Descripción clara de la operación..."
                required
                className="w-full px-3 py-2 rounded-xl border border-[#E5E8EE] text-xs font-medium bg-white"
              />
            </div>
          </div>

          {/* Tabla de Partidas Debe / Haber */}
          <div className="border border-[#E5E8EE] rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[10px] font-black uppercase text-[#747780]">
                  <th className="p-2.5 w-[38%]">Cuenta Contable BM (Detalle)</th>
                  <th className="p-2.5">Concepto de Partida</th>
                  <th className="p-2.5 w-32 text-right">Debe (C$)</th>
                  <th className="p-2.5 w-32 text-right">Haber (C$)</th>
                  <th className="p-2.5 w-12 text-center">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {lineas.map((linea) => (
                  <tr key={linea.key} className="bg-white">
                    <td className="p-2">
                      <select
                        value={linea.cuentaCodigo}
                        onChange={(e) =>
                          actualizarLinea(linea.key, 'cuentaCodigo', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E8EE] font-mono text-[11px] bg-white"
                      >
                        {cuentasDetalle.map((c) => (
                          <option key={c.codigo} value={c.codigo}>
                            {c.codigo} — {c.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={linea.conceptoLinea}
                        onChange={(e) =>
                          actualizarLinea(linea.key, 'conceptoLinea', e.target.value)
                        }
                        placeholder="Detalle de la línea..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E8EE] text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={linea.debe}
                        onChange={(e) =>
                          actualizarLinea(linea.key, 'debe', e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E8EE] text-right font-mono font-bold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={linea.haber}
                        onChange={(e) =>
                          actualizarLinea(linea.key, 'haber', e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E8EE] text-right font-mono font-bold"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => eliminarLinea(linea.key)}
                        disabled={lineas.length <= 2}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                        title="Eliminar partida"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8FAFC] border-t border-[#E5E8EE] font-mono text-xs font-black">
                  <td className="p-2.5" colSpan={2}>
                    <button
                      type="button"
                      onClick={agregarLinea}
                      className="px-3 py-1.5 rounded-xl border border-[#1A73E8]/40 text-[#1A73E8] hover:bg-[#E8F0FE] font-sans text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Partida
                    </button>
                  </td>
                  <td className="p-2.5 text-right text-[#1B1D22]">
                    {formatCurrency(totalDebe)}
                  </td>
                  <td className="p-2.5 text-right text-[#1B1D22]">
                    {formatCurrency(totalHaber)}
                  </td>
                  <td className="p-2.5 text-center">
                    {estaCuadrado ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 mx-auto" />
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-bold">
              {estaCuadrado ? (
                <span className="text-emerald-700">
                  Partida doble cuadrada: {formatCurrency(totalDebe)}
                </span>
              ) : (
                <span className="text-amber-700">
                  Diferencia por cuadrar: {formatCurrency(Math.abs(diferencia))}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving || !estaCuadrado}
              className="px-5 py-2.5 rounded-xl bg-[#1A73E8] text-white text-xs font-black hover:bg-[#1557B0] disabled:opacity-50 inline-flex items-center gap-2 self-end"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Contabilizando...' : 'Contabilizar Asiento'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historial de Comprobantes Contables */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">
              Registro de Asientos Persistidos (Manuales y Automáticos)
            </h4>
            <p className="text-xs text-[#747780]">
              Todos los asientos en estado PUBLICADO alimentan la Balanza, Estado de Resultados y Balance General.
            </p>
          </div>

          <select
            value={filtroOrigen}
            onChange={(e) => setFiltroOrigen(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E8EE] text-xs font-bold bg-[#F8FAFC]"
          >
            <option value="TODOS">Todos los orígenes</option>
            <option value="MANUAL">Asientos Manuales (MANUAL)</option>
            <option value="CXC">Cuentas por Cobrar (CXC)</option>
            <option value="NOMINA">Nómina y Comisiones (NOMINA)</option>
            <option value="OPERACIONES">Insumos / Bodega (OPERACIONES)</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-bold text-[#747780]">
            Cargando asientos contables...
          </div>
        ) : asientos.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-[#747780] bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE]">
            No hay comprobantes registrados para el filtro seleccionado.
          </div>
        ) : (
          <div className="space-y-2">
            {asientos.map((a) => {
              const isOpen = expandedId === a.id;
              return (
                <div
                  key={a.id}
                  className="border border-[#E5E8EE] rounded-2xl overflow-hidden bg-[#F8FAFC]"
                >
                  <div
                    onClick={() => setExpandedId(isOpen ? null : a.id)}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-[#747780]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#747780]" />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-xs text-[#1B1D22]">
                            {a.numeroAsiento}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#E8F0FE] text-[#1A73E8]">
                            {a.origenModulo}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-200 text-slate-800">
                            {a.tipoAsiento}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              a.estado === 'PUBLICADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {a.estado}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#1B1D22] mt-0.5">
                          {a.concepto}
                        </div>
                        <div className="text-[10px] text-[#747780]">
                          Fecha: {new Date(a.fecha).toLocaleDateString('es-NI')}
                          {a.documentoReferencia ? ` · Ref: ${a.documentoReferencia}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <div className="text-[10px] text-[#747780] font-bold">Total</div>
                        <div className="text-xs font-black text-[#1B1D22]">
                          {formatCurrency(a.totalDebe)}
                        </div>
                      </div>
                      {a.origenModulo === 'MANUAL' && a.estado === 'PUBLICADO' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnular(a);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-[10px] font-black inline-flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" /> Anular
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-[#E5E8EE] bg-white p-3">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="text-[9px] uppercase text-[#747780] border-b border-[#E5E8EE]">
                            <th className="py-1.5 text-left">Código</th>
                            <th className="py-1.5 text-left">Cuenta BM</th>
                            <th className="py-1.5 text-left">Concepto</th>
                            <th className="py-1.5 text-right">Debe</th>
                            <th className="py-1.5 text-right">Haber</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E8EE] font-mono">
                          {a.lineas.map((l, idx) => (
                            <tr key={l.id || `${a.id}-${idx}`}>
                              <td className="py-1.5 font-bold text-[#1A73E8]">{l.cuentaCodigo}</td>
                              <td className="py-1.5 font-sans font-bold">{l.cuentaNombre}</td>
                              <td className="py-1.5 font-sans text-[#747780]">{l.conceptoLinea || '—'}</td>
                              <td className="py-1.5 text-right">{l.debe > 0 ? formatCurrency(l.debe) : '—'}</td>
                              <td className="py-1.5 text-right">{l.haber > 0 ? formatCurrency(l.haber) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
