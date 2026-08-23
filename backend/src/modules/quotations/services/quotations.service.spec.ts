import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('QuotationsService', () => {
  let service: QuotationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        {
          provide: PrismaService,
          useValue: {
            cotizacion: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            sucursal: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
