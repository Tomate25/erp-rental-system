import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            cotizacion: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
            corteFacturacion: { findMany: jest.fn(), findFirst: jest.fn() },
            factura: { create: jest.fn() },
            sucursal: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
