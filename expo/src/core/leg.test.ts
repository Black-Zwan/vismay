import { describe, expect, it } from 'vitest';

import {
  DEV_LEG_MS,
  MAX_BANKED_ARRIVALS,
  creditArrivals,
  legDurationMs,
} from './leg';
import type { JourneyState } from '../state/types';

const START = 1_000_000;

function makeJourney(overrides: Partial<JourneyState> = {}): JourneyState {
  const duration = legDurationMs(false, false);
  return {
    characterId: 'rowan',
    signId: 'aries',
    dayIndex: 4,
    waymarkIndex: 2,
    legStartedAt: START,
    legDurationMs: duration,
    arrivalAt: START + duration,
    bankedArrivals: 0,
    stepsWalked: 0,
    isPlus: false,
    ...overrides,
  };
}

function expectTimingInvariant(journey: JourneyState): void {
  expect(journey.arrivalAt).toBe(journey.legStartedAt + journey.legDurationMs);
}

describe('creditArrivals', () => {
  it('credits one arrival after one leg elapses', () => {
    const before = makeJourney();
    const result = creditArrivals(before, before.arrivalAt, false);

    expect(result.newlyBanked).toBe(1);
    expect(result.journey.bankedArrivals).toBe(1);
    expect(result.journey.dayIndex).toBe(before.dayIndex);
    expectTimingInvariant(result.journey);
  });

  it('credits three arrivals across one closed-app gap', () => {
    const before = makeJourney();
    const now = before.legStartedAt + before.legDurationMs * 3;
    const result = creditArrivals(before, now, false);

    expect(result.newlyBanked).toBe(3);
    expect(result.journey.bankedArrivals).toBe(3);
    expect(result.journey.legStartedAt).toBe(now);
    expectTimingInvariant(result.journey);
  });

  it('saturates at five and restarts the current leg from now', () => {
    const before = makeJourney();
    const now = before.legStartedAt + before.legDurationMs * 8;
    const result = creditArrivals(before, now, false);

    expect(result.newlyBanked).toBe(MAX_BANKED_ARRIVALS);
    expect(result.journey.bankedArrivals).toBe(MAX_BANKED_ARRIVALS);
    expect(result.journey.legStartedAt).toBe(now);
    expect(result.journey.arrivalAt).toBe(now + before.legDurationMs);
    expectTimingInvariant(result.journey);
  });

  it('uses 20-second legs in fast mode', () => {
    const before = makeJourney({
      legDurationMs: DEV_LEG_MS,
      arrivalAt: START + DEV_LEG_MS,
    });
    const now = START + DEV_LEG_MS * 3;
    const result = creditArrivals(before, now, true);

    expect(result.newlyBanked).toBe(3);
    expect(result.journey.legDurationMs).toBe(DEV_LEG_MS);
    expectTimingInvariant(result.journey);
  });

  it('is idempotent at the same timestamp', () => {
    const before = makeJourney();
    const now = before.arrivalAt;
    const first = creditArrivals(before, now, false);
    const second = creditArrivals(first.journey, now, false);

    expect(second.newlyBanked).toBe(0);
    expect(second.journey).toEqual(first.journey);
    expectTimingInvariant(second.journey);
  });
});
