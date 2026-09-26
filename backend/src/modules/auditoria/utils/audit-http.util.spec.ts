import type { Request } from 'express';
import { EventEmitter } from 'node:events';
import { attachHttpAudit, getAuditRoute, writeHttpAudit } from './audit-http.util';

describe('auditoría de solicitudes HTTP', () => {
  const metadata = {
    requestId: 'req-1',
    ipDireccion: '127.0.0.1',
    userAgent: 'Browser',
  };

  it('registra consultas y cambios por usuario sin guardar tokens, query ni payload', async () => {
    const prisma = { auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) } };
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/quotations/public/secret-token?password=secret',
      route: { path: '/api/v1/quotations/public/:token' },
      body: { password: 'secret' },
      user: { id: 'user-1', empresaId: 'empresa-1' },
    } as unknown as Request & { user: { id: string; empresaId: string } };

    expect(await writeHttpAudit(prisma as never, req, 200, Date.now(), metadata)).toBe(true);
    const data = prisma.auditoria.create.mock.calls[0][0].data;
    expect(data).toEqual(expect.objectContaining({
      empresaId: 'empresa-1', usuarioId: 'user-1', accion: 'HTTP_GET',
      entidadTipo: 'QUOTATIONS', entidadId: 'req-1', requestId: 'req-1',
    }));
    expect(JSON.parse(data.detalles)).toEqual(expect.objectContaining({
      modulo: 'QUOTATIONS', ruta: '/api/v1/quotations/public/:token',
      metodo: 'GET', codigoHttp: 200, resultado: 'EXITOSO',
    }));
    expect(data.detalles).not.toContain('secret');
  });

  it('conserva usuario y resultado de una solicitud fallida', async () => {
    const prisma = { auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-2' }) } };
    const req = {
      method: 'PATCH', originalUrl: '/api/v1/inventory/equipment/eq-1',
      route: { path: '/api/v1/inventory/equipment/:id' },
      user: { id: 'user-1', empresaId: 'empresa-1' },
    } as unknown as Request & { user: { id: string; empresaId: string } };

    await writeHttpAudit(prisma as never, req, 403, Date.now(), metadata);
    const data = prisma.auditoria.create.mock.calls[0][0].data;
    expect(data.accion).toBe('HTTP_PATCH');
    expect(JSON.parse(data.detalles).resultado).toBe('FALLIDO');
  });

  it('omite solicitudes sin actor autenticado y evita URL real si no hay plantilla', async () => {
    const prisma = { auditoria: { create: jest.fn() } };
    const req = { method: 'GET', originalUrl: '/api/v1/quotations/secret-token' } as Request;

    expect(getAuditRoute(req)).toEqual({ modulo: 'QUOTATIONS', ruta: '/quotations' });
    expect(await writeHttpAudit(prisma as never, req, 200, Date.now(), metadata)).toBe(false);
    expect(prisma.auditoria.create).not.toHaveBeenCalled();
  });

  it('registra la solicitud al finalizar la respuesta HTTP', async () => {
    const prisma = { auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-3' }) } };
    const req = {
      method: 'POST', originalUrl: '/api/v1/billing/payments',
      route: { path: '/api/v1/billing/payments' },
      user: { id: 'user-2', empresaId: 'empresa-2' },
    } as unknown as Request & { user: { id: string; empresaId: string } };
    const response = Object.assign(new EventEmitter(), { statusCode: 201 });
    const onError = jest.fn();

    attachHttpAudit(prisma as never, req, response as never, metadata, onError);
    response.emit('finish');
    await new Promise((resolve) => setImmediate(resolve));

    expect(onError).not.toHaveBeenCalled();
    expect(prisma.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ usuarioId: 'user-2', accion: 'HTTP_POST', entidadTipo: 'BILLING' }),
    });
  });
});
