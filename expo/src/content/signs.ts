/**
 * Twelve real zodiac signs with element and date ranges.
 */

import type { SignEntry } from '@/src/content/types';

export const SIGNS: SignEntry[] = [
  { id: 'aries', name: 'Aries', glyph: '♈', dates: 'Mar 21 – Apr 19', element: 'Fire' },
  { id: 'taurus', name: 'Taurus', glyph: '♉', dates: 'Apr 20 – May 20', element: 'Earth' },
  { id: 'gemini', name: 'Gemini', glyph: '♊', dates: 'May 21 – Jun 20', element: 'Air' },
  { id: 'cancer', name: 'Cancer', glyph: '♋', dates: 'Jun 21 – Jul 22', element: 'Water' },
  { id: 'leo', name: 'Leo', glyph: '♌', dates: 'Jul 23 – Aug 22', element: 'Fire' },
  { id: 'virgo', name: 'Virgo', glyph: '♍', dates: 'Aug 23 – Sep 22', element: 'Earth' },
  { id: 'libra', name: 'Libra', glyph: '♎', dates: 'Sep 23 – Oct 22', element: 'Air' },
  { id: 'scorpio', name: 'Scorpio', glyph: '♏', dates: 'Oct 23 – Nov 21', element: 'Water' },
  { id: 'sagittarius', name: 'Sagittarius', glyph: '♐', dates: 'Nov 22 – Dec 21', element: 'Fire' },
  { id: 'capricorn', name: 'Capricorn', glyph: '♑', dates: 'Dec 22 – Jan 19', element: 'Earth' },
  { id: 'aquarius', name: 'Aquarius', glyph: '♒', dates: 'Jan 20 – Feb 18', element: 'Air' },
  { id: 'pisces', name: 'Pisces', glyph: '♓', dates: 'Feb 19 – Mar 20', element: 'Water' },
];

export const DEFAULT_SIGN_ID = 'aries';

export function getSign(id: string): SignEntry | undefined {
  return SIGNS.find((s) => s.id === id);
}
