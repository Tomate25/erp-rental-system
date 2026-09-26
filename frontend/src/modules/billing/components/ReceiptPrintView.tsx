import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Factura, FacturaPago } from '../types/billing.types';
import { moneyWords } from '../utils/moneyWords';
import './billingPrint.css';

interface ReceiptPrintViewProps {
  factura: Factura;
  pago: FacturaPago;
  onBack: () => void;
}

export const ReceiptPrintView: React.FC<ReceiptPrintViewProps> = ({ factura, pago, onBack }) => {
  const paymentDate = new Date(pago.fechaPago);
  const amount = `C$ ${Number(pago.monto).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const paymentKind = pago.metodo === 'CHEQUE' ? 'Cheque' : pago.metodo === 'EFECTIVO' ? 'Efectivo' : pago.metodo === 'TARJETA' ? 'Tarjeta' : 'Transferencia';

  return <div className="billing-print-preview">
    <div className="billing-print-controls">
      <button onClick={onBack}><ArrowLeft size={16} /> Volver a Facturación</button>
      <button onClick={() => window.print()}><Printer size={16} /> Imprimir recibo / Guardar PDF</button>
    </div>
    <article className="billing-paper billing-receipt">
      <header className="billing-document-heading">
        <div className="billing-brand">{factura.empresa?.nombre || 'BM Construcciones'}</div>
        <div className="billing-company-lines">
          {factura.empresa?.rfc && <span>RUC: {factura.empresa.rfc}</span>}
          {factura.empresa?.direccion && <span>{factura.empresa.direccion}</span>}
          {factura.empresa?.telefono && <span>Tel.: {factura.empresa.telefono}</span>}
        </div>
        <strong className="billing-receipt-title">RECIBO DE CAJA</strong>
      </header>
      <div className="billing-receipt-top">
        <div className="billing-date-box"><span>DÍA</span><span>MES</span><span>AÑO</span><b>{paymentDate.getDate()}</b><b>{paymentDate.getMonth() + 1}</b><b>{paymentDate.getFullYear()}</b></div>
        <div className="billing-document-number">Referencia de pago: <strong>{pago.referencia || pago.id.slice(0, 8).toUpperCase()}</strong></div>
        <div className="billing-receipt-amount">Por {amount}</div>
      </div>
      <div className="billing-receipt-fields">
        <div className="billing-fill-line"><b>Recibí de:</b><span>{factura.cliente?.razonSocial || factura.cliente?.nombre || ''}</span></div>
        <div className="billing-fill-line"><b>La suma de en letras:</b><span>{moneyWords(Number(pago.monto))}</span></div>
        <div className="billing-receipt-concept"><b>En concepto de:</b>Abono a factura {factura.folio}{factura.contrato?.codigo ? ` · Contrato ${factura.contrato.codigo}` : ''}.</div>
      </div>
      <div className="billing-receipt-payment">
        <div><b>{paymentKind}:</b><span>{amount}</span></div>
        {pago.metodo === 'CHEQUE' && <div><b>Cheque N.º:</b><span>{pago.referencia || ''}</span></div>}
        {pago.metodo === 'TRANSFERENCIA' && <div><b>Referencia:</b><span>{pago.referencia || ''}</span></div>}
        {(pago.metodo === 'CHEQUE' || pago.metodo === 'TRANSFERENCIA') && <div><b>Banco:</b><span>{pago.banco || ''}</span></div>}
      </div>
      <div className="billing-receipt-signatures"><div>Entregué conforme</div><div>Recibí conforme</div></div>
    </article>
  </div>;
};
