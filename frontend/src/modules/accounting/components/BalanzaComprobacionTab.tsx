import React, { useState, useEffect, useMemo } from 'react';
import { getBalanzaComprobacion, type BalanzaComprobacionRes } from '../services/accounting.api';
import { CheckCircle2, AlertCircle, RefreshCw, Scale, Building2 } from 'lucide-react';

import defaultCatalogo from '../data/catalogo-cuentas-bm.json';

export const BalanzaComprobacionTab: React.FC = () => {
  const [data, setData] = useState<BalanzaComprobacionRes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sucursalFiltro, setSucursalFiltro] = useState<string>('');
  const [soloConMovimientos, setSoloConMovimientos] = useState<boolean>(true);
  const [filtroNivel, setFiltroNivel] = useState<number | 0>(0);

  const loadBalanza = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getBalanzaComprobacion(sucursalFiltro || undefined);
      setData(res);
    } catch (err: any) {
      console.warn('Fallo consulta /accounting/balanza-comprobacion, usando balanza base de catálogo:', err);
      if (!data) {
        setData({
          fechaCorte: new Date().toISOString(),
          totalDebe: 0,
          totalHaber: 0,
          cuadrada: true,
          cuentas: (defaultCatalogo as any[]).map((c) => ({
            codigo: c.codigo,
            nombre: c.nombre,
            nivel: c.nivel,
            tipo: c.tipo,
            naturaleza: c.naturaleza,
            saldoInicialDebe: 0,
            saldoInicialHaber: 0,
            movimientoDebe: 0,
            movimientoHaber: 0,
            saldoFinalDeudor: 0,
            saldoFinalAcreedor: 0,
            aceptaMovimiento: c.aceptaMovimiento,
            esControl: c.esControl,
          })),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBalanza();
  }, [sucursalFiltro]);

  const formatCurrency = (amount: number) => {
    const val = isNaN(Number(amount)) ? 0 : Number(amount);
    return `C$ ${val.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const cuentasFiltradas = useMemo(() => {
    if (!data?.cuentas) return [];
    return data.cuentas.filter((c) => {
      if (filtroNivel !== 0 && c.nivel !== filtroNivel) return false;
      if (soloConMovimientos) {
        const tieneMov = (c.movimientoDebe || 0) > 0 || (c.movimientoHaber || 0) > 0;
        if (!tieneMov) return false;
      }
      return true;
    });
  }, [data, soloConMovimientos, filtroNivel]);

  const totalMovDebe = useMemo(() => {
    return cuentasFiltradas.reduce((s, c) => s + (c.movimientoDebe || 0), 0);
  }, [cuentasFiltradas]);

  const totalMovHaber = useMemo(() => {
    return cuentasFiltradas.reduce((s, c) => s + (c.movimientoHaber || 0), 0);
  }, [cuentasFiltradas]);

  const totalSaldoDeudor = useMemo(() => {
    return cuentasFiltradas.reduce((s, c) => s + (c.saldoFinalDeudor || 0), 0);
  }, [cuentasFiltradas]);

  const totalSaldoAcreedor = useMemo(() => {
    return cuentasFiltradas.reduce((s, c) => s + (c.saldoFinalAcreedor || 0), 0);
  }, [cuentasFiltradas]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Control de Filtros */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-[#1B1D22] flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#1A73E8]" />
            Balanza de Comprobación Dinámica
          </h3>
          <p className="text-xs text-[#747780] font-medium mt-0.5">
            Verificación de saldos y movimientos acumulados. Fecha de corte:{' '}
            <span className="font-mono text-[#1B1D22]">
              {data?.fechaCorte ? new Date(data.fechaCorte).toLocaleDateString('es-NI', { dateStyle: 'long' }) : 'Actual'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Sucursal */}
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E5E8EE] px-3 py-1.5 rounded-xl text-xs">
            <Building2 className="w-4 h-4 text-[#747780]" />
            <select
              value={sucursalFiltro}
              onChange={(e) => setSucursalFiltro(e.target.value)}
              className="bg-transparent font-bold text-[#1B1D22] focus:outline-hidden text-xs"
            >
              <option value="">Todas las sucursales (Consolidado)</option>
              <option value="KM10">Sucursal Km 10.5</option>
              <option value="CENTROAMERICA">Sucursal Centroamérica</option>
            </select>
          </div>

          <button
            onClick={loadBalanza}
            disabled={isLoading}
            className="btn-precision-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recalcular</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Equilibrio Contable */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Total Movimiento Debe</span>
          <span className="text-lg font-black font-mono text-[#1B1D22]">
            {formatCurrency(data?.totalDebe || 0)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Total Movimiento Haber</span>
          <span className="text-lg font-black font-mono text-[#1B1D22]">
            {formatCurrency(data?.totalHaber || 0)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Diferencia de Cuadre</span>
          <span className="text-lg font-black font-mono text-emerald-700">
            {formatCurrency(Math.abs((data?.totalDebe || 0) - (data?.totalHaber || 0)))}
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-emerald-300 bg-emerald-50/70 shadow-xs flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 block">Estatus de Balanza</span>
            <span className="text-xs font-black text-emerald-900">
              {data?.cuadrada ? 'Balanza 100% Cuadrada' : 'Desbalance en Proceso'}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros de Visualización */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-[#1B1D22] cursor-pointer">
            <input
              type="checkbox"
              checked={soloConMovimientos}
              onChange={(e) => setSoloConMovimientos(e.target.checked)}
              className="rounded-sm border-[#E5E8EE] text-[#1A73E8] focus:ring-[#1A73E8]"
            />
            <span>Mostrar únicamente cuentas con movimientos o saldo</span>
          </label>
        </div>

        <div className="flex items-center gap-1 bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-[11px] font-bold">
          <span className="text-[#747780] px-2 text-[10px] uppercase">Nivel:</span>
          {[
            { label: 'Todos', val: 0 },
            { label: 'N3 (Mayor)', val: 3 },
            { label: 'N4 (Subcuenta)', val: 4 },
          ].map((n) => (
            <button
              key={n.val}
              onClick={() => setFiltroNivel(n.val)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filtroNivel === n.val
                  ? 'bg-white text-[#1A73E8] shadow-xs font-black'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Balanza */}
      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-16 text-center">
          <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#747780]">Calculando saldos y comprobando ecuación contable...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[9px] font-black uppercase text-[#747780] tracking-wider">
                  <th className="p-3 w-32">Código</th>
                  <th className="p-3">Nombre de la Cuenta</th>
                  <th className="p-3 text-center w-20">Nivel</th>
                  <th className="p-3 text-center w-24">Naturaleza</th>
                  <th className="p-3 text-right w-36">Mov. Debe</th>
                  <th className="p-3 text-right w-36">Mov. Haber</th>
                  <th className="p-3 text-right w-36">Saldo Deudor</th>
                  <th className="p-3 text-right w-36">Saldo Acreedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {cuentasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs font-bold text-[#747780]">
                      No hay movimientos registrados para los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  cuentasFiltradas.map((c) => {
                    const isN1 = c.nivel === 1;
                    const isN2 = c.nivel === 2;
                    const isN3 = c.nivel === 3;
                    const isN4 = c.nivel === 4;

                    return (
                      <tr
                        key={c.codigo}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          isN1 ? 'bg-gray-100/80 font-black' : isN2 ? 'bg-gray-50/70 font-bold' : isN3 ? 'font-semibold' : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-xs">{c.codigo}</td>
                        <td className="p-3">
                          <div
                            className="flex items-center gap-1.5"
                            style={{ paddingLeft: `${(c.nivel - 1) * 12}px` }}
                          >
                            {isN4 && <span className="text-[#A0A4AB] text-[10px]">↳</span>}
                            <span>{c.nombre}</span>
                            {c.esControl && (
                              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider border border-amber-300">
                                Control
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-gray-100 text-gray-700">
                            N{c.nivel}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                              c.naturaleza === 'Deudora'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {c.naturaleza}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800">
                          {c.movimientoDebe > 0 ? formatCurrency(c.movimientoDebe) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800">
                          {c.movimientoHaber > 0 ? formatCurrency(c.movimientoHaber) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-800">
                          {c.saldoFinalDeudor > 0 ? formatCurrency(c.saldoFinalDeudor) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-blue-800">
                          {c.saldoFinalAcreedor > 0 ? formatCurrency(c.saldoFinalAcreedor) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {cuentasFiltradas.length > 0 && (
                <tfoot>
                  <tr className="bg-[#1B1D22] text-white font-mono font-black border-t-2 border-[#1B1D22]">
                    <td colSpan={4} className="p-3.5 text-right uppercase tracking-wider text-xs">
                      Sumas Iguales de Comprobación:
                    </td>
                    <td className="p-3.5 text-right text-xs text-emerald-400">
                      {formatCurrency(totalMovDebe)}
                    </td>
                    <td className="p-3.5 text-right text-xs text-blue-300">
                      {formatCurrency(totalMovHaber)}
                    </td>
                    <td className="p-3.5 text-right text-xs text-emerald-400">
                      {formatCurrency(totalSaldoDeudor)}
                    </td>
                    <td className="p-3.5 text-right text-xs text-blue-300">
                      {formatCurrency(totalSaldoAcreedor)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
