import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Factura } from '../types/billing.types';
import { calendarDays } from '../../contracts/utils/cutPricing';
import './billingPrint.css';

interface InvoicePrintViewProps {
  factura: Factura;
  onBack: () => void;
}

const money = (value: number) => `C$ ${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: string) => new Date(value).toLocaleDateString('es-NI');

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ factura, onBack }) => {
  const issueDate = new Date(factura.fechaEmision);
  const cutLines = factura.corte && factura.detalleCorte?.length ? factura.detalleCorte : null;
  let allocatedNetCents = 0;
  const items = cutLines?.map((line, index) => {
    const netCents = index === cutLines.length - 1
      ? Math.round(Number(factura.subtotal) * 100) - allocatedNetCents
      : Math.round(Number(line.importe) / Number(factura.total) * Number(factura.subtotal) * 100);
    allocatedNetCents += netCents;
    const net = netCents / 100;
    return {
      key: `${line.equipoId}-${index}`,
      quantity: Number(line.unidades),
      description: `${line.descripcion} · ${line.cantidad} equipo(s) · ${line.unidad === 'HORA' ? 'horas' : 'días'} del corte ${factura.corte?.numeroCorte}`,
      unitPrice: line.unidades > 0 ? net / Number(line.unidades) : 0,
      total: net,
    };
  }) || (factura.corte ? [] : factura.cotizacion?.items?.map(item => ({
    key: item.id,
    quantity: Number(item.cantidad),
    description: `${item.descripcion}${item.tipoCobro === 'POR_HORA' && item.horas ? ` · ${item.horas} hora(s)` : item.dias && item.dias > 1 ? ` · ${item.dias} día(s)` : ''}`,
    unitPrice: Number(item.precioUnitario),
    total: Number(item.subtotal),
  })) || []);
  if (!items.length && factura.corte) {
    const days = calendarDays(new Date(factura.corte.fechaInicio), new Date(factura.corte.fechaFin));
    items.push({
      key: factura.corteId || 'corte',
      quantity: days,
      description: `Renta de equipos · Corte ${factura.corte.numeroCorte} · ${date(factura.corte.fechaInicio)} al ${date(factura.corte.fechaFin)} · Contrato ${factura.contrato?.codigo || ''}`,
      unitPrice: days > 0 ? Number(factura.subtotal) / days : 0,
      total: Number(factura.subtotal),
    });
  }
  if (!items.length && factura.tipoFactura === 'CARGO_DANOS' && Array.isArray(factura.detalleCargo)) {
    let assignedCents = 0;
    factura.detalleCargo.forEach((gasto, index) => {
      const last = index === factura.detalleCargo!.length - 1;
      const lineCents = last
        ? Math.round(Number(factura.subtotal) * 100) - assignedCents
        : Math.round(Number(gasto.monto) / 1.15 * 100);
      assignedCents += lineCents;
      items.push({
      key: `${gasto.mantenimientoId}-${index}`,
      quantity: 1,
      description: `Reparación ${gasto.equipo} · ${gasto.descripcion} · Contrato ${factura.contrato?.codigo || ''}`,
      unitPrice: lineCents / 100,
      total: lineCents / 100,
      });
    });
  }
  const missingDetails = items.length === 0;

  return <div className="billing-print-preview">
    <div className="billing-print-controls">
      <button onClick={onBack}><ArrowLeft size={16} /> Volver a Facturación</button>
      <button onClick={() => window.print()} disabled={missingDetails}><Printer size={16} /> Imprimir factura / Guardar PDF</button>
    </div>
    {missingDetails && <p className="billing-print-warning">No se encontraron los conceptos de esta factura. No se puede imprimir una factura sin detalle; actualiza la lista y vuelve a intentarlo.</p>}
    <article className="billing-paper billing-invoice">
      <header className="billing-document-heading">
        <div className="billing-brand">{factura.empresa?.nombre || 'BM Construcciones'}</div>
        <div className="billing-company-lines">
          {factura.empresa?.rfc && <span>RUC: {factura.empresa.rfc}</span>}
          {factura.empresa?.direccion && <span>{factura.empresa.direccion}</span>}
          {factura.empresa?.telefono && <span>Tel.: {factura.empresa.telefono}</span>}
        </div>
        <strong className="billing-document-title">FACTURA</strong>
      </header>
      <div className="billing-invoice-top">
        <div className="billing-date-box"><span>DÍA</span><span>MES</span><span>AÑO</span><b>{issueDate.getDate()}</b><b>{issueDate.getMonth() + 1}</b><b>{issueDate.getFullYear()}</b></div>
        <div className="billing-payment-checks"><span>CRÉDITO <b>{factura.condicionPago === 'CREDITO' ? '☒' : '☐'}</b></span><span>CONTADO <b>{factura.condicionPago === 'CONTADO' ? '☒' : '☐'}</b></span></div>
        <div className="billing-document-number">N.º <strong>{factura.folio}</strong></div>
      </div>
      <div className="billing-fill-line"><b>CLIENTE:</b><span>{factura.cliente?.razonSocial || factura.cliente?.nombre || ''}</span></div>
      <div className="billing-fill-line"><b>RUC:</b><span>{factura.cliente?.rfc || factura.cliente?.cedula || ''}</span></div>
      <table className="billing-invoice-table">
        <thead><tr><th>CANT.</th><th>DESCRIPCIÓN</th><th>P. UNIT.</th><th>TOTAL</th></tr></thead>
        <tbody>{items.map(item => <tr key={item.key}><td>{item.quantity}</td><td>{item.description}</td><td>{money(item.unitPrice)}</td><td>{money(item.total)}</td></tr>)}</tbody>
      </table>
      <div className="billing-invoice-bottom">
        <div className="billing-signatures"><div>Entregué conforme</div><div>Recibí conforme</div></div>
        <table className="billing-total-table"><tbody>
          <tr><th>SUBTOTAL</th><td>{money(factura.subtotal)}</td></tr>
          {Number(factura.descuentoGlobal) > 0 && <tr><th>DESCUENTO</th><td>−{money(factura.descuentoGlobal)}</td></tr>}
          <tr><th>I.V.A.</th><td>{money(factura.iva)}</td></tr>
          {Number(factura.retencionIva) > 0 && <tr><th>RETENCIÓN</th><td>−{money(factura.retencionIva)}</td></tr>}
          <tr><th>TOTAL</th><td>{money(factura.total)}</td></tr>
        </tbody></table>
      </div>
    </article>
  </div>;
};
