import { formatNTD, formatDistanceMeters } from '../index';

describe('formatNTD', () => {
  it('formats a whole NTD amount with no decimals and a thousands separator', () => {
    expect(formatNTD(1200)).toMatch(/1,200/);
  });

  it('shows Free when amount is 0 in English', () => {
    expect(formatNTD(0, 'en')).toBe('Free');
  });

  it('shows the localized Free label in Traditional Chinese', () => {
    expect(formatNTD(0, 'zh-Hant')).toBe('免費');
  });
});

describe('formatDistanceMeters', () => {
  it('shows meters under 1km', () => {
    expect(formatDistanceMeters(450)).toBe('450 m');
  });

  it('shows one-decimal km at or above 1km', () => {
    expect(formatDistanceMeters(1500)).toBe('1.5 km');
  });
});
