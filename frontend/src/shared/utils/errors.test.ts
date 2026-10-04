import { describe, expect, it } from 'vitest';
import { serverErrorMessage } from './errors';

describe('serverErrorMessage', () => {
  it('une con "; " un arreglo de mensajes del servidor', () => {
    const err = { response: { data: { message: ['dias debe ser un entero', 'El cliente es requerido'] } } };
    expect(serverErrorMessage(err, 'fallo')).toBe('dias debe ser un entero; El cliente es requerido');
  });

  it('ignora los elementos del arreglo que no son texto o están en blanco', () => {
    const err = { response: { data: { message: ['El monto debe ser mayor que cero', '  ', 5, null, 'El banco debe ser texto'] } } };
    expect(serverErrorMessage(err, 'fallo')).toBe('El monto debe ser mayor que cero; El banco debe ser texto');
  });

  it('usa el texto tal cual si es una cadena y el de respaldo si no hay mensaje', () => {
    expect(serverErrorMessage({ response: { data: { message: 'Cotización no encontrada' } } }, 'fallo')).toBe('Cotización no encontrada');
    expect(serverErrorMessage({ response: { data: {} } }, 'fallo')).toBe('fallo');
    expect(serverErrorMessage({ response: { data: { message: [] } } }, 'fallo')).toBe('fallo');
    expect(serverErrorMessage({ response: { data: { message: ['', '  '] } } }, 'fallo')).toBe('fallo');
    expect(serverErrorMessage({ response: { data: { message: '  ' } } }, 'fallo')).toBe('fallo');
    expect(serverErrorMessage({ response: { data: { message: 42 } } }, 'fallo')).toBe('fallo');
    expect(serverErrorMessage({ response: {} }, 'fallo')).toBe('fallo');
    expect(serverErrorMessage(new Error('red'), 'fallo')).toBe('fallo');
    expect(serverErrorMessage(null, 'fallo')).toBe('fallo');
    expect(serverErrorMessage(undefined, 'fallo')).toBe('fallo');
  });
});