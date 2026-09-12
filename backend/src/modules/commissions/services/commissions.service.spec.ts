import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommissionsService } from './commissions.service';

describe('CommissionsService', () => {
  let prisma: any;
  let service: CommissionsService;

  beforeEach(() => {
    prisma = {
      reglaComision: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      usuario: { findFirst: jest.fn(), findMany: jest.fn() },
      cotizacion: { findMany: jest.fn() },
    };
    service = new CommissionsService(prisma as unknown as PrismaService);
  });

  it('crea una regla dentro de la empresa autenticada', async () => {
    const dto = {
      nombreVendedor: ' David ', montoMinimo: 1, montoMaximo: 800000, porcentaje: 3,
    };
    prisma.reglaComision.create.mockResolvedValue({ id: 'regla-a' });

    await service.create(dto, 'empresa-a');

    expect(prisma.reglaComision.create).toHaveBeenCalledWith({
      data: {
        nombreVendedor: 'David', montoMinimo: 1, montoMaximo: 800000,
        porcentaje: 3, empresaId: 'empresa-a', activo: true,
      },
    });
  });

  it('rechaza crear una regla para un usuario de otra empresa', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(service.create({
      usuarioId: 'usuario-ajeno', montoMinimo: 1, porcentaje: 2,
    }, 'empresa-a')).rejects.toThrow(NotFoundException);
    expect(prisma.reglaComision.create).not.toHaveBeenCalled();
  });

  it('rechaza tramos cuyo máximo sea menor que el mínimo', async () => {
    await expect(service.create({
      montoMinimo: 1000, montoMaximo: 500, porcentaje: 2,
    }, 'empresa-a')).rejects.toThrow(BadRequestException);
  });

  it('lista reglas usando filtro estricto por empresa', async () => {
    prisma.reglaComision.findMany.mockResolvedValue([]);

    await service.findAll('empresa-a');

    expect(prisma.reglaComision.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'empresa-a' },
      orderBy: [{ nombreVendedor: 'asc' }, { montoMinimo: 'asc' }],
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });
  });

  it('rechaza actualizar una regla perteneciente a otra empresa', async () => {
    prisma.reglaComision.findFirst.mockResolvedValue(null);

    await expect(service.update('regla-ajena', { porcentaje: 5 }, 'empresa-a'))
      .rejects.toThrow(NotFoundException);
    expect(prisma.reglaComision.update).not.toHaveBeenCalled();
  });

  it('rechaza eliminar una regla perteneciente a otra empresa', async () => {
    prisma.reglaComision.findFirst.mockResolvedValue(null);

    await expect(service.remove('regla-ajena', 'empresa-a')).rejects.toThrow(NotFoundException);
    expect(prisma.reglaComision.delete).not.toHaveBeenCalled();
  });

  it('actualiza una regla propia conservando los límites no enviados', async () => {
    prisma.reglaComision.findFirst.mockResolvedValue({
      id: 'regla-a', empresaId: 'empresa-a', montoMinimo: 1,
      montoMaximo: 800000, porcentaje: 3,
    });
    prisma.reglaComision.update.mockResolvedValue({ id: 'regla-a', porcentaje: 2.5 });

    await service.update('regla-a', { porcentaje: 2.5 }, 'empresa-a');

    expect(prisma.reglaComision.findFirst).toHaveBeenCalledWith({
      where: { id: 'regla-a', empresaId: 'empresa-a' },
    });
    expect(prisma.reglaComision.update).toHaveBeenCalledWith({
      where: { id: 'regla-a' }, data: { porcentaje: 2.5 },
    });
  });

  it('siembra exactamente los cinco tramos predeterminados en la empresa', async () => {
    prisma.reglaComision.findFirst.mockResolvedValue(null);
    prisma.reglaComision.create.mockImplementation(({ data }) => Promise.resolve(data));

    const result = await service.seedDefaultRules('empresa-a');

    expect(result).toHaveLength(5);
    expect(prisma.reglaComision.create).toHaveBeenCalledTimes(5);
    expect(prisma.reglaComision.create).toHaveBeenNthCalledWith(1, {
      data: {
        nombreVendedor: 'DAVID', montoMinimo: 1, montoMaximo: 800000,
        porcentaje: 3, empresaId: 'empresa-a', usuarioId: null, activo: true,
      },
    });
    expect(prisma.reglaComision.create).toHaveBeenNthCalledWith(5, {
      data: {
        nombreVendedor: 'NYLSKA', montoMinimo: 300001, montoMaximo: null,
        porcentaje: 1, empresaId: 'empresa-a', usuarioId: null, activo: true,
      },
    });
  });

  it('la siembra es idempotente y reactiva reglas existentes', async () => {
    prisma.reglaComision.findFirst.mockImplementation(({ where }) => Promise.resolve({
      id: `${where.nombreVendedor}-${where.montoMinimo}`,
    }));
    prisma.reglaComision.update.mockImplementation(({ data }) => Promise.resolve(data));

    await service.seedDefaultRules('empresa-a');

    expect(prisma.reglaComision.create).not.toHaveBeenCalled();
    expect(prisma.reglaComision.update).toHaveBeenCalledTimes(5);
    expect(prisma.reglaComision.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { porcentaje: 3, activo: true },
    }));
  });

  const prepararCalculo = (nombre: string, reglas: any[]) => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 'usuario-a', nombre, apellido: 'Vendedor' });
    prisma.reglaComision.findMany.mockResolvedValue(reglas);
  };

  it.each([
    [1, 3, 0.03],
    [800000, 3, 24000],
    [800001, 2, 16000.02],
    [1200000, 2, 24000],
    [1200001, 1, 12000.01],
  ])('calcula el tramo de David para ventas de %s', async (monto, porcentaje, comision) => {
    prepararCalculo('David', [{
      id: 'regla-david', usuarioId: null, nombreVendedor: 'DAVID', porcentaje,
    }]);

    await expect(service.calculateCommission('empresa-a', 'usuario-a', monto))
      .resolves.toEqual({ porcentaje, montoComision: comision });
  });

  it.each([
    [300000, 2, 6000],
    [300001, 1, 3000.01],
  ])('calcula el tramo de Nylska para ventas de %s', async (monto, porcentaje, comision) => {
    prepararCalculo('Nylska', [{
      id: 'regla-nylska', usuarioId: null, nombreVendedor: 'NYLSKA', porcentaje,
    }]);

    await expect(service.calculateCommission('empresa-a', 'usuario-a', monto))
      .resolves.toEqual({ porcentaje, montoComision: comision });
  });

  it('prioriza la regla específica del usuario sobre la nominal y la general', async () => {
    prepararCalculo('David', [
      { id: 'general', usuarioId: null, nombreVendedor: null, porcentaje: 1 },
      { id: 'nominal', usuarioId: null, nombreVendedor: 'DAVID', porcentaje: 2 },
      { id: 'personal', usuarioId: 'usuario-a', nombreVendedor: null, porcentaje: 4 },
    ]);

    await expect(service.calculateCommission('empresa-a', 'usuario-a', 100000))
      .resolves.toEqual({ porcentaje: 4, montoComision: 4000 });
  });

  it('usa una regla general si no existe una específica ni nominal', async () => {
    prepararCalculo('Otro', [
      { id: 'general', usuarioId: null, nombreVendedor: null, porcentaje: 1.5 },
      { id: 'otro-vendedor', usuarioId: null, nombreVendedor: 'DAVID', porcentaje: 3 },
    ]);

    await expect(service.calculateCommission('empresa-a', 'usuario-a', 1000))
      .resolves.toEqual({ porcentaje: 1.5, montoComision: 15 });
  });

  it('calcula consultando únicamente usuario y reglas de la empresa autenticada', async () => {
    prepararCalculo('David', [
      { id: 'regla-a', usuarioId: null, nombreVendedor: 'DAVID', porcentaje: 3 },
    ]);

    await service.calculateCommission('empresa-a', 'usuario-a', 500000);

    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 'usuario-a', empresaId: 'empresa-a' },
      select: { id: true, nombre: true, apellido: true },
    });
    expect(prisma.reglaComision.findMany).toHaveBeenCalledWith({
      where: {
        empresaId: 'empresa-a', activo: true, montoMinimo: { lte: 500000 },
        OR: [{ montoMaximo: null }, { montoMaximo: { gte: 500000 } }],
      },
      orderBy: { montoMinimo: 'desc' },
    });
  });

  it('rechaza calcular para un usuario de otra empresa', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(service.calculateCommission('empresa-a', 'usuario-ajeno', 1000))
      .rejects.toThrow(NotFoundException);
    expect(prisma.reglaComision.findMany).not.toHaveBeenCalled();
  });

  it('rechaza montos de ventas negativos', async () => {
    await expect(service.calculateCommission('empresa-a', 'usuario-a', -1))
      .rejects.toThrow(BadRequestException);
    expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
  });

  it('informa cuando no existe un tramo aplicable', async () => {
    prepararCalculo('David', []);

    await expect(service.calculateCommission('empresa-a', 'usuario-a', 0))
      .rejects.toThrow(NotFoundException);
  });

  it('seedRulesForAllSellers siembra escala universal y por vendedor para asesores comerciales', async () => {
    prisma.reglaComision.findFirst.mockResolvedValue(null);
    prisma.reglaComision.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rule-id', ...data }));
    prisma.usuario.findMany.mockResolvedValue([
      { id: 'vendedor-1', nombre: 'Carlos', apellido: 'Sánchez' },
    ]);

    const result = await service.seedRulesForAllSellers('empresa-a');

    // 3 tramos universales + 3 tramos para vendedor-1 = 6
    expect(result).toHaveLength(6);
    expect(prisma.reglaComision.create).toHaveBeenCalledTimes(6);
  });

  it('getTeamSettlement calcula liquidación real del equipo comercial con ventas ganadas', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      { id: 'vendedor-1', nombre: 'David', apellido: 'Centeno', email: 'david@rental.com' },
      { id: 'vendedor-2', nombre: 'Bismarck', apellido: 'Murillo', email: 'bismarck@rental.com' },
    ]);

    prisma.cotizacion.findMany.mockResolvedValue([
      {
        id: 'cot-1',
        asesorId: 'vendedor-1',
        total: 500000,
        estado: 'ACEPTADA',
        contratos: [{ id: 'con-1' }],
      },
      {
        id: 'cot-2',
        asesorId: 'vendedor-1',
        total: 100000,
        estado: 'PENDIENTE',
        contratos: [],
      },
    ]);

    prisma.reglaComision.findMany.mockResolvedValue([
      {
        id: 'regla-1',
        empresaId: 'empresa-a',
        usuarioId: null,
        nombreVendedor: null,
        montoMinimo: 1,
        montoMaximo: 800000,
        porcentaje: 3,
        activo: true,
      },
    ]);

    const settlement = await service.getTeamSettlement('empresa-a');

    expect(settlement.resumen.totalVendidoEquipo).toBe(500000);
    expect(settlement.resumen.totalComisionesEquipo).toBe(15000); // 500,000 * 3%
    expect(settlement.resumen.totalContratos).toBe(1);
    expect(settlement.resumen.vendedoresConVentas).toBe(1);
    expect(settlement.resumen.totalVendedores).toBe(2);
    expect(settlement.liquidaciones).toHaveLength(2);

    const david = settlement.liquidaciones.find((l) => l.usuarioId === 'vendedor-1');
    expect(david?.totalVendido).toBe(500000);
    expect(david?.porcentajeAplicado).toBe(3);
    expect(david?.comisionTotal).toBe(15000);
    expect(david?.estado).toBe('POR_LIQUIDAR');

    const bismarck = settlement.liquidaciones.find((l) => l.usuarioId === 'vendedor-2');
    expect(bismarck?.totalVendido).toBe(0);
    expect(bismarck?.comisionTotal).toBe(0);
    expect(bismarck?.estado).toBe('SIN_VENTAS');
  });
});
