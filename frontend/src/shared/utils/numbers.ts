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

/**
 * Número de un campo de formulario (texto o número) donde "vacío" NO es 0.
 *
 * `Number('')` y `Number('   ')` dan 0, y eso hace pasar en silencio un campo vacío como si fuera un cero válido
 * (o como un `Math.max(…, 0)`). Aquí el vacío, el texto no numérico y los valores no finitos dan `NaN`, para que el
 * esquema de validación los rechace con su mensaje ("debe ser un número válido").
 *
 * Reglas (nunca lanza excepción):
 * - Número: se devuelve si es finito; `NaN` e `Infinity` dan `NaN`.
 * - Texto: se recortan los espacios de los extremos y debe ser un decimal con punto ("12", "-3.5", ".5", "7.").
 *   La coma NO se acepta ("1,5" y "1,500" son ambiguos), ni la notación científica, ni los espacios internos.
 * - `null`, `undefined`, booleanos, objetos y cualquier otro tipo dan `NaN`.
 *
 * Pensado para valores de `<input>`; para valores que llegan del backend como texto decimal usar `toNum`.
 */
export function parseNumberOrNaN(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== 'string') return Number.NaN;
  const texto = value.trim();
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(texto)) return Number.NaN;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

/**
 * Como `parseNumberOrNaN`, pero para campos opcionales: `undefined`, `null` y el texto vacío o en blanco dan
 * `undefined` (el campo no se envía); un valor escrito que no es un número válido da `NaN` (no se descarta en
 * silencio, el esquema lo rechaza).
 */
export function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return parseNumberOrNaN(value);
}