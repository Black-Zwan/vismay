import { useEffect, useState } from 'react';

import { now } from '@/src/core/time';

/**
 * A presentation-only clock for values that need to refresh while a screen is
 * visible. Time deliberately lives outside the Zustand snapshot.
 */
export function useClock(intervalMs = 1_000): number {
  const [timestamp, setTimestamp] = useState(() => now());

  useEffect(() => {
    const interval = setInterval(() => setTimestamp(now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return timestamp;
}
