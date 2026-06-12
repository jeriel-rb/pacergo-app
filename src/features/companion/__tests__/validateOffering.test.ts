import { validateOffering } from '../validateOffering';

describe('validateOffering', () => {
  it('accepts a paid Tier A offering', () => {
    expect(validateOffering({ tier: 'A', priceNtd: 1200, isFree: false }).ok).toBe(true);
  });

  it('rejects a free Tier A offering (only buddies may be free)', () => {
    const r = validateOffering({ tier: 'A', priceNtd: 0, isFree: true });
    expect(r.ok).toBe(false);
  });

  it('accepts a free Tier C offering', () => {
    expect(validateOffering({ tier: 'C', priceNtd: 0, isFree: true }).ok).toBe(true);
  });

  it('rejects a paid offering with a zero price', () => {
    expect(validateOffering({ tier: 'B', priceNtd: 0, isFree: false }).ok).toBe(false);
  });
});
