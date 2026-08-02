/**
 * Aspect scoring logic. Pure, no platform imports.
 *
 * Scoring: each pull adjusts the lens's primary and secondary aspects.
 * Threshold crossings unlock curios.
 */

import type { AspectId } from '@/src/state/types';
import type { CardEntry, LensEntry } from '@/src/content/types';

/** Canonical ordering of aspect ids. */
export const ASPECT_IDS: AspectId[] = [
  'tenderness',
  'resolve',
  'craft',
  'sight',
  'solitude',
  'fortune',
];

/** Score bounds. */
const MIN_SCORE = 0;
const MAX_SCORE = 100;

/** Thresholds at which curios are unlocked. */
const THRESHOLDS: number[] = [25, 50, 75];

/** How much a pull shifts the primary and secondary aspects. */
const PRIMARY_SHIFT = 5;
const SECONDARY_SHIFT = 2;

/** Clamp a score to valid bounds. */
function clampScore(n: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, n));
}

/**
 * Score a pull: adjust the primary and secondary aspects for the chosen lens.
 * Returns the new aspects map (does not mutate the input).
 */
export function scorePull(
  before: Record<AspectId, number>,
  lens: LensEntry,
  _card: CardEntry,
): Record<AspectId, number> {
  const after = { ...before };
  if (!lens.primaryAspect || !lens.secondaryAspect) return after;
  after[lens.primaryAspect] = clampScore(after[lens.primaryAspect] + PRIMARY_SHIFT);
  after[lens.secondaryAspect] = clampScore(after[lens.secondaryAspect] + SECONDARY_SHIFT);
  return after;
}

/** A threshold crossing for a single aspect. */
export interface ThresholdCrossing {
  aspect: AspectId;
  threshold: number;
}

/**
 * Detect thresholds crossed between the before and after scores.
 * A crossing is when a threshold value is newly reached (before < threshold <= after).
 */
export function crossedThresholds(
  before: Record<AspectId, number>,
  after: Record<AspectId, number>,
): ThresholdCrossing[] {
  const crossed: ThresholdCrossing[] = [];
  for (const id of ASPECT_IDS) {
    const b = before[id];
    const a = after[id];
    for (const t of THRESHOLDS) {
      if (b < t && a >= t) {
        crossed.push({ aspect: id, threshold: t });
      }
    }
  }
  return crossed;
}

/**
 * Derive a deterministic curio id from an aspect + threshold crossing.
 * The content layer maps these to display names.
 */
export function curioIdForThreshold(aspect: AspectId, threshold: number): string {
  return `curio_${aspect}_${threshold}`;
}
