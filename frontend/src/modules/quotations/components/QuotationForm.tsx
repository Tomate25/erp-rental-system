import React, { useState, useEffect } from 'react';
import type { Cotizacion, DetalleCotizacion } from '../types/quotation.types';
import type { EstadoCotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { createQuotation, updateQuotation, createNewVersion, getQuotationVersions } from '../services/quotations.api';
import { formatCurrency } from '../../../shared/utils/formatters';
import { ArrowLeft, Save, Send, CheckCircle, Plus, Trash2, Search, User, Briefcase, History, Check, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { ClientSearchModal } from './ClientSearchModal';
import { EquipmentSearchModal } from './EquipmentSearchModal';
import { RevisionNoteModal } from './RevisionNoteModal';

interface QuotationFormProps {
  initialData?: Cotizacion | null;
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({ initialData, onCancel, onSubmitSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionSuccessMsg, setVersionSuccessMsg] = useState<string | null>(null);

  // Estado de la Cotización Activa (Versión actual o seleccionada)
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(initialData?.id || null);
  const [numeroCotizacion, setNumeroCotizacion] = useState<string>(initialData?.numeroCotizacion || '');
  const [versionNumber, setVersionNumber] = useState<number>(initialData?.version || 1);
  const [estadoActual, setEstadoActual] = useState<EstadoCotizacion>(initialData?.estado || EstadoCotizacionValues.BORRADOR);
  const [notasRevision, setNotasRevision] = useState<string | null>(initialData?.notasRevision || null);

  // Lista de todas las versiones históricas para esta cotización (v1, v2, v3...)
  const [versionHistory, setVersionHistory] = useState<Cotizacion[]>([]);

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
  const [descuentoGlobal, setDescuentoGlobal] = useState<any>(initialData?.descuento ? initialData.descuento : '');

  const [items, setItems] = useState<DetalleCotizacion[]>(initialData?.items || []);

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  const isEditMode = !!activeQuoteId;
  const maxVersionInHistory = versionHistory.length > 0 ? Math.max(...versionHistory.map(v => v.version)) : versionNumber;
  const isLatestVersion = versionHistory.length === 0 || (versionHistory[0]?.id === activeQuoteId && versionNumber >= maxVersionInHistory);
  const isFormEditable = isLatestVersion && (!isEditMode || estadoActual === EstadoCotizacionValues.BORRADOR || estadoActual === EstadoCotizacionValues.PENDIENTE || estadoActual === EstadoCotizacionValues.RECHAZADA);

  // Cargar el historial completo de versiones de esta cotización
  const fetchVersionHistory = async (quoteNumber: string) => {
    try {
      const history = await getQuotationVersions(quoteNumber);
      setVersionHistory(history);
    } catch (e) {
      console.error('Error al cargar historial de versiones:', e);
    }
  };

  useEffect(() => {
    if (initialData?.numeroCotizacion) {
      fetchVersionHistory(initialData.numeroCotizacion);
    }
  }, [initialData]);

  // Cambiar entre versiones (ej. Ver v1 o editar v2)
  const handleSelectVersion = (q: Cotizacion) => {
    setActiveQuoteId(q.id);
    setNumeroCotizacion(q.numeroCotizacion);
    setVersionNumber(q.version);
    setEstadoActual(q.estado);
    setNotasRevision(q.notasRevision || null);
    setClienteId(q.clienteId);
    setClienteNombre(q.cliente?.nombre || '');
    setProyecto(q.proyecto || '');
    setAtencion(q.atencion || '');
    setTelefono(q.telefono || '');
    setEmail(q.email || '');
    setReferencia(q.referencia || '');
    setCondiciones(q.condiciones || '');
    setValidezDias(q.validezDias || 15);
    setDescuentoGlobal(q.descuento ? q.descuento : '');
    setItems(q.items || []);
    setVersionSuccessMsg(null);
  };

  // Totals Calculation
  const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const subtotalConDescuento = Math.max(0, subtotal - (parseFloat(descuentoGlobal) || 0));
  const iva = subtotalConDescuento * 0.15;
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
        precioUnitario: '' as any,
        descuento: '' as any,
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
    const cantidad = parseFloat(item.cantidad as any) || 0;
    const dias = parseFloat(item.dias as any) || 0;
    const precioUnitario = parseFloat(item.precioUnitario as any) || 0;
    const descuento = parseFloat(item.descuento as any) || 0;

    const base = cantidad * dias * precioUnitario;
    item.subtotal = Math.max(0, base - descuento);
    
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

    const descGlobalNum = parseFloat(descuentoGlobal as any) || 0;

    const payload = {
      clienteId,
      proyecto,
      atencion,
      telefono,
      email,
      referencia,
      condiciones,
      validezDias: Number(validezDias) || 15,
      descuento: descGlobalNum,
      subtotal,
      iva,
      total,
      estado: estadoFinal,
      items: items.map(i => ({
        equipoId: i.equipoId || undefined,
        descripcion: i.descripcion,
        cantidad: parseFloat(i.cantidad as any) || 1,
        dias: parseFloat(i.dias as any) || 1,
        precioUnitario: parseFloat(i.precioUnitario as any) || 0,
        descuento: parseFloat(i.descuento as any) || 0,
        subtotal: parseFloat(i.subtotal as any) || 0
      }))
    };

    try {
      // Si estamos modificando una cotización existente que fue devuelta/rechazada o ya estaba en revisión,
      // al hacer clic en "Enviar a Revisión", de manera AUTOMÁTICA genera la Versión v2, v3...
      if (
        activeQuoteId && 
        estadoFinal === EstadoCotizacionValues.EN_REVISION && 
        (estadoActual === EstadoCotizacionValues.RECHAZADA || estadoActual === EstadoCotizacionValues.EN_REVISION || versionNumber > 1 || !!notasRevision)
      ) {
        // 1. Guardar primero los cambios de la versión actual
        await updateQuotation(activeQuoteId, payload);

        // 2. Generar automáticamente la nueva versión consecutivo (v2, v3...)
        await createNewVersion(activeQuoteId);
      } else if (activeQuoteId) {
        await updateQuotation(activeQuoteId, payload);
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

  // Devolver / Solicitar cambios con notas de revisión (Supervisión)
  const handleRejectWithNotes = async (nota: string) => {
    if (!activeQuoteId) return;
    setIsLoading(true);
    setError(null);

    try {
      await updateQuotation(activeQuoteId, {
        estado: EstadoCotizacionValues.RECHAZADA,
        notasRevision: nota
      });
      setIsRevisionModalOpen(false);
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al devolver la cotización');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E5E8EE] rounded-3xl shadow-xs overflow-hidden animate-fadeIn pb-24 font-sans">
      {/* Header Fijo */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[#E5E8EE] p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-[#F4F6F9] text-[#747780] hover:text-[#1B1D22] transition-colors border border-[#E5E8EE]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-black text-[#1B1D22] text-lg flex items-center gap-2">
              {isEditMode ? `Cotización ${numeroCotizacion}` : 'Nueva Cotización'}
              {isEditMode && (
                <span className="px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] text-xs font-black border border-[#1A73E8]/20">
                  v{versionNumber}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#747780] font-medium mt-0.5">
              {isEditMode ? `Estado actual: ${estadoActual}` : 'Completa los datos para generar la propuesta comercial'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Caso A: Si la cotización está EN_REVISION -> Solo mostrar Devolver con Observaciones y Aprobar Cotización */}
          {isEditMode && isLatestVersion && estadoActual === EstadoCotizacionValues.EN_REVISION && (
            <>
              <button
                onClick={() => setIsRevisionModalOpen(true)}
                disabled={isLoading}
                className="px-3.5 py-2 bg-[#C55500]/10 text-[#C55500] hover:bg-[#C55500]/20 font-extrabold text-xs rounded-xl border border-[#C55500]/20 transition-all flex items-center gap-1.5"
                title="Devolver al asesor con observaciones de corrección"
              >
                <XCircle className="w-4 h-4" />
                <span>Devolver con Observaciones</span>
              </button>

              <button
                onClick={() => handleSubmit(EstadoCotizacionValues.ACEPTADA)}
                disabled={isLoading}
                className="btn-precision-tertiary text-xs py-2 px-3.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Aprobar Cotización</span>
              </button>
            </>
          )}

          {/* Caso B: Si está en BORRADOR, PENDIENTE o RECHAZADA (Devuelta) -> Permitir Guardar Borrador y Enviar a Revisión */}
          {isFormEditable && (
            <>
              <button
                onClick={() => handleSubmit(EstadoCotizacionValues.BORRADOR)}
                disabled={isLoading}
                className="btn-precision-outline text-xs py-2 px-3.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Borrador</span>
              </button>

              <button
                onClick={() => handleSubmit(EstadoCotizacionValues.EN_REVISION)}
                disabled={isLoading}
                className="btn-precision-primary text-xs py-2 px-3.5"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isEditMode && (estadoActual === EstadoCotizacionValues.RECHAZADA || notasRevision)
                    ? `Enviar a Revisión (Genera v${versionNumber + 1})`
                    : 'Enviar a Revisión'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Selector de Historial de Versiones (v1, v2, v3...) */}
      {versionHistory.length > 1 && (
        <div className="bg-[#F4F6F9] px-6 py-3 border-b border-[#E5E8EE] flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-extrabold text-[#747780] uppercase tracking-wider flex items-center gap-1 shrink-0">
            <History className="w-4 h-4 text-[#1A73E8]" /> Historial de Versiones:
          </span>
          <div className="flex items-center gap-2">
            {versionHistory.map((v) => {
              const isSelected = v.id === activeQuoteId;
              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVersion(v)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                      : 'bg-white text-[#37474F] border-[#E5E8EE] hover:bg-[#E8F0FE] hover:text-[#1A73E8]'
                  }`}
                >
                  <span>v{v.version}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#F4F6F9] text-[#747780]'
                  }`}>
                    {v.estado}
                  </span>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerta de devolución con notas de supervisión */}
      {notasRevision && isLatestVersion && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] space-y-1 animate-fadeIn">
          <div className="flex items-center gap-2 font-black text-xs">
            <AlertTriangle className="w-4 h-4 text-[#C55500]" />
            <span>COTIZACIÓN DEVUELTA POR SUPERVISIÓN (Versión v{versionNumber})</span>
          </div>
          <p className="text-xs font-bold pl-6 text-[#1B1D22]">
            Motivo / Observación: "{notasRevision}"
          </p>
          <p className="text-[11px] font-medium pl-6 text-[#747780]">
            Realiza los cambios solicitados. Al hacer clic en <strong>"Enviar a Revisión"</strong>, se creará automáticamente la <strong>Versión v{versionNumber + 1}</strong> para autorización.
          </p>
        </div>
      )}

      {/* Alerta de notificación al crear nueva versión */}
      {versionSuccessMsg && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-[#E8F0FE] border border-[#1A73E8]/30 text-[#1A73E8] text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>{versionSuccessMsg}</span>
          <button onClick={() => setVersionSuccessMsg(null)} className="text-[10px] underline">Entendido</button>
        </div>
      )}

      {!isLatestVersion && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-[#F4F6F9] border border-[#E5E8EE] text-[#37474F] text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Lock className="w-4 h-4 text-[#747780] shrink-0" />
          <span>
            🔒 Estás consultando la <strong>Versión Archivada (v{versionNumber})</strong>. Esta versión es de solo lectura. Para realizar cambios o agregar productos, selecciona la versión vigente (<strong>v{maxVersionInHistory}</strong>) en la barra superior.
          </span>
        </div>
      )}

      <div className="p-6 space-y-8 w-full mt-2">
        {error && (
          <div className="p-4 bg-[#FDF2E9] text-[#C55500] text-xs font-bold rounded-2xl border border-[#C55500]/20">
            {error}
          </div>
        )}

        {/* Sección: Datos Generales */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[#1B1D22] flex items-center gap-2 border-b border-[#E5E8EE] pb-2">
            <User className="w-4 h-4 text-[#1A73E8]" /> Datos del Cliente y Proyecto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Cliente *</label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={clienteNombre || 'Selecciona un cliente...'}
                  className="precision-input bg-[#F4F6F9] font-bold text-xs cursor-not-allowed"
                />
                <button 
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  disabled={!isFormEditable}
                  className="btn-precision-secondary text-xs py-2 px-4"
                >
                  <Search className="w-4 h-4" /> Buscar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Atención (Contacto)</label>
              <input 
                type="text" 
                value={atencion} 
                onChange={(e) => setAtencion(e.target.value)}
                readOnly={!isFormEditable}
                placeholder="Nombre del contacto en obra"
                className="precision-input text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Teléfono</label>
              <input 
                type="text" 
                readOnly={!!clienteId}
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)}
                placeholder={clienteId ? "Sin teléfono registrado" : "Selecciona un cliente..."}
                className={`precision-input text-xs font-bold ${
                  clienteId ? 'bg-[#F4F6F9] text-[#37474F] cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Email Facturación</label>
              <input 
                type="email" 
                readOnly={!!clienteId}
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder={clienteId ? "Sin correo registrado" : "Selecciona un cliente..."}
                className={`precision-input text-xs font-bold ${
                  clienteId ? 'bg-[#F4F6F9] text-[#37474F] cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Proyecto / Obra</label>
              <input 
                type="text" 
                value={proyecto} 
                onChange={(e) => setProyecto(e.target.value)}
                readOnly={!isFormEditable}
                placeholder="Nombre del proyecto o sitio de trabajo"
                className="precision-input text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Sección: Ítems y Equipos Cotizados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
            <h3 className="text-sm font-black text-[#1B1D22] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#1A73E8]" /> Equipos y Servicios Cotizados
            </h3>
            {isFormEditable && (
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handleManualAddItem}
                  className="btn-precision-outline text-xs py-1.5 px-3"
                >
                  <Plus className="w-3.5 h-3.5" /> Ítem Manual
                </button>
                <button 
                  type="button"
                  onClick={handleAddItem}
                  className="btn-precision-primary text-xs py-1.5 px-3"
                >
                  <Search className="w-3.5 h-3.5" /> Buscar en Inventario
                </button>
              </div>
            )}
          </div>

          <div className="border border-[#E5E8EE] rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4F6F9] text-[#747780] font-black uppercase text-[10px] tracking-wider border-b border-[#E5E8EE]">
                  <th className="p-3.5">Descripción de Servicio / Equipo</th>
                  <th className="p-3.5 w-16 text-center">Cant.</th>
                  <th className="p-3.5 w-28 text-center">Duración (Días/Hrs)</th>
                  <th className="p-3.5 w-28 text-right">Tarifa (C$)</th>
                  <th className="p-3.5 w-24 text-right">Desc (C$)</th>
                  <th className="p-3.5 w-32 text-right">Subtotal</th>
                  <th className="p-3.5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-[#747780] font-medium">
                      No has agregado ningún equipo o servicio a la cotización.
                    </td>
                  </tr>
                )}
                {items.map((item, index) => (
                  <tr key={index} className="bg-white hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-2.5">
                      <input 
                        type="text" 
                        readOnly={!isFormEditable || !!item.equipoId}
                        value={item.descripcion}
                        onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del equipo o servicio..."
                        className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                          item.equipoId || !isFormEditable
                            ? 'bg-[#F4F6F9] border-[#E5E8EE] text-[#37474F] cursor-not-allowed' 
                            : 'bg-[#F8FAFC] border-[#E5E8EE] text-[#1B1D22] focus:bg-white focus:border-[#1A73E8]'
                        }`}
                      />
                    </td>
                    <td className="p-2.5">
                      <input 
                        type="number" 
                        min="1"
                        readOnly={!isFormEditable}
                        value={item.cantidad ?? ''}
                        onChange={(e) => updateItem(index, 'cantidad', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#E5E8EE] rounded-xl text-xs text-center font-bold text-[#1B1D22] outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          min="1"
                          readOnly={!isFormEditable}
                          value={item.dias ?? ''}
                          onChange={(e) => updateItem(index, 'dias', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#E5E8EE] rounded-xl text-xs text-center font-bold text-[#1B1D22] outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
                        />
                        <span className={`text-[9px] font-black px-1.5 py-1 rounded shrink-0 border ${
                          (item as any).tipoTarifa === 'HORA' || (item.precioUnitario && item.precioUnitario < 500)
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {(item as any).tipoTarifa === 'HORA' || (item.precioUnitario && item.precioUnitario < 500) ? 'hrs' : 'días'}
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="relative flex items-center">
                        <input 
                          type="number" 
                          step="any"
                          readOnly={!isFormEditable || !!item.equipoId}
                          value={item.precioUnitario === 0 || (item.precioUnitario as any) === '0' ? '' : item.precioUnitario ?? ''}
                          onChange={(e) => updateItem(index, 'precioUnitario', e.target.value)}
                          placeholder="0.00"
                          className={`w-full px-2.5 py-1.5 border rounded-xl text-xs text-right font-mono font-extrabold outline-none transition-all ${
                            item.equipoId 
                              ? 'bg-[#F4F6F9] border-[#E5E8EE] text-[#1B1D22] cursor-not-allowed pr-6' 
                              : 'bg-[#F8FAFC] border-[#E5E8EE] text-[#1B1D22] focus:bg-white focus:border-[#1A73E8]'
                          }`}
                        />
                        {item.equipoId && (
                          <Lock className="w-3 h-3 text-[#747780] absolute right-2 pointer-events-none" />
                        )}
                      </div>
                      <span className="text-[9px] text-[#747780] font-bold block text-right mt-0.5 font-mono">
                        {(item as any).tipoTarifa === 'HORA' || (item.precioUnitario && item.precioUnitario < 500) ? 'C$ / hr' : 'C$ / día'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <input 
                        type="number" 
                        step="any"
                        readOnly={!isFormEditable}
                        value={item.descuento === 0 || (item.descuento as any) === '0' ? '' : item.descuento ?? ''}
                        onChange={(e) => updateItem(index, 'descuento', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E5E8EE] rounded-xl text-xs text-right font-mono font-extrabold text-[#1B1D22] outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
                      />
                    </td>
                    <td className="p-2.5 text-right font-black text-[#1A73E8]">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="p-2.5 text-center">
                      {isFormEditable && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-[#C55500] hover:bg-[#FDF2E9] rounded-xl transition-colors"
                          title="Eliminar ítem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
              <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Condiciones de Pago y Notas</label>
              <textarea 
                rows={4}
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
                readOnly={!isFormEditable}
                placeholder="Ej. Pago a 30 días, el equipo no incluye operador..."
                className="precision-input text-xs resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Referencia</label>
                <input 
                  type="text" 
                  value={referencia} 
                  onChange={(e) => setReferencia(e.target.value)}
                  readOnly={!isFormEditable}
                  className="precision-input text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Validez (Días)</label>
                <input 
                  type="number" 
                  value={validezDias} 
                  onChange={(e) => setValidezDias(parseInt(e.target.value))}
                  readOnly={!isFormEditable}
                  className="precision-input text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#F4F6F9] p-6 rounded-2xl border border-[#E5E8EE] space-y-3 shadow-xs">
            <div className="flex justify-between items-center text-xs text-[#747780] font-bold">
              <span>Subtotal Bruto</span>
              <span className="font-mono text-[#1B1D22]">{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs text-[#747780] font-bold">
              <span>Descuento Global</span>
              <div className="flex items-center gap-1">
                <span className="text-[#C55500] font-mono font-bold">C$</span>
                <input 
                  type="number"
                  step="any"
                  value={descuentoGlobal === 0 || (descuentoGlobal as any) === '0' ? '' : descuentoGlobal ?? ''}
                  onChange={(e) => setDescuentoGlobal(e.target.value as any)}
                  readOnly={!isFormEditable}
                  placeholder="0.00"
                  className="w-24 px-2 py-1 bg-white border border-[#E5E8EE] rounded-lg text-right font-mono text-xs font-bold text-[#C55500]"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs text-[#747780] font-bold">
              <span>IVA (15%)</span>
              <span className="font-mono text-[#1B1D22]">{formatCurrency(iva)}</span>
            </div>
            
            <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-[#E5E8EE] text-sm">
              <span className="font-black text-[#1B1D22] uppercase">Total General</span>
              <span className="font-black text-[#1A73E8] text-lg">{formatCurrency(total)}</span>
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

          // Capturar cualquiera de los 3 teléfonos que tenga registrados el cliente
          const phoneList: string[] = [];
          if (client.telMovistar) phoneList.push(`Movistar: ${client.telMovistar}`);
          if (client.telClaro) phoneList.push(`Claro: ${client.telClaro}`);
          if (client.telConvencional) phoneList.push(`Conv: ${client.telConvencional}`);
          if (client.telefono && !phoneList.some(p => p.includes(client.telefono!))) {
            phoneList.push(client.telefono);
          }

          setTelefono(phoneList.length > 0 ? phoneList.join(' / ') : '');
          setEmail(client.emailFacturacion || '');
          if (client.vendedor && !atencion) setAtencion(client.vendedor);
          if (client.condicionPago) setCondiciones(`Condición de pago: ${client.condicionPago}`);
        }}
      />

      <EquipmentSearchModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        onSelect={(equipment) => {
          const isHourly = equipment.precioRentaHora && equipment.precioRentaHora > 0;
          const defaultPrice = isHourly ? equipment.precioRentaHora : (equipment.precioRentaDia ? equipment.precioRentaDia : ('' as any));
          setItems([
            ...items,
            {
              equipoId: equipment.id,
              descripcion: `${equipment.modelo} (Serie: ${equipment.numeroSerie || 'ESTÁNDAR'})`,
              cantidad: 1,
              dias: isHourly ? 8 : 1,
              precioUnitario: defaultPrice,
              descuento: '' as any,
              subtotal: typeof defaultPrice === 'number' ? defaultPrice * (isHourly ? 8 : 1) : 0,
              tipoTarifa: isHourly ? 'HORA' : 'DIA'
            } as any
          ]);
        }}
      />

      <RevisionNoteModal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        onSubmit={handleRejectWithNotes}
        isLoading={isLoading}
      />
    </div>
  );
};
