import type { ColorScheme, ThemePreference } from './tokens';

export function resolveScheme(
  preference: ThemePreference,
  systemScheme: ColorScheme | null
): ColorScheme {
  if (preference === 'system') {
    return systemScheme ?? 'dark';
  }
  return preference;
}
