import { describe, expect, it } from 'vitest';
import { MSG_DIAS_HORA, MSG_DIAS_DIA } from '../../../shared/validation/dias-horas';
import type { DetalleCotizacion } from '../types/quotation.types';
import {
  buildCatalogDescription,
  calcularImporteLinea,
  composeClientPhone,
  prepareQuotationSubmit,
  reescalarDuracion,
  type QuotationFormState,
} from './quotation-form';

describe('composeClientPhone (telefono de la cotizacion)', () => {
  it('compone solo los numeros, sin prefijos Movistar/Claro/Conv', () => {
    const r = composeClientPhone({ telMovistar: '88888888', telClaro: '77777777', telConvencional: '22222222' });
    expect(r.telefono).toBe('88888888 / 77777777 / 22222222');
    expect(r.telefono).not.toMatch(/Movistar|Claro|Conv/);
    expect(r.omitidos).toEqual([]);
  });

  it('el caso que medía 36 (Movistar: 88888888 / Claro: 88888888) ahora cabe en 30', () => {
    const r = composeClientPhone({ telMovistar: '88888888', telClaro: '88888888' });
    expect(r.telefono).toBe('88888888');
    expect(r.telefono.length).toBeLessThanOrEqual(30);
  });

  it('tres numeros de 8 digitos miden 30 y caben; el cuarto se omite y se avisa', () => {
    const r = composeClientPhone({ telMovistar: '88888888', telClaro: '77777777', telConvencional: '22222222', telefono: '66666666' });
    expect(r.telefono).toBe('88888888 / 77777777 / 22222222');
    expect(r.telefono).toHaveLength(30);
    expect(r.omitidos).toEqual(['66666666']);
  });

  it('un numero que por si solo excede el maximo se omite', () => {
    const largo = '1'.repeat(31);
    expect(composeClientPhone({ telMovistar: largo })).toEqual({ telefono: '', omitidos: [largo] });
  });

  it('no repite el telefono general si ya esta incluido y quita vacios y espacios', () => {
    expect(composeClientPhone({ telMovistar: ' 8888-8888 ', telefono: '8888-8888' }).telefono).toBe('8888-8888');
    expect(composeClientPhone({ telMovistar: '', telClaro: null, telConvencional: undefined, telefono: ' 5555 ' }).telefono).toBe('5555');
    expect(composeClientPhone({}).telefono).toBe('');
  });

  it('el resultado siempre cabe en el maximo indicado', () => {
    const r = composeClientPhone({ telMovistar: '12345678', telClaro: '87654321' }, 12);
    expect(r.telefono).toBe('12345678');
    expect(r.omitidos).toEqual(['87654321']);
  });
});

describe('buildCatalogDescription (descripcion de linea desde el catalogo)', () => {
  it('arma descripcion, modelo y serie sin avisar cuando cabe', () => {
    expect(buildCatalogDescription({ descripcion: 'Plancha', modelo: 'X1', numeroSerie: 'S9' })).toEqual({
      descripcion: 'Plancha · X1 (Serie: S9)',
      largoOriginal: null,
    });
    expect(buildCatalogDescription({ modelo: 'X1', numeroSerie: 'S9' }).descripcion).toBe('X1 (Serie: S9)');
    expect(buildCatalogDescription({ descripcion: 'Plancha', modelo: 'S/M' }).descripcion).toBe('Plancha');
    expect(buildCatalogDescription({}).descripcion).toBe('Equipo');
  });

  it('200 caracteres caben; 201 se recortan a 200 y se informa el largo original', () => {
    expect(buildCatalogDescription({ descripcion: 'a'.repeat(200) })).toEqual({ descripcion: 'a'.repeat(200), largoOriginal: null });
    const r = buildCatalogDescription({ descripcion: 'a'.repeat(201) });
    expect(r.descripcion).toBe('a'.repeat(200));
    expect(r.largoOriginal).toBe(201);
  });

  it('una descripcion de 2000 caracteres (maximo del equipo) se recorta a 200', () => {
    const r = buildCatalogDescription({ descripcion: 'b'.repeat(2000) });
    expect(r.descripcion).toHaveLength(200);
    expect(r.largoOriginal).toBe(2000);
  });

  it('no deja espacios al final ni parte un par sustituto al recortar', () => {
    const conEspacio = buildCatalogDescription({ descripcion: `${'a'.repeat(199)} ${'b'.repeat(10)}` });
    expect(conEspacio.descripcion).toBe('a'.repeat(199));
    const emoji = String.fromCodePoint(0x1f600);
    const conEmoji = buildCatalogDescription({ descripcion: `${'a'.repeat(199)}${emoji}` });
    expect(conEmoji.descripcion).toBe('a'.repeat(199));
    expect(conEmoji.largoOriginal).toBe(201);
  });

  it('el recorte tambien respeta un maximo distinto', () => {
    expect(buildCatalogDescription({ descripcion: 'abcdefghij' }, 5)).toEqual({ descripcion: 'abcde', largoOriginal: 10 });
  });
});


describe('reescalarDuracion (cambio de fechas de renta)', () => {
  it('DIA sigue siendo entero con minimo 1', () => {
    expect(reescalarDuracion(3, false, 6, 3)).toBe(6);
    expect(reescalarDuracion(1, false, 1, 3)).toBe(1);
    expect(reescalarDuracion(5, false, 7, 3)).toBe(12);
  });

  it('HORA conserva 2 decimales, con minimo 0,01', () => {
    expect(reescalarDuracion(8, true, 3, 2)).toBe(12);
    expect(reescalarDuracion(8, true, 1, 3)).toBe(2.67);
    expect(reescalarDuracion(1, true, 1, 3)).toBe(0.33);
    expect(reescalarDuracion(0.01, true, 1, 100)).toBe(0.01);
  });

  it('una duracion vacia o invalida NO se cambia por 1: devuelve NaN para dejar lo escrito', () => {
    expect(reescalarDuracion('', false, 2, 1)).toBeNaN();
    expect(reescalarDuracion(Number.NaN, true, 2, 1)).toBeNaN();
    expect(reescalarDuracion('12abc', false, 2, 1)).toBeNaN();
    expect(reescalarDuracion(undefined, false, 2, 1)).toBeNaN();
  });

  it('acepta la duracion escrita como texto numerico', () => {
    expect(reescalarDuracion('3', false, 6, 3)).toBe(6);
    expect(reescalarDuracion(' 8 ', true, 3, 2)).toBe(12);
  });
});

describe('calcularImporteLinea (importe mostrado en pantalla)', () => {
  const base = { cantidad: 2, dias: 3, precioUnitario: 100, descuento: 0 } as unknown as Parameters<typeof calcularImporteLinea>[0];

  it('calcula cantidad x duracion x precio', () => {
    expect(calcularImporteLinea(base)).toEqual({ descuento: 0, subtotal: 600 });
  });

  it('usa la duracion indicada en lugar de la de la linea', () => {
    expect(calcularImporteLinea(base, 5)).toEqual({ descuento: 0, subtotal: 1000 });
  });

  it('descuento en monto y en porcentaje', () => {
    expect(calcularImporteLinea({ ...base, descuento: 50 })).toEqual({ descuento: 50, subtotal: 550 });
    expect(calcularImporteLinea({ ...base, tipoDescuento: 'PORCENTAJE', descuentoInput: '10' })).toEqual({ descuento: 60, subtotal: 540 });
  });

  it.each([['dias', ''], ['dias', '12abc'], ['cantidad', ''], ['precioUnitario', '5x']])(
    '%s = %j no se reemplaza por 1: el importe mostrado es 0',
    (campo, valor) => {
      expect(calcularImporteLinea({ ...base, [campo]: valor } as typeof base).subtotal).toBe(0);
    }
  );
});

describe('prepareQuotationSubmit (lo que hace handleSubmit antes de llamar a la API)', () => {
  const linea = (cambios: Record<string, unknown> = {}) =>
    ({
      descripcion: 'Retroexcavadora 420F',
      tipoCobro: 'POR_DIA',
      tipoTarifa: 'DIA',
      cantidad: 1,
      dias: 3,
      precioUnitario: 1500,
      descuento: 0,
      subtotal: 4500,
      ...cambios,
    }) as unknown as DetalleCotizacion;

  const estado = (cambios: Partial<QuotationFormState> = {}): QuotationFormState => ({
    clienteId: 'cli-1',
    proyecto: 'Obra norte',
    atencion: 'Ana',
    telefono: '88888888 / 77777777',
    email: 'ana@empresa.com',
    referencia: '',
    condiciones: '',
    validezDias: 15,
    fechaInicioRenta: '2026-10-05',
    fechaFinRenta: '2026-10-08',
    descuento: 0,
    subtotal: 4500,
    iva: 675,
    total: 5175,
    estado: 'BORRADOR',
    asesorId: 'user-1',
    items: [linea()],
    ...cambios,
  });

  const error = (e: QuotationFormState): string => {
    const r = prepareQuotationSubmit(e);
    if (r.ok) throw new Error('se esperaba un error de validacion');
    return r.error;
  };

  it('arma un payload valido con fechas ISO y sin valores inventados', () => {
    const r = prepareQuotationSubmit(estado());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.fechaInicioRenta).toBe('2026-10-05T12:00:00.000Z');
    expect(r.payload.validezDias).toBe(15);
    expect(r.payload.items[0]).toMatchObject({ tipoTarifa: 'DIA', tipoCobro: 'POR_DIA', dias: 3, horas: undefined, cantidad: 1 });
  });

  describe('validezDias no se reemplaza por 15', () => {
    it.each([
      ['NaN', Number.NaN],
      ['0', 0],
      ['366', 366],
      ['vacío (Number("") = 0)', Number('')],
      ['7.5', 7.5],
    ])('%s da error visible', (_nombre, valor) => {
      const r = prepareQuotationSubmit(estado({ validezDias: valor }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('La validez');
    });

    it('1 y 365 pasan y se envian tal cual', () => {
      for (const valor of [1, 365]) {
        const r = prepareQuotationSubmit(estado({ validezDias: valor }));
        expect(r.ok && r.payload.validezDias).toBe(valor);
      }
    });
  });

  describe('correo', () => {
    it('vacio o solo espacios se OMITE del payload (no se envia "")', () => {
      for (const vacio of ['', '   ']) {
        const r = prepareQuotationSubmit(estado({ email: vacio }));
        expect(r.ok).toBe(true);
        if (r.ok) expect('email' in r.payload && r.payload.email !== undefined).toBe(false);
      }
    });

    it('se recorta y se valida el formato', () => {
      const r = prepareQuotationSubmit(estado({ email: '  ana@empresa.com ' }));
      expect(r.ok && r.payload.email).toBe('ana@empresa.com');
      expect(error(estado({ email: 'no-es-correo' }))).toBe('El correo no es válido');
    });
  });

  describe('telefono editable con maximo 30', () => {
    it('30 caracteres pasa y 31 da error', () => {
      expect(prepareQuotationSubmit(estado({ telefono: '1'.repeat(30) })).ok).toBe(true);
      expect(error(estado({ telefono: '1'.repeat(31) }))).toBe('El teléfono no puede superar 30 caracteres');
    });

    it('el telefono compuesto del cliente siempre pasa la validacion', () => {
      const { telefono } = composeClientPhone({ telMovistar: '88888888', telClaro: '77777777', telConvencional: '22222222', telefono: '66666666' });
      expect(prepareQuotationSubmit(estado({ telefono })).ok).toBe(true);
    });
  });

  describe('sin defaults que traguen errores: zod ve el valor crudo', () => {
    it.each([
      ['dias', ''],
      ['cantidad', ''],
      ['precioUnitario', ''],
      ['descuento', ''],
      ['subtotal', ''],
    ])('%s vacio da error de la linea 1', (campo, valor) => {
      expect(error(estado({ items: [linea({ [campo]: valor })] }))).toMatch(/^Línea 1: /);
    });

    it.each([
      ['dias', '12abc'],
      ['cantidad', '2x'],
      ['precioUnitario', '1500abc'],
      ['descuento', '5%'],
      ['subtotal', '4500.00abc'],
    ])('%s con texto mezclado (%j) se rechaza en vez de leerse como numero', (campo, valor) => {
      expect(error(estado({ items: [linea({ [campo]: valor })] }))).toMatch(/^Línea 1: /);
    });

    it('un numero escrito como texto valido se envia como numero', () => {
      const r = prepareQuotationSubmit(estado({ items: [linea({ dias: '3', cantidad: '1', precioUnitario: '1500', subtotal: '4500' })] }));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.payload.items[0]).toMatchObject({ dias: 3, cantidad: 1, precioUnitario: 1500, subtotal: 4500 });
    });

    it('dias vacio en una linea DIA da el mensaje de dias, no un 1', () => {
      expect(error(estado({ items: [linea({ dias: '' })] }))).toBe(`Línea 1: ${MSG_DIAS_DIA}`);
    });

    it('el error indica el numero de la linea afectada', () => {
      expect(error(estado({ items: [linea(), linea({ cantidad: 0 })] }))).toMatch(/^Línea 2: /);
    });

    it('la descripcion vacia o de espacios da error', () => {
      expect(error(estado({ items: [linea({ descripcion: '   ' })] }))).toBe('Línea 1: La descripción es requerida');
    });
  });

  describe('lineas HORA', () => {
    const hora = (dias: number) => linea({ tipoCobro: 'POR_HORA', tipoTarifa: 'HORA', dias, precioUnitario: 100, subtotal: 0 });

    it('mandan el mismo numero en dias y horas, con decimales', () => {
      const r = prepareQuotationSubmit(estado({ items: [hora(12.5)], subtotal: 0, iva: 0, total: 0 }));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.payload.items[0]).toMatchObject({ tipoTarifa: 'HORA', tipoCobro: 'POR_HORA', dias: 12.5, horas: 12.5 });
    });

    it('catalogo: 8 x 10950 dias de renta (87600 horas) pasa y 8 x 10951 falla', () => {
      expect(prepareQuotationSubmit(estado({ items: [hora(8 * 10950)] })).ok).toBe(true);
      expect(error(estado({ items: [hora(8 * 10951)] }))).toBe(`Línea 1: ${MSG_DIAS_HORA}`);
    });

    it('mas de 2 decimales da error con el texto del backend', () => {
      expect(error(estado({ items: [hora(6.505)] }))).toBe(`Línea 1: ${MSG_DIAS_HORA}`);
    });
  });

  describe('montos redondeados a 2 decimales antes de enviar', () => {
    it('0.1 + 0.2 se envia como 0.3', () => {
      const r = prepareQuotationSubmit(
        estado({ descuento: 0.1 + 0.2, subtotal: 0.1 * 3 + 5, iva: 0.1 + 0.2, total: 0.1 * 3 + 5, items: [linea({ descuento: 0.1 + 0.2, subtotal: 0.1 * 3 })] })
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.payload.descuento).toBe(0.3);
      expect(r.payload.iva).toBe(0.3);
      expect(r.payload.subtotal).toBe(5.3);
      expect(r.payload.items[0].descuento).toBe(0.3);
      expect(r.payload.items[0].subtotal).toBe(0.3);
    });
  });

  describe('descuentos', () => {
    it('el de una linea no puede superar el importe de la linea', () => {
      expect(prepareQuotationSubmit(estado({ items: [linea({ descuento: 4500, subtotal: 0 })] })).ok).toBe(true);
      expect(error(estado({ items: [linea({ descuento: 4500.01, subtotal: 0 })] }))).toContain('Línea 1: El descuento');
    });

    it('el global no puede superar el subtotal y uno negativo se rechaza', () => {
      expect(prepareQuotationSubmit(estado({ descuento: 4500 })).ok).toBe(true);
      expect(error(estado({ descuento: 4500.01 }))).toContain('no puede superar el subtotal');
      expect(error(estado({ descuento: -1 }))).toBe('El descuento no puede ser negativo');
    });
  });
});
