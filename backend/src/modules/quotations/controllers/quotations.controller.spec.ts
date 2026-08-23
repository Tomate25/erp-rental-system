import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from '../services/quotations.service';

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
});
