import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { generateQuotationEmailHtml } from '../templates/quotation-email.template';

describe('MailService', () => {
  it('envía con transporte simulado durante pruebas sin exponer credenciales', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new MailService(config as unknown as ConfigService);

    const result = await service.sendMail({
      to: 'cliente@example.com',
      subject: 'Cotización',
      html: '<p>Prueba</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();
  });

  it('escapa contenido dinámico y protege el enlace HTML', () => {
    const html = generateQuotationEmailHtml({
      empresaNombre: '<script>alert(1)</script>',
      clienteNombre: 'Cliente & Asociados',
      numeroCotizacion: 'COT-<1>',
      version: 1,
      fechaEmision: '2026-09-24',
      fechaVence: '2026-10-09',
      validezDias: 15,
      total: 100,
      publicUrl: 'https://example.com/cotizacion/a"b',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('a&quot;b');
  });
});
