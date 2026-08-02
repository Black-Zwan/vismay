import { describe, expect, it } from 'vitest';

import type { CardEntry, LensEntry, SignEntry } from '../content/types';
import type { AspectId } from '../state/types';
import {
  crossedThresholds,
  emptyAspects,
  scorePull,
  seedAspectsForElement,
} from './mirror';

function makeLens(overrides: Partial<LensEntry> = {}): LensEntry {
  return {
    id: 'lens_test',
    label: 'TEST',
    glyph: '✦',
    ...overrides,
  };
}

function makeCard(overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: 'card_test',
    name: 'CARD',
    numeral: 'I',
    accentHex: '#ffffff',
    epigraph: 'TODO: copy',
    readings: {},
    ...overrides,
  };
}

describe('scorePull', () => {
  it('adds +2 primary, +1 secondary, and +1 from the card', () => {
    const before = emptyAspects();
    const after = scorePull(
      before,
      makeLens({ primaryAspect: 'tenderness', secondaryAspect: 'sight' }),
      makeCard({ aspect: 'resolve' }),
    );

    expect(after).toEqual({
      tenderness: 2,
      resolve: 1,
      craft: 0,
      sight: 1,
      solitude: 0,
      fortune: 0,
    });
    expect(before).toEqual(emptyAspects());
  });

  it('keeps counters unbounded', () => {
    const before = { ...emptyAspects(), craft: 100 };
    const after = scorePull(
      before,
      makeLens({ primaryAspect: 'craft' }),
      makeCard({ aspect: 'craft' }),
    );

    expect(after.craft).toBe(103);
  });

  it('ignores owner mappings that are not assigned yet', () => {
    const before = emptyAspects();
    expect(scorePull(before, makeLens(), makeCard())).toEqual(before);
  });
});

describe('crossedThresholds', () => {
  it('reports title crossings at 10, 26, and 52 only', () => {
    const before = { ...emptyAspects(), sight: 9 };
    const after = { ...before, sight: 52 };

    expect(crossedThresholds(before, after)).toEqual([
      { aspect: 'sight', threshold: 10 },
      { aspect: 'sight', threshold: 26 },
      { aspect: 'sight', threshold: 52 },
    ]);
  });
});

describe('seedAspectsForElement', () => {
  const expected: Record<SignEntry['element'], AspectId> = {
    Fire: 'resolve',
    Earth: 'craft',
    Air: 'sight',
    Water: 'tenderness',
  };

  for (const [element, seededAspect] of Object.entries(expected) as [
    SignEntry['element'],
    AspectId,
  ][]) {
    it(`seeds ${element} into ${seededAspect}`, () => {
      const aspects = seedAspectsForElement(element);
      expect(aspects[seededAspect]).toBe(3);
      expect(Object.values(aspects).reduce((sum, value) => sum + value, 0)).toBe(3);
    });
  }
});
