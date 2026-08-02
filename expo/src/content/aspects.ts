/**
 * Display metadata for the six aspects.
 */

import type { AspectEntry } from '@/src/content/types';
import { ASPECT_IDS } from '@/src/core/mirror';
import type { AspectId } from '@/src/state/types';

export const ASPECTS: Record<AspectId, AspectEntry> = {
  tenderness: { id: 'tenderness', name: 'Tenderness' },
  resolve: { id: 'resolve', name: 'Resolve' },
  craft: { id: 'craft', name: 'Craft' },
  sight: { id: 'sight', name: 'Sight' },
  solitude: { id: 'solitude', name: 'Solitude' },
  fortune: { id: 'fortune', name: 'Fortune' },
};

export const ASPECT_LIST: AspectEntry[] = ASPECT_IDS.map((id) => ASPECTS[id]);

export function getAspect(id: AspectId): AspectEntry {
  return ASPECTS[id];
}
