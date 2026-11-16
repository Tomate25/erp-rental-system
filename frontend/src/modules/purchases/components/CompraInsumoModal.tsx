import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ShoppingBag, AlertTriangle } from 'lucide-react';
import type { Provider } from '../../providers/types/provider.types';
import type { Insumo } from '../../insumos/types/insumo.types';
import { createCompraInsumo } from '../services/purchases.api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface CompraInsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  providers: Provider[];
  insumos: Insumo[];
}

interface LineDraft {
  insumoId: string;
  cantidad: string;
  costoUnitario: string;
  incluyeIva: boolean;
}

export const CUENTAS_EGRESO = [
  { codigo: '110201', label: '110201 - LA FISE 750-100-489' },
  { codigo: '110202', label: '110202 - LA FISE 133-023-603' },
  { codigo: '110203', label: '110203 - BANPRO 701-279-700' },
  { codigo: '110205', label: '110205 - BANPRO US 711-279-691' },
  { codigo: '110102', label: '110102 - CAJA CHICA' },
  { codigo: '110101', label: '110101 - CAJA GENERAL' },
];

export const CompraInsumoModal: React.FC<CompraInsumoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  providers,
  insumos,
}) => {
  const [proveedorId, setProveedorId] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaCompra, setFechaCompra] = useState(() => new Date().toISOString().slice(0, 10));
  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [plazoCreditoDias, setPlazoCreditoDias] = useState('30');
  const [metodoPago, setMetodoPago] = useState('TRANSFERENCIA');
  const [cuentaPagoCodigo, setCuentaPagoCodigo] = useState('110201');
  const [aplicaIva, setAplicaIva] = useState(true);
  const [recibirInmediato, setRecibirInmediato] = useState(true);
  const [notas, setNotas] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const firstProv = providers.find((p) => p.activo) || providers[0];
      setProveedorId(firstProv?.id || '');
      setProveedorNombre(firstProv?.nombre || '');
      setNumeroFactura('');
      setFechaCompra(new Date().toISOString().slice(0, 10));
      setCondicionPago(firstProv?.condicionPago === 'CREDITO' ? 'CREDITO' : 'CONTADO');
      setPlazoCreditoDias(String(firstProv?.plazoCreditoDias || 30));
      setMetodoPago('TRANSFERENCIA');
      setCuentaPagoCodigo('110201');
      setAplicaIva(true);
      setRecibirInmediato(true);
      setNotas('');
      const firstInsumo = insumos[0];
      setLines(
        firstInsumo
          ? [
              {
                insumoId: firstInsumo.id,
                cantidad: '1',
                costoUnitario: String(Number(firstInsumo.costoUnitario || 0)),
                incluyeIva: firstInsumo.costoIncluyeIva !== false,
              },
            ]
          : [],
      );
      setError(null);
    }
  }, [isOpen, providers, insumos]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let iva = 0;
    for (const l of lines) {
      const q = Number(l.cantidad) || 0;
      const c = Number(l.costoUnitario) || 0;
      const sub = Math.round(q * c * 100) / 100;
      const lineIva = aplicaIva && l.incluyeIva ? Math.round(sub * 0.15 * 100) / 100 : 0;
      subtotal = Math.round((subtotal + sub) * 100) / 100;
      iva = Math.round((iva + lineIva) * 100) / 100;
    }
    return {
      subtotal,
      iva,
      total: Math.round((subtotal + iva) * 100) / 100,
    };
  }, [lines, aplicaIva]);

  if (!isOpen) return null;

  const handleProviderChange = (id: string) => {
    setProveedorId(id);
    const found = providers.find((p) => p.id === id);
    if (found) {
      setProveedorNombre(found.nombre);
      setCondicionPago(found.condicionPago === 'CREDITO' ? 'CREDITO' : 'CONTADO');
      setPlazoCreditoDias(String(found.plazoCreditoDias || 30));
    }
  };

  const handleAddLine = () => {
    const first = insumos[0];
    if (!first) return;
    setLines((prev) => [
      ...prev,
      {
        insumoId: first.id,
        cantidad: '1',
        costoUnitario: String(Number(first.costoUnitario || 0)),
        incluyeIva: first.costoIncluyeIva !== false,
      },
    ]);
  };

  const handleLineChange = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        if (patch.insumoId) {
          const ins = insumos.find((x) => x.id === patch.insumoId);
          if (ins) {
            next.costoUnitario = String(Number(ins.costoUnitario || 0));
            next.incluyeIva = ins.costoIncluyeIva !== false;
          }
        }
        return next;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorId && !proveedorNombre.trim()) {
      setError('Selecciona o indica un proveedor para la compra.');
      return;
    }
    if (lines.length === 0) {
      setError('Agrega al menos un insumo en la orden de compra.');
      return;
    }
    for (const l of lines) {
      if (!l.insumoId || Number(l.cantidad) <= 0 || Number(l.costoUnitario) < 0) {
        setError('Verifica que cada línea tenga insumo, cantidad > 0 y costo válido.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await createCompraInsumo({
        proveedorId: proveedorId || undefined,
        proveedorNombre: proveedorNombre.trim() || undefined,
        numeroFactura: numeroFactura.trim() || undefined,
        fechaCompra,
        condicionPago,
        plazoCreditoDias: condicionPago === 'CREDITO' ? Number(plazoCreditoDias) || 0 : 0,
        metodoPago,
        cuentaPagoCodigo,
        aplicaIva,
        recibirInmediato,
        notas: notas.trim() || undefined,
        items: lines.map((l) => ({
          insumoId: l.insumoId,
          cantidad: Number(l.cantidad),
          costoUnitario: Number(l.costoUnitario),
          incluyeIva: l.incluyeIva,
        })),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar la compra de insumos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900">
                Nueva Compra de Insumos y Repuestos
              </h2>
              <p className="text-xs text-zinc-500">
                Factura multi-línea con ingreso automático a Bodega, Kardex, Asiento Contable y CxP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <select
                value={proveedorId}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
              >
                <option value="">-- Otro / Manual --</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tipo})
                  </option>
                ))}
              </select>
              {!proveedorId && (
                <input
                  type="text"
                  placeholder="Nombre del proveedor"
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                  className="mt-1.5 w-full px-3 py-1.5 border border-zinc-300 rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Nº Factura / Documento</label>
              <input
                type="text"
                placeholder="Ej. FAC-001428"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Fecha de Compra</label>
              <input
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Condición de Pago</label>
              <select
                value={condicionPago}
                onChange={(e) => setCondicionPago(e.target.value as 'CONTADO' | 'CREDITO')}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
              >
                <option value="CONTADO">CONTADO (Pago inmediato)</option>
                <option value="CREDITO">CRÉDITO (Cuenta por Pagar 210101)</option>
              </select>
            </div>

            {condicionPago === 'CREDITO' ? (
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Plazo de Crédito (días)</label>
                <input
                  type="number"
                  min="0"
                  value={plazoCreditoDias}
                  onChange={(e) => setPlazoCreditoDias(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Forma y Cuenta de Pago</label>
                <select
                  value={cuentaPagoCodigo}
                  onChange={(e) => {
                    const code = e.target.value;
                    setCuentaPagoCodigo(code);
                    setMetodoPago(code.startsWith('1101') ? 'EFECTIVO' : 'TRANSFERENCIA');
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white"
                >
                  {CUENTAS_EGRESO.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 font-semibold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aplicaIva}
                  onChange={(e) => setAplicaIva(e.target.checked)}
                  className="rounded"
                />
                <span>Calcular IVA 15% acreditable (110702)</span>
              </label>
              <label className="flex items-center gap-2 font-semibold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recibirInmediato}
                  onChange={(e) => setRecibirInmediato(e.target.checked)}
                  className="rounded"
                />
                <span>Recibir ahora (sumar stock + Kardex)</span>
              </label>
            </div>
          </div>

          {/* Líneas de Insumos */}
          <div className="border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-zinc-700">
                Detalle de Insumos a Comprar
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                disabled={insumos.length === 0}
                className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-900 text-white text-[11px] font-bold rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Línea
              </button>
            </div>

            {insumos.length === 0 ? (
              <div className="p-6 text-center text-xs text-amber-700 bg-amber-50">
                No hay insumos registrados en el catálogo de Bodega. Crea primero los insumos en Bodega de Insumos.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200">
                {lines.map((line, idx) => {
                  const sub =
                    Math.round((Number(line.cantidad) || 0) * (Number(line.costoUnitario) || 0) * 100) /
                    100;
                  const iva =
                    aplicaIva && line.incluyeIva ? Math.round(sub * 0.15 * 100) / 100 : 0;
                  return (
                    <div
                      key={idx}
                      className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="md:col-span-5">
                        <select
                          value={line.insumoId}
                          onChange={(e) => handleLineChange(idx, { insumoId: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white"
                        >
                          {insumos.map((ins) => (
                            <option key={ins.id} value={ins.id}>
                              {ins.codigo ? `[${ins.codigo}] ` : ''}
                              {ins.nombre} ({ins.unidadMedida} · Stock: {Number(ins.stockActual)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Cant."
                          value={line.cantidad}
                          onChange={(e) => handleLineChange(idx, { cantidad: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg font-mono text-right"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Costo Unit."
                          value={line.costoUnitario}
                          onChange={(e) =>
                            handleLineChange(idx, { costoUnitario: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg font-mono text-right"
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-zinc-600 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!aplicaIva}
                            checked={aplicaIva && line.incluyeIva}
                            onChange={(e) =>
                              handleLineChange(idx, { incluyeIva: e.target.checked })
                            }
                          />
                          IVA
                        </label>
                        <span className="font-mono font-bold text-zinc-900">
                          {formatCurrency(sub + iva)}
                        </span>
                      </div>
                      <div className="md:col-span-1 text-right">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setLines((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Eliminar línea"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Notas / Observaciones</label>
              <input
                type="text"
                placeholder="Ej. Reposición quincenal de lubricantes y filtros"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              />
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-mono space-y-1">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal Neto:</span>
                <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>IVA Acreditable (15%):</span>
                <span className="font-bold">{formatCurrency(totals.iva)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-zinc-900 border-t border-zinc-200 pt-1.5">
                <span>TOTAL COMPRA:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || insumos.length === 0}
              className="px-5 py-2 text-xs font-black text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? 'Guardando...'
                : recibirInmediato
                  ? 'Confirmar Compra e Ingresar a Bodega'
                  : 'Guardar como Borrador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
