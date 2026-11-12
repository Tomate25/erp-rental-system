import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Truck,
  Package,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Provider } from '../types/provider.types';
import { getProviderById } from '../services/providers.api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface ProviderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string | null;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  isOpen,
  onClose,
  providerId,
}) => {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'EQUIPOS' | 'INSUMOS'>('EQUIPOS');

  useEffect(() => {
    if (isOpen && providerId) {
      setLoading(true);
      getProviderById(providerId)
        .then((data) => {
          setProvider(data);
          if (data.tipo === 'INSUMOS_Y_REPUESTOS') {
            setActiveTab('INSUMOS');
          } else {
            setActiveTab('EQUIPOS');
          }
        })
        .catch((err) => {
          console.error('Error cargando detalle del proveedor:', err);
          setProvider(null);
        })
        .finally(() => setLoading(false));
    } else {
      setProvider(null);
    }
  }, [isOpen, providerId]);

  if (!isOpen) return null;

  const equipos = provider?.equipos || [];
  const insumos = (provider as any)?.insumos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-zinc-900">
                  {provider?.nombre || 'Cargando proveedor...'}
                </h2>
                {provider && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      provider.activo
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                    }`}
                  >
                    {provider.activo ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-zinc-400" />}
                    {provider.activo ? 'Activo' : 'Inactivo'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {provider?.razonSocial ? `${provider.razonSocial} · ` : ''}Tipo: <strong className="text-zinc-700">{provider?.tipo || 'GENERAL'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs font-bold text-zinc-500">
            Cargando ficha técnica y catálogo suministrado...
          </div>
        ) : !provider ? (
          <div className="p-12 text-center text-xs text-red-600 font-bold">
            No se pudo obtener la información del proveedor seleccionado.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Tarjeta de Datos Comerciales y Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Identificación Fiscal</span>
                <span className="font-mono font-bold text-zinc-900 block">{provider.identificacion || 'No registrada'}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block pt-1">Contacto Directo</span>
                <span className="font-medium text-zinc-800 block">{provider.contacto || 'No especificado'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Teléfono / Móvil</span>
                <div className="flex items-center gap-1 font-mono text-zinc-800">
                  <Phone className="w-3 h-3 text-zinc-400" /> {provider.telefono || 'Sin teléfono'}
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block pt-1">Correo Electrónico</span>
                <div className="flex items-center gap-1 text-zinc-800">
                  <Mail className="w-3 h-3 text-zinc-400" /> {provider.email || 'Sin correo'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Condición Comercial</span>
                <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>{provider.condicionPago}</span>
                  {provider.condicionPago === 'CREDITO' && (
                    <span className="text-[11px] font-normal text-zinc-600">({provider.plazoCreditoDias} días plazo)</span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block pt-1">Dirección Física</span>
                <div className="flex items-start gap-1 text-zinc-600 text-[11px]">
                  <MapPin className="w-3 h-3 text-zinc-400 shrink-0 mt-0.5" />
                  <span>{provider.direccion || 'Sin dirección registrada'}</span>
                </div>
              </div>

              {provider.notas && (
                <div className="col-span-full pt-2 border-t border-zinc-200/80 text-[11px] text-zinc-600">
                  <strong className="text-zinc-800">Notas de negociación:</strong> {provider.notas}
                </div>
              )}
            </div>

            {/* Pestañas de Catálogo Vinculado */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-zinc-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('EQUIPOS')}
                  className={`pb-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'EQUIPOS'
                      ? 'border-zinc-900 text-zinc-900'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Maquinaria Externa ({equipos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('INSUMOS')}
                  className={`pb-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'INSUMOS'
                      ? 'border-zinc-900 text-zinc-900'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Insumos y Consumibles ({insumos.length})</span>
                </button>
              </div>

              {/* Contenido Pestaña Equipos */}
              {activeTab === 'EQUIPOS' && (
                <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                  {equipos.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 space-y-1">
                      <Truck className="w-6 h-6 mx-auto text-zinc-400" />
                      <p className="font-bold text-zinc-700">Sin maquinaria asignada</p>
                      <p className="text-[11px]">
                        No hay equipos en inventario vinculados con este proveedor actualmente.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3">Código</th>
                          <th className="p-3">Modelo / Maquinaria</th>
                          <th className="p-3">N° Serie</th>
                          <th className="p-3 text-right">Costo a BM (Tarifa Proveedor)</th>
                          <th className="p-3 text-center">Estado Operativo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {equipos.map((eq: any) => (
                          <tr key={eq.id} className="hover:bg-zinc-50/50">
                            <td className="p-3 font-mono font-bold text-zinc-900">{eq.codigo || 'S/C'}</td>
                            <td className="p-3 font-bold text-zinc-800">{eq.modelo}</td>
                            <td className="p-3 font-mono text-zinc-600">{eq.numeroSerie || '---'}</td>
                            <td className="p-3 text-right font-mono font-bold text-zinc-900">
                              {eq.precioProveedor ? formatCurrency(Number(eq.precioProveedor)) : '---'}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  eq.estado === 'DISPONIBLE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : eq.estado === 'ALQUILADO' || eq.estado === 'DESPACHADO'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-zinc-100 text-zinc-700'
                                }`}
                              >
                                {eq.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Contenido Pestaña Insumos */}
              {activeTab === 'INSUMOS' && (
                <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                  {insumos.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 space-y-1">
                      <Package className="w-6 h-6 mx-auto text-zinc-400" />
                      <p className="font-bold text-zinc-700">Sin insumos registrados</p>
                      <p className="text-[11px]">
                        No hay consumibles o lubricantes de bodega asociados a este proveedor.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3">Código</th>
                          <th className="p-3">Insumo</th>
                          <th className="p-3">Categoría</th>
                          <th className="p-3 text-right">Existencia en Bodega</th>
                          <th className="p-3 text-right">Último Costo Compra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {insumos.map((ins: any) => (
                          <tr key={ins.id} className="hover:bg-zinc-50/50">
                            <td className="p-3 font-mono font-bold text-zinc-900">{ins.codigo || 'S/C'}</td>
                            <td className="p-3 font-bold text-zinc-800">{ins.nombre}</td>
                            <td className="p-3">
                              <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded text-[10px] font-semibold border border-zinc-200">
                                {ins.categoria}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-zinc-900">
                              {Number(ins.stockActual)} {ins.unidadMedida}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-zinc-900">
                              {formatCurrency(Number(ins.costoUnitario))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
