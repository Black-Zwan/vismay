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
  ChronicleEntry,
  ClockGuard,
  JourneyState,
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
import { ASPECT_IDS, emptyAspects, scorePull, seedAspectsForElement } from '@/src/core/mirror';
import { assemblePassage } from '@/src/core/passage';
import {
  DEV_DAYPART_OVERRIDE,
  daypartFromTimestamp,
  now,
  setDevOffset,
} from '@/src/core/time';
import type { Daypart } from '@/src/core/time';
import { makeId } from '@/src/core/ids';
import { DEFAULT_CHARACTER_ID, getCharacter } from '@/src/content/characters';
import { DEFAULT_SIGN_ID, getSign } from '@/src/content/signs';
import { getCard, pickCardForPull } from '@/src/content/cards';
import { getLens } from '@/src/content/lenses';
import { ANSWERS, OPENERS } from '@/src/content/passages';
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
  devSetTimeOffset: (offsetMs: number) => void;
  devToggleFastLegs: (on: boolean) => void;
  devTogglePlus: (on: boolean) => void;
  devForceDaypart: (part: Daypart | null) => void;
}

/** Build the default initial AppState. */
function defaultAppState(): AppState {
  const timestamp = now();
  const duration = legDurationMs(false, false);
  return {
    phase: 'traveling',
    onboarded: false,
    journey: {
      characterId: DEFAULT_CHARACTER_ID,
      signId: DEFAULT_SIGN_ID,
      dayIndex: 0,
      waymarkIndex: 0,
      legStartedAt: timestamp,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(timestamp, duration),
      bankedArrivals: 0,
      stepsWalked: 0,
      isPlus: false,
    },
    chronicle: [],
    mirror: {
      aspects: emptyAspects(),
      satchel: [],
      lensHistory: [],
      recentPulls: [],
    },
    settings: {
      notifyArrival: true,
      notifyWeekly: false,
      devMode: false,
    },
    devOffsetMs: 0,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function defaultMirror(signId?: string): MirrorState {
  const sign = signId ? getSign(signId) : undefined;
  return {
    aspects: sign ? seedAspectsForElement(sign.element) : emptyAspects(),
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
  clockGuard: { lastSeenTimestamp: now(), monotonicCounter: 0 },
  hydrated: false,
  devFastLegs: false,
  pullDraft: null,

  hydrate: async () => {
    const envelope = await loadPersistedState();
    if (!envelope) {
      setDevOffset(0);
      set({ hydrated: true });
      return;
    }
    const restoredOffset = envelope.state.settings.devMode
      ? envelope.state.devOffsetMs
      : 0;
    setDevOffset(restoredOffset);
    set({
      ...envelope.state,
      devOffsetMs: restoredOffset,
      clockGuard: envelope.clockGuard,
      hydrated: true,
    });
    // Credit any arrivals that completed while the app was closed.
    get().tick();
  },

  resetAll: async () => {
    await clearPersistedState();
    setDevOffset(0);
    const fresh = defaultAppState();
    set({
      ...fresh,
      clockGuard: { lastSeenTimestamp: now(), monotonicCounter: 0 },
      hydrated: true,
      devFastLegs: false,
      pullDraft: null,
    });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  completeOnboarding: (characterId, signId) => {
    const timestamp = now();
    const duration = legDurationMs(get().journey.isPlus, get().devFastLegs);
    const selectedSignId = signId || DEFAULT_SIGN_ID;
    const journey = {
      ...get().journey,
      characterId: characterId || DEFAULT_CHARACTER_ID,
      signId: selectedSignId,
      legStartedAt: timestamp,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(timestamp, duration),
      bankedArrivals: 0,
      dayIndex: 0,
      waymarkIndex: 0,
      stepsWalked: 0,
    };
    set({
      onboarded: true,
      phase: 'traveling',
      journey,
      mirror: defaultMirror(selectedSignId),
    });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  tick: (nowInput) => {
    const timestamp = nowInput ?? now();
    const state = get();
    if (!state.onboarded) {
      // Still update clock guard even before onboarding.
      set({
        clockGuard: {
          lastSeenTimestamp: timestamp,
          monotonicCounter: state.clockGuard.monotonicCounter + 1,
        },
      });
      return;
    }

    const { journey: updated, newlyBanked } = creditArrivals(
      state.journey,
      timestamp,
      state.devFastLegs,
    );

    // Update steps walked from current leg progress.
    const steps = state.journey.stepsWalked + 0; // steps are per-leg-derived in UI

    const phase: Phase =
      updated.bankedArrivals > 0
        ? 'arrive'
        : isLegComplete(updated, timestamp)
          ? 'arrive'
          : state.phase === 'arrive'
            ? 'arrive'
            : 'traveling';

    set({
      journey: { ...updated, stepsWalked: steps },
      phase,
      clockGuard: {
        lastSeenTimestamp: timestamp,
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
    set({ phase: 'walk' });
    void persistState(getAppState(get()), get().clockGuard);
  },

  closePull: () => {
    const state = get();
    if (state.phase !== 'walk' && state.phase !== 'done') return;
    if (!state.pullDraft) return;
    const timestamp = now();
    const draft = state.pullDraft;
    const lens = getLens(draft.lensId);
    const card = getCard(draft.cardId);
    if (!lens || !card) {
      set({ phase: 'arrive' });
      return;
    }

    const wm = waymarkAt(state.journey.waymarkIndex);
    const entryDay = state.journey.dayIndex + 1;
    const templateIndex = state.journey.dayIndex;
    const passage = assemblePassage(
      OPENERS[templateIndex % OPENERS.length],
      ANSWERS[templateIndex % ANSWERS.length],
      {
        day: entryDay,
        place: wm.name,
        epigraph: card.epigraph,
      },
    );
    const entry: ChronicleEntry = {
      id: makeId('entry'),
      dayIndex: entryDay,
      waymarkId: wm.id,
      cardId: card.id,
      lensId: lens.id,
      openerText: passage.openerText,
      answerText: passage.answerText,
      departText: wm.departText,
      curioIds: [],
      createdAt: timestamp,
    };
    const recentPulls = [
      { cardId: card.id, lensId: lens.id, at: timestamp },
      ...state.mirror.recentPulls,
    ].slice(0, 10);
    const aspects = scorePull(state.mirror.aspects, lens, card);

    // Consume a banked arrival for this pull.
    let journey = consumeBankedArrival(state.journey);

    // Advance to the next waymark.
    journey = {
      ...journey,
      dayIndex: journey.dayIndex + 1,
      waymarkIndex: nextWaymarkIndex(journey.waymarkIndex),
    };

    // If more banked arrivals remain, start a leg but it will resolve to an
    // arrival presentation after the walk animation — i.e. we still start the
    // next leg now; when tick() runs and banked>0 we present 'arrive'.
    // Per spec: always play the walk first, then present a fresh arrival.
    journey = startNextLeg(journey, timestamp, get().devFastLegs);

    // If banked arrivals still remain, immediately mark phase 'arrive' again
    // so the user can do another pull — but only after the walk animation
    // completes (closePull is called at the end of the walk). So:
    const phase: Phase = journey.bankedArrivals > 0 ? 'arrive' : 'traveling';

    set({
      phase,
      journey,
      pullDraft: null,
      chronicle: [entry, ...state.chronicle],
      mirror: {
        ...state.mirror,
        aspects,
        lensHistory: [lens.id, ...state.mirror.lensHistory].slice(0, 30),
        recentPulls,
      },
    });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    const devOffsetMs = settings.devMode ? get().devOffsetMs : 0;
    if (!settings.devMode) setDevOffset(0);
    set({ settings, devOffsetMs });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  devForceArrival: () => {
    const state = get();
    if (!state.onboarded) return;
    const timestamp = now();
    const journey = {
      ...state.journey,
      bankedArrivals: Math.min(MAX_BANKED_ARRIVALS, state.journey.bankedArrivals + 1),
      legStartedAt: timestamp - state.journey.legDurationMs,
      arrivalAt: timestamp,
    };
    set({ journey, phase: 'arrive' });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  devSetTimeOffset: (offsetMs) => {
    const state = get();
    if (!state.settings.devMode) return;
    const minOffset = -24 * 60 * 60 * 1000;
    const maxOffset = 48 * 60 * 60 * 1000;
    const boundedOffset = Math.max(minOffset, Math.min(maxOffset, offsetMs));
    setDevOffset(boundedOffset);
    set({ devOffsetMs: boundedOffset });
    get().tick();
  },

  devToggleFastLegs: (on) => {
    const state = get();
    const timestamp = now();
    const duration = on ? DEV_LEG_MS : legDurationMs(state.journey.isPlus, false);
    const journey = {
      ...state.journey,
      legStartedAt: timestamp,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(timestamp, duration),
    };
    set({ devFastLegs: on, journey });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  devTogglePlus: (on) => {
    const state = get();
    const timestamp = now();
    const duration = legDurationMs(on, state.devFastLegs);
    const journey = {
      ...state.journey,
      isPlus: on,
      legStartedAt: timestamp,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(timestamp, duration),
    };
    set({ journey });
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  devForceDaypart: (part) => {
    DEV_DAYPART_OVERRIDE.current = part;
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
    devOffsetMs: s.settings.devMode ? s.devOffsetMs : 0,
    schemaVersion: s.schemaVersion,
  };
}

/** Convenience selector helpers (pure, no React). */
export function selectWalkProgress(journey: JourneyState, now: number): number {
  return walkProgress(journey, now);
}

export function selectDaypart(now: number): Daypart {
  return daypartFromTimestamp(now);
}

export function selectCurrentWaymark(s: StoreState) {
  return waymarkAt(s.journey.waymarkIndex);
}

export function selectCharacterAccent(s: StoreState): string {
  return getCharacter(s.journey.characterId)?.accentHex ?? '#8B7355';
}

export { ASPECT_IDS, getWaymark };
