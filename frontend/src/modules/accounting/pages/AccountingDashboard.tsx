import React, { useState, useEffect } from 'react';
import { getCuentasPorCobrar, getCuentasPorPagar, getEstadoResultados, getBalanceGeneral } from '../services/accounting.api';
import { markInvoiceAsPaid } from '../../billing/services/billing.api';
import { Calculator, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';

export const AccountingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CXC' | 'CXP' | 'PL' | 'BALANCE'>('CXC');
  
  const [cxcData, setCxcData] = useState<any>({
    resumenGlobal: { totalFacturado: 0, totalCobrado: 0, totalPendiente: 0, totalVencido: 0 },
    clientes: []
  });
  const [cxpData, setCxpData] = useState<any>({
    resumenGlobal: { totalGastosMantenimiento: 0, totalPendientePago: 0, totalPagado: 0 },
    cuentasPorPagar: []
  });
  const [plData, setPlData] = useState<any>({
    periodo: 'Ejercicio Fiscal Actual',
    ingresos: { totalIngresosBrutos: 0, facturacionAlquiler: 0, cargosPorDanio: 0, subtotalSinIva: 0, ivaRecaudado: 0 },
    costosOperativos: { mantenimientoYRepuestos: 0, gastosAdministrativos: 0 },
    indicadoresFinancieros: { utilidadBruta: 0, utilidadNeta: 0, margenUtilidadNetaPorcentaje: 0 }
  });
  const [balanceData, setBalanceData] = useState<any>({
    fechaCorte: new Date().toISOString(),
    equilibrioContable: true,
    activos: {
      corrientes: { efectivoYBancos: 0, cuentasPorCobrar: 0, depositosGarantiaCustodiados: 0, totalActivoCorriente: 0 },
      noCorrientes: { flotaMaquinariaYEquipos: 0, totalActivoNoCorriente: 0 },
      totalActivos: 0
    },
    pasivos: {
      corrientes: { cuentasPorPagar: 0, garantiasPorDevolver: 0, totalPasivos: 0 }
    },
    patrimonio: { capitalContableYUtilidades: 0, totalPatrimonio: 0 }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getCuentasPorCobrar(),
        getCuentasPorPagar(),
        getEstadoResultados(),
        getBalanceGeneral()
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) setCxcData(results[0].value);
      if (results[1].status === 'fulfilled' && results[1].value) setCxpData(results[1].value);
      if (results[2].status === 'fulfilled' && results[2].value) setPlData(results[2].value);
      if (results[3].status === 'fulfilled' && results[3].value) setBalanceData(results[3].value);
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar la información financiera y contable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  const handlePayInvoice = async (invoiceId: string) => {
    if (!confirm('¿Deseas registrar el cobro completo de esta factura y actualizar los libros contables?')) return;
    try {
      await markInvoiceAsPaid(invoiceId);
      loadFinancialData();
    } catch (err: any) {
      alert('Error al registrar el cobro de la factura');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-NI', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans w-full max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E8EE] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20">
            <Calculator className="w-6 h-6 text-[#1A73E8]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Módulo Contable & Financiero</h2>
            <p className="text-xs text-[#747780] font-medium">
              Control de Cuentas por Cobrar (CxC), Cuentas por Pagar (CxP), Estado de Resultados y Balance General.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#F4F6F9] p-1 rounded-2xl border border-[#E5E8EE] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('CXC')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CXC' ? 'bg-[#1A73E8] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            💳 CxC (Clientes)
          </button>
          <button
            onClick={() => setActiveTab('CXP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CXP' ? 'bg-[#1A73E8] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            📦 CxP (Proveedores)
          </button>
          <button
            onClick={() => setActiveTab('PL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PL' ? 'bg-[#1A73E8] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            📈 Estado de Resultados
          </button>
          <button
            onClick={() => setActiveTab('BALANCE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'BALANCE' ? 'bg-[#1A73E8] text-white shadow-xs' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            🏛️ Balance General
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-16 text-center">
          <div className="w-10 h-10 border-4 border-[#1A73E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-[#747780]">Procesando libros contables y partidas financieras...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-[#FDF2E9] border border-[#C55500]/30 text-[#C55500] text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: CUENTAS POR COBRAR (CxC) */}
          {/* ========================================================================= */}
          {activeTab === 'CXC' && (
            <div className="space-y-6">
              
              {/* Tarjetas KPI de CxC */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
                  <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Total Facturado Emitido</span>
                  <span className="text-lg font-black font-mono text-[#1B1D22]">
                    {formatCurrency(cxcData.resumenGlobal?.totalFacturado)}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">Total Cobrado Real</span>
                  <span className="text-lg font-black font-mono text-emerald-700">
                    {formatCurrency(cxcData.resumenGlobal?.totalCobrado)}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
                  <span className="text-[10px] font-extrabold text-[#1A73E8] uppercase block">Saldo Pendiente por Cobrar</span>
                  <span className="text-lg font-black font-mono text-[#1A73E8]">
                    {formatCurrency(cxcData.resumenGlobal?.totalPendiente)}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-red-200 bg-red-50/30 shadow-xs space-y-1">
                  <span className="text-[10px] font-extrabold text-red-700 uppercase block">Facturas Vencidas</span>
                  <span className="text-lg font-black font-mono text-red-700">
                    {formatCurrency(cxcData.resumenGlobal?.totalVencido)}
                  </span>
                </div>
              </div>

              {/* Tabla CxC por Cliente */}
              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">
                  Cartera de Clientes y Antigüedad de Saldos (CxC)
                </h3>

                {(!cxcData.clientes || cxcData.clientes.length === 0) ? (
                  <div className="p-8 text-center text-xs font-bold text-[#747780] bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE]">
                    No hay registros de cuentas por cobrar en el sistema.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cxcData.clientes?.map((cl: any) => (
                      <div key={cl.clienteId} className="border border-[#E5E8EE] rounded-2xl p-4 bg-[#F8FAFC] space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E8EE] pb-3">
                          <div>
                            <h4 className="text-sm font-black text-[#1B1D22]">{cl.clienteNombre}</h4>
                            <span className="text-[10px] text-[#747780] font-mono font-bold">RUC/Cédula: {cl.clienteRuc}</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div>
                              <span className="text-[9px] text-[#747780] uppercase block">Total Facturas</span>
                              <span className="font-extrabold text-[#1B1D22]">{cl.totalFacturas} u.</span>
                            </div>

                            <div>
                              <span className="text-[9px] text-[#747780] uppercase block">Cobrado Real</span>
                              <span className="font-bold text-emerald-700">{formatCurrency(cl.totalPagado)}</span>
                            </div>

                            <div>
                              <span className="text-[9px] text-[#747780] uppercase block">Saldo Pendiente</span>
                              <span className="font-black text-[#1A73E8]">{formatCurrency(cl.saldoPendiente)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Facturas del cliente */}
                        <div className="border border-[#E5E8EE] rounded-xl overflow-hidden bg-white text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b border-[#E5E8EE] text-[9px] font-black uppercase text-[#747780]">
                                <th className="p-2">Folio</th>
                                <th className="p-2">Origen / Documento</th>
                                <th className="p-2">Fecha Emisión</th>
                                <th className="p-2">Fecha Vence</th>
                                <th className="p-2 text-right">Monto Total</th>
                                <th className="p-2 text-right">Monto Cobrado</th>
                                <th className="p-2 text-right">Saldo Pendiente</th>
                                <th className="p-2 text-center">Estado</th>
                                <th className="p-2 text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E8EE]">
                              {cl.facturas?.map((f: any) => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                  <td className="p-2 font-mono font-black">{f.folio}</td>
                                  <td className="p-2 font-bold">{f.origen}</td>
                                  <td className="p-2 text-[#747780]">{formatDate(f.fechaEmision)}</td>
                                  <td className="p-2 text-[#747780]">{formatDate(f.fechaVence)}</td>
                                  <td className="p-2 text-right font-mono font-bold">{formatCurrency(f.total)}</td>
                                  <td className="p-2 text-right font-mono text-emerald-700 font-bold">{formatCurrency(f.montoPagado)}</td>
                                  <td className={`p-2 text-right font-mono font-black ${
                                    f.saldoPendiente > 0 ? (f.esVencida ? 'text-red-600' : 'text-[#1A73E8]') : 'text-emerald-700'
                                  }`}>
                                    {formatCurrency(f.saldoPendiente)}
                                  </td>
                                  <td className="p-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      f.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800' : f.esVencida ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {f.estado}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right">
                                    {f.saldoPendiente > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handlePayInvoice(f.id)}
                                        className="btn-precision-primary text-[10px] py-1 px-2.5 flex items-center gap-1 ml-auto bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                                      >
                                        <CreditCard className="w-3 h-3" /> Registrar Cobro
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CUENTAS POR PAGAR (CxP) */}
          {/* ========================================================================= */}
          {activeTab === 'CXP' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
                  <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Gastos de Mantenimiento</span>
                  <span className="text-lg font-black font-mono text-[#1B1D22]">
                    {formatCurrency(cxpData?.resumenGlobal?.totalGastosMantenimiento)}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
                  <span className="text-[10px] font-extrabold text-amber-600 uppercase block">Saldo Pendiente por Pagar</span>
                  <span className="text-lg font-black font-mono text-amber-700">
                    {formatCurrency(cxpData?.resumenGlobal?.totalPendientePago)}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#E5E8EE] shadow-xs space-y-1">
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">Total Liquidado / Pagado</span>
                  <span className="text-lg font-black font-mono text-emerald-700">
                    {formatCurrency(cxpData?.resumenGlobal?.totalPagado)}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#1B1D22] uppercase tracking-wider">
                  Detalle de Pasivos por Mantenimiento y Proveedores (CxP)
                </h3>

                {(!cxpData?.cuentasPorPagar || cxpData.cuentasPorPagar.length === 0) ? (
                  <div className="p-8 text-center text-xs font-bold text-[#747780] bg-[#F8FAFC] rounded-2xl border border-[#E5E8EE]">
                    No hay registros de cuentas por pagar o mantenimientos pendientes.
                  </div>
                ) : (
                  <div className="border border-[#E5E8EE] rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F4F6F9] border-b border-[#E5E8EE] text-[9px] font-black uppercase text-[#747780]">
                          <th className="p-3">Concepto / Maquinaria</th>
                          <th className="p-3">Tipo Servicio</th>
                          <th className="p-3">Insumos & Repuestos</th>
                          <th className="p-3">Fecha Programada</th>
                          <th className="p-3 text-right">Costo Estimado</th>
                          <th className="p-3 text-center">Estado Pago</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E8EE]">
                        {cxpData.cuentasPorPagar?.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 font-bold text-[#1B1D22]">{item.concepto}</td>
                            <td className="p-3 font-bold">{item.tipo}</td>
                            <td className="p-3 text-[#747780]">{item.insumos}</td>
                            <td className="p-3 text-[#747780]">{formatDate(item.fechaProgramada)}</td>
                            <td className="p-3 text-right font-mono font-black text-[#1B1D22]">{formatCurrency(item.costo)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                item.estado === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ESTADO DE RESULTADOS (P&L) */}
          {/* ========================================================================= */}
          {activeTab === 'PL' && (
            <div className="bg-white border border-[#E5E8EE] rounded-3xl p-8 shadow-xs space-y-6">
              
              <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#1B1D22] tracking-tight">Estado de Resultados (Pérdidas y Ganancias)</h3>
                  <p className="text-xs text-[#747780] font-medium">{plData?.periodo}</p>
                </div>

                <div className="text-right bg-[#E8F0FE] p-3 rounded-2xl border border-[#1A73E8]/30 font-mono">
                  <span className="text-[10px] font-extrabold text-[#1A73E8] uppercase block">Margen de Utilidad Neta</span>
                  <span className="text-base font-black text-[#1A73E8]">{plData?.indicadoresFinancieros?.margenUtilidadNetaPorcentaje}%</span>
                </div>
              </div>

              {/* Estructura del P&L */}
              <div className="space-y-4 text-xs font-mono">
                
                {/* INGRESOS */}
                <div className="border border-[#E5E8EE] rounded-2xl p-4 bg-[#F8FAFC] space-y-2">
                  <div className="flex justify-between items-center text-sm font-black text-emerald-700 border-b border-[#E5E8EE] pb-2">
                    <span>(+) INGRESOS OPERATIVOS BRUTOS</span>
                    <span>{formatCurrency(plData?.ingresos?.totalIngresosBrutos)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-gray-700">
                    <span>• Facturación por Alquiler de Maquinaria</span>
                    <span className="font-bold">{formatCurrency(plData?.ingresos?.facturacionAlquiler)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-gray-700">
                    <span>• Cargos Evaluados por Daño y Reparaciones</span>
                    <span className="font-bold">{formatCurrency(plData?.ingresos?.cargosPorDanio)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-gray-500 text-[11px] pt-1">
                    <span>  (Subtotal Neto Sin IVA: {formatCurrency(plData?.ingresos?.subtotalSinIva)} | IVA Recaudado: {formatCurrency(plData?.ingresos?.ivaRecaudado)})</span>
                  </div>
                </div>

                {/* COSTOS OPERATIVOS */}
                <div className="border border-[#E5E8EE] rounded-2xl p-4 bg-[#F8FAFC] space-y-2">
                  <div className="flex justify-between items-center text-sm font-black text-amber-700 border-b border-[#E5E8EE] pb-2">
                    <span>(-) COSTOS OPERATIVOS DE MANTENIMIENTO</span>
                    <span>{formatCurrency(plData?.costosOperativos?.mantenimientoYRepuestos)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-gray-700">
                    <span>• Mantenimiento Preventivo / Correctivo y Repuestos</span>
                    <span className="font-bold">{formatCurrency(plData?.costosOperativos?.mantenimientoYRepuestos)}</span>
                  </div>
                </div>

                {/* UTILIDAD BRUTA */}
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex justify-between items-center text-sm font-black text-emerald-900">
                  <span>(=) UTILIDAD BRUTA</span>
                  <span>{formatCurrency(plData?.indicadoresFinancieros?.utilidadBruta)}</span>
                </div>

                {/* GASTOS ADMINISTRATIVOS */}
                <div className="border border-[#E5E8EE] rounded-2xl p-4 bg-[#F8FAFC] space-y-2">
                  <div className="flex justify-between items-center text-sm font-black text-red-700 border-b border-[#E5E8EE] pb-2">
                    <span>(-) GASTOS ADMINISTRATIVOS Y OPERATIVOS</span>
                    <span>{formatCurrency(plData?.costosOperativos?.gastosAdministrativos)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-gray-700">
                    <span>• Gastos Generales de Administración</span>
                    <span className="font-bold">{formatCurrency(plData?.costosOperativos?.gastosAdministrativos)}</span>
                  </div>
                </div>

                {/* UTILIDAD NETA */}
                <div className="p-5 bg-[#37474F] text-white rounded-2xl flex justify-between items-center text-base font-black">
                  <span>(=) UTILIDAD NETA DEL EJERCICIO</span>
                  <span className="text-emerald-400 font-mono">{formatCurrency(plData?.indicadoresFinancieros?.utilidadNeta)}</span>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: BALANCE GENERAL */}
          {/* ========================================================================= */}
          {activeTab === 'BALANCE' && (
            <div className="bg-white border border-[#E5E8EE] rounded-3xl p-8 shadow-xs space-y-6">
              
              <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#1B1D22] tracking-tight">Balance General (Estado de Situación Financiera)</h3>
                  <p className="text-xs text-[#747780] font-medium">Fecha de Corte: {formatDate(balanceData?.fechaCorte)}</p>
                </div>

                {balanceData?.equilibrioContable && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-full border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Ecuación Contable Balanceada
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                
                {/* COLUMNA ACTIVOS */}
                <div className="border border-[#E5E8EE] rounded-2xl p-5 bg-[#F8FAFC] space-y-4">
                  <h4 className="font-black text-sm text-[#1B1D22] uppercase border-b border-[#E5E8EE] pb-2 text-emerald-800">
                    ACTIVOS (Recursos de la Empresa)
                  </h4>

                  <div className="space-y-2">
                    <span className="font-extrabold text-[#747780] text-[10px] uppercase block">ACTIVO CORRIENTE (Circulante)</span>
                    <div className="flex justify-between pl-2">
                      <span>• Efectivo y Bancos (Cobrado)</span>
                      <span className="font-bold">{formatCurrency(balanceData?.activos?.corrientes?.efectivoYBancos)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>• Cuentas por Cobrar (Clientes)</span>
                      <span className="font-bold">{formatCurrency(balanceData?.activos?.corrientes?.cuentasPorCobrar)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>• Depósitos de Garantía en Custodia</span>
                      <span className="font-bold">{formatCurrency(balanceData?.activos?.corrientes?.depositosGarantiaCustodiados)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E5E8EE] font-black text-[#1B1D22]">
                      <span>Subtotal Activo Corriente</span>
                      <span>{formatCurrency(balanceData?.activos?.corrientes?.totalActivoCorriente)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E5E8EE]">
                    <span className="font-extrabold text-[#747780] text-[10px] uppercase block">ACTIVO NO CORRIENTE (Fijo)</span>
                    <div className="flex justify-between pl-2">
                      <span>• Flota de Maquinaria y Equipos</span>
                      <span className="font-bold">{formatCurrency(balanceData?.activos?.noCorrientes?.flotaMaquinariaYEquipos)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E5E8EE] font-black text-[#1B1D22]">
                      <span>Subtotal Activo No Corriente</span>
                      <span>{formatCurrency(balanceData?.activos?.noCorrientes?.totalActivoNoCorriente)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl flex justify-between items-center text-sm font-black">
                    <span>TOTAL ACTIVOS</span>
                    <span>{formatCurrency(balanceData?.activos?.totalActivos)}</span>
                  </div>
                </div>

                {/* COLUMNA PASIVOS Y PATRIMONIO */}
                <div className="border border-[#E5E8EE] rounded-2xl p-5 bg-[#F8FAFC] space-y-4">
                  <h4 className="font-black text-sm text-[#1B1D22] uppercase border-b border-[#E5E8EE] pb-2 text-amber-800">
                    PASIVOS Y PATRIMONIO
                  </h4>

                  <div className="space-y-2">
                    <span className="font-extrabold text-[#747780] text-[10px] uppercase block">PASIVO CORRIENTE (Deudas)</span>
                    <div className="flex justify-between pl-2">
                      <span>• Cuentas por Pagar (Mantenimiento)</span>
                      <span className="font-bold">{formatCurrency(balanceData?.pasivos?.corrientes?.cuentasPorPagar)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>• Depósitos de Garantía por Devolver</span>
                      <span className="font-bold">{formatCurrency(balanceData?.pasivos?.corrientes?.garantiasPorDevolver)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E5E8EE] font-black text-[#1B1D22]">
                      <span>Subtotal Pasivos</span>
                      <span>{formatCurrency(balanceData?.pasivos?.corrientes?.totalPasivos)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-[#E5E8EE]">
                    <span className="font-extrabold text-[#747780] text-[10px] uppercase block">PATRIMONIO (Capital)</span>
                    <div className="flex justify-between pl-2">
                      <span>• Capital Contable y Utilidades</span>
                      <span className="font-bold">{formatCurrency(balanceData?.patrimonio?.capitalContableYUtilidades)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E5E8EE] font-black text-[#1B1D22]">
                      <span>Total Patrimonio</span>
                      <span>{formatCurrency(balanceData?.patrimonio?.totalPatrimonio)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#37474F] text-white rounded-xl flex justify-between items-center text-sm font-black">
                    <span>TOTAL PASIVOS + PATRIMONIO</span>
                    <span className="text-emerald-400">{formatCurrency((balanceData?.pasivos?.corrientes?.totalPasivos || 0) + (balanceData?.patrimonio?.totalPatrimonio || 0))}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
