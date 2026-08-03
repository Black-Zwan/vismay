import { describe, expect, it } from 'vitest';

import {
  formatTracePassage,
  fuzzyTraceTime,
  isTracePayload,
  selectLegCairns,
  type TraceObservation,
  type TracePayload,
} from './traces';

const NOW = Date.UTC(2026, 7, 3, 12);
const payload: TracePayload = {
  leg_id: 12,
  day_index: 41,
  hour_bucket: 8,
  sign: 9,
  lens: 0,
  card: 1,
};

function options(realTraces: TraceObservation[] = []) {
  return {
    realTraces,
    seed: 3_417_128,
    now: NOW,
    legId: 12,
    dayIndex: 42,
    playerSign: 9,
    signCount: 12,
    lensCount: 5,
    cardCount: 6,
    interestingCardIndexes: [2],
  };
}

describe('trace payload boundary', () => {
  it('accepts exactly six bounded integers', () => {
    expect(isTracePayload(payload)).toBe(true);
    expect(Object.values(payload).every(Number.isInteger)).toBe(true);
  });

  it('rejects free text, extra fields, and out-of-range enums', () => {
    expect(isTracePayload({ ...payload, note: 'hello' })).toBe(false);
    expect(isTracePayload({ ...payload, sign: 'capricorn' })).toBe(false);
    expect(isTracePayload({ ...payload, card: 78 })).toBe(false);
  });
});

describe('procedural floor', () => {
  it('always produces two or three cairns and never exceeds the cap', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const cairns = selectLegCairns({ ...options(), seed });
      expect(cairns.length).toBeGreaterThanOrEqual(2);
      expect(cairns.length).toBeLessThanOrEqual(3);
    }
  });

  it('uses only old procedural traces when the network is empty', () => {
    const cairns = selectLegCairns(options());
    expect(cairns.every((trace) => trace.source === 'procedural')).toBe(true);
    expect(cairns.every((trace) => fuzzyTraceTime(trace, NOW) === 'Days ago')).toBe(true);
    expect(cairns.every((trace) => NOW - trace.createdAt >= 2 * 24 * 60 * 60 * 1_000)).toBe(true);
  });

  it('keeps fresh language exclusive to real traces', () => {
    const real: TraceObservation = {
      payload,
      source: 'real',
      createdAt: NOW - 4 * 60 * 60 * 1_000,
    };
    expect(fuzzyTraceTime(real, NOW)).toBe('Four hours ago');
    expect(selectLegCairns(options([real])).some((trace) => trace.source === 'real')).toBe(true);
  });

  it('forces the offline floor in low-density mode even when real data exists', () => {
    const real: TraceObservation = { payload, source: 'real', createdAt: NOW - 1_000 };
    const cairns = selectLegCairns({ ...options([real]), density: 'low' });
    expect(cairns).toHaveLength(2);
    expect(cairns.every((trace) => trace.source === 'procedural')).toBe(true);
  });

  it('biases scarce real slots toward sign matches and interesting cards', () => {
    const ordinary = { payload: { ...payload, sign: 1, card: 0 }, source: 'real' as const, createdAt: NOW - 1_000 };
    const signMatch = { payload: { ...payload, sign: 9, card: 0 }, source: 'real' as const, createdAt: NOW - 2_000 };
    const tower = { payload: { ...payload, sign: 1, card: 2 }, source: 'real' as const, createdAt: NOW - 3_000 };
    const cairns = selectLegCairns({ ...options([ordinary, signMatch, tower]), density: 'low' });
    expect(cairns.every((trace) => trace.source === 'procedural')).toBe(true);

    const high = selectLegCairns({ ...options([ordinary, signMatch, tower]), density: 'high' });
    expect(high.map((trace) => trace.payload.card)).toContain(2);
    expect(high.map((trace) => trace.payload.sign)).toContain(9);
  });

  it('keeps a procedural trace in the blend when real density is high', () => {
    const real = Array.from({ length: 12 }, (_, index) => ({
      payload: { ...payload, day_index: index, card: index % 6 },
      source: 'real' as const,
      createdAt: NOW - index * 1_000,
    }));
    const cairns = selectLegCairns({ ...options(real), density: 'high' });
    expect(cairns).toHaveLength(3);
    expect(cairns.some((trace) => trace.source === 'procedural')).toBe(true);
  });
});

describe('trace prose', () => {
  it('assembles the canonical Chronicle-register passage', () => {
    const real: TraceObservation = {
      payload,
      source: 'real',
      createdAt: NOW - 4 * 60 * 60 * 1_000,
    };
    expect(formatTracePassage(real, NOW, 'Capricorn', 'LOVE', 'THE MOON')).toBe(
      'Four hours ago, a Capricorn passed this way. They asked of love, and the road answered with The Moon.',
    );
  });
});
