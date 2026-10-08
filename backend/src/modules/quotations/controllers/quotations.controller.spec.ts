import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from '../services/quotations.service';
import {
  CreatePublicQuotationDto,
  PublicQuotationItemDto,
} from '../dto/create-public-quotation.dto';

describe('QuotationsController', () => {
  let controller: QuotationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [
        {
          provide: QuotationsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createNewVersion: jest.fn(),
            findVersionsByNumber: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QuotationsController>(QuotationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega revokePublicToken al servicio con empresaId', async () => {
    const service = (controller as any).quotationsService;
    service.revokePublicToken = jest
      .fn()
      .mockResolvedValue({ success: true, message: 'Revocado' });

    const result = await controller.revokePublicToken('cot-1', 'emp-1');
    expect(service.revokePublicToken).toHaveBeenCalledWith('cot-1', 'emp-1');
    expect(result.success).toBe(true);
  });

  it('delega rotatePublicToken al servicio con empresaId', async () => {
    const service = (controller as any).quotationsService;
    service.rotatePublicToken = jest
      .fn()
      .mockResolvedValue({ success: true, tokenPublico: 'new-uuid' });

    const result = await controller.rotatePublicToken('cot-1', 'emp-1');
    expect(service.rotatePublicToken).toHaveBeenCalledWith('cot-1', 'emp-1');
    expect(result.success).toBe(true);
    expect(result.tokenPublico).toBe('new-uuid');
  });

  it('valida que validezDias en CreatePublicQuotationDto no supere el límite de 60 días', async () => {
    const dto = new CreatePublicQuotationDto();
    dto.email = 'cliente@empresa.com';
    dto.atencion = 'Juan Perez';
    dto.validezDias = 90; // Excede 60 días
    const item = new PublicQuotationItemDto();
    item.equipoId = 'eq-1';
    item.cantidad = 1;
    dto.items = [item];

    const errors = await validate(dto);
    const validezError = errors.find((e) => e.property === 'validezDias');
    expect(validezError).toBeDefined();
    expect(validezError?.constraints?.max).toBeDefined();
  });

  it('acepta validezDias dentro del rango permitido (1 a 60 días)', async () => {
    const dto = new CreatePublicQuotationDto();
    dto.email = 'cliente@empresa.com';
    dto.atencion = 'Juan Perez';
    dto.validezDias = 30; // Válido
    const item = new PublicQuotationItemDto();
    item.equipoId = 'eq-1';
    item.cantidad = 1;
    dto.items = [item];

    const errors = await validate(dto);
    const validezError = errors.find((e) => e.property === 'validezDias');
    expect(validezError).toBeUndefined();
  });

  it('delega acceptOnBehalf al servicio con parámetros y contexto', async () => {
    const service = (controller as any).quotationsService;
    service.acceptOnBehalf = jest.fn().mockResolvedValue({
      success: true,
      data: { cotizacionId: 'cot-1', contratoId: 'ctr-1' },
    });

    const mockReq = {
      headers: { 'user-agent': 'Chrome', 'x-request-id': 'req-123' },
      socket: { remoteAddress: '192.168.1.1' },
    } as any;

    const result = await controller.acceptOnBehalf(
      'cot-1',
      'emp-1',
      'user-1',
      { medioConfirmacion: 'WHATSAPP', notas: 'Confirmado por cliente' },
      mockReq,
    );

    expect(service.acceptOnBehalf).toHaveBeenCalledWith(
      'cot-1',
      'emp-1',
      'user-1',
      { medioConfirmacion: 'WHATSAPP', notas: 'Confirmado por cliente' },
      expect.objectContaining({ userAgent: 'Chrome', requestId: 'req-123' }),
    );
    expect(result.success).toBe(true);
  });
});
