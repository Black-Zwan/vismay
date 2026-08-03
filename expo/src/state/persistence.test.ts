import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearPersistedState,
  flushPersistedState,
  loadPersistedState,
  setStorageBackend,
  type StorageBackend,
} from './persistence';
import type { AppState, PersistedEnvelope } from './types';
import { placeFromSeed } from '../world/generator';

const memory = new Map<string, string>();
const backend: StorageBackend = {
  async getItem(key) { return memory.get(key) ?? null; },
  async setItem(key, value) { memory.set(key, value); },
  async removeItem(key) { memory.delete(key); },
};

beforeEach(() => {
  memory.clear();
  setStorageBackend(backend);
});

describe('seeded-world persistence', () => {
  it('round-trips the resolved leg without recomputing its scenery', async () => {
    const place = placeFromSeed(3_417_128, { biome: 'river_vale' });
    const state = makeState(place.seed, place);
    await flushPersistedState(state, { lastSeenTimestamp: 100, monotonicCounter: 4 });

    const restored = await loadPersistedState();
    expect(restored?.state.journey.seed).toBe(3_417_128);
    expect(restored?.state.journey.place).toEqual(place);
    expect(restored?.state.journey.arrivalAt).toBe(state.journey.arrivalAt);
  });

  it('migrates v2 while preserving Chronicle entries', async () => {
    const legacy = makeState(0, placeFromSeed(0, { biome: 'pinelands' }));
    const chronicle = [{
      id: 'entry_1', dayIndex: 1, waymarkId: 'ashen_pines', cardId: 'the_star',
      lensId: 'lens_open', openerText: 'kept', answerText: 'kept', departText: 'kept',
      curioIds: [], createdAt: 50,
    }];
    const legacyEnvelope = {
      state: {
        ...legacy,
        journey: {
          characterId: 'rowan', signId: 'aries', dayIndex: 1, waymarkIndex: 1,
          legStartedAt: 100, legDurationMs: 200, arrivalAt: 300,
          bankedArrivals: 0, stepsWalked: 0, isPlus: false,
        },
        chronicle,
        schemaVersion: 2,
      },
      clockGuard: { lastSeenTimestamp: 100, monotonicCounter: 1 },
      schemaVersion: 2,
    } as unknown as PersistedEnvelope;
    memory.set('vismay_state_v2', JSON.stringify(legacyEnvelope));

    const restored = await loadPersistedState();
    expect(restored?.schemaVersion).toBe(5);
    expect(restored?.state.chronicle).toEqual(chronicle);
    expect(restored?.state.journey.place.seed).toBe(restored?.state.journey.seed);
    expect(restored?.state.raresFound).toEqual([]);
    expect(restored?.state.settings.arrivalPermissionAsked).toBe(true);
  });

  it('clears every versioned key on reset', async () => {
    memory.set('vismay_state_v1', 'one');
    memory.set('vismay_state_v2', 'two');
    memory.set('vismay_state_v3', 'three');
    memory.set('vismay_state_v4', 'four');
    await clearPersistedState();
    expect(memory.size).toBe(0);
  });

  it('migrates v3 placeholder copy without exposing it or losing the entry', async () => {
    const basePlace = placeFromSeed(18, { biome: 'river_vale' });
    const pendingName = 'the TODO R06 Willow';
    const legacy = makeState(basePlace.seed, {
      ...basePlace,
      archetypeId: 'willow',
      bucketKey: 'river_vale:willow',
      name: pendingName,
      departText: 'TODO: copy',
    });
    const entry = {
      id: 'entry_pending',
      dayIndex: 5,
      waymarkId: 'river_vale:willow',
      cardId: 'the_moon',
      lensId: 'lens_love',
      openerText: `On the 5th day, the wanderer came to ${pendingName}.`,
      answerText: 'kept',
      departText: 'TODO: copy',
      curioIds: [],
      createdAt: 500,
      placeName: pendingName,
      bucketKey: 'river_vale:willow',
    };
    const legacyEnvelope = {
      state: { ...legacy, chronicle: [entry], schemaVersion: 3 },
      clockGuard: { lastSeenTimestamp: 100, monotonicCounter: 1 },
      schemaVersion: 3,
    } as PersistedEnvelope;
    memory.set('vismay_state_v3', JSON.stringify(legacyEnvelope));

    const restored = await loadPersistedState();
    expect(restored?.state.chronicle[0].id).toBe(entry.id);
    expect(restored?.state.chronicle[0].placeName).toBe('the Willow');
    expect(restored?.state.chronicle[0].openerText).toContain('the Willow');
    expect(restored?.state.chronicle[0].departText).toBe('');
    expect(restored?.state.journey.place.name).toBe('the Willow');
  });
});

function makeState(seed: number, place: ReturnType<typeof placeFromSeed>): AppState {
  return {
    phase: 'traveling',
    onboarded: true,
    journey: {
      characterId: 'rowan', signId: 'aries', dayIndex: 0, waymarkIndex: 0,
      legStartedAt: 100, legDurationMs: 200, arrivalAt: 300,
      bankedArrivals: 0, stepsWalked: 0, isPlus: false,
      seed, biome: place.biome, previousBiome: place.biome, place,
      arrivalsSinceRare: place.isRare ? 0 : 1,
    },
    chronicle: [],
    mirror: {
      aspects: { tenderness: 0, resolve: 0, craft: 0, sight: 0, solitude: 0, fortune: 0 },
      satchel: [], lensHistory: [], recentPulls: [],
    },
    pendingCurioIds: [],
    raresFound: [],
    settings: {
      notifyArrival: false,
      notifyWeekly: false,
      devMode: false,
      arrivalPermissionAsked: false,
    },
    devOffsetMs: 0,
    schemaVersion: 4,
  };
}
