import { describe, expect, it } from 'vitest';
import { UMBRALES, toStatus } from '@/lib/domain/status';

describe('toStatus', () => {
  it('flags stock without sales in 30 days as slow', () => {
    expect(toStatus({ diasParaAgotarse: null, unidades30d: 0 }, 12)).toBe('lento');
  });

  it('flags sold-out products with recent sales as about to sell out', () => {
    expect(toStatus({ diasParaAgotarse: 0, unidades30d: 4 }, 0)).toBe('por_agotarse');
  });

  it('uses the critical-days threshold inclusively', () => {
    expect(toStatus({ diasParaAgotarse: UMBRALES.diasCriticos, unidades30d: 10 }, 5)).toBe('por_agotarse');
    expect(toStatus({ diasParaAgotarse: UMBRALES.diasCriticos + 0.1, unidades30d: 10 }, 5)).toBe('sano');
  });

  it('treats a sold-out product with no sales as healthy (nothing to act on)', () => {
    expect(toStatus({ diasParaAgotarse: null, unidades30d: 0 }, 0)).toBe('sano');
  });
});
