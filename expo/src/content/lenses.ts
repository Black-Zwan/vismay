/**
 * Lenses / topics the user picks before drawing. Placeholder entries.
 */

import type { LensEntry } from '@/src/content/types';

export const LENSES: LensEntry[] = [
  {
    id: 'lens_work',
    label: 'Work',
    primaryAspect: 'craft',
    secondaryAspect: 'resolve',
  },
  {
    id: 'lens_love',
    label: 'Love',
    primaryAspect: 'tenderness',
    secondaryAspect: 'solitude',
  },
  {
    id: 'lens_self',
    label: 'Self',
    primaryAspect: 'sight',
    secondaryAspect: 'fortune',
  },
];

export const DEFAULT_LENS_ID = 'lens_work';

export function getLens(id: string): LensEntry | undefined {
  return LENSES.find((l) => l.id === id);
}
