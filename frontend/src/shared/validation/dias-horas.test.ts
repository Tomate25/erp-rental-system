import { describe, expect, it } from 'vitest';
import {
  MSG_DIAS_DIA,
  MSG_DIAS_HORA,
  MSG_HORAS_DIA,
  MSG_HORAS_HORA,
  esLineaHoraria,
  primerErrorDiasHoras,
  redondear2,
  tieneMaximoDosDecimales,
  validarDiasHorasLinea,
} from './dias-horas';

const dia = (dias: unknown, horas?: unknown) => ({ tipoTarifa: 'DIA', tipoCobro: 'POR_DIA', dias, horas });
const hora = (dias: unknown, ...resto: [unknown?]) => ({
  tipoTarifa: 'HORA',
  tipoCobro: 'POR_HORA',
  dias,
  horas: resto.length > 0 ? resto[0] : dias,
});
const mensajes = (l: Parameters<typeof validarDiasHorasLinea>[0]) => validarDiasHorasLinea(l).map((e) => e.message);

describe('textos de error (identicos al backend)', () => {
  it('coinciden car?cter por car?cter', () => {
    expect(MSG_DIAS_DIA).toBe('dias debe ser un entero entre 1 y 3650 para tarifa DIA.');
    expect(MSG_DIAS_HORA).toBe('dias debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.');
    expect(MSG_HORAS_HORA).toBe('horas debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.');
    expect(MSG_HORAS_DIA).toBe('horas debe estar entre 0 y 87600 horas, con máximo 2 decimales.');
  });
});

describe('tarifa DIA: dias entero de 1 a 3650', () => {
  it('1 y 3650 pasan; 0 y 3651 fallan', () => {
    expect(mensajes(dia(1))).toEqual([]);
    expect(mensajes(dia(3650))).toEqual([]);
    expect(mensajes(dia(0))).toEqual([MSG_DIAS_DIA]);
    expect(mensajes(dia(3651))).toEqual([MSG_DIAS_DIA]);
  });

  it('un decimal falla, aunque sea pequeno', () => {
    expect(mensajes(dia(2.5))).toEqual([MSG_DIAS_DIA]);
    expect(mensajes(dia(1.01))).toEqual([MSG_DIAS_DIA]);
  });

  it('NaN, Infinity, texto, null y undefined fallan', () => {
    for (const malo of [Number.NaN, Number.POSITIVE_INFINITY, '3', '', null, undefined]) {
      expect(mensajes(dia(malo))).toEqual([MSG_DIAS_DIA]);
    }
  });

  it('horas es opcional: undefined/null pasan; 0 y 87600 pasan; 87600,01 y 3 decimales fallan', () => {
    expect(mensajes(dia(3, undefined))).toEqual([]);
    expect(mensajes(dia(3, null))).toEqual([]);
    expect(mensajes(dia(3, 0))).toEqual([]);
    expect(mensajes(dia(3, 87600))).toEqual([]);
    expect(mensajes(dia(3, 87600.01))).toEqual([MSG_HORAS_DIA]);
    expect(mensajes(dia(3, -1))).toEqual([MSG_HORAS_DIA]);
    expect(mensajes(dia(3, 1.234))).toEqual([MSG_HORAS_DIA]);
  });
});

describe('tarifa HORA: dias y horas de 0,01 a 87600 con maximo 2 decimales', () => {
  it('0,01 pasa y 0,009 falla', () => {
    expect(mensajes(hora(0.01))).toEqual([]);
    expect(mensajes(hora(0.009))).toEqual([MSG_DIAS_HORA, MSG_HORAS_HORA]);
    expect(mensajes(hora(0))).toEqual([MSG_DIAS_HORA, MSG_HORAS_HORA]);
    expect(mensajes(hora(-1))).toEqual([MSG_DIAS_HORA, MSG_HORAS_HORA]);
  });

  it('87600 pasa y 87600,01 falla', () => {
    expect(mensajes(hora(87600))).toEqual([]);
    expect(mensajes(hora(87600.01))).toEqual([MSG_DIAS_HORA, MSG_HORAS_HORA]);
  });

  it('6.505 falla (3 decimales) y 21.900000000000002 pasa (ruido de coma flotante)', () => {
    expect(mensajes(hora(6.505))).toEqual([MSG_DIAS_HORA, MSG_HORAS_HORA]);
    expect(mensajes(hora(21.900000000000002))).toEqual([]);
    expect(mensajes(hora(6.5))).toEqual([]);
    expect(mensajes(hora(19.5))).toEqual([]);
  });

  it('cada campo reporta su propio texto', () => {
    expect(mensajes(hora(8, 6.505))).toEqual([MSG_HORAS_HORA]);
    expect(mensajes(hora(6.505, 8))).toEqual([MSG_DIAS_HORA]);
    expect(MSG_HORAS_HORA.startsWith('horas ')).toBe(true);
  });

  it('NaN, Infinity, texto y ausentes fallan; horas es obligatoria', () => {
    for (const malo of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '8', '', null, undefined]) {
      expect(mensajes(hora(malo, 8))).toEqual([MSG_DIAS_HORA]);
      expect(mensajes(hora(8, malo))).toEqual([MSG_HORAS_HORA]);
    }
  });

  it('con tarifa HORA el tope de dias ya no es 3650', () => {
    expect(mensajes(hora(3651))).toEqual([]);
  });
});

describe('criterio de linea horaria (igual que el backend)', () => {
  it('tipoTarifa HORA o tipoCobro POR_HORA', () => {
    expect(esLineaHoraria({ tipoTarifa: 'HORA' })).toBe(true);
    expect(esLineaHoraria({ tipoCobro: 'POR_HORA' })).toBe(true);
    expect(esLineaHoraria({ tipoTarifa: 'DIA', tipoCobro: 'POR_DIA' })).toBe(false);
    expect(esLineaHoraria(null)).toBe(false);
    expect(mensajes({ tipoTarifa: 'DIA', tipoCobro: 'POR_HORA', dias: 2.5, horas: 2.5 })).toEqual([]);
  });
});

describe('diasRequerido=false (contratos)', () => {
  it('dias ausente no es error si no es obligatorio', () => {
    expect(validarDiasHorasLinea({ tipoTarifa: 'DIA' }, { diasRequerido: false })).toEqual([]);
    expect(validarDiasHorasLinea({ tipoTarifa: 'DIA', dias: 2.5 }, { diasRequerido: false }).map((e) => e.message)).toEqual([MSG_DIAS_DIA]);
  });
});

describe('primerErrorDiasHoras', () => {
  it('prefija la linea con problemas', () => {
    expect(primerErrorDiasHoras([dia(1), hora(6.505), dia(2.5)])).toBe(`Línea 2: ${MSG_DIAS_HORA}`);
    expect(primerErrorDiasHoras([dia(1), hora(8)])).toBeNull();
  });
});

describe('tieneMaximoDosDecimales y redondear2', () => {
  it('distingue 2 decimales con ruido de 3 decimales reales', () => {
    expect(tieneMaximoDosDecimales(0.1 + 0.2)).toBe(true); // 0.30000000000000004 es solo ruido
    expect(tieneMaximoDosDecimales(0.123)).toBe(false);
    expect(tieneMaximoDosDecimales(1.005)).toBe(false);
    expect(tieneMaximoDosDecimales(1.01)).toBe(true);
    expect(tieneMaximoDosDecimales(19.5)).toBe(true);
  });

  it('redondear2 limpia el ruido de los montos', () => {
    expect(redondear2(0.1 * 3)).toBe(0.3);
    expect(redondear2(1234.5678)).toBe(1234.57);
    expect(redondear2(21.900000000000002)).toBe(21.9);
  });
});
