import React, { useState, useEffect, useRef } from 'react';
import type { Cotizacion, DetalleCotizacion } from '../types/quotation.types';
import type { EstadoCotizacion } from '../types/quotation.types';
import { EstadoCotizacionValues } from '../types/quotation.types';
import { createQuotation, updateQuotation, createNewVersion, getQuotationVersions, sendQuotationEmail } from '../services/quotations.api';
import { formatCurrency } from '../../../shared/utils/formatters';
import { ArrowLeft, Save, Send, Plus, Trash2, Search, User, Briefcase, History, Check, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { ClientSearchModal } from './ClientSearchModal';
import { EquipmentSearchModal } from './EquipmentSearchModal';
import { RevisionNoteModal } from './RevisionNoteModal';
import { LIMITS } from '../../../shared/validation/limits';
import { emailDestinoSchema } from '../validators/quotation.validator';
import {
  buildCatalogDescription,
  composeClientPhone,
  prepareQuotationSubmit,
  reescalarDuracion,
  calcularImporteLinea,
} from '../utils/quotation-form';
import { serverErrorMessage } from '../../../shared/utils/errors';

const QL = LIMITS.cotizacion;

interface QuotationFormProps {
  initialData?: Cotizacion | null;
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

const rentalDaysBetween = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const days = (Date.parse(`${end}T12:00:00.000Z`) - Date.parse(`${start}T12:00:00.000Z`)) / 86400000;
  return Number.isInteger(days) && days > 0 ? days : 0;
};

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
  const [avisoTelefono, setAvisoTelefono] = useState<string | null>(null);
  const [email, setEmail] = useState(initialData?.email || '');
  const [referencia, setReferencia] = useState(initialData?.referencia || '');
  const [condiciones, setCondiciones] = useState(initialData?.condiciones || '');
  const [validezDias, setValidezDias] = useState(initialData?.validezDias || 15);
  const [fechaInicioRenta, setFechaInicioRenta] = useState(initialData?.fechaInicioRenta?.slice(0, 10) || '');
  const [fechaFinRenta, setFechaFinRenta] = useState(initialData?.fechaFinRenta?.slice(0, 10) || '');
  const lastValidDuration = useRef(rentalDaysBetween(initialData?.fechaInicioRenta?.slice(0, 10) || '', initialData?.fechaFinRenta?.slice(0, 10) || ''));
  const diasRenta = rentalDaysBetween(fechaInicioRenta, fechaFinRenta);

  const [tipoDescuentoGlobal, setTipoDescuentoGlobal] = useState<'MONTO' | 'PORCENTAJE'>('MONTO');
  const [descuentoGlobalValor, setDescuentoGlobalValor] = useState<string>(
    initialData?.descuento ? String(initialData.descuento) : ''
  );

  const normalizeItem = (it: DetalleCotizacion): DetalleCotizacion => {
    const isHourly = it.tipoCobro === 'POR_HORA' || it.tipoTarifa === 'HORA' || it.descripcion?.toUpperCase().includes('[POR HORA]');
    const desc = it.descuento ? Number(it.descuento) : 0;
    return {
      ...it,
      tipoCobro: isHourly ? 'POR_HORA' : 'POR_DIA',
      tipoTarifa: isHourly ? 'HORA' : 'DIA',
      tipoDescuento: it.tipoDescuento || 'MONTO',
      descuentoInput: it.descuentoInput !== undefined ? it.descuentoInput : (desc > 0 ? desc : ''),
      descuento: desc,
    };
  };

  const [items, setItems] = useState<DetalleCotizacion[]>((initialData?.items || []).map(normalizeItem));

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
    setFechaInicioRenta(q.fechaInicioRenta?.slice(0, 10) || '');
    setFechaFinRenta(q.fechaFinRenta?.slice(0, 10) || '');
    lastValidDuration.current = rentalDaysBetween(q.fechaInicioRenta?.slice(0, 10) || '', q.fechaFinRenta?.slice(0, 10) || '');
    setTipoDescuentoGlobal('MONTO');
    setDescuentoGlobalValor(q.descuento ? String(q.descuento) : '');
    setItems((q.items || []).map(normalizeItem));
    setVersionSuccessMsg(null);
  };

  // Totals Calculation
  const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const numValGlobal = parseFloat(descuentoGlobalValor) || 0;
  const descuentoGlobalMonto = tipoDescuentoGlobal === 'PORCENTAJE'
    ? Math.round(((subtotal * numValGlobal) / 100) * 100) / 100
    : numValGlobal;
  const subtotalConDescuento = Math.max(0, subtotal - descuentoGlobalMonto);
  const iva = Math.round(subtotalConDescuento * 0.15 * 100) / 100;
  const total = subtotalConDescuento + iva;

  const handleToggleTipoDescuentoGlobal = (nuevoTipo: 'MONTO' | 'PORCENTAJE') => {
    if (nuevoTipo === tipoDescuentoGlobal) return;
    const currentVal = parseFloat(descuentoGlobalValor) || 0;
    if (currentVal > 0 && subtotal > 0) {
      if (nuevoTipo === 'PORCENTAJE') {
        const pct = Math.round((currentVal / subtotal) * 10000) / 100;
        setDescuentoGlobalValor(pct > 0 ? String(pct) : '');
      } else {
        const monto = Math.round(((subtotal * currentVal) / 100) * 100) / 100;
        setDescuentoGlobalValor(monto > 0 ? String(monto) : '');
      }
    }
    setTipoDescuentoGlobal(nuevoTipo);
  };

  const handleAddItem = () => {
    if (!diasRenta) {
      setError('Selecciona primero las fechas de inicio y fin para consultar la disponibilidad.');
      return;
    }
    setError(null);
    setIsEquipmentModalOpen(true);
  };

  const handleSendToClient = async () => {
    if (!activeQuoteId) return;
    const emailCheck = emailDestinoSchema.safeParse(email);
    if (!emailCheck.success) {
      setError(emailCheck.error.issues[0].message);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await sendQuotationEmail(activeQuoteId, { emailDestino: emailCheck.data });
      onSubmitSuccess();
    } catch (err: any) {
      setError(serverErrorMessage(err, 'No fue posible enviar la cotización al cliente.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAddItem = () => {
    if (!diasRenta) {
      setError('Selecciona primero las fechas de inicio y fin de la renta.');
      return;
    }
    setError(null);
    setItems([
      ...items,
      {
        descripcion: '',
        tipoCobro: 'POR_DIA',
        tipoTarifa: 'DIA',
        cantidad: 1,
        dias: diasRenta || 1,
        precioUnitario: '' as any,
        tipoDescuento: 'MONTO',
        descuentoInput: '',
        descuento: 0,
        subtotal: 0
      }
    ]);
  };

  const handleRentalDatesChange = (start: string, end: string) => {
    const previousDays = lastValidDuration.current;
    const nextDays = rentalDaysBetween(start, end);
    setFechaInicioRenta(start);
    setFechaFinRenta(end);
    if (!nextDays) return;
    lastValidDuration.current = nextDays;
    if (!previousDays) return;
    setItems((current) => current.map((item) => {
      const esHoraria = item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA';
      const unidades = reescalarDuracion(item.dias, esHoraria, nextDays, previousDays);
      // Duracion vacia o invalida: se deja tal cual la escribio el usuario (no se cambia por un 1) y zod la rechaza al guardar.
      if (!Number.isFinite(unidades)) return item;
      return { ...item, dias: unidades, ...calcularImporteLinea(item, unidades) };
    }));
  };

  const toggleItemTarifa = (index: number, newTarifa: 'DIA' | 'HORA') => {
    const newItems = [...items];
    const current = newItems[index];
    const newTipoCobro = newTarifa === 'HORA' ? 'POR_HORA' : 'POR_DIA';

    let newPrecio = current.precioUnitario;
    if (current.equipo) {
      const pDia = Number(current.equipo.precioRentaDia) || 0;
      const pHora = Number(current.equipo.precioRentaHora) || (pDia > 0 ? Math.round((pDia / 8) * 100) / 100 : 0);
      if (newTarifa === 'HORA') {
        newPrecio = pHora > 0 ? pHora : pDia;
      } else {
        newPrecio = pDia > 0 ? pDia : pHora;
      }
    }

    // Duracion, cantidad o precio vacios/invalidos no se cambian por 1 ni por 0: se dejan como estan escritos
    // (zod los rechaza al guardar) y el importe mostrado es 0 hasta que sean validos.
    const { descuento, subtotal } = calcularImporteLinea({ ...current, precioUnitario: newPrecio });

    newItems[index] = {
      ...current,
      tipoCobro: newTipoCobro,
      tipoTarifa: newTarifa,
      precioUnitario: newPrecio,
      descuento,
      subtotal
    };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof DetalleCotizacion, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'descripcion') item.descripcionRecortada = undefined;
    
    // Recalcula el subtotal solo para mostrarlo (un valor vacío cuenta 0 aquí). Lo que se envía no usa estos
    // valores por defecto: zod valida el valor crudo de cada campo al guardar.
    const cantidad = parseFloat(item.cantidad as any) || 0;
    const dias = parseFloat(item.dias as any) || 0;
    const precioUnitario = parseFloat(item.precioUnitario as any) || 0;
    const base = cantidad * dias * precioUnitario;

    if (item.tipoDescuento === 'PORCENTAJE') {
      const pct = parseFloat(item.descuentoInput as any) || 0;
      item.descuento = Math.round(((base * pct) / 100) * 100) / 100;
    } else {
      item.descuento = parseFloat(item.descuentoInput !== undefined ? item.descuentoInput as any : item.descuento as any) || 0;
    }

    item.subtotal = Math.max(0, base - item.descuento);
    
    newItems[index] = item;
    setItems(newItems);
  };

  const toggleItemTipoDescuento = (index: number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    const currentTipo = item.tipoDescuento || 'MONTO';
    const newTipo = currentTipo === 'MONTO' ? 'PORCENTAJE' : 'MONTO';
    
    const cantidad = parseFloat(item.cantidad as any) || 0;
    const dias = parseFloat(item.dias as any) || 0;
    const precioUnitario = parseFloat(item.precioUnitario as any) || 0;
    const base = cantidad * dias * precioUnitario;
    
    const currentVal = parseFloat(item.descuentoInput as any) || 0;
    
    if (currentVal > 0 && base > 0) {
      if (newTipo === 'PORCENTAJE') {
        const pct = Math.round((currentVal / base) * 10000) / 100;
        item.descuentoInput = pct > 0 ? pct : '';
        item.descuento = Math.round(((base * pct) / 100) * 100) / 100;
      } else {
        const monto = Math.round(((base * currentVal) / 100) * 100) / 100;
        item.descuentoInput = monto > 0 ? monto : '';
        item.descuento = monto;
      }
    } else {
      item.descuento = 0;
      item.descuentoInput = '';
    }
    
    item.tipoDescuento = newTipo;
    item.subtotal = Math.max(0, base - item.descuento);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleItemDescuentoChange = (index: number, valStr: string) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    item.descuentoInput = valStr;
    
    const cantidad = parseFloat(item.cantidad as any) || 0;
    const dias = parseFloat(item.dias as any) || 0;
    const precioUnitario = parseFloat(item.precioUnitario as any) || 0;
    const base = cantidad * dias * precioUnitario;
    const val = parseFloat(valStr) || 0;
    
    if (item.tipoDescuento === 'PORCENTAJE') {
      const descMonto = Math.round(((base * val) / 100) * 100) / 100;
      item.descuento = descMonto;
    } else {
      item.descuento = val;
    }
    
    item.subtotal = Math.max(0, base - item.descuento);
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
    if (!diasRenta) {
      setError('Selecciona en el calendario fechas válidas de inicio y fin de renta.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;

    // El payload se arma sin valores por defecto y se valida con zod antes de llamar a la API.
    const prepared = prepareQuotationSubmit({
      clienteId,
      proyecto,
      atencion,
      telefono,
      email,
      referencia,
      condiciones,
      validezDias,
      fechaInicioRenta,
      fechaFinRenta,
      descuento: descuentoGlobalMonto,
      subtotal,
      iva,
      total,
      estado: estadoFinal,
      asesorId: currentUser?.id || undefined,
      items,
    });
    if (!prepared.ok) {
      setError(prepared.error);
      setIsLoading(false);
      return;
    }
    const payload = prepared.payload;

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
      setError(serverErrorMessage(err, 'Error al guardar la cotización'));
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
      setError(serverErrorMessage(err, 'Error al devolver la cotización'));
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
          {/* Caso A: revisión interna terminada; el cliente decide mediante el enlace público. */}
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
                onClick={handleSendToClient}
                disabled={isLoading}
                className="btn-precision-tertiary text-xs py-2 px-3.5"
              >
                <Send className="w-4 h-4" />
                <span>Enviar al Cliente</span>
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
                maxLength={QL.atencion}
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
                readOnly={!isFormEditable}
                value={telefono}
                maxLength={QL.telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  setAvisoTelefono(null);
                }}
                placeholder="Solo números, máximo 30 caracteres"
                className="precision-input text-xs font-bold"
              />
              {avisoTelefono && <p className="text-[10px] text-amber-700 font-bold mt-1">{avisoTelefono}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#747780] uppercase mb-1">Correo de Facturación</label>
              <input 
                type="email" 
                readOnly={!!clienteId}
                value={email} 
                maxLength={QL.email}
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
                maxLength={QL.proyecto}
                onChange={(e) => setProyecto(e.target.value)}
                readOnly={!isFormEditable}
                placeholder="Nombre del proyecto o sitio de trabajo"
                className="precision-input text-xs font-bold"
              />
            </div>
          </div>
        </div>



        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <label className="block text-xs font-black text-[#1B1D22] mb-1">Período de renta *</label>
          <p className="text-xs text-[#37474F] mb-3">Selecciona desde qué fecha hasta qué fecha durará la renta.</p>
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-xs font-bold text-[#37474F]">Desde
              <input type="date" value={fechaInicioRenta} onChange={(e) => handleRentalDatesChange(e.target.value, fechaFinRenta)} disabled={!isFormEditable} className="precision-input block mt-1 text-xs font-bold" />
            </label>
            <label className="text-xs font-bold text-[#37474F]">Hasta
              <input type="date" value={fechaFinRenta} min={fechaInicioRenta || undefined} onChange={(e) => handleRentalDatesChange(fechaInicioRenta, e.target.value)} disabled={!isFormEditable} className="precision-input block mt-1 text-xs font-bold" />
            </label>
            {diasRenta > 0 && <span className="text-xs font-black text-[#1A73E8] pb-2">{diasRenta} días de renta</span>}
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
                  <th className="p-3.5 w-32 text-right">Desc (C$ / %)</th>
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
                        readOnly={!isFormEditable}
                        value={item.descripcion}
                        maxLength={QL.item.descripcion}
                        onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del equipo o servicio..."
                        className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                          !isFormEditable
                            ? 'bg-[#F4F6F9] border-[#E5E8EE] text-[#37474F] cursor-not-allowed' 
                            : 'bg-[#F8FAFC] border-[#E5E8EE] text-[#1B1D22] focus:bg-white focus:border-[#1A73E8]'
                        }`}
                      />
                      {item.descripcionRecortada !== undefined && (
                        <p className="text-[10px] text-amber-700 font-bold mt-1">
                          Línea {index + 1}: la descripción del catálogo tenía {item.descripcionRecortada} caracteres y se recortó a {QL.item.descripcion}. Revísala y edítala si hace falta.
                        </p>
                      )}
                    </td>
                    <td className="p-2.5">
                      <input 
                        type="number" 
                        min="1"
                        max={item.equipo?.tipoControl === 'SERIALIZADO' ? 1 : item.equipo?.cantidadDisponiblePeriodo}
                        readOnly={!isFormEditable || item.equipo?.tipoControl === 'SERIALIZADO'}
                        value={item.cantidad ?? ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          const maxDisp = item.equipo?.cantidadDisponiblePeriodo;
                          if (item.equipo?.tipoControl === 'SERIALIZADO') {
                            updateItem(index, 'cantidad', 1);
                          } else if (maxDisp !== undefined && val > maxDisp) {
                            updateItem(index, 'cantidad', maxDisp);
                          } else {
                            updateItem(index, 'cantidad', isNaN(val) ? '' : val);
                          }
                        }}
                        className={`w-full px-2 py-1.5 border border-[#E5E8EE] rounded-xl text-xs text-center font-bold outline-none transition-all ${
                          item.equipo?.tipoControl === 'SERIALIZADO' || !isFormEditable
                            ? 'bg-[#F4F6F9] text-[#747780] cursor-not-allowed'
                            : 'bg-[#F8FAFC] text-[#1B1D22] focus:bg-white focus:border-[#1A73E8]'
                        }`}
                        title={
                          item.equipo?.tipoControl === 'SERIALIZADO'
                            ? 'Equipo serializado individual (máx: 1 unidad)'
                            : item.equipo?.cantidadDisponiblePeriodo !== undefined
                              ? `Máximo disponible para el período: ${item.equipo.cantidadDisponiblePeriodo} u.`
                              : undefined
                        }
                      />
                      {item.equipo?.tipoControl === 'POR_CANTIDAD' && item.equipo?.cantidadDisponiblePeriodo !== undefined && (
                        <div className="text-[9px] text-center text-slate-400 mt-0.5 font-bold">
                          Máx: {item.equipo.cantidadDisponiblePeriodo}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          min={item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA' ? '0.01' : '1'}
                          step={item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA' ? '0.01' : '1'}
                          aria-label={item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA' ? 'Horas totales' : 'Días'}
                          readOnly={!isFormEditable}
                          value={item.dias ?? ''}
                          onChange={(e) => updateItem(index, 'dias', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#E5E8EE] rounded-xl text-xs text-center font-bold text-[#1B1D22] outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
                        />
                        {(() => {
                          const isHourly = item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA';
                          return (
                            <button
                              type="button"
                              disabled={!isFormEditable}
                              onClick={() => toggleItemTarifa(index, isHourly ? 'DIA' : 'HORA')}
                              title={isFormEditable ? `Clic para alternar a ${isHourly ? 'DÍAS' : 'HORAS'}` : undefined}
                              className={`text-[9px] font-black px-1.5 py-1 rounded shrink-0 border transition-all ${
                                isFormEditable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'
                              } ${
                                isHourly
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                              }`}
                            >
                              {isHourly ? 'hrs' : 'días'}
                            </button>
                          );
                        })()}
                      </div>
                      {(item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA') && (
                        <span className="text-[9px] text-[#747780] font-bold block text-center mt-0.5">Horas totales</span>
                      )}
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
                        {(item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA') ? 'C$ / hr' : 'C$ / día'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          disabled={!isFormEditable}
                          onClick={() => toggleItemTipoDescuento(index)}
                          title={isFormEditable ? `Clic para alternar a ${item.tipoDescuento === 'PORCENTAJE' ? 'Córdobas (C$)' : 'Porcentaje (%)'}` : undefined}
                          className={`text-[9px] font-black px-1.5 py-1 rounded shrink-0 border transition-all ${
                            isFormEditable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'
                          } ${
                            item.tipoDescuento === 'PORCENTAJE'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {item.tipoDescuento === 'PORCENTAJE' ? '%' : 'C$'}
                        </button>
                        <input 
                          type="number" 
                          step="any"
                          min="0"
                          max={item.tipoDescuento === 'PORCENTAJE' ? '100' : undefined}
                          readOnly={!isFormEditable}
                          value={item.descuentoInput === 0 || (item.descuentoInput as any) === '0' ? '' : item.descuentoInput ?? ''}
                          onChange={(e) => handleItemDescuentoChange(index, e.target.value)}
                          placeholder="0.00"
                          className="w-20 px-2 py-1.5 bg-[#F8FAFC] border border-[#E5E8EE] rounded-xl text-xs text-right font-mono font-extrabold text-[#1B1D22] outline-none focus:bg-white focus:border-[#1A73E8] transition-all"
                        />
                      </div>
                      {item.tipoDescuento === 'PORCENTAJE' && (item.descuento || 0) > 0 && (
                        <span className="text-[9px] text-[#C55500] font-bold block text-right mt-0.5 font-mono">
                          -{formatCurrency(item.descuento)}
                        </span>
                      )}
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
                maxLength={QL.condiciones}
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
                  maxLength={QL.referencia}
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
            
            <div className="border-y border-[#E5E8EE] py-2 space-y-1">
              <div className="flex justify-between items-center text-xs text-[#747780] font-bold">
                <div className="flex items-center gap-1.5">
                  <span>Descuento Global</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-[#E5E8EE] text-[9px]">
                    <button
                      type="button"
                      disabled={!isFormEditable}
                      onClick={() => handleToggleTipoDescuentoGlobal('MONTO')}
                      className={`px-1.5 py-0.5 rounded font-black transition-all ${
                        tipoDescuentoGlobal === 'MONTO'
                          ? 'bg-white text-[#1B1D22] shadow-xs'
                          : 'text-[#747780] hover:text-[#1B1D22]'
                      }`}
                    >
                      C$
                    </button>
                    <button
                      type="button"
                      disabled={!isFormEditable}
                      onClick={() => handleToggleTipoDescuentoGlobal('PORCENTAJE')}
                      className={`px-1.5 py-0.5 rounded font-black transition-all ${
                        tipoDescuentoGlobal === 'PORCENTAJE'
                          ? 'bg-[#1A73E8] text-white shadow-xs'
                          : 'text-[#747780] hover:text-[#1B1D22]'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#C55500] font-mono font-bold text-xs">
                    {tipoDescuentoGlobal === 'PORCENTAJE' ? '%' : 'C$'}
                  </span>
                  <input 
                    type="number"
                    step="any"
                    min="0"
                    max={tipoDescuentoGlobal === 'PORCENTAJE' ? '100' : undefined}
                    value={descuentoGlobalValor === '0' ? '' : descuentoGlobalValor}
                    onChange={(e) => setDescuentoGlobalValor(e.target.value)}
                    readOnly={!isFormEditable}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 bg-white border border-[#E5E8EE] rounded-lg text-right font-mono text-xs font-bold text-[#C55500] outline-none focus:border-[#1A73E8]"
                  />
                </div>
              </div>
              {tipoDescuentoGlobal === 'PORCENTAJE' && descuentoGlobalMonto > 0 && (
                <div className="flex justify-end text-[10px] text-[#C55500] font-mono font-bold">
                  Equivalente: -{formatCurrency(descuentoGlobalMonto)}
                </div>
              )}
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
          const { telefono: telefonoCliente, omitidos } = composeClientPhone(client);
          setTelefono(telefonoCliente);
          setAvisoTelefono(
            omitidos.length > 0
              ? `No cupieron en ${QL.telefono} caracteres y se omitieron: ${omitidos.join(', ')}. Puedes editar el teléfono.`
              : null
          );
          setEmail(client.emailFacturacion || '');
          if (client.contactos && (client.contactos as any).length > 0 && !atencion) {
            setAtencion((client.contactos as any)[0].nombre);
          }
          if (client.condicionPago) setCondiciones(`Condición de pago: ${client.condicionPago}`);
        }}
      />

      <EquipmentSearchModal
        isOpen={isEquipmentModalOpen}
        fechaInicioRenta={fechaInicioRenta || undefined}
        fechaFinRenta={fechaFinRenta || undefined}
        onClose={() => setIsEquipmentModalOpen(false)}
        onSelect={(equipment) => {
          const precioDia = Number(equipment.precioRentaDia) || 0;
          const precioHora = Number(equipment.precioRentaHora) || (precioDia > 0 ? Math.round((precioDia / 8) * 100) / 100 : 0);

          const explicitHourly = equipment.modelo?.toUpperCase().includes('[POR HORA]') || equipment.descripcion?.toUpperCase().includes('[POR HORA]');
          const explicitDaily = equipment.modelo?.toUpperCase().includes('[POR DIA]') || equipment.descripcion?.toUpperCase().includes('[POR DIA]');

          let isHourly = false;
          if (explicitHourly) {
            isHourly = true;
          } else if (explicitDaily) {
            isHourly = false;
          } else {
            isHourly = precioHora > 0 && precioDia <= 0;
          }

          const defaultPrice = isHourly ? (precioHora || precioDia) : (precioDia || precioHora);
          const duracion = isHourly ? 8 * (diasRenta || 1) : (diasRenta || 1);

          const { descripcion: descFinal, largoOriginal } = buildCatalogDescription(equipment);

          setItems([
            ...items,
            {
              equipoId: equipment.id,
              equipo: {
                ...equipment,
                precioRentaDia: precioDia,
                precioRentaHora: precioHora,
              },
              descripcion: descFinal,
              descripcionRecortada: largoOriginal ?? undefined,
              cantidad: 1,
              dias: duracion,
              precioUnitario: defaultPrice,
              tipoDescuento: 'MONTO',
              descuentoInput: '',
              descuento: 0,
              subtotal: Math.max(0, defaultPrice * duracion),
              tipoCobro: isHourly ? 'POR_HORA' : 'POR_DIA',
              tipoTarifa: isHourly ? 'HORA' : 'DIA'
            }
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
