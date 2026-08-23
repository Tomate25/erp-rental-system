import React, { useState, useEffect } from 'react';
import type { Client } from '../../clients/types/client.types';
import type { Equipment } from '../../inventory/types/inventory.types';
import type { Cotizacion } from '../../quotations/types/quotation.types';
import { getClients } from '../../clients/services/clients.api';
import { getEquipments } from '../../inventory/services/inventory.api';
import { getQuotations } from '../../quotations/services/quotations.api';
import { createDirectContract, createContractFromQuotation } from '../../operations/services/operations.api';
import { ArrowLeft, Check, Plus, Trash2, User, Building, AlertCircle, Eye, Search, Phone, Mail, MapPin, CreditCard, HardHat, Lock } from 'lucide-react';
import { ContractPrintView } from './ContractPrintView';
import { ClientSelectorModal } from './ClientSelectorModal';
import { EquipmentSelectorModal } from './EquipmentSelectorModal';

interface ContractFormProps {
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

export const ContractForm: React.FC<ContractFormProps> = ({ onCancel, onSubmitSuccess }) => {
  const [mode, setMode] = useState<'direct' | 'from_quote'>('direct');

  // Catálogos
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [approvedQuotations, setApprovedQuotations] = useState<Cotizacion[]>([]);

  // Modales Emergentes AJAX (Cliente y Equipo)
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);

  // Fechas y Configuración
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const defaultFin = new Date();
  defaultFin.setDate(defaultFin.getDate() + 30);
  const [fechaFin, setFechaFin] = useState(defaultFin.toISOString().split('T')[0]);

  const [periodoDiasCorte, setPeriodoDiasCorte] = useState<number | ''>('');
  const [depositoGarantia, setDepositoGarantia] = useState<number | ''>('');
  const [vendedorNombre, setVendedorNombre] = useState('');
  const [ubicacionProyecto, setUbicacionProyecto] = useState('');
  const [condiciones, setCondiciones] = useState('');

  // Tabla de Ítems / Equipos
  const [precioRenta, setPrecioRenta] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [diasRenta, setDiasRenta] = useState<number | ''>('');
  const [items, setItems] = useState<{
    equipoId: string;
    modelo: string;
    numeroSerie?: string;
    precioRenta: number;
    cantidad: number;
    dias: number;
    tipoTarifa?: 'DIA' | 'HORA';
  }[]>([]);

  // Cotizaciones Aprobadas
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  // Estados de Formulario
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [cls, eqs, qts] = await Promise.allSettled([
          getClients(),
          getEquipments(),
          getQuotations()
        ]);

        if (cls.status === 'fulfilled' && Array.isArray(cls.value)) {
          setClients(cls.value);
        }

        if (eqs.status === 'fulfilled' && Array.isArray(eqs.value)) {
          setEquipments(eqs.value);
        }

        if (qts.status === 'fulfilled' && Array.isArray(qts.value)) {
          const approved = qts.value.filter(q => q.estado === 'ACEPTADA');
          setApprovedQuotations(approved);
          if (approved.length > 0) setSelectedQuoteId(approved[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadInitialData();
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedEquipment = equipments.find(e => e.id === selectedEquipmentId);

  useEffect(() => {
    if (selectedClient && selectedClient.direccion) {
      setUbicacionProyecto(selectedClient.direccion);
    }
  }, [selectedClientId]);

  const handleAddItem = () => {
    if (!selectedEquipmentId) return;
    const eq = equipments.find(e => e.id === selectedEquipmentId);
    if (!eq) return;

    const isHourly = eq.precioRentaHora && eq.precioRentaHora > 0;
    const tTarifa = isHourly ? 'HORA' : 'DIA';
    const pRenta = parseFloat(precioRenta as any) || (isHourly ? eq.precioRentaHora : eq.precioRentaDia) || 0;
    const cant = parseFloat(cantidad as any) || 1;
    const dRenta = parseFloat(diasRenta as any) || 1;

    setItems(prev => [
      ...prev,
      {
        equipoId: eq.id,
        modelo: eq.modelo,
        numeroSerie: eq.numeroSerie || 'ESTÁNDAR',
        precioRenta: pRenta,
        cantidad: cant,
        dias: dRenta,
        tipoTarifa: tTarifa
      }
    ]);

    // Reiniciar campos a limpio tras agregar
    setSelectedEquipmentId('');
    setPrecioRenta('');
    setCantidad('');
    setDiasRenta('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.precioRenta * item.cantidad * item.dias), 0);
  const iva = subtotal * 0.15;
  const totalGeneral = subtotal + iva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'direct') {
        if (!selectedClientId) {
          setError('Debes seleccionar un cliente');
          setIsSubmitting(false);
          return;
        }

        if (items.length === 0) {
          setError('Debes agregar al menos un equipo al contrato');
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
          items: items.map(it => ({
            equipoId: it.equipoId,
            cantidad: it.cantidad,
            precioRenta: it.precioRenta,
            dias: it.dias
          }))
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

      onSubmitSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al guardar el contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Objeto simulado para vista previa en vivo del formato oficial
  const previewContractData: any = {
    codigo: `CTR-${new Date().getFullYear()}-0001`,
    cliente: selectedClient ? {
      nombre: selectedClient.nombre,
      razonSocial: selectedClient.razonSocial,
      rfc: selectedClient.rfc || selectedClient.cedula,
      direccion: selectedClient.direccion,
      telefono: selectedClient.telefono,
      personaContacto: (selectedClient as any).personaContacto || selectedClient.nombre
    } : { nombre: 'Cliente de Prueba' },
    fechaInicio,
    fechaFin,
    depositoGarantia,
    condiciones,
    items: items.map((it, idx) => ({
      id: String(idx),
      equipoId: it.equipoId,
      equipo: { modelo: it.modelo, numeroSerie: it.numeroSerie },
      cantidad: it.cantidad,
      dias: it.dias,
      precioRenta: it.precioRenta,
      tipoTarifa: it.tipoTarifa
    }))
  };

  if (isPreviewMode) {
    return (
      <ContractPrintView
        contract={previewContractData}
        onBack={() => setIsPreviewMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full max-w-6xl mx-auto pb-12">
      
      {/* Top Header estilo Página Completa */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="p-3 rounded-2xl bg-[#F4F6F9] hover:bg-[#E5E8EE] text-[#37474F] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Contrato de Arrendamiento</h2>
          </div>
        </div>

        {/* Modalidades de Creación */}
        <div className="bg-[#F4F6F9] p-1.5 rounded-2xl border border-[#E5E8EE] flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              mode === 'direct' ? 'bg-[#37474F] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Creación Directa (Asignar Cliente)
          </button>

          <button
            type="button"
            onClick={() => setMode('from_quote')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              mode === 'from_quote' ? 'bg-[#37474F] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Desde Cotización Aprobada
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formularios Principales en Vista de Pantalla Completa */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* --- SECCIÓN 1: CAPTURA INTERACTIVA DE FICHA DE CLIENTE CON MODAL POPUP --- */}
        {mode === 'direct' && (
          <div className="bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#1A73E8]" />
                <h3 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">1. Ficha del Arrendatario (Selección Interactiva)</h3>
              </div>

              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="btn-precision-primary bg-[#1A73E8] hover:bg-[#1557B0] text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Search className="w-4 h-4" /> Directorio de Clientes
              </button>
            </div>

            {/* BOTÓN / TARJETA PREMIUM DE SELECCIÓN DE CLIENTE */}
            <div className="grid grid-cols-1 gap-4">
              {selectedClient ? (
                <div className="bg-[#E8F0FE] border-2 border-[#1A73E8]/40 rounded-2xl p-5 shadow-xs relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#1A73E8] text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                        {selectedClient.nombre.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block">
                          CLIENTE / ARRENDATARIO SELECCIONADO
                        </span>
                        <h4 className="text-base font-black text-[#1B1D22]">
                          {selectedClient.nombre}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#37474F]">
                          <div className="flex items-center gap-1 font-mono font-bold text-[#1B1D22]">
                            <CreditCard className="w-3.5 h-3.5 text-[#1A73E8]" />
                            <span>RUC/Cédula: {selectedClient.rfc || selectedClient.cedula || '201-310789-0001B'}</span>
                          </div>
                          {selectedClient.razonSocial && <span>Razón Social: <strong>{selectedClient.razonSocial}</strong></span>}
                          {selectedClient.telefono && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-500" />
                              <span>{selectedClient.telefono}</span>
                            </div>
                          )}
                          {selectedClient.emailFacturacion && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-gray-500" />
                              <span>{selectedClient.emailFacturacion}</span>
                            </div>
                          )}
                        </div>

                        {selectedClient.direccion && (
                          <div className="flex items-center gap-1 text-[11px] text-[#747780] pt-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>Dirección Fiscal: <strong>{selectedClient.direccion}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsClientModalOpen(true)}
                      className="btn-precision-outline text-xs bg-white border-[#1A73E8]/40 text-[#1A73E8] hover:bg-[#1A73E8] hover:text-white shrink-0 self-start sm:self-center transition-all"
                    >
                      Cambiar Cliente
                    </button>

                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="w-full p-6 rounded-2xl bg-[#F8FAFC] border-2 border-dashed border-[#1A73E8]/40 hover:border-[#1A73E8] hover:bg-[#E8F0FE]/30 transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-[#1A73E8] text-white shadow-xs group-hover:scale-105 transition-transform">
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-[#1B1D22] block">
                        Buscar y Elegir Cliente en el Directorio
                      </span>
                      <span className="text-xs text-[#747780] font-medium block">
                        Haz clic aquí para abrir la ventana modal interactiva de clientes
                      </span>
                    </div>
                  </div>

                  <span className="btn-precision-primary bg-[#1A73E8] text-xs">
                    Abrir Directorio
                  </span>
                </button>
              )}
            </div>

            {/* Vendedor y Ubicación de Proyecto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E5E8EE] pt-4">
              <div>
                <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                  Vendedor / Asesor Comercial Responsable
                </label>
                <input
                  type="text"
                  value={vendedorNombre}
                  onChange={(e) => setVendedorNombre(e.target.value)}
                  placeholder="Ingrese el nombre del vendedor o asesor comercial..."
                  className="precision-input text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                  Ubicación Física del Proyecto / Obra
                </label>
                <input
                  type="text"
                  value={ubicacionProyecto}
                  onChange={(e) => setUbicacionProyecto(e.target.value)}
                  placeholder="Ingrese la ubicación física exacta del proyecto u obra..."
                  className="precision-input text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- SECCIÓN DESDE COTIZACIÓN --- */}
        {mode === 'from_quote' && (
          <div className="bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm space-y-4">
            <h3 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">1. Seleccionar Cotización Aprobada</h3>
            {approvedQuotations.length === 0 ? (
              <div className="p-6 bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl text-center text-xs text-[#747780]">
                No hay cotizaciones aprobadas. Utiliza la opción <strong>"Creación Directa"</strong> en la parte superior.
              </div>
            ) : (
              <select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="precision-input text-xs font-bold text-[#1B1D22]"
              >
                {approvedQuotations.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.numeroCotizacion} - Cliente: {q.cliente?.nombre} (Total: C$ {q.total?.toLocaleString()})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* --- SECCIÓN 2: VIGENCIA Y CORTES DE FACTURACIÓN --- */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm space-y-4">
          <h3 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">2. Vigencia de Alquiler y Plan de Cortes de Facturación</h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                Fecha Inicio Renta
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
                Fecha Fin Estimada
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
                Frecuencia Cortes (Días)
              </label>
              <input
                type="number"
                value={periodoDiasCorte}
                onChange={(e) => setPeriodoDiasCorte(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej. 15 ó 30 días"
                className="precision-input text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-[#37474F] uppercase tracking-wider block mb-1">
                Depósito de Garantía (C$)
              </label>
              <input
                type="number"
                value={depositoGarantia}
                onChange={(e) => setDepositoGarantia(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ingrese monto en C$"
                className="precision-input text-xs font-mono font-black"
                required
              />
            </div>
          </div>
        </div>

        {/* --- SECCIÓN 3: TABLA DE ENTREGA DE EQUIPOS Y ACCESORIOS CON MODAL POPUP --- */}
        {mode === 'direct' && (
          <div className="bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-[#1A73E8]" />
                <h3 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">3. Descripción de Entrega (Equipos y Accesorios)</h3>
              </div>

              <button
                type="button"
                onClick={() => setIsEquipmentModalOpen(true)}
                className="btn-precision-primary bg-[#1A73E8] hover:bg-[#1557B0] text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Search className="w-4 h-4" /> Catálogo de Maquinaria
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE] items-end">
              
              {/* Botón Selector de Equipo */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Equipo / Maquinaria</label>
                <button
                  type="button"
                  onClick={() => setIsEquipmentModalOpen(true)}
                  className="precision-input text-xs font-bold text-[#1B1D22] flex items-center justify-between bg-white text-left w-full hover:border-[#1A73E8] transition-all cursor-pointer"
                >
                  <span className="truncate">
                    {selectedEquipment ? `${selectedEquipment.modelo} (Serie: ${selectedEquipment.numeroSerie || 'S/N'})` : 'Elegir Equipo del Catálogo'}
                  </span>
                  <span className="text-[10px] bg-[#1A73E8]/10 text-[#1A73E8] font-black px-2 py-0.5 rounded shrink-0">
                    Buscar
                  </span>
                </button>
              </div>

              {/* Precio Hora / Día (C$) - BLOQUEADO AL CAPTURAR DEL CATÁLOGO */}
              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  {selectedEquipment?.precioRentaHora && selectedEquipment.precioRentaHora > 0 ? 'Precio Hora (C$)' : 'Precio Día (C$)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={precioRenta}
                    readOnly={!!selectedEquipment}
                    onChange={(e) => setPrecioRenta(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej. 1500"
                    className={`precision-input text-xs font-mono font-bold ${
                      selectedEquipment ? 'bg-[#F4F6F9] border-[#E5E8EE] text-[#1B1D22] cursor-not-allowed pr-7' : ''
                    }`}
                  />
                  {selectedEquipment && (
                    <Lock className="w-3.5 h-3.5 text-[#747780] absolute right-2.5 top-2.5 pointer-events-none" />
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej. 1"
                  className="precision-input text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
                  {selectedEquipment?.precioRentaHora && selectedEquipment.precioRentaHora > 0 ? 'Horas Renta' : 'Días Renta'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={diasRenta}
                  onChange={(e) => setDiasRenta(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej. 8 ó 30"
                  className="precision-input text-xs font-mono font-bold"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn-precision-primary bg-[#1A73E8] w-full text-xs flex items-center justify-center gap-1 shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>

              {/* Indicador Informativo de Cálculo por Hora y Día */}
              {selectedEquipment && (
                <div className="col-span-full mt-2 p-3 bg-[#E8F0FE] border border-[#1A73E8]/30 rounded-xl text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#1A73E8] text-white rounded text-[10px] font-black uppercase">
                      {selectedEquipment.precioRentaHora && selectedEquipment.precioRentaHora > 0 ? 'Tarifa Por Hora' : 'Tarifa Por Día'}
                    </span>
                    <span className="font-bold text-[#1B1D22]">
                      {selectedEquipment.modelo} — Serie: {selectedEquipment.numeroSerie || 'ESTÁNDAR'}
                    </span>
                  </div>

                  <div className="text-[#1A73E8] font-black">
                    {selectedEquipment.precioRentaHora && selectedEquipment.precioRentaHora > 0 ? (
                      <span>C$ {selectedEquipment.precioRentaHora.toLocaleString()} / hr  ➜  Cálculo Día (8 hrs): C$ {(selectedEquipment.precioRentaHora * 8).toLocaleString()} / día</span>
                    ) : (
                      <span>Tarifa Oficial: C$ {selectedEquipment.precioRentaDia?.toLocaleString()} / día</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tabla de Ítems */}
            <div className="border border-[#E5E8EE] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[#747780] text-[10px] font-extrabold uppercase">
                    <th className="p-3">Artículo</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Serie</th>
                    <th className="p-3 text-center">Duración</th>
                    <th className="p-3 text-right">Cantidad</th>
                    <th className="p-3 text-right">Tarifa (C$)</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE] text-[#37474F] font-medium">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-[#747780]">
                        No has agregado equipos a la lista de entrega. Haz clic en "Catálogo de Maquinaria" para agregar.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => {
                      const totalLine = it.precioRenta * it.cantidad * it.dias;
                      const esPorHora = it.tipoTarifa === 'HORA';
                      return (
                        <tr key={idx} className="hover:bg-[#F8FAFC]">
                          <td className="p-3 font-mono font-bold">06-0{idx + 3}</td>
                          <td className="p-3 font-bold text-[#1B1D22] uppercase">{it.modelo}</td>
                          <td className="p-3 font-mono text-[11px]">{it.numeroSerie}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                              esPorHora ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {it.dias} {esPorHora ? (it.dias === 1 ? 'Hora' : 'Horas') : (it.dias === 1 ? 'Día' : 'Días')}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">{it.cantidad.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">
                            C$ {it.precioRenta.toLocaleString()} / {esPorHora ? 'hr' : 'día'}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-[#1B1D22]">C$ {totalLine.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales Financieros */}
            <div className="flex justify-end pt-2">
              <div className="w-full max-w-xs bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl p-4 text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="font-bold text-[#747780]">SUB TOTAL:</span>
                  <span className="font-bold">C$ {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#747780]">
                  <span>DESCUENTO:</span>
                  <span>C$ 0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#747780]">IVA (15%):</span>
                  <span className="font-bold">C$ {iva.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-[#E5E8EE] pt-2 text-sm font-black text-[#1B1D22]">
                  <span>TOTAL GENERAL:</span>
                  <span>C$ {totalGeneral.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SECCIÓN 4: CONDICIONES Y CLÁUSULAS --- */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm space-y-4">
          <h3 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">4. Cláusulas Legales y Términos de Arrendamiento</h3>
          <textarea
            value={condiciones}
            onChange={(e) => setCondiciones(e.target.value)}
            rows={3}
            placeholder="Escriba aquí las cláusulas legales, términos y condiciones particulares de este contrato..."
            className="precision-input text-xs italic"
          />
        </div>

        {/* Footer de Acciones */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-sm flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="btn-precision-outline text-xs"
            disabled={isSubmitting}
          >
            Cancelar y Volver
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewMode(true)}
              className="btn-precision-outline border-[#1A73E8]/40 text-[#1A73E8] hover:bg-[#E8F0FE] text-xs flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> Vista Previa Formato Oficial
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-precision-primary bg-[#37474F] hover:bg-[#263238] text-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Guardando Contrato...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Guardar y Formalizar Contrato
                </>
              )}
            </button>
          </div>
        </div>

      </form>

      {/* MODAL POPUP SELECTOR INTERACTIVO DE CLIENTE */}
      {isClientModalOpen && (
        <ClientSelectorModal
          clients={clients}
          onSelectClient={(client) => {
            setSelectedClientId(client.id);
            setIsClientModalOpen(false);
          }}
          onClose={() => setIsClientModalOpen(false)}
        />
      )}

      {/* MODAL POPUP SELECTOR INTERACTIVO DE MAQUINARIA Y EQUIPO */}
      {isEquipmentModalOpen && (
        <EquipmentSelectorModal
          equipments={equipments}
          onSelectEquipment={(equipment) => {
            setSelectedEquipmentId(equipment.id);
            const tarifaAuto = (equipment.precioRentaHora && equipment.precioRentaHora > 0) 
              ? equipment.precioRentaHora 
              : (equipment.precioRentaDia || 0);
            setPrecioRenta(tarifaAuto);
            setIsEquipmentModalOpen(false);
          }}
          onClose={() => setIsEquipmentModalOpen(false)}
        />
      )}

    </div>
  );
};
