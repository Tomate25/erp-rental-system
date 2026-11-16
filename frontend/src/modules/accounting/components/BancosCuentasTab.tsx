import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Search,
  Building2,
} from 'lucide-react';
import {
  getCuentasBancarias,
  type CuentaBancariaResumen,
  type CuentasBancariasRes,
} from '../services/accounting.api';
import { formatCurrency } from '../../../shared/utils/formatters';

export const BancosCuentasTab: React.FC = () => {
  const [data, setData] = useState<CuentasBancariasRes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCuenta, setSelectedCuenta] = useState<string>('TODAS');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS');
  const [search, setSearch] = useState('');

  const loadBancos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCuentasBancarias();
      setData(res);
    } catch {
      setError('No se pudo cargar el módulo de cuentas bancarias y caja.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBancos();
  }, []);

  const cuentas = useMemo<CuentaBancariaResumen[]>(() => data?.cuentas || [], [data]);
  const resumen = data?.resumen || {
    totalCaja: 0,
    totalBancos: 0,
    saldoTotalDisponible: 0,
    totalIngresos: 0,
    totalEgresos: 0,
    cantidadCuentas: 0,
  };

  const movimientosFiltrados = useMemo(() => {
    const list = data?.movimientos || [];
    const q = search.trim().toLowerCase();
    return list.filter((m) => {
      if (selectedCuenta !== 'TODAS' && m.cuentaCodigo !== selectedCuenta) return false;
      if (tipoFilter !== 'TODOS' && m.tipo !== tipoFilter) return false;
      if (q) {
        return (
          m.cuentaNombre.toLowerCase().includes(q) ||
          m.cuentaCodigo.toLowerCase().includes(q) ||
          m.documento.toLowerCase().includes(q) ||
          m.concepto.toLowerCase().includes(q) ||
          m.origen.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, selectedCuenta, tipoFilter, search]);

  const formatDate = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('es-NI', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-[#1B1D22] flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#1A73E8]" />
            Apartado Bancario y Caja (Disponibilidad por Cuenta)
          </h3>
          <p className="text-xs text-[#747780] font-medium mt-0.5">
            Saldos reales combinando Datos Iniciales, cobros de Facturación, Recibos CxC, pagos de Compras y Asientos Contables.
          </p>
        </div>

        <button
          type="button"
          onClick={loadBancos}
          disabled={isLoading}
          className="btn-precision-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar Saldos</span>
        </button>
      </div>

      {/* KPIs de Tesorería */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1B1D22] text-white p-5 rounded-3xl shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase block">
            Disponibilidad Total (Caja + Bancos)
          </span>
          <span className="text-xl font-black font-mono text-emerald-400 block">
            {formatCurrency(resumen.saldoTotalDisponible)}
          </span>
          <span className="text-[11px] text-zinc-400">
            {resumen.cantidadCuentas} cuentas oficiales BM
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#1A73E8] uppercase flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Total en Bancos (1102)
          </span>
          <span className="text-xl font-black font-mono text-[#1B1D22] block">
            {formatCurrency(resumen.totalBancos)}
          </span>
          <span className="text-[11px] text-[#747780]">LA FISE · BANPRO · Certificados</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-amber-700 uppercase flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> Total en Cajas (1101)
          </span>
          <span className="text-xl font-black font-mono text-[#1B1D22] block">
            {formatCurrency(resumen.totalCaja)}
          </span>
          <span className="text-[11px] text-[#747780]">Caja General y Caja Chica</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
            Flujo de Movimientos
          </span>
          <div className="flex items-center justify-between text-xs font-mono pt-1">
            <span className="text-emerald-700 font-black">
              + {formatCurrency(resumen.totalIngresos)}
            </span>
            <span className="text-rose-700 font-black">
              - {formatCurrency(resumen.totalEgresos)}
            </span>
          </div>
          <span className="text-[11px] text-[#747780] block">Ingresos vs Egresos registrados</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas por Cuenta Bancaria / Caja */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cuentas.map((cta) => {
          const isSelected = selectedCuenta === cta.codigo;
          const esNegativo = cta.saldoActual < 0;
          return (
            <button
              key={cta.codigo}
              type="button"
              onClick={() => setSelectedCuenta(isSelected ? 'TODAS' : cta.codigo)}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#E8F0FE]/60 border-[#1A73E8] ring-2 ring-[#1A73E8]/20 shadow-sm'
                  : 'bg-white border-[#E5E8EE] hover:border-[#1A73E8]/50 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-black text-[#1A73E8]">
                      {cta.codigo}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                        cta.grupo === 'BANCO'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {cta.grupo}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                      {cta.moneda}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-[#1B1D22] mt-1">{cta.nombre}</h4>
                </div>
                <span className="text-[10px] font-mono text-[#747780]">
                  {cta.movimientosCount} mov.
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-[#E5E8EE] flex items-end justify-between">
                <div className="text-[10px] font-mono text-[#747780] space-y-0.5">
                  <div>Inicial: {formatCurrency(cta.saldoInicial)}</div>
                  <div className="flex gap-2">
                    <span className="text-emerald-700">+{formatCurrency(cta.ingresos)}</span>
                    <span className="text-rose-700">-{formatCurrency(cta.egresos)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-[#747780] block">
                    Saldo Actual
                  </span>
                  <span
                    className={`text-sm font-black font-mono ${
                      esNegativo ? 'text-rose-700' : 'text-[#1B1D22]'
                    }`}
                  >
                    {formatCurrency(cta.saldoActual)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Auxiliar de Movimientos Bancarios */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-[#1B1D22]">
              Libro Auxiliar de Movimientos Bancarios y Caja
            </h4>
            <p className="text-[11px] text-[#747780]">
              {selectedCuenta === 'TODAS'
                ? 'Mostrando movimientos de todas las cuentas (haz clic en una tarjeta arriba para filtrar).'
                : `Filtrado por cuenta ${selectedCuenta}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ref, concepto..."
                className="pl-8 pr-3 py-1.5 text-xs border border-[#E5E8EE] rounded-xl bg-[#F8FAFC]"
              />
            </div>

            <select
              value={selectedCuenta}
              onChange={(e) => setSelectedCuenta(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E5E8EE] rounded-xl bg-[#F8FAFC] font-bold"
            >
              <option value="TODAS">Todas las cuentas</option>
              {cuentas.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </select>

            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-[#E5E8EE] rounded-xl bg-[#F8FAFC] font-bold"
            >
              <option value="TODOS">Ingresos y Egresos</option>
              <option value="INGRESO">Solo Ingresos (+)</option>
              <option value="EGRESO">Solo Egresos (-)</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-xs font-bold text-[#747780]">
            Cargando movimientos bancarios...
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-xs font-bold text-[#747780] bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE]">
            No hay movimientos operativos adicionales en el filtro seleccionado (solo saldos iniciales).
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E5E8EE] rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[10px] font-black uppercase text-[#747780]">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cuenta Destino / Origen</th>
                  <th className="p-3">Documento</th>
                  <th className="p-3">Módulo</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {movimientosFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-mono text-[#747780] whitespace-nowrap">
                      {formatDate(m.fecha)}
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-black text-[#1A73E8] mr-1.5">
                        {m.cuentaCodigo}
                      </span>
                      <span className="font-bold text-[#1B1D22]">{m.cuentaNombre}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#1B1D22]">{m.documento}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-700">
                        {m.origen}
                      </span>
                    </td>
                    <td className="p-3 text-[#44474E]">{m.concepto}</td>
                    <td className="p-3 text-right font-mono font-black whitespace-nowrap">
                      {m.tipo === 'INGRESO' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> +{formatCurrency(m.monto)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700">
                          <ArrowUpRight className="w-3.5 h-3.5" /> -{formatCurrency(m.monto)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
