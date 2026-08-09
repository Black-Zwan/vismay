import { describe, expect, it } from 'vitest';

import { rippleWindow } from '@/src/ui/cardRevealRippleTiming';

describe('card reveal ripple timing', () => {
  it('staggers waves and clears every wave before the animation ends', () => {
    const first = rippleWindow(0);
    const second = rippleWindow(1);
    const third = rippleWindow(2);
    const fourth = rippleWindow(3);

    expect(first.start).toBeLessThan(second.start);
    expect(second.start).toBeLessThan(third.start);
    expect(third.start).toBeLessThan(fourth.start);
    expect(first.end).toBeLessThan(second.end);
    expect(second.end).toBeLessThan(third.end);
    expect(third.end).toBeLessThan(fourth.end);
    expect(fourth.end).toBeLessThan(1);
  });
});
