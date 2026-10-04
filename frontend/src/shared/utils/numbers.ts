/**
 * Convierte a numero un valor que el backend puede devolver como numero o como texto decimal
 * (por ejemplo `dias`/`horas` en 1, "1", "1.00" o "21.90").
 *
 * Reglas (nunca lanza excepcion):
 * - Numero: se devuelve si es finito; NaN e Infinity dan `NaN`.
 * - Texto: se ignoran los espacios (tambien internos y los no separables) y se acepta un solo separador decimal,
 *   punto o coma ("1,5" = 1.5). Con los dos separadores a la vez ("1.234,5"), con letras, con notacion
 *   cientifica o vacio, el resultado es `NaN` (no se adivina el formato).
 * - `null`, `undefined`, booleanos, objetos y cualquier otro tipo dan `NaN`.
 *
 * El valor "seguro" para un valor invalido es `NaN`: quien llama decide el respaldo con `Number.isFinite`.
 * No usar para importes: esos siguen su propio formato.
 */
export function toNum(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== 'string') return Number.NaN;
  const texto = value.replace(/\s+/g, '');
  if (!/^[+-]?(\d+[.,]?\d*|[.,]\d+)$/.test(texto)) return Number.NaN;
  const numero = Number(texto.replace(',', '.'));
  return Number.isFinite(numero) ? numero : Number.NaN;
}

/**
 * Texto para mostrar una duracion (dias u horas): el numero sin ceros sobrantes ("1.00" -> "1", "21.90" -> "21.9").
 * Si el valor no es un numero valido muestra el valor original tal cual (o vacio si es null/undefined).
 */
export function formatDuracion(value: unknown): string {
  const numero = toNum(value);
  if (Number.isFinite(numero)) return String(numero);
  return value === null || value === undefined ? '' : String(value);
}
