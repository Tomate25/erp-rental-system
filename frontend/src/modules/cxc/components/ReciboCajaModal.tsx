import React, { useState, useEffect } from 'react';
import { cxcApi } from '../services/cxc.api';
import type { MonedaTipo } from '../types/cxc.types';
import { X, Check, AlertCircle, Info, ShieldCheck } from 'lucide-react';

interface ReciboCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes: Array<{ id: string; nombre: string; rfc: string; esRetenedor?: boolean }>;
  moneda?: MonedaTipo;
  tipoCambioBcn: number;
}

export const ReciboCajaModal: React.FC<ReciboCajaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientes,
  tipoCambioBcn,
}) => {
  const [clienteId, setClienteId] = useState('');
  const [sucursalId, setSucursalId] = useState('KM10');
  const [fechaRecibo, setFechaRecibo] = useState(new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE' | 'DEPOSITO'>('TRANSFERENCIA');
  const [banco, setBanco] = useState('BAC Credomatic');
  const [numeroReferencia, setNumeroReferencia] = useState('');

  const [montoEfectivoBancos, setMontoEfectivoBancos] = useState<number>(0);
  const [montoRetencionIr, setMontoRetencionIr] = useState<number>(0);
  const [noConstanciaRetIr, setNoConstanciaRetIr] = useState('');
  const [montoRetencionImi, setMontoRetencionImi] = useState<number>(0);
  const [noConstanciaRetImi, setNoConstanciaRetImi] = useState('');
  const [concepto, setConcepto] = useState('');

  const [documentosPendientes, setDocumentosPendientes] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  useEffect(() => {
    if (!clienteId) {
      setDocumentosPendientes([]);
      return;
    }
    cargarDocumentosCliente();
  }, [clienteId]);

  const cargarDocumentosCliente = async () => {
    try {
      const res = await cxcApi.getAntiguedad({ clienteId });
      const clienteGroup = res.clientes?.find((c) => c.clienteId === clienteId);
      setDocumentosPendientes(clienteGroup?.documentos || []);
    } catch (e) {
      console.error('Error cargando documentos:', e);
    }
  };

  const totalLiquidado = Number(montoEfectivoBancos || 0) + Number(montoRetencionIr || 0) + Number(montoRetencionImi || 0);
  const totalCarteraCliente = documentosPendientes.reduce((s, d) => s + d.saldoPendienteCordobas, 0);
  const excedenteAnticipo = Math.max(0, totalLiquidado - totalCarteraCliente);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clienteId) {
      setError('Seleccione un cliente.');
      return;
    }
    if (totalLiquidado <= 0) {
      setError('El total liquidado debe ser mayor a 0.');
      return;
    }
    if (montoRetencionIr > 0 && !noConstanciaRetIr.trim()) {
      setError('Debe proporcionar el número de constancia para la retención IR 2%.');
      return;
    }
    if (montoRetencionImi > 0 && !noConstanciaRetImi.trim()) {
      setError('Debe proporcionar el número de constancia para la retención IMI 1%.');
      return;
    }

    setGuardando(true);
    try {
      await cxcApi.crearRecibo({
        clienteId,
        sucursalId,
        fechaRecibo,
        moneda: 'NIO',
        tipoCambioBcn,
        montoEfectivoBancos,
        montoRetencionIr,
        noConstanciaRetencionIr: noConstanciaRetIr,
        montoRetencionImi,
        noConstanciaRetencionImi: noConstanciaRetImi,
        metodoPago,
        banco: metodoPago !== 'EFECTIVO' ? banco : undefined,
        numeroTransferenciaReferencia: numeroReferencia || undefined,
        concepto: concepto || undefined,
        aplicarAutoFifo: true,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al emitir el recibo de caja.');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Emitir Recibo de Caja (RC)</h2>
            <p className="text-xs text-gray-500">Liquidación de cartera, retenciones DGI/ALMA y generación de póliza contable</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cliente y Sucursal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Cliente *
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
                Sucursal Recaudadora *
              </label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="KM10">Km 10.5 Carretera a Masaya</option>
                <option value="CENTROAMERICA">Plaza Centroamérica</option>
              </select>
            </div>
          </div>

          {/* Fecha y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Fecha del Recibo
              </label>
              <input
                type="date"
                value={fechaRecibo}
                onChange={(e) => setFechaRecibo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-medium"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo en Caja</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DEPOSITO">Depósito Bancario</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Banco Emisor
              </label>
              <input
                type="text"
                placeholder="BAC Credomatic"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                disabled={metodoPago === 'EFECTIVO'}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                No. Referencia
              </label>
              <input
                type="text"
                placeholder="Ej: Ref #88921"
                value={numeroReferencia}
                onChange={(e) => setNumeroReferencia(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              />
            </div>
          </div>

          {/* Desglose de Liquidación: Efectivo + Retenciones */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                Monto Recibido y Retenciones Fiscales (C$)
              </span>
              <span className="text-[11px] text-gray-500">TC: 1 USD = {tipoCambioBcn.toFixed(4)} NIO</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Monto Efectivo / Banco (C$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoEfectivoBancos || ''}
                  onChange={(e) => setMontoEfectivoBancos(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-between">
                  <span>Retención IR 2% (C$)</span>
                  {clienteSeleccionado?.esRetenedor && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoRetencionIr || ''}
                  onChange={(e) => setMontoRetencionIr(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="No. Constancia DGI"
                  value={noConstanciaRetIr}
                  onChange={(e) => setNoConstanciaRetIr(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Retención IMI 1% (ALMA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoRetencionImi || ''}
                  onChange={(e) => setMontoRetencionImi(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="No. Constancia IMI"
                  value={noConstanciaRetImi}
                  onChange={(e) => setNoConstanciaRetImi(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
                />
              </div>
            </div>

            {/* Total Liquidado y Resumen */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Liquidado en Recibo:</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                C$ {totalLiquidado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {excedenteAnticipo > 0 && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  El monto liquidado excede la cartera pendiente. El remanente de{' '}
                  <strong>C$ {excedenteAnticipo.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong> será acreditado automáticamente a la cuenta <strong>2.1.06.001 (Anticipo de Clientes)</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Concepto libre o automático */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Concepto del Recibo (opcional - se genera automáticamente si se deja vacío)
            </label>
            <input
              type="text"
              placeholder="Ej: Cancelación de Factura F-0021 y retenciones aplicadas"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
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
              disabled={guardando || totalLiquidado <= 0}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {guardando ? 'Emitiendo Recibo...' : 'Emitir Recibo de Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
