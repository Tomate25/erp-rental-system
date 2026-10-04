import { describe, expect, it } from 'vitest';
import { formatDuracion, parseNumberOrNaN, parseOptionalNumber, toNum } from './numbers';

describe('toNum', () => {
  it.each([
    [1, 1],
    ['1', 1],
    ['1.00', 1],
    [21.9, 21.9],
    ['21.90', 21.9],
    ['1,5', 1.5],
    ['  12,50 ', 12.5],
    ['1 5', 15],
    [`${String.fromCharCode(0xa0)}7${String.fromCharCode(0xa0)}`, 7],
    ['0', 0],
    [0, 0],
    ['-3', -3],
    ['+2.5', 2.5],
    ['.5', 0.5],
    ['5.', 5],
    [0.1 + 0.2, 0.1 + 0.2],
  ])('%j -> %d', (entrada, esperado) => {
    expect(toNum(entrada)).toBe(esperado);
  });

  it.each([
    [''],
    ['   '],
    [null],
    [undefined],
    ['abc'],
    ['1a'],
    ['1,234.5'],
    ['1.234,5'],
    ['1.2.3'],
    ['1,2,3'],
    ['1e3'],
    ['Infinity'],
    ['NaN'],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY],
    [true],
    [{}],
    [[]],
    [[1]],
  ])('%j -> NaN', (entrada) => {
    expect(toNum(entrada)).toBeNaN();
  });

  it('un bigint da NaN', () => {
    expect(toNum(BigInt(10))).toBeNaN();
  });

  it('no lanza excepciones con ningun tipo de entrada', () => {
    const raro = { valueOf: () => { throw new Error('no debe llamarse'); }, toString: () => { throw new Error('no debe llamarse'); } };
    expect(() => toNum(raro)).not.toThrow();
    expect(() => toNum(Symbol('x'))).not.toThrow();
    expect(() => toNum(() => 1)).not.toThrow();
  });

  it('"1", "1.00" y 1 son iguales a 1 (la comparacion de las vistas de impresion)', () => {
    for (const valor of [1, '1', '1.00', ' 1,0 ']) expect(toNum(valor) === 1).toBe(true);
    for (const valor of ['2', '1.5', '', null, undefined, 'abc']) expect(toNum(valor) === 1).toBe(false);
  });
});

describe('formatDuracion', () => {
  it('muestra igual el numero y el texto equivalente', () => {
    expect(formatDuracion(1)).toBe('1');
    expect(formatDuracion('1')).toBe('1');
    expect(formatDuracion('1.00')).toBe('1');
    expect(formatDuracion(21.9)).toBe('21.9');
    expect(formatDuracion('21.90')).toBe('21.9');
    expect(formatDuracion('1,5')).toBe('1.5');
  });

  it('si no es un numero valido muestra el original, o vacio si falta', () => {
    expect(formatDuracion('abc')).toBe('abc');
    expect(formatDuracion('')).toBe('');
    expect(formatDuracion(null)).toBe('');
    expect(formatDuracion(undefined)).toBe('');
  });
});

describe('parseNumberOrNaN (campos de formulario: vacío no es 0)', () => {
  it.each([
    ['12', 12],
    ['0', 0],
    ['-3.5', -3.5],
    ['+4', 4],
    ['.5', 0.5],
    ['7.', 7],
    ['  100.25  ', 100.25],
    ['0.01', 0.01],
    [0, 0],
    [15.5, 15.5],
  ])('%j -> %j', (entrada, esperado) => {
    expect(parseNumberOrNaN(entrada)).toBe(esperado);
  });

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['12abc'],
    ['1,5'],
    ['1,500'],
    ['1e3'],
    ['1 000'],
    ['--1'],
    ['.'],
    ['Infinity'],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [null],
    [undefined],
    [true],
    [{}],
    [[]],
  ])('%j -> NaN (el vacío no se convierte en 0)', (entrada) => {
    expect(parseNumberOrNaN(entrada)).toBeNaN();
  });

  it('a diferencia de Number(), el texto vacío no da 0', () => {
    expect(Number('')).toBe(0);
    expect(parseNumberOrNaN('')).toBeNaN();
  });

  it('un bigint da NaN', () => {
    expect(parseNumberOrNaN(BigInt(10))).toBeNaN();
  });
});

describe('parseOptionalNumber', () => {
  it.each([[undefined], [null], [''], ['   ']])('%j -> undefined (el campo no se envía)', (entrada) => {
    expect(parseOptionalNumber(entrada)).toBeUndefined();
  });

  it.each([
    ['0', 0],
    ['25', 25],
    ['3.75', 3.75],
    [8, 8],
  ])('%j -> %j', (entrada, esperado) => {
    expect(parseOptionalNumber(entrada)).toBe(esperado);
  });

  it.each([['abc'], ['1,5'], [Number.NaN], [true]])('%j escrito pero inválido -> NaN (no se descarta en silencio)', (entrada) => {
    expect(parseOptionalNumber(entrada)).toBeNaN();
  });
});