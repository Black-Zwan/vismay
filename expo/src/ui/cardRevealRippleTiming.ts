const RIPPLE_COUNT = 4;

export type RippleWindow = {
  start: number;
  crest: number;
  end: number;
};

export function rippleWindow(index: number): RippleWindow {
  const boundedIndex = Math.max(0, Math.min(RIPPLE_COUNT - 1, Math.floor(index)));
  const start = 0.001 + boundedIndex * 0.105;
  return {
    start,
    crest: start + 0.19,
    end: start + 0.6,
  };
}
