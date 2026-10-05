import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorAlert } from '../../../shared/components/ErrorAlert';
import { EmptyState } from '../../../shared/components/EmptyState';
import React, { useState, useEffect } from 'react';
import type { Contract } from '../../operations/services/operations.api';
import { getContracts, finalizeContract } from '../../operations/services/operations.api';
import { ContractForm } from '../components/ContractForm';
import { ContractPrintView } from '../components/ContractPrintView';
import { ContractCortesModal } from '../components/ContractCortesModal';
import { ContractOpenModal } from '../components/ContractOpenModal';
import { FileText, Plus, Search, ShieldCheck, X, Printer, CreditCard, Users, Key, Clock, CheckCircle, Flag } from 'lucide-react';

export const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SIN_ABRIR' | 'ACTIVO' | 'FINALIZADO'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const userRoles: string[] = (currentUser?.roles || []).map((r: any) =>
    typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || ''
  );
  const isAdvisorOnly = userRoles.includes('COMERCIAL') && !userRoles.includes('ADMIN') && !userRoles.includes('GERENTE');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContractForDetail, setSelectedContractForDetail] = useState<Contract | null>(null);
  const [contractToPrint, setContractToPrint] = useState<Contract | null>(null);
  const [selectedContractForCortes, setSelectedContractForCortes] = useState<Contract | null>(null);
  const [selectedContractForOpen, setSelectedContractForOpen] = useState<Contract | null>(null);

  const loadContracts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getContracts();
      setContracts(data);
      setFilteredContracts(data);
    } catch {
      setError('Error al cargar la lista de contratos de alquiler');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    let list = contracts;

    if (activeTab === 'SIN_ABRIR') {
      list = list.filter(c => c.estado === 'SIN_ABRIR');
    } else if (activeTab === 'ACTIVO') {
      list = list.filter(c => c.estado === 'ACTIVO');
    } else if (activeTab === 'FINALIZADO') {
      list = list.filter(c => c.estado === 'FINALIZADO');
    }

    if (selectedAdvisor !== 'ALL') {
      list = list.filter(c => (c.cotizacion?.asesorId || (c.cotizacion as any)?.asesor?.id) === selectedAdvisor);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(c =>
        c.codigo.toLowerCase().includes(q) ||
        (c.cliente?.nombre || '').toLowerCase().includes(q) ||
        (c.cotizacion?.numeroCotizacion || '').toLowerCase().includes(q) ||
        ((c.cotizacion as any)?.asesor ? `${(c.cotizacion as any).asesor.nombre} ${(c.cotizacion as any).asesor.apellido}`.toLowerCase().includes(q) : false)
      );
    }

    setFilteredContracts(list);
  }, [searchQuery, selectedAdvisor, activeTab, contracts]);

  const handleFinalizeContract = async (contractId: string, codigo: string) => {
    if (!window.confirm(`¿Está seguro de finalizar el contrato ${codigo}? Esta acción dará por terminado el arrendamiento.`)) {
      return;
    }
    try {
      await finalizeContract(contractId);
      loadContracts();
    } catch {
      alert('Error al finalizar el contrato');
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'SIN_ABRIR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-bold">
            <Clock className="w-3 h-3 text-amber-600" /> Sin Abrir
          </span>
        );
      case 'ACTIVO':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-bold">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Abierto
          </span>
        );
      case 'FINALIZADO':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 font-bold">
            <Flag className="w-3 h-3 text-slate-500" /> Finalizado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#1A73E8]/10 text-[#1A73E8] border border-[#1A73E8]/20 font-bold">
            {estado}
          </span>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    const val = isNaN(Number(amount)) ? 0 : Number(amount);
    return `C$ ${val.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 1. Si está activo el modo de impresión de plantilla oficial estilo BM CONSTRUCCIONES
  if (contractToPrint) {
    return (
      <ContractPrintView
        contract={contractToPrint}
        onBack={() => setContractToPrint(null)}
      />
    );
  }

  // 2. Si está activo el modo de creación de pantalla completa (ContractForm)
  if (isFormOpen) {
    return (
      <ContractForm
        onCancel={() => setIsFormOpen(false)}
        onSubmitSuccess={() => {
          setIsFormOpen(false);
          loadContracts();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E8EE] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#37474F] text-white shadow-md shadow-[#37474F]/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Gestión de Contratos de Alquiler</h2>
            <p className="text-xs text-[#747780] font-medium">
              Captura directa asignando Cliente o desde Cotización, gestión de cortes y formato de entrega oficial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdvisorOnly && (
            <span className="px-3.5 py-1.5 rounded-2xl bg-blue-50 text-[#1A73E8] text-xs font-black border border-[#1A73E8]/20 flex items-center gap-1.5 shadow-xs">
              <Users className="w-3.5 h-3.5" />
              Tus Contratos Asignados ({currentUser?.nombre || 'Asesor'})
            </span>
          )}
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-precision-primary bg-[#37474F] hover:bg-[#263238] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear Nuevo Contrato
          </button>
        </div>
      </div>

      {/* Pestañas de Estado con Contadores */}
      {(() => {
        const countAll = contracts.length;
        const countSinAbrir = contracts.filter((c) => c.estado === 'SIN_ABRIR').length;
        const countAbiertos = contracts.filter((c) => c.estado === 'ACTIVO').length;
        const countFinalizados = contracts.filter((c) => c.estado === 'FINALIZADO').length;

        return (
          <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex bg-[#F4F6F9] p-1 rounded-xl w-full md:w-auto border border-[#E5E8EE] overflow-x-auto">
              {[
                { id: 'ALL', label: 'Todos', count: countAll },
                { id: 'SIN_ABRIR', label: 'Sin Abrir', count: countSinAbrir },
                { id: 'ACTIVO', label: 'Abiertos', count: countAbiertos },
                { id: 'FINALIZADO', label: 'Finalizados', count: countFinalizados },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 md:flex-none px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]'
                      : 'text-[#747780] hover:text-[#1B1D22]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === tab.id
                        ? 'bg-[#E8F0FE] text-[#1A73E8]'
                        : 'bg-[#E5E8EE] text-[#747780]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar contrato, cliente, folio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="precision-input pl-10 text-xs w-full"
                />
              </div>

              {!isAdvisorOnly && (
                <div className="relative">
                  <select
                    value={selectedAdvisor}
                    onChange={(e) => setSelectedAdvisor(e.target.value)}
                    className="bg-[#F4F6F9] border border-[#E5E8EE] rounded-xl px-3 py-2 text-xs font-bold text-[#1B1D22] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Todos los Asesores</option>
                    {Array.from(
                      new Map(
                        contracts
                          .filter((c: any) => c.cotizacion?.asesor)
                          .map((c: any) => [
                            c.cotizacion.asesor.id,
                            `${c.cotizacion.asesor.nombre} ${c.cotizacion.asesor.apellido}`,
                          ])
                      ).entries()
                    ).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Cargando contratos jurídicos..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          tone="neutral"
          title="No se encontraron contratos"
          description="Aún no hay contratos registrados para los criterios seleccionados."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContracts.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-[#E5E8EE] hover:border-[#37474F]/40 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
                  <span className="text-xs font-black font-mono text-[#37474F] bg-[#F4F6F9] px-2.5 py-1 rounded-lg border border-[#E5E8EE]">
                    {c.codigo}
                  </span>
                  {getStatusBadge(c.estado)}
                </div>

                <div>
                  <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Arrendatario / Cliente</span>
                  <h4 className="text-sm font-black text-[#1B1D22]">{c.cliente?.nombre}</h4>
                  {c.cotizacion?.numeroCotizacion ? (
                    <span className="text-[10px] text-[#1A73E8] font-mono font-bold block mt-0.5">
                      Vínculo: Cotización {c.cotizacion.numeroCotizacion}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-mono font-bold block mt-0.5">
                      Origen: Creación Directa sin Cotización
                    </span>
                  )}
                  {(c.cotizacion as any)?.asesor && (
                    <span className="text-[10px] text-[#37474F] font-semibold block mt-0.5">
                      Asesor: {(c.cotizacion as any).asesor.nombre} {(c.cotizacion as any).asesor.apellido}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E8EE]">
                  <div>
                    <span className="text-[#747780] font-extrabold text-[9px] uppercase block">Vigencia Inicial</span>
                    <span className="font-bold text-[#37474F]">{formatDate(c.fechaInicio)}</span>
                  </div>
                  <div>
                    <span className="text-[#747780] font-extrabold text-[9px] uppercase block">Venta Estimada</span>
                    <span className="font-bold text-[#37474F]">{formatDate(c.fechaFin)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Depósito de Garantía</span>
                  <span className="text-sm font-black font-mono text-[#1B1D22]">
                    {formatCurrency(c.depositoGarantia)}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#E5E8EE] pt-3 mt-4 flex flex-col gap-2">
                {c.estado === 'SIN_ABRIR' ? (
                  <button
                    onClick={() => setSelectedContractForOpen(c)}
                    className="btn-precision-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 w-full flex items-center justify-center gap-1.5 shadow-xs font-black cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" /> Abrir Contrato (Configurar Cortes)
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedContractForCortes(c)}
                      className="btn-precision-primary bg-[#1A73E8] hover:bg-[#1557B0] text-xs py-2 flex-1 flex items-center justify-center gap-1.5 shadow-xs font-bold"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Cortes
                    </button>
                    {c.estado === 'ACTIVO' && (
                      <button
                        onClick={() => handleFinalizeContract(c.id, c.codigo)}
                        className="btn-precision-outline border-slate-300 text-slate-700 hover:bg-slate-100 text-xs py-2 px-3 flex items-center justify-center gap-1 font-bold"
                        title="Finalizar contrato"
                      >
                        <Flag className="w-3.5 h-3.5 text-slate-500" /> Finalizar
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setContractToPrint(c)}
                    className="btn-precision-outline text-xs py-1.5 px-2.5 border-[#1A73E8]/30 text-[#1A73E8] hover:bg-[#E8F0FE] flex items-center gap-1 flex-1 justify-center"
                  >
                    <Printer className="w-3.5 h-3.5" /> Formato
                  </button>

                  <button
                    onClick={() => setSelectedContractForDetail(c)}
                    className="btn-precision-outline text-xs py-1.5 px-3 border-[#37474F]/30 text-[#37474F] hover:bg-[#F4F6F9] flex-1 text-center"
                  >
                    Ficha Legal
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cortes de Facturación */}
      {selectedContractForCortes && (
        <ContractCortesModal
          contract={selectedContractForCortes}
          onClose={() => {
            setSelectedContractForCortes(null);
            loadContracts();
          }}
          onUpdate={loadContracts}
        />
      )}

      {/* Modal para Abrir Contrato y Configurar Cortes */}
      {selectedContractForOpen && (
        <ContractOpenModal
          contract={selectedContractForOpen}
          onClose={() => setSelectedContractForOpen(null)}
          onSuccess={() => {
            setSelectedContractForOpen(null);
            loadContracts();
            setActiveTab('ACTIVO');
          }}
        />
      )}

      {/* Modal de Detalle */}
      {selectedContractForDetail && (
        <div className="fixed inset-0 bg-[#37474F]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl border border-[#E5E8EE] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="p-6 bg-[#37474F] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Ficha Legal de Contrato {selectedContractForDetail.codigo}</h3>
                  <p className="text-xs text-white/80 font-medium">Cliente: {selectedContractForDetail.cliente?.nombre}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedContractForDetail(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE]">
                <div>
                  <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Período de Contrato</span>
                  <span className="font-extrabold text-[#1B1D22]">
                    {formatDate(selectedContractForDetail.fechaInicio)} - {formatDate(selectedContractForDetail.fechaFin)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Depósito de Garantía Custodiado</span>
                  <span className="font-mono font-black text-sm text-[#1B1D22]">
                    {formatCurrency(selectedContractForDetail.depositoGarantia)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-black text-[#1B1D22] uppercase tracking-wider text-[11px] mb-2">Equipos y Valores de Renta</h4>
                <div className="border border-[#E5E8EE] rounded-xl overflow-hidden divide-y divide-[#E5E8EE]">
                  {selectedContractForDetail.items.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between font-medium">
                      <div>
                        <span className="font-extrabold text-[#1B1D22] block">{it.equipo?.modelo || 'Equipo'}</span>
                        <span className="text-[10px] text-[#747780]">
                          Tipo Control: {it.tipoControl || it.equipo?.tipoControl}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#1A73E8] block">{formatCurrency(it.precioRenta)} /día</span>
                        <span className="text-[10px] text-[#747780]">Cantidad: {it.cantidad} u.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-black text-[#1B1D22] uppercase tracking-wider text-[11px] mb-1">Cláusulas Legales y Términos</h4>
                <div className="bg-[#F4F6F9] p-3 rounded-xl border border-[#E5E8EE] text-[#37474F] italic leading-relaxed">
                  "{selectedContractForDetail.condiciones}"
                </div>
              </div>
            </div>

            <div className="border-t border-[#E5E8EE] p-4 flex items-center justify-between">
              <button
                onClick={() => {
                  const c = selectedContractForDetail;
                  setSelectedContractForDetail(null);
                  setContractToPrint(c);
                }}
                className="btn-precision-primary bg-[#1A73E8] text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Ver / Imprimir Formato Oficial
              </button>

              <button
                onClick={() => setSelectedContractForDetail(null)}
                className="btn-precision-outline text-xs"
              >
                Cerrar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
