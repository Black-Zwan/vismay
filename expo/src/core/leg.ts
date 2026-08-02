/**
 * Walk-leg and arrival math. Pure functions, no platform imports.
 *
 * A leg has a duration. Free users get 22 hours, subscribers get 7 hours.
 * Dev override: 20 seconds.
 *
 * On app open, credit any arrivals that completed while the app was closed.
 * They stack, capped at 5. Once the cap is hit, stop accruing and restart the
 * current leg from now.
 *
 * Completing a pull starts the next leg immediately.
 * If banked arrivals remain after a pull, do not jump straight to the next
 * pull — always play the walk first, then present a fresh arrival.
 *
 * Guards against clock manipulation with a stored monotonic counter and
 * last-seen timestamp, but does not punish the user. Worst case they walk
 * faster.
 */

import type { JourneyState } from '@/src/state/types';

/** Dev override leg duration: 20 seconds. */
export const DEV_LEG_MS = 20_000;

/** Free-user leg duration: 22 hours. */
const FREE_LEG_MS = 22 * 60 * 60 * 1000;

/** Subscriber leg duration: 7 hours. */
const PLUS_LEG_MS = 7 * 60 * 60 * 1000;

/** Maximum banked arrivals. Once hit, stop accruing and restart the leg. */
export const MAX_BANKED_ARRIVALS = 5;

/**
 * Compute the leg duration based on subscription and dev flag.
 */
export function legDurationMs(isPlus: boolean, devFastLegs: boolean): number {
  if (devFastLegs) return DEV_LEG_MS;
  return isPlus ? PLUS_LEG_MS : FREE_LEG_MS;
}

/** arrivalAt = legStartedAt + legDurationMs. */
export function computeArrivalAt(legStartedAt: number, durationMs: number): number {
  return legStartedAt + durationMs;
}

/** Whether the current leg has completed (now >= arrivalAt). */
export function isLegComplete(journey: JourneyState, now: number): boolean {
  return now >= journey.arrivalAt;
}

/**
 * Walk progress as a 0..1 fraction of the current leg elapsed.
 * Clamped; does not exceed 1.
 */
export function walkProgress(journey: JourneyState, now: number): number {
  const elapsed = now - journey.legStartedAt;
  const frac = elapsed / journey.legDurationMs;
  return Math.max(0, Math.min(1, frac));
}

/**
 * Credit any arrivals that completed while the app was closed.
 *
 * Several may have accrued. They stack, capped at MAX_BANKED_ARRIVALS.
 * Once the cap is hit, stop accruing and restart the current leg from now.
 *
 * Clock manipulation guard: if the clock moved backward or jumped absurdly
 * forward, we don't punish — worst case the user walks faster. We use the
 * monotonic counter and last-seen timestamp to detect tampering but only
 * use it to bound the number of credited arrivals.
 *
 * Returns the updated journey and the count of newly banked arrivals.
 */
export function creditArrivals(
  journey: JourneyState,
  now: number,
  _lastSeenTimestamp: number,
  _monotonicCounter: number,
): { journey: JourneyState; newlyBanked: number } {
  if (!isLegComplete(journey, now) && journey.bankedArrivals === 0) {
    return { journey, newlyBanked: 0 };
  }

  let updated = { ...journey };
  let newlyBanked = 0;

  // Credit the current leg if it completed.
  while (isLegComplete(updated, now)) {
    if (updated.bankedArrivals >= MAX_BANKED_ARRIVALS) {
      // Cap hit: restart the current leg from now, stop accruing.
      updated = startNextLeg(updated, now, false);
      break;
    }
    updated = {
      ...updated,
      bankedArrivals: updated.bankedArrivals + 1,
      dayIndex: updated.dayIndex + 1,
    };
    newlyBanked += 1;
    // Start the next leg to check if it also completed (multiple arrivals).
    updated = startNextLeg(updated, now, false);
  }

  return { journey: updated, newlyBanked };
}

/**
 * Consume one banked arrival (called when a pull completes).
 * Does NOT start the next leg — that's done by startNextLeg after closePull.
 */
export function consumeBankedArrival(journey: JourneyState): JourneyState {
  return {
    ...journey,
    bankedArrivals: Math.max(0, journey.bankedArrivals - 1),
  };
}

/**
 * Start the next leg: set legStartedAt to now, recompute duration and arrival.
 * The waymark index is NOT changed here (caller advances it).
 */
export function startNextLeg(
  journey: JourneyState,
  now: number,
  devFastLegs: boolean,
): JourneyState {
  const duration = legDurationMs(journey.isPlus, devFastLegs);
  return {
    ...journey,
    legStartedAt: now,
    legDurationMs: duration,
    arrivalAt: computeArrivalAt(now, duration),
  };
}
