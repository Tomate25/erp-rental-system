import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  calculateSimilarity,
  findSimilarProducts,
  suggestNextEquipmentCode,
  isSerialNumberDuplicate,
} from './inventory-similarity';

describe('inventory-similarity utilities', () => {
  describe('normalizeText', () => {
    it('removes accents and punctuation and normalizes spaces', () => {
      expect(normalizeText('MESCLADORA  2 SACOS CIPSA.')).toBe('mescladora 2 sacos cipsa');
      expect(normalizeText('MEZCLADORA DE 2 SACOS')).toBe('mezcladora de 2 sacos');
      expect(normalizeText('BOMBAS TRAGA SÓLIDO 3" MPOWER')).toBe('bombas traga solido 3 mpower');
    });
  });

  describe('calculateSimilarity', () => {
    it('detects high similarity between slight spelling errors', () => {
      const sim1 = calculateSimilarity('MESCLADORA 2 SACOS CIPSA', 'MEZCLADORA 2 SACOS CIPSA');
      expect(sim1).toBeGreaterThan(0.85);

      const sim2 = calculateSimilarity('GENERADOR SOLDADOR MPOWER', 'GENERADOR SOLDADOE MPOWER');
      expect(sim2).toBeGreaterThan(0.9);
    });

    it('returns 1.0 for identical or case-insensitive texts', () => {
      expect(calculateSimilarity('Compactadora Masalta', 'COMPACTADORA MASALTA')).toBe(1.0);
    });

    it('returns low score for completely different equipment', () => {
      const score = calculateSimilarity('Retroexcavadora JCB', 'Cuñas para encofrado');
      expect(score).toBeLessThan(0.3);
    });
  });

  describe('findSimilarProducts', () => {
    const catalog = [
      { id: '1', nombre: 'Mezcladora 2 sacos CIPSA', familia: 'Mezcladoras' },
      { id: '2', nombre: 'Compactadora Masalta MS60', familia: 'Compactación' },
      { id: '3', nombre: 'Generador Soldador MPOWER', familia: 'Generadores' },
    ];

    it('finds existing similar equipment when user types variations', () => {
      const matches = findSimilarProducts('Mescladora 2 sacos cipsa', catalog, 0.75);
      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe('1');
      expect(matches[0].similarity).toBeGreaterThanOrEqual(0.85);
    });

    it('returns empty array when there are no similar matches', () => {
      const matches = findSimilarProducts('Torre de iluminacion Allmand', catalog, 0.75);
      expect(matches.length).toBe(0);
    });
  });

  describe('suggestNextEquipmentCode', () => {
    it('suggests the next increment for numeric codes like 01-16', () => {
      const codes = ['01-01', '01-02', '01-16'];
      expect(suggestNextEquipmentCode(codes)).toBe('01-17');
    });

    it('preserves prefix like 08- for yellow machinery', () => {
      const codes = ['08-01', '08-02', '08-03', '08-04'];
      expect(suggestNextEquipmentCode(codes, '08')).toBe('08-05');
    });

    it('handles empty code lists gracefully using fallback prefix', () => {
      expect(suggestNextEquipmentCode([], '01')).toBe('01-01');
    });
  });

  describe('isSerialNumberDuplicate', () => {
    const existing = ['SN-12345', 'CAT236-098', 'JCB-4456'];

    it('detects duplicate serial number case-insensitively', () => {
      expect(isSerialNumberDuplicate('sn-12345', existing)).toBe(true);
      expect(isSerialNumberDuplicate('  CAT236-098  ', existing)).toBe(true);
    });

    it('returns false for new serial number', () => {
      expect(isSerialNumberDuplicate('SN-99999', existing)).toBe(false);
    });

    it('ignores empty serial or S/N placeholder', () => {
      expect(isSerialNumberDuplicate('', existing)).toBe(false);
      expect(isSerialNumberDuplicate('S/N', existing)).toBe(false);
    });
  });
});
