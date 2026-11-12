import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Factura } from '../types/billing.types';
import './billingPrint.css';

interface InvoicePrintViewProps {
  factura: Factura;
  onBack: () => void;
}

interface InvoicePrintItem {
  key: string;
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
}

const money = (value: number) =>
  `C$ ${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ factura, onBack }) => {
  const issueDate = new Date(factura.fechaEmision);
  const items: InvoicePrintItem[] = [];
  const contratoCodigo = factura.contrato?.codigo || '';

  // 1. Si la factura tiene detalleCorte guardado con líneas de equipo
  if (factura.corte && Array.isArray(factura.detalleCorte) && factura.detalleCorte.length > 0) {
    let allocatedNetCents = 0;
    const totalSubtotalCents = Math.round(Number(factura.subtotal) * 100);
    const sumImporte = factura.detalleCorte.reduce((s, l) => s + (Number(l.importe) || 0), 0);

    factura.detalleCorte.forEach((line, index) => {
      const isLast = index === factura.detalleCorte!.length - 1;
      const ratio = sumImporte > 0
        ? Number(line.importe) / sumImporte
        : 1 / factura.detalleCorte!.length;
      const netCents = isLast
        ? totalSubtotalCents - allocatedNetCents
        : Math.round(totalSubtotalCents * ratio);
      allocatedNetCents += netCents;
      const net = netCents / 100;

      const qty = Number(line.cantidad) || 1;
      const code = line.codigo ? `[${line.codigo}] ` : '';
      const serial = line.numeroSerie ? ` (S/N: ${line.numeroSerie})` : '';
      const rawDesc = line.descripcion || 'Equipo de renta';
      const hasCode = line.codigo && rawDesc.includes(line.codigo);
      const hasSerial = line.numeroSerie && rawDesc.includes(line.numeroSerie);
      const descLine = `${hasCode ? '' : code}${rawDesc}${hasSerial ? '' : serial}`;

      items.push({
        key: `${line.equipoId || index}-${index}`,
        quantity: qty,
        description: descLine,
        unitPrice: qty > 0 ? net / qty : 0,
        total: net,
      });
    });
  }

  // 2. Si no hay detalleCorte, pero el contrato tiene equipos registrados (contrato.items)
  if (items.length === 0 && Array.isArray(factura.contrato?.items) && factura.contrato.items.length > 0) {
    let allocatedNetCents = 0;
    const totalSubtotalCents = Math.round(Number(factura.subtotal) * 100);

    const baseSum = factura.contrato.items.reduce((s: number, it: any) => {
      return s + (Number(it.cantidad) || 1) * (Number(it.precioRenta) || 1);
    }, 0);

    factura.contrato.items.forEach((item: any, index: number) => {
      const isLast = index === factura.contrato.items.length - 1;
      const itemBase = (Number(item.cantidad) || 1) * (Number(item.precioRenta) || 1);
      const ratio = baseSum > 0 ? itemBase / baseSum : 1 / factura.contrato.items.length;
      const netCents = isLast
        ? totalSubtotalCents - allocatedNetCents
        : Math.round(totalSubtotalCents * ratio);
      allocatedNetCents += netCents;
      const net = netCents / 100;

      const qty = Number(item.cantidad) || 1;
      const eq = item.equipo;
      const name = eq?.modelo || eq?.descripcion || item.descripcion || 'Equipo de renta';
      const code = eq?.codigo ? `[${eq.codigo}] ` : '';
      const serial = eq?.numeroSerie ? ` (S/N: ${eq.numeroSerie})` : '';
      const descLine = `${code}${name}${serial}`;

      items.push({
        key: item.id || `${item.equipoId}-${index}`,
        quantity: qty,
        description: descLine,
        unitPrice: qty > 0 ? net / qty : 0,
        total: net,
      });
    });
  }

  // 3. Si no hay contrato.items, pero la cotización tiene items (factura.cotizacion o contrato.cotizacion)
  const quoteItems = factura.cotizacion?.items || factura.contrato?.cotizacion?.items;
  if (items.length === 0 && Array.isArray(quoteItems) && quoteItems.length > 0) {
    let allocatedNetCents = 0;
    const totalSubtotalCents = Math.round(Number(factura.subtotal) * 100);
    const sumQuoteSubtotal = quoteItems.reduce(
      (s: number, it: any) => s + (Number(it.subtotal) || Number(it.precioUnitario) * Number(it.cantidad) || 1),
      0,
    );

    quoteItems.forEach((item: any, index: number) => {
      const isLast = index === quoteItems.length - 1;
      const itemVal = Number(item.subtotal) || Number(item.precioUnitario) * Number(item.cantidad) || 1;
      const ratio = sumQuoteSubtotal > 0 ? itemVal / sumQuoteSubtotal : 1 / quoteItems.length;
      const netCents = isLast
        ? totalSubtotalCents - allocatedNetCents
        : Math.round(totalSubtotalCents * ratio);
      allocatedNetCents += netCents;
      const net = netCents / 100;

      const qty = Number(item.cantidad) || 1;
      const descLine = item.descripcion || 'Equipo de renta';

      items.push({
        key: item.id || `quote-${index}`,
        quantity: qty,
        description: descLine,
        unitPrice: qty > 0 ? net / qty : Number(item.precioUnitario) || 0,
        total: net,
      });
    });
  }

  // 4. Si es factura por cargo de daños/reparaciones (CARGO_DANOS)
  if (items.length === 0 && factura.tipoFactura === 'CARGO_DANOS' && Array.isArray(factura.detalleCargo)) {
    let assignedCents = 0;
    factura.detalleCargo.forEach((gasto, index) => {
      const last = index === factura.detalleCargo!.length - 1;
      let calculatedSubtotal: number;
      if (typeof gasto.subtotal === 'number' && Number.isFinite(gasto.subtotal)) {
        calculatedSubtotal = gasto.subtotal;
      } else if (gasto.aplicaIva === 'EXENTO') {
        calculatedSubtotal = Number(gasto.monto);
      } else if (gasto.aplicaIva === 'MAS_IVA') {
        calculatedSubtotal = Number(gasto.monto);
      } else {
        calculatedSubtotal = Number(gasto.monto) / 1.15;
      }

      const lineCents = last
        ? Math.round(Number(factura.subtotal) * 100) - assignedCents
        : Math.round(calculatedSubtotal * 100);
      assignedCents += lineCents;

      const ivaNote =
        gasto.aplicaIva === 'EXENTO'
          ? ' (Exento de IVA)'
          : gasto.aplicaIva === 'MAS_IVA'
            ? ' (+ 15% IVA)'
            : '';

      items.push({
        key: `${gasto.mantenimientoId}-${index}`,
        quantity: 1,
        description: `Reparación ${gasto.equipo} · ${gasto.descripcion}${ivaNote}`,
        unitPrice: lineCents / 100,
        total: lineCents / 100,
      });
    });
  }

  // 5. Fallback final solo si no se pudo resolver ningún producto en ninguna relación
  if (items.length === 0 && factura.corte) {
    items.push({
      key: factura.corteId || 'corte',
      quantity: 1,
      description: 'Renta de maquinaria y equipo',
      unitPrice: Number(factura.subtotal),
      total: Number(factura.subtotal),
    });
  }

  const missingDetails = items.length === 0;

  return (
    <div className="billing-print-preview">
      <div className="billing-print-controls">
        <button onClick={onBack}>
          <ArrowLeft size={16} /> Volver a Facturación
        </button>
        <button onClick={() => window.print()} disabled={missingDetails}>
          <Printer size={16} /> Imprimir factura / Guardar PDF
        </button>
      </div>
      {missingDetails && (
        <p className="billing-print-warning">
          No se encontraron los conceptos de esta factura. No se puede imprimir una factura sin detalle; actualiza la
          lista y vuelve a intentarlo.
        </p>
      )}
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
          <div className="billing-date-box">
            <span>DÍA</span>
            <span>MES</span>
            <span>AÑO</span>
            <b>{issueDate.getDate()}</b>
            <b>{issueDate.getMonth() + 1}</b>
            <b>{issueDate.getFullYear()}</b>
          </div>
          <div className="billing-payment-checks">
            <span>
              CRÉDITO <b>{factura.condicionPago === 'CREDITO' ? '☒' : '☐'}</b>
            </span>
            <span>
              CONTADO <b>{factura.condicionPago === 'CONTADO' ? '☒' : '☐'}</b>
            </span>
          </div>
          <div className="billing-document-number">
            N.º <strong>{factura.folio}</strong>
          </div>
        </div>
        <div className="billing-fill-line">
          <b>CLIENTE:</b>
          <span>{factura.cliente?.razonSocial || factura.cliente?.nombre || ''}</span>
        </div>
        <div className="billing-fill-line">
          <b>RUC:</b>
          <span>{factura.cliente?.rfc || factura.cliente?.cedula || ''}</span>
          {contratoCodigo && (
            <span style={{ marginLeft: '16px', flex: '0 0 auto', borderBottom: 'none' }}>
              <b>CONTRATO:</b>{' '}
              <span style={{ borderBottom: '1px solid #333', padding: '0 6px', fontWeight: 700, fontFamily: 'monospace' }}>
                {contratoCodigo}
              </span>
            </span>
          )}
        </div>
        <table className="billing-invoice-table">
          <thead>
            <tr>
              <th>CANT.</th>
              <th>DESCRIPCIÓN</th>
              <th>P. UNIT.</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td>{item.quantity}</td>
                <td>{item.description}</td>
                <td>{money(item.unitPrice)}</td>
                <td>{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="billing-invoice-bottom">
          <div className="billing-signatures">
            <div>Entregué conforme</div>
            <div>Recibí conforme</div>
          </div>
          <table className="billing-total-table">
            <tbody>
              <tr>
                <th>SUBTOTAL</th>
                <td>{money(factura.subtotal)}</td>
              </tr>
              {Number(factura.descuentoGlobal) > 0 && (
                <tr>
                  <th>DESCUENTO</th>
                  <td>−{money(factura.descuentoGlobal)}</td>
                </tr>
              )}
              <tr>
                <th>I.V.A.</th>
                <td>{money(factura.iva)}</td>
              </tr>
              {Number(factura.retencionIva) > 0 && (
                <tr>
                  <th>RETENCIÓN</th>
                  <td>−{money(factura.retencionIva)}</td>
                </tr>
              )}
              <tr>
                <th>TOTAL</th>
                <td>{money(factura.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
};
