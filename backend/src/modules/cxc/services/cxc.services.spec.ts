import { TipoCambioService } from './tipo-cambio.service';
import { CxcConfiguracionService } from './cxc-configuracion.service';
import { CxcArreglosService } from './cxc-arreglos.service';
import { CxcAntiguedadService } from './cxc-antiguedad.service';
import { CxcEstadoCuentaService } from './cxc-estado-cuenta.service';

describe('CxC Module - Unit Tests', () => {
  describe('TipoCambioService', () => {
    let service: TipoCambioService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        tipoCambioBcn: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          upsert: jest.fn(),
        },
      };
      service = new TipoCambioService(mockPrisma);
    });

    it('debe convertir correctamente entre NIO y USD', () => {
      const tasa = 36.6243;
      // 100 USD a NIO
      const enCordobas = service.convertir(100, 'USD', 'NIO', tasa);
      expect(enCordobas).toBe(3662.43);

      // 3662.43 NIO a USD
      const enDolares = service.convertir(3662.43, 'NIO', 'USD', tasa);
      expect(enDolares).toBe(100);

      // Misma moneda
      expect(service.convertir(50, 'NIO', 'NIO', tasa)).toBe(50);
    });

    it('debe devolver la tasa oficial del día si existe', async () => {
      mockPrisma.tipoCambioBcn.findUnique.mockResolvedValue({
        fecha: new Date('2026-10-12'),
        tasa: 36.6243,
        fuente: 'BCN',
      });

      const res = await service.getTipoCambioHoy('2026-10-12');
      expect(res.tasa).toBe(36.6243);
      expect(res.esOficialHoy).toBe(true);
      expect(res.avisoFaltaTasa).toBe(false);
    });

    it('debe usar fallback si no existe tasa del día', async () => {
      mockPrisma.tipoCambioBcn.findUnique.mockResolvedValue(null);
      mockPrisma.tipoCambioBcn.findFirst.mockResolvedValue({
        fecha: new Date('2026-10-10'),
        tasa: 36.6200,
        fuente: 'BCN',
      });

      const res = await service.getTipoCambioHoy('2026-10-12');
      expect(res.tasa).toBe(36.6200);
      expect(res.esOficialHoy).toBe(false);
      expect(res.avisoFaltaTasa).toBe(true);
    });
  });

  describe('CxcArreglosService - Simulador de Amortización', () => {
    let service: CxcArreglosService;
    let mockPrisma: any;
    let mockTipoCambio: any;
    let mockConfig: any;

    beforeEach(() => {
      mockPrisma = {};
      mockTipoCambio = {};
      mockConfig = {};
      service = new CxcArreglosService(mockPrisma, mockTipoCambio, mockConfig);
    });

    it('debe simular amortización nivelada con capital, intereses y gastos admin', () => {
      const res = service.simularAmortizacion({
        montoCapital: 12000,
        numeroCuotas: 6,
        frecuencia: 'MENSUAL',
        tasaInteresAnual: 12, // 1% mensual
        porcentajeGastosAdmin: 3, // 360 C$
        fechaPrimeraCuota: '2026-11-01',
        metodoAmortizacion: 'CUOTA_NIVELADA',
      });

      expect(res.resumen.capitalOriginal).toBe(12000);
      expect(res.resumen.numeroCuotas).toBe(6);
      expect(res.resumen.montoGastosAdmin).toBe(360);
      expect(res.tablaAmortizacion.length).toBe(6);

      // Verificación de suma de capital en cuotas
      const sumaCapital = res.tablaAmortizacion.reduce((s, c) => s + c.capital, 0);
      expect(Math.abs(sumaCapital - 12000)).toBeLessThan(1);

      // Cada cuota debe tener número secuencial y fecha
      expect(res.tablaAmortizacion[0].numeroCuota).toBe(1);
      expect(res.tablaAmortizacion[0].fechaVencimiento).toBe('2026-11-01');
      expect(res.tablaAmortizacion[5].numeroCuota).toBe(6);
      expect(res.tablaAmortizacion[5].saldoRestante).toBe(0);
    });

    it('debe simular correctamente con 0% de interés', () => {
      const res = service.simularAmortizacion({
        montoCapital: 6000,
        numeroCuotas: 3,
        frecuencia: 'MENSUAL',
        tasaInteresAnual: 0,
        porcentajeGastosAdmin: 0,
        fechaPrimeraCuota: '2026-11-01',
      });

      expect(res.resumen.montoIntereses).toBe(0);
      expect(res.resumen.montoGastosAdmin).toBe(0);
      expect(res.resumen.granTotalArreglo).toBe(6000);
      expect(res.tablaAmortizacion[0].capital).toBe(2000);
      expect(res.tablaAmortizacion[1].capital).toBe(2000);
      expect(res.tablaAmortizacion[2].capital).toBe(2000);
    });
  });

  describe('CxcAntiguedadService - Exclusión de Facturas Pagadas', () => {
    let service: CxcAntiguedadService;
    let mockPrisma: any;
    let mockTipoCambio: any;
    let mockConfig: any;

    beforeEach(() => {
      mockPrisma = {
        factura: { findMany: jest.fn() },
        notaDebito: { findMany: jest.fn().mockResolvedValue([]) },
        arregloPago: { findMany: jest.fn().mockResolvedValue([]) },
      };
      mockTipoCambio = {
        getTipoCambioHoy: jest.fn().mockResolvedValue({ tasa: 36.6243 }),
      };
      mockConfig = {
        getConfiguracion: jest.fn().mockResolvedValue({
          tramosAntiguedadJson: [
            { id: 'corriente', nombre: 'Corriente', min: 0, max: 0 },
            { id: '1_30', nombre: '1-30 días', min: 1, max: 30 },
            { id: '31_60', nombre: '31-60 días', min: 31, max: 60 },
            { id: '61_90', nombre: '61-90 días', min: 61, max: 90 },
            { id: '90_mas', nombre: 'Más de 90 días', min: 91, max: 99999 },
          ],
        }),
      };
      service = new CxcAntiguedadService(mockPrisma, mockTipoCambio, mockConfig);
    });

    it('debe excluir terminantemente facturas en estado PAGADA o con saldoPendiente 0', async () => {
      mockPrisma.factura.findMany.mockResolvedValue([
        {
          id: 'fac-paid-1',
          folio: 'FAC-CTR-2026-0001-C1',
          clienteId: 'cli-1',
          cliente: { id: 'cli-1', nombre: 'Cliente 1', rfc: 'RUC1' },
          condicionPago: 'CREDITO',
          estado: 'PAGADA',
          estadoCxc: 'PAGADA',
          total: 5000,
          saldoPendiente: 0,
          pagos: [{ monto: 5000 }],
          reciboAplicaciones: [],
          fechaEmision: new Date('2026-10-01'),
          fechaVence: new Date('2026-10-15'),
          moneda: 'NIO',
          tipoCambioEmision: 1,
        },
        {
          id: 'fac-pending-1',
          folio: 'FAC-CTR-2026-0002-C1',
          clienteId: 'cli-2',
          cliente: { id: 'cli-2', nombre: 'Cliente 2', rfc: 'RUC2' },
          condicionPago: 'CREDITO',
          estado: 'PENDIENTE',
          estadoCxc: 'PENDIENTE',
          total: 8000,
          saldoPendiente: 8000,
          pagos: [],
          reciboAplicaciones: [],
          fechaEmision: new Date('2026-10-01'),
          fechaVence: new Date('2026-10-15'),
          moneda: 'NIO',
          tipoCambioEmision: 1,
        },
      ]);

      const result = await service.getAntiguedadCartera('emp-1', {
        monedaVisualizacion: 'NIO',
        criterioFecha: 'VENCIMIENTO',
      });

      // Solo debe aparecer la factura pendiente (Cliente 2)
      expect(result.resumenGlobal.totalDocumentos).toBe(1);
      expect(result.resumenGlobal.totalCarteraVisualizada).toBe(8000);
      expect(result.clientes.length).toBe(1);
      expect(result.clientes[0].clienteId).toBe('cli-2');
      expect(result.clientes[0].documentos[0].folio).toBe('FAC-CTR-2026-0002-C1');
    });

    it('debe excluir facturas cuyo total de pagos iguala o supera el total aun si el saldo en db no se habia actualizado', async () => {
      mockPrisma.factura.findMany.mockResolvedValue([
        {
          id: 'fac-paid-partial-full',
          folio: 'FAC-CTR-2026-0009-C1',
          clienteId: 'cli-1',
          cliente: { id: 'cli-1', nombre: 'Cliente 1', rfc: 'RUC1' },
          condicionPago: 'CREDITO',
          estado: 'PENDIENTE',
          estadoCxc: 'PENDIENTE',
          total: 10000,
          saldoPendiente: 10000, // No se había refrescado en la fila
          pagos: [{ monto: 6000 }, { monto: 4000 }], // Pero tiene pagos al 100%
          reciboAplicaciones: [],
          fechaEmision: new Date('2026-10-01'),
          fechaVence: new Date('2026-10-15'),
          moneda: 'NIO',
          tipoCambioEmision: 1,
        },
      ]);

      const result = await service.getAntiguedadCartera('emp-1', {
        monedaVisualizacion: 'NIO',
        criterioFecha: 'VENCIMIENTO',
      });

      expect(result.resumenGlobal.totalDocumentos).toBe(0);
      expect(result.resumenGlobal.totalCarteraVisualizada).toBe(0);
      expect(result.clientes.length).toBe(0);
    });
  });

  describe('CxcEstadoCuentaService - Movimientos de Facturas y Pagos', () => {
    let service: CxcEstadoCuentaService;
    let mockPrisma: any;
    let mockTipoCambio: any;

    beforeEach(() => {
      mockPrisma = {
        cliente: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'cli-1',
            nombre: 'Cliente Prueba',
            rfc: 'RUC123',
            esRetenedor: false,
            empresa: { nombre: 'BM', rfc: 'BM123' },
          }),
        },
        factura: { findMany: jest.fn() },
        notaDebito: { findMany: jest.fn().mockResolvedValue([]) },
        reciboCaja: { findMany: jest.fn().mockResolvedValue([]) },
      };
      mockTipoCambio = {
        getTipoCambioHoy: jest.fn().mockResolvedValue({ tasa: 36.6243 }),
      };
      service = new CxcEstadoCuentaService(mockPrisma, mockTipoCambio);
    });

    it('debe registrar pagos directos de facturas como abonos en los movimientos cronológicos', async () => {
      mockPrisma.factura.findMany.mockResolvedValue([
        {
          id: 'fac-1',
          folio: 'FAC-CTR-2026-0001-C1',
          total: 4000,
          moneda: 'NIO',
          fechaEmision: new Date('2026-10-01'),
          tipoCambioEmision: 1,
          estadoCxc: 'PAGADA',
          pagos: [
            {
              id: 'pago-1',
              monto: 4000,
              metodo: 'TRANSFERENCIA',
              referencia: 'TR-1001',
              fechaPago: new Date('2026-10-05'),
            },
          ],
        },
      ]);

      const estado = await service.obtenerEstadoCuenta('emp-1', 'cli-1', 'NIO');

      // Movimiento 1: Cargo Factura 4000
      // Movimiento 2: Abono Pago Factura 4000
      expect(estado.movimientos.length).toBe(2);
      expect(estado.movimientos[0].cargo).toBe(4000);
      expect(estado.movimientos[0].abono).toBe(0);
      expect(estado.movimientos[1].cargo).toBe(0);
      expect(estado.movimientos[1].abono).toBe(4000);
      // Saldo final resultante debe ser 0
      expect(estado.resumen.saldoActualVisualizado).toBe(0);
    });
  });
});
