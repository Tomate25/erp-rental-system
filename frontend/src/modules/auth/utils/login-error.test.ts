import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  MSG_LOGIN_AVISO_BLOQUEO,
  MSG_LOGIN_DEMASIADOS_INTENTOS,
  MSG_LOGIN_GENERICO,
  MSG_LOGIN_SIN_RESPUESTA,
  loginErrorMessage,
} from './login-error';

const conRespuesta = (status: number, data: unknown) =>
  new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} } as AxiosResponse);

describe('loginErrorMessage', () => {
  it('401: mensaje del servidor + aviso de bloqueo', () => {
    expect(loginErrorMessage(conRespuesta(401, { message: 'Credenciales inválidas' }))).toBe(
      `Credenciales inválidas ${MSG_LOGIN_AVISO_BLOQUEO}`,
    );
    expect(MSG_LOGIN_AVISO_BLOQUEO).toBe('Tras varios intentos fallidos la cuenta se bloquea temporalmente.');
    // sin cifras: el limite lo define el backend y puede cambiar
    expect(MSG_LOGIN_AVISO_BLOQUEO).not.toMatch(/\d/);
  });

  it('401 no distingue contraseña incorrecta de cuenta bloqueada: mismo texto del servidor, mismo resultado', () => {
    const a = loginErrorMessage(conRespuesta(401, { message: 'Credenciales inválidas' }));
    const b = loginErrorMessage(conRespuesta(401, { statusCode: 401, message: 'Credenciales inválidas', error: 'Unauthorized' }));
    expect(a).toBe(b);
  });

  it('401 sin mensaje del servidor usa el genérico + aviso', () => {
    expect(loginErrorMessage(conRespuesta(401, {}))).toBe(`${MSG_LOGIN_GENERICO} ${MSG_LOGIN_AVISO_BLOQUEO}`);
  });

  it('429: demasiados intentos (ignora el texto del servidor)', () => {
    expect(loginErrorMessage(conRespuesta(429, { message: 'ThrottlerException: Too Many Requests' }))).toBe(
      'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    );
    expect(MSG_LOGIN_DEMASIADOS_INTENTOS).toBe('Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  });

  it('400: mensaje del servidor; un arreglo se une con "; " y no lleva el aviso de bloqueo', () => {
    expect(loginErrorMessage(conRespuesta(400, { message: ['El correo electrónico no es válido', 'La contraseña es requerida'] }))).toBe(
      'El correo electrónico no es válido; La contraseña es requerida',
    );
    expect(loginErrorMessage(conRespuesta(400, { message: 'La contraseña es requerida' }))).toBe('La contraseña es requerida');
  });

  it('otros estados (500) muestran el mensaje del servidor o el genérico', () => {
    expect(loginErrorMessage(conRespuesta(500, { message: 'Error interno del servidor' }))).toBe('Error interno del servidor');
    expect(loginErrorMessage(conRespuesta(502, ''))).toBe(MSG_LOGIN_GENERICO);
  });

  it('sin respuesta (red caída / ECONNREFUSED): no se pudo conectar', () => {
    expect(loginErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe('No se pudo conectar con el servidor.');
    expect(loginErrorMessage(new AxiosError('timeout', 'ECONNABORTED'))).toBe(MSG_LOGIN_SIN_RESPUESTA);
  });

  it('un error que no es de axios no se presenta como falta de conexión', () => {
    expect(loginErrorMessage(new TypeError('x is not a function'))).toBe(MSG_LOGIN_GENERICO);
    expect(loginErrorMessage(null)).toBe(MSG_LOGIN_GENERICO);
    expect(loginErrorMessage('boom')).toBe(MSG_LOGIN_GENERICO);
  });
});