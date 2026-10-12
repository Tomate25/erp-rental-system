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
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Cuentas por Cobrar (CxC)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
              Cartera Independiente BM
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Control integral de cartera de crédito, antigüedad de saldos, estado de cuenta, recibos de caja con retenciones y acuerdos de pago.
          </p>
        </div>

        <button
          onClick={() => {
            cargarTipoCambio();
            cargarAntiguedad();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
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
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ANTIGUEDAD')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ANTIGUEDAD'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Antigüedad de Saldos
        </button>

        <button
          onClick={() => setActiveTab('ESTADO_CUENTA')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ESTADO_CUENTA'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Estado de Cuenta
        </button>

        <button
          onClick={() => setActiveTab('RECIBOS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'RECIBOS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Recibos de Caja (RC)
        </button>

        <button
          onClick={() => setActiveTab('ARREGLOS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ARREGLOS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          Arreglos de Pago (ARR)
        </button>

        <button
          onClick={() => setActiveTab('NOTAS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'NOTAS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FileDiff className="w-4 h-4" />
          Notas Débito / Crédito
        </button>

        <button
          onClick={() => setActiveTab('CONFIG')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'CONFIG'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración & BCN
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      {loading && !antiguedadData ? (
        <div className="p-16 text-center text-xs text-gray-500">Cargando información de cartera...</div>
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
