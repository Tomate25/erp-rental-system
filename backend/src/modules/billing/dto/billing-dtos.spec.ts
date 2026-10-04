import 'reflect-metadata';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BillingController } from '../billing.controller';
import { BillingService } from '../billing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateInvoiceDto } from './create-invoice.dto';
import { RegisterPaymentDto } from './register-payment.dto';

const UUID = '3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a11';
const MAX = 9999999999.99;

// Misma configuración que main.ts
const pipe = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

async function mensajes(metatype: any, body: any): Promise<string[]> {
  try {
    await pipe().transform(body, { type: 'body', metatype });
    return [];
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    const msg = (e as BadRequestException).getResponse() as any;
    return msg.message as string[];
  }
}

const lista = (m: string | string[]) => [...[m].flat()].sort();

describe('RegisterPaymentDto', () => {
  it('acepta solo monto', async () => {
    expect(await mensajes(RegisterPaymentDto, { monto: 100 })).toEqual([]);
  });

  it('acepta el payload completo y los strings vacíos que envía el front', async () => {
    expect(
      await mensajes(RegisterPaymentDto, {
        monto: 1500.75,
        metodo: 'CHEQUE',
        referencia: '',
        banco: '',
      }),
    ).toEqual([]);
    expect(
      await mensajes(RegisterPaymentDto, {
        monto: 0.01,
        metodo: 'TARJETA',
        referencia: 'REF-1',
        banco: 'BAC',
        comprobanteUrl: 'https://example.com/c.pdf',
      }),
    ).toEqual([]);
  });

  it('acepta el tope exacto Decimal(12,2)', async () => {
    expect(await mensajes(RegisterPaymentDto, { monto: MAX })).toEqual([]);
  });

  it.each([
    ['sin monto', {}, 'El monto debe ser un número válido con máximo 2 decimales'],
    ['monto como texto', { monto: '100' }, 'El monto debe ser un número válido con máximo 2 decimales'],
    ['monto null', { monto: null }, 'El monto debe ser un número válido con máximo 2 decimales'],
    ['monto con 3 decimales', { monto: 10.123 }, 'El monto debe ser un número válido con máximo 2 decimales'],
    ['monto cero', { monto: 0 }, 'El monto debe ser mayor que cero'],
    ['monto negativo', { monto: -50 }, 'El monto debe ser mayor que cero'],
    ['monto sobre el tope', { monto: 10000000000 }, `El monto no puede superar ${MAX}`],
  ])('rechaza %s', async (_n, body, msg) => {
    expect(await mensajes(RegisterPaymentDto, body)).toContain(msg);
  });

  it.each([
    ['método inexistente', { metodo: 'BITCOIN' }, 'El método de pago no es válido (TRANSFERENCIA, TARJETA, EFECTIVO, CHEQUE)'],
    ['método en minúsculas', { metodo: 'efectivo' }, 'El método de pago no es válido (TRANSFERENCIA, TARJETA, EFECTIVO, CHEQUE)'],
    ['referencia numérica', { referencia: 123 }, ['La referencia debe ser texto', 'La referencia no puede superar 200 caracteres']],
    ['referencia larga', { referencia: 'x'.repeat(201) }, 'La referencia no puede superar 200 caracteres'],
    ['banco numérico', { banco: 5 }, ['El banco debe ser texto', 'El banco no puede superar 120 caracteres']],
    ['banco largo', { banco: 'x'.repeat(121) }, 'El banco no puede superar 120 caracteres'],
    ['comprobante numérico', { comprobanteUrl: 5 }, ['La URL del comprobante debe ser texto', 'La URL del comprobante no puede superar 500 caracteres']],
    ['comprobante largo', { comprobanteUrl: 'x'.repeat(501) }, 'La URL del comprobante no puede superar 500 caracteres'],
  ])('rechaza %s', async (_n, extra, msg) => {
    expect(lista(await mensajes(RegisterPaymentDto, { monto: 10, ...extra }))).toEqual(lista(msg));
  });

  it('acepta textos justo en el límite', async () => {
    expect(
      await mensajes(RegisterPaymentDto, {
        monto: 10,
        referencia: 'x'.repeat(200),
        banco: 'x'.repeat(120),
        comprobanteUrl: 'x'.repeat(500),
      }),
    ).toEqual([]);
  });

  it('rechaza propiedades no permitidas (forbidNonWhitelisted)', async () => {
    expect(await mensajes(RegisterPaymentDto, { monto: 10, notas: 'x' })).toEqual([
      'property notas should not exist',
    ]);
  });
});

describe('CreateInvoiceDto', () => {
  it('acepta cuerpo vacío', async () => {
    expect(await mensajes(CreateInvoiceDto, {})).toEqual([]);
  });

  it('acepta el payload que envía el front para cortes', async () => {
    expect(
      await mensajes(CreateInvoiceDto, {
        tipoFactura: 'ESTANDAR',
        condicionPago: 'CREDITO',
        plazoCreditoDias: 30,
        estado: 'PENDIENTE',
      }),
    ).toEqual([]);
  });

  it('acepta el payload completo y los valores en el límite', async () => {
    expect(
      await mensajes(CreateInvoiceDto, {
        sucursalId: UUID,
        tipoFactura: 'CARGO_DANOS',
        condicionPago: 'CONTADO',
        plazoCreditoDias: 365,
        retencionIva: MAX,
        estado: 'PAGADA',
      }),
    ).toEqual([]);
    expect(
      await mensajes(CreateInvoiceDto, { plazoCreditoDias: 0, retencionIva: 0 }),
    ).toEqual([]);
  });

  it.each([
    ['sucursal no UUID', { sucursalId: 'abc' }, 'La sucursal debe ser un identificador UUID válido'],
    ['tipo inexistente', { tipoFactura: 'OTRA' }, 'El tipo de factura no es válido (ESTANDAR, ANTICIPO, RECTIFICATIVA, CARGO_DANOS)'],
    ['condición inexistente', { condicionPago: 'MENSUAL' }, 'La condición de pago no es válida (CONTADO, CREDITO)'],
    ['plazo decimal', { plazoCreditoDias: 1.5 }, 'El plazo de crédito debe ser un número entero de días'],
    ['plazo texto', { plazoCreditoDias: '30' }, ['El plazo de crédito debe ser un número entero de días', 'El plazo de crédito no puede ser negativo', 'El plazo de crédito no puede superar 365 días']],
    ['plazo negativo', { plazoCreditoDias: -1 }, 'El plazo de crédito no puede ser negativo'],
    ['plazo sobre el máximo', { plazoCreditoDias: 366 }, 'El plazo de crédito no puede superar 365 días'],
    ['retención con 3 decimales', { retencionIva: 1.234 }, 'La retención de IVA debe ser un número válido con máximo 2 decimales'],
    ['retención texto', { retencionIva: 'x' }, ['La retención de IVA debe ser un número válido con máximo 2 decimales', 'La retención de IVA no puede ser negativa', `La retención de IVA no puede superar ${MAX}`]],
    ['retención negativa', { retencionIva: -0.01 }, 'La retención de IVA no puede ser negativa'],
    ['retención sobre el tope', { retencionIva: 10000000000 }, `La retención de IVA no puede superar ${MAX}`],
    ['estado no permitido', { estado: 'CANCELADA' }, 'El estado inicial de la factura debe ser PENDIENTE o PAGADA'],
  ])('rechaza %s', async (_n, body, msg) => {
    expect(lista(await mensajes(CreateInvoiceDto, body))).toEqual(lista(msg));
  });

  it('rechaza propiedades no permitidas (forbidNonWhitelisted)', async () => {
    expect(await mensajes(CreateInvoiceDto, { total: 1 })).toEqual([
      'property total should not exist',
    ]);
  });
});

describe('BillingController (HTTP) valida con los DTOs', () => {
  let app: INestApplication;
  const service = {
    invoiceQuotation: jest.fn().mockResolvedValue({ id: 'f1' }),
    invoiceCorte: jest.fn().mockResolvedValue({ id: 'f2' }),
    registerPayment: jest.fn().mockResolvedValue({ pago: { id: 'p1' } }),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().user = { id: 'u1', empresaId: 'e1' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(pipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('POST invoices/:id/payment válido llega al servicio con el DTO', async () => {
    await request(app.getHttpServer())
      .post(`/billing/invoices/${UUID}/payment`)
      .send({ monto: 100, metodo: 'EFECTIVO', referencia: '', banco: '' })
      .expect(201);
    expect(service.registerPayment).toHaveBeenCalledWith(
      UUID,
      expect.objectContaining({ monto: 100, metodo: 'EFECTIVO' }),
      'e1',
      'u1',
    );
  });

  it('POST invoices/:id/payment inválido da 400 con el mensaje y no llega al servicio', async () => {
    const res = await request(app.getHttpServer())
      .post(`/billing/invoices/${UUID}/payment`)
      .send({ monto: -5 })
      .expect(400);
    expect(res.body.message).toEqual(['El monto debe ser mayor que cero']);
    expect(service.registerPayment).not.toHaveBeenCalled();
  });

  it('POST invoice-quote/:id inválido da 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/billing/invoice-quote/${UUID}`)
      .send({ condicionPago: 'X' })
      .expect(400);
    expect(res.body.message).toEqual(['La condición de pago no es válida (CONTADO, CREDITO)']);
    expect(service.invoiceQuotation).not.toHaveBeenCalled();
  });

  it('POST invoice-corte/:corteId inválido da 400 y válido pasa', async () => {
    const res = await request(app.getHttpServer())
      .post(`/billing/invoice-corte/${UUID}`)
      .send({ plazoCreditoDias: 400 })
      .expect(400);
    expect(res.body.message).toEqual(['El plazo de crédito no puede superar 365 días']);
    expect(service.invoiceCorte).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post(`/billing/invoice-corte/${UUID}`)
      .send({ tipoFactura: 'ESTANDAR', condicionPago: 'CREDITO', plazoCreditoDias: 30, estado: 'PENDIENTE' })
      .expect(201);
    expect(service.invoiceCorte).toHaveBeenCalledTimes(1);
  });
});
