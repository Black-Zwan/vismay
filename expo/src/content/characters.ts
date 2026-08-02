/**
 * Playable characters. Placeholder entries — replace freely.
 * Seven characters per spec.
 */

import type { CharacterEntry } from '@/src/content/types';

export const CHARACTERS: CharacterEntry[] = [
  {
    id: 'wanderer',
    name: 'The Wanderer',
    blurb: 'Placeholder character.',
    accentHex: '#8B7355',
  },
  {
    id: 'scholar',
    name: 'The Scholar',
    blurb: 'Placeholder character.',
    accentHex: '#5B6E8C',
  },
  {
    id: 'hearthtender',
    name: 'The Hearthtender',
    blurb: 'Placeholder character.',
    accentHex: '#B5651D',
  },
  {
    id: 'wayfinder',
    name: 'The Wayfinder',
    blurb: 'Placeholder character.',
    accentHex: '#3A7D7B',
  },
  {
    id: 'lamplighter',
    name: 'The Lamplighter',
    blurb: 'Placeholder character.',
    accentHex: '#7D5BA6',
  },
  {
    id: 'cartographer',
    name: 'The Cartographer',
    blurb: 'Placeholder character.',
    accentHex: '#4A6FA5',
  },
  {
    id: 'bellkeeper',
    name: 'The Bellkeeper',
    blurb: 'Placeholder character.',
    accentHex: '#A67C52',
  },
];

export const DEFAULT_CHARACTER_ID = 'wanderer';

export function getCharacter(id: string): CharacterEntry | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
