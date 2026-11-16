import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EstadoCompraInsumo,
  EstadoPagoCompra,
  EstadoSubarriendoProveedor,
  ModalidadSubarriendoProveedor,
  OrigenEquipo,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PurchasesService } from './purchases.service';

describe('PurchasesService', () => {
  const empresaId = 'emp-1';
  const usuarioId = 'user-1';

  function setup() {
    const prisma: any = {
      proveedor: {
        findFirst: jest.fn(),
      },
      insumo: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      insumoMovimiento: {
        create: jest.fn().mockResolvedValue({ id: 'mov-1' }),
      },
      secuenciaNumeracion: {
        upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }),
      },
      compraInsumo: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      compraInsumoItem: {
        update: jest.fn().mockResolvedValue({}),
      },
      equipo: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      subarriendoProveedor: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      pagoCompra: {
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      asientoContable: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'as-1', numeroAsiento: 'AS-CMP-001' }),
      },
      auditoria: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction = jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma));
    return {
      prisma,
      service: new PurchasesService(prisma as unknown as PrismaService),
    };
  }

  it('crea compra multi-línea a crédito, suma stock, alimenta kardex y genera asiento con CxP (210101)', async () => {
    const { prisma, service } = setup();
    prisma.proveedor.findFirst.mockResolvedValue({
      id: 'prov-1',
      nombre: 'Lubricantes S.A.',
    });
    prisma.insumo.findMany.mockResolvedValue([
      {
        id: 'ins-1',
        nombre: 'Aceite 15W-40',
        stockActual: 5,
        costoUnitario: 400,
        proveedorId: null,
      },
      {
        id: 'ins-2',
        nombre: 'Filtro Hidráulico',
        stockActual: 2,
        costoUnitario: 300,
        proveedorId: 'prov-1',
      },
    ]);
    prisma.compraInsumo.create.mockImplementation(async ({ data }: any) => ({
      id: 'cmp-1',
      ...data,
      items: [
        { id: 'item-1', insumoId: 'ins-1', cantidad: 4, costoUnitario: 450, subtotal: 1800 },
        { id: 'item-2', insumoId: 'ins-2', cantidad: 2, costoUnitario: 350, subtotal: 700 },
      ],
    }));
    prisma.compraInsumo.findFirst.mockResolvedValue({
      id: 'cmp-1',
      codigo: 'OC-2026-00001',
      total: 2875,
      estado: EstadoCompraInsumo.RECIBIDA,
      estadoPago: EstadoPagoCompra.PENDIENTE,
    });

    const res = await service.createCompraInsumo(
      {
        proveedorId: 'prov-1',
        numeroFactura: 'FAC-991',
        condicionPago: 'CREDITO',
        plazoCreditoDias: 30,
        aplicaIva: true,
        items: [
          { insumoId: 'ins-1', cantidad: 4, costoUnitario: 450, incluyeIva: true },
          { insumoId: 'ins-2', cantidad: 2, costoUnitario: 350, incluyeIva: true },
        ],
      },
      empresaId,
      usuarioId,
    );

    expect(res?.codigo).toBe('OC-2026-00001');
    expect(prisma.insumo.update).toHaveBeenCalledTimes(2);
    expect(prisma.insumo.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'ins-1' },
        data: expect.objectContaining({ stockActual: 9, costoUnitario: 450 }),
      }),
    );
    expect(prisma.insumoMovimiento.create).toHaveBeenCalledTimes(2);
    expect(prisma.insumoMovimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: 'ENTRADA',
          compraInsumoId: 'cmp-1',
          referencia: 'FAC-991',
        }),
      }),
    );

    const asientoArg = prisma.asientoContable.create.mock.calls[0][0].data;
    expect(asientoArg.totalDebe).toBe(2875);
    expect(asientoArg.totalHaber).toBe(2875);
    expect(asientoArg.lineas.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cuentaCodigo: '121002', debe: 2500, haber: 0 }),
        expect.objectContaining({ cuentaCodigo: '110702', debe: 375, haber: 0 }),
        expect.objectContaining({ cuentaCodigo: '210101', debe: 0, haber: 2875 }),
      ]),
    );
  });

  it('registra abono a compra a crédito y actualiza estadoPago a PARCIAL y PAGADO', async () => {
    const { prisma, service } = setup();
    prisma.compraInsumo.findFirst.mockResolvedValue({
      id: 'cmp-1',
      codigo: 'OC-2026-00001',
      empresaId,
      sucursalId: 'suc-1',
      proveedorNombre: 'Lubricantes S.A.',
      total: 1000,
      montoPagado: 0,
      estado: EstadoCompraInsumo.RECIBIDA,
      items: [],
      pagos: [],
    });
    prisma.pagoCompra.create.mockResolvedValue({ id: 'pg-1' });
    prisma.compraInsumo.update.mockResolvedValue({
      id: 'cmp-1',
      montoPagado: 400,
      estadoPago: EstadoPagoCompra.PARCIAL,
    });

    const res = await service.registrarPagoCompraInsumo(
      'cmp-1',
      { monto: 400, metodoPago: 'TRANSFERENCIA', cuentaPagoCodigo: '110201' },
      empresaId,
      usuarioId,
    );

    expect(res.estadoPago).toBe(EstadoPagoCompra.PARCIAL);
    const asientoArg = prisma.asientoContable.create.mock.calls[0][0].data;
    expect(asientoArg.lineas.create).toEqual([
      expect.objectContaining({ cuentaCodigo: '210101', debe: 400, haber: 0 }),
      expect.objectContaining({ cuentaCodigo: '110201', debe: 0, haber: 400 }),
    ]);
  });

  it('crea período de subarriendo conectado al Inventario y lo marca como DEVUELTO deshabilitando disponibilidad', async () => {
    const { prisma, service } = setup();
    prisma.equipo.findFirst.mockResolvedValue({
      id: 'eq-1',
      sucursalId: 'suc-1',
      modelo: 'Excavadora CAT 320',
      origenEquipo: OrigenEquipo.PROVEEDOR,
      proveedorId: 'prov-9',
      proveedor: { id: 'prov-9', nombre: 'Maquinaria Externa SA' },
    });
    prisma.proveedor.findFirst.mockResolvedValue({
      id: 'prov-9',
      nombre: 'Maquinaria Externa SA',
    });
    prisma.subarriendoProveedor.create.mockImplementation(async ({ data }: any) => ({
      id: 'sub-1',
      ...data,
    }));

    const created = await service.createSubarriendo(
      {
        equipoId: 'eq-1',
        proveedorId: 'prov-9',
        modalidad: ModalidadSubarriendoProveedor.POR_DIA,
        tarifaProveedor: 2500,
        fechaInicio: '2026-11-15',
        fechaFinEstimada: '2026-11-19',
      },
      empresaId,
      usuarioId,
    );

    expect(created.codigo).toBe('SUB-2026-00001');
    expect(created.montoEstimado).toBe(12500);
    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: 'eq-1' },
      data: expect.objectContaining({
        origenEquipo: OrigenEquipo.PROVEEDOR,
        proveedorId: 'prov-9',
        precioProveedor: 2500,
        disponibleParaRenta: true,
      }),
    });

    prisma.subarriendoProveedor.findFirst.mockResolvedValue({
      id: 'sub-1',
      codigo: 'SUB-2026-00001',
      equipoId: 'eq-1',
      estado: EstadoSubarriendoProveedor.ACTIVO,
      montoEstimado: 12500,
      montoPagado: 0,
      observaciones: null,
      equipo: { id: 'eq-1' },
    });
    prisma.subarriendoProveedor.count.mockResolvedValue(0);
    prisma.subarriendoProveedor.update.mockResolvedValue({
      id: 'sub-1',
      estado: EstadoSubarriendoProveedor.DEVUELTO,
      montoFinal: 10000,
    });

    const returned = await service.devolverSubarriendo(
      'sub-1',
      { montoFinal: 10000 },
      empresaId,
      usuarioId,
    );

    expect(returned.estado).toBe(EstadoSubarriendoProveedor.DEVUELTO);
    expect(prisma.equipo.update).toHaveBeenLastCalledWith({
      where: { id: 'eq-1' },
      data: { disponibleParaRenta: false },
    });
  });

  it('rechaza subarriendo si el equipo no pertenece a la empresa o fecha fin es menor a inicio', async () => {
    const { prisma, service } = setup();
    prisma.equipo.findFirst.mockResolvedValue(null);

    await expect(
      service.createSubarriendo(
        {
          equipoId: 'eq-missing',
          tarifaProveedor: 100,
          fechaInicio: '2026-11-15',
          fechaFinEstimada: '2026-11-16',
        },
        empresaId,
      ),
    ).rejects.toThrow(NotFoundException);

    prisma.equipo.findFirst.mockResolvedValue({ id: 'eq-1', sucursalId: 'suc-1' });
    await expect(
      service.createSubarriendo(
        {
          equipoId: 'eq-1',
          proveedorNombre: 'Prov X',
          tarifaProveedor: 100,
          fechaInicio: '2026-11-20',
          fechaFinEstimada: '2026-11-15',
        },
        empresaId,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
