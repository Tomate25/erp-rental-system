import { describe, it, expect } from 'vitest';
import { formatCurrency } from './shared/utils/formatters';
import { isChunkLoadError } from './shared/utils/lazy-with-retry';

describe('Frontend Base Suite & Utility Verification', () => {
  it('should format currency correctly in NIO format', () => {
    const formatted = formatCurrency(1500);
    expect(formatted).toContain('1,500');
  });

  it('should detect stale chunk errors after deployment', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://bmconstruccionesnic.digital/assets/InventoryPage-OLD.js'),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Normal business error'))).toBe(false);
  });
});
