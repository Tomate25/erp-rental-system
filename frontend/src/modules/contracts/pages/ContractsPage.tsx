import React, { useState, useEffect } from 'react';
import type { Contract } from '../../operations/services/operations.api';
import { getContracts } from '../../operations/services/operations.api';
import { ContractForm } from '../components/ContractForm';
import { ContractPrintView } from '../components/ContractPrintView';
import { ContractCortesModal } from '../components/ContractCortesModal';
import { FileText, Plus, Search, ShieldCheck, X, Printer, CreditCard } from 'lucide-react';

export const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContractForDetail, setSelectedContractForDetail] = useState<Contract | null>(null);
  const [contractToPrint, setContractToPrint] = useState<Contract | null>(null);
  const [selectedContractForCortes, setSelectedContractForCortes] = useState<Contract | null>(null);

  const loadContracts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getContracts();
      setContracts(data);
      setFilteredContracts(data);
    } catch (err: any) {
      setError('Error al cargar la lista de contratos de alquiler');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredContracts(contracts);
    } else {
      const filtered = contracts.filter(c =>
        c.codigo.toLowerCase().includes(q) ||
        (c.cliente?.nombre || '').toLowerCase().includes(q) ||
        (c.cotizacion?.numeroCotizacion || '').toLowerCase().includes(q)
      );
      setFilteredContracts(filtered);
    }
  }, [searchQuery, contracts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount);
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

        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-precision-primary bg-[#37474F] hover:bg-[#263238] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Crear Nuevo Contrato
        </button>
      </div>

      {/* Toolbar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] flex flex-col md:flex-row gap-3 md:items-center md:justify-between shadow-xs">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por código de contrato, cliente, folio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="precision-input pl-10 text-xs"
          />
        </div>

        <span className="text-xs font-extrabold text-[#747780]">
          Total Contratos: <strong className="text-[#1B1D22] font-mono">{filteredContracts.length}</strong>
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#37474F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#747780]">Cargando contratos jurídicos...</p>
        </div>
      ) : error ? (
        <div className="bg-[#FDF2E9] border border-[#C55500]/20 rounded-2xl p-6 text-center text-[#C55500] text-xs font-bold">
          {error}
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
          <FileText className="w-8 h-8 text-[#747780] mx-auto mb-2" />
          <h4 className="text-sm font-extrabold text-[#1B1D22]">No hay contratos registrados</h4>
          <p className="text-xs text-[#747780] max-w-sm mx-auto mt-1">
            Haz clic en "Crear Nuevo Contrato" para seleccionar un cliente y formalizar un arrendamiento.
          </p>
        </div>
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
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#1A73E8]/10 text-[#1A73E8] border border-[#1A73E8]/20">
                    {c.estado}
                  </span>
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
                <button
                  onClick={() => setSelectedContractForCortes(c)}
                  className="btn-precision-primary bg-[#1A73E8] hover:bg-[#1557B0] text-xs py-2 w-full flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Cortes de Facturación
                </button>

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
          onClose={() => setSelectedContractForCortes(null)}
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
