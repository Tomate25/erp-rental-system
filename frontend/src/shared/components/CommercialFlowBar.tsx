export const COMMERCIAL_FLOW = [
  { id: 'quotations', label: 'Cotizaciones', detail: 'Presupuesto' },
  { id: 'contracts', label: 'Contratos', detail: 'Arrendamiento' },
  { id: 'operations', label: 'Operaciones', detail: 'Acta de entrega y retorno' },
  { id: 'maintenance', label: 'Mantenimiento', detail: 'Fallas y taller' },
  { id: 'billing', label: 'Facturación', detail: 'Emitir y pagar' },
] as const;

export type CommercialFlowStepId = (typeof COMMERCIAL_FLOW)[number]['id'];

interface CommercialFlowBarProps {
  current: string;
  canOpen: (stepId: string) => boolean;
  onOpen: (stepId: CommercialFlowStepId) => void;
}

export function CommercialFlowBar({ current, canOpen, onOpen }: CommercialFlowBarProps) {
  return (
    <nav
      aria-label="Flujo comercial"
      className="mb-6 bg-white border border-[#E5E8EE] rounded-2xl px-3 py-3 shadow-xs"
    >
      <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#747780]">
        Flujo: cotización, contrato, acta, fallas y pago
      </p>
      <ol className="flex flex-col sm:flex-row gap-1.5">
        {COMMERCIAL_FLOW.map((step, index) => {
          const active = step.id === current;
          const allowed = canOpen(step.id);
          return (
            <li key={step.id} className="flex-1 min-w-0">
              <button
                type="button"
                disabled={!allowed}
                aria-current={active ? 'step' : undefined}
                onClick={() => allowed && onOpen(step.id)}
                className={`w-full text-left rounded-xl px-3 py-2 border transition-colors ${
                  active
                    ? 'bg-[#1B1D22] text-white border-[#1B1D22]'
                    : allowed
                      ? 'bg-[#F4F6F9] text-[#1B1D22] border-[#E5E8EE] hover:bg-[#E8F0FE] cursor-pointer'
                      : 'bg-[#F8FAFC] text-[#747780] border-[#E5E8EE] cursor-not-allowed'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">
                  {index + 1}. {step.label}
                </span>
                <span className={`block text-[11px] font-semibold truncate ${active ? 'text-white/80' : 'text-[#747780]'}`}>
                  {step.detail}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
