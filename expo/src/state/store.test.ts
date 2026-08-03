import { beforeEach, describe, expect, it } from 'vitest';

import { useStore } from './store';
import { setStorageBackend, type StorageBackend } from './persistence';

const memory = new Map<string, string>();
const backend: StorageBackend = {
  async getItem(key) { return memory.get(key) ?? null; },
  async setItem(key, value) { memory.set(key, value); },
  async removeItem(key) { memory.delete(key); },
};

beforeEach(async () => {
  memory.clear();
  setStorageBackend(backend);
  await useStore.getState().resetAll();
});

describe('onboarding', () => {
  it('opens the first pull immediately and applies only the hidden sign seed', () => {
    useStore.getState().completeOnboarding('rowan', 'cancer');
    const state = useStore.getState();

    expect(state.onboarded).toBe(true);
    expect(state.phase).toBe('arrive');
    expect(state.journey.bankedArrivals).toBe(1);
    expect(state.journey.signId).toBe('cancer');
    expect(state.mirror.aspects.tenderness).toBe(3);
    expect(Object.values(state.mirror.aspects).reduce((sum, value) => sum + value, 0)).toBe(3);
    expect(state.chronicle).toEqual([]);
  });

  it('reset returns to onboarding and clears the Mirror and Record', async () => {
    useStore.getState().completeOnboarding('rowan', 'cancer');
    useStore.setState((state) => ({
      chronicle: [{
        id: 'entry_1', dayIndex: 1, waymarkId: 'pinelands:pines', cardId: 'the_sun',
        lensId: 'lens_love', openerText: 'kept', answerText: 'kept', departText: '',
        curioIds: [], createdAt: 1,
      }],
      mirror: {
        ...state.mirror,
        aspects: { ...state.mirror.aspects, resolve: 12 },
        lensHistory: ['lens_love'],
        recentPulls: [{ cardId: 'the_sun', lensId: 'lens_love', at: 1 }],
      },
    }));

    await useStore.getState().resetAll();
    const reset = useStore.getState();
    expect(reset.onboarded).toBe(false);
    expect(reset.chronicle).toEqual([]);
    expect(reset.mirror.lensHistory).toEqual([]);
    expect(reset.mirror.recentPulls).toEqual([]);
    expect(Object.values(reset.mirror.aspects).every((value) => value === 0)).toBe(true);
    expect(reset.settings.arrivalPermissionAsked).toBe(false);
  });
});
