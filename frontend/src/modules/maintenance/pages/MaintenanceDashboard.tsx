import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { DamageChargesPanel } from '../../billing/components/DamageChargesPanel';
import { getDamageReturns, getInvoices } from '../../billing/services/billing.api';
import type { Factura, RetornoConDanos } from '../../billing/types/billing.types';
import { InvoicePrintView } from '../../billing/components/InvoicePrintView';

export function MaintenanceDashboard() {
  const [returns, setReturns] = useState<RetornoConDanos[]>([]);
  const [invoices, setInvoices] = useState<Factura[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = async () => {
    try {
      const [damageResult, invoicesResult] = await Promise.allSettled([
        getDamageReturns(),
        getInvoices(),
      ]);
      if (damageResult.status === 'fulfilled') setReturns(damageResult.value);
      if (invoicesResult.status === 'fulfilled') setInvoices(invoicesResult.value);
      setError(false);
    } catch (reason) {
      console.error('Error cargando reparaciones', reason);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (viewingInvoice) {
    return (
      <div className="max-w-6xl mx-auto pb-12 space-y-6">
        <InvoicePrintView factura={viewingInvoice} onBack={() => setViewingInvoice(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      <header className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-[#37474F] text-white shadow-xs">
          <Wrench size={24} className="text-[#C55500]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1B1D22]">Taller y Mantenimiento</h1>
          <p className="text-xs text-[#747780]">
            Gestión de equipos en mantenimiento, registro de gastos reales y seguimiento de reparaciones enviadas a facturación.
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-center justify-between"
        >
          <span>No se pudieron cargar los datos de reparaciones.</span>
          <button type="button" onClick={refresh} className="underline font-bold cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm font-bold text-[#747780] bg-white border border-[#E5E8EE] rounded-3xl shadow-xs">
          Cargando equipos y reparaciones de taller...
        </div>
      ) : (
        <DamageChargesPanel
          returns={returns}
          invoices={invoices}
          onRefresh={refresh}
          onOpenInvoice={(inv) => setViewingInvoice(inv)}
          canEditRepair
          canInvoice={false}
        />
      )}
    </div>
  );
}
