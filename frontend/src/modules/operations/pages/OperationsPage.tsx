import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorAlert } from '../../../shared/components/ErrorAlert';
import React, { useState, useEffect } from 'react';
import type { Contract } from '../services/operations.api';
import { getContracts, getContractById, getDespachos, getRetornos, getSolicitudesDespacho, createSolicitudDespacho, scheduleSolicitudDespacho, aprobarLiquidacionRetorno, actualizarDestinoCreditoRetorno } from '../services/operations.api';
import type { SolicitudDespacho } from '../services/operations.api';
import { DespachoForm } from '../components/DespachoForm';
import { RetornoForm } from '../components/RetornoForm';
import { ActaEntregaPrintView } from '../components/ActaEntregaPrintView';
import { ActaRecepcionPrintView } from '../components/ActaRecepcionPrintView';
import { OperationsBoard } from '../components/OperationsBoard';
import { SwapEquipmentModal } from '../components/SwapEquipmentModal';
import { LayoutGrid, Truck, RotateCcw, FileText, Printer, CheckCircle2, Clock, ArrowLeftRight } from 'lucide-react';

export const OperationsPage: React.FC = () => {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const userRoles: string[] = (currentUser?.roles || []).map((role: any) =>
    String(typeof role === 'string' ? role : role?.nombre || role?.rol?.nombre || '').toUpperCase(),
  );
  const canManageSettlements = userRoles.some((role) => ['ADMIN', 'GERENTE', 'CONTABILIDAD'].includes(role));
  const activeTabDefault: 'kanban' | 'contracts' | 'despachos' | 'retornos' = 'kanban';
  const [activeTab, setActiveTab] = useState<'kanban' | 'contracts' | 'despachos' | 'retornos'>(activeTabDefault);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [despachos, setDespachos] = useState<any[]>([]);
  const [retornos, setRetornos] = useState<any[]>([]);
  const [solicitudesDespacho, setSolicitudesDespacho] = useState<SolicitudDespacho[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingLiquidationId, setProcessingLiquidationId] = useState<string | null>(null);

  // Vistas de Pantalla Completa (Formularios Operativos)
  const [selectedContractForDespacho, setSelectedContractForDespacho] = useState<Contract | null>(null);
  const [selectedContractForRetorno, setSelectedContractForRetorno] = useState<Contract | null>(null);
  const [selectedContractForSwap, setSelectedContractForSwap] = useState<Contract | null>(null);
  const [openingRetornoId, setOpeningRetornoId] = useState<string | null>(null);

  // Vistas de Impresión Oficial de Actas
  const [selectedForActaEntrega, setSelectedForActaEntrega] = useState<any | null>(null);
  const [selectedForActaRecepcion, setSelectedForActaRecepcion] = useState<any | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cData, dData, rData, sData] = await Promise.all([
        getContracts(),
        getDespachos(),
        getRetornos(),
        getSolicitudesDespacho(),
      ]);
      setContracts(cData);
      setDespachos(dData);
      setRetornos(rData);
      setSolicitudesDespacho(sData);
    } catch {
      setError('Error al cargar la información operativa');
    } finally {
      setIsLoading(false);
    }
  };

  const approveReturnSettlement = async (returnId: string) => {
    if (!window.confirm('¿Aprobar la liquidación? Esta acción cerrará anticipadamente el contrato y ajustará los cortes pendientes.')) return;
    setProcessingLiquidationId(returnId);
    setError(null);
    try {
      await aprobarLiquidacionRetorno(returnId);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo aprobar la liquidación.');
    } finally {
      setProcessingLiquidationId(null);
    }
  };

  const setCreditDestination = async (returnId: string, destination: 'REEMBOLSO' | 'SALDO_FAVOR') => {
    setProcessingLiquidationId(returnId);
    setError(null);
    try {
      await actualizarDestinoCreditoRetorno(returnId, destination);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo guardar el destino del crédito.');
    } finally {
      setProcessingLiquidationId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const getDespachoProgress = (contract: Contract) => {
    const items = contract.items || [];
    const totalContratado = items.reduce((acc, it) => acc + (it.cantidad || 1), 0);
    
    // Buscar todos los despachos asociados a este contrato
    const despachosContrato = despachos.filter(
      (d: any) => d.contratoId === contract.id || d.contrato?.id === contract.id
    );
    const totalDespachado = despachosContrato.reduce((acc: number, d: any) => {
      const dItems = d.items || [];
      return acc + dItems.reduce((iAcc: number, it: any) => iAcc + (it.cantidad || 1), 0);
    }, 0);

    const ultimoDespacho = despachosContrato.length > 0 ? despachosContrato[0] : null;
    const isTotalmenteDespachado = totalDespachado >= totalContratado && totalContratado > 0;
    const isParcialmenteDespachado = totalDespachado > 0 && !isTotalmenteDespachado;

    return {
      totalContratado,
      totalDespachado,
      despachosContrato,
      ultimoDespacho,
      isTotalmenteDespachado,
      isParcialmenteDespachado,
    };
  };

  const programarSalida = async (contract: Contract, fecha: string) => {
    const fechaProgramada = new Date(`${fecha}T12:00:00`).toISOString();
    const solicitud = solicitudesDespacho.find(s =>
      s.contratoId === contract.id && !['COMPLETADA', 'CANCELADA', 'RECHAZADA'].includes(s.estado)
    );
    if (solicitud) await scheduleSolicitudDespacho(solicitud.id, fechaProgramada);
    else await createSolicitudDespacho({ contratoId: contract.id, fechaProgramada });
    await loadData();
  };

  const openRetorno = async (contractId: string) => {
    setOpeningRetornoId(contractId);
    setError(null);
    try {
      const contract = await getContractById(contractId);
      const pendientes = new Map<string, number>();
      for (const despacho of contract.despachos || []) {
        for (const item of despacho.items || []) {
          pendientes.set(item.equipoId, (pendientes.get(item.equipoId) || 0) + Number(item.cantidad || 1));
        }
      }
      for (const devolucion of contract.devoluciones || []) {
        for (const item of devolucion.items || []) {
          pendientes.set(item.equipoId, (pendientes.get(item.equipoId) || 0)
            - Number(item.cantidadRetornada || 0) - Number(item.cantidadPerdida || 0));
        }
      }
      const items = (contract.items || []).filter(item => (pendientes.get(item.equipoId) || 0) > 0)
        .map(item => ({ ...item, cantidad: pendientes.get(item.equipoId)! }));
      if (items.length === 0) {
        setError('Este contrato no tiene equipos despachados pendientes de retorno.');
        return;
      }
      setSelectedContractForRetorno({ ...contract, items });
    } catch {
      setError('No se pudo cargar el contrato y sus equipos para registrar el retorno.');
    } finally {
      setOpeningRetornoId(null);
    }
  };

  // 1. Vista Pantalla Completa: Formulario Orden de Entrega (Despacho)
  if (selectedContractForDespacho) {
    const contractDespachos = despachos.filter(
      (d: any) => d.contratoId === selectedContractForDespacho.id || d.contrato?.id === selectedContractForDespacho.id
    );
    const enrichedContract = {
      ...selectedContractForDespacho,
      despachos: contractDespachos
    };
    return (
      <DespachoForm
        contract={enrichedContract}
        onBack={() => setSelectedContractForDespacho(null)}
        onSuccess={(result: any) => {
          const currentContract = selectedContractForDespacho;
          setSelectedContractForDespacho(null);
          loadData();
          setSelectedForActaEntrega({
            despacho: result?.despacho || result,
            contrato: currentContract,
            actaData: result?.actaData
          });
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
        actaData={selectedForActaEntrega.actaData}
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
        <LoadingState message="Cargando flujo operativo..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <>
          {/* TAB 0: TABLERO KANBAN DE AGENDA OPERATIVA DE PATIO */}
          {activeTab === 'kanban' && (
            <OperationsBoard
              contracts={contracts}
              despachos={despachos}
              retornos={retornos}
              solicitudesDespacho={solicitudesDespacho}
              onScheduleDespacho={programarSalida}
              onProcessDespacho={(contract) => setSelectedContractForDespacho(contract)}
              onProcessRetorno={(contract) => void openRetorno(contract.id)}
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
                  {contracts.map((c) => {
                    const progress = getDespachoProgress(c);

                    return (
                      <div key={c.id} className="bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4 hover:border-[#1A73E8]/40 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-black text-[#1A73E8] uppercase tracking-wider block font-mono">
                              {c.codigo}
                            </span>
                            <h4 className="text-sm font-black text-[#1B1D22]">{c.cliente?.nombre}</h4>
                            <span className="text-xs text-[#747780] font-medium block">
                              Periodo: {formatDate(c.fechaInicio)} - {formatDate(c.fechaFin)}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#1A73E8]/10 text-[#1A73E8] border border-[#1A73E8]/20">
                              {c.estado}
                            </span>
                            {progress.isTotalmenteDespachado ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-sans">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Totalmente Despachado
                              </span>
                            ) : progress.isParcialmenteDespachado ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 font-sans">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Despacho Parcial ({progress.totalDespachado}/{progress.totalContratado})
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 font-sans">
                                Pendiente de Salida
                              </span>
                            )}
                          </div>
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
                            {!progress.isTotalmenteDespachado && (
                              <ScheduleDispatchControl
                                contract={c}
                                scheduledDate={solicitudesDespacho.find(s => s.contratoId === c.id && !['COMPLETADA', 'CANCELADA', 'RECHAZADA'].includes(s.estado))?.fechaProgramada || c.fechaInicio}
                                onSchedule={programarSalida}
                              />
                            )}
                            <button
                              onClick={() => setSelectedForActaEntrega({ 
                                despacho: progress.ultimoDespacho, 
                                contrato: c 
                              })}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Vista Previa de Acta de Entrega"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-700" /> Ver Acta
                            </button>

                            {progress.totalDespachado > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedContractForSwap(c)}
                                className="btn-precision-outline text-xs text-[#1A73E8] border-[#1A73E8]/30 hover:bg-[#E8F0FE] cursor-pointer flex items-center gap-1.5"
                                title="Sustituir equipo averiado en obra por otro disponible en almacén"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" /> Sustituir
                              </button>
                            )}

                            {progress.isTotalmenteDespachado ? (
                              <button
                                onClick={() => void openRetorno(c.id)}
                                disabled={openingRetornoId === c.id}
                                className="btn-precision-outline text-xs text-[#C55500] border-[#C55500]/30 hover:bg-[#FDF2E9] cursor-pointer flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> {openingRetornoId === c.id ? 'Cargando...' : 'Registrar Retorno'}
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedContractForDespacho(c)}
                                className="btn-precision-primary text-xs py-2 px-4.5 cursor-pointer font-black tracking-tight flex items-center gap-2"
                              >
                                <Truck className="w-4 h-4" />
                                {progress.isParcialmenteDespachado 
                                  ? `Despachar Restante (${progress.totalContratado - progress.totalDespachado})` 
                                  : 'Generar Orden de Entrega'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                              Operador: {d.operadorNombre} | Vehículo: {d.vehiculoEnvio || 'No Especificado'}
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
                            onClick={() => void openRetorno(d.contratoId)}
                            disabled={openingRetornoId === d.contratoId}
                            className="btn-precision-outline text-xs text-[#C55500] border-[#C55500]/30 hover:bg-[#FDF2E9] cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> {openingRetornoId === d.contratoId ? 'Cargando...' : 'Registrar Retorno'}
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

                      {r.liquidacionRetorno && <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div><b className="uppercase">Liquidación {r.liquidacionRetorno.estado}</b><p className="text-[11px] text-[#37474F]">{r.liquidacionRetorno.diasCobrados} de {r.liquidacionRetorno.diasPactados} días · Devengado C$ {Number(r.liquidacionRetorno.montoDevengado).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</p></div>
                          {canManageSettlements && r.actaRetornoData?.tipoRetorno === 'TOTAL' && r.liquidacionRetorno.estado === 'PENDIENTE_APROBACION' && <button type="button" disabled={processingLiquidationId === r.id} onClick={() => approveReturnSettlement(r.id)} className="btn-precision-primary text-xs disabled:opacity-50">Aprobar liquidación y cierre</button>}
                        </div>
                        {canManageSettlements && r.liquidacionRetorno.estado === 'APROBADA' && Number(r.liquidacionRetorno.creditoCliente) > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-emerald-200 pt-2">
                          <span className="font-bold">Crédito: C$ {Number(r.liquidacionRetorno.creditoCliente).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
                          <button type="button" disabled={processingLiquidationId === r.id} onClick={() => setCreditDestination(r.id, 'REEMBOLSO')} className="btn-precision-outline text-xs">Elegir reembolso como destino</button>
                          <button type="button" disabled={processingLiquidationId === r.id} onClick={() => setCreditDestination(r.id, 'SALDO_FAVOR')} className="btn-precision-outline text-xs">Elegir saldo a favor como destino</button>
                          {r.liquidacionRetorno.requiereNotaCredito && <span className="text-amber-700 font-bold">Nota de crédito pendiente (trámite separado)</span>}
                        </div>}
                      </div>}

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
                              {it.inspeccionEstado && <span className="font-bold">Estado: {it.inspeccionEstado.estadoFisico === 'DANADO' ? 'Dañado' : it.inspeccionEstado.estadoFisico === 'DESGASTE_NORMAL' ? 'Desgaste normal' : 'Bueno'} · {it.inspeccionEstado.funcionamiento === 'NO_FUNCIONA' ? 'No funciona' : it.inspeccionEstado.funcionamiento === 'FUNCIONA' ? 'Funciona' : 'Sin prueba funcional'}</span>}
                            </div>
                            {!!it.inspeccionEstado?.fotosUrls?.length && <p className="text-[11px] text-[#747780]">Evidencia: {it.inspeccionEstado.fotosUrls.length} foto(s) registrada(s)</p>}
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

      {selectedContractForSwap && (
        <SwapEquipmentModal
          contract={selectedContractForSwap}
          onClose={() => setSelectedContractForSwap(null)}
          onSuccess={async (res) => {
            setSelectedContractForSwap(null);
            await loadData();
            if (res?.despacho) {
              setSelectedForActaEntrega({
                despacho: res.despacho,
                contrato: selectedContractForSwap,
              });
            }
          }}
        />
      )}

    </div>
  );
};

const ScheduleDispatchControl: React.FC<{
  contract: Contract;
  scheduledDate: string;
  onSchedule: (contract: Contract, date: string) => Promise<void>;
}> = ({ contract, scheduledDate, onSchedule }) => {
  const toLocalDate = (value: string) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toLocalDate(scheduledDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!date) return;
    setSaving(true);
    setError('');
    try {
      await onSchedule(contract, date);
      setOpen(false);
    } catch {
      setError('No se pudo programar la salida');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setOpen(!open)} className="text-xs font-bold text-blue-700 hover:underline">
        Programar salida
      </button>
      {open && (
        <>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label={`Fecha de salida de ${contract.codigo}`} className="precision-input text-xs py-1" />
          <button type="button" onClick={save} disabled={saving || !date} className="btn-precision-primary text-xs px-3 py-1 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {error && <span className="text-xs text-red-700">{error}</span>}
        </>
      )}
    </div>
  );
};
