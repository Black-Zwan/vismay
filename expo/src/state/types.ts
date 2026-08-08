/**
 * Central state types. No platform imports.
 */

import type { BiomeId, WorldPlace } from '@/src/world/types';

export type Phase =
  | 'traveling' // walking between landmarks, no pull available
  | 'arrive' // arrived, pull available
  | 'question' // choosing a topic
  | 'draw' // deck on screen
  | 'reveal' // card turning
  | 'reading' // passage shown
  | 'walk' // departure animation
  | 'done'; // closing summary

export interface JourneyState {
  characterId: string;
  signId: string;
  dayIndex: number;
  waymarkIndex: number;
  legStartedAt: number; // epoch ms
  legDurationMs: number;
  arrivalAt: number; // epoch ms
  bankedArrivals: number; // 0..5
  stepsWalked: number;
  isPlus: boolean;
  seed: number; // uint32, rolled once when this leg begins
  biome: BiomeId;
  previousBiome: BiomeId;
  place: WorldPlace;
  arrivalsSinceRare: number;
}

export interface ChronicleEntry {
  id: string;
  dayIndex: number;
  waymarkId: string;
  cardId: string;
  lensId: string;
  openerText: string;
  answerText: string;
  departText: string;
  curioIds: string[];
  createdAt: number;
  placeName?: string;
  bucketKey?: string;
  horoscopeText?: string;
  watchForSignId?: string;
}

export type AspectId =
  | 'tenderness'
  | 'resolve'
  | 'craft'
  | 'sight'
  | 'solitude'
  | 'fortune';

export interface MirrorState {
  aspects: Record<AspectId, number>;
  satchel: string[]; // curio ids
  lensHistory: string[];
  recentPulls: { cardId: string; lensId: string; at: number }[];
}

export interface Settings {
  notifyArrival: boolean;
  notifyWeekly: boolean;
  /** True once the contextual arrival prompt has been shown. */
  arrivalPermissionAsked: boolean;
}

export interface AppState {
  phase: Phase;
  onboarded: boolean;
  journey: JourneyState;
  chronicle: ChronicleEntry[];
  mirror: MirrorState;
  /** Finds waiting to be written into the next completed Chronicle entry. */
  pendingCurioIds: string[];
  raresFound: string[];
  settings: Settings;
  devOffsetMs: number;
  schemaVersion: number;
}

/** Clock-guard metadata persisted alongside AppState (not part of AppState itself). */
export interface ClockGuard {
  lastSeenTimestamp: number;
  monotonicCounter: number;
}

/** Full persisted envelope: state + clock guard + storage metadata. */
export interface PersistedEnvelope {
  state: AppState;
  clockGuard: ClockGuard;
  schemaVersion: number;
}
