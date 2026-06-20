import { isGoogleConfigured, isAppleConfigured } from '../authConfig';

describe('authConfig', () => {
  it('reports Google unconfigured when the client id is missing', () => {
    expect(isGoogleConfigured(undefined)).toBe(false);
  });

  it('reports Google configured when the client id is present', () => {
    expect(isGoogleConfigured('abc.apps.googleusercontent.com')).toBe(true);
  });

  it('reports Apple configured only on iOS', () => {
    expect(isAppleConfigured('ios')).toBe(true);
    expect(isAppleConfigured('android')).toBe(false);
  });
});
