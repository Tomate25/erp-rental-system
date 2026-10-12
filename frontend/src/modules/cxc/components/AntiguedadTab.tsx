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
    <div className="space-y-4">
      {/* Barra de Filtros y Sub-vistas */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Subvistas Tabs */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg">
            <button
              onClick={() => setSubVista('CARTERA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                subVista === 'CARTERA'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Cartera Total Consolidada
            </button>
            <button
              onClick={() => setSubVista('POR_CLIENTE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                subVista === 'POR_CLIENTE'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Por Cliente ({clientesFiltrados.length})
            </button>
            <button
              onClick={() => setSubVista('FACTURAS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                subVista === 'FACTURAS'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Detalle de Facturas ({todosDocumentos.length})
            </button>
          </div>

          {/* Acciones: Exportar / Imprimir */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportarCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Controles de Filtro en Línea */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente, RUC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Sucursal */}
          <div>
            <select
              value={filtros.sucursalId || ''}
              onChange={(e) => onFilterChange({ ...filtros, sucursalId: e.target.value || undefined })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Criterio de Fecha */}
          <div>
            <select
              value={filtros.criterioFecha || 'VENCIMIENTO'}
              onChange={(e) => onFilterChange({ ...filtros, criterioFecha: e.target.value as any })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los Tipos</option>
              <option value="A">Tipo A (Corporativo)</option>
              <option value="B">Tipo B (Estándar)</option>
              <option value="C">Tipo C (Riesgo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* VISTA 1: CARTERA TOTAL CONSOLIDADA (Gráfico de Distribución + Resumen) */}
      {subVista === 'CARTERA' && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
              Distribución Gráfica de Cartera por Antigüedad de Vencimiento
            </h3>
            <p className="text-xs text-gray-500">
              Total consolidado: <span className="font-bold text-gray-800 dark:text-gray-200">{formatMonto(data.resumenGlobal.totalCarteraVisualizada)}</span> en {data.resumenGlobal.totalDocumentos} documentos a la fecha de corte.
            </p>
          </div>

          {/* Gráfico de barras horizontal */}
          <div className="space-y-3">
            {data.kpisPorTramo.map((tramo) => (
              <div key={tramo.tramoId} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{tramo.nombre}</span>
                  <span>{formatMonto(tramo.montoVisualizado)} ({tramo.porcentaje.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-4 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all ${
                      tramo.tramoId === 'corriente'
                        ? 'bg-emerald-500'
                        : tramo.tramoId === '1_30'
                        ? 'bg-blue-500'
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Rango de Antigüedad</th>
                  <th className="py-2.5 px-3">Días</th>
                  <th className="py-2.5 px-3 text-right">No. Documentos</th>
                  <th className="py-2.5 px-3 text-right">Monto en {moneda}</th>
                  <th className="py-2.5 px-3 text-right">Participación %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-medium">
                {data.kpisPorTramo.map((t) => (
                  <tr key={t.tramoId} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 px-3 font-semibold">{t.nombre}</td>
                    <td className="py-2.5 px-3 text-gray-500">{t.min === 0 ? '0 (Al día)' : `${t.min} a ${t.max >= 9999 ? 'más' : t.max}`}</td>
                    <td className="py-2.5 px-3 text-right">{t.cantidadDocumentos}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{formatMonto(t.montoVisualizado)}</td>
                    <td className="py-2.5 px-3 text-right">{t.porcentaje.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: POR CLIENTE (Acordeón desplegable con desglose de tramos) */}
      {subVista === 'POR_CLIENTE' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-3">Cliente / RUC</th>
                  <th className="py-3 px-3">Vendedor</th>
                  {data.tramosDefinidos.map((t) => (
                    <th key={t.id} className="py-3 px-2 text-right whitespace-nowrap">
                      {t.nombre}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-bold">Total Cartera</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={data.tramosDefinidos.length + 5} className="py-8 text-center text-gray-500">
                      No se encontraron clientes con cartera pendiente bajo los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cliente) => {
                    const isExpanded = clienteExpandidoId === cliente.clienteId;
                    return (
                      <React.Fragment key={cliente.clienteId}>
                        <tr className="hover:bg-blue-50/40 dark:hover:bg-gray-700/40 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setClienteExpandidoId(isExpanded ? null : cliente.clienteId)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">
                            <div>{cliente.clienteNombre}</div>
                            <div className="text-[11px] font-normal text-gray-500">RUC: {cliente.clienteRuc}</div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                            {cliente.vendedorNombre || <span className="text-gray-400">Sin asignar</span>}
                          </td>
                          {data.tramosDefinidos.map((t) => {
                            const val = cliente.tramos[t.id] || 0;
                            return (
                              <td
                                key={t.id}
                                className={`py-2.5 px-2 text-right ${
                                  val > 0
                                    ? t.id === 'corriente'
                                      ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                      : 'text-rose-700 dark:text-rose-400 font-semibold'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              >
                                {val > 0 ? formatMonto(val) : '—'}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                            {formatMonto(cliente.saldoTotalVisualizado)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => onSelectClienteParaEstadoCuenta && onSelectClienteParaEstadoCuenta(cliente.clienteId)}
                              className="px-2 py-1 text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800"
                            >
                              Estado Cuenta
                            </button>
                          </td>
                        </tr>

                        {/* Detalle expandido de facturas del cliente */}
                        {isExpanded && (
                          <tr className="bg-gray-50/80 dark:bg-gray-900/40">
                            <td colSpan={data.tramosDefinidos.length + 5} className="p-3 pl-10">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                Documentos pendientes de este cliente ({cliente.documentos.length}):
                              </div>
                              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                      <th className="py-2 px-3">Folio</th>
                                      <th className="py-2 px-3">Tipo</th>
                                      <th className="py-2 px-3">Emisión</th>
                                      <th className="py-2 px-3">Vencimiento</th>
                                      <th className="py-2 px-3 text-right">Días Mora</th>
                                      <th className="py-2 px-3">Tramo</th>
                                      <th className="py-2 px-3 text-right">Saldo en {moneda}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {cliente.documentos.map((doc) => (
                                      <tr key={doc.id}>
                                        <td className="py-2 px-3 font-semibold text-blue-600 dark:text-blue-400">
                                          {doc.folio}
                                        </td>
                                        <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{doc.tipoDocumento}</td>
                                        <td className="py-2 px-3">{new Date(doc.fechaEmision).toLocaleDateString()}</td>
                                        <td className="py-2 px-3">{new Date(doc.fechaVence).toLocaleDateString()}</td>
                                        <td className="py-2 px-3 text-right font-medium">
                                          {doc.diasMora > 0 ? (
                                            <span className="text-rose-600 font-bold">+{doc.diasMora} d</span>
                                          ) : (
                                            <span className="text-emerald-600">Al día</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                            {doc.tramoNombre}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3">Folio / Referencia</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Sucursal</th>
                  <th className="py-3 px-3">Emisión</th>
                  <th className="py-3 px-3">Vencimiento</th>
                  <th className="py-3 px-3 text-right">Días Mora</th>
                  <th className="py-3 px-3">Tramo</th>
                  <th className="py-3 px-3 text-right font-bold">Saldo ({moneda})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {todosDocumentos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No se encontraron documentos de cartera pendientes.
                    </td>
                  </tr>
                ) : (
                  todosDocumentos.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">{doc.folio}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{doc.tipoDocumento}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">{doc.clienteNombre}</td>
                      <td className="py-2.5 px-3 text-gray-500">{doc.sucursalNombre || 'Km 10.5'}</td>
                      <td className="py-2.5 px-3">{new Date(doc.fechaEmision).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3">{new Date(doc.fechaVence).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {doc.diasMora > 0 ? (
                          <span className="text-rose-600">+{doc.diasMora}</span>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {doc.tramoNombre}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
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
