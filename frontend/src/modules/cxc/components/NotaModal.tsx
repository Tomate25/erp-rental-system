import React, { useState } from 'react';
import { cxcApi } from '../services/cxc.api';
import { X, Check, AlertCircle } from 'lucide-react';

interface NotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  tipoCambioBcn?: number;
}

export const NotaModal: React.FC<NotaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientes,
}) => {
  const [tipoNota, setTipoNota] = useState<'DEBITO' | 'CREDITO'>('DEBITO');
  const [clienteId, setClienteId] = useState('');
  const sucursalId = 'KM10';
  const [origen, setOrigen] = useState<'RETORNO_DANO' | 'PENALIDAD_ARREGLO' | 'INTERES_MORA' | 'AJUSTE' | 'DEVOLUCION_EQUIPO'>('RETORNO_DANO');
  const [condicionPago, setCondicionPago] = useState<'CREDITO' | 'CONTADO'>('CREDITO');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [aplicaIva, setAplicaIva] = useState(false);
  const [fechaVence, setFechaVence] = useState(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const iva = aplicaIva ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
  const total = Math.round((subtotal + iva) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clienteId) {
      setError('Seleccione un cliente.');
      return;
    }
    if (subtotal <= 0) {
      setError('El subtotal debe ser mayor a 0.');
      return;
    }
    if (!concepto.trim()) {
      setError('Ingrese el concepto o justificación de la nota.');
      return;
    }

    setGuardando(true);
    try {
      await cxcApi.crearNota({
        clienteId,
        sucursalId,
        tipoNota,
        origen,
        condicionPago,
        subtotal,
        iva,
        total,
        fechaVence,
        concepto,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al emitir la nota.');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Emitir {tipoNota === 'DEBITO' ? 'Nota de Débito (ND)' : 'Nota de Crédito (NC)'}
            </h2>
            <p className="text-xs text-gray-500">Cargos o abonos extraordinarios a cartera y afectación contable</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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

          {/* Selector Tipo Nota */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
            <button
              type="button"
              onClick={() => setTipoNota('DEBITO')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                tipoNota === 'DEBITO' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Nota de Débito (Cargo)
            </button>
            <button
              type="button"
              onClick={() => setTipoNota('CREDITO')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                tipoNota === 'CREDITO' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Nota de Crédito (Abono)
            </button>
          </div>

          {/* Cliente y Sucursal */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Cliente *</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-medium"
              >
                <option value="">-- Seleccionar cliente --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.rfc || 'Sin RUC'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Origen / Causa *</label>
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-medium"
                >
                  <option value="RETORNO_DANO">Daño en Retorno de Equipo</option>
                  <option value="PENALIDAD_ARREGLO">Penalidad por Incumplimiento</option>
                  <option value="INTERES_MORA">Intereses Moratorios</option>
                  <option value="AJUSTE">Ajuste / Gastos Administrativos</option>
                  <option value="DEVOLUCION_EQUIPO">Devolución / Descuento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Condición de Pago</label>
                <select
                  value={condicionPago}
                  onChange={(e) => setCondicionPago(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-medium"
                >
                  <option value="CREDITO">Crédito (Carga a CxC Cartera)</option>
                  <option value="CONTADO">Contado (Cobro directo en caja)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Importes */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Subtotal (C$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={subtotal || ''}
                  onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Fecha Vencimiento
                </label>
                <input
                  type="date"
                  value={fechaVence}
                  onChange={(e) => setFechaVence(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={aplicaIva}
                  onChange={(e) => setAplicaIva(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Aplica IVA 15% (C$ {iva.toFixed(2)})</span>
              </label>
              <div className="text-right">
                <span className="text-gray-500 text-[11px]">Total: </span>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">C$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Concepto / Detalle *</label>
            <textarea
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              rows={2}
              placeholder="Ej: Cobro por reparación de marco de andamio doblado en retorno según acta de devolución..."
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>

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
              disabled={guardando || subtotal <= 0}
              className="px-5 py-2 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {guardando ? 'Emitiendo nota...' : `Emitir ${tipoNota === 'DEBITO' ? 'ND' : 'NC'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
