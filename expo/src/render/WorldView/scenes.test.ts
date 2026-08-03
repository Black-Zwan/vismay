import { describe, expect, it } from 'vitest';

import {
  GROUND_TEXTURE,
  SCENE_IDS,
  WATER_STYLE,
  resolveSceneFrame,
  sceneApproachAmount,
  sceneIdForRare,
  sceneProps,
} from './scenes';

describe('scene descriptors', () => {
  it('defines all nine requested scenes', () => {
    expect(SCENE_IDS).toEqual([
      'default', 'shore', 'stillwater', 'canyon', 'starfall',
      'highpass', 'saltflat', 'span', 'canopy',
    ]);
  });

  it('leaves the default scene unchanged through the whole leg', () => {
    expect(resolveSceneFrame('default', 0, 'pinelands')).toEqual(
      resolveSceneFrame('default', 1, 'pinelands'),
    );
  });

  it('holds until 55%, then eases continuously to the destination', () => {
    expect(sceneApproachAmount(0.55)).toBe(0);
    expect(sceneApproachAmount(0.775)).toBeCloseTo(0.5);
    expect(sceneApproachAmount(1)).toBe(1);
    const before = resolveSceneFrame('shore', 0.55, 'pinelands');
    const during = resolveSceneFrame('shore', 0.775, 'pinelands');
    const arrived = resolveSceneFrame('shore', 1, 'pinelands');
    expect(before.ridgeCount).toBe(3);
    expect(during.ridgeCount).toBeCloseTo(1.5);
    expect(arrived.ridgeCount).toBe(0);
    expect(arrived.waterFrom).toBe(0.54);
    expect(arrived.waterStyle).toBe(WATER_STYLE.waves);
    expect(arrived.groundTexture).toBe(GROUND_TEXTURE.sand);
  });

  it('keeps the existing low river shimmer in a normal river-vale scene', () => {
    expect(resolveSceneFrame('default', 1, 'river_vale').waterAmount).toBe(1);
    expect(resolveSceneFrame('default', 1, 'river_vale').waterFrom).toBe(0.9);
  });

  it('swaps props only once the approach begins', () => {
    expect(sceneProps('shore', 0.55)).toBeNull();
    expect(sceneProps('shore', 0.551)).toEqual(['driftwood', 'post', 'hull', 'stone']);
  });

  it('maps named rare destinations to their scenes', () => {
    expect(sceneIdForRare('vansh_sea')).toBe('shore');
    expect(sceneIdForRare('gardner_lake')).toBe('stillwater');
    expect(sceneIdForRare('nova_reach')).toBe('starfall');
    expect(sceneIdForRare(null)).toBe('default');
  });
});
