import { describe, expect, it } from 'vitest';

import {
  WORLD_COMPOSITION,
  characterBaselineFromTop,
  isCharacterGrounded,
} from './composition';

describe('world vertical composition', () => {
  it('keeps the wanderer, near props, and landmark on the road plane', () => {
    const baseline = characterBaselineFromTop();
    const nearTop = 1 - WORLD_COMPOSITION.nearPropBottomPct[1] / 100;
    const nearBottom = 1 - WORLD_COMPOSITION.nearPropBottomPct[0] / 100;

    expect(isCharacterGrounded()).toBe(true);
    expect(baseline).toBeGreaterThanOrEqual(nearTop);
    expect(baseline).toBeLessThanOrEqual(nearBottom);
  });

  it('preserves a complete vista-to-ground depth stack', () => {
    expect(WORLD_COMPOSITION.horizonFromTop).toBeLessThan(WORLD_COMPOSITION.pathTopFromTop);
    expect(WORLD_COMPOSITION.pathTopFromTop).toBeLessThan(characterBaselineFromTop());
    expect(characterBaselineFromTop()).toBeLessThan(WORLD_COMPOSITION.pathBottomFromTop);
    expect(WORLD_COMPOSITION.pathBottomFromTop).toBeLessThan(WORLD_COMPOSITION.foregroundTopFromTop);
  });
});
