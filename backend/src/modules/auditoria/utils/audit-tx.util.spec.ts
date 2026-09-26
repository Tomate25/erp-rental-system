import { recordAuditInTx } from './audit-tx.util';
import { runWithAuditRequestContext } from './audit-request-context';

describe('recordAuditInTx', () => {
  const dto = {
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    accion: 'EVENTO_PRUEBA',
    entidadTipo: 'PRUEBA',
    entidadId: 'entidad-1',
    detalles: { password: 'secreto', valor: 42 },
  };

  it('incorpora IP, agente y requestId del contexto HTTP y sanitiza secretos', async () => {
    const tx = {
      auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };

    await runWithAuditRequestContext(
      {
        ipDireccion: '::ffff:203.0.113.25',
        userAgent: 'Navegador de prueba',
        requestId: 'request-123',
      },
      () => recordAuditInTx(tx as never, dto),
    );

    expect(tx.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipDireccion: '203.0.113.25',
        userAgent: 'Navegador de prueba',
        requestId: 'request-123',
      }),
    });
    const detalles = JSON.parse(
      tx.auditoria.create.mock.calls[0][0].data.detalles as string,
    ) as Record<string, unknown>;
    expect(detalles.password).toBe('[REDACTED]');
    expect(detalles.valor).toBe(42);
  });

  it('propaga el fallo de escritura para abortar la transacción de negocio', async () => {
    const tx = {
      auditoria: {
        create: jest.fn().mockRejectedValue(new Error('audit unavailable')),
      },
    };

    await expect(recordAuditInTx(tx as never, dto)).rejects.toThrow(
      'audit unavailable',
    );
  });

  it('conserva tenant e IP en eventos públicos con actor nulo', async () => {
    const tx = {
      auditoria: {
        create: jest.fn().mockResolvedValue({ id: 'audit-public' }),
      },
    };

    await runWithAuditRequestContext(
      {
        ipDireccion: '203.0.113.80',
        userAgent: 'Public browser',
        requestId: 'public-request-1',
      },
      () =>
        recordAuditInTx(tx as never, {
          ...dto,
          usuarioId: null,
          accion: 'COTIZACION_PUBLICA_SOLICITADA',
        }),
    );

    expect(tx.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        empresaId: 'empresa-1',
        usuarioId: null,
        ipDireccion: '203.0.113.80',
        requestId: 'public-request-1',
      }),
    });
  });

  it('no omite silenciosamente la auditoría si el cliente transaccional es inválido', async () => {
    await expect(recordAuditInTx({} as never, dto)).rejects.toThrow();
  });

  it('rechaza eventos sin tenant en vez de omitirlos', async () => {
    const tx = { auditoria: { create: jest.fn() } };
    await expect(
      recordAuditInTx(tx as never, { ...dto, empresaId: '' }),
    ).rejects.toThrow('empresaId es obligatorio');
    expect(tx.auditoria.create).not.toHaveBeenCalled();
  });
});
