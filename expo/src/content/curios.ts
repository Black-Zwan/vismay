/**
 * Collectible curios unlocked via aspect thresholds. Placeholder entries.
 */

import type { CurioEntry } from '@/src/content/types';

export const CURIOS: CurioEntry[] = [
  {
    id: 'curio_one',
    name: 'Curio One',
    description: 'Placeholder curio.',
    rarity: 'common',
  },
  {
    id: 'curio_two',
    name: 'Curio Two',
    description: 'Placeholder curio.',
    rarity: 'uncommon',
  },
  {
    id: 'curio_three',
    name: 'Curio Three',
    description: 'Placeholder curio.',
    rarity: 'rare',
  },
];

export function getCurio(id: string): CurioEntry | undefined {
  return CURIOS.find((c) => c.id === id);
}
