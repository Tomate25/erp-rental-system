import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateDespachoDto } from './create-operations.dto';
import { validate } from 'class-validator';
import { ACTA_MAX_JSON_CHARS, MaxJsonSize } from './acta-entrega.dto';

const UUID = '3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a11';
const pipe = () => new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

async function validar(acta: unknown): Promise<{ ok: boolean; mensajes: string[]; dto?: CreateDespachoDto }> {
  const body: any = { contratoId: UUID, items: [] };
  if (acta !== undefined) body.actaEntregaData = acta;
  try {
    const dto = (await pipe().transform(body, { type: 'body', metatype: CreateDespachoDto })) as CreateDespachoDto;
    return { ok: true, mensajes: [], dto };
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return { ok: false, mensajes: ((e as BadRequestException).getResponse() as any).message };
  }
}

// Exactamente lo que arma DespachoForm.tsx (handleSubmit)
const actaDelFront = {
  fecha: '4/10/2026',
  hora: '08:30',
  ampm: 'AM',
  entregadoPor: 'BM Construcciones / Almacén',
  recibidoPor: 'Cliente de prueba',
  cedula: '001-010190-0001A',
  contratoNo: 'CTR-2026-0001',
  observaciones: 'Equipo entregado en perfecto estado de funcionamiento y limpieza.',
  items: [
    { itemNum: '01', cant: 2, descripcion: 'CAT 320 (Serie: SN-1)', horas: '120.5', combustible: '5 BARRAS' },
    { itemNum: '02', cant: 1, descripcion: 'Revolvedora', horas: '0', combustible: 'N/A' },
  ],
};

describe('actaEntregaData (CreateDespachoDto)', () => {
  it('sin acta es valido (opcional)', async () => {
    expect((await validar(undefined)).ok).toBe(true);
  });

  it('acepta exactamente el payload que envia el front hoy', async () => {
    const r = await validar(actaDelFront);
    expect(r.mensajes).toEqual([]);
    expect(r.ok).toBe(true);
    // se conserva el contenido tal cual
    expect(JSON.parse(JSON.stringify(r.dto!.actaEntregaData))).toEqual(actaDelFront);
  });

  it('acepta acta vacia, items vacios y formas del tipo del front (cant/itemNum string o number)', async () => {
    expect((await validar({})).ok).toBe(true);
    expect((await validar({ items: [] })).ok).toBe(true);
    expect((await validar({ items: [{ itemNum: 1, cant: '1', descripcion: 'X', horas: '0', combustible: 'N/D' }] })).ok).toBe(true);
  });

  it('horas numerico se normaliza a texto (el front lo tipa como string)', async () => {
    const r = await validar({ items: [{ horas: 120 }] });
    expect(r.ok).toBe(true);
    expect(r.dto!.actaEntregaData!.items![0].horas).toBe('120');
  });

  it('acepta los textos justo en el limite', async () => {
    const r = await validar({
      fecha: 'x'.repeat(30), hora: 'x'.repeat(10), entregadoPor: 'x'.repeat(120), recibidoPor: 'x'.repeat(120),
      cedula: 'x'.repeat(30), contratoNo: 'x'.repeat(60), observaciones: 'x'.repeat(2000),
      items: [{ itemNum: 'x'.repeat(10), cant: 100000, descripcion: 'x'.repeat(300), horas: 'x'.repeat(20), combustible: 'x'.repeat(60) }],
    });
    expect(r.mensajes).toEqual([]);
  });

  it.each([
    ['fecha numerica', { fecha: 5 }, ['actaEntregaData.fecha debe ser texto', 'actaEntregaData.fecha no puede superar 30 caracteres']],
    ['fecha larga', { fecha: 'x'.repeat(31) }, ['actaEntregaData.fecha no puede superar 30 caracteres']],
    ['hora larga', { hora: 'x'.repeat(11) }, ['actaEntregaData.hora no puede superar 10 caracteres']],
    ['ampm invalido', { ampm: 'PM2' }, ['actaEntregaData.ampm debe ser AM o PM']],
    ['entregadoPor largo', { entregadoPor: 'x'.repeat(121) }, ['actaEntregaData.entregadoPor no puede superar 120 caracteres']],
    ['recibidoPor largo', { recibidoPor: 'x'.repeat(121) }, ['actaEntregaData.recibidoPor no puede superar 120 caracteres']],
    ['cedula larga', { cedula: 'x'.repeat(31) }, ['actaEntregaData.cedula no puede superar 30 caracteres']],
    ['contratoNo largo', { contratoNo: 'x'.repeat(61) }, ['actaEntregaData.contratoNo no puede superar 60 caracteres']],
    ['observaciones largas', { observaciones: 'x'.repeat(2001) }, ['actaEntregaData.observaciones no puede superar 2000 caracteres']],
    ['demasiadas lineas', { items: Array.from({ length: 201 }, () => ({})) }, ['actaEntregaData.items no puede tener más de 200 líneas']],
    ['descripcion larga', { items: [{ descripcion: 'x'.repeat(301) }] }, ['actaEntregaData.items.0.descripcion no puede superar 300 caracteres']],
    ['horas largas', { items: [{ horas: 'x'.repeat(21) }] }, ['actaEntregaData.items.0.horas no puede superar 20 caracteres']],
    ['combustible largo', { items: [{ combustible: 'x'.repeat(61) }] }, ['actaEntregaData.items.0.combustible no puede superar 60 caracteres']],
    ['itemNum largo', { items: [{ itemNum: 'x'.repeat(11) }] }, ['actaEntregaData.items.0.itemNum debe ser texto de hasta 10 caracteres o un número entre 0 y 200']],
    ['itemNum negativo', { items: [{ itemNum: -1 }] }, ['actaEntregaData.items.0.itemNum debe ser texto de hasta 10 caracteres o un número entre 0 y 200']],
    ['cant negativa', { items: [{ cant: -1 }] }, ['actaEntregaData.items.0.cant debe ser un número entre 0 y 100000 o texto de hasta 10 caracteres']],
    ['cant enorme', { items: [{ cant: 100001 }] }, ['actaEntregaData.items.0.cant debe ser un número entre 0 y 100000 o texto de hasta 10 caracteres']],
    ['cant objeto', { items: [{ cant: {} }] }, ['actaEntregaData.items.0.cant debe ser un número entre 0 y 100000 o texto de hasta 10 caracteres']],
  ])('rechaza: %s', async (_n, acta, esperado) => {
    const r = await validar(acta);
    expect(r.ok).toBe(false);
    expect([...r.mensajes].sort()).toEqual([...esperado].sort());
  });

  it.each([
    ['actaEntregaData es texto', 'hola', 'actaEntregaData debe ser un objeto'],
    ['items no es lista', { items: 'x' }, 'actaEntregaData.items debe ser una lista'],
  ])('rechaza: %s (puede traer ademas mensajes genericos de anidado)', async (_n, acta, msg) => {
    const r = await validar(acta);
    expect(r.ok).toBe(false);
    expect(r.mensajes).toContain(msg);
  });

  it('rechaza actaEntregaData como lista (el pipe solo muestra los errores de anidado)', async () => {
    const r = await validar([1, 2]);
    expect(r.ok).toBe(false);
    expect(r.mensajes.length).toBeGreaterThan(0);
  });

  it('rechaza claves que el front no usa (forbidNonWhitelisted), a nivel acta y de linea', async () => {
    const a = await validar({ ...actaDelFront, script: '<x>' });
    expect(a.mensajes).toEqual(['actaEntregaData.property script should not exist']);
    const b = await validar({ items: [{ descripcion: 'X', precio: 1 }] });
    expect(b.mensajes).toEqual(['actaEntregaData.items.0.property precio should not exist']);
  });

  it('el maximo teorico (200 lineas con todos los textos al limite) cabe en el tope de tamano', async () => {
    const linea = { itemNum: 'x'.repeat(10), cant: 1, descripcion: 'x'.repeat(300), horas: 'x'.repeat(20), combustible: 'x'.repeat(60) };
    const grande = { observaciones: 'x'.repeat(2000), items: Array.from({ length: 200 }, () => linea) };
    expect(JSON.stringify(grande).length).toBeLessThan(ACTA_MAX_JSON_CHARS);
    expect((await validar(grande)).ok).toBe(true);
  });
});

describe('MaxJsonSize', () => {
  it('rechaza cuando el JSON supera el tope', async () => {
    class Holder { @MaxJsonSize(10, { message: 'grande' }) v: unknown; }
    const h = new Holder();
    h.v = { a: 'x'.repeat(50) };
    expect((await validate(h)).map((e) => Object.values(e.constraints!)).flat()).toEqual(['grande']);
    h.v = { a: 1 };
    expect(await validate(h)).toEqual([]);
  });
});
