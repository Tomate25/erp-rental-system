import React, { useState, useMemo } from 'react';
import type { AntiguedadResponse, MonedaTipo, DocumentoCarteraItem } from '../types/cxc.types';
import { Search, Download, Printer, ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface AntiguedadTabProps {
  data: AntiguedadResponse;
  moneda: MonedaTipo;
  onFilterChange: (filters: any) => void;
  filtros: {
    sucursalId?: string;
    vendedorId?: string;
    tipoCliente?: string;
    fechaCorte?: string;
    criterioFecha?: 'VENCIMIENTO' | 'EMISION';
    clienteId?: string;
  };
  onSelectClienteParaEstadoCuenta?: (clienteId: string) => void;
}

export const AntiguedadTab: React.FC<AntiguedadTabProps> = ({
  data,
  moneda,
  onFilterChange,
  filtros,
  onSelectClienteParaEstadoCuenta,
}) => {
  const [subVista, setSubVista] = useState<'CARTERA' | 'POR_CLIENTE' | 'FACTURAS'>('POR_CLIENTE');
  const [busqueda, setBusqueda] = useState('');
  const [clienteExpandidoId, setClienteExpandidoId] = useState<string | null>(null);

  const formatMonto = (valor: number) => {
    const symbol = moneda === 'USD' ? '$' : 'C$';
    return `${symbol} ${valor.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Clientes filtrados por búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return data.clientes;
    const q = busqueda.toLowerCase();
    return data.clientes.filter(
      (c) =>
        c.clienteNombre.toLowerCase().includes(q) ||
        c.clienteRuc.toLowerCase().includes(q) ||
        (c.vendedorNombre && c.vendedorNombre.toLowerCase().includes(q))
    );
  }, [data.clientes, busqueda]);

  // Lista plana de todos los documentos filtrados
  const todosDocumentos = useMemo(() => {
    const docs: DocumentoCarteraItem[] = [];
    clientesFiltrados.forEach((c) => {
      docs.push(...c.documentos);
    });
    return docs;
  }, [clientesFiltrados]);

  // Exportar a CSV
  const exportarCsv = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (subVista === 'POR_CLIENTE') {
      headers = ['Cliente', 'RUC / Cédula', 'Tipo', 'Vendedor', 'Total Docs', ...data.tramosDefinidos.map((t) => t.nombre), `Saldo Total (${moneda})`];
      rows = clientesFiltrados.map((c) => [
        `"${c.clienteNombre}"`,
        `"${c.clienteRuc}"`,
        c.tipoCliente || 'N/A',
        c.vendedorNombre || 'Sin Asignar',
        String(c.totalDocumentos),
        ...data.tramosDefinidos.map((t) => (c.tramos[t.id] || 0).toFixed(2)),
        c.saldoTotalVisualizado.toFixed(2),
      ]);
    } else {
      headers = ['Documento', 'Tipo', 'Cliente', 'RUC', 'Fecha Emisión', 'Fecha Vence', 'Días Mora', 'Tramo', `Saldo (${moneda})`];
      rows = todosDocumentos.map((d) => [
        d.folio,
        d.tipoDocumento,
        `"${d.clienteNombre}"`,
        `"${d.clienteRuc}"`,
        new Date(d.fechaEmision).toLocaleDateString(),
        new Date(d.fechaVence).toLocaleDateString(),
        String(d.diasMora),
        d.tramoNombre,
        d.saldoPendienteVisualizado.toFixed(2),
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `antiguedad_cartera_${moneda}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Barra de Filtros y Sub-vistas */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Subvistas Tabs */}
          <div className="flex items-center p-1 bg-[#F4F6F9] rounded-xl border border-[#E5E8EE]">
            <button
              onClick={() => setSubVista('CARTERA')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                subVista === 'CARTERA'
                  ? 'bg-white text-[#1A73E8] shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Cartera Consolidada
            </button>
            <button
              onClick={() => setSubVista('POR_CLIENTE')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                subVista === 'POR_CLIENTE'
                  ? 'bg-white text-[#1A73E8] shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Por Cliente ({clientesFiltrados.length})
            </button>
            <button
              onClick={() => setSubVista('FACTURAS')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                subVista === 'FACTURAS'
                  ? 'bg-white text-[#1A73E8] shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Detalle Facturas ({todosDocumentos.length})
            </button>
          </div>

          {/* Acciones: Exportar / Imprimir */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportarCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#F4F6F9] text-[#1B1D22] rounded-xl border border-[#E5E8EE] hover:bg-[#E5E8EE] transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Controles de Filtro en Línea */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2 border-t border-[#E5E8EE]">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#747780]" />
            <input
              type="text"
              placeholder="Buscar cliente, RUC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
            />
          </div>

          {/* Sucursal */}
          <div>
            <select
              value={filtros.sucursalId || ''}
              onChange={(e) => onFilterChange({ ...filtros, sucursalId: e.target.value || undefined })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] focus:outline-none focus:ring-1 focus:ring-[#1A73E8] font-medium"
            >
              <option value="">Todas las Sucursales</option>
              <option value="KM10">Km 10.5 Carretera a Masaya</option>
              <option value="CENTROAMERICA">Plaza Centroamérica</option>
            </select>
          </div>

          {/* Fecha de Corte */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filtros.fechaCorte || new Date().toISOString().slice(0, 10)}
              onChange={(e) => onFilterChange({ ...filtros, fechaCorte: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] focus:outline-none focus:ring-1 focus:ring-[#1A73E8] font-medium"
            />
          </div>

          {/* Criterio de Fecha */}
          <div>
            <select
              value={filtros.criterioFecha || 'VENCIMIENTO'}
              onChange={(e) => onFilterChange({ ...filtros, criterioFecha: e.target.value as any })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] focus:outline-none focus:ring-1 focus:ring-[#1A73E8] font-medium"
            >
              <option value="VENCIMIENTO">Por Fecha de Vencimiento</option>
              <option value="EMISION">Por Fecha de Emisión</option>
            </select>
          </div>

          {/* Tipo de Cliente */}
          <div>
            <select
              value={filtros.tipoCliente || ''}
              onChange={(e) => onFilterChange({ ...filtros, tipoCliente: e.target.value || undefined })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] focus:outline-none focus:ring-1 focus:ring-[#1A73E8] font-medium"
            >
              <option value="">Todos los Tipos</option>
              <option value="A">Tipo A (Corporativo)</option>
              <option value="B">Tipo B (Estándar)</option>
              <option value="C">Tipo C (Riesgo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* VISTA 1: CARTERA TOTAL CONSOLIDADA */}
      {subVista === 'CARTERA' && (
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EE] shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-[#1B1D22] mb-1">
              Distribución Gráfica de Cartera por Antigüedad de Vencimiento
            </h3>
            <p className="text-xs text-[#747780] font-medium">
              Total consolidado: <span className="font-extrabold text-[#1B1D22]">{formatMonto(data.resumenGlobal.totalCarteraVisualizada)}</span> en {data.resumenGlobal.totalDocumentos} documentos a la fecha de corte.
            </p>
          </div>

          {/* Gráfico de barras horizontal */}
          <div className="space-y-3">
            {data.kpisPorTramo.map((tramo) => (
              <div key={tramo.tramoId} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#1B1D22]">
                  <span>{tramo.nombre}</span>
                  <span className="font-mono">{formatMonto(tramo.montoVisualizado)} ({tramo.porcentaje.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-[#F4F6F9] h-3.5 rounded-full overflow-hidden flex border border-[#E5E8EE]">
                  <div
                    className={`h-full transition-all rounded-full ${
                      tramo.tramoId === 'corriente'
                        ? 'bg-emerald-500'
                        : tramo.tramoId === '1_30'
                        ? 'bg-[#1A73E8]'
                        : tramo.tramoId === '31_60'
                        ? 'bg-amber-500'
                        : tramo.tramoId === '61_90'
                        ? 'bg-orange-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(2, tramo.porcentaje)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Tabla de tramos */}
          <div className="overflow-x-auto rounded-xl border border-[#E5E8EE]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F9] text-[#747780] uppercase text-[10px] font-extrabold border-b border-[#E5E8EE]">
                <tr>
                  <th className="py-3 px-4">Rango de Antigüedad</th>
                  <th className="py-3 px-4">Días</th>
                  <th className="py-3 px-4 text-right">No. Documentos</th>
                  <th className="py-3 px-4 text-right">Monto en {moneda}</th>
                  <th className="py-3 px-4 text-right">Participación %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE] font-medium text-[#1B1D22]">
                {data.kpisPorTramo.map((t) => (
                  <tr key={t.tramoId} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-bold">{t.nombre}</td>
                    <td className="py-3 px-4 text-[#747780]">{t.min === 0 ? '0 (Al día)' : `${t.min} a ${t.max >= 9999 ? 'más' : t.max}`}</td>
                    <td className="py-3 px-4 text-right font-mono">{t.cantidadDocumentos}</td>
                    <td className="py-3 px-4 text-right font-black font-mono">{formatMonto(t.montoVisualizado)}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#1A73E8]">{t.porcentaje.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: POR CLIENTE */}
      {subVista === 'POR_CLIENTE' && (
        <div className="bg-white rounded-2xl border border-[#E5E8EE] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F9] text-[#747780] font-extrabold text-[10px] uppercase border-b border-[#E5E8EE]">
                <tr>
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-4">Cliente / RUC</th>
                  <th className="py-3 px-4">Vendedor</th>
                  {data.tramosDefinidos.map((t) => (
                    <th key={t.id} className="py-3 px-3 text-right whitespace-nowrap">
                      {t.nombre}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-black">Total Cartera</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={data.tramosDefinidos.length + 5} className="py-12 text-center text-[#747780] font-medium">
                      No se encontraron clientes con cartera pendiente bajo los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cliente) => {
                    const isExpanded = clienteExpandidoId === cliente.clienteId;
                    return (
                      <React.Fragment key={cliente.clienteId}>
                        <tr className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setClienteExpandidoId(isExpanded ? null : cliente.clienteId)}
                              className="text-[#747780] hover:text-[#1B1D22] cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-black text-[#1B1D22]">
                            <div>{cliente.clienteNombre}</div>
                            <div className="text-[11px] font-normal text-[#747780]">RUC: {cliente.clienteRuc}</div>
                          </td>
                          <td className="py-3 px-4 text-[#747780] font-medium">
                            {cliente.vendedorNombre || <span className="text-[#A0A4AE]">Sin asignar</span>}
                          </td>
                          {data.tramosDefinidos.map((t) => {
                            const val = cliente.tramos[t.id] || 0;
                            return (
                              <td
                                key={t.id}
                                className={`py-3 px-3 text-right font-mono ${
                                  val > 0
                                    ? t.id === 'corriente'
                                      ? 'text-emerald-700 font-bold'
                                      : 'text-rose-700 font-bold'
                                    : 'text-[#C5C9D3]'
                                }`}
                              >
                                {val > 0 ? formatMonto(val) : '—'}
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-right font-black text-[#1B1D22] font-mono">
                            {formatMonto(cliente.saldoTotalVisualizado)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => onSelectClienteParaEstadoCuenta && onSelectClienteParaEstadoCuenta(cliente.clienteId)}
                              className="px-2.5 py-1 text-[11px] font-extrabold bg-[#E8F0FE] hover:bg-blue-100 text-[#1A73E8] rounded-lg border border-[#1A73E8]/30 transition-all cursor-pointer shadow-xs"
                            >
                              Estado Cuenta
                            </button>
                          </td>
                        </tr>

                        {/* Detalle expandido de facturas del cliente */}
                        {isExpanded && (
                          <tr className="bg-[#F8FAFC]">
                            <td colSpan={data.tramosDefinidos.length + 5} className="p-4 pl-12">
                              <div className="text-xs font-bold text-[#1B1D22] mb-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-[#1A73E8]" />
                                Documentos pendientes de este cliente ({cliente.documentos.length}):
                              </div>
                              <div className="overflow-x-auto bg-white rounded-xl border border-[#E5E8EE]">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#F4F6F9] text-[#747780] border-b border-[#E5E8EE] text-[10px] uppercase font-extrabold">
                                    <tr>
                                      <th className="py-2.5 px-3">Folio</th>
                                      <th className="py-2.5 px-3">Tipo</th>
                                      <th className="py-2.5 px-3">Emisión</th>
                                      <th className="py-2.5 px-3">Vencimiento</th>
                                      <th className="py-2.5 px-3 text-right">Días Mora</th>
                                      <th className="py-2.5 px-3">Tramo</th>
                                      <th className="py-2.5 px-3 text-right">Saldo en {moneda}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#E5E8EE] font-medium text-[#1B1D22]">
                                    {cliente.documentos.map((doc) => (
                                      <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-2.5 px-3 font-bold text-[#1A73E8]">
                                          {doc.folio}
                                        </td>
                                        <td className="py-2.5 px-3 text-[#747780]">{doc.tipoDocumento}</td>
                                        <td className="py-2.5 px-3">{new Date(doc.fechaEmision).toLocaleDateString()}</td>
                                        <td className="py-2.5 px-3">{new Date(doc.fechaVence).toLocaleDateString()}</td>
                                        <td className="py-2.5 px-3 text-right font-bold font-mono">
                                          {doc.diasMora > 0 ? (
                                            <span className="text-rose-600">+{doc.diasMora} d</span>
                                          ) : (
                                            <span className="text-emerald-600">Al día</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#F4F6F9] text-[#1B1D22] border border-[#E5E8EE]">
                                            {doc.tramoNombre}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-black font-mono">
                                          {formatMonto(doc.saldoPendienteVisualizado)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: DETALLE DE TODAS LAS FACTURAS */}
      {subVista === 'FACTURAS' && (
        <div className="bg-white rounded-2xl border border-[#E5E8EE] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F9] text-[#747780] font-extrabold text-[10px] uppercase border-b border-[#E5E8EE]">
                <tr>
                  <th className="py-3 px-4">Folio / Referencia</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-3">Sucursal</th>
                  <th className="py-3 px-3">Emisión</th>
                  <th className="py-3 px-3">Vencimiento</th>
                  <th className="py-3 px-3 text-right">Días Mora</th>
                  <th className="py-3 px-3">Tramo</th>
                  <th className="py-3 px-4 text-right font-black">Saldo ({moneda})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE] font-medium text-[#1B1D22]">
                {todosDocumentos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#747780] font-medium">
                      No se encontraron documentos de cartera pendientes.
                    </td>
                  </tr>
                ) : (
                  todosDocumentos.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-black text-[#1A73E8]">{doc.folio}</td>
                      <td className="py-3 px-3 text-[#747780]">{doc.tipoDocumento}</td>
                      <td className="py-3 px-4 font-bold text-[#1B1D22]">{doc.clienteNombre}</td>
                      <td className="py-3 px-3 text-[#747780]">{doc.sucursalNombre || 'Km 10.5'}</td>
                      <td className="py-3 px-3">{new Date(doc.fechaEmision).toLocaleDateString()}</td>
                      <td className="py-3 px-3">{new Date(doc.fechaVence).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right font-bold font-mono">
                        {doc.diasMora > 0 ? (
                          <span className="text-rose-600">+{doc.diasMora}</span>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#F4F6F9] text-[#1B1D22] border border-[#E5E8EE]">
                          {doc.tramoNombre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#1B1D22] font-mono">
                        {formatMonto(doc.saldoPendienteVisualizado)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
