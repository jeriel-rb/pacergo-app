export type ColorScheme = 'dark' | 'light';
export type ThemePreference = 'dark' | 'light' | 'system';

export const palette = {
  brand: '#AB9FF2',
  brandDeep: '#7C5CFF',
  tier: {
    A: { from: '#F5C451', to: '#E0A93C' },
    B: { from: '#AB9FF2', to: '#7C5CFF' },
    C: { from: '#3DDC97', to: '#2BB67D' },
  },
} as const;

export const themes = {
  dark: {
    bg: '#18181B',
    surface: '#232328',
    elevated: '#2C2C32',
    hairline: 'rgba(255,255,255,0.08)',
    text: '#F5F5F7',
    textSecondary: '#A1A1AA',
    textMuted: '#6B6B74',
    brand: '#AB9FF2',
  },
  light: {
    bg: '#FFFFFF',
    surface: '#F6F5FA',
    elevated: '#FFFFFF',
    hairline: 'rgba(0,0,0,0.06)',
    text: '#1A1A1F',
    textSecondary: '#6B6B74',
    textMuted: '#9B9BA5',
    brand: '#7C5CFF',
  },
} as const;

export type ThemeColors = Record<keyof (typeof themes)['dark'], string>;
