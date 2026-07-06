import { validateOffering } from '../validateOffering';

describe('validateOffering', () => {
  it('accepts prices at or above the tier floor (no ceiling)', () => {
    expect(validateOffering({ tier: 'C', priceNtd: 400, isFree: false }).ok).toBe(true);
    expect(validateOffering({ tier: 'B', priceNtd: 800, isFree: false }).ok).toBe(true);
    expect(validateOffering({ tier: 'A', priceNtd: 1200, isFree: false }).ok).toBe(true);
    expect(validateOffering({ tier: 'C', priceNtd: 5000, isFree: false }).ok).toBe(true);
  });

  it('rejects prices below the tier floor', () => {
    expect(validateOffering({ tier: 'C', priceNtd: 399, isFree: false })).toEqual({
      ok: false,
      error: 'below_floor',
    });
    expect(validateOffering({ tier: 'B', priceNtd: 799, isFree: false }).ok).toBe(false);
    expect(validateOffering({ tier: 'A', priceNtd: 1199, isFree: false }).ok).toBe(false);
  });

  it('rejects free offerings for every tier (platform floor applies)', () => {
    expect(validateOffering({ tier: 'C', priceNtd: 0, isFree: true })).toEqual({
      ok: false,
      error: 'no_free',
    });
    expect(validateOffering({ tier: 'A', priceNtd: 0, isFree: true }).ok).toBe(false);
  });
});
