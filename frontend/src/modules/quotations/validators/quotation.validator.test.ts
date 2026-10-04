import { describe, expect, it } from 'vitest';
import {
  emailDestinoSchema,
  firstQuotationError,
  motivoRechazoSchema,
  notasRevisionSchema,
  validateQuotationPayload,
} from './quotation.validator';

const lineaDia = {
  equipoId: 'eq-1',
  descripcion: 'Retroexcavadora 420F',
  tipoCobro: 'POR_DIA',
  tipoTarifa: 'DIA',
  cantidad: 1,
  dias: 3,
  horas: undefined,
  precioUnitario: 1500,
  descuento: 0,
  subtotal: 4500,
};

const lineaHora = { ...lineaDia, tipoCobro: 'POR_HORA', tipoTarifa: 'HORA', dias: 24, horas: 24 };

const cotizacion = {
  clienteId: 'cli-1',
  proyecto: 'Obra norte',
  atencion: 'Ana',
  telefono: '8888-0000',
  email: 'ana@empresa.com',
  referencia: '',
  asesorId: 'user-1',
  condiciones: '',
  validezDias: 15,
  fechaInicioRenta: '2026-10-05T12:00:00.000Z',
  fechaFinRenta: '2026-10-08T12:00:00.000Z',
  descuento: 0,
  subtotal: 4500,
  iva: 675,
  total: 5175,
  estado: 'BORRADOR',
  items: [lineaDia],
};

const mensajes = (input: unknown): string[] => {
  const r = validateQuotationPayload(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};
const ok = (input: unknown): boolean => validateQuotationPayload(input).success;
const conLinea = (cambios: Record<string, unknown>, base: Record<string, unknown> = lineaDia) => ({
  ...cotizacion,
  items: [{ ...base, ...cambios }],
});

describe('cotizacion: valida el payload completo', () => {
  it('acepta una cotizacion valida con linea DIA y con linea HORA', () => {
    expect(ok(cotizacion)).toBe(true);
    expect(ok({ ...cotizacion, items: [lineaDia, lineaHora] })).toBe(true);
  });

  it('acepta textos opcionales vacios y sin asesor ni equipo', () => {
    expect(ok({ ...cotizacion, asesorId: undefined, proyecto: '', atencion: '', telefono: '', email: '' })).toBe(true);
    expect(ok(conLinea({ equipoId: undefined }))).toBe(true);
  });
});

describe('cotizacion: textos de la cabecera (en el limite pasa, uno mas falla)', () => {
  const casos: Array<[string, number, RegExp]> = [
    ['clienteId', 64, /El cliente no puede superar 64 caracteres/],
    ['proyecto', 200, /El proyecto no puede superar 200 caracteres/],
    ['atencion', 200, /La atención no puede superar 200 caracteres/],
    ['referencia', 200, /La referencia no puede superar 200 caracteres/],
    ['telefono', 30, /El teléfono no puede superar 30 caracteres/],
    ['email', 254, /El correo no puede superar 254 caracteres/],
    ['asesorId', 64, /El asesor no puede superar 64 caracteres/],
  ];
  it.each(casos)('%s: %i pasa, uno mas falla', (campo, max, mensaje) => {
    expect(ok({ ...cotizacion, [campo]: 'x'.repeat(max) })).toBe(true);
    expect(mensajes({ ...cotizacion, [campo]: 'x'.repeat(max + 1) }).some((m) => mensaje.test(m))).toBe(true);
  });

  it('condiciones: 2000 pasa, 2001 falla', () => {
    expect(ok({ ...cotizacion, condiciones: 'c'.repeat(2000) })).toBe(true);
    expect(mensajes({ ...cotizacion, condiciones: 'c'.repeat(2001) }).join('|')).toMatch(/Las condiciones no puede superar .+ caracteres/);
  });

  it('el cliente es requerido', () => {
    expect(mensajes({ ...cotizacion, clienteId: '' })).toContain('Debes seleccionar un cliente.');
  });
});

describe('cotizacion: validezDias', () => {
  it('1 y 365 pasan; 0 y 366 fallan', () => {
    expect(ok({ ...cotizacion, validezDias: 1 })).toBe(true);
    expect(ok({ ...cotizacion, validezDias: 365 })).toBe(true);
    expect(mensajes({ ...cotizacion, validezDias: 0 })).toContain('La validez (días) debe ser al menos 1');
    expect(mensajes({ ...cotizacion, validezDias: 366 })).toContain('La validez (días) no puede superar 365 días');
  });

  it('NaN, Infinity y decimales fallan con mensaje visible', () => {
    expect(mensajes({ ...cotizacion, validezDias: Number.NaN })).toContain('La validez (días) debe ser un número válido');
    expect(mensajes({ ...cotizacion, validezDias: Number.POSITIVE_INFINITY })).toContain('La validez (días) debe ser un número válido');
    expect(mensajes({ ...cotizacion, validezDias: 7.5 })).toContain('La validez (días) debe ser un número entero');
  });
});

describe('cotizacion: importes de la cabecera', () => {
  const MAX = 999999999.99;
  it.each([
    ['descuento', 'El descuento'],
    ['subtotal', 'El subtotal'],
    ['iva', 'El IVA'],
    ['total', 'El total'],
  ])('%s: 0 y el maximo pasan, el maximo + 0,01 y negativos fallan', (campo, etiqueta) => {
    expect(ok({ ...cotizacion, [campo]: 0 })).toBe(true);
    expect(ok({ ...cotizacion, [campo]: MAX })).toBe(true);
    expect(mensajes({ ...cotizacion, [campo]: 1000000000 }).join('|')).toContain(`${etiqueta} no puede ser mayor a`);
    expect(mensajes({ ...cotizacion, [campo]: -1 })).toContain(`${etiqueta} no puede ser negativo`);
    expect(mensajes({ ...cotizacion, [campo]: Number.NaN })).toContain(`${etiqueta} debe ser un número válido`);
  });
});

describe('cotizacion: lineas', () => {
  it('exige al menos 1 linea y permite hasta 200', () => {
    expect(mensajes({ ...cotizacion, items: [] })).toContain('Debes agregar al menos un ítem a la cotización.');
    expect(ok({ ...cotizacion, items: Array.from({ length: 200 }, () => lineaDia) })).toBe(true);
    expect(mensajes({ ...cotizacion, items: Array.from({ length: 201 }, () => lineaDia) }).join('|')).toContain(
      'La cotización no puede tener más de 200 líneas'
    );
  });

  it('equipoId: 64 pasa, 65 falla', () => {
    expect(ok(conLinea({ equipoId: 'e'.repeat(64) }))).toBe(true);
    expect(mensajes(conLinea({ equipoId: 'e'.repeat(65) })).join('|')).toContain('El equipo no puede superar 64 caracteres');
  });

  it('descripcion: 200 pasa, 201 falla', () => {
    expect(ok(conLinea({ descripcion: 'd'.repeat(200) }))).toBe(true);
    expect(mensajes(conLinea({ descripcion: 'd'.repeat(201) })).join('|')).toContain('La descripción no puede superar 200 caracteres');
  });

  it('cantidad: 1 y 100.000 pasan; 0, 100.001 y decimales fallan', () => {
    expect(ok(conLinea({ cantidad: 1 }))).toBe(true);
    expect(ok(conLinea({ cantidad: 100000 }))).toBe(true);
    expect(mensajes(conLinea({ cantidad: 0 }))).toContain('La cantidad debe ser al menos 1');
    expect(mensajes(conLinea({ cantidad: 100001 })).join('|')).toContain('La cantidad no puede ser mayor a');
    expect(mensajes(conLinea({ cantidad: 1.5 }))).toContain('La cantidad debe ser un número entero');
  });

  it('precioUnitario: 0 y 99.999.999,99 pasan; mas, negativos y mas de 4 decimales fallan', () => {
    expect(ok(conLinea({ precioUnitario: 0 }))).toBe(true);
    expect(ok(conLinea({ precioUnitario: 99999999.99 }))).toBe(true);
    expect(ok(conLinea({ precioUnitario: 12.3456 }))).toBe(true);
    expect(mensajes(conLinea({ precioUnitario: 100000000 })).join('|')).toContain('El precio unitario no puede ser mayor a');
    expect(mensajes(conLinea({ precioUnitario: -0.01 }))).toContain('El precio unitario no puede ser negativo');
    expect(mensajes(conLinea({ precioUnitario: 1.12345 }))).toContain('El precio unitario admite como máximo 4 decimales');
    expect(mensajes(conLinea({ precioUnitario: Number.NaN }))).toContain('El precio unitario debe ser un número válido');
  });

  it.each([
    ['descuento', 'El descuento de la línea'],
    ['subtotal', 'El subtotal de la línea'],
  ])('%s de la linea: 0 y 999.999.999,99 pasan; mas y negativos fallan', (campo, etiqueta) => {
    expect(ok(conLinea({ [campo]: 0 }))).toBe(true);
    expect(ok(conLinea({ [campo]: 999999999.99 }))).toBe(true);
    expect(mensajes(conLinea({ [campo]: 1000000000 })).join('|')).toContain(`${etiqueta} no puede ser mayor a`);
    expect(mensajes(conLinea({ [campo]: -1 }))).toContain(`${etiqueta} no puede ser negativo`);
  });

  it('tipoTarifa y tipoCobro deben ser validos', () => {
    expect(mensajes(conLinea({ tipoTarifa: 'SEMANA' }))).toContain('La tarifa de la línea debe ser DIA u HORA');
    expect(mensajes(conLinea({ tipoCobro: 'POR_MES' }))).toContain('El tipo de cobro debe ser POR_DIA o POR_HORA');
  });
});

describe('cotizacion: lineas DIA (dias entero 1 a 3650)', () => {
  it('1 y 3650 pasan; 0 y 3651 fallan', () => {
    expect(ok(conLinea({ dias: 1 }))).toBe(true);
    expect(ok(conLinea({ dias: 3650 }))).toBe(true);
    expect(mensajes(conLinea({ dias: 0 }))).toContain('La duración en días debe ser al menos 1');
    expect(mensajes(conLinea({ dias: 3651 })).join('|')).toContain('La duración en días no puede ser mayor a');
  });

  it('un decimal falla', () => {
    expect(mensajes(conLinea({ dias: 2.5 }))).toContain('La duración en días debe ser un número entero');
  });

  it('NaN falla', () => {
    expect(mensajes(conLinea({ dias: Number.NaN }))).toContain('La duración en días debe ser un número válido');
  });
});

describe('cotizacion: lineas HORA (solo numero finito mayor a 0, sin tope ni decimales)', () => {
  it('acepta decimales y valores grandes (el rango final llega en otro commit)', () => {
    expect(ok(conLinea({ dias: 0.25, horas: 0.25 }, lineaHora))).toBe(true);
    expect(ok(conLinea({ dias: 1234567.891, horas: 1234567.891 }, lineaHora))).toBe(true);
  });

  it('dias y horas <= 0 fallan', () => {
    expect(mensajes(conLinea({ dias: 0 }, lineaHora))).toContain('La duración de la línea debe ser mayor a 0');
    expect(mensajes(conLinea({ horas: 0 }, lineaHora))).toContain('Las horas de la línea debe ser mayor a 0');
    expect(mensajes(conLinea({ dias: -8 }, lineaHora))).toContain('La duración de la línea debe ser mayor a 0');
    expect(mensajes(conLinea({ horas: -1 }, lineaHora))).toContain('Las horas de la línea debe ser mayor a 0');
  });

  it('dias y horas no finitos fallan', () => {
    for (const malo of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(ok(conLinea({ dias: malo }, lineaHora))).toBe(false);
      expect(ok(conLinea({ horas: malo }, lineaHora))).toBe(false);
    }
    expect(mensajes(conLinea({ horas: Number.NaN }, lineaHora))).toContain('Las horas de la línea debe ser un número válido');
  });

  it('horas es obligatorio en lineas HORA', () => {
    expect(ok(conLinea({ horas: undefined }, lineaHora))).toBe(false);
  });
});

describe('firstQuotationError', () => {
  it('prefija el numero de linea cuando el error es de una linea', () => {
    const r = validateQuotationPayload({ ...cotizacion, items: [lineaDia, { ...lineaDia, cantidad: 0 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstQuotationError(r.error)).toBe('Línea 2: La cantidad debe ser al menos 1');
  });

  it('no prefija los errores de la cabecera', () => {
    const r = validateQuotationPayload({ ...cotizacion, validezDias: Number.NaN });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstQuotationError(r.error)).toBe('La validez (días) debe ser un número válido');
  });
});

describe('notasRevisionSchema', () => {
  it('no vacia, hasta 2000: 2000 pasa y 2001 falla', () => {
    expect(notasRevisionSchema.safeParse('a'.repeat(2000)).success).toBe(true);
    const largo = notasRevisionSchema.safeParse('a'.repeat(2001));
    expect(largo.success).toBe(false);
    if (!largo.success) expect(largo.error.issues[0].message).toMatch(/La observación no puede superar .+ caracteres/);
  });

  it('rechaza vacia o solo espacios y recorta los espacios', () => {
    expect(notasRevisionSchema.safeParse('   ').success).toBe(false);
    expect(notasRevisionSchema.safeParse('').success).toBe(false);
    expect(notasRevisionSchema.parse('  ajustar precio  ')).toBe('ajustar precio');
  });
});

describe('motivoRechazoSchema', () => {
  it('5 y 1000 pasan; 4 y 1001 fallan', () => {
    expect(motivoRechazoSchema.safeParse('a'.repeat(5)).success).toBe(true);
    expect(motivoRechazoSchema.safeParse('a'.repeat(1000)).success).toBe(true);
    const corto = motivoRechazoSchema.safeParse('a'.repeat(4));
    expect(corto.success).toBe(false);
    if (!corto.success) expect(corto.error.issues[0].message).toBe('Por favor ingrese un motivo detallado de al menos 5 caracteres.');
    const largo = motivoRechazoSchema.safeParse('a'.repeat(1001));
    expect(largo.success).toBe(false);
    if (!largo.success) expect(largo.error.issues[0].message).toMatch(/El motivo del rechazo no puede superar .+ caracteres/);
  });

  it('cuenta los caracteres sin los espacios de los extremos', () => {
    expect(motivoRechazoSchema.safeParse('  abcd  ').success).toBe(false);
    expect(motivoRechazoSchema.parse('  abcde  ')).toBe('abcde');
  });
});

describe('emailDestinoSchema', () => {
  it('acepta un correo valido y recorta espacios', () => {
    expect(emailDestinoSchema.parse('  ana@empresa.com ')).toBe('ana@empresa.com');
  });

  it('rechaza vacio y formato invalido', () => {
    const vacio = emailDestinoSchema.safeParse('  ');
    expect(vacio.success).toBe(false);
    if (!vacio.success) expect(vacio.error.issues[0].message).toBe('El cliente no tiene un correo de facturación válido.');
    const malo = emailDestinoSchema.safeParse('no-es-correo');
    expect(malo.success).toBe(false);
    if (!malo.success) expect(malo.error.issues[0].message).toBe('El correo de destino no es válido');
  });

  it('254 caracteres pasa y 255 falla', () => {
    const correo = (largo: number) => `${'a'.repeat(largo - 11)}@dominio.es`;
    expect(correo(254)).toHaveLength(254);
    expect(emailDestinoSchema.safeParse(correo(254)).success).toBe(true);
    const largo = emailDestinoSchema.safeParse(correo(255));
    expect(largo.success).toBe(false);
    if (!largo.success) expect(largo.error.issues.map((i) => i.message)).toContain('El correo de destino no puede superar 254 caracteres');
  });
});
