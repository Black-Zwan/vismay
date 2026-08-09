import { describe, expect, it } from 'vitest';

import {
  WORLD_COMPOSITION,
  characterBaselineFromTop,
  characterRoadPosition,
  isCharacterGrounded,
} from './composition';

describe('world vertical composition', () => {
  it('keeps the wanderer on the road and near props beyond its far edge', () => {
    const baseline = characterBaselineFromTop();
    const nearTop = 1 - WORLD_COMPOSITION.nearPropBottomPct[1] / 100;
    const nearBottom = 1 - WORLD_COMPOSITION.nearPropBottomPct[0] / 100;

    expect(isCharacterGrounded()).toBe(true);
    expect(nearTop).toBeGreaterThan(WORLD_COMPOSITION.horizonFromTop);
    expect(nearBottom).toBeLessThanOrEqual(WORLD_COMPOSITION.pathTopFromTop);
    expect(baseline).toBeGreaterThan(nearBottom);
    expect(characterRoadPosition()).toBeGreaterThan(0.35);
    expect(characterRoadPosition()).toBeLessThan(0.7);
  });

  it('preserves the prototype sky-to-foreground depth stack', () => {
    const orderedBoundaries = [
      WORLD_COMPOSITION.skyTopFromTop,
      WORLD_COMPOSITION.ridgeBandTopFromTop,
      WORLD_COMPOSITION.horizonFromTop,
      WORLD_COMPOSITION.backgroundBottomFromTop,
      WORLD_COMPOSITION.pathBottomFromTop,
      WORLD_COMPOSITION.foregroundTopFromTop,
      WORLD_COMPOSITION.worldBottomFromTop,
    ];

    expect(WORLD_COMPOSITION.backgroundBottomFromTop).toBe(WORLD_COMPOSITION.pathTopFromTop);
    for (let index = 1; index < orderedBoundaries.length; index += 1) {
      expect(orderedBoundaries[index]).toBeGreaterThan(orderedBoundaries[index - 1]);
    }
  });
});
