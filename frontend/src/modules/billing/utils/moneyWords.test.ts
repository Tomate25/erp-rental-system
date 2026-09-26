import { describe, expect, it } from 'vitest';
import { moneyWords } from './moneyWords';

describe('importe del recibo en letras', () => {
  it('conserva enteros y centavos sin redondeos de visualización', () => {
    expect(moneyWords(0)).toBe('cero córdobas con 00/100');
    expect(moneyWords(1)).toBe('un córdoba con 00/100');
    expect(moneyWords(1542.75)).toBe('mil quinientos cuarenta y dos córdobas con 75/100');
    expect(moneyWords(1_000_000)).toBe('un millón de córdobas con 00/100');
  });
});
