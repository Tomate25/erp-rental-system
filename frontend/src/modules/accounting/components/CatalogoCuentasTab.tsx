import React, { useState, useEffect, useMemo } from 'react';
import { getCatalogoCuentas, type CuentaCatalogo } from '../services/accounting.api';
import { Search, Check, AlertCircle } from 'lucide-react';

import defaultCatalogo from '../data/catalogo-cuentas-bm.json';

export function traducirTipoQB(tipo?: string): string {
  if (!tipo) return '—';
  const clean = tipo.trim();
  switch (clean) {
    case 'Bank':
      return 'Banco / Caja';
    case 'Other Current Asset':
      return 'Otro Activo Corriente';
    case 'Accounts Receivable':
    case 'Accounts Receivable (ver nota)':
      return 'Cuentas por Cobrar';
    case 'Fixed Asset':
      return 'Activo Fijo';
    case 'Other Asset':
      return 'Otro Activo';
    case 'Accounts Payable':
      return 'Cuentas por Pagar';
    case 'Other Current Liability':
      return 'Otro Pasivo Corriente';
    case 'Long Term Liability':
      return 'Pasivo No Corriente (Largo Plazo)';
    case 'Equity':
      return 'Patrimonio / Capital';
    case 'Income':
      return 'Ingresos Operativos';
    case 'Other Income':
      return 'Otros Ingresos';
    case 'Cost of Goods Sold':
      return 'Costo de Ventas';
    case 'Expense':
      return 'Gastos Operativos';
    case 'Other Expense':
      return 'Otros Gastos';
    default:
      return clean;
  }
}

export const CatalogoCuentasTab: React.FC = () => {
  const [cuentas, setCuentas] = useState<CuentaCatalogo[]>(defaultCatalogo as unknown as CuentaCatalogo[]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtroNivel, setFiltroNivel] = useState<number | 0>(0);
  const [filtroNaturaleza, setFiltroNaturaleza] = useState<'TODAS' | 'Deudora' | 'Acreedora'>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  const loadCatalogo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCatalogoCuentas();
      if (res && res.cuentas && res.cuentas.length > 0) {
        setCuentas(res.cuentas);
      } else if (cuentas.length === 0) {
        setCuentas(defaultCatalogo as unknown as CuentaCatalogo[]);
      }
    } catch (err: any) {
      console.warn('Fallo consulta /accounting/catalogo, usando catálogo local sincronizado:', err);
      if (cuentas.length === 0) {
        setCuentas(defaultCatalogo as unknown as CuentaCatalogo[]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogo();
  }, []);

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c) => {
      if (filtroNivel !== 0 && c.nivel !== filtroNivel) return false;
      if (filtroNaturaleza !== 'TODAS' && c.naturaleza !== filtroNaturaleza) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesCodigo = c.codigo.toLowerCase().includes(q);
        const matchesNombre = c.nombre.toLowerCase().includes(q);
        const matchesTipo = c.tipo.toLowerCase().includes(q);
        const qbTraducido = traducirTipoQB(c.qbTipo).toLowerCase();
        const matchesQb =
          c.qbNombre?.toLowerCase().includes(q) ||
          c.qbTipo?.toLowerCase().includes(q) ||
          qbTraducido.includes(q);
        if (!matchesCodigo && !matchesNombre && !matchesTipo && !matchesQb) return false;
      }
      return true;
    });
  }, [cuentas, filtroNivel, filtroNaturaleza, searchTerm]);

  const stats = useMemo(() => {
    const total = cuentas.length;
    const nivel1 = cuentas.filter((c) => c.nivel === 1).length;
    const nivel2 = cuentas.filter((c) => c.nivel === 2).length;
    const nivel3 = cuentas.filter((c) => c.nivel === 3).length;
    const nivel4 = cuentas.filter((c) => c.nivel === 4).length;
    const control = cuentas.filter((c) => c.esControl).length;
    return { total, nivel1, nivel2, nivel3, nivel4, control };
  }, [cuentas]);

  return (
    <div className="space-y-6">

      {/* Resumen de Métricas del Catálogo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Total Cuentas</span>
          <span className="text-lg font-black font-mono text-[#1B1D22]">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs">
          <span className="text-[10px] font-extrabold text-blue-600 uppercase block">Nivel 1 (Tipo)</span>
          <span className="text-lg font-black font-mono text-blue-700">{stats.nivel1}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs">
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase block">Nivel 2 (Rubro)</span>
          <span className="text-lg font-black font-mono text-indigo-700">{stats.nivel2}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs">
          <span className="text-[10px] font-extrabold text-purple-600 uppercase block">Nivel 3 (Mayor)</span>
          <span className="text-lg font-black font-mono text-purple-700">{stats.nivel3}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">Nivel 4 (Subcuenta)</span>
          <span className="text-lg font-black font-mono text-emerald-700">{stats.nivel4}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs">
          <span className="text-[10px] font-extrabold text-amber-600 uppercase block">Cuentas Control</span>
          <span className="text-lg font-black font-mono text-amber-700">{stats.control}</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#747780] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código (ej. 1.1.01), nombre o tipo..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E5E8EE] focus:outline-hidden focus:border-[#1A73E8] bg-[#F8FAFC]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Nivel */}
          <div className="flex items-center gap-1 bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-[11px] font-bold">
            <span className="text-[#747780] px-2 text-[10px] uppercase">Nivel:</span>
            {[
              { label: 'Todos', val: 0 },
              { label: 'N1', val: 1 },
              { label: 'N2', val: 2 },
              { label: 'N3', val: 3 },
              { label: 'N4', val: 4 },
            ].map((n) => (
              <button
                key={n.val}
                onClick={() => setFiltroNivel(n.val)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  filtroNivel === n.val
                    ? 'bg-white text-[#1A73E8] shadow-xs font-black'
                    : 'text-[#747780] hover:text-[#1B1D22]'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          {/* Filtro Naturaleza */}
          <div className="flex items-center gap-1 bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-[11px] font-bold">
            <span className="text-[#747780] px-2 text-[10px] uppercase">Naturaleza:</span>
            {(['TODAS', 'Deudora', 'Acreedora'] as const).map((nat) => (
              <button
                key={nat}
                onClick={() => setFiltroNaturaleza(nat)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  filtroNaturaleza === nat
                    ? 'bg-white text-[#1A73E8] shadow-xs font-black'
                    : 'text-[#747780] hover:text-[#1B1D22]'
                }`}
              >
                {nat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla del Catálogo */}
      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#747780]">Cargando catálogo oficial de cuentas...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E8EE] flex items-center justify-between text-xs font-bold text-[#747780]">
            <span>Mostrando {cuentasFiltradas.length} de {cuentas.length} cuentas</span>
            {filtroNivel !== 0 || filtroNaturaleza !== 'TODAS' || searchTerm ? (
              <button
                onClick={() => {
                  setFiltroNivel(0);
                  setFiltroNaturaleza('TODAS');
                  setSearchTerm('');
                }}
                className="text-[#1A73E8] hover:underline"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[9px] font-black uppercase text-[#747780] tracking-wider">
                  <th className="p-3 w-36">Código</th>
                  <th className="p-3">Nombre de la Cuenta</th>
                  <th className="p-3 text-center w-20">Nivel</th>
                  <th className="p-3 w-28">Tipo</th>
                  <th className="p-3 text-center w-28">Naturaleza</th>
                  <th className="p-3 text-center w-24">Acepta Mov.</th>
                  <th className="p-3 w-52">Tipo QuickBooks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {cuentasFiltradas.map((c) => {
                  const isN1 = c.nivel === 1;
                  const isN2 = c.nivel === 2;
                  const isN3 = c.nivel === 3;
                  const isN4 = c.nivel === 4;

                  return (
                    <tr
                      key={c.codigo}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isN1
                          ? 'bg-[#F4F6F9]/80 font-black text-[#1B1D22]'
                          : isN2
                          ? 'bg-[#FAFBFD] font-bold text-[#1B1D22]'
                          : isN3
                          ? 'font-medium text-[#1B1D22]'
                          : 'text-[#44474E]'
                      }`}
                    >
                      {/* Código */}
                      <td className="p-3 font-mono font-bold text-xs whitespace-nowrap">
                        <span
                          className={`${
                            isN1
                              ? 'text-blue-900 font-black'
                              : isN2
                              ? 'text-indigo-800 font-bold'
                              : isN3
                              ? 'text-purple-800'
                              : 'text-gray-700'
                          }`}
                        >
                          {c.codigo}
                        </span>
                      </td>

                      {/* Nombre con sangría jerárquica */}
                      <td className="p-3">
                        <div
                          className="flex items-center gap-1.5"
                          style={{
                            paddingLeft: `${(c.nivel - 1) * 16}px`,
                          }}
                        >
                          {isN4 && <span className="text-[#A0A4AB] text-[10px]">↳</span>}
                          <span className={isN1 ? 'text-xs uppercase tracking-wide' : 'text-xs'}>
                            {c.nombre}
                          </span>
                          {c.esControl && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider border border-amber-300">
                              Control
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nivel Badge */}
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isN1
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : isN2
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : isN3
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          N{c.nivel}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="p-3 text-[11px] font-medium text-[#747780]">
                        {c.tipo}
                      </td>

                      {/* Naturaleza */}
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            c.naturaleza === 'Deudora'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {c.naturaleza}
                        </span>
                      </td>

                      {/* Acepta Movimiento */}
                      <td className="p-3 text-center">
                        {c.aceptaMovimiento ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="text-[#A0A4AB] font-mono text-[10px]">—</span>
                        )}
                      </td>

                      {/* Tipo QuickBooks en Español */}
                      <td className="p-3 text-[11px] font-medium">
                        {c.qbTipo ? (
                          <span className="font-bold text-[#1B1D22]">
                            {traducirTipoQB(c.qbTipo)}
                          </span>
                        ) : (
                          <span className="text-[#A0A4AB] font-mono text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
