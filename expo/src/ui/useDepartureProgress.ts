import { useEffect, useState } from 'react';

/**
 * Short-lived presentation clock for a compressed banked-arrival approach.
 * It only runs during the departure ceremony; real legs continue to use the
 * ordinary one-second road clock.
 */
export function useDepartureProgress(active: boolean, durationMs: number): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    const startedAt = Date.now();
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(Math.min(1, (Date.now() - startedAt) / durationMs));
    }, 100);
    return () => clearInterval(interval);
  }, [active, durationMs]);

  return progress;
}
