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
  AspectId,
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
import {
  ASPECT_IDS,
  emptyAspects,
  rotatingOpenPullSecondary,
  scorePull,
  seedAspectsForElement,
} from '@/src/core/mirror';
import { pickWatchSignId } from '@/src/core/sky';
import { assemblePassage } from '@/src/core/passage';
import {
  DEV_DAYPART_OVERRIDE,
  daypartFromTimestamp,
  now,
  setDevOffset,
} from '@/src/core/time';
import type { Daypart } from '@/src/core/time';
import { makeId } from '@/src/core/ids';
import { findCurio, type CurioRarity } from '@/src/core/curios';
import {
  selectLegCairns,
  type LegCairn,
  type TraceDensity,
  type TracePayload,
} from '@/src/core/traces';
import { DEFAULT_CHARACTER_ID, getCharacter } from '@/src/content/characters';
import { DEFAULT_SIGN_ID, SIGNS, getSign } from '@/src/content/signs';
import { getHoroscopeLine } from '@/src/content/sky';
import { CARDS, getCard, pickCardForPull } from '@/src/content/cards';
import { LENSES, getLens } from '@/src/content/lenses';
import { CURIOS, getCurio } from '@/src/content/curios';
import { ANSWERS, OPENERS } from '@/src/content/passages';
import { getWaymark } from '@/src/content/waymarks';
import {
  clearTraceSessionCache,
  readRecentTraces,
  setTraceNetworkEnabled,
  writeTrace,
} from '@/src/services/traces';
import { BIOME_IDS } from '@/src/world/data';
import {
  biomeForProgress,
  placeFromSeed,
  placeForBucket,
  shouldGuaranteeFirstRare,
  unitFromSeed,
} from '@/src/world/generator';
import type { BiomeId } from '@/src/world/types';

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
  /** Session-only trail observations for the current literal leg bucket. */
  roadCairns: LegCairn[];
  cairnBucketKey: string | null;
  curioNoticeId: string | null;
  traceNetworkEnabled: boolean;
  traceDensity: TraceDensity;

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
  beginDeparture: () => void;
  closePull: () => void;
  loadRoadCairns: () => Promise<void>;
  dismissCurioNotice: () => void;

  // --- settings ---
  updateSettings: (patch: Partial<Settings>) => void;

  // --- dev panel ---
  devForceArrival: () => void;
  devSetTimeOffset: (offsetMs: number) => void;
  devToggleFastLegs: (on: boolean) => void;
  devTogglePlus: (on: boolean) => void;
  devForceDaypart: (part: Daypart | null) => void;
  devForceRare: () => void;
  devRerollSeed: () => void;
  devJumpBiome: () => void;
  devSetWalkProgress: (progress: number) => void;
  devForcePlace: (biome: BiomeId, archetypeId: string) => void;
  devGrantAspect: (aspect: AspectId, points?: number) => void;
  devCycleSign: () => void;
  devFireArrivalNotification: () => void;
  devSpawnCairn: (source: 'real' | 'procedural') => void;
  devToggleTraceNetwork: () => void;
  devCycleTraceDensity: () => void;
  devGrantCurio: (rarity: CurioRarity) => void;
}

function rollLegSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}

/** Build the default initial AppState. */
function defaultAppState(): AppState {
  const timestamp = now();
  const duration = legDurationMs(false, false);
  const seed = 0;
  const place = placeFromSeed(seed, { biome: 'pinelands' });
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
      seed,
      biome: place.biome,
      previousBiome: place.biome,
      place,
      arrivalsSinceRare: place.isRare ? 0 : 1,
    },
    chronicle: [],
    mirror: {
      aspects: emptyAspects(),
      satchel: [],
      lensHistory: [],
      recentPulls: [],
    },
    pendingCurioIds: [],
    raresFound: [],
    settings: {
      notifyArrival: true,
      notifyWeekly: false,
      devMode: false,
      arrivalPermissionAsked: false,
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

export type NotificationPermissionSideEffect = () => Promise<boolean>;
export type ImmediateNotificationSideEffect = (state: AppState) => void;

let permissionSideEffect: NotificationPermissionSideEffect | null = null;
let immediateNotificationSideEffect: ImmediateNotificationSideEffect | null = null;

export function setNotificationPermissionSideEffect(
  fn: NotificationPermissionSideEffect | null,
): void {
  permissionSideEffect = fn;
}

export function setImmediateNotificationSideEffect(
  fn: ImmediateNotificationSideEffect | null,
): void {
  immediateNotificationSideEffect = fn;
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
  roadCairns: [],
  cairnBucketKey: null,
  curioNoticeId: null,
  traceNetworkEnabled: true,
  traceDensity: 'auto',

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
    void get().loadRoadCairns();
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
      roadCairns: [],
      cairnBucketKey: null,
      curioNoticeId: null,
      traceNetworkEnabled: true,
      traceDensity: 'auto',
    });
    setTraceNetworkEnabled(true);
    clearTraceSessionCache();
    runNotifyEffect(get(), get().devFastLegs);
    void persistState(getAppState(get()), get().clockGuard);
  },

  completeOnboarding: (characterId, signId) => {
    const timestamp = now();
    const duration = legDurationMs(get().journey.isPlus, get().devFastLegs);
    const selectedSignId = signId || DEFAULT_SIGN_ID;
    const seed = rollLegSeed();
    const place = placeFromSeed(seed, { biome: 'pinelands' });
    const journey = {
      ...get().journey,
      characterId: characterId || DEFAULT_CHARACTER_ID,
      signId: selectedSignId,
      legStartedAt: timestamp,
      legDurationMs: duration,
      arrivalAt: computeArrivalAt(timestamp, duration),
      // The first pull is immediate. The first real-time leg begins only after
      // that reading closes.
      bankedArrivals: 1,
      dayIndex: 0,
      waymarkIndex: 0,
      stepsWalked: 0,
      seed,
      biome: place.biome,
      previousBiome: place.biome,
      place,
      arrivalsSinceRare: place.isRare ? 0 : 1,
    };
    set({
      onboarded: true,
      phase: 'arrive',
      journey,
      mirror: defaultMirror(selectedSignId),
      pendingCurioIds: [],
      raresFound: [],
      roadCairns: [],
      cairnBucketKey: null,
      curioNoticeId: null,
    });
    void get().loadRoadCairns();
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

    const discoveredRare = updated.bankedArrivals > 0
      ? addRare(state.raresFound, state.journey.place.rareId)
      : state.raresFound;
    const foundCurioId = newlyBanked > 0
      ? findCurio({
        seed: state.journey.seed,
        dayIndex: state.journey.dayIndex,
        isRarePlace: state.journey.place.isRare,
        ownedIds: state.mirror.satchel,
        candidates: CURIOS,
      })
      : null;
    set({
      journey: { ...updated, stepsWalked: steps },
      phase,
      raresFound: discoveredRare,
      ...(foundCurioId ? {
        mirror: {
          ...state.mirror,
          satchel: [...state.mirror.satchel, foundCurioId],
        },
        pendingCurioIds: [...state.pendingCurioIds, foundCurioId],
        curioNoticeId: foundCurioId,
      } : {}),
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
    set({
      phase: 'question',
      pullDraft: null,
      raresFound: addRare(state.raresFound, state.journey.place.rareId),
    });
  },

  chooseLens: (lensId) => {
    const state = get();
    if (state.phase !== 'question') return;
    const lens = getLens(lensId);
    if (!lens) return;
    const card = pickCardForPull(unitFromSeed(state.journey.seed, 0xca4d));
    const place = state.journey.place;
    const openerText = `${place.name} — ${lens.label}`;
    const answerText = card.readings[lensId] ?? '';
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
    set({ phase: 'done' });
    void persistState(getAppState(get()), get().clockGuard);
  },

  beginDeparture: () => {
    const state = get();
    if (state.phase !== 'done' || !state.pullDraft) return;
    set({ phase: 'walk' });
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

    const place = state.journey.place;
    const entryDay = state.journey.dayIndex + 1;
    const templateIndex = state.journey.dayIndex;
    const passage = assemblePassage(
      OPENERS[templateIndex % OPENERS.length],
      ANSWERS[templateIndex % ANSWERS.length],
      {
        day: entryDay,
        place: place.name,
        epigraph: card.epigraph,
      },
    );
    const sky = resolveDailySky(state.journey);
    const entry: ChronicleEntry = {
      id: makeId('entry'),
      dayIndex: entryDay,
      waymarkId: place.bucketKey,
      cardId: card.id,
      lensId: lens.id,
      openerText: passage.openerText,
      answerText: passage.answerText,
      departText: place.departText,
      curioIds: state.pendingCurioIds,
      createdAt: timestamp,
      placeName: place.name,
      bucketKey: place.bucketKey,
      horoscopeText: sky.horoscopeText,
      watchForSignId: sky.watchForSignId,
    };
    const recentPulls = [
      { cardId: card.id, lensId: lens.id, at: timestamp },
      ...state.mirror.recentPulls,
    ].slice(0, 10);
    const secondaryAspect = lens.id === 'lens_open'
      ? rotatingOpenPullSecondary(state.mirror.lensHistory.length)
      : undefined;
    const roadAspect = roadMarkForPull(state.journey.seed, state.journey.dayIndex);
    const aspects = scorePull(state.mirror.aspects, lens, card, {
      secondaryAspect,
      roadAspect,
    });

    // Consume a banked arrival for this pull.
    let journey = consumeBankedArrival(state.journey);

    const nextPlaceIndex = journey.waymarkIndex + 1;
    const seed = rollLegSeed();
    const forceFirstRare = shouldGuaranteeFirstRare(
      state.raresFound.length > 0,
      nextPlaceIndex,
    );
    const nextPlace = placeFromSeed(seed, {
      currentBiome: journey.biome,
      forceRare: forceFirstRare,
      arrivalsSinceRare: journey.arrivalsSinceRare,
    });

    // Advance to the next generated place. waymarkIndex remains as the
    // persisted arrival counter for migration compatibility; it no longer
    // indexes a fixed content sequence.
    journey = {
      ...journey,
      dayIndex: journey.dayIndex + 1,
      waymarkIndex: nextPlaceIndex,
      seed,
      previousBiome: journey.biome,
      biome: nextPlace.biome,
      place: nextPlace,
      arrivalsSinceRare: nextPlace.isRare ? 0 : journey.arrivalsSinceRare + 1,
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

    const shouldRequestArrivalPermission = state.chronicle.length === 0
      && state.settings.notifyArrival
      && !state.settings.arrivalPermissionAsked;

    const tracePayload = tracePayloadForPull(state.journey, lens.id, card.id, timestamp);
    void writeTrace(place.bucketKey, tracePayload);

    set({
      phase,
      journey,
      pullDraft: null,
      chronicle: [entry, ...state.chronicle],
      mirror: {
        ...state.mirror,
        aspects,
        lensHistory: [lens.id, ...state.mirror.lensHistory],
        recentPulls,
      },
      pendingCurioIds: [],
      settings: shouldRequestArrivalPermission
        ? { ...state.settings, arrivalPermissionAsked: true }
        : state.settings,
    });
    if (shouldRequestArrivalPermission && permissionSideEffect) {
      void permissionSideEffect()
        .catch(() => false)
        .finally(() => runNotifyEffect(get(), get().devFastLegs));
    } else {
      runNotifyEffect(get(), get().devFastLegs);
    }
    void get().loadRoadCairns();
    void persistState(getAppState(get()), get().clockGuard);
  },

  loadRoadCairns: async () => {
    const state = get();
    if (!state.onboarded) return;
    const bucketKey = state.journey.place.bucketKey;
    const realTraces = state.traceNetworkEnabled
      ? await readRecentTraces(bucketKey)
      : [];
    const latest = get();
    if (latest.journey.place.bucketKey !== bucketKey) return;
    const playerSign = Math.max(0, SIGNS.findIndex((sign) => sign.id === latest.journey.signId));
    const towerIndex = CARDS.findIndex((card) => card.id === 'the_tower');
    const roadCairns = selectLegCairns({
      realTraces,
      seed: latest.journey.seed,
      now: Date.now(),
      legId: latest.journey.waymarkIndex,
      dayIndex: latest.journey.dayIndex,
      playerSign,
      signCount: SIGNS.length,
      lensCount: LENSES.length,
      cardCount: CARDS.length,
      interestingCardIndexes: towerIndex >= 0 ? [towerIndex] : [],
      density: latest.traceDensity,
    });
    set({ roadCairns, cairnBucketKey: bucketKey });
  },

  dismissCurioNotice: () => set({ curioNoticeId: null }),

  updateSettings: (patch) => {
    const state = get();
    const shouldRequestArrivalPermission = patch.notifyArrival === true
      && state.chronicle.length > 0
      && !state.settings.arrivalPermissionAsked;
    const settings = {
      ...state.settings,
      ...patch,
      arrivalPermissionAsked: shouldRequestArrivalPermission
        ? true
        : state.settings.arrivalPermissionAsked,
    };
    const devOffsetMs = settings.devMode ? get().devOffsetMs : 0;
    if (!settings.devMode) setDevOffset(0);
    set({ settings, devOffsetMs });
    if (shouldRequestArrivalPermission && permissionSideEffect) {
      void permissionSideEffect()
        .catch(() => false)
        .finally(() => runNotifyEffect(get(), get().devFastLegs));
    } else {
      runNotifyEffect(get(), get().devFastLegs);
    }
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
    set({
      journey,
      phase: 'arrive',
      raresFound: addRare(state.raresFound, state.journey.place.rareId),
    });
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

  devForceRare: () => {
    const state = get();
    const place = placeFromSeed(state.journey.seed, {
      biome: state.journey.biome,
      forceRare: true,
    });
    set({ journey: { ...state.journey, place, arrivalsSinceRare: 0 } });
    void persistState(getAppState(get()), get().clockGuard);
  },

  devRerollSeed: () => {
    const state = get();
    const seed = rollLegSeed();
    const place = placeFromSeed(seed, {
      currentBiome: state.journey.biome,
      arrivalsSinceRare: state.journey.arrivalsSinceRare,
    });
    set({
      journey: {
        ...state.journey,
        seed,
        previousBiome: place.biome,
        biome: place.biome,
        place,
        arrivalsSinceRare: place.isRare ? 0 : state.journey.arrivalsSinceRare + 1,
      },
    });
    void persistState(getAppState(get()), get().clockGuard);
  },

  devJumpBiome: () => {
    const state = get();
    const currentIndex = BIOME_IDS.indexOf(state.journey.biome);
    const biome = BIOME_IDS[(currentIndex + 1) % BIOME_IDS.length];
    const place = placeFromSeed(state.journey.seed, { biome });
    set({
      journey: {
        ...state.journey,
        previousBiome: biome,
        biome,
        place,
      },
    });
    void persistState(getAppState(get()), get().clockGuard);
  },

  devSetWalkProgress: (progress) => {
    const state = get();
    if (!state.settings.devMode || !state.onboarded) return;
    const bounded = Math.max(0, Math.min(1, progress));
    const timestamp = now();
    const duration = state.journey.legDurationMs;
    const legStartedAt = timestamp - duration * bounded;
    const arrived = bounded >= 1;
    const journey = {
      ...state.journey,
      legStartedAt,
      arrivalAt: legStartedAt + duration,
      bankedArrivals: arrived
        ? Math.max(1, state.journey.bankedArrivals)
        : 0,
    };
    set({ journey, phase: arrived ? 'arrive' : 'traveling' });
    void persistState(getAppState(get()), get().clockGuard);
  },

  devForcePlace: (biome, archetypeId) => {
    const state = get();
    if (!state.settings.devMode) return;
    const place = placeForBucket(state.journey.seed, biome, archetypeId);
    if (!place) return;
    set({
      journey: {
        ...state.journey,
        previousBiome: biome,
        biome,
        place,
      },
    });
    void persistState(getAppState(get()), get().clockGuard);
  },

  devGrantAspect: (aspect, points = 1) => {
    const state = get();
    if (!state.settings.devMode || !ASPECT_IDS.includes(aspect)) return;
    const amount = Math.max(1, Math.floor(points));
    set({
      mirror: {
        ...state.mirror,
        aspects: {
          ...state.mirror.aspects,
          [aspect]: state.mirror.aspects[aspect] + amount,
        },
      },
    });
    void persistState(getAppState(get()), get().clockGuard);
  },

  devCycleSign: () => {
    const state = get();
    if (!state.settings.devMode) return;
    const currentIndex = SIGNS.findIndex((sign) => sign.id === state.journey.signId);
    const signId = SIGNS[(currentIndex + 1 + SIGNS.length) % SIGNS.length].id;
    set({ journey: { ...state.journey, signId } });
    void persistState(getAppState(get()), get().clockGuard);
  },

  devFireArrivalNotification: () => {
    const state = get();
    if (!state.settings.devMode || !immediateNotificationSideEffect) return;
    try {
      immediateNotificationSideEffect(getAppState(state));
    } catch {
      // Notification QA is best-effort and must not affect app state.
    }
  },

  devSpawnCairn: (source) => {
    const state = get();
    if (!state.settings.devMode) return;
    const createdAt = source === 'real'
      ? Date.now() - 4 * 60 * 60 * 1_000
      : Date.now() - 3 * 24 * 60 * 60 * 1_000;
    const trace: LegCairn = {
      id: makeId(`cairn_${source}`),
      source,
      createdAt,
      position: 0.52,
      payload: {
        leg_id: Math.max(0, Math.min(9_999, state.journey.waymarkIndex)),
        day_index: Math.max(0, state.journey.dayIndex),
        hour_bucket: new Date(createdAt).getHours(),
        sign: Math.max(0, SIGNS.findIndex((sign) => sign.id === state.journey.signId)),
        lens: 0,
        card: Math.max(0, CARDS.findIndex((card) => card.id === 'the_tower')),
      },
    };
    set({ roadCairns: [trace, ...state.roadCairns].slice(0, 3) });
  },

  devToggleTraceNetwork: () => {
    const enabled = !get().traceNetworkEnabled;
    setTraceNetworkEnabled(enabled);
    set({ traceNetworkEnabled: enabled });
    void get().loadRoadCairns();
  },

  devCycleTraceDensity: () => {
    const current = get().traceDensity;
    const density: TraceDensity = current === 'auto' ? 'low' : current === 'low' ? 'high' : 'auto';
    set({ traceDensity: density });
    clearTraceSessionCache();
    void get().loadRoadCairns();
  },

  devGrantCurio: (rarity) => {
    const state = get();
    if (!state.settings.devMode) return;
    const id = findCurio({
      seed: rollLegSeed(),
      dayIndex: state.journey.dayIndex,
      isRarePlace: false,
      ownedIds: state.mirror.satchel,
      candidates: CURIOS,
      forceRarity: rarity,
    });
    if (!id || !getCurio(id)) return;
    set({
      mirror: { ...state.mirror, satchel: [...state.mirror.satchel, id] },
      pendingCurioIds: [...state.pendingCurioIds, id],
      curioNoticeId: id,
    });
    void persistState(getAppState(get()), get().clockGuard);
  },
}));

function addRare(raresFound: string[], rareId: string | null): string[] {
  if (!rareId || raresFound.includes(rareId)) return raresFound;
  return [...raresFound, rareId];
}

/** Extract just the persisted AppState slice from the store. */
function getAppState(s: StoreState): AppState {
  return {
    phase: s.phase,
    onboarded: s.onboarded,
    journey: s.journey,
    chronicle: s.chronicle,
    mirror: s.mirror,
    pendingCurioIds: s.pendingCurioIds,
    raresFound: s.raresFound,
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

export function selectCurrentPlace(s: StoreState) {
  return s.journey.place;
}

export function selectRenderedBiome(journey: JourneyState, timestamp: number): BiomeId {
  return biomeForProgress(
    journey.previousBiome,
    journey.biome,
    walkProgress(journey, timestamp),
  );
}

export function selectCharacterAccent(s: StoreState): string {
  return getCharacter(s.journey.characterId)?.accentHex ?? '#8B7355';
}

export function resolveDailySky(journey: JourneyState): {
  horoscopeText?: string;
  watchForSignId?: string;
} {
  return {
    horoscopeText: getHoroscopeLine(
      journey.signId,
      unitFromSeed(journey.seed, 0x5a71 + journey.dayIndex),
    ),
    watchForSignId: pickWatchSignId(
      journey.signId,
      SIGNS.map((sign) => sign.id),
      unitFromSeed(journey.seed, 0xa4e4d + journey.dayIndex),
    ),
  };
}

function roadMarkForPull(seed: number, dayIndex: number): AspectId | undefined {
  if (unitFromSeed(seed, 0x704d + dayIndex) >= 0.125) return undefined;
  return ASPECT_IDS[Math.floor(unitFromSeed(seed, 0x4a2b + dayIndex) * ASPECT_IDS.length)];
}

function tracePayloadForPull(
  journey: JourneyState,
  lensId: string,
  cardId: string,
  timestamp: number,
): TracePayload {
  return {
    leg_id: Math.max(0, Math.min(9_999, Math.floor(journey.waymarkIndex))),
    day_index: Math.max(0, Math.min(99_999, Math.floor(journey.dayIndex + 1))),
    hour_bucket: new Date(timestamp).getHours(),
    sign: Math.max(0, SIGNS.findIndex((sign) => sign.id === journey.signId)),
    lens: Math.max(0, LENSES.findIndex((lens) => lens.id === lensId)),
    card: Math.max(0, CARDS.findIndex((card) => card.id === cardId)),
  };
}

export { ASPECT_IDS, getWaymark };
