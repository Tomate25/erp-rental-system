import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      cotizacion: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      corteFacturacion: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      factura: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      pago: { create: jest.fn() },
      devolucion: { findMany: jest.fn(), findFirst: jest.fn() },
      auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      sucursal: { findFirst: jest.fn() },
      $executeRaw: jest.fn(),
      $transaction: jest.fn(async (cb) => cb(prisma)),
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

  it('muestra los cortes de cada contrato con el siguiente bloqueado hasta su fecha', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-20T18:00:00Z'));
    try {
      const contrato = {
        id: 'ctr-1', codigo: 'CTR-1', cliente: { id: 'cli-1', nombre: 'Cliente Ejemplo' },
        items: [], despachos: [], devoluciones: [], cotizacion: null,
      };
      prisma.corteFacturacion.findMany.mockResolvedValue([
        { id: 'cut-1', contratoId: 'ctr-1', contrato, numeroCorte: 1, estado: 'FACTURADO',
          fechaInicio: new Date('2026-09-01T12:00:00Z'), fechaFin: new Date('2026-09-23T12:00:00Z'),
          monto: 100, facturas: [{ id: 'inv-1', folio: 'FAC-1', estado: 'PENDIENTE' }] },
        { id: 'cut-2', contratoId: 'ctr-1', contrato, numeroCorte: 2, estado: 'PENDIENTE',
          fechaInicio: new Date('2026-09-23T12:00:00Z'), fechaFin: new Date('2026-10-15T12:00:00Z'),
          monto: 100, facturas: [] },
      ]);

      const result = await service.getContractCortes('emp-1');

      expect(prisma.corteFacturacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { estado: { not: 'ANULADO' }, contrato: { sucursal: { empresaId: 'emp-1' } } },
      }));
      expect(result[0].factura?.folio).toBe('FAC-1');
      expect(result[1].disponibleParaFacturar).toBe(false);
      expect(result[1].motivoBloqueo).toMatch(/termine el corte anterior/);
      expect(result[1].fechaDisponible).toEqual(new Date('2026-09-23T12:00:00Z'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('impide facturar el segundo corte si el primero sigue pendiente', async () => {
    const corte = {
      id: 'cut-2', contratoId: 'ctr-1', numeroCorte: 2, estado: 'PENDIENTE',
      fechaInicio: new Date('2026-09-01T12:00:00Z'), fechaFin: new Date('2026-09-02T12:00:00Z'),
      facturas: [], contrato: { codigo: 'CTR-1', items: [], despachos: [], devoluciones: [] },
    };
    prisma.corteFacturacion.findFirst.mockResolvedValue(corte);
    prisma.corteFacturacion.findMany.mockResolvedValue([{ id: 'cut-1' }]);

    await expect(service.invoiceCorte('cut-2', {}, 'emp-1')).rejects.toThrow(/corte anterior/);
    expect(prisma.factura.create).not.toHaveBeenCalled();
  });

  it('aísla por empresa los retornos con daños', async () => {
    prisma.devolucion.findMany.mockResolvedValue([]);
    await service.getDamageReturns('empresa-a');
    expect(prisma.devolucion.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { sucursal: { empresaId: 'empresa-a' }, items: { some: { daniosDetectados: true } } },
    }));
  });

  it('factura una sola vez los gastos reales completados y respaldados por inspección', async () => {
    const retorno = {
      id: 'ret-1', sucursalId: 'suc-1', contratoId: 'ctr-1', facturaCargo: null,
      contrato: { codigo: 'CTR-1', clienteId: 'cli-1', sucursal: { empresaId: 'emp-1' } },
      items: [{
        equipoId: 'eq-1', equipo: { modelo: 'Compactadora' },
        inspeccionesDanio: [{ cobrable: true }],
        reparaciones: [{
          id: 'rep-1', cobrableCliente: true, estado: 'COMPLETADO', costo: 625,
          gastos: [
            { tipo: 'REPUESTO', descripcion: 'Pieza dañada', monto: 400, comprobanteUrl: 'https://example.com/pieza' },
            { tipo: 'MANO_OBRA', descripcion: 'Instalación', monto: 175 },
            { tipo: 'MANO_OBRA', descripcion: 'Desgaste normal', monto: 50, cobrableCliente: false },
          ],
        }],
      }],
    };
    prisma.devolucion.findFirst.mockResolvedValue(retorno);
    prisma.factura.create.mockImplementation(({ data }: any) => ({ id: 'fac-dano-1', ...data }));

    const factura = await service.invoiceDamageReturn('ret-1', 'emp-1');

    expect(factura.total).toBe(575);
    expect(prisma.factura.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        devolucionId: 'ret-1', tipoFactura: 'CARGO_DANOS',
        subtotal: 500, iva: 75, total: 575,
        detalleCargo: expect.arrayContaining([expect.objectContaining({ descripcion: 'Pieza dañada', monto: 400 })]),
      }),
    }));
    expect(prisma.$executeRaw).toHaveBeenCalled();

    prisma.devolucion.findFirst.mockResolvedValue({ ...retorno, facturaCargo: { id: 'fac-dano-1' } });
    await expect(service.invoiceDamageReturn('ret-1', 'emp-1')).rejects.toThrow(/ya tiene una factura/);
  });

  it('rechaza un cargo si la reparación no está terminada', async () => {
    prisma.devolucion.findFirst.mockResolvedValue({
      id: 'ret-1', facturaCargo: null,
      items: [{
        inspeccionesDanio: [{ cobrable: true }],
        reparaciones: [{ cobrableCliente: true, estado: 'EN_PROCESO', costo: 100 }],
      }],
    });
    await expect(service.invoiceDamageReturn('ret-1', 'emp-1')).rejects.toThrow(/Termine la reparación/);
    expect(prisma.factura.create).not.toHaveBeenCalled();
  });

  it('permite facturar el primer corte desde el primer día por todo su período previsto', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-26T16:00:00Z'));
    try {
      const corte = {
        id: 'cut-1', contratoId: 'ctr-1', numeroCorte: 1, estado: 'PENDIENTE', monto: 500,
        fechaInicio: new Date('2026-09-26T12:00:00Z'),
        fechaFin: new Date('2026-10-01T12:00:00Z'), facturas: [],
        contrato: {
          id: 'ctr-1', codigo: 'CTR-1', clienteId: 'cli-1', sucursalId: 'suc-1',
          sucursal: { empresaId: 'emp-1' }, cotizacion: null,
          items: [{ equipoId: 'eq-1', cantidad: 1, dias: 1, precioRenta: 100, tipoTarifa: 'DIA' }],
          despachos: [{ fechaDespacho: new Date('2026-09-26T14:00:00Z'), items: [{ equipoId: 'eq-1', cantidad: 1 }] }],
          devoluciones: [],
        },
      };
      prisma.corteFacturacion.findFirst.mockResolvedValue(corte);
      prisma.corteFacturacion.findMany.mockResolvedValue([]);
      prisma.factura.create.mockImplementation(({ data }: any) => ({ id: 'inv-1', ...data }));

      const factura = await service.invoiceCorte('cut-1', { condicionPago: 'CREDITO' }, 'emp-1');

      expect(factura.total).toBe(500);
      expect(prisma.factura.create).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('bloquea el segundo corte facturado por adelantado hasta que acabe el plazo anterior', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-28T16:00:00Z'));
    try {
      prisma.corteFacturacion.findFirst.mockResolvedValue({
        id: 'cut-2', contratoId: 'ctr-1', numeroCorte: 2, estado: 'PENDIENTE',
        fechaInicio: new Date('2026-10-01T12:00:00Z'), fechaFin: new Date('2026-10-06T12:00:00Z'),
        facturas: [], contrato: { codigo: 'CTR-1', items: [], despachos: [], devoluciones: [] },
      });
      prisma.corteFacturacion.findMany.mockResolvedValue([
        { estado: 'FACTURADO', fechaFin: new Date('2026-10-01T12:00:00Z') },
      ]);

      await expect(service.invoiceCorte('cut-2', {}, 'emp-1')).rejects.toThrow(/plazo del corte anterior/);
      expect(prisma.factura.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('emite un corte diario por los días registrados desde el despacho físico', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T16:00:00Z'));
    try {
      const corte = {
        id: 'cut-daily', numeroCorte: 1, estado: 'PENDIENTE', monto: 253,
        fechaInicio: new Date('2026-09-25T12:00:00Z'),
        fechaFin: new Date('2026-10-17T12:00:00Z'),
        facturas: [],
        contrato: {
          id: 'contract-1', codigo: 'CTR-1', clienteId: 'client-1', sucursalId: 'branch-1',
          sucursal: { empresaId: 'emp-1' },
          cotizacion: { total: 759 },
          items: [{ equipoId: 'eq-1', cantidad: 1, dias: 1, precioRenta: 660, tipoTarifa: 'DIA' }],
          despachos: [{ fechaDespacho: new Date('2026-09-25T16:00:00Z'), items: [{ equipoId: 'eq-1', cantidad: 1 }] }],
          devoluciones: [],
        },
      };
      prisma.corteFacturacion.findFirst.mockResolvedValue(corte);
      prisma.corteFacturacion.update.mockResolvedValue({ ...corte, monto: 16698 });
      prisma.factura.create.mockImplementation(({ data }: any) => ({ id: 'invoice-1', ...data }));

      await service.invoiceCorte('cut-daily', { condicionPago: 'CREDITO' }, 'emp-1');

      expect(prisma.factura.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ subtotal: 14520, iva: 2178, total: 16698 }),
      }));
      expect(prisma.corteFacturacion.update).toHaveBeenCalledWith({
        where: { id: 'cut-daily' }, data: { monto: 16698 },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('no factura renta diaria cuando todavía no hay despacho físico', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T16:00:00Z'));
    try {
      prisma.corteFacturacion.findFirst.mockResolvedValue({
        id: 'cut-no-dispatch', numeroCorte: 1, estado: 'PENDIENTE', monto: 16698,
        fechaInicio: new Date('2026-09-25T12:00:00Z'),
        fechaFin: new Date('2026-10-17T12:00:00Z'),
        facturas: [],
        contrato: {
          codigo: 'CTR-1', sucursal: { empresaId: 'emp-1' },
          cotizacion: { total: 759 },
          items: [{ equipoId: 'eq-1', cantidad: 1, dias: 1, precioRenta: 660, tipoTarifa: 'DIA' }],
          despachos: [], devoluciones: [],
        },
      });
      await expect(service.invoiceCorte('cut-no-dispatch', {}, 'emp-1')).rejects.toThrow(/despacharse/);
      expect(prisma.factura.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('factura dos productos horarios y uno diario con detalle congelado del corte', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-26T18:00:00Z'));
    try {
      const start = new Date('2026-09-26T12:00:00Z');
      const cutEnd = new Date('2026-09-28T12:00:00Z');
      prisma.corteFacturacion.findFirst.mockResolvedValue({
        id: 'cut-mixed', contratoId: 'ctr-mixed', numeroCorte: 1,
        estado: 'PENDIENTE', monto: 2070, fechaInicio: start, fechaFin: cutEnd,
        facturas: [], contrato: {
          id: 'ctr-mixed', codigo: 'CTR-MIX', clienteId: 'client-1', sucursalId: 'branch-1',
          sucursal: { empresaId: 'emp-1' }, fechaInicio: start,
          fechaFin: new Date('2026-10-17T12:00:00Z'),
          cotizacion: { total: 1035, items: [
            { precioUnitario: 100, cantidad: 1, dias: 1, tipoCobro: 'POR_DIA' },
            { precioUnitario: 50, cantidad: 2, horas: 8, tipoCobro: 'POR_HORA' },
          ] },
          items: [
            { equipoId: 'daily', cantidad: 1, dias: 21, precioRenta: 100, tipoTarifa: 'DIA', equipo: { modelo: 'Diario' } },
            { equipoId: 'hourly', cantidad: 2, dias: 8, horasPactadas: 168, precioRenta: 50, tipoTarifa: 'HORA', equipo: { modelo: 'Horario' } },
          ],
          despachos: [{ fechaDespacho: start, items: [
            { equipoId: 'daily', cantidad: 1 }, { equipoId: 'hourly', cantidad: 2 },
          ] }],
          devoluciones: [],
        },
      });
      prisma.corteFacturacion.findMany.mockResolvedValue([]);
      prisma.factura.create.mockImplementation(({ data }: any) => ({ id: 'invoice-mixed', ...data }));

      const factura = await service.invoiceCorte('cut-mixed', {}, 'emp-1');
      expect(factura.total).toBe(2070);
      expect(factura.detalleCorte).toEqual([
        expect.objectContaining({ equipoId: 'daily', unidad: 'DIA', unidades: 2, importe: 230 }),
        expect.objectContaining({ equipoId: 'hourly', unidad: 'HORA', unidades: 32, importe: 1840 }),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('Validaciones Financieras y Pagos (AUD-002)', () => {
    it('rechaza montos de pago negativos, cero o NaN', async () => {
      prisma.factura = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'fac-1',
          estado: 'PENDIENTE',
          total: 1000,
          pagos: [],
        }),
      };

      await expect(
        service.registerPayment('fac-1', { monto: -50 } as any, 'empresa-a'),
      ).rejects.toThrow();
      await expect(
        service.registerPayment('fac-1', { monto: 0 } as any, 'empresa-a'),
      ).rejects.toThrow();
      await expect(
        service.registerPayment('fac-1', { monto: NaN } as any, 'empresa-a'),
      ).rejects.toThrow();
    });

    it('rechaza montos de pago que exceden el saldo pendiente', async () => {
      prisma.factura = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'fac-1',
          estado: 'PENDIENTE',
          total: 1000,
          pagos: [{ monto: 600 }], // Saldo pendiente = 400
        }),
      };

      await expect(
        service.registerPayment('fac-1', { monto: 450 }, 'empresa-a'),
      ).rejects.toThrow(/supera el saldo pendiente/);
    });

    it('recalcula subtotal e IVA fiscal del 15% al facturar un corte de contrato', async () => {
      const corteMock = {
        id: 'corte-1',
        contratoId: 'ctr-1',
        numeroCorte: 1,
        monto: 1150, // Monto total con IVA incluido
        estado: 'PENDIENTE',
        fechaInicio: new Date('2026-09-01T12:00:00Z'),
        fechaFin: new Date('2026-09-02T12:00:00Z'),
        contrato: {
          codigo: 'CTR-001',
          clienteId: 'cli-1',
          sucursalId: 'suc-1',
          sucursal: { empresaId: 'emp-1' },
        },
        facturas: [],
      };
      prisma.corteFacturacion.findFirst.mockResolvedValue(corteMock);

      const tx = {
        factura: {
          create: jest.fn().mockImplementation((args) => args.data),
        },
        corteFacturacion: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
        },
        auditoria: prisma.auditoria,
        $executeRaw: jest.fn(),
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      const result = await service.invoiceCorte(
        'corte-1',
        { tipoFactura: 'ESTANDAR' },
        'emp-1',
      );

      // El bloqueo FOR UPDATE del corte se ejecuta siempre (no es condicional).
      expect(tx.$executeRaw).toHaveBeenCalled();
      // 1150 / 1.15 = 1000 subtotal, 150 IVA (15%), 1150 total
      expect(result.subtotal).toBe(1000);
      expect(result.iva).toBe(150);
      expect(result.total).toBe(1150);
    });

    it('bloquea la fila con SELECT FOR UPDATE y registra pago parcial con saldo actualizado', async () => {
      const facturaMock = {
        id: 'fac-lock-1',
        folio: 'FAC-001',
        estado: 'PENDIENTE',
        total: 1000,
        pagos: [],
      };
      prisma.factura.findFirst.mockResolvedValue(facturaMock);
      prisma.pago.create.mockResolvedValue({ id: 'pago-1', monto: 400 });
      prisma.factura.update.mockImplementation((args: any) => ({
        ...facturaMock,
        estado: args.data.estado,
      }));

      const res = await service.registerPayment(
        'fac-lock-1',
        { monto: 400 },
        'emp-1',
      );

      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.pago.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            facturaId: 'fac-lock-1',
            monto: 400,
          }),
        }),
      );
      expect(prisma.factura.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fac-lock-1' },
          data: { estado: 'PAGADA_PARCIAL' },
        }),
      );
      expect(res.saldoPendiente).toBe(600);
      expect(res.totalPagado).toBe(400);
    });

    it('aborta el registro de pago si falla el evento de auditoría en la misma transacción', async () => {
      const facturaMock = {
        id: 'fac-audit-1',
        folio: 'FAC-AUD-001',
        empresaId: 'emp-1',
        estado: 'PENDIENTE',
        total: 1000,
        pagos: [],
      };
      prisma.factura.findFirst.mockResolvedValue(facturaMock);
      prisma.pago.create.mockResolvedValue({
        id: 'pago-audit-1',
        monto: 100,
        metodo: 'TRANSFERENCIA',
      });
      prisma.factura.update.mockResolvedValue({
        ...facturaMock,
        estado: 'PAGADA_PARCIAL',
      });
      prisma.auditoria.create.mockRejectedValue(new Error('audit unavailable'));

      await expect(
        service.registerPayment(
          'fac-audit-1',
          { monto: 100 },
          'emp-1',
          'admin-1',
        ),
      ).rejects.toThrow('audit unavailable');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('marca factura como PAGADA y bloquea transaccionalmente en markAsPaid', async () => {
      const facturaMock = {
        id: 'fac-lock-2',
        folio: 'FAC-002',
        estado: 'PENDIENTE',
        total: 500,
        pagos: [{ monto: 200 }],
      };
      prisma.factura.findFirst.mockResolvedValue(facturaMock);
      prisma.factura.update.mockResolvedValue({
        ...facturaMock,
        estado: 'PAGADA',
      });

      await service.markAsPaid('fac-lock-2', 'emp-1');

      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.pago.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            facturaId: 'fac-lock-2',
            monto: 300,
          }),
        }),
      );
      expect(prisma.factura.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fac-lock-2' },
          data: { estado: 'PAGADA' },
        }),
      );
    });

    it('rechaza pago concurrente si la factura ya fue liquidada a PAGADA en la transacción', async () => {
      prisma.factura.findFirst.mockResolvedValue({
        id: 'fac-lock-3',
        estado: 'PAGADA',
        total: 1000,
        pagos: [{ monto: 1000 }],
      });

      await expect(
        service.registerPayment('fac-lock-3', { monto: 100 }, 'emp-1'),
      ).rejects.toThrow(/ya se encuentra totalmente pagada/);
      expect(prisma.pago.create).not.toHaveBeenCalled();
    });

    it('procesa correctamente valores Prisma.Decimal(12, 2) en facturas y pagos parciales', async () => {
      const facturaDecimal = {
        id: 'fac-dec-1',
        folio: 'FAC-DEC-001',
        estado: 'PENDIENTE',
        total: new Prisma.Decimal('1250.75'),
        pagos: [{ monto: new Prisma.Decimal('250.25') }],
      };
      prisma.factura.findFirst.mockResolvedValue(facturaDecimal);
      prisma.pago.create.mockImplementation((args: any) => ({
        id: 'pago-dec-1',
        ...args.data,
      }));
      prisma.factura.update.mockImplementation((args: any) => ({
        ...facturaDecimal,
        estado: args.data.estado,
      }));

      // Saldo pendiente: 1250.75 - 250.25 = 1000.50
      const res = await service.registerPayment(
        'fac-dec-1',
        { monto: 500.25 },
        'emp-1',
      );

      expect(res.totalPagado).toBe(750.5);
      expect(res.saldoPendiente).toBe(500.25);
      expect(prisma.factura.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fac-dec-1' },
          data: { estado: 'PAGADA_PARCIAL' },
        }),
      );
    });

    it('liquida y transiciona a PAGADA con centavos exactos en abonos sucesivos (ej. 333.33 + 333.33 + 333.34)', async () => {
      const facturaTotal = new Prisma.Decimal('1000.00');
      const facturaInicial = {
        id: 'fac-round-1',
        folio: 'FAC-RND-001',
        estado: 'PAGADA_PARCIAL',
        total: facturaTotal,
        pagos: [
          { monto: new Prisma.Decimal('333.33') },
          { monto: new Prisma.Decimal('333.33') },
        ],
      };
      prisma.factura.findFirst.mockResolvedValue(facturaInicial);
      prisma.pago.create.mockImplementation((args: any) => ({
        id: 'pago-final',
        ...args.data,
      }));
      prisma.factura.update.mockImplementation((args: any) => ({
        ...facturaInicial,
        estado: args.data.estado,
      }));

      // Saldo restante: 1000.00 - 666.66 = 333.34
      const res = await service.registerPayment(
        'fac-round-1',
        { monto: 333.34 },
        'emp-1',
      );

      expect(res.totalPagado).toBe(1000);
      expect(res.saldoPendiente).toBe(0);
      expect(prisma.factura.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fac-round-1' },
          data: { estado: 'PAGADA' },
        }),
      );
    });
  });
});
