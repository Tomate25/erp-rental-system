import { TipoCambioService } from './tipo-cambio.service';
import { CxcConfiguracionService } from './cxc-configuracion.service';
import { CxcArreglosService } from './cxc-arreglos.service';

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
});
