import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingService } from './accounting.service';

describe('Accounting tenant isolation and new features', () => {
  function setup() {
    const prisma: any = {
      factura: { findMany: jest.fn().mockResolvedValue([]) },
      mantenimiento: { findMany: jest.fn().mockResolvedValue([]) },
      inspeccionDano: { findMany: jest.fn().mockResolvedValue([]) },
      pago: { findMany: jest.fn().mockResolvedValue([]) },
      contrato: { findMany: jest.fn().mockResolvedValue([]) },
      equipo: { findMany: jest.fn().mockResolvedValue([]) },
      detalleContrato: { findMany: jest.fn().mockResolvedValue([]) },
      cuentaContable: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      saldoInicialContable: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction = jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma));
    return {
      prisma,
      service: new AccountingService(prisma as unknown as PrismaService),
    };
  }

  const reports = [
    'getCuentasPorCobrar',
    'getCuentasPorPagar',
    'getEstadoResultados',
    'getBalanceGeneral',
    'getBalanzaComprobacion',
    'getLibroDiario',
    'getSaldosIniciales',
    'getCuentasBancarias',
  ] as const;

  describe.each(reports)('%s', (report) => {
    it.each([undefined, null, '', '   '])(
      'rejects missing tenant %s without running global queries',
      async (empresaId) => {
        const { prisma, service } = setup();
        await expect(
          service[report](empresaId as unknown as string),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.factura.findMany).not.toHaveBeenCalled();
        expect(prisma.saldoInicialContable.findMany).not.toHaveBeenCalled();
      },
    );
  });

  it('rejects exportQuickBooks with missing tenant', async () => {
    const { service } = setup();
    await expect(service.exportQuickBooks('', 'IIF')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns complete official BM chart of accounts (119 detail / 163 total nodes)', async () => {
    const { service } = setup();
    const res = await service.getCatalogoCuentas();
    expect(res.total).toBe(163);
    expect(res.totalDetalle).toBe(119);
    expect(res.totalMayor).toBe(30);
    expect(res.cuentas.length).toBe(163);

    // Verify root classes (Nivel 1)
    const nivel1 = await service.getCatalogoCuentas(1);
    expect(nivel1.total).toBe(6); // 1 Activo, 2 Pasivo, 3 Capital, 4 Ingresos, 5 Costo, 6 Gastos

    // Verify search with new BM catalog naming
    const searchRes = await service.getCatalogoCuentas(undefined, 'alquiler');
    expect(searchRes.total).toBeGreaterThan(0);
    expect(searchRes.cuentas.some((c) => c.codigo === '410101')).toBe(true);
  });

  it('generates balanza de comprobacion combining initial balances and movements without double counting', async () => {
    const { prisma, service } = setup();
    prisma.saldoInicialContable.findMany.mockResolvedValue([
      {
        cuentaCodigo: '110101',
        fechaCorte: new Date('2026-10-31T12:00:00Z'),
        deudor: 5000,
        acreedor: 0,
      },
      {
        cuentaCodigo: '310201',
        fechaCorte: new Date('2026-10-31T12:00:00Z'),
        deudor: 0,
        acreedor: 5000,
      },
    ]);
    prisma.factura.findMany.mockResolvedValue([
      {
        id: 'fac-1',
        subtotal: 1000,
        iva: 150,
        total: 1150,
        retencionIva: 20,
        condicionPago: 'CONTADO',
        sucursalId: 'km10',
        pagos: [],
      },
    ]);

    const balanza = await service.getBalanzaComprobacion('empresa-test');
    expect(balanza.cuadrada).toBe(true);
    expect(balanza.totalSaldoInicialDebe).toBe(5000);
    expect(balanza.totalSaldoInicialHaber).toBe(5000);
    expect(balanza.totalDebe).toBe(1150);
    expect(balanza.totalHaber).toBe(1150);
    expect(balanza.totalSaldoFinalDeudor).toBe(6150);
    expect(balanza.totalSaldoFinalAcreedor).toBe(6150);

    // Mayor 1101 rolls up child 110101
    const mayorCaja = balanza.cuentas.find((c) => c.codigo === '1101');
    expect(mayorCaja?.saldoInicialDebe).toBe(5000);
    expect(mayorCaja?.movimientoDebe).toBe(1130);
    expect(mayorCaja?.saldoFinalDeudor).toBe(6130);
  });

  it('exports transactions to QuickBooks IIF and CSV formats', async () => {
    const { prisma, service } = setup();
    prisma.factura.findMany.mockResolvedValue([
      {
        id: 'fac-1',
        folio: 'FCR-KM10-001',
        subtotal: 1000,
        iva: 150,
        total: 1150,
        retencionIva: 0,
        condicionPago: 'CREDITO',
        sucursalId: 'km10',
        fechaEmision: new Date('2026-10-10'),
        cliente: { nombre: 'Cliente Alfa' },
        pagos: [],
      },
    ]);

    const iifRes = await service.exportQuickBooks('empresa-test', 'IIF');
    expect(iifRes.content).toContain('!TRNS');
    expect(iifRes.content).toContain('!SPL');
    expect(iifRes.content).toContain('!ENDTRNS');
    expect(iifRes.content).toContain('FCR-KM10-001');

    const csvRes = await service.exportQuickBooks('empresa-test', 'CSV');
    expect(csvRes.content).toContain('JournalNo,JournalDate,AccountName');
    expect(csvRes.content).toContain('FCR-KM10-001');
  });

  it.each(['company-a', 'company-b'])(
    'scopes all balance and income statement sources to %s',
    async (empresaId) => {
      const { prisma, service } = setup();
      await service.getBalanceGeneral(empresaId);
      await service.getEstadoResultados(empresaId);

      for (const [query] of prisma.factura.findMany.mock.calls) {
        expect(query.where).toEqual({ empresaId, cliente: { empresaId } });
      }
      expect(prisma.factura.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.pago.findMany).toHaveBeenCalledWith({
        where: { factura: { empresaId, cliente: { empresaId } } },
      });
      expect(prisma.contrato.findMany).toHaveBeenCalledWith({
        where: { sucursal: { empresaId }, cliente: { empresaId } },
      });
      expect(prisma.equipo.findMany).toHaveBeenCalledWith({
        where: { empresaId, sucursal: { empresaId } },
      });
      for (const [query] of prisma.mantenimiento.findMany.mock.calls) {
        expect(query.where).toEqual({
          equipo: { empresaId, sucursal: { empresaId } },
        });
      }
      expect(prisma.mantenimiento.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.inspeccionDano.findMany).toHaveBeenCalledWith({
        where: {
          detalleDevolucion: {
            equipo: { empresaId },
            devolucion: {
              sucursal: { empresaId },
              contrato: { sucursal: { empresaId }, cliente: { empresaId } },
            },
          },
        },
      });
    },
  );

  it('keeps receivables, cash and damage income separated between two companies', async () => {
    const { prisma, service } = setup();
    const invoices = ['company-a', 'company-b'].map((empresaId, index) => ({
      id: `invoice-${empresaId}`,
      empresaId,
      cliente: { empresaId, nombre: empresaId },
      clienteId: `client-${empresaId}`,
      total: (index + 1) * 100,
      subtotal: (index + 1) * 100,
      iva: 0,
      pagos: [],
      estado: 'PENDIENTE',
      fechaVence: new Date('2099-01-01'),
    }));
    invoices.push({
      ...invoices[1],
      id: 'mismatched-invoice',
      cliente: invoices[0].cliente,
    });
    prisma.factura.findMany.mockImplementation(async ({ where }) =>
      invoices.filter(
        (invoice) =>
          invoice.empresaId === where.empresaId &&
          invoice.cliente.empresaId === where.cliente?.empresaId,
      ),
    );
    const payments = [
      { empresaId: 'company-a', monto: 25 },
      { empresaId: 'company-b', monto: 75 },
    ];
    prisma.pago.findMany.mockImplementation(async ({ where }) =>
      payments.filter(
        (payment) => payment.empresaId === where.factura?.empresaId,
      ),
    );
    const damages = [
      { empresaId: 'company-a', cobrable: true, costoEstimado: 10 },
      { empresaId: 'company-b', cobrable: true, costoEstimado: 90 },
    ];
    prisma.inspeccionDano.findMany.mockImplementation(async ({ where }) =>
      damages.filter(
        (damage) =>
          damage.empresaId ===
          where.detalleDevolucion?.devolucion?.sucursal?.empresaId,
      ),
    );

    const balanceA = await service.getBalanceGeneral('company-a');
    const balanceB = await service.getBalanceGeneral('company-b');
    expect(balanceA.activos.corrientes.efectivoYBancos).toBe(25);
    expect(balanceB.activos.corrientes.efectivoYBancos).toBe(75);
    expect(balanceA.activos.corrientes.cuentasPorCobrar).toBe(100);
    expect(balanceB.activos.corrientes.cuentasPorCobrar).toBe(200);
    expect(
      (await service.getEstadoResultados('company-a')).ingresos
        .totalIngresosBrutos,
    ).toBe(110);
    expect(
      (await service.getEstadoResultados('company-b')).ingresos
        .totalIngresosBrutos,
    ).toBe(290);
  });

  it('desglosa cuentas por pagar incluyendo mantenimientos y maquinaria subarrendada de proveedores', async () => {
    const { prisma, service } = setup();

    prisma.mantenimiento.findMany.mockResolvedValue([
      {
        id: 'man-1',
        tipo: 'PREVENTIVO',
        costo: 350,
        estado: 'EN_PROCESO',
        equipo: { modelo: 'Mini-excavadora', marca: { nombre: 'CAT' } },
        insumosUtilizados: 'Aceite 15w40',
        fechaProgramacion: new Date('2026-11-10'),
      },
    ]);

    prisma.detalleContrato.findMany.mockResolvedValue([
      {
        id: 'dc-1',
        cantidad: 1,
        createdAt: new Date('2026-11-01'),
        contrato: {
          codigo: 'CTR-001',
          cliente: { nombre: 'Constructora Meco' },
        },
        equipo: {
          codigo: 'EQ-EXT-01',
          modelo: 'Grúa Telescópica 50T',
          origenEquipo: 'PROVEEDOR',
          precioProveedor: 1200,
          proveedorId: 'prov-1',
          proveedor: { id: 'prov-1', nombre: 'Gruas Centroamerica' },
        },
      },
    ]);

    const result = await service.getCuentasPorPagar('company-a');

    expect(result.resumenGlobal.totalGastosMantenimiento).toBe(350);
    expect(result.resumenGlobal.totalSubarriendoMaquinaria).toBe(1200);
    expect(result.resumenGlobal.totalPendientePago).toBe(1550);
    expect(result.cuentasPorPagar).toHaveLength(2);
    expect(result.cuentasPorPagar[0]).toEqual(
      expect.objectContaining({
        categoria: 'MAQUINARIA_PROVEEDOR',
        proveedorNombre: 'Gruas Centroamerica',
        costo: 1200,
      }),
    );
  });

  it('validates and persists manual initial balances in guardarSaldosIniciales', async () => {
    const { prisma, service } = setup();

    await expect(
      service.guardarSaldosIniciales('empresa-1', {
        fechaCorte: '2026-10-31',
        items: [{ codigo: '110101', deudor: 100, acreedor: 50 }],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.guardarSaldosIniciales('empresa-1', {
        fechaCorte: '2026-10-31',
        items: [{ codigo: '999999', deudor: 100, acreedor: 0 }],
      }),
    ).rejects.toThrow(BadRequestException);

    await service.guardarSaldosIniciales('empresa-1', {
      fechaCorte: '2026-10-31',
      items: [
        { codigo: '110101', deudor: 2500, acreedor: 0, notas: 'Saldo caja' },
        { codigo: '310201', deudor: 0, acreedor: 0 },
      ],
    });

    expect(prisma.saldoInicialContable.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.saldoInicialContable.deleteMany).toHaveBeenCalledWith({
      where: { empresaId: 'empresa-1', cuentaCodigo: '310201' },
    });
  });

  it('replaces catalog with 4-level hierarchy and imports opening balances via importarCatalogoYSaldos', async () => {
    const { prisma, service } = setup();

    await service.importarCatalogoYSaldos(
      'empresa-1',
      {
        fechaCorte: '2026-10-31',
        reemplazarCatalogo: true,
        catalogo: [
          {
            codigo: '110101',
            nombre: 'Caja General',
            mayorCodigo: '1101',
            mayorNombre: 'Efectivo en caja',
            naturaleza: 'Deudora',
            estado: 'BG',
          },
          {
            codigo: '310101',
            nombre: 'Capital Social',
            mayorCodigo: '3101',
            mayorNombre: 'Capital',
            naturaleza: 'Acreedora',
            estado: 'BG',
          },
        ],
        saldos: [
          { codigo: '110101', deudor: 15000, acreedor: 0 },
          { codigo: '310101', deudor: 0, acreedor: 15000 },
        ],
      },
      'user-1',
    );

    expect(prisma.cuentaContable.deleteMany).toHaveBeenCalledWith({
      where: { empresaId: 'empresa-1' },
    });
    const insertedCatalog =
      prisma.cuentaContable.createMany.mock.calls[0][0].data;
    expect(insertedCatalog.map((c: any) => c.codigo)).toEqual([
      '1',
      '11',
      '1101',
      '110101',
      '3',
      '31',
      '3101',
      '310101',
    ]);
    expect(prisma.saldoInicialContable.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ cuentaCodigo: '110101', deudor: 15000 }),
        expect.objectContaining({ cuentaCodigo: '310101', acreedor: 15000 }),
      ]),
    });
  });

  it('restores official BM catalog (163 nodes) and balanced initial balances (73,135,010.14) via cargarSaldosOficialesBm', async () => {
    const { prisma, service } = setup();
    await service.cargarSaldosOficialesBm('empresa-1', 'user-1');

    const insertedCatalog =
      prisma.cuentaContable.createMany.mock.calls[0][0].data;
    expect(insertedCatalog).toHaveLength(163);

    const insertedSaldos =
      prisma.saldoInicialContable.createMany.mock.calls[0][0].data;
    expect(insertedSaldos).toHaveLength(81);
    const sumDeudor = insertedSaldos.reduce(
      (acc: number, s: any) => acc + s.deudor,
      0,
    );
    const sumAcreedor = insertedSaldos.reduce(
      (acc: number, s: any) => acc + s.acreedor,
      0,
    );
    expect(Math.round(sumDeudor * 100) / 100).toBe(73135010.14);
    expect(Math.round(sumAcreedor * 100) / 100).toBe(73135010.14);
  });

  it('integrates persisted asientos, subarriendo, insumos and payroll without double counting in balanza and libro diario', async () => {
    const { prisma, service } = setup();
    prisma.asientoContable = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'as-nom-1',
          numeroAsiento: 'AS-NOM-001',
          fecha: new Date('2026-11-12'),
          tipoAsiento: 'DIARIO',
          origenModulo: 'NOMINA',
          documentoReferencia: 'AS-DEV-2026-11-Q1',
          concepto: 'Devengo nómina Q1',
          totalDebe: 1235,
          totalHaber: 1235,
          cuadrado: true,
          sucursalId: 'km10',
          lineas: [
            { cuentaCodigo: '610101', cuentaNombre: 'Salario Ordinario', debe: 1000, haber: 0 },
            { cuentaCodigo: '610119', cuentaNombre: 'Inss patronal', debe: 215, haber: 0 },
            { cuentaCodigo: '610120', cuentaNombre: 'Inatec', debe: 20, haber: 0 },
            { cuentaCodigo: '210302', cuentaNombre: 'Inss Laboral', debe: 0, haber: 70 },
            { cuentaCodigo: '210404', cuentaNombre: 'Inss Patronal', debe: 0, haber: 215 },
            { cuentaCodigo: '210405', cuentaNombre: 'Inatec', debe: 0, haber: 20 },
            { cuentaCodigo: '210409', cuentaNombre: 'OTROS', debe: 0, haber: 930 },
          ],
        },
      ]),
    };
    // Planilla duplicada en tabla planillas que ya existe en AsientoContable -> NO debe duplicarse
    prisma.planilla = {
      findMany: jest.fn().mockResolvedValue([
        {
          asientoDevengoId: 'AS-DEV-2026-11-Q1',
          estado: 'APROBADA',
          totalDevengado: 1000,
          totalPatronal: 235,
          totalInssPatronal: 215,
          totalInatec: 20,
          totalDeducciones: 70,
          totalNeto: 930,
          periodo: { anio: 2026, mes: 11, quincena: 1 },
        },
      ]),
    };
    prisma.detalleContrato.findMany.mockResolvedValue([
      {
        id: 'det-sub-1',
        cantidad: 1,
        createdAt: new Date('2026-11-10'),
        contrato: { codigo: 'CTR-99', fechaInicio: new Date('2026-11-10'), sucursalId: 'km10' },
        equipo: { codigo: 'EQ-P1', modelo: 'Excavadora', precioProveedor: 500 },
      },
    ]);
    prisma.insumoMovimiento = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'mov-ins-1',
          tipo: 'SALIDA',
          costoTotal: 150,
          insumo: { categoria: 'ACEITES' },
        },
      ]),
    };

    const balanza = await service.getBalanzaComprobacion('empresa-1');
    expect(balanza.cuadrada).toBe(true);
    // 1235 (Nomina, no duplicada) + 500 (Subarriendo) + 150 (Insumo Aceites) = 1885
    expect(balanza.totalDebe).toBe(1885);
    expect(balanza.totalHaber).toBe(1885);
    expect(balanza.cuentas.find((c) => c.codigo === '510106')?.movimientoDebe).toBe(500);
    expect(balanza.cuentas.find((c) => c.codigo === '510113')?.movimientoDebe).toBe(150);
    expect(balanza.cuentas.find((c) => c.codigo === '610101')?.movimientoDebe).toBe(1000);

    const diario = await service.getLibroDiario('empresa-1');
    expect(diario.polizas.some((p) => p.numeroPoliza === 'AS-NOM-001')).toBe(true);
    expect(diario.polizas.some((p) => p.referenciaDoc === 'CTR-99')).toBe(true);

    const er = await service.getEstadoResultados('empresa-1');
    expect(er.costosOperativos.subarriendoMaquinaria).toBe(500);
    expect(er.costosOperativos.consumoInsumosTaller).toBe(150);
    expect(er.costosOperativos.nominaYLaboral).toBe(1235);
  });

  it('creates and voids manual journal entries and integrates ledger balances into P&L and Balance General', async () => {
    const { prisma, service } = setup();
    const createdStore: any[] = [];
    prisma.asientoContable = {
      findMany: jest.fn(async () => createdStore),
      findFirst: jest.fn(async ({ where }: any) =>
        createdStore.find((a) => a.id === where.id && a.empresaId === where.empresaId) || null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `as-${createdStore.length + 1}`,
          ...data,
          lineas: data.lineas?.create || [],
        };
        createdStore.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const idx = createdStore.findIndex((a) => a.id === where.id);
        if (idx >= 0) createdStore[idx] = { ...createdStore[idx], ...data };
        return createdStore[idx];
      }),
    };

    // Rechaza asiento descuadrado
    await expect(
      service.crearAsientoManual('empresa-1', {
        fecha: '2026-11-14',
        tipoAsiento: 'EGRESOS',
        concepto: 'Descuadrado',
        lineas: [
          { cuentaCodigo: '610103', debe: 500, haber: 0 },
          { cuentaCodigo: '110102', debe: 0, haber: 400 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    // Rechaza cuenta agrupadora (nivel 3)
    await expect(
      service.crearAsientoManual('empresa-1', {
        fecha: '2026-11-14',
        tipoAsiento: 'EGRESOS',
        concepto: 'Cuenta agrupadora',
        lineas: [
          { cuentaCodigo: '6101', debe: 100, haber: 0 },
          { cuentaCodigo: '110102', debe: 0, haber: 100 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    // Saldos iniciales oficiales parciales cuadrados (Activo 10,000 | Pasivo 2,000 | Capital 5,000 | Ingreso 4,000 | Costo 1,000)
    prisma.saldoInicialContable.findMany.mockResolvedValue([
      { cuentaCodigo: '110201', deudor: 6000, acreedor: 0 },
      { cuentaCodigo: '120104', deudor: 5000, acreedor: 0 },
      { cuentaCodigo: '120904', deudor: 0, acreedor: 1000 },
      { cuentaCodigo: '220101', deudor: 0, acreedor: 2000 },
      { cuentaCodigo: '310201', deudor: 0, acreedor: 5000 },
      { cuentaCodigo: '410101', deudor: 0, acreedor: 4000 },
      { cuentaCodigo: '510101', deudor: 1000, acreedor: 0 },
    ]);

    // Registra un asiento manual de gasto operativo pagado de banco (610103 vs 110201 por 300)
    const creado = await service.crearAsientoManual('empresa-1', {
      fecha: '2026-11-14',
      tipoAsiento: 'EGRESOS',
      concepto: 'Viáticos de campo pagados con LA FISE',
      lineas: [
        { cuentaCodigo: '610103', debe: 300, haber: 0 },
        { cuentaCodigo: '110201', debe: 0, haber: 300 },
      ],
    });
    expect(creado.origenModulo).toBe('MANUAL');
    expect(creado.totalDebe).toBe(300);

    const er = await service.getEstadoResultados('empresa-1');
    expect(er.ingresos.ingresosLibroBM).toBe(4000);
    expect(er.costosOperativos.otrosCostosVentaBM).toBe(1000);
    expect(er.costosOperativos.gastosOperativosYFinancierosBM).toBe(300);
    expect(er.indicadoresFinancieros.utilidadNeta).toBe(2700);

    const bg = await service.getBalanceGeneral('empresa-1');
    expect(bg.integradoConLibroBM).toBe(true);
    expect(bg.activos.corrientes.efectivoYBancos).toBe(5700); // 6000 - 300
    expect(bg.activos.noCorrientes.depreciacionAcumulada).toBe(1000);
    expect(bg.activos.totalActivos).toBe(9700); // 5700 + 5000 - 1000
    expect(bg.pasivos.noCorrientes.prestamosBancariosLP).toBe(2000);
    expect(bg.patrimonio.capitalContableYUtilidades).toBe(5000);
    expect(bg.patrimonio.resultadoDelEjercicio).toBe(2700);
    expect(bg.equilibrioContable).toBe(true);

    // Anular asiento manual revierte su impacto
    await service.anularAsientoManual('empresa-1', creado.id, 'user-1', 'Error');
    const erPost = await service.getEstadoResultados('empresa-1');
    expect(erPost.costosOperativos.gastosOperativosYFinancierosBM).toBe(0);
    expect(erPost.indicadoresFinancieros.utilidadNeta).toBe(3000);
  });

  it('atribuye pagos de facturación a la cuenta bancaria seleccionada y calcula saldos en getCuentasBancarias', async () => {
    const { prisma, service } = setup();
    prisma.saldoInicialContable.findMany.mockResolvedValue([
      {
        cuentaCodigo: '110203',
        cuentaNombre: 'BANPRO 701-279-700',
        fechaCorte: new Date('2026-10-31T12:00:00Z'),
        deudor: 5000,
        acreedor: 0,
      },
      {
        cuentaCodigo: '110102',
        cuentaNombre: 'CAJA CHICA',
        fechaCorte: new Date('2026-10-31T12:00:00Z'),
        deudor: 1000,
        acreedor: 0,
      },
    ]);
    prisma.factura.findMany.mockResolvedValue([
      {
        id: 'fac-banpro',
        folio: 'FAC-0010',
        condicionPago: 'CONTADO',
        tipoFactura: 'ESTANDAR',
        fechaEmision: new Date('2026-11-16T10:00:00Z'),
        subtotal: 1000,
        iva: 150,
        total: 1150,
        retencionIva: 0,
        clienteId: 'cli-1',
        cliente: { nombre: 'Cliente Alfa' },
        pagos: [
          {
            id: 'p-1',
            monto: 1150,
            metodo: 'TRANSFERENCIA',
            banco: '110203 - BANPRO 701-279-700',
            referencia: 'TR-77',
            fechaPago: new Date('2026-11-16T10:05:00Z'),
          },
        ],
      },
    ]);
    prisma.asientoContable = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'as-egreso',
          numeroAsiento: 'AS-CMP-001',
          fecha: new Date('2026-11-16T11:00:00Z'),
          tipoAsiento: 'EGRESOS',
          origenModulo: 'OPERACIONES',
          documentoReferencia: 'OC-2026-00001',
          concepto: 'Compra insumos',
          totalDebe: 400,
          totalHaber: 400,
          cuadrado: true,
          lineas: [
            {
              id: 'l-1',
              cuentaCodigo: '121002',
              cuentaNombre: 'COMPRA DE REPUESTOS PARA USO DE TALLER',
              debe: 400,
              haber: 0,
            },
            {
              id: 'l-2',
              cuentaCodigo: '110102',
              cuentaNombre: 'CAJA CHICA',
              debe: 0,
              haber: 400,
              conceptoLinea: 'Pago compra caja chica',
            },
          ],
        },
      ]),
    };

    const diario = await service.getLibroDiario('empresa-1', 20);
    const polizaFac = diario.polizas.find((p) => p.referenciaDoc === 'FAC-0010');
    expect(polizaFac?.lineas[0]).toEqual(
      expect.objectContaining({
        cuentaCodigo: '110203',
        cuentaNombre: 'BANPRO 701-279-700',
        debe: 1150,
      }),
    );

    const bancos = await service.getCuentasBancarias('empresa-1');
    const banpro = bancos.cuentas.find((c) => c.codigo === '110203');
    const cajaChica = bancos.cuentas.find((c) => c.codigo === '110102');
    expect(banpro?.saldoInicial).toBe(5000);
    expect(banpro?.ingresos).toBe(1150);
    expect(banpro?.saldoActual).toBe(6150);
    expect(cajaChica?.egresos).toBe(400);
    expect(cajaChica?.saldoActual).toBe(600);
    expect(bancos.resumen.saldoTotalDisponible).toBe(6750);
  });

  it('incluye compras de insumos a crédito y subarriendos pendientes en getCuentasPorPagar', async () => {
    const { prisma, service } = setup();
    prisma.compraInsumo = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'cmp-1',
          codigo: 'OC-2026-00010',
          numeroFactura: 'F-900',
          proveedorNombre: 'Ferretería Industrial',
          proveedorId: 'prov-1',
          total: 2300,
          montoPagado: 500,
          estadoPago: 'PARCIAL',
          fechaCompra: new Date('2026-11-16T08:00:00Z'),
          fechaVencimiento: new Date('2026-12-16T08:00:00Z'),
          items: [{ cantidad: 4, insumo: { nombre: 'Filtro Hidráulico' } }],
        },
      ]),
    };
    prisma.subarriendoProveedor = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'sub-1',
          codigo: 'SUB-2026-00001',
          equipoId: 'eq-ext-1',
          proveedorNombre: 'Renta Pesada S.A.',
          proveedorId: 'prov-2',
          modalidad: 'POR_DIA',
          montoEstimado: 1500,
          montoFinal: null,
          montoPagado: 0,
          estado: 'ACTIVO',
          estadoPago: 'PENDIENTE',
          referenciaDocumento: 'REF-EXT-1',
          fechaInicio: new Date('2026-11-16T08:00:00Z'),
          equipo: { id: 'eq-ext-1', modelo: 'Excavadora 320', codigo: 'EQ-EXT-1' },
        },
      ]),
    };

    const cxp = await service.getCuentasPorPagar('empresa-1');

    expect(cxp.resumenGlobal.totalComprasInsumos).toBe(1800);
    expect(cxp.resumenGlobal.totalSubarriendoMaquinaria).toBe(1500);
    expect(cxp.resumenGlobal.totalPendientePago).toBe(3300);
    expect(cxp.cuentasPorPagar).toHaveLength(2);
    expect(cxp.cuentasPorPagar[0]).toEqual(
      expect.objectContaining({
        id: 'cmp-1',
        categoria: 'COMPRA_INSUMOS',
        costo: 1800,
        estado: 'PARCIAL',
      }),
    );
  });
});
