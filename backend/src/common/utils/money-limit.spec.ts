import { BadRequestException } from '@nestjs/common';
import { EstadoCorteFacturacion, EstadoCotizacion, Prisma } from '@prisma/client';
import { assertMoneyWithinLimit } from './decimal.util';
import {
  BillingService,
  assertRetencionNoSuperaIva,
  normalizarRetencionIva,
} from '../../modules/billing/billing.service';

describe('assertMoneyWithinLimit', () => {
  it('acepta importes dentro del tope Decimal(12,2), incluido el borde y los negativos', () => {
    expect(assertMoneyWithinLimit(0, 'total')).toBe(0);
    expect(assertMoneyWithinLimit(1234.56, 'total')).toBe(1234.56);
    expect(assertMoneyWithinLimit(9999999999.99, 'total')).toBe(9999999999.99);
    expect(assertMoneyWithinLimit(-50, 'total')).toBe(-50);
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
  ])('rechaza %s con 400 y mensaje claro', (_n, valor) => {
    expect(() => assertMoneyWithinLimit(valor, 'total del documento')).toThrow(
      new BadRequestException(`El total del documento no es un numero valido (${String(valor)}).`),
    );
  });

  it('rechaza lo que no es number (string, null, undefined)', () => {
    for (const v of ['5', null, undefined] as any[]) {
      expect(() => assertMoneyWithinLimit(v, 'total')).toThrow(BadRequestException);
    }
  });

  it('sigue rechazando importes sobre el tope con su mensaje original', () => {
    expect(() => assertMoneyWithinLimit(10000000000, 'total')).toThrow(
      new BadRequestException('El total (10000000000.00) excede el maximo permitido (9,999,999,999.99).'),
    );
    expect(() => assertMoneyWithinLimit(-10000000000, 'total')).toThrow(BadRequestException);
  });
});

describe('normalizarRetencionIva', () => {
  it('sin valor es 0', () => {
    expect(normalizarRetencionIva(undefined)).toBe(0);
    expect(normalizarRetencionIva(null)).toBe(0);
  });

  it('0 y valores validos pasan (redondeados a 2 decimales)', () => {
    expect(normalizarRetencionIva(0)).toBe(0);
    expect(normalizarRetencionIva(150.25)).toBe(150.25);
    expect(normalizarRetencionIva(9999999999.99)).toBe(9999999999.99);
  });

  it('NaN ya no se convierte en 0: 400', () => {
    expect(() => normalizarRetencionIva(NaN)).toThrow(BadRequestException);
    expect(() => normalizarRetencionIva(NaN)).toThrow("El campo 'retencionIva' debe ser un número válido y finito.");
  });

  it.each([
    ['Infinity', Infinity, "El campo 'retencionIva' debe ser un número válido y finito."],
    ['negativa', -1, "El campo 'retencionIva' no puede ser negativo."],
    ['texto', '5', "El campo 'retencionIva' debe ser un número válido y finito."],
    ['sobre el tope', 10000000000, 'El importe de la retencion de IVA (10000000000.00) excede el maximo permitido (9,999,999,999.99).'],
  ])('rechaza %s', (_n, valor, msg) => {
    expect(() => normalizarRetencionIva(valor)).toThrow(new BadRequestException(msg));
  });
});

describe('BillingService valida la retencion antes de facturar', () => {
  it('invoiceQuotation con retencionIva NaN: 400 y no abre transaccion', async () => {
    const prisma: any = {
      cotizacion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cot-1', empresaId: 'A', sucursalId: null, clienteId: 'c', cliente: { empresaId: 'A' },
          estado: EstadoCotizacion.ACEPTADA, items: [], facturas: [],
        }),
      },
      sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'suc-a' }) },
      $transaction: jest.fn(),
    };
    await expect(
      new BillingService(prisma).invoiceQuotation('cot-1', { retencionIva: NaN }, 'A'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('invoiceCorte con retencionIva NaN o sobre el tope: 400 y no abre transaccion', async () => {
    const prisma: any = {
      corteFacturacion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'corte-1', numeroCorte: 1, estado: EstadoCorteFacturacion.PENDIENTE, facturas: [],
          contrato: { codigo: 'CTR-1', items: [] },
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new BillingService(prisma);
    await expect(service.invoiceCorte('corte-1', { retencionIva: NaN }, 'A')).rejects.toThrow(BadRequestException);
    await expect(service.invoiceCorte('corte-1', { retencionIva: 1e10 }, 'A')).rejects.toThrow(
      'excede el maximo permitido',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('assertRetencionNoSuperaIva', () => {
  const msg = (x: string, iva: string) =>
    `La retencion de IVA (${x}) no puede superar el IVA del documento (${iva}).`;

  it('acepta retencion 0, menor o igual al IVA (tolerancia 0.00)', () => {
    expect(() => assertRetencionNoSuperaIva(0, 150)).not.toThrow();
    expect(() => assertRetencionNoSuperaIva(149.99, 150)).not.toThrow();
    expect(() => assertRetencionNoSuperaIva(150, new Prisma.Decimal('150.00'))).not.toThrow();
    expect(() => assertRetencionNoSuperaIva(0, 0)).not.toThrow();
  });

  it('rechaza un centavo por encima con el texto exacto', () => {
    expect(() => assertRetencionNoSuperaIva(150.01, 150)).toThrow(new BadRequestException(msg('150.01', '150.00')));
    expect(() => assertRetencionNoSuperaIva(0.01, 0)).toThrow(new BadRequestException(msg('0.01', '0.00')));
  });

  it('compara redondeando ambos a 2 decimales (half-up) con Prisma.Decimal', () => {
    // IVA 15.004 -> 15.00: 15.00 pasa, 15.01 no.
    expect(() => assertRetencionNoSuperaIva(15, new Prisma.Decimal('15.004'))).not.toThrow();
    expect(() => assertRetencionNoSuperaIva(15.01, new Prisma.Decimal('15.004'))).toThrow(
      new BadRequestException(msg('15.01', '15.00')),
    );
    // IVA 14.996 -> 15.00: una retencion de 15.00 es valida.
    expect(() => assertRetencionNoSuperaIva(15, new Prisma.Decimal('14.996'))).not.toThrow();
  });

  it('un IVA nulo cuenta como 0', () => {
    expect(() => assertRetencionNoSuperaIva(1, null)).toThrow(new BadRequestException(msg('1.00', '0.00')));
  });
});

describe('invoiceQuotation: retencion contra el IVA de la cotizacion', () => {
  const armar = (iva: Prisma.Decimal | number) => {
    const prisma: any = {
      cotizacion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cot-1', empresaId: 'A', sucursalId: null, clienteId: 'c', cliente: { empresaId: 'A' },
          estado: EstadoCotizacion.ACEPTADA, items: [], facturas: [], iva,
        }),
      },
      sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'suc-a' }) },
      $transaction: jest.fn().mockResolvedValue({ id: 'fac-1' }),
    };
    return { prisma, service: new BillingService(prisma) };
  };

  it('retencion mayor al IVA: 400 con texto exacto y no abre transaccion', async () => {
    const { prisma, service } = armar(new Prisma.Decimal('15.00'));
    const llamada = service.invoiceQuotation('cot-1', { retencionIva: 15.01 }, 'A');
    await expect(llamada).rejects.toThrow(BadRequestException);
    await expect(llamada).rejects.toThrow('La retencion de IVA (15.01) no puede superar el IVA del documento (15.00).');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('retencion igual al IVA, o sin retencion, sigue adelante', async () => {
    const { prisma, service } = armar(new Prisma.Decimal('15.00'));
    await service.invoiceQuotation('cot-1', { retencionIva: 15 }, 'A');
    await service.invoiceQuotation('cot-1', {}, 'A');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
