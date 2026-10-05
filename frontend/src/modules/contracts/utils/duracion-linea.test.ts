import { describe, expect, it } from 'vitest';
import { duracionDeLinea, lineasSinDuracionValida } from './duracion-linea';

describe('duracionDeLinea (sin inventar un 1)', () => {
  it.each([
    [3, 3],
    ['3', 3],
    ['1.00', 1],
    ['21.90', 21.9],
    [0.5, 0.5],
  ])('%j da %j', (entrada, esperado) => {
    expect(duracionDeLinea({ dias: entrada })).toBe(esperado);
  });

  it.each([[0], ['0'], [Number.NaN], [''], ['abc'], ['12abc'], [-2], [null], [undefined]])(
    '%j no es una duracion valida: da NaN, no 1',
    (entrada) => {
      expect(duracionDeLinea({ dias: entrada })).toBeNaN();
    }
  );

  it('un item sin dias o nulo da NaN', () => {
    expect(duracionDeLinea({})).toBeNaN();
    expect(duracionDeLinea(null)).toBeNaN();
  });
});

describe('lineasSinDuracionValida', () => {
  it('devuelve los numeros de linea (desde 1) con duracion invalida', () => {
    expect(lineasSinDuracionValida([{ dias: 2 }, { dias: 0 }, { dias: '3' }, { dias: 'x' }])).toEqual([2, 4]);
  });

  it('vacio cuando todas son validas o no hay lineas', () => {
    expect(lineasSinDuracionValida([{ dias: 1 }])).toEqual([]);
    expect(lineasSinDuracionValida([])).toEqual([]);
    expect(lineasSinDuracionValida(undefined)).toEqual([]);
  });
});