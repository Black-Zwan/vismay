/** Mirror aspect scoring. Pure functions, no platform imports. */

import type { CardEntry, LensEntry, SignEntry } from '@/src/content/types';
import type { AspectId } from '@/src/state/types';

export const ASPECT_IDS: AspectId[] = [
  'tenderness',
  'resolve',
  'craft',
  'sight',
  'solitude',
  'fortune',
];

export const TITLE_THRESHOLDS = [10, 26, 52] as const;

const ELEMENT_ASPECT: Record<SignEntry['element'], AspectId> = {
  Fire: 'resolve',
  Earth: 'craft',
  Air: 'sight',
  Water: 'tenderness',
};

export function emptyAspects(): Record<AspectId, number> {
  return {
    tenderness: 0,
    resolve: 0,
    craft: 0,
    sight: 0,
    solitude: 0,
    fortune: 0,
  };
}

/** Apply the hidden +3 onboarding seed associated with a sign element. */
export function seedAspectsForElement(
  element: SignEntry['element'],
): Record<AspectId, number> {
  const aspects = emptyAspects();
  aspects[ELEMENT_ASPECT[element]] = 3;
  return aspects;
}

/**
 * Score a pull without mutating the previous counters.
 *
 * Missing owner-authored mappings contribute nothing until they are assigned.
 */
export function scorePull(
  before: Record<AspectId, number>,
  lens: LensEntry,
  card: CardEntry,
): Record<AspectId, number> {
  const after = { ...before };

  if (lens.primaryAspect) {
    after[lens.primaryAspect] += 2;
  }
  if (lens.secondaryAspect) {
    after[lens.secondaryAspect] += 1;
  }
  if (card.aspect) {
    after[card.aspect] += 1;
  }

  return after;
}

export interface ThresholdCrossing {
  aspect: AspectId;
  threshold: (typeof TITLE_THRESHOLDS)[number];
}

/** Return every title threshold newly reached by this score change. */
export function crossedThresholds(
  before: Record<AspectId, number>,
  after: Record<AspectId, number>,
): ThresholdCrossing[] {
  const crossed: ThresholdCrossing[] = [];

  for (const aspect of ASPECT_IDS) {
    for (const threshold of TITLE_THRESHOLDS) {
      if (before[aspect] < threshold && after[aspect] >= threshold) {
        crossed.push({ aspect, threshold });
      }
    }
  }

  return crossed;
}
