import { NotFoundException } from '@nestjs/common';
import { TipoControlEquipo } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService multi-tenant', () => {
  let prisma: any;
  let service: InventoryService;

  beforeEach(() => {
    prisma = {
      categoria: { findUnique: jest.fn() },
      marca: { findUnique: jest.fn() },
      producto: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      equipo: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new InventoryService(prisma as unknown as PrismaService);
  });

  it('crea un producto comercial dentro de la empresa autenticada', async () => {
    const dto = {
      nombre: '  Miniexcavadora  ',
      codigo: '  CAT-01  ',
      categoriaId: 'categoria-a',
      marcaId: 'marca-a',
      tipoControl: TipoControlEquipo.SERIALIZADO,
      precioRentaDia: 250,
    };
    const created = { id: 'producto-a', empresaId: 'empresa-a' };
    prisma.categoria.findUnique.mockResolvedValue({ id: 'categoria-a' });
    prisma.marca.findUnique.mockResolvedValue({ id: 'marca-a' });
    prisma.producto.create.mockResolvedValue(created);

    await expect(service.createProduct(dto, 'empresa-a')).resolves.toBe(
      created,
    );
    expect(prisma.producto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'empresa-a',
          nombre: 'Miniexcavadora',
          codigo: 'CAT-01',
        }),
      }),
    );
  });

  it('lista productos comerciales con empresa y filtros solicitados', async () => {
    prisma.producto.findMany.mockResolvedValue([]);

    await service.findAllProducts(
      'empresa-a',
      'categoria-a',
      'subcategoria-a',
      'marca-a',
    );

    expect(prisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: 'empresa-a',
          categoriaId: 'categoria-a',
          subcategoriaId: 'subcategoria-a',
          marcaId: 'marca-a',
        },
      }),
    );
  });

  it('busca el detalle del producto por id y empresa', async () => {
    prisma.producto.findFirst.mockResolvedValue({ id: 'producto-a' });

    await service.findOneProduct('producto-a', 'empresa-a');

    expect(prisma.producto.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'producto-a', empresaId: 'empresa-a' },
      }),
    );
  });

  it('rechaza el detalle de un producto comercial de otra empresa', async () => {
    prisma.producto.findFirst.mockResolvedValue(null);

    await expect(
      service.findOneProduct('producto-ajeno', 'empresa-a'),
    ).rejects.toThrow(NotFoundException);
  });

  it('lista equipos físicos únicamente dentro de la empresa autenticada', async () => {
    prisma.equipo.findMany.mockResolvedValue([]);

    await service.findAll(
      'empresa-a',
      'sucursal-a',
      'categoria-a',
      'subcategoria-a',
      'DISPONIBLE',
    );

    expect(prisma.equipo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: 'empresa-a',
          sucursalId: 'sucursal-a',
          categoriaId: 'categoria-a',
          subcategoriaId: 'subcategoria-a',
          estado: 'DISPONIBLE',
        },
      }),
    );
  });

  it('busca el detalle del equipo físico por id y empresa', async () => {
    const equipo = { id: 'equipo-a', empresaId: 'empresa-a' };
    prisma.equipo.findFirst.mockResolvedValue(equipo);

    await expect(service.findOne('equipo-a', 'empresa-a')).resolves.toBe(
      equipo,
    );
    expect(prisma.equipo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'equipo-a', empresaId: 'empresa-a' },
      }),
    );
  });

  it('rechaza el detalle de un equipo físico de otra empresa', async () => {
    prisma.equipo.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('equipo-ajeno', 'empresa-a'),
    ).rejects.toThrow(NotFoundException);
  });
});
