import React, { useState, useEffect } from 'react';
import type { Contract } from '../services/operations.api';
import { getContracts, getDespachos, getRetornos } from '../services/operations.api';
import { DespachoForm } from '../components/DespachoForm';
import { RetornoForm } from '../components/RetornoForm';
import { ActaEntregaPrintView } from '../components/ActaEntregaPrintView';
import { ActaRecepcionPrintView } from '../components/ActaRecepcionPrintView';
import { OperationsBoard } from '../components/OperationsBoard';
import { LayoutGrid, Truck, RotateCcw, FileText, Printer } from 'lucide-react';

export const OperationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kanban' | 'contracts' | 'despachos' | 'retornos'>('kanban');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [despachos, setDespachos] = useState<any[]>([]);
  const [retornos, setRetornos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vistas de Pantalla Completa (Formularios Operativos)
  const [selectedContractForDespacho, setSelectedContractForDespacho] = useState<Contract | null>(null);
  const [selectedContractForRetorno, setSelectedContractForRetorno] = useState<Contract | null>(null);

  // Vistas de Impresión Oficial de Actas
  const [selectedForActaEntrega, setSelectedForActaEntrega] = useState<any | null>(null);
  const [selectedForActaRecepcion, setSelectedForActaRecepcion] = useState<any | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cData, dData, rData] = await Promise.all([
        getContracts(),
        getDespachos(),
        getRetornos()
      ]);
      setContracts(cData);
      setDespachos(dData);
      setRetornos(rData);
    } catch (err: any) {
      setError('Error al cargar la información operativa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // 1. Vista Pantalla Completa: Formulario Orden de Entrega (Despacho)
  if (selectedContractForDespacho) {
    return (
      <DespachoForm
        contract={selectedContractForDespacho}
        onBack={() => setSelectedContractForDespacho(null)}
        onSuccess={(createdDespacho) => {
          const currentContract = selectedContractForDespacho;
          setSelectedContractForDespacho(null);
          loadData();
          setSelectedForActaEntrega({ despacho: createdDespacho, contrato: currentContract });
        }}
      />
    );
  }

  // 2. Vista Pantalla Completa: Formulario Orden de Retorno
  if (selectedContractForRetorno) {
    return (
      <RetornoForm
        contract={selectedContractForRetorno}
        onBack={() => setSelectedContractForRetorno(null)}
        onSuccess={(createdRetorno) => {
          const currentContract = selectedContractForRetorno;
          setSelectedContractForRetorno(null);
          loadData();
          setSelectedForActaRecepcion({ retorno: createdRetorno, contrato: currentContract });
        }}
      />
    );
  }

  // 3. Vista Impresión Acta de Entrega
  if (selectedForActaEntrega) {
    return (
      <ActaEntregaPrintView
        despacho={selectedForActaEntrega.despacho}
        contrato={selectedForActaEntrega.contrato}
        onBack={() => setSelectedForActaEntrega(null)}
      />
    );
  }

  // 4. Vista Impresión Acta de Recepción
  if (selectedForActaRecepcion) {
    return (
      <ActaRecepcionPrintView
        retorno={selectedForActaRecepcion.retorno}
        contrato={selectedForActaRecepcion.contrato}
        onBack={() => setSelectedForActaRecepcion(null)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn font-sans w-full">
      
      {/* Header del Módulo Operativo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E8EE] pb-3">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Operaciones, Despachos y Retornos</h2>
            <p className="text-xs text-[#747780] font-medium">
              Gestión visual de bodega, salidas con Orden de Entrega y retornos con Acta de Recepción.
            </p>
          </div>
        </div>
      </div>

      {/* Pestañas Operativas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8EE] pb-1">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'kanban'
              ? 'bg-[#37474F] text-white shadow-xs'
              : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Tablero Kanban de Patio
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'contracts'
              ? 'bg-[#1A73E8] text-white shadow-xs'
              : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Contratos Activos ({contracts.length})
        </button>

        <button
          onClick={() => setActiveTab('despachos')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'despachos'
              ? 'bg-[#1A73E8] text-white shadow-xs'
              : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
          }`}
        >
          <Truck className="w-4 h-4" />
          Órdenes de Despacho ({despachos.length})
        </button>

        <button
          onClick={() => setActiveTab('retornos')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'retornos'
              ? 'bg-[#C55500] text-white shadow-xs'
              : 'bg-white text-[#747780] hover:text-[#1B1D22] border border-[#E5E8EE]'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Órdenes de Retorno ({retornos.length})
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#1A73E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#747780]">Cargando flujo operativo...</p>
        </div>
      ) : error ? (
        <div className="bg-[#FDF2E9] border border-[#C55500]/20 rounded-2xl p-6 text-center text-[#C55500] text-xs font-bold">
          {error}
        </div>
      ) : (
        <>
          {/* TAB 0: TABLERO KANBAN DE AGENDA OPERATIVA DE PATIO */}
          {activeTab === 'kanban' && (
            <OperationsBoard
              contracts={contracts}
              despachos={despachos}
              retornos={retornos}
              onProcessDespacho={(contract) => setSelectedContractForDespacho(contract)}
              onProcessRetorno={(contract) => setSelectedContractForRetorno(contract)}
            />
          )}

          {/* TAB 1: CONTRATOS ACTIVOS / ELEMENTOS A SALIR */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              {contracts.length === 0 ? (
                <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
                  <FileText className="w-8 h-8 text-[#747780] mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-[#1B1D22]">No hay contratos activos registrados</h4>
                  <p className="text-xs text-[#747780] max-w-sm mx-auto mt-1">
                    Aprueba una cotización comercial para convertirla automáticamente en un contrato de alquiler.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contracts.map((c) => (
                    <div key={c.id} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4 hover:border-[#1A73E8]/40 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block font-mono">
                            {c.codigo}
                          </span>
                          <h4 className="text-sm font-black text-[#1B1D22]">{c.cliente?.nombre}</h4>
                          <span className="text-xs text-[#747780] font-medium block">
                            Periodo: {formatDate(c.fechaInicio)} - {formatDate(c.fechaFin)}
                          </span>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#1A73E8]/10 text-[#1A73E8] border border-[#1A73E8]/20">
                          {c.estado}
                        </span>
                      </div>

                      {/* Elementos a Salir (Equipos en Contrato) */}
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E8EE] space-y-2 text-xs">
                        <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block">
                          Elementos a Salir:
                        </span>
                        {c.items.map((it, iIdx) => (
                          <div key={iIdx} className="flex items-center justify-between font-bold text-[#37474F]">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                (it.tipoControl || it.equipo?.tipoControl) === 'SERIALIZADO' ? 'bg-[#1A73E8]' : 'bg-[#C55500]'
                              }`} />
                              <span className="uppercase">{it.equipo?.modelo || 'Equipo'}</span>
                            </div>
                            <span className="font-mono text-[11px] font-black">
                              {(it.tipoControl || it.equipo?.tipoControl) === 'SERIALIZADO' ? `S/N: ${it.equipo?.numeroSerie || 'Por Asignar'}` : `Cant: ${it.cantidad}`}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Acciones de Operación */}
                      <div className="flex flex-wrap items-center justify-between border-t border-[#E5E8EE] pt-3 gap-2">
                        <div>
                          <span className="text-[9px] font-extrabold text-[#747780] uppercase block">Garantía</span>
                          <span className="text-xs font-black font-mono text-[#1B1D22]">{formatCurrency(c.depositoGarantia)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedForActaEntrega({ contrato: c })}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Vista Previa de Acta de Entrega"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700" /> Ver Acta
                          </button>

                          <button
                            onClick={() => setSelectedContractForDespacho(c)}
                            className="btn-precision-primary text-xs py-2 px-4.5 cursor-pointer font-black tracking-tight flex items-center gap-2"
                          >
                            <Truck className="w-4 h-4" /> Generar Orden de Entrega
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ÓRDENES DE DESPACHO */}
          {activeTab === 'despachos' && (
            <div className="space-y-4">
              {despachos.length === 0 ? (
                <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
                  <Truck className="w-8 h-8 text-[#747780] mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-[#1B1D22]">No hay despachos registrados</h4>
                  <p className="text-xs text-[#747780]">Genera despachos desde los contratos activos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {despachos.map((d) => (
                    <div key={d.id} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E8EE] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#E8F0FE] text-[#1A73E8] text-[10px] font-black font-mono">
                              Contrato: {d.contrato?.codigo}
                            </span>
                            <span className="text-xs font-bold text-[#747780]">
                              Despachado: {formatDate(d.fechaDespacho)}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-[#1B1D22] mt-1">
                            Cliente: {d.contrato?.cliente?.nombre}
                          </h4>
                          {d.operadorNombre && (
                            <span className="text-xs text-[#747780] font-medium block">
                              Operador: {d.operadorNombre} | Vehículo: {d.vehiculoEnvio || 'N/A'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedForActaEntrega({ despacho: d, contrato: d.contrato })}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700" /> Acta de Entrega
                          </button>

                          <button
                            onClick={() => setSelectedContractForRetorno(d.contrato)}
                            className="btn-precision-outline text-xs text-[#C55500] border-[#C55500]/30 hover:bg-[#FDF2E9] cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Registrar Retorno
                          </button>
                        </div>
                      </div>

                      {/* Items Despachados */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {d.items?.map((it: any, iIdx: number) => (
                          <div key={iIdx} className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E8EE] text-xs space-y-1">
                            <span className="font-extrabold text-[#1B1D22] block uppercase">{it.equipo?.modelo}</span>
                            <div className="flex items-center justify-between text-[11px] text-[#747780]">
                              <span>Serie / Cantidad:</span>
                              <span className="font-mono font-black text-[#1A73E8]">
                                {it.numeroSerie || `${it.cantidad} u.`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#747780]">
                              <span>Horómetro Inicial:</span>
                              <span className="font-mono font-bold">{it.horometroInicial} hrs</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ÓRDENES DE RETORNO */}
          {activeTab === 'retornos' && (
            <div className="space-y-4">
              {retornos.length === 0 ? (
                <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
                  <RotateCcw className="w-8 h-8 text-[#747780] mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-[#1B1D22]">No hay retornos e inspecciones de daño registrados</h4>
                  <p className="text-xs text-[#747780]">Registra la recepción de equipos desde la pestaña de Despachos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {retornos.map((r) => (
                    <div key={r.id} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
                        <div>
                          <span className="text-[10px] font-black text-[#C55500] uppercase tracking-wider font-mono">
                            Retorno Contrato: {r.contrato?.codigo}
                          </span>
                          <h4 className="text-sm font-black text-[#1B1D22]">Cliente: {r.contrato?.cliente?.nombre}</h4>
                          <span className="text-xs text-[#747780] font-medium block">
                            Recibido por: {r.recibidoPor} | Fecha: {formatDate(r.fechaDevolucion)}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedForActaRecepcion({ retorno: r, contrato: r.contrato })}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-700" /> Acta de Recepción
                        </button>
                      </div>

                      {/* Items Retornados */}
                      <div className="space-y-2">
                        {r.items?.map((it: any, iIdx: number) => (
                          <div key={iIdx} className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E8EE] space-y-2 text-xs">
                            <div className="flex items-center justify-between font-extrabold text-[#1B1D22]">
                              <span className="uppercase">{it.equipo?.modelo}</span>
                              <span className="font-mono text-[#1A73E8]">
                                {it.numeroSerie ? `S/N: ${it.numeroSerie}` : `Retornadas: ${it.cantidadRetornada} u.`}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#747780]">
                              <span>Horómetro Final: <strong>{it.horometroFinal} hrs</strong></span>
                              <span>Horas de Uso Calculadas: <strong className="text-[#1A73E8]">+{it.horasCalculadas} hrs</strong></span>
                              {it.cantidadDañada > 0 && <span className="text-[#C55500] font-bold">Dañadas: {it.cantidadDañada}</span>}
                              {it.cantidadPerdida > 0 && <span className="text-red-600 font-bold">Perdidas: {it.cantidadPerdida}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
};
