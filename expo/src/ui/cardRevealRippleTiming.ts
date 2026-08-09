const RIPPLE_COUNT = 3;

export type RippleWindow = {
  start: number;
  crest: number;
  end: number;
};

export function rippleWindow(index: number): RippleWindow {
  const boundedIndex = Math.max(0, Math.min(RIPPLE_COUNT - 1, Math.floor(index)));
  const start = 0.001 + boundedIndex * 0.16;
  return {
    start,
    crest: start + 0.2,
    end: start + 0.56,
  };
}
