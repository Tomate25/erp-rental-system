import React, { useState, useEffect } from 'react';
import type { MonedaTipo, SimulacionArregloResponse } from '../types/cxc.types';
import { cxcApi } from '../services/cxc.api';
import { X, Calculator, Check, AlertCircle } from 'lucide-react';

interface SimuladorArregloModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  moneda?: MonedaTipo;
  tipoCambioBcn?: number;
}

export const SimuladorArregloModal: React.FC<SimuladorArregloModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientes,
  moneda: _moneda = 'NIO',
  tipoCambioBcn: _tipoCambioBcn = 36.6243,
}) => {
  const [clienteId, setClienteId] = useState('');
  const [sucursalId, setSucursalId] = useState('KM10');
  const [facturasDisponibles, setFacturasDisponibles] = useState<any[]>([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<string[]>([]);
  const [montoConsolidado, setMontoConsolidado] = useState<number>(0);
  const [tasaInteresAnual, setTasaInteresAnual] = useState<number>(12.0);
  const [montoGastosAdmin, setMontoGastosAdmin] = useState<number>(500.0);
  const [numeroCuotas, setNumeroCuotas] = useState<number>(6);
  const [frecuencia, setFrecuencia] = useState<'QUINCENAL' | 'MENSUAL'>('MENSUAL');
  const [fechaPrimerVencimiento, setFechaPrimerVencimiento] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [montoPenalidadIncumplimientoUsd, setMontoPenalidadIncumplimientoUsd] = useState<number>(100.0);
  const [justificacion, setJustificacion] = useState('');
  const [simulacion, setSimulacion] = useState<SimulacionArregloResponse | null>(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data = await cxcApi.getAntiguedad({ clienteId });
      const c = data.clientes.find((cl) => cl.clienteId === clienteId);
      if (c && c.documentos) {
        setFacturasDisponibles(c.documentos);
        const allIds = c.documentos.map((d) => d.id);
        setFacturasSeleccionadas(allIds);
        const sum = c.documentos.reduce((acc, d) => acc + d.saldoPendienteCordobas, 0);
        setMontoConsolidado(sum);
      } else {
        setFacturasDisponibles([]);
        setFacturasSeleccionadas([]);
        setMontoConsolidado(0);
      }
    } catch (e) {
      console.error('Error cargando facturas del cliente:', e);
    }
  };

  const handleToggleFactura = (docId: string, saldo: number) => {
    if (facturasSeleccionadas.includes(docId)) {
      setFacturasSeleccionadas(facturasSeleccionadas.filter((id) => id !== docId));
      setMontoConsolidado(Math.max(0, montoConsolidado - saldo));
    } else {
      setFacturasSeleccionadas([...facturasSeleccionadas, docId]);
      setMontoConsolidado(montoConsolidado + saldo);
    }
  };

  const handleSimular = async () => {
    if (!clienteId || montoConsolidado <= 0) {
      setError('Seleccione un cliente y al menos una factura con saldo pendiente.');
      return;
    }
    setLoadingSim(true);
    setError(null);
    try {
      const res = await cxcApi.simularArreglo({
        clienteId,
        montoConsolidado,
        tasaInteresAnual,
        montoGastosAdmin,
        numeroCuotas,
        frecuencia,
        fechaPrimerVencimiento,
      });
      setSimulacion(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al ejecutar la simulación.');
    } finally {
      setLoadingSim(false);
    }
  };

  const handleFormalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulacion) {
      setError('Debe simular el arreglo de pago antes de formalizarlo.');
      return;
    }
    if (facturasSeleccionadas.length === 0) {
      setError('Seleccione al menos una factura para incorporar al acuerdo.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await cxcApi.crearArreglo({
        clienteId,
        sucursalId: sucursalId || undefined,
        facturaIds: facturasSeleccionadas,
        montoConsolidado,
        tasaInteresAnual,
        montoGastosAdmin,
        numeroCuotas,
        frecuencia,
        fechaPrimerVencimiento,
        montoPenalidadIncumplimientoUsd: montoPenalidadIncumplimientoUsd || 0,
        justificacion: justificacion || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al formalizar el acuerdo de pago.');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#37474F]/70 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#E5E8EE] shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E8EE] sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-black text-[#1B1D22]">
              Simulador y Formalización de Arreglos de Pago (ARR)
            </h2>
            <p className="text-xs text-[#747780] font-medium mt-0.5">
              Consolidación de cartera vencida con cálculo de intereses, gastos administrativos y calendario de cuotas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#747780] hover:text-[#1B1D22] hover:bg-[#F4F6F9] cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormalizar} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Cliente y Sucursal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Cliente Moroso / Deudor *
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl focus:ring-1 focus:ring-[#1A73E8] focus:border-[#1A73E8] font-bold text-[#1B1D22]"
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
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Sucursal de Acuerdo
              </label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl focus:ring-1 focus:ring-[#1A73E8] focus:border-[#1A73E8] font-medium text-[#1B1D22]"
              >
                <option value="KM10">Km 10.5 Carretera a Masaya</option>
                <option value="CENTROAMERICA">Plaza Centroamérica</option>
              </select>
            </div>
          </div>

          {/* Facturas a consolidar */}
          {facturasDisponibles.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1.5 flex items-center justify-between">
                <span>Facturas Seleccionadas para el Arreglo ({facturasSeleccionadas.length})</span>
                <span className="text-[11px] text-[#747780] font-normal">
                  Estas facturas pasarán a estado <strong>EN_ARREGLO</strong> aislándose de la cartera ordinaria
                </span>
              </label>
              <div className="max-h-40 overflow-y-auto bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE] p-2 space-y-1">
                {facturasDisponibles.map((f) => {
                  const isChecked = facturasSeleccionadas.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-white shadow-xs border border-[#E5E8EE]' : 'hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleFactura(f.id, f.saldoPendienteCordobas)}
                          className="rounded text-[#1A73E8] focus:ring-[#1A73E8]"
                        />
                        <span className="font-bold text-[#1B1D22]">{f.folio}</span>
                        <span className="text-[11px] text-[#747780]">({f.tipoDocumento} - {f.tramoNombre})</span>
                      </div>
                      <span className="font-black text-[#1B1D22] font-mono">
                        C$ {f.saldoPendienteCordobas.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parámetros Financieros del Simulador */}
          <div className="p-4 bg-[#E8F0FE]/40 rounded-2xl border border-[#1A73E8]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#1A73E8]" />
                <span className="text-xs font-black text-[#1B1D22]">
                  Parámetros Financieros de la Amortización
                </span>
              </div>
              <button
                type="button"
                onClick={handleSimular}
                disabled={loadingSim || montoConsolidado <= 0}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#1A73E8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer transition-all"
              >
                {loadingSim ? 'Calculando...' : 'Calcular Simulación'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  Capital Consolidado (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montoConsolidado || ''}
                  onChange={(e) => setMontoConsolidado(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl font-bold font-mono text-[#1B1D22]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  Interés Anual (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tasaInteresAnual}
                  onChange={(e) => setTasaInteresAnual(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl font-bold text-[#1B1D22]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  Gastos Admin (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montoGastosAdmin}
                  onChange={(e) => setMontoGastosAdmin(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl font-bold text-[#1B1D22]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  No. Cuotas
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={numeroCuotas}
                  onChange={(e) => setNumeroCuotas(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl font-bold text-[#1B1D22]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  Frecuencia
                </label>
                <select
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] font-bold"
                >
                  <option value="MENSUAL">Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  1er Vencimiento
                </label>
                <input
                  type="date"
                  value={fechaPrimerVencimiento}
                  onChange={(e) => setFechaPrimerVencimiento(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl font-bold text-[#1B1D22]"
                />
              </div>
            </div>
          </div>

          {/* Resumen de la Simulación y Tabla de Cuotas */}
          {simulacion && (
            <div className="space-y-3">
              {/* Tarjetas resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E8EE]">
                  <div className="text-[10px] text-[#747780] uppercase font-bold">Capital Consolidado</div>
                  <div className="text-xs font-black text-[#1B1D22] font-mono mt-0.5">
                    C$ {simulacion.resumen.capitalOriginal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div className="text-[10px] text-amber-800 uppercase font-bold">Total Intereses</div>
                  <div className="text-xs font-black text-amber-700 font-mono mt-0.5">
                    C$ {simulacion.resumen.montoIntereses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E8EE]">
                  <div className="text-[10px] text-[#747780] uppercase font-bold">Gastos Admin</div>
                  <div className="text-xs font-bold text-[#1B1D22] font-mono mt-0.5">
                    C$ {simulacion.resumen.montoGastosAdmin.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-[#E8F0FE] rounded-xl border border-[#1A73E8]/30">
                  <div className="text-[10px] text-[#1A73E8] uppercase font-bold">Cuota Nivelada</div>
                  <div className="text-xs font-black text-[#1A73E8] font-mono mt-0.5">
                    C$ {simulacion.resumen.cuotaPromedio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {/* Gran Total ARR con estilo corporativo sin negro */}
                <div className="p-3 bg-gradient-to-br from-[#1A73E8] to-[#1557B0] text-white rounded-xl border border-[#1A73E8] col-span-2 sm:col-span-1 shadow-xs">
                  <div className="text-[10px] text-blue-100 uppercase font-bold">Gran Total ARR</div>
                  <div className="text-xs font-black text-white font-mono mt-0.5">
                    C$ {simulacion.resumen.granTotalArreglo.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Tabla detallada de cuotas */}
              <div className="max-h-48 overflow-y-auto bg-white rounded-2xl border border-[#E5E8EE]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F6F9] text-[#747780] font-extrabold text-[10px] uppercase border-b border-[#E5E8EE] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Cuota #</th>
                      <th className="py-2.5 px-3">Vencimiento</th>
                      <th className="py-2.5 px-3 text-right">Capital</th>
                      <th className="py-2.5 px-3 text-right">Interés</th>
                      <th className="py-2.5 px-3 text-right">Gastos Admin</th>
                      <th className="py-2.5 px-3 text-right font-black">Total Cuota</th>
                      <th className="py-2.5 px-3 text-right">Saldo Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8EE] font-medium text-[#1B1D22]">
                    {simulacion.tablaAmortizacion.map((c: any) => (
                      <tr key={c.numeroCuota} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-bold">{c.numeroCuota} / {numeroCuotas}</td>
                        <td className="py-2 px-3 text-[#747780]">
                          {new Date(c.fechaVencimiento).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">C$ {c.capital.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-amber-700 font-bold font-mono">C$ {c.interes.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-[#747780] font-mono">C$ {c.gastosAdmin.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-black text-[#1A73E8] font-mono">
                          C$ {c.totalCuota.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-[#747780] font-mono">C$ {c.saldoRestante.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cláusula penal y Justificación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Cláusula Penal por Incumplimiento ($ USD)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={montoPenalidadIncumplimientoUsd}
                onChange={(e) => setMontoPenalidadIncumplimientoUsd(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] font-mono"
              />
              <span className="text-[11px] text-[#747780] mt-1 block">
                Se aplicará automáticamente como Nota de Débito si incurre en mora mayor a los días de gracia.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Justificación / Notas del Acuerdo
              </label>
              <input
                type="text"
                placeholder="Ej: Aprobado por Gerencia General tras renegociación con cliente"
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22]"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E8EE]">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-xs font-bold text-[#747780] hover:bg-[#F4F6F9] rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !simulacion}
              className="px-5 py-2 text-xs font-bold bg-[#1A73E8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {guardando ? 'Formalizando Acuerdo...' : 'Formalizar y Activar Arreglo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
