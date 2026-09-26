import { Test, TestingModule } from '@nestjs/testing';
import {
  CreateContractFromQuotationDto,
  CreateDirectContractDto,
} from '../dto/create-contract.dto';
import { ContractsService } from '../services/contracts.service';
import { ContractsController } from './contracts.controller';

describe('ContractsController', () => {
  const empresaId = 'empresa-id';
  const usuarioId = 'usuario-id';
  const contratoId = 'contrato-id';

  let controller: ContractsController;
  let contractsService: {
    createDirect: jest.Mock;
    createFromQuotation: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    openContract: jest.Mock;
    finalizeContract: jest.Mock;
  };

  beforeEach(async () => {
    contractsService = {
      createDirect: jest.fn(),
      createFromQuotation: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      openContract: jest.fn(),
      finalizeContract: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [{ provide: ContractsService, useValue: contractsService }],
    }).compile();

    controller = module.get(ContractsController);
  });

  it('creates a direct contract with the complete equipment item DTO', async () => {
    const dto: CreateDirectContractDto = {
      clienteId: '11111111-1111-4111-8111-111111111111',
      fechaInicio: '2026-09-10',
      fechaFin: '2026-09-15',
      items: [
        {
          equipoId: '22222222-2222-4222-8222-222222222222',
          modelo: 'CAT-320',
          precioRenta: 500,
          cantidad: 1,
          dias: 5,
        },
      ],
    };
    const contract = { id: contratoId, codigo: 'CTR-2026-0001' };
    contractsService.createDirect.mockResolvedValue(contract);

    await expect(
      controller.createDirect(dto, empresaId, usuarioId),
    ).resolves.toEqual({
      success: true,
      message: 'Contrato directo CTR-2026-0001 generado exitosamente',
      data: contract,
    });
    expect(contractsService.createDirect).toHaveBeenCalledWith(
      dto,
      empresaId,
      usuarioId,
    );
  });

  it('creates a contract from an approved quotation', async () => {
    const dto: CreateContractFromQuotationDto = {
      cotizacionId: '33333333-3333-4333-8333-333333333333',
      fechaInicio: '2026-09-10',
      fechaFin: '2026-09-15',
      depositoGarantia: 1000,
    };
    const contract = { id: contratoId, codigo: 'CTR-2026-0002' };
    contractsService.createFromQuotation.mockResolvedValue(contract);

    await expect(
      controller.createFromQuotation(dto, empresaId, usuarioId),
    ).resolves.toEqual({
      success: true,
      message:
        'Contrato CTR-2026-0002 generado exitosamente a partir de la cotización Aprobada',
      data: contract,
    });
    expect(contractsService.createFromQuotation).toHaveBeenCalledWith(
      dto,
      empresaId,
      usuarioId,
    );
  });

  it('findAll passes the authenticated company id to the service', async () => {
    const contracts = [{ id: contratoId }];
    contractsService.findAll.mockResolvedValue(contracts);

    await expect(controller.findAll(empresaId)).resolves.toEqual({
      success: true,
      data: contracts,
    });
    expect(contractsService.findAll).toHaveBeenCalledWith(empresaId);
  });

  it('findOne passes the contract and authenticated company ids to the service', async () => {
    const contract = { id: contratoId };
    contractsService.findOne.mockResolvedValue(contract);

    await expect(controller.findOne(contratoId, empresaId)).resolves.toEqual({
      success: true,
      data: contract,
    });
    expect(contractsService.findOne).toHaveBeenCalledWith(
      contratoId,
      empresaId,
    );
  });

  it('openContract passes the contract id, dto, company and user to the service', async () => {
    const contract = { id: contratoId, codigo: 'CTR-2026-0001', estado: 'ACTIVO' };
    contractsService.openContract.mockResolvedValue(contract);

    await expect(
      controller.openContract(contratoId, { periodoDias: 15 }, empresaId, usuarioId),
    ).resolves.toEqual({
      success: true,
      message: 'Contrato CTR-2026-0001 abierto exitosamente y cortes de facturación configurados',
      data: contract,
    });
    expect(contractsService.openContract).toHaveBeenCalledWith(
      contratoId,
      15,
      empresaId,
      usuarioId,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    await controller.openContract(
      contratoId,
      {
        periodoDias: 20,
        cantidadCortes: 4,
        fechaInicio: '2026-03-25',
        fechaFin: '2026-05-25',
      },
      empresaId,
      usuarioId,
    );
    expect(contractsService.openContract).toHaveBeenCalledWith(
      contratoId,
      20,
      empresaId,
      usuarioId,
      4,
      '2026-03-25',
      '2026-05-25',
      undefined,
    );
  });

  it('finalizeContract marks the contract as FINALIZADO', async () => {
    const contract = { id: contratoId, codigo: 'CTR-2026-0001', estado: 'FINALIZADO' };
    contractsService.finalizeContract.mockResolvedValue(contract);

    await expect(
      controller.finalizeContract(contratoId, empresaId, usuarioId),
    ).resolves.toEqual({
      success: true,
      message: 'Contrato CTR-2026-0001 finalizado exitosamente',
      data: contract,
    });
    expect(contractsService.finalizeContract).toHaveBeenCalledWith(
      contratoId,
      empresaId,
      usuarioId,
    );
  });
});
