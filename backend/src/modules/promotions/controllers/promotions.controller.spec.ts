import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from '../services/promotions.service';
import { TipoCobro } from '@prisma/client';

describe('PromotionsController', () => {
  let controller: PromotionsController;
  let service: PromotionsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [{ provide: PromotionsService, useValue: mockService }],
    }).compile();

    controller = module.get<PromotionsController>(PromotionsController);
    service = module.get<PromotionsService>(PromotionsService);
  });

  it('create delega al servicio con empresaId y usuarioId', async () => {
    mockService.create.mockResolvedValue({ id: 'promo-1', codigo: 'PROMO-01' });
    const dto = {
      codigo: 'PROMO-01',
      nombre: 'Combo Excavación',
      precioCombo: 1200,
      tipoCobro: TipoCobro.POR_DIA,
    };

    const result = await controller.create(dto, 'emp-1', 'usr-1');
    expect(result.success).toBe(true);
    expect(mockService.create).toHaveBeenCalledWith(dto, 'emp-1', 'usr-1');
  });

  it('findAll parsea query booleano activo y delega al servicio', async () => {
    mockService.findAll.mockResolvedValue([]);
    await controller.findAll('emp-1', 'true', 'combo');

    expect(mockService.findAll).toHaveBeenCalledWith('emp-1', {
      activo: true,
      search: 'combo',
    });
  });

  it('findOne delega con id y empresaId', async () => {
    mockService.findOne.mockResolvedValue({ id: 'promo-1' });
    const result = await controller.findOne('promo-1', 'emp-1');

    expect(result.data).toEqual({ id: 'promo-1' });
    expect(mockService.findOne).toHaveBeenCalledWith('promo-1', 'emp-1');
  });

  it('update delega al servicio con id, dto, empresaId y usuarioId', async () => {
    mockService.update.mockResolvedValue({ id: 'promo-1', nombre: 'Combo Actualizado' });
    const dto = { nombre: 'Combo Actualizado' };

    const result = await controller.update('promo-1', dto, 'emp-1', 'usr-1');
    expect(result.success).toBe(true);
    expect(mockService.update).toHaveBeenCalledWith('promo-1', dto, 'emp-1', 'usr-1');
  });

  it('remove delega al servicio con id, empresaId y usuarioId', async () => {
    mockService.remove.mockResolvedValue({ success: true, message: 'Eliminada' });
    const result = await controller.remove('promo-1', 'emp-1', 'usr-1');

    expect(result.success).toBe(true);
    expect(mockService.remove).toHaveBeenCalledWith('promo-1', 'emp-1', 'usr-1');
  });
});
