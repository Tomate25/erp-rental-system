import React, { useState, useEffect, useMemo } from 'react';
import { getLibroDiario, type PolizaDiario } from '../services/accounting.api';
import { BookOpen, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

export const LibroDiarioTab: React.FC = () => {
  const [polizas, setPolizas] = useState<PolizaDiario[]>([]);
  const [totalPolizas, setTotalPolizas] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState<string>('TODAS');
  const [limite, setLimite] = useState<number>(50);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadDiario = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getLibroDiario(limite);
      if (res) {
        setPolizas(res.polizas || []);
        setTotalPolizas(res.totalPolizas || 0);
        // Expandir por defecto la primera si existe
        if (res.polizas && res.polizas.length > 0 && !expandedId) {
          setExpandedId(res.polizas[0].id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al consultar el libro diario de pólizas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiario();
  }, [limite]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatCurrency = (amount: number) => {
    const val = isNaN(Number(amount)) ? 0 : Number(amount);
    return `C$ ${val.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const polizasFiltradas = useMemo(() => {
    if (filtroTipo === 'TODAS') return polizas;
    return polizas.filter((p) => p.tipoPoliza === filtroTipo);
  }, [polizas, filtroTipo]);

  const stats = useMemo(() => {
    const totalDebe = polizas.reduce((s, p) => s + p.totalDebe, 0);
    const totalHaber = polizas.reduce((s, p) => s + p.totalHaber, 0);
    const cuadradas = polizas.filter((p) => p.cuadrado).length;
    return { totalDebe, totalHaber, cuadradas };
  }, [polizas]);

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-[#1B1D22] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1A73E8]" />
            Libro Diario General (Pólizas Automáticas)
          </h3>
          <p className="text-xs text-[#747780] font-medium mt-0.5">
            Registro cronológico inalterable generado automáticamente por facturas, recibos de caja y mantenimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="bg-[#F8FAFC] border border-[#E5E8EE] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1B1D22]"
          >
            <option value={25}>Últimas 25 pólizas</option>
            <option value={50}>Últimas 50 pólizas</option>
            <option value={100}>Últimas 100 pólizas</option>
            <option value={200}>Últimas 200 pólizas</option>
          </select>

          <button
            onClick={loadDiario}
            disabled={isLoading}
            className="btn-precision-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Total Pólizas Registradas</span>
          <span className="text-lg font-black font-mono text-[#1B1D22]">{totalPolizas}</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Volumen Contable Procesado</span>
          <span className="text-lg font-black font-mono text-[#1A73E8]">
            {formatCurrency(stats.totalDebe)}
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-emerald-300 bg-emerald-50/70 shadow-xs flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 block">Pólizas Cuadradas</span>
            <span className="text-xs font-black text-emerald-900">
              {stats.cuadradas} de {polizas.length} (100% Partida Doble)
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-2xl border border-[#E5E8EE] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] text-[11px] font-bold">
          <span className="text-[#747780] px-2 text-[10px] uppercase">Tipo de Póliza:</span>
          {[
            { label: 'Todas', val: 'TODAS' },
            { label: 'Ventas (Facturas)', val: 'VENTAS' },
            { label: 'Ingresos (Cobros)', val: 'INGRESOS' },
            { label: 'Egresos (Gastos)', val: 'EGRESOS' },
            { label: 'Diario General', val: 'DIARIO' },
          ].map((t) => (
            <button
              key={t.val}
              onClick={() => setFiltroTipo(t.val)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filtroTipo === t.val
                  ? 'bg-white text-[#1A73E8] shadow-xs font-black'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-[#747780]">
          Mostrando {polizasFiltradas.length} pólizas
        </span>
      </div>

      {/* Listado de Pólizas */}
      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-16 text-center">
          <div className="w-8 h-8 border-3 border-[#1A73E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#747780]">Cargando pólizas del libro diario...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : polizasFiltradas.length === 0 ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center text-xs font-bold text-[#747780]">
          No se encontraron pólizas registradas para este filtro.
        </div>
      ) : (
        <div className="space-y-4">
          {polizasFiltradas.map((p) => {
            const isExpanded = expandedId === p.id;

            return (
              <div
                key={p.id}
                className="bg-white border border-[#E5E8EE] rounded-2xl overflow-hidden shadow-xs transition-all hover:border-[#1A73E8]/40"
              >
                {/* Header de la Póliza */}
                <div
                  onClick={() => toggleExpand(p.id)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFD] hover:bg-gray-50/80 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button className="p-1 rounded-lg text-[#747780] hover:bg-white shrink-0 mt-0.5 sm:mt-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#1A73E8]" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-[#1B1D22]">
                          {p.numeroPoliza}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            p.tipoPoliza === 'VENTAS'
                              ? 'bg-blue-100 text-blue-800'
                              : p.tipoPoliza === 'INGRESOS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {p.tipoPoliza}
                        </span>
                        <span className="text-[10px] text-[#747780] font-mono">
                          Ref: {p.referenciaDoc}
                        </span>
                      </div>
                      <p className="text-xs text-[#44474E] mt-0.5 font-medium">{p.concepto}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-7 sm:pl-0">
                    <div className="text-right">
                      <span className="text-[9px] text-[#747780] uppercase block">Fecha</span>
                      <span className="font-bold text-[#1B1D22]">{formatDate(p.fecha)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-[#747780] uppercase block">Importe Póliza</span>
                      <span className="font-black text-[#1A73E8]">{formatCurrency(p.totalDebe)}</span>
                    </div>

                    {p.cuadrado && (
                      <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cuadrada
                      </span>
                    )}
                  </div>
                </div>

                {/* Líneas de Partida Doble (Expandible) */}
                {isExpanded && (
                  <div className="border-t border-[#E5E8EE] p-4 bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[9px] font-black uppercase text-[#747780]">
                            <th className="p-2 w-28">Cuenta</th>
                            <th className="p-2">Descripción de Cuenta</th>
                            <th className="p-2">Concepto / Referencia Analítica</th>
                            <th className="p-2 text-right w-32">Debe</th>
                            <th className="p-2 text-right w-32">Haber</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E8EE]">
                          {p.lineas.map((l, lIdx) => (
                            <tr key={lIdx} className="hover:bg-gray-50/50">
                              <td className="p-2 font-mono font-bold text-gray-900">{l.cuentaCodigo}</td>
                              <td className="p-2 font-medium text-gray-800">{l.cuentaNombre}</td>
                              <td className="p-2 text-[#747780] text-[11px]">{l.concepto || '—'}</td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                {l.debe > 0 ? formatCurrency(l.debe) : '—'}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-blue-800">
                                {l.haber > 0 ? formatCurrency(l.haber) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#FAFBFD] font-mono font-black border-t-2 border-[#E5E8EE] text-xs">
                            <td colSpan={3} className="p-2 text-right uppercase text-[#747780]">
                              Sumas Iguales:
                            </td>
                            <td className="p-2 text-right text-emerald-700">
                              {formatCurrency(p.totalDebe)}
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatCurrency(p.totalHaber)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
