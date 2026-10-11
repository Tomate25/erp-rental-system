import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { downloadInventoryTemplate } from '../services/import-inventory.service';

interface ImportDropzoneProps {
  onFileLoaded: (file: File) => void;
  isLoading?: boolean;
}

export const ImportDropzone: React.FC<ImportDropzoneProps> = ({
  onFileLoaded,
  isLoading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    setFileError(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setFileError('Solo se admiten archivos de hoja de cálculo (.xlsx, .xls, .csv).');
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      setFileError('El archivo excede el tamaño máximo permitido de 5 MB.');
      return;
    }

    onFileLoaded(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de acción: Descarga de plantilla */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-blue-950">Plantilla Oficial de Excel</h4>
            <p className="text-[11px] text-blue-700">
              Usa el formato estructurado con columnas normalizadas y listas de tarifa válidas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadInventoryTemplate}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-300 shadow-2xs transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Plantilla Excel</span>
        </button>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 text-blue-600 flex items-center justify-center mx-auto">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <h5 className="text-sm font-bold text-slate-800">
              {isLoading ? 'Analizando archivo...' : 'Arrastra tu archivo aquí o haz clic para examinar'}
            </h5>
            <p className="text-xs text-slate-500 mt-0.5">
              Archivos .xlsx, .xls o .csv (máx. 5 MB / hasta 5,000 filas)
            </p>
          </div>

          <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-3 py-1 rounded-full">
            Seleccionar archivo local
          </span>
        </div>
      </div>

      {fileError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{fileError}</span>
        </div>
      )}
    </div>
  );
};
