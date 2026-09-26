export interface QuotationEmailParams {
  empresaNombre: string;
  clienteNombre: string;
  numeroCotizacion: string;
  version: number;
  fechaEmision: string;
  fechaVence: string;
  validezDias: number;
  total: number | string;
  publicUrl: string;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateQuotationEmailHtml(
  params: QuotationEmailParams,
): string {
  const {
    empresaNombre,
    clienteNombre,
    numeroCotizacion,
    version,
    fechaVence,
    validezDias,
    total,
    publicUrl,
  } = params;

  const safeEmpresa = escapeHtml(empresaNombre);
  const safeCliente = escapeHtml(clienteNombre);
  const safeNumero = escapeHtml(numeroCotizacion);
  const safeFechaVence = escapeHtml(fechaVence);
  const safeTotal = escapeHtml(total);
  const safeUrl = escapeHtml(publicUrl);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${safeNumero} (v${version})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #1e3a8a; padding: 24px 32px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
    .content { padding: 32px; }
    .welcome { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #111827; }
    .message { font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
    .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .row:last-child { border-bottom: none; font-weight: 700; font-size: 16px; color: #1e3a8a; margin-top: 4px; padding-top: 12px; }
    .label { color: #64748b; }
    .value { color: #0f172a; text-align: right; }
    .action-container { text-align: center; margin: 32px 0 24px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
    .btn:hover { background: #1d4ed8; }
    .notice { font-size: 12px; color: #6b7280; line-height: 1.5; margin-top: 20px; text-align: center; }
    .footer { background: #f1f5f9; padding: 16px 32px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${safeEmpresa}</h1>
      <p>Gestión de Alquiler de Maquinaria y Equipos</p>
    </div>
    <div class="content">
      <div class="welcome">Estimado(a) ${safeCliente},</div>
      <div class="message">
        Nos complace presentarle nuestra cotización formal para el alquiler de equipos y maquinaria solicitados. Puede revisar el desglose detallado, las especificaciones técnicas y los términos comerciales en nuestro portal seguro.
      </div>
      
      <div class="details-box">
        <div class="row">
          <span class="label">N° de Cotización:</span>
          <span class="value"><strong>${safeNumero} (Versión ${version})</strong></span>
        </div>
        <div class="row">
          <span class="label">Vigencia:</span>
          <span class="value">${validezDias} días (Vence: ${safeFechaVence})</span>
        </div>
        <div class="row">
          <span class="label">Total Cotizado:</span>
          <span class="value">USD/NIO ${safeTotal}</span>
        </div>
      </div>

      <div class="action-container">
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="btn">Revisar y Responder Cotización</a>
      </div>

      <div class="notice">
        Al ingresar al enlace, podrá <strong>Aceptar</strong> la cotización para formalizar su contrato de inmediato o <strong>Rechazar</strong> indicando sus observaciones para que nuestro equipo le prepare una versión ajustada.
      </div>
    </div>
    <div class="footer">
      Este es un mensaje automático emitido por la plataforma ERP Rental System de ${safeEmpresa}.
    </div>
  </div>
</body>
</html>
  `.trim();
}
