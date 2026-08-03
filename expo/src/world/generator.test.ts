import { describe, expect, it } from 'vitest';

import { ARCHETYPES, BIOMES, BIOME_IDS, RARE_LOCATIONS } from './data';
import {
  biomeForProgress,
  bucketKey,
  placeFromSeed,
  propsFromSeed,
  shouldGuaranteeFirstRare,
} from './generator';

describe('seeded world', () => {
  it('resolves the same seed to the same place and prop layout', () => {
    const first = placeFromSeed(3_417_128, { currentBiome: 'pinelands' });
    const second = placeFromSeed(3_417_128, { currentBiome: 'pinelands' });
    expect(first).toEqual(second);
    expect(propsFromSeed(first.seed, 9, first.biome)).toEqual(
      propsFromSeed(second.seed, 9, second.biome),
    );
  });

  it('defines five biomes, thirteen archetypes, and six rares', () => {
    expect(BIOME_IDS).toHaveLength(5);
    expect(ARCHETYPES).toHaveLength(13);
    expect(ARCHETYPES.reduce((count, entry) => count + entry.biomes.length, 0)).toBe(25);
    expect(RARE_LOCATIONS).toHaveLength(6);
    for (const biome of BIOME_IDS) {
      expect(BIOMES[biome].props).toHaveLength(4);
      expect(BIOMES[biome].adjectives).toHaveLength(16);
    }
    const names = new Set(
      BIOME_IDS.flatMap((biome) =>
        ARCHETYPES.filter((entry) => entry.biomes.includes(biome)).flatMap((entry) =>
          BIOMES[biome].adjectives.map((adjective) => `the ${adjective} ${entry.noun}`),
        ),
      ),
    );
    expect(names.size).toBe(400);
  });

  it('can force a deterministic rare and escalates pity to certainty', () => {
    expect(placeFromSeed(42, { forceRare: true }).isRare).toBe(true);
    expect(placeFromSeed(42, { arrivalsSinceRare: 30 }).isRare).toBe(true);
  });

  it('guarantees the first rare on the fourth arrival at the latest', () => {
    expect(shouldGuaranteeFirstRare(false, 2)).toBe(false);
    expect(shouldGuaranteeFirstRare(false, 3)).toBe(true);
    expect(shouldGuaranteeFirstRare(true, 3)).toBe(false);
  });

  it('builds cairn buckets from the resolved biome and archetype', () => {
    expect(bucketKey('ashen_waste', 'bell')).toBe('ashen_waste:bell');
  });

  it('holds the previous biome until the midpoint of a leg', () => {
    expect(biomeForProgress('pinelands', 'river_vale', 0.499)).toBe('pinelands');
    expect(biomeForProgress('pinelands', 'river_vale', 0.5)).toBe('river_vale');
  });
});
