import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from '../services/auditoria.service';
import { QueryAuditoriaDto } from '../dto/query-auditoria.dto';

describe('AuditoriaController (Solo Lectura Forense)', () => {
  let controller: AuditoriaController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditoriaController],
      providers: [
        {
          provide: AuditoriaService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AuditoriaController>(AuditoriaController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('no debe exponer endpoints de mutación (POST, PUT, PATCH, DELETE)', () => {
    const proto = Object.getPrototypeOf(controller);
    const methods = Object.getOwnPropertyNames(proto);

    // Solo debe permitir findAll y findById (y constructor)
    const mutablePrefixes = [
      'create',
      'update',
      'delete',
      'remove',
      'patch',
      'post',
      'put',
    ];
    const invalidMethods = methods.filter((m) =>
      mutablePrefixes.some((prefix) => m.toLowerCase().startsWith(prefix)),
    );

    expect(invalidMethods).toEqual([]);
  });

  describe('findAll()', () => {
    it('delega al servicio pasando empresaId del tenant autenticado y DTO de consulta', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResult);

      const queryDto: QueryAuditoriaDto = {
        page: 1,
        limit: 20,
        accion: 'PAGO_REGISTRADO',
      };
      const response = await controller.findAll('emp-101', queryDto);

      expect(service.findAll).toHaveBeenCalledWith('emp-101', queryDto);
      expect(response).toEqual({
        success: true,
        data: mockResult,
      });
    });
  });

  describe('findById()', () => {
    it('delega al servicio con empresaId e id del registro', async () => {
      const mockRecord = {
        id: 'aud-uuid-1',
        empresaId: 'emp-101',
        accion: 'CONTRATO_CANCELADO',
      };
      service.findById.mockResolvedValue(mockRecord);

      const response = await controller.findById('aud-uuid-1', 'emp-101');

      expect(service.findById).toHaveBeenCalledWith('emp-101', 'aud-uuid-1');
      expect(response).toEqual({
        success: true,
        data: mockRecord,
      });
    });
  });
});
