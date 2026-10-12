import React, { useState, useEffect } from 'react';
import type { MonedaTipo } from '../types/cxc.types';
import { cxcApi } from '../services/cxc.api';
import { X, Check, AlertCircle, ShieldCheck, Info } from 'lucide-react';

interface ReciboCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  moneda: MonedaTipo;
  tipoCambioBcn: number;
}

export const ReciboCajaModal: React.FC<ReciboCajaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientes,
  moneda: _moneda,
  tipoCambioBcn,
}) => {
  const [clienteId, setClienteId] = useState('');
  const [sucursalId, setSucursalId] = useState('KM10');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE' | 'DEPOSITO'>('TRANSFERENCIA');
  const [banco, setBanco] = useState('');
  const [numeroReferencia, setNumeroReferencia] = useState('');
  const [montoEfectivoBancos, setMontoEfectivoBancos] = useState<number>(0);
  const [montoRetencionIr, setMontoRetencionIr] = useState<number>(0);
  const [noConstanciaRetIr, setNoConstanciaRetIr] = useState('');
  const [montoRetencionImi, setMontoRetencionImi] = useState<number>(0);
  const [noConstanciaRetImi, setNoConstanciaRetImi] = useState('');
  const [concepto, setConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carteraCliente, setCarteraCliente] = useState<{ saldoTotal: number; facturasCount: number } | null>(null);

  useEffect(() => {
    if (!clienteId) {
      setCarteraCliente(null);
      return;
    }
    cargarCarteraCliente();
  }, [clienteId]);

  const cargarCarteraCliente = async () => {
    try {
      const data = await cxcApi.getEstadoCuenta(clienteId);
      setCarteraCliente({
        saldoTotal: data.resumen.saldoActualVisualizado,
        facturasCount: data.movimientos.filter((m) => m.tipoMovimiento === 'FACTURA').length,
      });
    } catch {
      setCarteraCliente(null);
    }
  };

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId) as any;

  // Cálculo del total liquidado por el cliente
  const totalLiquidado = (montoEfectivoBancos || 0) + (montoRetencionIr || 0) + (montoRetencionImi || 0);

  // Detección automática de sobrepago a cuenta de anticipos 2.1.06.001
  const excedenteAnticipo = carteraCliente && totalLiquidado > carteraCliente.saldoTotal
    ? totalLiquidado - carteraCliente.saldoTotal
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setError('Seleccione un cliente para emitir el recibo.');
      return;
    }
    if (totalLiquidado <= 0) {
      setError('El monto total liquidado debe ser mayor a 0.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const retenciones: Array<{
        tipo: 'IR_2' | 'IMI_1' | 'OTRA';
        monto: number;
        numeroConstancia?: string;
        porcentajeAplicado?: number;
      }> = [];

      if (montoRetencionIr > 0) {
        retenciones.push({
          tipo: 'IR_2',
          monto: montoRetencionIr,
          numeroConstancia: noConstanciaRetIr || undefined,
          porcentajeAplicado: 2.0,
        });
      }

      if (montoRetencionImi > 0) {
        retenciones.push({
          tipo: 'IMI_1',
          monto: montoRetencionImi,
          numeroConstancia: noConstanciaRetImi || undefined,
          porcentajeAplicado: 1.0,
        });
      }

      await cxcApi.crearRecibo({
        clienteId,
        sucursalId: sucursalId || undefined,
        fechaEmision: new Date(fechaEmision).toISOString(),
        moneda: 'NIO', // Recibo oficial expresado en moneda base C$
        montoEfectivoBancos: montoEfectivoBancos || 0,
        formaPago: metodoPago,
        banco: banco || undefined,
        referenciaPago: numeroReferencia || undefined,
        concepto: concepto || undefined,
        retenciones: retenciones.length > 0 ? retenciones : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al emitir el recibo de caja.');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#37474F]/70 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E5E8EE] shadow-2xl">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E8EE] sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-black text-[#1B1D22]">Emitir Recibo de Caja (RC)</h2>
            <p className="text-xs text-[#747780] font-medium mt-0.5">Liquidación de cartera, retenciones DGI/ALMA y póliza contable automática</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#747780] hover:text-[#1B1D22] hover:bg-[#F4F6F9] cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cliente y Sucursal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Cliente *
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
                Sucursal Emisora
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

          {/* Fecha, Método y Bancos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Fecha Emisión
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Forma de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl font-bold text-[#1B1D22]"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo en Caja</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DEPOSITO">Depósito Bancario</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Banco Emisor
              </label>
              <input
                type="text"
                placeholder="BAC Credomatic"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                disabled={metodoPago === 'EFECTIVO'}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                No. Referencia
              </label>
              <input
                type="text"
                placeholder="Ej: Ref #88921"
                value={numeroReferencia}
                onChange={(e) => setNumeroReferencia(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22]"
              />
            </div>
          </div>

          {/* Desglose de Liquidación: Efectivo + Retenciones */}
          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1B1D22]">
                Monto Recibido y Retenciones Fiscales (C$)
              </span>
              <span className="text-[11px] text-[#747780] font-medium">TC: 1 USD = {tipoCambioBcn.toFixed(4)} NIO</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  Monto Efectivo / Banco (C$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoEfectivoBancos || ''}
                  onChange={(e) => setMontoEfectivoBancos(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-black font-mono bg-white border border-[#E5E8EE] rounded-xl focus:ring-1 focus:ring-[#1A73E8] text-[#1B1D22]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1 flex items-center justify-between">
                  <span>Retención IR 2% (C$)</span>
                  {clienteSeleccionado?.esRetenedor && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoRetencionIr || ''}
                  onChange={(e) => setMontoRetencionIr(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22]"
                />
                <input
                  type="text"
                  placeholder="No. Constancia DGI"
                  value={noConstanciaRetIr}
                  onChange={(e) => setNoConstanciaRetIr(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1 text-[11px] bg-white border border-[#E5E8EE] rounded-lg text-[#1B1D22]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#747780] mb-1">
                  Retención IMI 1% (ALMA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoRetencionImi || ''}
                  onChange={(e) => setMontoRetencionImi(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22]"
                />
                <input
                  type="text"
                  placeholder="No. Constancia IMI"
                  value={noConstanciaRetImi}
                  onChange={(e) => setNoConstanciaRetImi(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1 text-[11px] bg-white border border-[#E5E8EE] rounded-lg text-[#1B1D22]"
                />
              </div>
            </div>

            {/* Total Liquidado y Resumen */}
            <div className="pt-2 border-t border-[#E5E8EE] flex flex-wrap items-center justify-between text-xs">
              <span className="font-bold text-[#747780]">Total Liquidado en Recibo:</span>
              <span className="text-base font-black text-[#1A73E8] font-mono">
                C$ {totalLiquidado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {excedenteAnticipo > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>
                  El monto liquidado excede la cartera pendiente. El remanente de{' '}
                  <strong className="font-mono">C$ {excedenteAnticipo.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong> será acreditado automáticamente a la cuenta <strong>2.1.06.001 (Anticipo de Clientes)</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Concepto libre o automático */}
          <div>
            <label className="block text-xs font-bold text-[#1B1D22] mb-1">
              Concepto del Recibo (opcional - generado automáticamente si se deja en blanco)
            </label>
            <input
              type="text"
              placeholder="Ej: Cancelación de Factura F-0021 y retenciones aplicadas"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22]"
            />
          </div>

          {/* Botones de acción */}
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
              disabled={guardando || totalLiquidado <= 0}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
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
