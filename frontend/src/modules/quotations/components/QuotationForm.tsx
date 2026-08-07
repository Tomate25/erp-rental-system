import React, { useState } from 'react';
import type { Cotizacion, DetalleCotizacion } from '../types/quotation.types';
import type { EstadoCotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { createQuotation, updateQuotation, createNewVersion } from '../services/quotations.api';
import { formatCurrency } from '../../../shared/utils/formatters';
import { ArrowLeft, Save, Send, CheckCircle, RefreshCw, Plus, Trash2, Search, User, Briefcase, Calculator } from 'lucide-react';
import { ClientSearchModal } from './ClientSearchModal';
import { EquipmentSearchModal } from './EquipmentSearchModal';

interface QuotationFormProps {
  initialData?: Cotizacion | null;
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({ initialData, onCancel, onSubmitSuccess }) => {
  const isEditMode = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clienteId, setClienteId] = useState(initialData?.clienteId || '');
  const [clienteNombre, setClienteNombre] = useState(initialData?.cliente?.nombre || '');
  const [proyecto, setProyecto] = useState(initialData?.proyecto || '');
  const [atencion, setAtencion] = useState(initialData?.atencion || '');
  const [telefono, setTelefono] = useState(initialData?.telefono || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [referencia, setReferencia] = useState(initialData?.referencia || '');
  const [condiciones, setCondiciones] = useState(initialData?.condiciones || '');
  const [validezDias, setValidezDias] = useState(initialData?.validezDias || 15);
  const [descuentoGlobal, setDescuentoGlobal] = useState(initialData?.descuento || 0);

  const [items, setItems] = useState<DetalleCotizacion[]>(initialData?.items || []);

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);

  // Totals Calculation
  const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const subtotalConDescuento = Math.max(0, subtotal - descuentoGlobal);
  const iva = subtotalConDescuento * 0.15; // 15% IVA for example, adjust as needed
  const total = subtotalConDescuento + iva;

  const handleAddItem = () => {
    setIsEquipmentModalOpen(true);
  };

  const handleManualAddItem = () => {
    setItems([
      ...items,
      {
        descripcion: '',
        cantidad: 1,
        dias: 1,
        precioUnitario: 0,
        descuento: 0,
        subtotal: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof DetalleCotizacion, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate subtotal
    const base = item.cantidad * item.dias * item.precioUnitario;
    item.subtotal = Math.max(0, base - (item.descuento || 0));
    
    newItems[index] = item;
    setItems(newItems);
  };

  const handleSubmit = async (estadoFinal: EstadoCotizacion) => {
    if (!clienteId) {
      setError('Debes seleccionar un cliente.');
      return;
    }
    if (items.length === 0) {
      setError('Debes agregar al menos un ítem a la cotización.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      clienteId,
      proyecto,
      atencion,
      telefono,
      email,
      referencia,
      condiciones,
      validezDias,
      descuento: descuentoGlobal,
      subtotal,
      iva,
      total,
      estado: estadoFinal,
      items: items.map(i => ({
        equipoId: i.equipoId,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        dias: i.dias,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        subtotal: i.subtotal
      }))
    };

    try {
      if (isEditMode && initialData) {
        await updateQuotation(initialData.id, payload);
      } else {
        await createQuotation(payload);
      }
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la cotización');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!initialData) return;
    setIsLoading(true);
    try {
      await createNewVersion(initialData.id);
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al versionar la cotización');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fadeIn pb-24">
      {/* Header Fijo */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 p-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-black text-slate-900 text-lg">
              {isEditMode ? `Cotización ${initialData.numeroCotizacion}` : 'Nueva Cotización'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isEditMode ? `Versión ${initialData.version} · Estado: ${initialData.estado}` : 'Completa los datos para generar el documento'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditMode && initialData.estado === EstadoCotizacionValues.EN_REVISION && (
            <button
              onClick={handleCreateVersion}
              disabled={isLoading}
              className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Nueva Versión
            </button>
          )}
          
          <button
            onClick={() => handleSubmit(EstadoCotizacionValues.BORRADOR)}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Borrador
          </button>

          <button
            onClick={() => handleSubmit(EstadoCotizacionValues.EN_REVISION)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar a Revisión
          </button>

          {isEditMode && (initialData.estado === EstadoCotizacionValues.EN_REVISION || initialData.estado === EstadoCotizacionValues.PENDIENTE) && (
            <button
              onClick={() => handleSubmit(EstadoCotizacionValues.ACEPTADA)}
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Aprobar
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-6xl mx-auto mt-4">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Sección: Datos Generales */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-blue-500" /> Datos del Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cliente *</label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={clienteNombre || 'Selecciona un cliente...'}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" /> Buscar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Atención (Contacto)</label>
              <input 
                type="text" 
                value={atencion} 
                onChange={(e) => setAtencion(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono</label>
              <input 
                type="text" 
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proyecto</label>
              <input 
                type="text" 
                value={proyecto} 
                onChange={(e) => setProyecto(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Sección: Ítems */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" /> Equipos y Servicios
            </h3>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleManualAddItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Ítem Manual
              </button>
              <button 
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg"
              >
                <Search className="w-3.5 h-3.5" /> Buscar en Inventario
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Descripción</th>
                  <th className="p-3 w-20 text-center">Cant.</th>
                  <th className="p-3 w-20 text-center">Días</th>
                  <th className="p-3 w-28 text-right">P. Unitario</th>
                  <th className="p-3 w-24 text-right">Desc.</th>
                  <th className="p-3 w-32 text-right">Subtotal</th>
                  <th className="p-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No has agregado ningún equipo o servicio a la cotización.
                    </td>
                  </tr>
                )}
                {items.map((item, index) => (
                  <tr key={index} className="bg-white">
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.descripcion}
                        onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del equipo..."
                        className="w-full px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        min="1"
                        value={item.cantidad === 0 ? '' : item.cantidad}
                        onChange={(e) => updateItem(index, 'cantidad', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-center outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        min="1"
                        value={item.dias === 0 ? '' : item.dias}
                        onChange={(e) => updateItem(index, 'dias', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-center outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.precioUnitario === 0 ? '' : item.precioUnitario}
                        onChange={(e) => updateItem(index, 'precioUnitario', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-right outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.descuento === 0 ? '' : item.descuento}
                        onChange={(e) => updateItem(index, 'descuento', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-right outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2 text-right font-black text-slate-700 bg-slate-50/50">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección: Totales y Condiciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Condiciones de Pago y Notas</label>
              <textarea 
                rows={4}
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
                placeholder="Ej. Pago a 30 días, el equipo no incluye operador..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Referencia</label>
                <input 
                  type="text" 
                  value={referencia} 
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Validez (Días)</label>
                <input 
                  type="number" 
                  value={validezDias} 
                  onChange={(e) => setValidezDias(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
              <Calculator className="w-4 h-4 text-blue-500" /> Resumen Financiero
            </h3>
            
            <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
              <span>Subtotal Items</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
              <span>Descuento Global</span>
              <input 
                type="number" 
                value={descuentoGlobal === 0 ? '' : descuentoGlobal}
                onChange={(e) => setDescuentoGlobal(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 font-bold pt-2 border-t border-slate-200/50">
              <span>Subtotal Final</span>
              <span>{formatCurrency(subtotalConDescuento)}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
              <span>IVA (15%)</span>
              <span>{formatCurrency(iva)}</span>
            </div>
            
            <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-slate-200 text-sm">
              <span className="font-black text-slate-800 uppercase">Total General</span>
              <span className="font-black text-blue-600 text-lg">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <ClientSearchModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelect={(client) => {
          setClienteId(client.id);
          setClienteNombre(client.nombre);
          if (client.telefono) setTelefono(client.telefono);
          if (client.emailFacturacion) setEmail(client.emailFacturacion);
          if (client.condicionPago) setCondiciones(`Condición de pago: ${client.condicionPago}`);
        }}
      />

      <EquipmentSearchModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        onSelect={(equipment) => {
          const defaultPrice = equipment.precioRentaDia || 0;
          setItems([
            ...items,
            {
              equipoId: equipment.id,
              descripcion: equipment.descripcion || `${equipment.marca?.nombre} ${equipment.modelo}`,
              cantidad: 1,
              dias: 1,
              precioUnitario: defaultPrice,
              descuento: 0,
              subtotal: defaultPrice
            }
          ]);
        }}
      />
    </div>
  );
};
