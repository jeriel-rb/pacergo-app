import { resolveScheme } from '../resolveScheme';

describe('resolveScheme', () => {
  it('returns the explicit preference when not system', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('follows the system scheme when preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('defaults to dark when system scheme is null', () => {
    expect(resolveScheme('system', null)).toBe('dark');
  });
});
