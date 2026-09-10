import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      cotizacion: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      corteFacturacion: { findMany: jest.fn(), findFirst: jest.fn() },
      factura: { create: jest.fn() },
      sucursal: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('limita los cortes pendientes a contratos de la empresa autenticada', async () => {
    prisma.corteFacturacion.findMany.mockResolvedValue([]);

    await service.getPendingCortes('empresa-a');

    expect(prisma.corteFacturacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          estado: 'PENDIENTE',
          contrato: { sucursal: { empresaId: 'empresa-a' } },
        },
      }),
    );
  });
});
