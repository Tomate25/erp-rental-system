import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let prisma: any;
  let service: ClientsService;

  beforeEach(() => {
    prisma = {
      cliente: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      contrato: { count: jest.fn() },
      cotizacion: { count: jest.fn() },
      factura: { count: jest.fn() },
      usuario: { findFirst: jest.fn() },
      auditoria: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    service = new ClientsService(prisma);
  });

  it('crea el cliente dentro de la empresa autenticada', async () => {
    const dto = { nombre: 'Constructora Norte', rfc: 'RUC-001' };
    const created = { id: 'cliente-a', ...dto, empresaId: 'empresa-a' };
    prisma.cliente.findFirst.mockResolvedValue(null);
    prisma.cliente.create.mockResolvedValue(created);

    await expect(service.create(dto, 'empresa-a')).resolves.toEqual(created);
    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { rfc: 'RUC-001', empresaId: 'empresa-a' },
    });
    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        vendedor: undefined,
        vendedorId: undefined,
        empresaId: 'empresa-a',
      },
    });
  });

  it('lista únicamente los clientes de la empresa autenticada', async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await service.findAll('empresa-a');

    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'empresa-a' },
      orderBy: { createdAt: 'desc' },
      include: {
        contactos: true,
        vendedorAsignado: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });
  });

  it('busca el cliente por id y empresa', async () => {
    const cliente = { id: 'cliente-a', empresaId: 'empresa-a' };
    prisma.cliente.findFirst.mockResolvedValue(cliente);

    await expect(service.findOne('cliente-a', 'empresa-a')).resolves.toBe(
      cliente,
    );
    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cliente-a', empresaId: 'empresa-a' },
      include: {
        contactos: true,
        vendedorAsignado: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });
  });

  it('rechaza consultar un cliente de otra empresa', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(service.findOne('cliente-ajeno', 'empresa-a')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza actualizar un cliente de otra empresa', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(
      service.update('cliente-ajeno', { nombre: 'Cambio' }, 'empresa-a'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('actualiza un cliente que pertenece a la empresa', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-a',
      empresaId: 'empresa-a',
    });
    prisma.cliente.update.mockResolvedValue({
      id: 'cliente-a',
      nombre: 'Nombre nuevo',
    });

    await service.update('cliente-a', { nombre: 'Nombre nuevo' }, 'empresa-a');

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-a' },
      data: { nombre: 'Nombre nuevo' },
    });
  });

  it('rechaza eliminar un cliente de otra empresa antes de consultar su historial', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(service.remove('cliente-ajeno', 'empresa-a')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.contrato.count).not.toHaveBeenCalled();
    expect(prisma.cliente.delete).not.toHaveBeenCalled();
  });

  it('protege el cliente cuando tiene contratos activos', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-a',
      empresaId: 'empresa-a',
    });
    prisma.contrato.count.mockResolvedValue(1);
    prisma.cotizacion.count.mockResolvedValue(0);
    prisma.factura.count.mockResolvedValue(0);

    await expect(service.remove('cliente-a', 'empresa-a')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.cliente.delete).not.toHaveBeenCalled();
  });

  it('persiste un vendedor explícito cuando pertenece a la misma empresa', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      nombre: 'Nylska',
      apellido: 'López',
    });
    prisma.cliente.create.mockResolvedValue({ id: 'cliente-a' });

    await service.create(
      {
        nombre: 'Cliente asignado',
        vendedorId: '00000000-0000-4000-8000-000000000001',
      },
      'empresa-a',
    );

    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: {
        id: '00000000-0000-4000-8000-000000000001',
        empresaId: 'empresa-a',
      },
      select: { id: true, nombre: true, apellido: true },
    });
    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vendedorId: '00000000-0000-4000-8000-000000000001',
        vendedor: 'Nylska López',
        empresaId: 'empresa-a',
      }),
    });
  });

  it('rechaza asignar al cliente un vendedor de otra empresa', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-a',
      empresaId: 'empresa-a',
    });
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        'cliente-a',
        { vendedorId: '00000000-0000-4000-8000-000000000002' },
        'empresa-a',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
