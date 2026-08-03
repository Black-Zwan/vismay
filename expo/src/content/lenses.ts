/**
 * Lenses — the topic asked before a draw.
 *
 * Launch target is 18 lenses; these 5 are the prototype set.
 */

import type { LensEntry } from '@/src/content/types';

export const LENSES: LensEntry[] = [
  {
    id: 'lens_love',
    label: 'LOVE',
    glyph: '♥',
    primaryAspect: 'tenderness',
    secondaryAspect: 'sight',
  },
  {
    id: 'lens_work',
    label: 'WORK',
    glyph: '⚒',
    primaryAspect: 'craft',
    secondaryAspect: 'resolve',
  },
  {
    id: 'lens_decision',
    label: 'A DECISION',
    glyph: '⚖',
    primaryAspect: 'resolve',
    secondaryAspect: 'sight',
  },
  {
    id: 'lens_self',
    label: 'MYSELF',
    glyph: '☉',
    primaryAspect: 'sight',
    secondaryAspect: 'solitude',
  },
  {
    id: 'lens_open',
    label: 'OPEN PULL',
    glyph: '✦',
    primaryAspect: 'fortune',
    // The secondary rotates in core so it is deterministic per pull.
  },
];

export const DEFAULT_LENS_ID = LENSES[0].id;

export function getLens(id: string): LensEntry | undefined {
  return LENSES.find((l) => l.id === id);
}
