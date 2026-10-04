import { ExecutionContext } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lastValueFrom, of } from 'rxjs';
import {
  DiasHorasInterceptor,
  serializeDiasHoras,
} from './dias-horas.interceptor';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('serializeDiasHoras', () => {
  it('convierte dias y horas Decimal a number', () => {
    const out = serializeDiasHoras({ dias: D('1.00'), horas: D('8.50') });
    expect(out.dias).toBe(1);
    expect(out.horas).toBe(8.5);
    expect(typeof out.dias).toBe('number');
  });

  it('Decimal(0) tambien se convierte (0, no texto)', () => {
    const out = serializeDiasHoras({ dias: D(0), horas: D('0.00') });
    expect(out).toEqual({ dias: 0, horas: 0 });
  });

  it('no toca importes Decimal ni otras claves', () => {
    const precio = D('1500.50');
    const out = serializeDiasHoras({
      dias: D(2),
      precioUnitario: precio,
      subtotal: D('3001'),
      total: D('3481.16'),
      horasPactadas: D('8'),
      horasPorDia: D('8.00'),
      diasGracia: D(3),
      horasTotales: D(4),
      Dias: D(5),
      cantidad: 3,
    });
    expect(out.dias).toBe(2);
    expect(out.precioUnitario).toBe(precio);
    expect(Prisma.Decimal.isDecimal(out.subtotal)).toBe(true);
    expect(Prisma.Decimal.isDecimal(out.total)).toBe(true);
    expect(Prisma.Decimal.isDecimal(out.horasPactadas)).toBe(true);
    expect(Prisma.Decimal.isDecimal(out.horasPorDia)).toBe(true);
    expect(Prisma.Decimal.isDecimal(out.diasGracia)).toBe(true);
    expect(Prisma.Decimal.isDecimal(out.horasTotales)).toBe(true);
    expect(Prisma.Decimal.isDecimal(out.Dias)).toBe(true);
    expect(out.cantidad).toBe(3);
    // JSON: importes como texto, dias como numero
    expect(JSON.parse(JSON.stringify(out))).toMatchObject({
      dias: 2,
      precioUnitario: '1500.5',
      subtotal: '3001',
      total: '3481.16',
      horasPactadas: '8',
      horasPorDia: '8',
    });
  });

  it('dias/horas que no son Decimal se dejan tal cual (number, string, null, undefined)', () => {
    const out = serializeDiasHoras({
      a: { dias: 3, horas: null },
      b: { dias: '4', horas: undefined },
    });
    expect(out).toEqual({
      a: { dias: 3, horas: null },
      b: { dias: '4', horas: undefined },
    });
  });

  it('no muta el original y devuelve copias', () => {
    const original = {
      items: [{ dias: D(1), horas: D(8), nested: { dias: D(2) } }],
      dias: D(3),
    };
    const out = serializeDiasHoras(original);
    expect(out).not.toBe(original);
    expect(out.items).not.toBe(original.items);
    expect(out.items[0]).not.toBe(original.items[0]);
    expect(out.items[0].nested).not.toBe(original.items[0].nested);
    expect(Prisma.Decimal.isDecimal(original.dias)).toBe(true);
    expect(Prisma.Decimal.isDecimal(original.items[0].dias)).toBe(true);
    expect(Prisma.Decimal.isDecimal(original.items[0].horas)).toBe(true);
    expect(Prisma.Decimal.isDecimal(original.items[0].nested.dias)).toBe(true);
    expect(out.items[0].dias).toBe(1);
    expect(out.items[0].nested.dias).toBe(2);
  });

  it('conserva Date y Buffer (misma referencia)', () => {
    const fecha = new Date('2026-10-04T12:00:00Z');
    const buf = Buffer.from('abc');
    const out = serializeDiasHoras({
      fechaInicio: fecha,
      adjunto: buf,
      items: [{ dias: D(1), creado: fecha }],
    });
    expect(out.fechaInicio).toBe(fecha);
    expect(out.adjunto).toBe(buf);
    expect(Buffer.isBuffer(out.adjunto)).toBe(true);
    expect(out.items[0].creado).toBe(fecha);
    expect(out.items[0].dias).toBe(1);
  });

  it('no recorre ni copia instancias de clases (solo objetos planos y arrays)', () => {
    class Raro {
      dias = D(9);
    }
    const raro = new Raro();
    const mapa = new Map([['dias', D(1)]]);
    const out = serializeDiasHoras({ raro, mapa });
    expect(out.raro).toBe(raro);
    expect(out.mapa).toBe(mapa);
    expect(Prisma.Decimal.isDecimal(raro.dias)).toBe(true);
  });

  it('es seguro ante ciclos y conserva la forma circular', () => {
    const cotizacion: any = { id: 'c1', items: [] };
    const item: any = { dias: D(1), cotizacion };
    cotizacion.items.push(item);
    cotizacion.self = cotizacion;

    const out = serializeDiasHoras(cotizacion);
    expect(out).not.toBe(cotizacion);
    expect(out.self).toBe(out);
    expect(out.items[0].cotizacion).toBe(out);
    expect(out.items[0].dias).toBe(1);
    expect(Prisma.Decimal.isDecimal(item.dias)).toBe(true);
  });

  it('un objeto compartido se copia una sola vez', () => {
    const compartido = { dias: D(5) };
    const out = serializeDiasHoras({ a: compartido, b: compartido });
    expect(out.a).toBe(out.b);
    expect(out.a.dias).toBe(5);
  });

  it('recorre anidados: factura.cotizacion.items y contrato.cotizacion.items', () => {
    const factura = {
      id: 'f1',
      total: D('1160'),
      cotizacion: {
        total: D('1160'),
        items: [{ dias: D('1.00'), horas: null, subtotal: D('1000') }],
      },
      pagos: [{ monto: D('10') }],
    };
    const contrato = {
      id: 'k1',
      cotizacion: {
        items: [{ dias: D('30'), horas: D('240.5'), precioUnitario: D('9.99') }],
      },
      items: [{ dias: D('2.25'), horasPactadas: D('8'), horasPorDia: D('8') }],
    };
    const f = serializeDiasHoras(factura);
    expect(f.cotizacion.items[0].dias).toBe(1);
    expect(f.cotizacion.items[0].horas).toBeNull();
    expect(Prisma.Decimal.isDecimal(f.cotizacion.items[0].subtotal)).toBe(true);
    expect(Prisma.Decimal.isDecimal(f.total)).toBe(true);
    expect(Prisma.Decimal.isDecimal(f.pagos[0].monto)).toBe(true);

    const k = serializeDiasHoras(contrato);
    expect(k.cotizacion.items[0].dias).toBe(30);
    expect(k.cotizacion.items[0].horas).toBe(240.5);
    expect(Prisma.Decimal.isDecimal(k.cotizacion.items[0].precioUnitario)).toBe(true);
    expect(k.items[0].dias).toBe(2.25);
    expect(Prisma.Decimal.isDecimal(k.items[0].horasPactadas)).toBe(true);
    expect(Prisma.Decimal.isDecimal(k.items[0].horasPorDia)).toBe(true);
  });

  it('recorre arrays de nivel superior y arrays anidados', () => {
    const out = serializeDiasHoras([
      { items: [{ dias: D(1) }] },
      [{ dias: D(2) }],
      null,
      7,
      'x',
    ]);
    expect(out).toEqual([{ items: [{ dias: 1 }] }, [{ dias: 2 }], null, 7, 'x']);
  });

  it('null, undefined y primitivos pasan sin cambios', () => {
    expect(serializeDiasHoras(null)).toBeNull();
    expect(serializeDiasHoras(undefined)).toBeUndefined();
    expect(serializeDiasHoras(5)).toBe(5);
    expect(serializeDiasHoras('texto')).toBe('texto');
    expect(serializeDiasHoras(true)).toBe(true);
    const d = D('1.5');
    expect(serializeDiasHoras(d)).toBe(d);
  });

  it('objetos sin prototipo se tratan como planos', () => {
    const o = Object.create(null) as Record<string, unknown>;
    o.dias = D(4);
    const out = serializeDiasHoras(o);
    expect(out.dias).toBe(4);
  });
});

describe('DiasHorasInterceptor', () => {
  const ctx = {} as ExecutionContext;

  it('transforma la respuesta del handler', async () => {
    const interceptor = new DiasHorasInterceptor();
    const payload = { success: true, data: { items: [{ dias: D(1), horas: D(8), subtotal: D('10.5') }] } };
    const out: any = await lastValueFrom(
      interceptor.intercept(ctx, { handle: () => of(payload) }),
    );
    expect(out.data.items[0].dias).toBe(1);
    expect(out.data.items[0].horas).toBe(8);
    expect(JSON.parse(JSON.stringify(out)).data.items[0].subtotal).toBe('10.5');
    expect(Prisma.Decimal.isDecimal(payload.data.items[0].dias)).toBe(true);
  });

  it('respuesta undefined (p. ej. 204 o @Res passthrough) pasa sin error', async () => {
    const interceptor = new DiasHorasInterceptor();
    const out = await lastValueFrom(
      interceptor.intercept(ctx, { handle: () => of(undefined) }),
    );
    expect(out).toBeUndefined();
  });
});
