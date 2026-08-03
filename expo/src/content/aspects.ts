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

/**
 * Resolve an owner-authored title for a score. The slots deliberately remain
 * empty until the 18 titles are supplied; the UI omits rather than invents.
 */
export function getAspectTitle(id: AspectId, score: number): string | undefined {
  const titles = ASPECTS[id].titles;
  if (!titles) return undefined;
  if (score >= 52) return titles[2];
  if (score >= 26) return titles[1];
  if (score >= 10) return titles[0];
  return undefined;
}
