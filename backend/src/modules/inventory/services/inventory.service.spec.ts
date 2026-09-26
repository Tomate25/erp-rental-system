import { NotFoundException } from '@nestjs/common';
import { TipoControlEquipo, TipoMedicionCombustible } from '@prisma/client';
import { validateSync } from 'class-validator';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
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
        update: jest.fn(),
        delete: jest.fn(),
      },
      equipo: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sucursal: { findFirst: jest.fn() },
      auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback(prisma),
    );
    service = new InventoryService(prisma);
  });

  it('mantiene bloqueado el estado y stock de una máquina mientras está en reparación', async () => {
    prisma.equipo.findFirst.mockResolvedValue({
      id: 'equipo-taller', empresaId: 'empresa-a', estado: 'EN_MANTENIMIENTO', cantidadDisponible: 0,
    });

    await expect(service.update('equipo-taller', { estado: 'DISPONIBLE' }, 'empresa-a'))
      .rejects.toThrow('Termine la orden de mantenimiento');
    await expect(service.update('equipo-taller', { cantidadDisponible: 1 }, 'empresa-a'))
      .rejects.toThrow('Termine la orden de mantenimiento');
    expect(prisma.equipo.update).not.toHaveBeenCalled();
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

    await expect(service.findOne('equipo-ajeno', 'empresa-a')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('guarda la unidad de combustible seleccionada al crear y editar un equipo', async () => {
    prisma.sucursal.findFirst.mockResolvedValue({ id: 'sucursal-a' });
    prisma.categoria.findUnique.mockResolvedValue({ id: 'categoria-a' });
    prisma.marca.findUnique.mockResolvedValue({ id: 'marca-a' });
    prisma.equipo.create.mockResolvedValue({
      id: 'equipo-a',
      estado: 'DISPONIBLE',
    });
    prisma.equipo.findFirst.mockResolvedValue({
      id: 'equipo-a',
      empresaId: 'empresa-a',
      estado: 'DISPONIBLE',
      sucursalId: 'sucursal-a',
    });
    prisma.equipo.update.mockResolvedValue({
      id: 'equipo-a',
      estado: 'DISPONIBLE',
    });

    await service.create(
      {
        modelo: 'Backhoe',
        categoriaId: 'categoria-a',
        marcaId: 'marca-a',
        sucursalId: 'sucursal-a',
        precioRentaDia: 100,
        tipoMedicionCombustible: TipoMedicionCombustible.BARRAS,
      },
      'empresa-a',
    );
    expect(prisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipoMedicionCombustible: TipoMedicionCombustible.BARRAS,
        }),
      }),
    );

    await service.update(
      'equipo-a',
      { tipoMedicionCombustible: TipoMedicionCombustible.PULGADAS },
      'empresa-a',
    );
    expect(prisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipoMedicionCombustible: TipoMedicionCombustible.PULGADAS,
        }),
      }),
    );

    await service.update(
      'equipo-a',
      { tipoMedicionCombustible: null },
      'empresa-a',
    );
    expect(prisma.equipo.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipoMedicionCombustible: null }),
      }),
    );
  });

  it('rechaza unidades de combustible ajenas al catálogo', () => {
    const dto = new CreateEquipmentDto();
    dto.tipoMedicionCombustible = 'GALONES' as TipoMedicionCombustible;
    expect(
      validateSync(dto).some(
        (error) => error.property === 'tipoMedicionCombustible',
      ),
    ).toBe(true);
  });
});
