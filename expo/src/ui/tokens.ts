import type { TextStyle } from 'react-native';

const palette = {
  background: '#0a0812',
  surface: '#110e1c',
  surfaceRaised: '#181326',
  text: '#cfc6e8',
  textMuted: '#5c4f80',
  line: '#2b2440',
  danger: '#76515d',
  overlay: 'rgba(5, 3, 10, 0.82)',
} as const;

export const colors = {
  ...palette,
  // Temporary aliases used only by the WorldView placeholder. Task 6.6 owns
  // that implementation; keeping the aliases preserves its render seam here.
  bg: palette.background,
  ink: palette.text,
  inkMuted: palette.textMuted,
} as const;

export const fonts = {
  regular: 'Spectral-Regular',
  italic: 'Spectral-Italic',
  semibold: 'Spectral-SemiBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  reading: {
    fontFamily: fonts.italic,
    fontSize: 17,
    lineHeight: 26,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  display: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 1,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 1,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  numeral: {
    fontFamily: fonts.regular,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 3,
  },
} satisfies Record<string, TextStyle>;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;
