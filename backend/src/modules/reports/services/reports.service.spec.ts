import { ReportsService } from './reports.service';
import { ReportType } from '../dto/reports.dto';
import { ForbiddenException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;
  let accountingService: any;

  const empresaId = 'emp-1';

  beforeEach(() => {
    prisma = {
      cotizacion: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([
          {
            numeroCotizacion: 'COT-0001',
            version: 1,
            fechaEmision: new Date('2026-11-10T10:00:00Z'),
            fechaVence: new Date('2026-11-25T10:00:00Z'),
            fechaInicioRenta: new Date('2026-11-12T00:00:00Z'),
            fechaFinRenta: new Date('2026-11-20T00:00:00Z'),
            proyecto: 'Carretera Norte',
            estado: 'ACEPTADA',
            subtotal: 1000,
            descuento: 50,
            descuentoPromocional: 0,
            iva: 142.5,
            total: 1092.5,
            depositoGarantia: 200,
            motivoRechazo: null,
            cliente: { nombre: 'Constructora Norte', rfc: 'J031000001', cedula: null },
            asesor: { nombre: 'David', apellido: 'López' },
            vendedor: null,
            items: [{ id: 'i1', cantidad: 2 }],
          },
          {
            numeroCotizacion: 'COT-0002',
            version: 1,
            fechaEmision: new Date('2026-11-15T10:00:00Z'),
            fechaVence: new Date('2026-11-30T10:00:00Z'),
            fechaInicioRenta: null,
            fechaFinRenta: null,
            proyecto: 'Edificio Central',
            estado: 'CANCELADA',
            subtotal: 500,
            descuento: 0,
            descuentoPromocional: 0,
            iva: 75,
            total: 575,
            depositoGarantia: 0,
            motivoRechazo: 'Cliente pospuso obra',
            cliente: { nombre: 'Obras Sur', rfc: 'J031000002', cedula: null },
            asesor: null,
            vendedor: { nombreMostrar: 'Nylska' },
            items: [{ id: 'i2', cantidad: 1 }],
          },
        ]),
      },
      contrato: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            codigo: 'CTR-2026-0001',
            fechaInicio: new Date('2026-11-01T00:00:00Z'),
            fechaFin: new Date('2026-11-30T00:00:00Z'),
            fechaFinPactada: new Date('2026-11-30T00:00:00Z'),
            fechaCierreReal: null,
            tipoCierre: null,
            estado: 'ACTIVO',
            depositoGarantia: 500,
            cliente: { nombre: 'Constructora Norte', rfc: 'J031000001', cedula: null },
            sucursal: { nombre: 'Managua' },
            cotizacion: { numeroCotizacion: 'COT-0001', total: 2000 },
            items: [{ cantidad: 2, dias: 10, precioRenta: 100, equipo: { codigo: '01-01', modelo: 'Excavadora' } }],
            cortesFacturacion: [
              {
                numeroCorte: 1,
                fechaInicio: new Date('2026-11-01T00:00:00Z'),
                fechaFin: new Date('2026-11-15T00:00:00Z'),
                monto: 1000,
                estado: 'FACTURADO',
              },
              {
                numeroCorte: 2,
                fechaInicio: new Date('2026-11-16T00:00:00Z'),
                fechaFin: new Date('2026-11-30T00:00:00Z'),
                monto: 1000,
                estado: 'PENDIENTE',
              },
            ],
            facturas: [{ id: 'f1', total: 1000, estado: 'PAGADA' }],
            despachos: [{ id: 'd1' }],
            devoluciones: [],
          },
        ]),
      },
      equipo: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          {
            codigo: '08-01',
            modelo: 'Retroexcavadora 416E',
            numeroSerie: 'CAT-9901',
            tipoControl: 'SERIALIZADO',
            estado: 'RENTADO',
            origenEquipo: 'PROPIO',
            proveedorNombre: null,
            cantidadTotal: 1,
            cantidadDisponible: 0,
            precioRentaDia: 4500,
            precioDiaB: 4200,
            precioDiaC: 3900,
            precioRentaHora: 750,
            precioProveedor: null,
            horometro: 1250,
            horometroUltimoServicio: 1100,
            costoAdquisicion: 1500000,
            disponibleParaRenta: true,
            categoria: { nombre: 'Línea Amarilla' },
            marca: { nombre: 'Caterpillar' },
            sucursal: { nombre: 'Managua' },
            proveedor: null,
          },
        ]),
      },
      despacho: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'desp-1',
            codigo: 'DSP-0001',
            fechaDespacho: new Date('2026-11-10T08:00:00Z'),
            operadorNombre: 'Juan Pérez',
            sucursal: { nombre: 'Managua' },
            contrato: {
              codigo: 'CTR-2026-0001',
              cliente: { nombre: 'Constructora Norte' },
              devoluciones: [
                {
                  fechaDevolucion: new Date('2026-11-15T16:00:00Z'),
                  items: [
                    {
                      equipoId: 'eq-1',
                      cantidadRetornada: 1,
                      cantidadDañada: 0,
                      cantidadPerdida: 0,
                      horometroFinal: 1290,
                      horasCalculadas: 40,
                      cargoCombustible: 350,
                      daniosDetectados: false,
                    },
                  ],
                },
              ],
            },
            items: [
              {
                equipoId: 'eq-1',
                cantidad: 1,
                horometroInicial: 1250,
                numeroSerie: 'CAT-9901',
                equipo: {
                  codigo: '08-01',
                  modelo: 'Retroexcavadora 416E',
                  estado: 'DISPONIBLE',
                  horometro: 1290,
                  categoria: { nombre: 'Línea Amarilla' },
                  marca: { nombre: 'Caterpillar' },
                },
              },
            ],
          },
        ]),
      },
      factura: { count: jest.fn().mockResolvedValue(5), findMany: jest.fn().mockResolvedValue([]) },
      reciboCaja: { findMany: jest.fn().mockResolvedValue([]) },
      compraInsumo: { count: jest.fn().mockResolvedValue(2), findMany: jest.fn().mockResolvedValue([]) },
      subarriendoProveedor: { findMany: jest.fn().mockResolvedValue([]) },
      insumo: { findMany: jest.fn().mockResolvedValue([]) },
      mantenimiento: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]) },
      cliente: { count: jest.fn().mockResolvedValue(10), findMany: jest.fn().mockResolvedValue([]) },
      asientoContable: { count: jest.fn().mockResolvedValue(6) },
      planilla: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]) },
      liquidacionComision: { findMany: jest.fn().mockResolvedValue([]) },
    };

    accountingService = {
      getLibroDiario: jest.fn().mockResolvedValue({ totalPolizas: 0, polizas: [] }),
      getBalanzaComprobacion: jest.fn().mockResolvedValue({
        cuadrada: true,
        totalSaldoFinalDeudor: 0,
        cuentas: [],
      }),
      getCuentasBancarias: jest.fn().mockResolvedValue({ cuentas: [] }),
    };

    service = new ReportsService(prisma, accountingService);
  });

  it('rechaza peticiones sin empresaId', async () => {
    await expect(service.getCatalogoReportes('')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('retorna el catálogo completo de los 10 reportes del ERP con conteos', async () => {
    const res = await service.getCatalogoReportes(empresaId);
    expect(res.reportes).toHaveLength(10);
    expect(res.resumenEjecutivo.totalCotizaciones).toBe(4);
    expect(res.resumenEjecutivo.totalEquipos).toBe(3);
    expect(res.reportes.some((r) => r.tipo === ReportType.MAQUINARIA_USADA)).toBe(
      true,
    );
  });

  it('genera el reporte de cotizaciones con KPIs y resúmenes dinámicos', async () => {
    const rep = await service.getReportePorTipo(empresaId, ReportType.COTIZACIONES);
    expect(rep.filas).toHaveLength(2);
    expect(rep.resumenesDinamicos.length).toBeGreaterThanOrEqual(3);
    const totalKpi = rep.kpis.find((k) => k.label === 'Monto Total Cotizado');
    expect(totalKpi?.value).toBe(1667.5);
    const convKpi = rep.kpis.find((k) => k.label === 'Tasa de Conversión');
    expect(convKpi?.value).toBe(50);
  });

  it('genera el reporte de contratos incluyendo hoja adicional de Cortes de Facturación', async () => {
    const rep = await service.getReportePorTipo(empresaId, ReportType.CONTRATOS);
    expect(rep.filas).toHaveLength(1);
    expect(rep.hojasAdicionales).toHaveLength(1);
    expect(rep.hojasAdicionales[0].nombreHoja).toBe('Cortes de Facturación');
    expect(rep.hojasAdicionales[0].filas).toHaveLength(2);
  });

  it('genera el reporte de maquinaria usada con horas trabajadas y hoja de utilización por equipo', async () => {
    const rep = await service.getReportePorTipo(
      empresaId,
      ReportType.MAQUINARIA_USADA,
    );
    expect(rep.filas).toHaveLength(1);
    expect(rep.filas[0].horasTrabajadas).toBe(40);
    expect(rep.filas[0].situacion).toBe('RETORNADA');
    expect(rep.hojasAdicionales).toHaveLength(1);
    expect(rep.hojasAdicionales[0].filas[0].vecesRentado).toBe(1);
  });

  it('genera el reporte consolidado completo con todos los módulos', async () => {
    const cons = await service.getReporteConsolidado(empresaId);
    expect(cons.totalReportes).toBe(10);
    expect(cons.reportes).toHaveLength(10);
  });
});
