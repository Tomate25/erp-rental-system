import { describe, expect, it } from 'vitest';
import {
  emailDestinoSchema,
  firstQuotationError,
  motivoRechazoSchema,
  notasRevisionSchema,
  validateQuotationPayload,
} from './quotation.validator';
import { MSG_DIAS_DIA, MSG_DIAS_HORA, MSG_HORAS_DIA, MSG_HORAS_HORA } from '../../../shared/validation/dias-horas';

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
    expect(ok({ ...cotizacion, asesorId: undefined, proyecto: '', atencion: '', telefono: '', email: undefined })).toBe(true);
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
    ['asesorId', 64, /El asesor no puede superar 64 caracteres/],
  ];
  it.each(casos)('%s: %i pasa, uno mas falla', (campo, max, mensaje) => {
    expect(ok({ ...cotizacion, [campo]: 'x'.repeat(max) })).toBe(true);
    expect(mensajes({ ...cotizacion, [campo]: 'x'.repeat(max + 1) }).some((m) => mensaje.test(m))).toBe(true);
  });

  it('condiciones: 2000 pasa, 2001 falla', () => {
    expect(ok({ ...cotizacion, condiciones: 'c'.repeat(2000) })).toBe(true);
    expect(mensajes({ ...cotizacion, condiciones: 'c'.repeat(2001) }).join('|')).toMatch(/Las condiciones no pueden superar .+ caracteres/);
  });

  it('email: opcional; con formato valido pasa, mal formado o vacio falla, 254 pasa y 255 falla', () => {
    const correo = (largo: number) => `${'a'.repeat(largo - 11)}@dominio.es`;
    expect(ok({ ...cotizacion, email: undefined })).toBe(true);
    expect(ok({ ...cotizacion, email: correo(254) })).toBe(true);
    expect(mensajes({ ...cotizacion, email: 'no-es-correo' })).toContain('El correo no es v\u00e1lido');
    expect(mensajes({ ...cotizacion, email: '' })).toContain('El correo no es v\u00e1lido');
    expect(mensajes({ ...cotizacion, email: correo(255) })).toContain('El correo no puede superar 254 caracteres');
  });

  it('el cliente es requerido', () => {
    expect(mensajes({ ...cotizacion, clienteId: '' })).toContain('Debes seleccionar un cliente.');
  });
});

describe('cotizacion: validezDias', () => {
  it('un valor invalido o ausente da error y nunca se reemplaza por 15', () => {
    for (const malo of [Number.NaN, 0, 366, -1, '', undefined, null]) {
      const r = validateQuotationPayload({ ...cotizacion, validezDias: malo });
      expect(r.success).toBe(false);
    }
    expect(mensajes({ ...cotizacion, validezDias: Number.NaN })).toEqual(['La validez (d\u00edas) debe ser un n\u00famero v\u00e1lido']);
  });

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
  const base = { ...cotizacion, subtotal: MAX }; // el descuento global no puede superar el subtotal
  it.each([
    ['descuento', 'El descuento'],
    ['subtotal', 'El subtotal'],
    ['iva', 'El IVA'],
    ['total', 'El total'],
  ])('%s: 0 y el maximo pasan, el maximo + 0,01 y negativos fallan', (campo, etiqueta) => {
    expect(ok({ ...base, [campo]: 0 })).toBe(true);
    expect(ok({ ...base, [campo]: MAX })).toBe(true);
    expect(mensajes({ ...base, [campo]: 1000000000 }).join('|')).toContain(`${etiqueta} no puede ser mayor a`);
    expect(mensajes({ ...base, [campo]: -1 })).toContain(`${etiqueta} no puede ser negativo`);
    expect(mensajes({ ...base, [campo]: Number.NaN })).toContain(`${etiqueta} debe ser un número válido`);
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
    const grande = { cantidad: 100000, precioUnitario: 99999999.99, dias: 3650 }; // importe grande: el descuento no lo supera
    expect(ok(conLinea({ ...grande, [campo]: 0 }))).toBe(true);
    expect(ok(conLinea({ ...grande, [campo]: 999999999.99 }))).toBe(true);
    expect(mensajes(conLinea({ ...grande, [campo]: 1000000000 })).join('|')).toContain(`${etiqueta} no puede ser mayor a`);
    expect(mensajes(conLinea({ ...grande, [campo]: -1 }))).toContain(`${etiqueta} no puede ser negativo`);
  });

  it('tipoTarifa y tipoCobro deben ser validos', () => {
    expect(mensajes(conLinea({ tipoTarifa: 'SEMANA' }))).toContain('La tarifa de la línea debe ser DIA u HORA');
    expect(mensajes(conLinea({ tipoCobro: 'POR_MES' }))).toContain('El tipo de cobro debe ser POR_DIA o POR_HORA');
  });
});

describe('cotizacion: lineas DIA (dias entero 1 a 3650; horas opcional 0 a 87600)', () => {
  it('1 y 3650 pasan; 0 y 3651 fallan con el texto del backend', () => {
    expect(ok(conLinea({ dias: 1 }))).toBe(true);
    expect(ok(conLinea({ dias: 3650 }))).toBe(true);
    expect(mensajes(conLinea({ dias: 0 }))).toEqual([MSG_DIAS_DIA]);
    expect(mensajes(conLinea({ dias: 3651 }))).toEqual([MSG_DIAS_DIA]);
    expect(mensajes(conLinea({ dias: -1 }))).toEqual([MSG_DIAS_DIA]);
  });

  it('un decimal, NaN, Infinity, vacio y texto fallan', () => {
    for (const malo of [2.5, 0.5, Number.NaN, Number.POSITIVE_INFINITY, '', undefined, '3']) {
      expect(mensajes(conLinea({ dias: malo }))).toEqual([MSG_DIAS_DIA]);
    }
  });

  it('horas es opcional; si viene va de 0 a 87600 con maximo 2 decimales', () => {
    expect(ok(conLinea({ horas: undefined }))).toBe(true);
    expect(ok(conLinea({ horas: 0 }))).toBe(true);
    expect(ok(conLinea({ horas: 87600 }))).toBe(true);
    expect(ok(conLinea({ horas: 12.34 }))).toBe(true);
    expect(mensajes(conLinea({ horas: 87600.01 }))).toEqual([MSG_HORAS_DIA]);
    expect(mensajes(conLinea({ horas: -1 }))).toEqual([MSG_HORAS_DIA]);
    expect(mensajes(conLinea({ horas: 1.234 }))).toEqual([MSG_HORAS_DIA]);
    expect(mensajes(conLinea({ horas: Number.NaN }))).toEqual([MSG_HORAS_DIA]);
  });
});

describe('cotizacion: lineas HORA (dias y horas de 0,01 a 87600, maximo 2 decimales)', () => {
  it('0,01 y 87600 pasan; 0,009 y 87600,01 fallan', () => {
    expect(ok(conLinea({ dias: 0.01, horas: 0.01 }, lineaHora))).toBe(true);
    expect(ok(conLinea({ dias: 87600, horas: 87600 }, lineaHora))).toBe(true);
    expect(ok(conLinea({ dias: 0.25, horas: 0.25 }, lineaHora))).toBe(true);
    expect(mensajes(conLinea({ dias: 0.009 }, lineaHora))).toEqual([MSG_DIAS_HORA]);
    expect(mensajes(conLinea({ dias: 87600.01 }, lineaHora))).toEqual([MSG_DIAS_HORA]);
    expect(mensajes(conLinea({ horas: 0.009 }, lineaHora))).toEqual([MSG_HORAS_HORA]);
    expect(mensajes(conLinea({ horas: 87600.01 }, lineaHora))).toEqual([MSG_HORAS_HORA]);
  });

  it('cero y negativos fallan', () => {
    expect(mensajes(conLinea({ dias: 0 }, lineaHora))).toEqual([MSG_DIAS_HORA]);
    expect(mensajes(conLinea({ horas: 0 }, lineaHora))).toEqual([MSG_HORAS_HORA]);
    expect(mensajes(conLinea({ dias: -8 }, lineaHora))).toEqual([MSG_DIAS_HORA]);
    expect(mensajes(conLinea({ horas: -1 }, lineaHora))).toEqual([MSG_HORAS_HORA]);
  });

  it('mas de 2 decimales falla (6.505) y el ruido de coma flotante pasa (21.900000000000002)', () => {
    expect(mensajes(conLinea({ dias: 6.505, horas: 6.505 }, lineaHora)).sort()).toEqual([MSG_DIAS_HORA, MSG_HORAS_HORA].sort());
    expect(ok(conLinea({ dias: 21.900000000000002, horas: 21.900000000000002 }, lineaHora))).toBe(true);
    expect(ok(conLinea({ dias: 0.1 + 0.2, horas: 0.1 + 0.2 }, lineaHora))).toBe(true);
  });

  it('dias y horas no finitos, vacios o de otro tipo fallan', () => {
    for (const malo of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '', undefined, '24']) {
      expect(ok(conLinea({ dias: malo }, lineaHora))).toBe(false);
      expect(ok(conLinea({ horas: malo }, lineaHora))).toBe(false);
    }
  });

  it('horas es obligatorio en lineas HORA', () => {
    expect(mensajes(conLinea({ horas: undefined }, lineaHora))).toEqual([MSG_HORAS_HORA]);
  });

  it('una linea con tipoCobro POR_HORA se trata como horaria aunque la tarifa diga DIA', () => {
    expect(mensajes(conLinea({ tipoTarifa: 'DIA', tipoCobro: 'POR_HORA', dias: 2.5, horas: undefined }))).toEqual([MSG_HORAS_HORA]);
  });

  it('la duracion desde el catalogo (8 x dias de renta) llega a 87600 con 10950 dias y falla con 10951', () => {
    expect(ok(conLinea({ dias: 8 * 10950, horas: 8 * 10950 }, lineaHora))).toBe(true);
    expect(mensajes(conLinea({ dias: 8 * 10951, horas: 8 * 10951 }, lineaHora))).toEqual([MSG_DIAS_HORA, MSG_HORAS_HORA]);
  });
});

describe('cotizacion: descuento contra el importe', () => {
  it('el descuento de la linea puede igualar el importe (cantidad x dias x precio) pero no superarlo', () => {
    expect(ok(conLinea({ descuento: 4500 }))).toBe(true);
    const r = mensajes(conLinea({ descuento: 4500.01 }));
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('no puede superar el importe de la línea');
  });

  it('el descuento de una linea HORA se compara con horas x precio x cantidad', () => {
    expect(ok(conLinea({ cantidad: 2, dias: 10, horas: 10, precioUnitario: 100, descuento: 2000, subtotal: 0 }, lineaHora))).toBe(true);
    expect(ok(conLinea({ cantidad: 2, dias: 10, horas: 10, precioUnitario: 100, descuento: 2000.01, subtotal: 0 }, lineaHora))).toBe(false);
  });

  it('el descuento global puede igualar el subtotal pero no superarlo, y uno negativo se rechaza', () => {
    expect(ok({ ...cotizacion, descuento: 4500 })).toBe(true);
    const r = mensajes({ ...cotizacion, descuento: 4500.01 });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('no puede superar el subtotal');
    expect(mensajes({ ...cotizacion, descuento: -1 })).toContain('El descuento no puede ser negativo');
  });
});

describe('cotizacion: descripcion de la linea', () => {
  it('vacia o solo espacios falla; con espacios alrededor pasa', () => {
    expect(mensajes(conLinea({ descripcion: '' }))).toEqual(['La descripción es requerida']);
    expect(mensajes(conLinea({ descripcion: '    ' }))).toEqual(['La descripción es requerida']);
    expect(mensajes(conLinea({ descripcion: undefined }))).toEqual(['La descripción es requerida']);
    expect(ok(conLinea({ descripcion: '  Plancha  ' }))).toBe(true);
  });

  it('201 caracteres falla con un mensaje que indica acortarla en la linea', () => {
    const r = mensajes(conLinea({ descripcion: 'd'.repeat(201) }));
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('acórtala en esa línea');
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
