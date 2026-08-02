/**
 * Design tokens. Intentionally minimal — the design pass comes later.
 * Plain text on plain backgrounds is correct for this scaffolding pass.
 */

export const colors = {
  bg: '#FAFAF7',
  bgPanel: '#F0EFEB',
  ink: '#1A1A1A',
  inkMuted: '#6B6B6B',
  accent: '#5B6E8C',
  line: '#D8D6D0',
  danger: '#B5462B',
  ok: '#3A7D5B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const type = {
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  title: { fontSize: 22, lineHeight: 28 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;
