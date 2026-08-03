import { describe, expect, it } from 'vitest';

import { findCurio } from './curios';

const candidates = [
  { id: 'common', rarity: 'common' as const },
  { id: 'uncommon', rarity: 'uncommon' as const },
  { id: 'rare', rarity: 'rare' as const },
];

describe('curio finds', () => {
  it('finds no more than one item for a completed leg', () => {
    expect(findCurio({ seed: 11, dayIndex: 4, isRarePlace: false, ownedIds: [], candidates }))
      .not.toBeInstanceOf(Array);
  });

  it('does not grant an item already in the Satchel', () => {
    expect(findCurio({
      seed: 1,
      dayIndex: 1,
      isRarePlace: false,
      ownedIds: ['common'],
      candidates,
      forceRarity: 'common',
    })).toBeNull();
  });

  it('uses the rare encounter system to guarantee a rare-tier attempt', () => {
    expect(findCurio({ seed: 1, dayIndex: 1, isRarePlace: true, ownedIds: [], candidates }))
      .toBe('rare');
  });

  it('can force each rarity for the dev console', () => {
    for (const candidate of candidates) {
      expect(findCurio({
        seed: 2,
        dayIndex: 2,
        isRarePlace: false,
        ownedIds: [],
        candidates,
        forceRarity: candidate.rarity,
      })).toBe(candidate.id);
    }
  });
});
