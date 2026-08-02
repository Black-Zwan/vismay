import { afterEach, describe, expect, it } from 'vitest';

import { daypartFromTimestamp, getDevOffset, now, setDevOffset } from './time';

afterEach(() => setDevOffset(0));

describe('shifted game clock', () => {
  it('adds the configured development offset', () => {
    setDevOffset(6 * 60 * 60 * 1000);
    const before = Date.now();
    const shifted = now();
    const after = Date.now();

    expect(shifted).toBeGreaterThanOrEqual(before + 6 * 60 * 60 * 1000);
    expect(shifted).toBeLessThanOrEqual(after + 6 * 60 * 60 * 1000);
    expect(getDevOffset()).toBe(6 * 60 * 60 * 1000);
  });

  it('returns to wall time when reset', () => {
    setDevOffset(48 * 60 * 60 * 1000);
    setDevOffset(0);

    expect(Math.abs(now() - Date.now())).toBeLessThan(20);
    expect(getDevOffset()).toBe(0);
  });
});

describe('daypart boundaries', () => {
  const atHour = (hour: number) => new Date(2026, 7, 2, hour, 0, 0, 0).getTime();

  it.each([
    [5, 'dawn'],
    [8, 'dawn'],
    [9, 'morning'],
    [11, 'morning'],
    [12, 'noon'],
    [13, 'noon'],
    [14, 'afternoon'],
    [17, 'afternoon'],
    [18, 'dusk'],
    [20, 'dusk'],
    [21, 'night'],
    [4, 'night'],
  ] as const)('maps %i:00 to %s', (hour, expected) => {
    expect(daypartFromTimestamp(atHour(hour))).toBe(expected);
  });
});
