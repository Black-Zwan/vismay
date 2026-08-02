import { useEffect, useState } from 'react';

/**
 * A presentation-only clock for values that need to refresh while a screen is
 * visible. Time deliberately lives outside the Zustand snapshot.
 */
export function useClock(intervalMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
