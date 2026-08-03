import { ARCHETYPES, BIOMES, BIOME_IDS, RARE_LOCATIONS } from './data';
import type { BiomeId, PropPlacement, WorldPlace } from './types';

const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;
const BASE_RARE_RATE = 0.08;
const PITY_START = 20;

export interface PlaceOptions {
  currentBiome?: BiomeId;
  biome?: BiomeId;
  forceRare?: boolean;
  arrivalsSinceRare?: number;
}

export function hashSeed(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function unitFromSeed(seed: number, salt: number): number {
  return hashSeed(seed, salt) / UINT32_MAX_PLUS_ONE;
}

export function bucketKey(biome: BiomeId, archetypeId: string): string {
  return `${biome}:${archetypeId}`;
}

export function biomeForProgress(
  previousBiome: BiomeId,
  destinationBiome: BiomeId,
  walkProgress: number,
): BiomeId {
  return walkProgress < 0.5 ? previousBiome : destinationBiome;
}

export function shouldGuaranteeFirstRare(
  hasFoundRare: boolean,
  zeroBasedArrivalIndex: number,
): boolean {
  return !hasFoundRare && zeroBasedArrivalIndex >= 3;
}

export function placeFromSeed(seedInput: number, options: PlaceOptions = {}): WorldPlace {
  const seed = seedInput >>> 0;
  const arrivalsSinceRare = Math.max(0, options.arrivalsSinceRare ?? 0);
  const pityRate = arrivalsSinceRare < PITY_START
    ? BASE_RARE_RATE
    : Math.min(1, BASE_RARE_RATE + (arrivalsSinceRare - PITY_START + 1) * 0.12);
  const isRare = options.forceRare === true || unitFromSeed(seed, 1) < pityRate;

  if (isRare) {
    const rare = RARE_LOCATIONS[hashSeed(seed, 2) % RARE_LOCATIONS.length];
    const biome = options.biome ?? chooseBiome(seed, options.currentBiome);
    const validArchetypes = ARCHETYPES.filter((entry) => entry.biomes.includes(biome));
    const archetype = validArchetypes[hashSeed(seed, 3) % validArchetypes.length];
    return {
      seed,
      biome,
      archetypeId: archetype.id,
      adjectiveIndex: -1,
      name: rare.name,
      isRare: true,
      rareId: rare.id,
      bucketKey: bucketKey(biome, archetype.id),
      departText: rare.departText,
    };
  }

  const biome = options.biome ?? chooseBiome(seed, options.currentBiome);
  const definition = BIOMES[biome];
  const validArchetypes = ARCHETYPES.filter((entry) => entry.biomes.includes(biome));
  const archetype = validArchetypes[hashSeed(seed, 3) % validArchetypes.length];
  const adjectiveIndex = hashSeed(seed, 4) % definition.adjectives.length;
  const adjective = definition.adjectives[adjectiveIndex];

  return {
    seed,
    biome,
    archetypeId: archetype.id,
    adjectiveIndex,
    name: `the ${adjective} ${archetype.noun}`,
    isRare: false,
    rareId: null,
    bucketKey: bucketKey(biome, archetype.id),
    departText: 'TODO: copy',
  };
}

export function chooseBiome(seed: number, currentBiome?: BiomeId): BiomeId {
  if (!currentBiome) return BIOME_IDS[hashSeed(seed, 5) % BIOME_IDS.length];
  const currentIndex = BIOME_IDS.indexOf(currentBiome);
  const roll = unitFromSeed(seed, 6);
  if (roll < 0.52) return currentBiome;
  if (roll < 0.72) return BIOME_IDS[(currentIndex + 1) % BIOME_IDS.length];
  if (roll < 0.92) return BIOME_IDS[(currentIndex + BIOME_IDS.length - 1) % BIOME_IDS.length];
  const jumpOffset = 2 + (hashSeed(seed, 7) % (BIOME_IDS.length - 3));
  return BIOME_IDS[(currentIndex + jumpOffset) % BIOME_IDS.length];
}

export function propsFromSeed(
  seedInput: number,
  slotIndex: number,
  resolvedBiome?: BiomeId,
): PropPlacement {
  const seed = seedInput >>> 0;
  const biome = resolvedBiome ?? placeFromSeed(seed).biome;
  const kinds = BIOMES[biome].props;
  return {
    kind: kinds[hashSeed(seed, slotIndex * 7 + 11) % kinds.length],
    x: unitFromSeed(seed, slotIndex * 7 + 12),
    size: 0.7 + unitFromSeed(seed, slotIndex * 7 + 13) * 0.6,
    depth: hashSeed(seed, slotIndex * 7 + 14) % 4,
    offset: unitFromSeed(seed, slotIndex * 7 + 15),
  };
}
