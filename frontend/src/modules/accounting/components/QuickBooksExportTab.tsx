import React, { useState } from 'react';
import { exportQuickBooks, type QuickBooksExportRes } from '../services/accounting.api';
import { Download, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw, Copy, Check } from 'lucide-react';

export const QuickBooksExportTab: React.FC = () => {
  const [formato, setFormato] = useState<'IIF' | 'CSV'>('IIF');
  const [exportData, setExportData] = useState<QuickBooksExportRes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await exportQuickBooks(formato);
      setExportData(res);
    } catch (err: any) {
      console.error(err);
      setError('Error al generar la exportación contable para QuickBooks.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([exportData.content], { type: exportData.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(exportData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-[#1B1D22] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#1A73E8]" />
              Exportación y Puente Contable a QuickBooks
            </h3>
            <p className="text-xs text-[#747780] font-medium mt-1 leading-relaxed">
              Genera los asientos de diario de facturación, recaudación y costos para importarlos en QuickBooks mientras se completa la transición al nuevo ERP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="btn-precision-primary text-xs px-4 py-2 flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{exportData ? 'Regenerar Asientos' : 'Generar Exportación'}</span>
            </button>
          </div>
        </div>

        {/* Selector de Formato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E5E8EE]">
          <div
            onClick={() => setFormato('IIF')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              formato === 'IIF'
                ? 'border-[#1A73E8] bg-[#E8F0FE]/30'
                : 'border-[#E5E8EE] bg-[#FAFBFD] hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1B1D22]">QuickBooks Desktop (.IIF)</span>
              {formato === 'IIF' && <CheckCircle2 className="w-4 h-4 text-[#1A73E8]" />}
            </div>
            <p className="text-[11px] text-[#747780] mt-1">
              Formato nativo de texto tabulado (Intuit Interchange Format). Importar en QB Desktop vía <em>File &gt; Utilities &gt; Import &gt; IIF Files</em>.
            </p>
          </div>

          <div
            onClick={() => setFormato('CSV')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              formato === 'CSV'
                ? 'border-[#1A73E8] bg-[#E8F0FE]/30'
                : 'border-[#E5E8EE] bg-[#FAFBFD] hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1B1D22]">QuickBooks Online (.CSV)</span>
              {formato === 'CSV' && <CheckCircle2 className="w-4 h-4 text-[#1A73E8]" />}
            </div>
            <p className="text-[11px] text-[#747780] mt-1">
              Formato delimitado por comas estándar. Importar en QB Online vía <em>Settings &gt; Import Data &gt; Journal Entries</em>.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados de Exportación */}
      {exportData && (
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E8EE] pb-4">
            <div>
              <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Archivo Generado</span>
              <span className="font-mono font-black text-sm text-[#1B1D22]">{exportData.filename}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="btn-precision-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Contenido'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="btn-precision-primary text-xs px-4 py-1.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Archivo</span>
              </button>
            </div>
          </div>

          {/* Previsualización del Archivo */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase block">
              Previsualización del Archivo ({exportData.mimeType})
            </span>
            <pre className="p-4 bg-[#1B1D22] text-[#F8FAFC] rounded-2xl font-mono text-[11px] overflow-x-auto max-h-96 leading-relaxed">
              {exportData.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
