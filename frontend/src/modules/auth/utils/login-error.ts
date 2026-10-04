import { isAxiosError } from 'axios';
import { serverErrorMessage } from '../../../shared/utils/errors';

export const MSG_LOGIN_SIN_RESPUESTA = 'No se pudo conectar con el servidor.';
export const MSG_LOGIN_DEMASIADOS_INTENTOS = 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
export const MSG_LOGIN_AVISO_BLOQUEO = 'Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.';
export const MSG_LOGIN_GENERICO = 'No se pudo iniciar sesión. Inténtalo de nuevo.';

/**
 * Mensaje a mostrar cuando falla el inicio de sesión, según el estado HTTP:
 * - sin respuesta (red caída, ECONNREFUSED, tiempo agotado): "No se pudo conectar con el servidor."
 * - 429: "Demasiados intentos. Espera un minuto e inténtalo de nuevo."
 * - 401: el mensaje del servidor más el aviso del bloqueo tras 5 intentos fallidos. El backend responde igual
 *   con contraseña incorrecta que con cuenta bloqueada, así que NO se distingue ni se adivina cuál es.
 * - 400 y demás estados: el mensaje del servidor (si `message` es un arreglo, se unen con "; ").
 * - cualquier otro error que no venga de axios (un fallo local): mensaje genérico, nunca "sin conexión".
 */
export function loginErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) return MSG_LOGIN_GENERICO;
  if (!err.response) return MSG_LOGIN_SIN_RESPUESTA;

  const { status } = err.response;
  if (status === 429) return MSG_LOGIN_DEMASIADOS_INTENTOS;

  const mensaje = serverErrorMessage(err, MSG_LOGIN_GENERICO);
  if (status === 401) return `${mensaje} ${MSG_LOGIN_AVISO_BLOQUEO}`;
  return mensaje;
}