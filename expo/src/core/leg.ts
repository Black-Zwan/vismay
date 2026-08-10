/**
 * Walk-leg and arrival math. Pure functions, no platform imports.
 *
 * Completed legs chain from their scheduled arrival time so elapsed time while
 * the app is closed carries forward into additional banked arrivals.
 */

import type { JourneyState } from '@/src/state/types';

/** Dev override leg duration: 20 seconds. */
export const DEV_LEG_MS = 20_000;

/** The ordinary departure handoff before a real-time leg settles in. */
export const DEPARTURE_MS = 3_100;

/** A queued arrival needs enough road to feel like a new place, not another pack opening. */
export const BANKED_DEPARTURE_MS = 4_500;

/** Free-user leg duration: 22 hours. */
const FREE_LEG_MS = 22 * 60 * 60 * 1000;

/** Subscriber leg duration: 7 hours. */
const PLUS_LEG_MS = 7 * 60 * 60 * 1000;

/** Maximum number of unclaimed arrivals. */
export const MAX_BANKED_ARRIVALS = 5;

export function legDurationMs(isPlus: boolean, devFastLegs: boolean): number {
  if (devFastLegs) return DEV_LEG_MS;
  return isPlus ? PLUS_LEG_MS : FREE_LEG_MS;
}

/**
 * Resolve the visible departure ceremony before the current arrival is
 * consumed. More than one banked arrival means another pull is waiting after
 * this one, so the road gets a longer separator.
 */
export function departureDurationMs(bankedArrivals: number): number {
  return bankedArrivals > 1 ? BANKED_DEPARTURE_MS : DEPARTURE_MS;
}

export function computeArrivalAt(legStartedAt: number, durationMs: number): number {
  return legStartedAt + durationMs;
}

export function isLegComplete(journey: JourneyState, now: number): boolean {
  return now >= journey.arrivalAt;
}

export function walkProgress(journey: JourneyState, now: number): number {
  const elapsed = now - journey.legStartedAt;
  const fraction = elapsed / journey.legDurationMs;
  return Math.max(0, Math.min(1, fraction));
}

/**
 * Credit every completed leg, carrying overshoot forward from one scheduled
 * arrival to the next. Crediting never advances dayIndex; a day is claimed by
 * completing its pull.
 */
export function creditArrivals(
  journey: JourneyState,
  now: number,
  devFastLegs: boolean,
): { journey: JourneyState; newlyBanked: number } {
  let updated = { ...journey };
  let newlyBanked = 0;

  while (
    isLegComplete(updated, now) &&
    updated.bankedArrivals < MAX_BANKED_ARRIVALS
  ) {
    const nextLegStartedAt = updated.arrivalAt;
    const nextLegDurationMs = legDurationMs(updated.isPlus, devFastLegs);

    updated = {
      ...updated,
      bankedArrivals: updated.bankedArrivals + 1,
      legStartedAt: nextLegStartedAt,
      legDurationMs: nextLegDurationMs,
      arrivalAt: computeArrivalAt(nextLegStartedAt, nextLegDurationMs),
    };
    newlyBanked += 1;
  }

  // Once this tick reaches the cap, discard further overshoot and begin a
  // fresh leg from now. Later ticks at an existing cap leave that leg alone.
  if (newlyBanked > 0 && updated.bankedArrivals >= MAX_BANKED_ARRIVALS) {
    updated = startNextLeg(updated, now, devFastLegs);
  }

  return { journey: updated, newlyBanked };
}

export function consumeBankedArrival(journey: JourneyState): JourneyState {
  return {
    ...journey,
    bankedArrivals: Math.max(0, journey.bankedArrivals - 1),
  };
}

/** Start a fresh leg from an explicit timestamp. */
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
