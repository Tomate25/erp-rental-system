import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TipoDocumentoSerie, EstadoSerieDocumento } from '@prisma/client';
import { NumberingService } from './numbering.service';

describe('NumberingService', () => {
  let service: NumberingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      serieDocumento: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      serieDocumentoUso: {
        create: jest.fn(),
      },
      secuenciaNumeracion: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      $queryRaw: jest.fn(),
    };

    service = new NumberingService(mockPrisma);
  });

  describe('formatDocumentCode', () => {
    it('formatea estándar con prefijo y serie', () => {
      const code = service.formatDocumentCode({
        prefijo: 'FAC',
        serie: 'KM10',
        relleno: 6,
        numero: 125,
      });
      expect(code).toBe('FAC-KM10-000125');
    });

    it('no duplica el prefijo si la serie ya lo incluye', () => {
      const code = service.formatDocumentCode({
        prefijo: 'FAC',
        serie: 'FAC-DAN',
        relleno: 6,
        numero: 1,
      });
      expect(code).toBe('FAC-DAN-000001');
    });

    it('formatea con plantilla personalizada {prefijo}-{anio}-{numero}', () => {
      const code = service.formatDocumentCode({
        prefijo: 'CTR',
        serie: '001',
        plantilla: '{prefijo}-{anio}-{numero}',
        relleno: 4,
        numero: 7,
        anio: 2026,
      });
      expect(code).toBe('CTR-2026-0007');
    });
  });

  describe('next', () => {
    const mockSerie = {
      id: 'serie-uuid-1',
      empresaId: 'empresa-1',
      sucursalId: 'suc-1',
      tipoDocumento: TipoDocumentoSerie.FACTURA,
      serie: 'KM10',
      prefijo: 'FAC',
      plantilla: null,
      relleno: 6,
      numeroDesde: 1,
      numeroHasta: 100,
      numeroActual: 5,
      reiniciaPorAnio: false,
      anioActual: 2026,
      alertaPorcentaje: 80,
      estado: EstadoSerieDocumento.ACTIVA,
    };

    it('genera el correlativo siguiente y registra el uso', async () => {
      mockPrisma.serieDocumento.findFirst.mockResolvedValue(mockSerie);
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: mockSerie.id,
          numero_actual: 5,
          numero_desde: 1,
          numero_hasta: 100,
          reinicia_por_anio: false,
          anio_actual: 2026,
          prefijo: 'FAC',
          serie: 'KM10',
          plantilla: null,
          relleno: 6,
          alerta_porcentaje: 80,
        },
      ]);
      mockPrisma.serieDocumento.update.mockResolvedValue({
        ...mockSerie,
        numeroActual: 6,
      });
      mockPrisma.serieDocumentoUso.create.mockResolvedValue({});

      const codigo = await service.next(mockPrisma, {
        empresaId: 'empresa-1',
        sucursalId: 'suc-1',
        tipoDocumento: TipoDocumentoSerie.FACTURA,
      });

      expect(codigo).toBe('FAC-KM10-000006');
      expect(mockPrisma.serieDocumento.update).toHaveBeenCalledWith({
        where: { id: mockSerie.id },
        data: expect.objectContaining({
          numeroActual: 6,
          estado: EstadoSerieDocumento.ACTIVA,
        }),
      });
      expect(mockPrisma.serieDocumentoUso.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serieId: mockSerie.id,
          numero: 6,
          codigoFormateado: 'FAC-KM10-000006',
        }),
      });
    });

    it('bloquea la emisión con BadRequestException si se agota el rango', async () => {
      mockPrisma.serieDocumento.findFirst.mockResolvedValue({
        ...mockSerie,
        numeroActual: 100,
      });
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: mockSerie.id,
          numero_actual: 100,
          numero_desde: 1,
          numero_hasta: 100,
          reinicia_por_anio: false,
          anio_actual: 2026,
          prefijo: 'FAC',
          serie: 'KM10',
          plantilla: null,
          relleno: 6,
          alerta_porcentaje: 80,
        },
      ]);
      mockPrisma.serieDocumento.update.mockResolvedValue({});

      await expect(
        service.next(mockPrisma, {
          empresaId: 'empresa-1',
          sucursalId: 'suc-1',
          tipoDocumento: TipoDocumentoSerie.FACTURA,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.serieDocumento.update).toHaveBeenCalledWith({
        where: { id: mockSerie.id },
        data: { estado: EstadoSerieDocumento.AGOTADA },
      });
    });

    it('ejecuta fallback a secuencia atómica si no hay serie configurada', async () => {
      mockPrisma.serieDocumento.findFirst.mockResolvedValue(null);
      mockPrisma.secuenciaNumeracion.upsert.mockResolvedValue({ ultimoValor: 15 });

      const codigo = await service.next(mockPrisma, {
        empresaId: 'empresa-1',
        tipoDocumento: TipoDocumentoSerie.COTIZACION,
      });

      expect(codigo).toBe('COT-0015');
    });
  });

  describe('create', () => {
    it('rechaza si numeroHasta < numeroDesde', async () => {
      await expect(
        service.create('emp-1', {
          tipoDocumento: TipoDocumentoSerie.FACTURA,
          serie: 'KM10',
          numeroDesde: 100,
          numeroHasta: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si ya existe serie activa para la misma combinación', async () => {
      mockPrisma.serieDocumento.findFirst.mockResolvedValue({
        id: 'serie-existente',
        serie: 'KM10',
      });

      await expect(
        service.create('emp-1', {
          tipoDocumento: TipoDocumentoSerie.FACTURA,
          serie: 'KM10-B',
          numeroDesde: 1,
          numeroHasta: 1000,
          estado: EstadoSerieDocumento.ACTIVA,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('no permite editar desde ni prefijo si ya se emitió el primer número', async () => {
      mockPrisma.serieDocumento.findFirst.mockResolvedValue({
        id: 's1',
        empresaId: 'emp-1',
        numeroDesde: 1,
        numeroActual: 5,
        numeroHasta: 1000,
        prefijo: 'FAC',
        serie: 'KM10',
      });

      await expect(
        service.update('s1', 'emp-1', {
          numeroDesde: 10,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.update('s1', 'emp-1', {
          prefijo: 'FACT',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite ampliar numeroHasta', async () => {
      mockPrisma.serieDocumento.findFirst.mockResolvedValue({
        id: 's1',
        empresaId: 'emp-1',
        numeroDesde: 1,
        numeroActual: 5,
        numeroHasta: 1000,
        prefijo: 'FAC',
        serie: 'KM10',
      });
      mockPrisma.serieDocumento.update.mockResolvedValue({
        id: 's1',
        empresaId: 'emp-1',
        numeroDesde: 1,
        numeroActual: 5,
        numeroHasta: 2000,
        prefijo: 'FAC',
        serie: 'KM10',
        alertaPorcentaje: 80,
      });

      const res = await service.update('s1', 'emp-1', {
        numeroHasta: 2000,
      });

      expect(res.numeroHasta).toBe(2000);
      expect(res.totalRango).toBe(2000);
    });
  });

  describe('activate', () => {
    it('desactiva otras series del mismo tipo/sucursal y activa la seleccionada', async () => {
      mockPrisma.serieDocumento.findFirst.mockResolvedValue({
        id: 'serie-2',
        empresaId: 'emp-1',
        sucursalId: 'suc-1',
        tipoDocumento: TipoDocumentoSerie.FACTURA,
        numeroActual: 10,
        numeroHasta: 100,
        numeroDesde: 1,
        alertaPorcentaje: 80,
      });
      mockPrisma.serieDocumento.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.serieDocumento.update.mockResolvedValue({
        id: 'serie-2',
        empresaId: 'emp-1',
        sucursalId: 'suc-1',
        tipoDocumento: TipoDocumentoSerie.FACTURA,
        numeroActual: 10,
        numeroHasta: 100,
        numeroDesde: 1,
        estado: EstadoSerieDocumento.ACTIVA,
        alertaPorcentaje: 80,
      });

      const res = await service.activate('serie-2', 'emp-1');

      expect(mockPrisma.serieDocumento.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          empresaId: 'emp-1',
          tipoDocumento: TipoDocumentoSerie.FACTURA,
          estado: EstadoSerieDocumento.ACTIVA,
          id: { not: 'serie-2' },
        }),
        data: { estado: EstadoSerieDocumento.INACTIVA },
      });
      expect(res.estado).toBe(EstadoSerieDocumento.ACTIVA);
    });
  });

  describe('findAll', () => {
    it('calcula métricas de consumo y alertas correctamente', async () => {
      mockPrisma.serieDocumento.findMany.mockResolvedValue([
        {
          id: 's1',
          empresaId: 'emp-1',
          tipoDocumento: TipoDocumentoSerie.FACTURA,
          serie: 'KM10',
          prefijo: 'FAC',
          numeroDesde: 1,
          numeroActual: 85,
          numeroHasta: 100,
          alertaPorcentaje: 80,
          estado: EstadoSerieDocumento.ACTIVA,
        },
      ]);

      const res = await service.findAll('emp-1', {});

      expect(res.items[0].foliosEmitidos).toBe(85);
      expect(res.items[0].porcentajeConsumo).toBe(85);
      expect(res.items[0].alertaSuperada).toBe(true);
      expect(res.items[0].foliosDisponibles).toBe(15);
      expect(res.kpis.enAlerta).toBe(1);
    });
  });
});
