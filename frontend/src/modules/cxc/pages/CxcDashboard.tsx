import React, { useState, useEffect } from 'react';
import { cxcApi } from '../services/cxc.api';
import type { AntiguedadResponse, MonedaTipo } from '../types/cxc.types';
import { CxcKpiCards } from '../components/CxcKpiCards';
import { AntiguedadTab } from '../components/AntiguedadTab';
import { EstadoCuentaTab } from '../components/EstadoCuentaTab';
import { RecibosCajaTab } from '../components/RecibosCajaTab';
import { ArreglosPagoTab } from '../components/ArreglosPagoTab';
import { NotasDebitoCreditoTab } from '../components/NotasDebitoCreditoTab';
import { ConfiguracionTab } from '../components/ConfiguracionTab';
import {
  Clock,
  FileSpreadsheet,
  Receipt,
  CalendarCheck2,
  FileDiff,
  Settings,
  RefreshCw,
} from 'lucide-react';

export const CxcDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ANTIGUEDAD' | 'ESTADO_CUENTA' | 'RECIBOS' | 'ARREGLOS' | 'NOTAS' | 'CONFIG'>('ANTIGUEDAD');
  const [moneda, setMoneda] = useState<MonedaTipo>('NIO');
  const [tipoCambioBcn, setTipoCambioBcn] = useState<number>(36.6243);
  const [avisoFaltaTasaBcn, setAvisoFaltaTasaBcn] = useState<boolean>(false);
  const [antiguedadData, setAntiguedadData] = useState<AntiguedadResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClienteParaEstadoCuenta, setSelectedClienteParaEstadoCuenta] = useState<string | null>(null);

  const [filtrosAntiguedad, setFiltrosAntiguedad] = useState<{
    sucursalId?: string;
    vendedorId?: string;
    tipoCliente?: string;
    fechaCorte?: string;
    criterioFecha?: 'VENCIMIENTO' | 'EMISION';
    clienteId?: string;
  }>({});

  useEffect(() => {
    cargarTipoCambio();
    cargarAntiguedad();
  }, [moneda, filtrosAntiguedad]);

  const cargarTipoCambio = async () => {
    try {
      const tc = await cxcApi.getTipoCambioHoy();
      setTipoCambioBcn(tc.tasa);
    } catch (e) {
      console.error('Error cargando tipo de cambio:', e);
    }
  };

  const cargarAntiguedad = async () => {
    setLoading(true);
    try {
      const data = await cxcApi.getAntiguedad({
        ...filtrosAntiguedad,
        monedaVisualizacion: moneda,
      });
      setAntiguedadData(data);
      if (data.parametrosActivos) {
        setTipoCambioBcn(data.parametrosActivos.tipoCambioBcn);
        setAvisoFaltaTasaBcn(data.parametrosActivos.avisoFaltaTasaBcn);
      }
    } catch (e) {
      console.error('Error cargando antigüedad:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClienteEstadoCuenta = (clienteId: string) => {
    setSelectedClienteParaEstadoCuenta(clienteId);
    setActiveTab('ESTADO_CUENTA');
  };

  // Lista de clientes para selectores de modales
  const clientesLista = antiguedadData?.clientes.map((c) => ({
    id: c.clienteId,
    nombre: c.clienteNombre,
    rfc: c.clienteRuc,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#1B1D22] tracking-tight">
              Cuentas por Cobrar (CxC)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/30">
              Cartera Independiente BM
            </span>
          </div>
          <p className="text-xs text-[#747780] mt-1 font-medium">
            Control integral de cartera de crédito, antigüedad de saldos, estado de cuenta, recibos de caja con retenciones y acuerdos de pago.
          </p>
        </div>

        <button
          onClick={() => {
            cargarTipoCambio();
            cargarAntiguedad();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#F4F6F9] text-[#1B1D22] rounded-xl border border-[#E5E8EE] shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#1A73E8]" />
          Actualizar Datos
        </button>
      </div>

      {/* Tarjetas KPI Permanentes Arriba */}
      {antiguedadData && (
        <CxcKpiCards
          kpis={antiguedadData.kpisPorTramo}
          totalCartera={antiguedadData.resumenGlobal.totalCarteraVisualizada}
          totalDocumentos={antiguedadData.resumenGlobal.totalDocumentos}
          moneda={moneda}
          onMonedaChange={setMoneda}
          tipoCambioBcn={tipoCambioBcn}
          avisoFaltaTasaBcn={avisoFaltaTasaBcn}
        />
      )}

      {/* Pestañas de Navegación Principal */}
      <div className="flex items-center gap-1 border-b border-[#E5E8EE] overflow-x-auto">
        <button
          onClick={() => setActiveTab('ANTIGUEDAD')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ANTIGUEDAD'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Antigüedad de Saldos
        </button>

        <button
          onClick={() => setActiveTab('ESTADO_CUENTA')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ESTADO_CUENTA'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Estado de Cuenta
        </button>

        <button
          onClick={() => setActiveTab('RECIBOS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'RECIBOS'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Recibos de Caja (RC)
        </button>

        <button
          onClick={() => setActiveTab('ARREGLOS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ARREGLOS'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          Arreglos de Pago (ARR)
        </button>

        <button
          onClick={() => setActiveTab('NOTAS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'NOTAS'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <FileDiff className="w-4 h-4" />
          Notas Débito / Crédito
        </button>

        <button
          onClick={() => setActiveTab('CONFIG')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'CONFIG'
              ? 'border-[#1A73E8] text-[#1A73E8]'
              : 'border-transparent text-[#747780] hover:text-[#1B1D22]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración & BCN
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      {loading && !antiguedadData ? (
        <div className="p-16 text-center text-xs text-[#747780] font-medium">Cargando información de cartera...</div>
      ) : (
        <>
          {activeTab === 'ANTIGUEDAD' && antiguedadData && (
            <AntiguedadTab
              data={antiguedadData}
              moneda={moneda}
              filtros={filtrosAntiguedad}
              onFilterChange={setFiltrosAntiguedad}
              onSelectClienteParaEstadoCuenta={handleSelectClienteEstadoCuenta}
            />
          )}

          {activeTab === 'ESTADO_CUENTA' && (
            <EstadoCuentaTab
              clientes={clientesLista}
              clienteInicialId={selectedClienteParaEstadoCuenta}
              moneda={moneda}
            />
          )}

          {activeTab === 'RECIBOS' && (
            <RecibosCajaTab
              clientes={clientesLista}
              moneda={moneda}
              tipoCambioBcn={tipoCambioBcn}
            />
          )}

          {activeTab === 'ARREGLOS' && (
            <ArreglosPagoTab
              clientes={clientesLista}
              moneda={moneda}
              tipoCambioBcn={tipoCambioBcn}
            />
          )}

          {activeTab === 'NOTAS' && (
            <NotasDebitoCreditoTab
              clientes={clientesLista}
              moneda={moneda}
              tipoCambioBcn={tipoCambioBcn}
            />
          )}

          {activeTab === 'CONFIG' && (
            <ConfiguracionTab
              tipoCambioBcn={tipoCambioBcn}
              onTasaActualizada={() => {
                cargarTipoCambio();
                cargarAntiguedad();
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
