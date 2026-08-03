export type CurioRarity = 'common' | 'uncommon' | 'rare';

export interface CurioCandidate {
  id: string;
  rarity: CurioRarity;
}

export interface CurioFindOptions {
  seed: number;
  dayIndex: number;
  isRarePlace: boolean;
  ownedIds: readonly string[];
  candidates: readonly CurioCandidate[];
  /** Dev-only escape hatch. Production leaves this unset. */
  forceRarity?: CurioRarity;
}

/**
 * Pick at most one curio when a leg resolves. The roll is stable for a leg so
 * reopening the app cannot reroll the find. Curios are unique at launch.
 */
export function findCurio(options: CurioFindOptions): string | null {
  const available = options.candidates.filter(
    (candidate) => !options.ownedIds.includes(candidate.id),
  );
  if (available.length === 0) return null;

  const rarity = options.forceRarity ?? rolledRarity(options);
  if (!rarity) return null;
  const pool = available.filter((candidate) => candidate.rarity === rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(unit(options.seed, options.dayIndex * 31 + 17) * pool.length)].id;
}

function rolledRarity(options: CurioFindOptions): CurioRarity | null {
  if (options.isRarePlace) return 'rare';
  const roll = unit(options.seed, options.dayIndex * 19 + 5);
  // A completed blessed leg is the cadence unit. These thresholds target a
  // common find around every 1.5 legs, uncommon weekly, rare fortnightly.
  if (roll < 1 / 14) return 'rare';
  if (roll < 1 / 14 + 1 / 7) return 'uncommon';
  if (roll < 1 / 14 + 1 / 7 + 2 / 3) return 'common';
  return null;
}

function unit(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 2 ** 32;
}
