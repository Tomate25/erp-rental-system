import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorAlert } from '../../../shared/components/ErrorAlert';
import React, { useState, useEffect, useMemo } from 'react';
import type { Contract } from '../services/operations.api';
import { getContracts, getContractById, getDespachos, getRetornos, getSolicitudesDespacho, getSolicitudesRetorno, createSolicitudDespacho, scheduleSolicitudDespacho, createSolicitudRetorno, aprobarLiquidacionRetorno, actualizarDestinoCreditoRetorno } from '../services/operations.api';
import type { SolicitudDespacho, SolicitudRetorno } from '../services/operations.api';
import { DespachoForm } from '../components/DespachoForm';
import { RetornoForm } from '../components/RetornoForm';
import { ActaEntregaPrintView } from '../components/ActaEntregaPrintView';
import { ActaRecepcionPrintView } from '../components/ActaRecepcionPrintView';
import { OperationsBoard } from '../components/OperationsBoard';
import { SwapEquipmentModal } from '../components/SwapEquipmentModal';
import { Truck, RotateCcw, LayoutDashboard } from 'lucide-react';
import { FilterTabs } from '../../../shared/components/FilterTabs';
import { useConfirm } from '../../../shared/components/Toast/useConfirm';
import { DispatchHistory, ReturnHistory } from '../components/OperationsLists';
import { getStoredUser } from '../../../shared/utils/auth-storage';

type OperationsTab = 'kanban' | 'despachos' | 'retornos';
const readTab = (): OperationsTab => {
  const value = new URLSearchParams(window.location.search).get('vista');
  return value === 'despachos' || value === 'retornos' ? value : 'kanban';
};

export const OperationsPage: React.FC = () => {
  const confirm = useConfirm();
  const currentUser = getStoredUser<any>();
  const userRoles: string[] = (currentUser?.roles || []).map((role: any) =>
    String(typeof role === 'string' ? role : role?.nombre || role?.rol?.nombre || '').toUpperCase(),
  );
  const canManageSettlements = userRoles.some((role) => ['ADMIN', 'GERENTE', 'CONTABILIDAD'].includes(role));
  const [activeTab, setActiveTab] = useState<OperationsTab>(readTab);
  const selectTab = (tab: OperationsTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('vista', tab);
    window.history.pushState({}, '', url);
  };
  useEffect(() => {
    const onPopState = () => setActiveTab(readTab());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [despachos, setDespachos] = useState<any[]>([]);
  const [retornos, setRetornos] = useState<any[]>([]);
  const [solicitudesDespacho, setSolicitudesDespacho] = useState<SolicitudDespacho[]>([]);
  const [solicitudesRetorno, setSolicitudesRetorno] = useState<SolicitudRetorno[]>([]);
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
      const [cData, dData, rData, sData, srData] = await Promise.all([
        getContracts(),
        getDespachos(),
        getRetornos(),
        getSolicitudesDespacho(),
        getSolicitudesRetorno().catch(() => []),
      ]);
      setContracts(cData);
      setDespachos(dData);
      setRetornos(rData);
      setSolicitudesDespacho(sData);
      setSolicitudesRetorno(srData || []);
    } catch {
      setError('Error al cargar la información operativa');
    } finally {
      setIsLoading(false);
    }
  };

  // Cálculo en tiempo real de unidades pendientes de retornar por cada contrato
  const pendingUnitsByContract = useMemo(() => {
    const map = new Map<string, number>();

    // 1. Recorrer todos los despachos para mapear salidas por contrato y equipo
    const salidasPorContrato = new Map<string, Map<string, number>>();
    for (const d of despachos) {
      const cId = d.contratoId || d.contrato?.id;
      if (!cId) continue;
      if (!salidasPorContrato.has(cId)) {
        salidasPorContrato.set(cId, new Map<string, number>());
      }
      const eqMap = salidasPorContrato.get(cId)!;
      for (const it of d.items || []) {
        const eqId = it.equipoId || it.equipo?.id || (it as any).equipo_id;
        if (eqId) {
          eqMap.set(eqId, (eqMap.get(eqId) || 0) + (Number(it.cantidad) || 1));
        }
      }
    }

    // 2. Descontar las devoluciones registradas (unidades retornadas y perdidas)
    for (const r of retornos) {
      const cId = r.contratoId || r.contrato?.id;
      if (!cId || !salidasPorContrato.has(cId)) continue;
      const eqMap = salidasPorContrato.get(cId)!;
      for (const it of r.items || []) {
        const eqId = it.equipoId || it.equipo?.id || (it as any).equipo_id;
        if (eqId && eqMap.has(eqId)) {
          const retCount = (Number(it.cantidadRetornada) || 0) + (Number(it.cantidadPerdida) || 0);
          eqMap.set(eqId, Math.max(0, (eqMap.get(eqId) || 0) - retCount));
        }
      }
    }

    // 3. Consolidar el total de unidades pendientes de retorno por contrato
    for (const [cId, eqMap] of salidasPorContrato.entries()) {
      let totalPendiente = 0;
      for (const cant of eqMap.values()) {
        totalPendiente += cant;
      }
      map.set(cId, totalPendiente);
    }

    return map;
  }, [despachos, retornos]);

  const approveReturnSettlement = async (returnId: string) => {
    if (!await confirm('¿Aprobar la liquidación? Esta acción cerrará anticipadamente el contrato y ajustará los cortes pendientes.')) return;
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



  const programarSalida = async (contract: Contract, fecha: string, hora?: string) => {
    let fechaProgramada: string;
    if (fecha.includes('T')) {
      fechaProgramada = new Date(fecha).toISOString();
    } else if (hora) {
      fechaProgramada = new Date(`${fecha}T${hora}:00`).toISOString();
    } else {
      fechaProgramada = new Date(`${fecha}T12:00:00`).toISOString();
    }
    const solicitud = solicitudesDespacho.find(s =>
      s.contratoId === contract.id && !['COMPLETADA', 'CANCELADA', 'RECHAZADA'].includes(s.estado)
    );
    if (solicitud) await scheduleSolicitudDespacho(solicitud.id, fechaProgramada);
    else await createSolicitudDespacho({ contratoId: contract.id, fechaProgramada });
    await loadData();
  };

  const programarRetorno = async (contract: Contract, fecha: string, hora?: string) => {
    let fechaProgramada: string;
    if (fecha.includes('T')) {
      fechaProgramada = new Date(fecha).toISOString();
    } else if (hora) {
      fechaProgramada = new Date(`${fecha}T${hora}:00`).toISOString();
    } else {
      fechaProgramada = new Date(`${fecha}T12:00:00`).toISOString();
    }
    await createSolicitudRetorno({ contratoId: contract.id, fechaProgramada });
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
          const eqId = item.equipoId || item.equipo?.id || (item as any).equipo_id;
          if (eqId) {
            pendientes.set(eqId, (pendientes.get(eqId) || 0) + Number(item.cantidad || 1));
          }
        }
      }
      for (const devolucion of contract.devoluciones || []) {
        for (const item of devolucion.items || []) {
          const eqId = item.equipoId || item.equipo?.id || (item as any).equipo_id;
          if (eqId) {
            pendientes.set(
              eqId,
              (pendientes.get(eqId) || 0) -
                Number(item.cantidadRetornada || 0) -
                Number(item.cantidadPerdida || 0),
            );
          }
        }
      }
      const items = (contract.items || [])
        .filter((item) => {
          const eqId = item.equipoId || item.equipo?.id || (item as any).equipo_id;
          return eqId && (pendientes.get(eqId) || 0) > 0;
        })
        .map((item) => {
          const eqId = item.equipoId || item.equipo?.id || (item as any).equipo_id;
          return { ...item, cantidad: pendientes.get(eqId)! };
        });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-precision-neutral-border pb-3">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-precision-primary text-white shadow-md shadow-precision-primary/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-precision-neutral-dark tracking-tight">Operaciones, Despachos y Retornos</h2>
          </div>
        </div>
      </div>

      <FilterTabs<OperationsTab> label="Vistas de operaciones" value={activeTab} onChange={selectTab} options={[
        { value: 'kanban', label: 'Control', icon: LayoutDashboard },
        { value: 'despachos', label: 'Despachos', count: despachos.length, icon: Truck },
        { value: 'retornos', label: 'Retornos', count: retornos.length, icon: RotateCcw },
      ]} />

      {/* Loading state */}
      {isLoading ? (
        <LoadingState message="Cargando flujo operativo..." />
      ) : (
        <>
          {error && <ErrorAlert message={error} />}
          {/* TAB 0: TABLERO KANBAN DE AGENDA OPERATIVA DE PATIO */}
          {activeTab === 'kanban' && (
            <OperationsBoard
              contracts={contracts}
              despachos={despachos}
              retornos={retornos}
              solicitudesDespacho={solicitudesDespacho}
              solicitudesRetorno={solicitudesRetorno}
              onScheduleDespacho={programarSalida}
              onScheduleRetorno={programarRetorno}
              onProcessDespacho={(contract) => setSelectedContractForDespacho(contract)}
              onProcessRetorno={(contract) => void openRetorno(contract.id)}
            />
          )}


          {activeTab === 'despachos' && <DispatchHistory
            despachos={despachos} pendingUnitsByContract={pendingUnitsByContract}
            openingRetornoId={openingRetornoId} onOpenRetorno={id => void openRetorno(id)}
            onPrint={d => setSelectedForActaEntrega({ despacho: d, contrato: d.contrato })} />}
          {activeTab === 'retornos' && <ReturnHistory
            retornos={retornos} canManageSettlements={canManageSettlements}
            processingLiquidationId={processingLiquidationId}
            onPrint={r => setSelectedForActaRecepcion({ retorno: r, contrato: r.contrato })}
            onApprove={id => void approveReturnSettlement(id)}
            onCreditDestination={(id, destination) => void setCreditDestination(id, destination)} />}
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

