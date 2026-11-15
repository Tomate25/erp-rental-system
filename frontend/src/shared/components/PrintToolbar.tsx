import { ArrowLeft, Printer } from 'lucide-react';

export function PrintToolbar({ onBack, onPrint, backLabel = 'Volver a Operaciones', zoom, onZoomChange, printDisabled = false }: { onBack: () => void; onPrint: () => void; backLabel?: string; zoom?: 100 | 125; onZoomChange?: (zoom: 100 | 125) => void; printDisabled?: boolean }) {
  return <div className="sticky top-14 z-20 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-precision-neutral-border bg-precision-canvas/95 px-4 py-3 backdrop-blur-xs print:hidden">
    <button type="button" onClick={onBack} className="btn-precision-outline inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" />{backLabel}</button>
    <div className="flex items-center gap-2">
      {zoom && onZoomChange && <label className="text-xs text-precision-secondary">Zoom <select aria-label="Zoom de vista previa" value={zoom} onChange={e => onZoomChange(Number(e.target.value) as 100 | 125)} className="precision-input ml-1 text-xs"><option value={100}>100 %</option><option value={125}>125 %</option></select></label>}
      <button type="button" onClick={onPrint} disabled={printDisabled} className="btn-precision-primary inline-flex items-center gap-2 disabled:opacity-50"><Printer className="h-4 w-4" />Imprimir acta</button>
    </div>
  </div>;
}
