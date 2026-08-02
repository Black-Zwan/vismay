/**
 * Zustand store. The single source of truth for app state.
 *
 * Owns:
 *  - the AppState
 *  - a clock guard (lastSeenTimestamp + monotonicCounter)
 *  - actions that mutate state, persist it (debounced), and trigger
 *    notification rescheduling.
 *
 * Pure logic lives in src/core; this store calls those functions and applies
 * results. Notification side-effects go through the notifications service so
 * the store itself stays free of expo-notifications imports.
 */

import { create } from 'zustand';
import type {
  AppState,
  AspectId,
  ChronicleEntry,
  ClockGuard,
  MirrorState,
  Phase,
  Settings,
} from '@/src/state/types';
import {
  CURRENT_SCHEMA_VERSION,
  clearPersistedState,
  loadPersistedState,
  persistState,
} from '@/src/state/persistence';
import {
  DEV_LEG_MS,
  MAX_BANKED_ARRIVALS,
  computeArrivalAt,
  consumeBankedArrival,
  creditArrivals,
  isLegComplete,
  legDurationMs,
  startNextLeg,
  walkProgress,
} from '@/src/core/leg';
import { ASPECT_IDS, crossedThresholds, curioIdForThreshold, scorePull } from '@/src/core/mirror';
import { daypartFromTimestamp } from '@/src/core/time';
import type { Daypart } from '@/src/core/time';
import { makeId } from '@/src/core/ids';
import { DEFAULT_CHARACTER_ID, getCharacter } from '@/src/content/characters';
import { DEFAULT_SIGN_ID } from '@/src/content/signs';
import { getCard, pickCardForPull } from '@/src/content/cards';
import { getLens } from '@/src/content/lenses';
import { getWaymark, nextWaymarkIndex, waymarkAt } from '@/src/content/waymarks';

/** Transient pull-in-progress data (not persisted; rebuilt from phase if needed). */
interface PullDraft {
  lensId: string;
  cardId: string;
  openerText: string;
  answerText: string;
}

export interface StoreState extends AppState {
  /** Clock-guard metadata persisted alongside AppState. */
  clockGuard: ClockGuard;
  /** Whether persisted state has been hydrated on launch. */
  hydrated: boolean;
  /** Dev overrides. */
  devFastLegs: boolean;
  /** Transient draft for the current pull. */
  pullDraft: PullDraft | null;

  // --- lifecycle ---
  hydrate: () => Promise<void>;
  resetAll: () => Promise<void>;

  // --- onboarding ---
  completeOnboarding: (characterId: string, signId: string) => void;

  // --- journey tick (call on app open / foreground) ---
  tick: (now?: number) => void;

  // --- pull flow ---
  beginPull: () => void;
  chooseLens: (lensId: string) => void;
  drawCard: () => void;
  revealCard: () => void;
  finishReading: () => void;
  closePull: () => void;

  // --- settings ---
  updateSettings: (patch: Partial<Settings>) => void;

  // --- dev panel ---
  devForceArrival: () => void;
  devToggleFastLegs: (on: boolean) => void;
  devForceDaypart: (part: Daypart | null) => void;
}

/** Build the default initial AppState. */
function defaultAppState(): AppState {
  const now = Date.now();
  const duration = legDurationMs(false, false);
  return {
    phase: 'traveling',
    onboarded: false,
    journey: {
      characterId: DEFAULT_CHARACTER_ID,
      signId: DEFAULT_SIGN_ID,
      dayIndex: 0,
      waymarkIndex: 0,
      legStartedAt: now,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(now, duration),
      bankedArrivals: 0,
      stepsWalked: 0,
      isPlus: false,
    },
    chronicle: [],
    mirror: {
      aspects: {
        tenderness: 25,
        resolve: 25,
        craft: 25,
        sight: 25,
        solitude: 25,
        fortune: 25,
      },
      satchel: [],
      lensHistory: [],
      recentPulls: [],
    },
    settings: {
      notifyArrival: true,
      notifyWeekly: false,
      devMode: false,
    },
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function defaultMirror(): MirrorState {
  return {
    aspects: {
      tenderness: 25,
      resolve: 25,
      craft: 25,
      sight: 25,
      solitude: 25,
      fortune: 25,
    },
    satchel: [],
    lensHistory: [],
    recentPulls: [],
  };
}

/**
 * Side-effect hook fired after state changes that affect notifications.
 * Implemented as an overridable callback so tests can stub it. The notifications
 * service registers its real implementation at app startup.
 */
export type NotificationSideEffect = (state: AppState, devFastLegs: boolean) => void;

let notifySideEffect: NotificationSideEffect | null = null;

export function setNotificationSideEffect(fn: NotificationSideEffect | null): void {
  notifySideEffect = fn;
}

/** Helper to run the notification side-effect if registered. */
function runNotifyEffect(state: AppState, devFastLegs: boolean): void {
  if (notifySideEffect) {
    try {
      notifySideEffect(state, devFastLegs);
    } catch {
      // notifications are best-effort; never crash the store
    }
  }
}

export const useStore = create<StoreState>((set, get) => ({
  ...defaultAppState(),
  clockGuard: { lastSeenTimestamp: Date.now(), monotonicCounter: 0 },
  hydrated: false,
  devFastLegs: false,
  pullDraft: null,

  hydrate: async () => {
    const envelope = await loadPersistedState();
    if (!envelope) {
      set({ hydrated: true });
      return;
    }
    set({
      ...envelope.state,
      clockGuard: envelope.clockGuard,
      hydrated: true,
    });
    // Credit any arrivals that completed while the app was closed.
    get().tick();
  },

  resetAll: async () => {
    await clearPersistedState();
    const fresh = defaultAppState();
    set({
      ...fresh,
      clockGuard: { lastSeenTimestamp: Date.now(), monotonicCounter: 0 },
      hydrated: true,
      devFastLegs: false,
      pullDraft: null,
    });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  completeOnboarding: (characterId, signId) => {
    const now = Date.now();
    const duration = legDurationMs(get().journey.isPlus, get().devFastLegs);
    const journey = {
      ...get().journey,
      characterId: characterId || DEFAULT_CHARACTER_ID,
      signId: signId || DEFAULT_SIGN_ID,
      legStartedAt: now,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(now, duration),
      bankedArrivals: 0,
      dayIndex: 0,
      waymarkIndex: 0,
      stepsWalked: 0,
    };
    set({
      onboarded: true,
      phase: 'traveling',
      journey,
    });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  tick: (nowInput) => {
    const now = nowInput ?? Date.now();
    const state = get();
    if (!state.onboarded) {
      // Still update clock guard even before onboarding.
      set({
        clockGuard: {
          lastSeenTimestamp: now,
          monotonicCounter: state.clockGuard.monotonicCounter + 1,
        },
      });
      return;
    }

    const { journey: updated, newlyBanked } = creditArrivals(
      state.journey,
      now,
      state.clockGuard.lastSeenTimestamp,
      state.clockGuard.monotonicCounter,
    );

    // Update steps walked from current leg progress.
    const steps = state.journey.stepsWalked + 0; // steps are per-leg-derived in UI

    const phase: Phase =
      updated.bankedArrivals > 0
        ? 'arrive'
        : isLegComplete(updated, now)
          ? 'arrive'
          : state.phase === 'arrive'
            ? 'arrive'
            : 'traveling';

    set({
      journey: { ...updated, stepsWalked: steps },
      phase,
      clockGuard: {
        lastSeenTimestamp: now,
        monotonicCounter: state.clockGuard.monotonicCounter + 1,
      },
    });

    if (newlyBanked > 0) {
      runNotifyEffect(get(), get().devFastLegs);
    }
    void persistState(getAppState(get()), get().clockGuard);
  },

  beginPull: () => {
    const state = get();
    if (state.phase !== 'arrive') return;
    set({ phase: 'question', pullDraft: null });
  },

  chooseLens: (lensId) => {
    const state = get();
    if (state.phase !== 'question') return;
    const lens = getLens(lensId);
    if (!lens) return;
    const card = pickCardForPull();
    const wm = waymarkAt(state.journey.waymarkIndex);
    const openerText = `${wm.name} — ${lens.label}`;
    const answerText = card.readings[lensId] ?? 'Placeholder reading.';
    set({
      phase: 'draw',
      pullDraft: { lensId, cardId: card.id, openerText, answerText },
    });
  },

  drawCard: () => {
    const state = get();
    if (state.phase !== 'draw' || !state.pullDraft) return;
    set({ phase: 'reveal' });
  },

  revealCard: () => {
    const state = get();
    if (state.phase !== 'reveal' || !state.pullDraft) return;
    set({ phase: 'reading' });
  },

  finishReading: () => {
    const state = get();
    if (state.phase !== 'reading' || !state.pullDraft) return;
    const draft = state.pullDraft;
    const lens = getLens(draft.lensId);
    const card = getCard(draft.cardId);
    if (!lens || !card) {
      set({ phase: 'arrive' });
      return;
    }

    // Score the pull.
    const before = state.mirror.aspects;
    const after = scorePull(before, lens, card);
    const crossed = crossedThresholds(before, after);
    const newCurios = crossed.map((c) => curioIdForThreshold(c.aspect, c.threshold));
    const satchel = Array.from(new Set([...state.mirror.satchel, ...newCurios]));

    const wm = waymarkAt(state.journey.waymarkIndex);
    const entry: ChronicleEntry = {
      id: makeId('entry'),
      dayIndex: state.journey.dayIndex,
      waymarkId: wm.id,
      cardId: draft.cardId,
      lensId: draft.lensId,
      openerText: draft.openerText,
      answerText: draft.answerText,
      departText: wm.departText,
      curioIds: newCurios,
      createdAt: Date.now(),
    };

    const recentPulls = [
      { cardId: draft.cardId, lensId: draft.lensId, at: Date.now() },
      ...state.mirror.recentPulls,
    ].slice(0, 10);

    set({
      phase: 'walk',
      chronicle: [entry, ...state.chronicle],
      mirror: {
        ...state.mirror,
        aspects: after,
        satchel,
        lensHistory: [draft.lensId, ...state.mirror.lensHistory].slice(0, 30),
        recentPulls,
      },
    });
    void persistState(getAppState(get()), get().clockGuard);
  },

  closePull: () => {
    const state = get();
    if (state.phase !== 'walk' && state.phase !== 'done') return;
    const now = Date.now();

    // Consume a banked arrival for this pull.
    let journey = consumeBankedArrival(state.journey);

    // Advance to the next waymark.
    journey = {
      ...journey,
      waymarkIndex: nextWaymarkIndex(journey.waymarkIndex),
    };

    // If more banked arrivals remain, start a leg but it will resolve to an
    // arrival presentation after the walk animation — i.e. we still start the
    // next leg now; when tick() runs and banked>0 we present 'arrive'.
    // Per spec: always play the walk first, then present a fresh arrival.
    journey = startNextLeg(journey, now, get().devFastLegs);

    // If banked arrivals still remain, immediately mark phase 'arrive' again
    // so the user can do another pull — but only after the walk animation
    // completes (closePull is called at the end of the walk). So:
    const phase: Phase = journey.bankedArrivals > 0 ? 'arrive' : 'traveling';

    set({ phase, journey, pullDraft: null });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  updateSettings: (patch) => {
    set({ settings: { ...get().settings, ...patch } });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  devForceArrival: () => {
    const state = get();
    if (!state.onboarded) return;
    const now = Date.now();
    const journey = {
      ...state.journey,
      bankedArrivals: Math.min(MAX_BANKED_ARRIVALS, state.journey.bankedArrivals + 1),
      dayIndex: state.journey.dayIndex + 1,
      // Complete the current leg so tick sees an arrival.
      arrivalAt: now,
    };
    set({ journey, phase: 'arrive' });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  devToggleFastLegs: (on) => {
    const state = get();
    const now = Date.now();
    const duration = on ? DEV_LEG_MS : legDurationMs(state.journey.isPlus, false);
    const journey = {
      ...state.journey,
      legStartedAt: now,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(now, duration),
    };
    set({ devFastLegs: on, journey });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  devForceDaypart: (part) => {
    // Delegates to the time module's override singleton.
    // Imported lazily to avoid a hard dependency cycle.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const time = require('@/src/core/time') as typeof import('@/src/core/time');
    time.DEV_DAYPART_OVERRIDE.current = part;
  },
}));

/** Extract just the persisted AppState slice from the store. */
function getAppState(s: StoreState): AppState {
  return {
    phase: s.phase,
    onboarded: s.onboarded,
    journey: s.journey,
    chronicle: s.chronicle,
    mirror: s.mirror,
    settings: s.settings,
    schemaVersion: s.schemaVersion,
  };
}

/** Convenience selector helpers (pure, no React). */
export function selectWalkProgress(s: StoreState): number {
  return walkProgress(s.journey, Date.now());
}

export function selectDaypart(s: StoreState): Daypart {
  return daypartFromTimestamp(Date.now());
}

export function selectCurrentWaymark(s: StoreState) {
  return waymarkAt(s.journey.waymarkIndex);
}

export function selectCharacterAccent(s: StoreState): string {
  return getCharacter(s.journey.characterId)?.accentHex ?? '#8B7355';
}

export { ASPECT_IDS, getWaymark };
