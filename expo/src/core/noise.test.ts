import { describe, expect, it } from 'vitest';

import { hash2, vnoise } from './noise';

describe('vnoise', () => {
  it('matches the hash value at integer lattice points', () => {
    expect(vnoise(2, 3)).toBe(hash2(2, 3));
  });

  it('is deterministic between lattice points', () => {
    const sample = vnoise(2.25, 7.75);
    expect(sample).toBe(vnoise(2.25, 7.75));
    expect(sample).toBeGreaterThanOrEqual(0);
    expect(sample).toBeLessThan(1);
  });
});
