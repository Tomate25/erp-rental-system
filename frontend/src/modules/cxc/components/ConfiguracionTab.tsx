import React, { useState, useEffect } from 'react';
import { cxcApi } from '../services/cxc.api';
import type { CxcConfig } from '../types/cxc.types';
import { Save, Check, DollarSign, AlertCircle } from 'lucide-react';

interface ConfiguracionTabProps {
  tipoCambioBcn: number;
  onTasaActualizada: () => void;
}

export const ConfiguracionTab: React.FC<ConfiguracionTabProps> = ({
  tipoCambioBcn,
  onTasaActualizada,
}) => {
  const [config, setConfig] = useState<CxcConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Formulario de Tipo de Cambio BCN
  const [fechaTc, setFechaTc] = useState(new Date().toISOString().slice(0, 10));
  const [nuevaTasa, setNuevaTasa] = useState(tipoCambioBcn.toString());
  const [fuenteTc, setFuenteTc] = useState('BCN');
  const [guardandoTc, setGuardandoTc] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setLoading(true);
    try {
      const data = await cxcApi.getConfiguracion();
      setConfig(data);
    } catch (e) {
      console.error('Error cargando configuración:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setGuardando(true);
    setMensaje(null);
    try {
      await cxcApi.updateConfiguracion(config);
      setMensaje({ tipo: 'ok', texto: 'Configuración de CxC actualizada correctamente.' });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err?.response?.data?.message || 'Error al guardar configuración.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarTc = async (e: React.FormEvent) => {
    e.preventDefault();
    const tasaNum = parseFloat(nuevaTasa);
    if (!tasaNum || tasaNum <= 0) {
      alert('Ingrese una tasa válida.');
      return;
    }
    setGuardandoTc(true);
    try {
      await cxcApi.setTipoCambio(fechaTc, tasaNum, fuenteTc);
      alert('Tasa oficial de cambio BCN registrada con éxito.');
      onTasaActualizada();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error registrando tasa BCN.');
    } finally {
      setGuardandoTc(false);
    }
  };

  if (loading || !config) {
    return <div className="p-8 text-center text-xs text-gray-500">Cargando configuración del módulo CxC...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alerta de confirmación */}
      {mensaje && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {mensaje.tipo === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* SECCIÓN 1: Tasa de Cambio BCN Oficial */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <DollarSign className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Administración de Tipo de Cambio Oficial BCN (Banco Central de Nicaragua)
          </h3>
        </div>
        <p className="text-xs text-gray-500">
          Define la paridad cambiaría diaria para la conversión automática en 1 clic entre Córdobas (C$) y Dólares ($).
        </p>

        <form onSubmit={handleGuardarTc} className="flex flex-wrap items-end gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
            <input
              type="date"
              value={fechaTc}
              onChange={(e) => setFechaTc(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Tasa Oficial (C$ por 1 USD)
            </label>
            <input
              type="number"
              step="0.0001"
              value={nuevaTasa}
              onChange={(e) => setNuevaTasa(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg w-36"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Fuente</label>
            <input
              type="text"
              value={fuenteTc}
              onChange={(e) => setFuenteTc(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg w-32"
            />
          </div>

          <button
            type="submit"
            disabled={guardandoTc}
            className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-sm"
          >
            {guardandoTc ? 'Guardando...' : 'Actualizar Tasa BCN'}
          </button>
        </form>
      </div>

      {/* SECCIÓN 2: Parámetros y Reglas de Negocio CxC (Marcas ❓) */}
      <form onSubmit={handleGuardarConfig} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Reglas de Negocio y Políticas Configurables (❓ BM Construcciones)
            </h3>
            <p className="text-xs text-gray-500">Parámetros dinámicos sin valores fijos en el código fuente</p>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando cambios...' : 'Guardar Parámetros'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Comisión sobre pagado */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.comisionesSoloFacturasPagadas}
                onChange={(e) => setConfig({ ...config, comisionesSoloFacturasPagadas: e.target.checked })}
                className="mt-0.5 rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  ❓ Liquidar comisiones solo sobre facturas efectivamente cobradas
                </span>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Si está activo, los asesores devengan comisiones cuando el cliente liquida su crédito mediante Recibo de Caja.
                </p>
              </div>
            </label>
          </div>

          {/* IVA sobre intereses */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.aplicaIvaIntereses}
                onChange={(e) => setConfig({ ...config, aplicaIvaIntereses: e.target.checked })}
                className="mt-0.5 rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  ❓ Aplicar IVA (15%) sobre intereses en arreglos de pago
                </span>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Grava con el 15% de IVA los intereses moratorios generados en los acuerdos.
                </p>
              </div>
            </label>
          </div>

          {/* IVA sobre gastos admin */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.aplicaIvaGastosAdmin}
                onChange={(e) => setConfig({ ...config, aplicaIvaGastosAdmin: e.target.checked })}
                className="mt-0.5 rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  ❓ Aplicar IVA (15%) sobre gastos administrativos
                </span>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Grava con IVA los honorarios de cobranza y gestión administrativa.
                </p>
              </div>
            </label>
          </div>

          {/* Retención IMI */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.aplicaRetencionImi}
                onChange={(e) => setConfig({ ...config, aplicaRetencionImi: e.target.checked })}
                className="mt-0.5 rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  ❓ Aplicar Retención Municipal IMI 1% (Alcaldías)
                </span>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Permite imputar la retención del 1% municipal al emitir Recibos de Caja de agentes autorizados.
                </p>
              </div>
            </label>
          </div>

          {/* Días de Gracia */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1">
            <label className="block font-bold text-gray-900 dark:text-gray-100">
              Días de gracia antes de alerta de mora
            </label>
            <input
              type="number"
              min="0"
              value={config.diasGraciaAlertaMora}
              onChange={(e) => setConfig({ ...config, diasGraciaAlertaMora: parseInt(e.target.value) || 0 })}
              className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg w-28 font-bold"
            />
          </div>

          {/* Rol de Aprobación de Arreglos */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1">
            <label className="block font-bold text-gray-900 dark:text-gray-100">
              Rol mínimo para autorizar Acuerdos de Pago
            </label>
            <select
              value={config.rolAprobacionArreglo}
              onChange={(e) => setConfig({ ...config, rolAprobacionArreglo: e.target.value })}
              className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium"
            >
              <option value="GERENTE">Gerencia General (GERENTE)</option>
              <option value="ADMIN">Administrador de Sistema (ADMIN)</option>
              <option value="CONTABILIDAD">Contabilidad Principal</option>
            </select>
          </div>
        </div>

        {/* Cuentas de Mayor Protegidas */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
            Cuentas Contables de Mayor (Catálogo BM)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-gray-500">Cuenta Control Cartera</label>
              <input
                type="text"
                disabled
                value={config.cuentaMayorClientes || '1.1.05.001'}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono text-gray-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500">Anticipos de Clientes</label>
              <input
                type="text"
                disabled
                value={config.cuentaAnticiposClientes || '2.1.06.001'}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono text-gray-500"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
