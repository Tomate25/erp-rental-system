import { Test, TestingModule } from '@nestjs/testing';
import { InsumosController } from './insumos.controller';
import { InsumosService } from '../services/insumos.service';
import { CategoriaInsumo } from '@prisma/client';

describe('InsumosController', () => {
  let controller: InsumosController;
  let service: jest.Mocked<Partial<InsumosService>>;

  const empresaId = 'emp-1';
  const usuarioId = 'usr-1';

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      ajustarStock: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsumosController],
      providers: [{ provide: InsumosService, useValue: service }],
    }).compile();

    controller = module.get<InsumosController>(InsumosController);
  });

  it('debe crear un insumo', async () => {
    const dto = { nombre: 'Filtro de combustible', categoria: CategoriaInsumo.FILTROS };
    const created = { id: 'ins-1', ...dto };
    (service.create as jest.Mock).mockResolvedValue(created);

    const res = await controller.create(dto, empresaId, usuarioId);

    expect(res).toEqual({
      success: true,
      message: 'Insumo registrado con éxito en el catálogo',
      data: created,
    });
    expect(service.create).toHaveBeenCalledWith(dto, empresaId, usuarioId);
  });

  it('debe listar insumos', async () => {
    (service.findAll as jest.Mock).mockResolvedValue([]);

    const res = await controller.findAll(empresaId, CategoriaInsumo.FILTROS, 'true', 'filtro', 'true');

    expect(res).toEqual({ success: true, data: [] });
    expect(service.findAll).toHaveBeenCalledWith(empresaId, {
      categoria: CategoriaInsumo.FILTROS,
      activo: true,
      search: 'filtro',
      bajoStock: true,
    });
  });

  it('debe obtener un insumo por ID', async () => {
    const insumo = { id: 'ins-1', nombre: 'Filtro' };
    (service.findOne as jest.Mock).mockResolvedValue(insumo);

    const res = await controller.findOne('ins-1', empresaId);

    expect(res).toEqual({ success: true, data: insumo });
    expect(service.findOne).toHaveBeenCalledWith('ins-1', empresaId);
  });

  it('debe actualizar un insumo', async () => {
    const updated = { id: 'ins-1', nombre: 'Filtro Nuevo' };
    (service.update as jest.Mock).mockResolvedValue(updated);

    const res = await controller.update('ins-1', { nombre: 'Filtro Nuevo' }, empresaId, usuarioId);

    expect(res).toEqual({
      success: true,
      message: 'Insumo actualizado con éxito',
      data: updated,
    });
  });

  it('debe ajustar stock de un insumo', async () => {
    const adjusted = { id: 'ins-1', stockActual: 20 };
    (service.ajustarStock as jest.Mock).mockResolvedValue(adjusted);

    const res = await controller.ajustarStock(
      'ins-1',
      { cantidad: 5, tipoAjuste: 'ENTRADA', motivo: 'Compra' },
      empresaId,
      usuarioId,
    );

    expect(res).toEqual({
      success: true,
      message: 'Stock de insumo ajustado con éxito',
      data: adjusted,
    });
  });

  it('debe eliminar un insumo', async () => {
    (service.remove as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      eliminado: true,
      message: 'Eliminado',
    });

    const res = await controller.remove('ins-1', empresaId, usuarioId);

    expect(res.success).toBe(true);
    expect(res.eliminado).toBe(true);
  });
});
