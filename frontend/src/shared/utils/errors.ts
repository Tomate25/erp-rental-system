/**
 * Mensaje de error del backend para mostrar en pantalla.
 *
 * - `message` como arreglo (class-validator / ValidationPipe): se unen todos los textos no vacíos con "; ".
 * - `message` como texto no vacío: se devuelve tal cual.
 * - Cualquier otra cosa (sin respuesta, sin `message`, arreglo vacío, texto en blanco): `fallback`.
 *
 * Nunca lanza excepción: acepta cualquier valor capturado en un `catch`.
 */
export function serverErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } } | null | undefined)?.response?.data?.message;
  if (Array.isArray(message)) {
    const unido = message.filter((m): m is string => typeof m === 'string' && m.trim() !== '').join('; ');
    return unido || fallback;
  }
  return typeof message === 'string' && message.trim() !== '' ? message : fallback;
}