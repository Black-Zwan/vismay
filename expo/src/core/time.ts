/**
 * Daypart computation from the system clock. Pure, no platform imports.
 *
 * Six dayparts: dawn, morning, noon, afternoon, dusk, night.
 */

export type Daypart =
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'dusk'
  | 'night';

/** Hour boundaries (inclusive start, exclusive end). */
const DAYPART_HOURS: { part: Daypart; from: number; to: number }[] = [
  { part: 'dawn', from: 5, to: 8 }, // 05:00–08:59
  { part: 'morning', from: 9, to: 11 }, // 09:00–11:59
  { part: 'noon', from: 12, to: 13 }, // 12:00–13:59
  { part: 'afternoon', from: 14, to: 17 }, // 14:00–17:59
  { part: 'dusk', from: 18, to: 20 }, // 18:00–20:59
  { part: 'night', from: 21, to: 5 }, // 21:00–04:59 (wraps midnight)
];

/**
 * Dev override singleton. Set `.current` to a Daypart or null to force.
 * Accessed by the store's devForceDaypart action and selectDaypart.
 */
export const DEV_DAYPART_OVERRIDE: { current: Daypart | null } = {
  current: null,
};

/**
 * Derive the daypart from an epoch-millisecond timestamp.
 * Honors the dev override if set.
 */
export function daypartFromTimestamp(timestamp: number): Daypart {
  if (DEV_DAYPART_OVERRIDE.current) {
    return DEV_DAYPART_OVERRIDE.current;
  }
  const hour = new Date(timestamp).getHours();
  for (const entry of DAYPART_HOURS) {
    if (entry.from <= entry.to) {
      if (hour >= entry.from && hour < entry.to) return entry.part;
    } else {
      // Wraps midnight (e.g. night: 21–5)
      if (hour >= entry.from || hour < entry.to) return entry.part;
    }
  }
  return 'night';
}
