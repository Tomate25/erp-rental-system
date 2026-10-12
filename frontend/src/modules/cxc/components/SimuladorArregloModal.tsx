import React, { useState, useEffect } from 'react';
import { cxcApi } from '../services/cxc.api';
import { X, Check, AlertCircle } from 'lucide-react';

interface SimuladorArregloModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  tipoCambioBcn?: number;
}

export const SimuladorArregloModal: React.FC<SimuladorArregloModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientes,
}) => {
  const [clienteId, setClienteId] = useState('');
  const [sucursalId, setSucursalId] = useState('KM10');
  const [facturasDisponibles, setFacturasDisponibles] = useState<any[]>([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<string[]>([]);

  const [numeroCuotas, setNumeroCuotas] = useState(6);
  const [frecuencia, setFrecuencia] = useState<'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('MENSUAL');
  const [tasaInteresAnual, setTasaInteresAnual] = useState(12); // 12% anual
  const [porcentajeGastosAdmin, setPorcentajeGastosAdmin] = useState(3); // 3%
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [penalidadUsd, setPenalidadUsd] = useState(50); // $50 USD cláusula penal

  const [simulacion, setSimulacion] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clienteId) {
      setFacturasDisponibles([]);
      setFacturasSeleccionadas([]);
      setSimulacion(null);
      return;
    }
    cargarFacturasCliente();
  }, [clienteId]);

  const cargarFacturasCliente = async () => {
    try {
      const res = await cxcApi.getAntiguedad({ clienteId });
      const clienteGroup = res.clientes?.find((c) => c.clienteId === clienteId);
      const facturas = clienteGroup?.documentos?.filter((d) => d.tipoDocumento === 'FACTURA') || [];
      setFacturasDisponibles(facturas);
      // Seleccionar todas por defecto
      setFacturasSeleccionadas(facturas.map((f) => f.id));
    } catch (e) {
      console.error('Error cargando facturas:', e);
    }
  };

  // Correr simulación interactiva cada vez que cambian parámetros
  useEffect(() => {
    correrSimulacion();
  }, [facturasSeleccionadas, numeroCuotas, frecuencia, tasaInteresAnual, porcentajeGastosAdmin, fechaPrimeraCuota]);

  const correrSimulacion = async () => {
    const facturasElegidas = facturasDisponibles.filter((f) => facturasSeleccionadas.includes(f.id));
    const capitalTotal = facturasElegidas.reduce((s, f) => s + f.saldoPendienteCordobas, 0);

    if (capitalTotal <= 0) {
      setSimulacion(null);
      return;
    }

    try {
      const res = await cxcApi.simularArreglo({
        montoCapital: capitalTotal,
        numeroCuotas,
        frecuencia,
        tasaInteresAnual,
        porcentajeGastosAdmin,
        fechaPrimeraCuota,
        metodoAmortizacion: 'CUOTA_NIVELADA',
      });
      setSimulacion(res);
    } catch (e) {
      console.error('Error en simulación:', e);
    }
  };

  const toggleFactura = (id: string) => {
    if (facturasSeleccionadas.includes(id)) {
      setFacturasSeleccionadas(facturasSeleccionadas.filter((fId) => fId !== id));
    } else {
      setFacturasSeleccionadas([...facturasSeleccionadas, id]);
    }
  };

  const handleFormalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clienteId) {
      setError('Seleccione un cliente.');
      return;
    }
    if (facturasSeleccionadas.length === 0) {
      setError('Debe seleccionar al menos una factura para incorporar al arreglo de pago.');
      return;
    }

    setGuardando(true);
    try {
      await cxcApi.formalizarArreglo({
        clienteId,
        sucursalId,
        facturasIds: facturasSeleccionadas,
        numeroCuotas,
        frecuencia,
        fechaPrimeraCuota,
        tasaInteresAnual,
        porcentajeGastosAdmin,
        penalidadIncumplimientoUsd: penalidadUsd,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al formalizar el acuerdo de pago.');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Simulador y Formalización de Arreglos de Pago (ARR)
            </h2>
            <p className="text-xs text-gray-500">
              Consolidación de cartera vencida con cálculo de intereses, gastos administrativos y calendario de cuotas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormalizar} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Cliente y Sucursal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Cliente Moroso / Deudor *
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Seleccionar cliente --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.rfc || 'Sin RUC'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Sucursal *
              </label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-medium"
              >
                <option value="KM10">Km 10.5 Carretera a Masaya</option>
                <option value="CENTROAMERICA">Plaza Centroamérica</option>
              </select>
            </div>
          </div>

          {/* Facturas a Consolidar */}
          {clienteId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                <span>Facturas a incorporar al acuerdo ({facturasSeleccionadas.length} seleccionadas)</span>
                <span className="text-gray-500 font-normal">
                  (Estas facturas pasarán a estado <strong>EN_ARREGLO</strong> al formalizar)
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                {facturasDisponibles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">Este cliente no tiene facturas con saldo pendiente.</div>
                ) : (
                  facturasDisponibles.map((f) => (
                    <label
                      key={f.id}
                      className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={facturasSeleccionadas.includes(f.id)}
                          onChange={() => toggleFactura(f.id)}
                          className="rounded text-blue-600"
                        />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{f.folio}</span>
                        <span className="text-gray-500 text-[11px]">Vence: {new Date(f.fechaVence).toLocaleDateString()}</span>
                        {f.diasMora > 0 && <span className="text-rose-600 font-bold text-[10px]">+{f.diasMora} d mora</span>}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        C$ {f.saldoPendienteCordobas.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Parámetros Financieros de la Negociación */}
          <div className="p-4 bg-blue-50/50 dark:bg-gray-900 rounded-xl border border-blue-100 dark:border-gray-700 space-y-3">
            <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
              Parámetros de Amortización
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Plazo (Cuotas)
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={numeroCuotas}
                  onChange={(e) => setNumeroCuotas(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Frecuencia
                </label>
                <select
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium"
                >
                  <option value="MENSUAL">Mensual (12/año)</option>
                  <option value="QUINCENAL">Quincenal (24/año)</option>
                  <option value="SEMANAL">Semanal (52/año)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tasa Interés Anual %
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={tasaInteresAnual}
                  onChange={(e) => setTasaInteresAnual(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Gastos Admin %
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={porcentajeGastosAdmin}
                  onChange={(e) => setPorcentajeGastosAdmin(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Primera Cuota
                </label>
                <input
                  type="date"
                  value={fechaPrimeraCuota}
                  onChange={(e) => setFechaPrimeraCuota(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Penalidad Incump. ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={penalidadUsd}
                  onChange={(e) => setPenalidadUsd(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold"
                />
              </div>
            </div>
          </div>

          {/* Resumen de la Simulación y Tabla de Cuotas */}
          {simulacion && (
            <div className="space-y-3">
              {/* Tarjetas resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-[10px] text-gray-500 uppercase">Capital Consolidado</div>
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    C$ {simulacion.resumen.capitalOriginal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-[10px] text-gray-500 uppercase">Total Intereses</div>
                  <div className="text-xs font-bold text-amber-600">
                    C$ {simulacion.resumen.montoIntereses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-[10px] text-gray-500 uppercase">Gastos Admin</div>
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    C$ {simulacion.resumen.montoGastosAdmin.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
                  <div className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold">Cuota Nivelada</div>
                  <div className="text-xs font-extrabold text-blue-900 dark:text-blue-100">
                    C$ {simulacion.resumen.cuotaPromedio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 bg-gray-900 text-white dark:bg-gray-800 rounded-lg border border-gray-800 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-gray-300 uppercase">Gran Total ARR</div>
                  <div className="text-xs font-extrabold text-white">
                    C$ {simulacion.resumen.granTotalArreglo.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Tabla detallada de cuotas */}
              <div className="max-h-48 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Cuota #</th>
                      <th className="py-2 px-3">Vencimiento</th>
                      <th className="py-2 px-3 text-right">Capital</th>
                      <th className="py-2 px-3 text-right">Interés</th>
                      <th className="py-2 px-3 text-right">Gastos Admin</th>
                      <th className="py-2 px-3 text-right font-bold">Total Cuota</th>
                      <th className="py-2 px-3 text-right">Saldo Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {simulacion.tablaAmortizacion.map((c: any) => (
                      <tr key={c.numeroCuota} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-1.5 px-3 font-semibold">{c.numeroCuota} / {numeroCuotas}</td>
                        <td className="py-1.5 px-3 text-gray-600 dark:text-gray-400">
                          {new Date(c.fechaVencimiento).toLocaleDateString()}
                        </td>
                        <td className="py-1.5 px-3 text-right">C$ {c.capital.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-right text-amber-600 font-medium">C$ {c.interes.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-right text-gray-500">C$ {c.gastosAdmin.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          C$ {c.totalCuota.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right text-gray-500">C$ {c.saldoRestante.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !simulacion}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {guardando ? 'Formalizando acuerdo...' : 'Formalizar Acuerdo de Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
