/**
 * Lenses — the topic asked before a draw.
 *
 * TODO(owner): primaryAspect (+2) and secondaryAspect (+1) are unassigned.
 * The design doc gives one worked example: Love -> Tenderness primary,
 * Sight secondary, 'because noticing is part of caring'. Assign the rest.
 *
 * Launch target is 18 lenses; these 5 are the prototype set.
 */

import type { LensEntry } from '@/src/content/types';

export const LENSES: LensEntry[] = [
  {
    id: 'lens_love',
    label: 'LOVE',
    glyph: '♥',
    // primaryAspect: TODO(owner)
    // secondaryAspect: TODO(owner)
  },
  {
    id: 'lens_work',
    label: 'WORK',
    glyph: '⚒',
    // primaryAspect: TODO(owner)
    // secondaryAspect: TODO(owner)
  },
  {
    id: 'lens_decision',
    label: 'A DECISION',
    glyph: '⚖',
    // primaryAspect: TODO(owner)
    // secondaryAspect: TODO(owner)
  },
  {
    id: 'lens_self',
    label: 'MYSELF',
    glyph: '☉',
    // primaryAspect: TODO(owner)
    // secondaryAspect: TODO(owner)
  },
  {
    id: 'lens_open',
    label: 'OPEN PULL',
    glyph: '✦',
    // primaryAspect: TODO(owner)
    // secondaryAspect: TODO(owner)
  },
];

export const DEFAULT_LENS_ID = LENSES[0].id;

export function getLens(id: string): LensEntry | undefined {
  return LENSES.find((l) => l.id === id);
}
