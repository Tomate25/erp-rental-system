import { BadRequestException } from '@nestjs/common';
import { DocumentVoidingService } from './document-voiding.service';
import { TipoDocumentoAnulable } from '../dto/reports.dto';

describe('DocumentVoidingService', () => {
  let service: DocumentVoidingService;
  let prisma: any;
  let accountingService: any;
  let cxcRecibosService: any;
  let quotationsService: any;

  const empresaId = 'emp-1';
  const usuarioId = 'usr-1';

  beforeEach(() => {
    prisma = {
      factura: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      contrato: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      cotizacion: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      reciboCaja: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      compraInsumo: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      subarriendoProveedor: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      notaDebito: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      asientoContable: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'as-rev-1', numeroAsiento: 'AS-REV-0001' }),
      },
      auditoria: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      corteFacturacion: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      serieDocumentoUso: {
        updateMany: jest.fn(),
      },
      equipo: {
        update: jest.fn(),
      },
      reserva: {
        update: jest.fn(),
      },
      solicitudDespacho: {
        updateMany: jest.fn(),
      },
      insumo: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      insumoMovimiento: {
        create: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    accountingService = {
      getBalanzaComprobacion: jest.fn().mockResolvedValue({
        cuentas: [
          {
            codigo: '110301',
            nombre: 'CUENTAS POR COBRAR CLIENTES',
            naturaleza: 'Deudora',
            saldoFinalDeudor: 5000,
            saldoFinalAcreedor: 0,
          },
          {
            codigo: '410101',
            nombre: 'INGRESO POR ALQUILER DE EQUIPOS',
            naturaleza: 'Acreedora',
            saldoFinalDeudor: 0,
            saldoFinalAcreedor: 10000,
          },
          {
            codigo: '210201',
            nombre: 'IVA 15% POR PAGAR',
            naturaleza: 'Acreedora',
            saldoFinalDeudor: 0,
            saldoFinalAcreedor: 1500,
          },
          {
            codigo: '121002',
            nombre: 'COMPRA DE REPUESTOS PARA USO DE TALLER',
            naturaleza: 'Deudora',
            saldoFinalDeudor: 3000,
            saldoFinalAcreedor: 0,
          },
          {
            codigo: '210101',
            nombre: 'CUENTAS POR PAGAR PROVEEDORES',
            naturaleza: 'Acreedora',
            saldoFinalDeudor: 0,
            saldoFinalAcreedor: 3450,
          },
        ],
      }),
      anularAsientoManual: jest.fn(),
    };

    cxcRecibosService = {
      anularReciboCaja: jest.fn(),
    };

    quotationsService = {
      cancelQuotation: jest.fn(),
    };

    service = new DocumentVoidingService(
      prisma,
      accountingService,
      cxcRecibosService,
      quotationsService,
    );
  });

  it('expone la matriz completa de comportamiento para los 8 tipos de documento', () => {
    const matrix = service.getMatrizComportamientoAnulaciones();
    expect(matrix).toHaveLength(8);
    const compraRule = matrix.find(
      (r) => r.tipoDocumento === TipoDocumentoAnulable.COMPRA_INSUMO,
    );
    expect(compraRule?.afectaInventario).toBe(true);
    expect(compraRule?.afectaContabilidad).toBe(true);
  });

  it('previsualiza correctamente el impacto contable antes/después al anular una Factura a Crédito', async () => {
    prisma.factura.findFirst.mockResolvedValue({
      id: 'fac-1',
      folio: 'FAC-0001',
      fechaEmision: new Date('2026-11-20T00:00:00Z'),
      estado: 'PENDIENTE',
      tipoFactura: 'ESTANDAR',
      condicionPago: 'CREDITO',
      subtotal: 1000,
      iva: 150,
      total: 1150,
      retencionIva: 0,
      corteId: 'corte-1',
      corte: { numeroCorte: 1, estado: 'FACTURADO' },
      contrato: { codigo: 'CTR-2026-0001' },
      cliente: { nombre: 'Constructora Norte' },
      pagos: [],
      reciboAplicaciones: [],
      arregloDocumentos: [],
    });

    const preview = await service.previsualizarAnulacion(
      empresaId,
      TipoDocumentoAnulable.FACTURA,
      'fac-1',
    );

    expect(preview.puedeAnular).toBe(true);
    expect(preview.impactoInventario.tieneImpacto).toBe(false);
    expect(preview.impactoContable.cuadrado).toBe(true);
    expect(preview.impactoContable.totalDebe).toBe(1150);
    expect(preview.impactoContable.totalHaber).toBe(1150);

    const cxcLine = preview.impactoContable.partidasReversion.find(
      (p) => p.cuentaCodigo === '110301',
    );
    expect(cxcLine?.saldoAntes).toBe(5000);
    expect(cxcLine?.haber).toBe(1150);
    expect(cxcLine?.saldoDespues).toBe(3850);

    const ingresoLine = preview.impactoContable.partidasReversion.find(
      (p) => p.cuentaCodigo === '410101',
    );
    expect(ingresoLine?.saldoAntes).toBe(10000);
    expect(ingresoLine?.debe).toBe(1000);
    expect(ingresoLine?.saldoDespues).toBe(9000);
  });

  it('bloquea la anulación de una Factura que tiene un Recibo de Caja activo aplicado', async () => {
    prisma.factura.findFirst.mockResolvedValue({
      id: 'fac-2',
      folio: 'FAC-0002',
      fechaEmision: new Date(),
      estado: 'PAGADA',
      tipoFactura: 'ESTANDAR',
      condicionPago: 'CREDITO',
      subtotal: 1000,
      iva: 150,
      total: 1150,
      retencionIva: 0,
      cliente: { nombre: 'Cliente X' },
      pagos: [],
      reciboAplicaciones: [
        { reciboCaja: { numeroRecibo: 'RC-0001', estado: 'EMITIDO' } },
      ],
      arregloDocumentos: [],
    });

    const preview = await service.previsualizarAnulacion(
      empresaId,
      TipoDocumentoAnulable.FACTURA,
      'fac-2',
    );

    expect(preview.puedeAnular).toBe(false);
    expect(preview.bloqueos[0]).toContain('RC-0001');

    await expect(
      service.ejecutarAnulacion(
        empresaId,
        {
          tipoDocumento: TipoDocumentoAnulable.FACTURA,
          documentoId: 'fac-2',
          motivo: 'Error en monto facturado',
        },
        usuarioId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('previsualiza liberación de flota y depósito al anular un Contrato sin despachos', async () => {
    prisma.contrato.findFirst.mockResolvedValue({
      id: 'ctr-1',
      codigo: 'CTR-2026-0005',
      fechaInicio: new Date('2026-11-22T00:00:00Z'),
      estado: 'ACTIVO',
      depositoGarantia: 500,
      cliente: { nombre: 'Constructora Sur' },
      cotizacion: { total: 4000 },
      items: [{ equipoId: 'eq-1', cantidad: 1 }],
      reservas: [
        {
          id: 'res-1',
          equipoId: 'eq-1',
          estado: 'CONFIRMADA',
          equipo: {
            id: 'eq-1',
            codigo: '08-01',
            modelo: 'Mini Excavadora',
            tipoControl: 'SERIALIZADO',
            estado: 'RESERVADO',
            cantidadTotal: 1,
            cantidadDisponible: 0,
          },
        },
      ],
      despachos: [],
      facturas: [],
      cortesFacturacion: [{ numeroCorte: 1, monto: 2000, estado: 'PENDIENTE' }],
      solicitudesDespacho: [{ codigo: 'SD-001', estado: 'PENDIENTE' }],
    });

    const preview = await service.previsualizarAnulacion(
      empresaId,
      TipoDocumentoAnulable.CONTRATO,
      'ctr-1',
    );

    expect(preview.puedeAnular).toBe(true);
    expect(preview.impactoInventario.tieneImpacto).toBe(true);
    expect(preview.impactoInventario.items[0].estadoActual).toBe('RESERVADO');
    expect(preview.impactoInventario.items[0].estadoResultante).toBe('DISPONIBLE');
    expect(preview.impactoInventario.items[0].cambioStock).toBe(1);
    expect(preview.impactoContable.totalDebe).toBe(500);
    expect(preview.impactoContable.totalHaber).toBe(500);
  });

  it('ejecuta anulación de Compra de Insumos descontando bodega y generando asiento de reversión', async () => {
    const compraMock = {
      id: 'cmp-1',
      codigo: 'OC-2026-00001',
      fechaCompra: new Date('2026-11-18T00:00:00Z'),
      proveedorNombre: 'Lubricantes NI',
      condicionPago: 'CREDITO',
      metodoPago: 'TRANSFERENCIA',
      cuentaPagoCodigo: '110201',
      subtotal: 1000,
      ivaTotal: 150,
      total: 1150,
      montoPagado: 0,
      estado: 'RECIBIDA',
      sucursalId: 'suc-1',
      items: [
        {
          insumoId: 'ins-1',
          cantidad: 5,
          costoUnitario: 200,
          subtotal: 1000,
          insumo: {
            id: 'ins-1',
            codigo: 'INS-01',
            nombre: 'Aceite 15W40',
            unidadMedida: 'GALON',
            stockActual: 10,
          },
        },
      ],
      pagos: [],
    };
    prisma.compraInsumo.findFirst.mockResolvedValue(compraMock);
    prisma.insumo.findFirst.mockResolvedValue(compraMock.items[0].insumo);
    prisma.asientoContable.findFirst.mockResolvedValue(null);

    const result = await service.ejecutarAnulacion(
      empresaId,
      {
        tipoDocumento: TipoDocumentoAnulable.COMPRA_INSUMO,
        documentoId: 'cmp-1',
        motivo: 'Factura duplicada del proveedor',
      },
      usuarioId,
    );

    expect(result.anulado).toBe(true);
    expect(prisma.insumo.update).toHaveBeenCalledWith({
      where: { id: 'ins-1' },
      data: { stockActual: 5 },
    });
    expect(prisma.insumoMovimiento.create).toHaveBeenCalled();
    expect(prisma.compraInsumo.update).toHaveBeenCalledWith({
      where: { id: 'cmp-1' },
      data: { estado: 'ANULADA' },
    });
  });
});
