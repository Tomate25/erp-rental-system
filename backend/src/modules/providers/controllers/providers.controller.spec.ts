import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from '../services/providers.service';
import { TipoProveedor } from '@prisma/client';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let service: ProvidersService;

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
      controllers: [ProvidersController],
      providers: [{ provide: ProvidersService, useValue: mockService }],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    service = module.get<ProvidersService>(ProvidersService);
  });

  it('create delega al servicio con empresaId y usuarioId', async () => {
    mockService.create.mockResolvedValue({ id: 'prov-1', nombre: 'Test' });
    const dto = { nombre: 'Test', tipo: TipoProveedor.MAQUINARIA_EXTERNA };

    const result = await controller.create(dto, 'emp-1', 'usr-1');
    expect(result.success).toBe(true);
    expect(mockService.create).toHaveBeenCalledWith(dto, 'emp-1', 'usr-1');
  });

  it('findAll parsea query booleano activo y delega al servicio', async () => {
    mockService.findAll.mockResolvedValue([]);
    await controller.findAll('emp-1', TipoProveedor.MAQUINARIA_EXTERNA, 'true', 'filtro');

    expect(mockService.findAll).toHaveBeenCalledWith('emp-1', {
      tipo: TipoProveedor.MAQUINARIA_EXTERNA,
      activo: true,
      search: 'filtro',
    });
  });

  it('findOne delega con id y empresaId', async () => {
    mockService.findOne.mockResolvedValue({ id: 'prov-1' });
    const result = await controller.findOne('prov-1', 'emp-1');

    expect(result.data).toEqual({ id: 'prov-1' });
    expect(mockService.findOne).toHaveBeenCalledWith('prov-1', 'emp-1');
  });

  it('update delega al servicio con id, dto, empresaId y usuarioId', async () => {
    mockService.update.mockResolvedValue({ id: 'prov-1', nombre: 'Actualizado' });
    const dto = { nombre: 'Actualizado' };

    const result = await controller.update('prov-1', dto, 'emp-1', 'usr-1');
    expect(result.success).toBe(true);
    expect(mockService.update).toHaveBeenCalledWith('prov-1', dto, 'emp-1', 'usr-1');
  });

  it('remove delega al servicio con id, empresaId y usuarioId', async () => {
    mockService.remove.mockResolvedValue({ success: true });
    const result = await controller.remove('prov-1', 'emp-1', 'usr-1');

    expect(result.success).toBe(true);
    expect(mockService.remove).toHaveBeenCalledWith('prov-1', 'emp-1', 'usr-1');
  });
});
