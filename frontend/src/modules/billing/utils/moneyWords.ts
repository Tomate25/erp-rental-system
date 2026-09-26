const UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const TENS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function underThousand(value: number): string {
  if (value === 0) return '';
  if (value === 100) return 'cien';
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(HUNDREDS[hundreds]);
  if (remainder >= 10 && remainder < 20) parts.push(TEENS[remainder - 10]);
  else if (remainder >= 20 && remainder < 30) {
    parts.push(remainder === 20 ? 'veinte' : `veinti${UNITS[remainder % 10]}`);
  } else if (remainder >= 30) {
    parts.push(TENS[Math.floor(remainder / 10)] + (remainder % 10 ? ` y ${UNITS[remainder % 10]}` : ''));
  } else if (remainder) parts.push(UNITS[remainder]);
  return parts.join(' ');
}

function apocopate(value: string): string {
  return value.replace(/veintiuno$/u, 'veintiún').replace(/ y uno$/u, ' y un').replace(/uno$/u, 'un');
}

export function moneyWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '';
  const centsTotal = Math.round(amount * 100);
  const integer = Math.floor(centsTotal / 100);
  const cents = centsTotal % 100;
  if (integer > 999_999_999) return '';
  const millions = Math.floor(integer / 1_000_000);
  const thousands = Math.floor((integer % 1_000_000) / 1_000);
  const units = integer % 1_000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? 'un millón' : `${apocopate(underThousand(millions))} millones`);
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${apocopate(underThousand(thousands))} mil`);
  if (units) parts.push(apocopate(underThousand(units)));
  if (!parts.length) parts.push('cero');
  const de = millions > 0 && thousands === 0 && units === 0 ? ' de' : '';
  const currency = integer === 1 ? 'córdoba' : 'córdobas';
  return `${parts.join(' ')}${de} ${currency} con ${cents.toString().padStart(2, '0')}/100`;
}
