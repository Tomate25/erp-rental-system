import React, { useState, useEffect } from 'react';
import type { Cotizacion } from '../../quotations/types/quotation.types';
import type { Client } from '../../clients/types/client.types';
import type { Equipment } from '../../inventory/types/inventory.types';
import { getQuotations } from '../../quotations/services/quotations.api';
import { getClients } from '../../clients/services/clients.api';
import { getEquipments } from '../../inventory/services/inventory.api';
import { createContractFromQuotation, createDirectContract } from '../../operations/services/operations.api';
import { X, FileText, Check, AlertCircle, User, Plus, Search } from 'lucide-react';

interface CreateContractModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({ onClose, onSuccess }) => {
  const [creationMode, setCreationMode] = useState<'direct' | 'from_quote'>('direct');
  
  // Lista de catálogos
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [approvedQuotations, setApprovedQuotations] = useState<Cotizacion[]>([]);

  // Campos para Creación Directa
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Fechas y Parámetros del Contrato
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const defaultFin = new Date();
  defaultFin.setDate(defaultFin.getDate() + 30);
  const [fechaFin, setFechaFin] = useState(defaultFin.toISOString().split('T')[0]);

  const [periodoDiasCorte, setPeriodoDiasCorte] = useState<number>(30);
  const [depositoGarantia, setDepositoGarantia] = useState<number>(5000);
  const [condiciones, setCondiciones] = useState(
    'El arrendatario se compromete a entregar los equipos en las mismas condiciones mecánicas de salida. Cualquier daño o falta será cubierto por la garantía.'
  );

  // Ítems para Creación Directa
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [precioRenta, setPrecioRenta] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(1);
  const [contractItems, setContractItems] = useState<{
    equipoId: string;
    modelo: string;
    precioRenta: number;
    cantidad: number;
  }[]>([]);

  // Campos para Modo "Desde Cotización"
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [clsData, eqsData, quotesData] = await Promise.allSettled([
          getClients(),
          getEquipments(),
          getQuotations()
        ]);

        if (clsData.status === 'fulfilled' && Array.isArray(clsData.value)) {
          setClients(clsData.value);
          if (clsData.value.length > 0) setSelectedClientId(clsData.value[0].id);
        }

        if (eqsData.status === 'fulfilled' && Array.isArray(eqsData.value)) {
          setEquipments(eqsData.value);
          if (eqsData.value.length > 0) {
            setSelectedEquipmentId(eqsData.value[0].id);
            setPrecioRenta(eqsData.value[0].precioRentaDia || 0);
          }
        }

        if (quotesData.status === 'fulfilled' && Array.isArray(quotesData.value)) {
          const approved = quotesData.value.filter(q => q.estado === 'ACEPTADA');
          setApprovedQuotations(approved);
          if (approved.length > 0) setSelectedQuoteId(approved[0].id);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedQuote = approvedQuotations.find(q => q.id === selectedQuoteId);

  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (c.rfc && c.rfc.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
    (c.razonSocial && c.razonSocial.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  );

  const handleAddItem = () => {
    if (!selectedEquipmentId) return;
    const eq = equipments.find(e => e.id === selectedEquipmentId);
    if (!eq) return;

    setContractItems(prev => [
      ...prev,
      {
        equipoId: eq.id,
        modelo: eq.modelo,
        precioRenta: Number(precioRenta),
        cantidad: Number(cantidad)
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setContractItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (creationMode === 'direct') {
        if (!selectedClientId) {
          setError('Debes seleccionar un cliente para el contrato directo');
          setIsSubmitting(false);
          return;
        }

        if (contractItems.length === 0) {
          setError('Debes agregar al menos un equipo o ítem al contrato');
          setIsSubmitting(false);
          return;
        }

        await createDirectContract({
          clienteId: selectedClientId,
          fechaInicio,
          fechaFin,
          depositoGarantia: Number(depositoGarantia),
          periodoDiasCorte: Number(periodoDiasCorte),
          condiciones,
          items: contractItems
        });

      } else {
        if (!selectedQuoteId) {
          setError('Debes seleccionar una cotización aprobada');
          setIsSubmitting(false);
          return;
        }

        await createContractFromQuotation({
          cotizacionId: selectedQuoteId,
          fechaInicio,
          fechaFin,
          periodoDiasCorte: Number(periodoDiasCorte),
          depositoGarantia: Number(depositoGarantia),
          condiciones
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al generar el contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#37474F]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-[#37474F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Nuevo Contrato de Arrendamiento</h3>
              <p className="text-xs text-white/80 font-medium">Formalización de alquiler con captura directa de datos de Cliente</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modalidad de Creación (Pestañas) */}
        <div className="bg-[#F4F6F9] p-2 border-b border-[#E5E8EE] flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCreationMode('direct')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              creationMode === 'direct' ? 'bg-[#1A73E8] text-white shadow-xs' : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
            }`}
          >
            ➕ Creación Directa (Seleccionar Cliente)
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('from_quote')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              creationMode === 'from_quote' ? 'bg-[#1A73E8] text-white shadow-xs' : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
            }`}
          >
            📄 Desde Cotización Aprobada
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-xs font-bold text-[#747780]">Cargando catálogos de clientes y equipos...</div>
          ) : (
            <>
              {/* --- MODO 1: CREACIÓN DIRECTA CON BÚSQUEDA Y CAPTURA DE CLIENTE --- */}
              {creationMode === 'direct' && (
                <div className="space-y-4">
                  
                  {/* Selector y Búsqueda de Cliente */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block">
                      Buscar y Seleccionar Cliente (Arrendatario)
                    </label>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[#747780] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Filtrar por nombre, RUC o razón social..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="precision-input pl-10 text-xs mb-2"
                      />
                    </div>

                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="precision-input text-xs font-bold text-[#1B1D22]"
                      required
                    >
                      <option value="">-- Seleccionar Cliente --</option>
                      {filteredClients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.razonSocial ? `(${c.razonSocial})` : ''} - RFC/RUC: {c.rfc || 'S/N'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FICHA TÉCNICA DEL CLIENTE CAPTURADA AUTOMÁTICAMENTE */}
                  {selectedClient && (
                    <div className="bg-[#E8F0FE] border border-[#1A73E8]/30 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn">
                      <div className="flex items-center gap-2 border-b border-[#1A73E8]/20 pb-2">
                        <User className="w-4 h-4 text-[#1A73E8]" />
                        <span className="font-extrabold text-[#1A73E8] uppercase tracking-wider">DATOS CAPTURADOS DEL CLIENTE</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[#1B1D22]">
                        <div><span className="font-bold text-[#747780]">Nombre / Arrendatario:</span> <span className="font-black">{selectedClient.nombre}</span></div>
                        <div><span className="font-bold text-[#747780]">RUC / Cédula:</span> <span className="font-mono font-bold">{selectedClient.rfc || '201-310789-0001B'}</span></div>
                        <div><span className="font-bold text-[#747780]">Razón Social:</span> {selectedClient.razonSocial || 'Persona Natural'}</div>
                        <div><span className="font-bold text-[#747780]">Teléfono:</span> {selectedClient.telefono || 'N/A'}</div>
                        <div className="col-span-2"><span className="font-bold text-[#747780]">Dirección Fiscal / Proyecto:</span> {selectedClient.direccion || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  {/* Selección de Equipos a Alquilar */}
                  <div className="border border-[#E5E8EE] rounded-2xl p-4 bg-[#F8FAFC] space-y-3">
                    <span className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block">
                      Equipos a Incluir en el Contrato
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <select
                          value={selectedEquipmentId}
                          onChange={(e) => {
                            setSelectedEquipmentId(e.target.value);
                            const eq = equipments.find(item => item.id === e.target.value);
                            if (eq) setPrecioRenta(eq.precioRentaDia);
                          }}
                          className="precision-input text-xs"
                        >
                          {equipments.map(eq => (
                            <option key={eq.id} value={eq.id}>
                              {eq.modelo} - Serie: {eq.numeroSerie || 'S/N'} (C$ {eq.precioRentaDia}/día)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          placeholder="Precio Renta"
                          value={precioRenta}
                          onChange={(e) => setPrecioRenta(Number(e.target.value))}
                          className="precision-input text-xs font-mono"
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          placeholder="Cantidad"
                          min="1"
                          value={cantidad}
                          onChange={(e) => setCantidad(Number(e.target.value))}
                          className="precision-input text-xs font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="btn-precision-primary text-xs flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Agregar
                      </button>
                    </div>

                    {/* Arreglo de Ítems */}
                    {contractItems.length > 0 && (
                      <div className="divide-y divide-[#E5E8EE] border border-[#E5E8EE] rounded-xl bg-white text-xs">
                        {contractItems.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <span className="font-bold text-[#1B1D22]">{item.modelo}</span>
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-bold">C$ {item.precioRenta.toLocaleString()} / día</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-600 font-bold hover:underline"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* --- MODO 2: DESDE COTIZACIÓN APROBADA --- */}
              {creationMode === 'from_quote' && (
                <div className="space-y-3">
                  {approvedQuotations.length === 0 ? (
                    <div className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-6 text-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-[#C55500] mx-auto" />
                      <h4 className="text-xs font-black text-[#1B1D22]">No hay cotizaciones aprobadas disponibles</h4>
                      <p className="text-[11px] text-[#747780]">
                        Puedes utilizar la opción <strong>"Creación Directa"</strong> en la pestaña superior para generar un contrato seleccionando un cliente del catálogo.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                        Cotización Comercial Aprobada
                      </label>
                      <select
                        value={selectedQuoteId}
                        onChange={(e) => {
                          setSelectedQuoteId(e.target.value);
                          const q = approvedQuotations.find(item => item.id === e.target.value);
                          if (q && q.depositoGarantia) setDepositoGarantia(q.depositoGarantia);
                        }}
                        className="precision-input text-xs font-bold text-[#1B1D22]"
                      >
                        {approvedQuotations.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.numeroCotizacion} - Cliente: {q.cliente?.nombre || 'General'} (Total: C$ {q.total?.toLocaleString()})
                          </option>
                        ))}
                      </select>

                      {selectedQuote && (
                        <div className="mt-3 bg-[#E8F0FE] border border-[#1A73E8]/20 rounded-2xl p-4 text-xs space-y-1">
                          <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block">Ficha Comercial Heredada</span>
                          <div className="font-extrabold text-[#1B1D22]">{selectedQuote.cliente?.nombre}</div>
                          <div className="text-[#747780]">Razón Social: {selectedQuote.cliente?.razonSocial || 'N/A'}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fechas de Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#E5E8EE] pt-4">
                <div>
                  <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                    Inicio de Renta
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="precision-input text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                    Fin Estimado
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="precision-input text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                    Periodo Cortes (Días)
                  </label>
                  <input
                    type="number"
                    value={periodoDiasCorte}
                    onChange={(e) => setPeriodoDiasCorte(Number(e.target.value))}
                    placeholder="30"
                    className="precision-input text-xs font-bold"
                  />
                </div>
              </div>

              {/* Depósito de Garantía */}
              <div>
                <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                  Monto de Depósito de Garantía (C$)
                </label>
                <input
                  type="number"
                  step="100"
                  value={depositoGarantia}
                  onChange={(e) => setDepositoGarantia(Number(e.target.value))}
                  className="precision-input text-xs font-mono font-black"
                  required
                />
              </div>

              {/* Cláusulas y Condiciones */}
              <div>
                <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                  Condiciones y Cláusulas Legales
                </label>
                <textarea
                  value={condiciones}
                  onChange={(e) => setCondiciones(e.target.value)}
                  rows={3}
                  className="precision-input text-xs"
                />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="border-t border-[#E5E8EE] pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="btn-precision-outline text-xs"
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-precision-primary bg-[#37474F] hover:bg-[#263238] text-xs"
            >
              {isSubmitting ? (
                <span>Generando Contrato...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Formalizar Contrato
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
