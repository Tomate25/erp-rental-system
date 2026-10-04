import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { lastValueFrom, of } from 'rxjs';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { BillingController } from '../../modules/billing/billing.controller';
import { BillingService } from '../../modules/billing/billing.service';
import { ContractsController } from '../../modules/contracts/controllers/contracts.controller';
import { ContractsService } from '../../modules/contracts/services/contracts.service';
import { QuotationsController } from '../../modules/quotations/controllers/quotations.controller';
import { QuotationsService } from '../../modules/quotations/services/quotations.service';
import { DiasHorasInterceptor } from './dias-horas.interceptor';

/**
 * Una prueba por cada salida (ruta o metodo de servicio) que devuelve
 * cotizacion/contrato/factura con `items` (o relaciones anidadas) en bruto desde
 * Prisma. El payload usa Prisma.Decimal reales con la forma del `include` del
 * servicio, pasa por el APP_INTERCEPTOR real y se verifica el JSON final:
 * `dias`/`horas` salen como number, los importes (y horasPactadas/horasPorDia)
 * siguen como texto.
 *
 * Los servicios se simulan (devuelven lo que devolveria Prisma); lo que se
 * ejercita es controlador + interceptor global + serializacion JSON real.
 */
const D = (v: string | number) => new Prisma.Decimal(v);

const ID = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';
const EMPRESA = 'emp-1';

const itemCotizacion = () => ({
  id: 'ic-1',
  cotizacionId: ID,
  descripcion: 'Retroexcavadora',
  tipoCobro: 'POR_DIA',
  cantidad: 2,
  dias: D('1.00'),
  horas: D('8.00'),
  precioUnitario: D('1500.5'),
  descuento: D('0'),
  subtotal: D('3001'),
  equipo: { id: 'eq-1', codigo: 'EQ-1' },
});

const cotizacion = () => ({
  id: ID,
  numeroCotizacion: 'COT-0001',
  version: 1,
  subtotal: D('3001'),
  descuento: D('0'),
  iva: D('450.15'),
  total: D('3451.15'),
  fechaEmision: new Date('2026-10-04T12:00:00Z'),
  cliente: { id: 'cl-1', nombre: 'Cliente' },
  items: [itemCotizacion(), { ...itemCotizacion(), id: 'ic-2', dias: D('2.5'), horas: null }],
});

const itemContrato = () => ({
  id: 'ict-1',
  contratoId: ID,
  equipoId: 'eq-1',
  cantidad: 1,
  dias: D('30.00'),
  horasPorDia: D('8.00'),
  horasPactadas: D('240.00'),
  tipoTarifa: 'HORA',
  precioRenta: D('125.75'),
  equipo: { id: 'eq-1', codigo: 'EQ-1' },
});

const contrato = () => ({
  id: ID,
  codigo: 'CTR-0001',
  depositoGarantia: D('500'),
  cliente: { id: 'cl-1', nombre: 'Cliente' },
  cotizacion: cotizacion(),
  items: [itemContrato()],
});

const factura = () => ({
  id: ID,
  folio: 'F-0001',
  subtotal: D('3001'),
  iva: D('450.15'),
  total: D('3451.15'),
  cliente: { id: 'cl-1' },
  empresa: { id: EMPRESA },
  cotizacion: cotizacion(),
  pagos: [{ id: 'p-1', monto: D('100.25') }],
});

type Caso = {
  /** Nombre y salida (archivo:linea del return del servicio). */
  salida: string;
  metodo: 'get' | 'post' | 'patch';
  url: string;
  servicio: 'quotations' | 'billing' | 'contracts';
  funcion: string;
  payload: () => any;
  /** Listas de items (cotizacion o contrato) dentro del payload devuelto por el servicio. */
  items: (payload: any) => any[];
  /** Esquema de los items para decidir que campos comprobar. */
  tipo: 'cotizacion' | 'contrato' | 'mixto';
};

const itemsDeCotizacion = (c: any) => c.items;
const itemsDeFactura = (f: any) => f.cotizacion.items;
const itemsDeContrato = (k: any) => [...k.items, ...k.cotizacion.items];

const CASOS: Caso[] = [
  // ---- quotations (7; findByNumero se prueba aparte: sin ruta HTTP) ----
  {
    salida: 'quotations.service.ts:465 create -> POST /quotations',
    metodo: 'post', url: '/quotations', servicio: 'quotations', funcion: 'create',
    payload: cotizacion, items: itemsDeCotizacion, tipo: 'cotizacion',
  },
  {
    salida: 'quotations.service.ts:747 findAll -> GET /quotations',
    metodo: 'get', url: '/quotations', servicio: 'quotations', funcion: 'findAll',
    payload: () => [cotizacion(), cotizacion()],
    items: (p) => p.flatMap(itemsDeCotizacion), tipo: 'cotizacion',
  },
  {
    salida: 'quotations.service.ts:785 findOne -> GET /quotations/:id',
    metodo: 'get', url: `/quotations/${ID}`, servicio: 'quotations', funcion: 'findOne',
    payload: cotizacion, items: itemsDeCotizacion, tipo: 'cotizacion',
  },
  {
    salida: 'quotations.service.ts:2172 findVersionsByNumber -> GET /quotations/number/:numero',
    metodo: 'get', url: '/quotations/number/COT-0001', servicio: 'quotations', funcion: 'findVersionsByNumber',
    payload: () => [cotizacion(), cotizacion()],
    items: (p) => p.flatMap(itemsDeCotizacion), tipo: 'cotizacion',
  },
  {
    salida: 'quotations.service.ts:2086 update -> PATCH /quotations/:id',
    metodo: 'patch', url: `/quotations/${ID}`, servicio: 'quotations', funcion: 'update',
    payload: cotizacion, items: itemsDeCotizacion, tipo: 'cotizacion',
  },
  {
    salida: 'quotations.service.ts:2161 createNewVersion -> POST /quotations/:id/version',
    metodo: 'post', url: `/quotations/${ID}/version`, servicio: 'quotations', funcion: 'createNewVersion',
    payload: cotizacion, items: itemsDeCotizacion, tipo: 'cotizacion',
  },
  // ---- billing (4) ----
  {
    salida: 'billing.service.ts:448 invoiceQuotation -> POST /billing/invoice-quote/:id',
    metodo: 'post', url: `/billing/invoice-quote/${ID}`, servicio: 'billing', funcion: 'invoiceQuotation',
    payload: factura, items: itemsDeFactura, tipo: 'cotizacion',
  },
  {
    salida: 'billing.service.ts:657-669 getInvoices -> GET /billing/invoices',
    metodo: 'get', url: '/billing/invoices', servicio: 'billing', funcion: 'getInvoices',
    payload: () => [{ ...factura(), totalPagado: 100.25, saldoPendiente: 3350.9 }],
    items: (p) => p.flatMap(itemsDeFactura), tipo: 'cotizacion',
  },
  {
    salida: 'billing.service.ts:767-772 registerPayment -> POST /billing/invoices/:id/payment',
    metodo: 'post', url: `/billing/invoices/${ID}/payment`, servicio: 'billing', funcion: 'registerPayment',
    payload: () => ({ factura: factura(), pago: { id: 'p-1', monto: D('100.25') }, saldoPendiente: 3350.9, totalPagado: 100.25 }),
    items: (p) => itemsDeFactura(p.factura), tipo: 'cotizacion',
  },
  {
    salida: 'billing.service.ts:840 markAsPaid -> POST /billing/invoices/:id/pay',
    metodo: 'post', url: `/billing/invoices/${ID}/pay`, servicio: 'billing', funcion: 'markAsPaid',
    payload: factura, items: itemsDeFactura, tipo: 'cotizacion',
  },
  // ---- contracts (5) ----
  {
    salida: 'contracts.service.ts:327 createDirect -> POST /contracts/direct',
    metodo: 'post', url: '/contracts/direct', servicio: 'contracts', funcion: 'createDirect',
    payload: contrato, items: itemsDeContrato, tipo: 'mixto',
  },
  {
    salida: 'contracts.service.ts:592 createFromQuotation -> POST /contracts/from-quotation',
    metodo: 'post', url: '/contracts/from-quotation', servicio: 'contracts', funcion: 'createFromQuotation',
    payload: contrato, items: itemsDeContrato, tipo: 'mixto',
  },
  {
    salida: 'contracts.service.ts:913 openContract -> POST /contracts/:id/abrir',
    metodo: 'post', url: `/contracts/${ID}/abrir`, servicio: 'contracts', funcion: 'openContract',
    payload: contrato, items: itemsDeContrato, tipo: 'mixto',
  },
  {
    salida: 'contracts.service.ts:1114 findAll -> GET /contracts',
    metodo: 'get', url: '/contracts', servicio: 'contracts', funcion: 'findAll',
    payload: () => [contrato(), contrato()],
    items: (p) => p.flatMap(itemsDeContrato), tipo: 'mixto',
  },
  {
    salida: 'contracts.service.ts:1136-1177 findOne -> GET /contracts/:id',
    metodo: 'get', url: `/contracts/${ID2}`, servicio: 'contracts', funcion: 'findOne',
    payload: contrato, items: itemsDeContrato, tipo: 'mixto',
  },
];

/** Comprueba un item serializado (JSON) segun su esquema. */
function verificarItemJson(item: any, original: any) {
  expect(typeof item.dias).toBe('number');
  expect(item.dias).toBe(original.dias.toNumber());
  if (original.horas === null) {
    expect(item.horas).toBeNull();
  } else if (original.horas !== undefined) {
    expect(typeof item.horas).toBe('number');
    expect(item.horas).toBe(original.horas.toNumber());
  }
  // importes y horas de contrato siguen como texto
  for (const clave of [
    'precioUnitario', 'descuento', 'subtotal', 'precioRenta',
    'horasPactadas', 'horasPorDia',
  ]) {
    if (original[clave] !== undefined) {
      expect(typeof item[clave]).toBe('string');
      expect(item[clave]).toBe(original[clave].toString());
    }
  }
}

describe('Interceptor dias/horas: una prueba por ruta de salida', () => {
  let app: INestApplication;
  const servicios = {
    quotations: {} as Record<string, jest.Mock>,
    billing: {} as Record<string, jest.Mock>,
    contracts: {} as Record<string, jest.Mock>,
  };

  beforeAll(async () => {
    for (const caso of CASOS) {
      servicios[caso.servicio][caso.funcion] = jest.fn();
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [QuotationsController, BillingController, ContractsController],
      providers: [
        { provide: QuotationsService, useValue: servicios.quotations },
        { provide: BillingService, useValue: servicios.billing },
        { provide: ContractsService, useValue: servicios.contracts },
        // Igual que en AppModule
        { provide: APP_INTERCEPTOR, useClass: DiasHorasInterceptor },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { id: ID, empresaId: EMPRESA, roles: ['ADMIN'] };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('hay 15 salidas HTTP + findByNumero = 16 salidas (7 quotations, 4 billing, 5 contracts)', () => {
    const por = (s: string) => CASOS.filter((c) => c.servicio === s).length;
    expect(por('quotations') + 1).toBe(7);
    expect(por('billing')).toBe(4);
    expect(por('contracts')).toBe(5);
    expect(CASOS.length + 1).toBe(16);
  });

  it.each(CASOS.map((c) => [c.salida, c] as const))('%s', async (_nombre, caso) => {
    const original = caso.payload();
    servicios[caso.servicio][caso.funcion].mockResolvedValue(original);

    const respuesta = await (request(app.getHttpServer()) as any)[caso.metodo](caso.url)
      .send(caso.metodo === 'get' ? undefined : {})
      .expect((res: any) => {
        if (res.status >= 400) throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body)}`);
      });

    // `data` (envuelto por el controlador) o el payload tal cual (registerPayment/otros)
    const cuerpo = respuesta.body;
    const salida = cuerpo && cuerpo.data !== undefined && cuerpo.success !== undefined ? cuerpo.data : cuerpo;
    const itemsJson = caso.items(salida);
    const itemsOriginal = caso.items(original);

    expect(itemsOriginal.length).toBeGreaterThan(0);
    expect(itemsJson).toHaveLength(itemsOriginal.length);
    itemsOriginal.forEach((orig: any, i: number) => verificarItemJson(itemsJson[i], orig));

    // Los importes del documento siguen como texto
    const doc = Array.isArray(salida) ? salida[0] : salida.factura ?? salida;
    expect(typeof doc.total === 'string' || typeof doc.cotizacion?.total === 'string').toBe(true);

    // El resultado de Prisma no se muta
    itemsOriginal.forEach((orig: any) => {
      expect(Prisma.Decimal.isDecimal(orig.dias)).toBe(true);
    });
  });

  it('quotations.service.ts:812 findByNumero (sin ruta HTTP; salida de servicio) pasa por el interceptor', async () => {
    const original = { ...cotizacion(), contratos: [] };
    const prisma: any = {
      cotizacion: { findFirst: jest.fn().mockResolvedValue(original) },
    };
    const servicio = new QuotationsService(prisma);
    const resultado = await servicio.findByNumero('COT-0001', EMPRESA);

    const interceptor = new DiasHorasInterceptor();
    const salida: any = await lastValueFrom(
      interceptor.intercept({} as any, { handle: () => of({ success: true, data: resultado }) }),
    );
    const json = JSON.parse(JSON.stringify(salida));
    expect(json.data.items).toHaveLength(2);
    json.data.items.forEach((it: any, i: number) => verificarItemJson(it, original.items[i]));
    expect(json.data.total).toBe('3451.15');
    expect(Prisma.Decimal.isDecimal(original.items[0].dias)).toBe(true);
  });

  it('AppModule registra DiasHorasInterceptor como APP_INTERCEPTOR', () => {
    const providers: any[] = Reflect.getMetadata('providers', AppModule);
    const registro = providers.find(
      (p) => p && typeof p === 'object' && p.provide === APP_INTERCEPTOR,
    );
    expect(registro).toBeDefined();
    expect(registro.useClass).toBe(DiasHorasInterceptor);
  });
});
