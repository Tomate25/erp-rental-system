import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prismaMock: {
    equipo: { findMany: jest.Mock };
    reserva: { findMany: jest.Mock };
    contrato: { findMany: jest.Mock };
    despacho: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      equipo: { findMany: jest.fn() },
      reserva: { findMany: jest.fn() },
      contrato: { findMany: jest.fn() },
      despacho: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEquipmentPeriodAvailability', () => {
    const start = '2026-10-01T00:00:00.000Z';
    const end = '2026-10-15T00:00:00.000Z';
    const empresaId = 'empresa-test-123';

    it('returns DISPONIBLE for serialized equipment when free of commitments', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-serial-1',
          codigo: 'GEN-001',
          descripcion: 'Generador 10kW',
          modelo: 'G10000',
          numeroSerie: 'SN12345',
          categoriaId: 'cat-1',
          categoria: { id: 'cat-1', nombre: 'Generadores' },
          marca: { id: 'm-1', nombre: 'CAT' },
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 1,
          estado: 'DISPONIBLE',
          precioRentaDia: '500.00',
          precioRentaHora: '70.00',
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('DISPONIBLE');
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].cantidadDisponiblePeriodo).toBe(1);
      expect(result[0].fechaEstimadaLiberacion).toBeNull();
    });

    it('returns OCUPADO with estimated release date for serialized equipment in active contract', async () => {
      const contractFin = new Date('2026-10-20T00:00:00.000Z');
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-serial-2',
          codigo: 'ROD-001',
          descripcion: 'Rodo Compactador',
          modelo: 'RC200',
          numeroSerie: 'SN8888',
          categoriaId: 'cat-1',
          categoria: { id: 'cat-1', nombre: 'Compactación' },
          marca: { id: 'm-1', nombre: 'Dynapac' },
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 0,
          estado: 'RENTADO',
          precioRentaDia: '1200.00',
          precioRentaHora: '150.00',
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-1',
          codigo: 'CTR-2026-0001',
          fechaInicio: new Date('2026-09-20T00:00:00.000Z'),
          fechaFin: contractFin,
          cliente: { nombre: 'Constructora S.A.' },
          items: [{ equipoId: 'eq-serial-2', cantidad: 1 }],
          despachos: [{ id: 'desp-1', items: [{ equipoId: 'eq-serial-2', cantidad: 1 }] }],
          devoluciones: [],
        },
      ]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('OCUPADO');
      expect(result[0].isAvailable).toBe(false);
      expect(result[0].cantidadDisponiblePeriodo).toBe(0);
      expect(result[0].fechaEstimadaLiberacion).toBe(contractFin.toISOString());
      expect(result[0].motivoOcupacion).toContain('CTR-2026-0001');
      expect(result[0].motivoOcupacion).toContain('Constructora S.A.');
    });

    it('calculates PARCIAL availability for quantity-based equipment', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-qty-1',
          codigo: 'AND-001',
          descripcion: 'Cuerpos de Andamio',
          modelo: 'Standard',
          numeroSerie: null,
          categoriaId: 'cat-2',
          categoria: { id: 'cat-2', nombre: 'Andamios' },
          marca: null,
          tipoControl: 'POR_CANTIDAD',
          cantidadTotal: 20,
          cantidadDisponible: 12,
          estado: 'DISPONIBLE',
          precioRentaDia: '50.00',
          precioRentaHora: null,
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-2',
          codigo: 'CTR-2026-0002',
          fechaInicio: new Date('2026-10-05T00:00:00.000Z'),
          fechaFin: new Date('2026-10-18T00:00:00.000Z'),
          cliente: { nombre: 'Obras Civiles' },
          items: [{ equipoId: 'eq-qty-1', cantidad: 8 }],
          despachos: [],
          devoluciones: [],
        },
      ]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('PARCIAL');
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].cantidadDisponiblePeriodo).toBe(12); // 20 - 8 = 12
      expect(result[0].motivoOcupacion).toContain('8 de 20 u. comprometidas');
    });

    it('reports MANTENIMIENTO status correctly regardless of period dates', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-maint-1',
          codigo: 'GEN-002',
          descripcion: 'Generador en taller',
          modelo: 'G5000',
          numeroSerie: 'SN9999',
          categoriaId: 'cat-1',
          categoria: { id: 'cat-1', nombre: 'Generadores' },
          marca: null,
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 0,
          estado: 'EN_MANTENIMIENTO',
          precioRentaDia: '400.00',
          precioRentaHora: null,
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('MANTENIMIENTO');
      expect(result[0].estadoEquipo).toBe('EN_MANTENIMIENTO');
      expect(result[0].isAvailable).toBe(false);
      expect(result[0].motivoOcupacion).toBe(
        'Equipo en mantenimiento o fuera de servicio',
      );
    });

    it('marks equipment as OCUPADO when contract fechaFin has passed but dispatches remain unreturned', async () => {
      const pastFin = new Date('2026-08-15T00:00:00.000Z');
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-unreturned-1',
          codigo: 'RETRO-01',
          descripcion: 'Retroexcavadora Muller',
          modelo: 'MR406',
          numeroSerie: 'SN-OVERDUE-1',
          categoriaId: 'cat-1',
          categoria: { id: 'cat-1', nombre: 'Maquinaria Pesada' },
          marca: { id: 'm-1', nombre: 'Muller' },
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 0,
          estado: 'DESPACHADO',
          precioRentaDia: '2500.00',
          precioRentaHora: '350.00',
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-overdue',
          codigo: 'CTR-VENCIDO-99',
          fechaInicio: new Date('2026-07-01T00:00:00.000Z'),
          fechaFin: pastFin, // Expired in past
          cliente: { nombre: 'Cliente Moroso' },
          items: [{ equipoId: 'eq-unreturned-1', cantidad: 1 }],
          despachos: [
            {
              id: 'desp-overdue',
              items: [{ equipoId: 'eq-unreturned-1', cantidad: 1 }],
            },
          ],
          devoluciones: [], // Unreturned!
        },
      ]);

      const result = await service.getEquipmentPeriodAvailability(
        '2026-11-01T00:00:00.000Z',
        '2026-11-15T00:00:00.000Z',
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('OCUPADO');
      expect(result[0].isAvailable).toBe(false);
      expect(result[0].cantidadDisponiblePeriodo).toBe(0);
      expect(result[0].motivoOcupacion).toContain('Vencido sin retorno');
      expect(result[0].motivoOcupacion).toContain('CTR-VENCIDO-99');
    });

    it('allows booking a future free period when active contract ends before queried period', async () => {
      const activeContractFin = new Date('2026-10-10T00:00:00.000Z');
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-future-avail',
          codigo: 'EXC-005',
          descripcion: 'Excavadora 20T',
          modelo: 'PC200',
          numeroSerie: 'SN-FUTURE-1',
          categoriaId: 'cat-1',
          categoria: { id: 'cat-1', nombre: 'Excavación' },
          marca: { id: 'm-1', nombre: 'Komatsu' },
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 0,
          estado: 'DESPACHADO', // Currently out on active contract
          precioRentaDia: '3000.00',
          precioRentaHora: '400.00',
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-active-now',
          codigo: 'CTR-ACTIVE-01',
          fechaInicio: new Date('2026-09-01T00:00:00.000Z'),
          fechaFin: activeContractFin, // Ends Oct 10, 2026
          cliente: { nombre: 'Constructora Alfa' },
          items: [{ equipoId: 'eq-future-avail', cantidad: 1 }],
          despachos: [
            {
              id: 'desp-active',
              items: [{ equipoId: 'eq-future-avail', cantidad: 1 }],
            },
          ],
          devoluciones: [],
        },
      ]);

      // Querying future period: Oct 20 to Oct 30 (AFTER Oct 10 contract ends)
      const result = await service.getEquipmentPeriodAvailability(
        '2026-10-20T00:00:00.000Z',
        '2026-10-30T00:00:00.000Z',
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('DISPONIBLE');
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].cantidadDisponiblePeriodo).toBe(1);
      expect(result[0].fechaEstimadaLiberacion).toBeNull();
    });

    it('marks quantity equipment as OCUPADO when 100% of stock is committed in period', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-qty-full',
          codigo: 'PNT-001',
          descripcion: 'Puntales Metálicos',
          modelo: 'P-300',
          numeroSerie: null,
          categoriaId: 'cat-2',
          categoria: { id: 'cat-2', nombre: 'Encofrado' },
          marca: null,
          tipoControl: 'POR_CANTIDAD',
          cantidadTotal: 50,
          cantidadDisponible: 0,
          estado: 'RENTADO',
          precioRentaDia: '25.00',
          precioRentaHora: null,
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-full-qty',
          codigo: 'CTR-QTY-50',
          fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
          fechaFin: new Date('2026-10-15T00:00:00.000Z'),
          cliente: { nombre: 'Mega Obra' },
          items: [{ equipoId: 'eq-qty-full', cantidad: 50 }],
          despachos: [],
          devoluciones: [],
        },
      ]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('OCUPADO');
      expect(result[0].isAvailable).toBe(false);
      expect(result[0].cantidadDisponiblePeriodo).toBe(0);
      expect(result[0].motivoOcupacion).toContain('50 de 50 u. comprometidas');
    });

    it('libera equipo en período y omite reserva cuando hubo retorno sano completo antes del fin del contrato', async () => {
      const contractFin = new Date('2026-10-30T00:00:00.000Z');
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-retorno-sano',
          codigo: 'GEN-SANO-1',
          descripcion: 'Generador 20kW',
          modelo: 'G20000',
          numeroSerie: 'SN-SANO-1',
          categoriaId: 'cat-1',
          categoria: { id: 'cat-1', nombre: 'Generadores' },
          marca: { id: 'm-1', nombre: 'CAT' },
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 1,
          estado: 'DISPONIBLE',
          precioRentaDia: '600.00',
          precioRentaHora: '80.00',
        },
      ]);
      // Reserva huérfana del mismo contrato/equipo no debe bloquear si ya retornó
      prismaMock.reserva.findMany.mockResolvedValue([
        {
          id: 'res-retornado',
          contratoId: 'ctr-anticipado',
          equipoId: 'eq-retorno-sano',
          fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
          fechaFin: contractFin,
        },
      ]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-anticipado',
          codigo: 'CTR-ANTICIPADO-01',
          fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
          fechaFin: contractFin,
          cliente: { nombre: 'Cliente Cumplido' },
          items: [{ equipoId: 'eq-retorno-sano', cantidad: 1 }],
          despachos: [
            {
              id: 'dsp-1',
              items: [{ equipoId: 'eq-retorno-sano', cantidadDespachada: 1 }],
            },
          ],
          devoluciones: [
            {
              id: 'dev-1',
              items: [{ equipoId: 'eq-retorno-sano', cantidadRetornada: 1 }],
            },
          ],
        },
      ]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('DISPONIBLE');
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].cantidadDisponiblePeriodo).toBe(1);
      expect(result[0].fechaEstimadaLiberacion).toBeNull();
    });

    it('bloquea en disponibilidad equipo en EN_MANTENIMIENTO devuelto con daños', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-danado-1',
          codigo: 'COMP-DAN-1',
          descripcion: 'Compresor de Aire',
          modelo: 'CP-185',
          numeroSerie: 'SN-DAN-1',
          categoriaId: 'cat-3',
          categoria: { id: 'cat-3', nombre: 'Compresores' },
          marca: null,
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 0,
          estado: 'EN_MANTENIMIENTO',
          precioRentaDia: '750.00',
          precioRentaHora: null,
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('MANTENIMIENTO');
      expect(result[0].estadoEquipo).toBe('EN_MANTENIMIENTO');
      expect(result[0].isAvailable).toBe(false);
      expect(result[0].cantidadDisponiblePeriodo).toBe(0);
      expect(result[0].motivoOcupacion).toBe(
        'Equipo en mantenimiento o fuera de servicio',
      );
    });

    it('mantiene ocupadas únicamente las unidades pendientes ante un retorno parcial de lote', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-lote-parcial',
          codigo: 'AND-LOTE-1',
          descripcion: 'Cuerpos de Andamio',
          modelo: 'AND-STD',
          numeroSerie: null,
          categoriaId: 'cat-2',
          categoria: { id: 'cat-2', nombre: 'Andamios' },
          marca: null,
          tipoControl: 'POR_CANTIDAD',
          cantidadTotal: 10,
          cantidadDisponible: 6,
          estado: 'DISPONIBLE',
          precioRentaDia: '15.00',
          precioRentaHora: null,
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-parcial-lote',
          codigo: 'CTR-LOTE-01',
          fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
          fechaFin: new Date('2026-10-20T00:00:00.000Z'),
          cliente: { nombre: 'Constructora Beta' },
          items: [{ equipoId: 'eq-lote-parcial', cantidad: 10 }],
          despachos: [
            {
              id: 'dsp-lote',
              items: [{ equipoId: 'eq-lote-parcial', cantidadDespachada: 10 }],
            },
          ],
          devoluciones: [
            {
              id: 'dev-lote',
              items: [{ equipoId: 'eq-lote-parcial', cantidadRetornada: 4 }],
            },
          ],
        },
      ]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('PARCIAL');
      expect(result[0].isAvailable).toBe(true);
      // 10 total - 6 pendientes en contrato = 4 disponibles en período
      expect(result[0].cantidadDisponiblePeriodo).toBe(4);
      expect(result[0].motivoOcupacion).toContain('6 de 10 u. comprometidas');
    });

    it('mantiene reservado un equipo comprometido en contrato aún no despachado', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-undispatched',
          codigo: 'VIB-001',
          descripcion: 'Vibrador de Concreto',
          modelo: 'VC-5HP',
          numeroSerie: 'SN-VIB-1',
          categoriaId: 'cat-4',
          categoria: { id: 'cat-4', nombre: 'Concreto' },
          marca: null,
          tipoControl: 'SERIALIZADO',
          cantidadTotal: 1,
          cantidadDisponible: 1,
          estado: 'DISPONIBLE',
          precioRentaDia: '350.00',
          precioRentaHora: null,
        },
      ]);
      prismaMock.reserva.findMany.mockResolvedValue([]);
      prismaMock.contrato.findMany.mockResolvedValue([
        {
          id: 'ctr-undispatched',
          codigo: 'CTR-NO-DESPACHADO',
          fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
          fechaFin: new Date('2026-10-15T00:00:00.000Z'),
          cliente: { nombre: 'Constructora Gamma' },
          items: [{ equipoId: 'eq-undispatched', cantidad: 1 }],
          despachos: [], // Aún no despachado
          devoluciones: [],
        },
      ]);

      const result = await service.getEquipmentPeriodAvailability(
        start,
        end,
        empresaId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].statusPeriodo).toBe('OCUPADO');
      expect(result[0].isAvailable).toBe(false);
      expect(result[0].cantidadDisponiblePeriodo).toBe(0);
      expect(result[0].motivoOcupacion).toContain('CTR-NO-DESPACHADO');
    });
  });
});
