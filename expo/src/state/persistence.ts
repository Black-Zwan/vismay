/**
 * Persistence layer. Wraps AsyncStorage behind a small interface so the
 * storage backend can be swapped later without touching the store.
 *
 * Persists the whole AppState under a single versioned key, debounced.
 * Restored on launch with a migration hook keyed on schemaVersion.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, PersistedEnvelope, ClockGuard, ChronicleEntry } from './types';
import {
  authoredCopy,
  authoredPlaceName,
  hashSeed,
  isPendingCopy,
  placeFromSeed,
} from '../world/generator';
import { ARCHETYPES, BIOME_IDS } from '../world/data';

/** Current schema version. Bump when AppState shape changes. */
export const CURRENT_SCHEMA_VERSION = 5;

function storageKey(version: number): string {
  return `vismay_state_v${version}`;
}

const STORAGE_KEY = storageKey(CURRENT_SCHEMA_VERSION);

/**
 * Storage backend interface. Swap implementations without touching the store.
 */
export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Default AsyncStorage-backed implementation. */
const asyncStorageBackend: StorageBackend = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

let backend: StorageBackend = asyncStorageBackend;

/** Swap the storage backend (e.g. for tests or a future encrypted store). */
export function setStorageBackend(b: StorageBackend): void {
  backend = b;
}

/** Debounced write helpers. */
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const WRITE_DEBOUNCE_MS = 400;

function debouncedWrite(value: string): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer);
  }
  return new Promise<void>((resolve, reject) => {
    writeTimer = setTimeout(() => {
      writeTimer = null;
      backend.setItem(STORAGE_KEY, value).then(resolve).catch(reject);
    }, WRITE_DEBOUNCE_MS);
  });
}

/** Persist the AppState + clock guard. Debounced. */
export async function persistState(state: AppState, clockGuard: ClockGuard): Promise<void> {
  const envelope: PersistedEnvelope = {
    state,
    clockGuard,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  await debouncedWrite(JSON.stringify(envelope));
}

/** Force-flush any pending debounced write immediately. */
export async function flushPersistedState(state: AppState, clockGuard: ClockGuard): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  const envelope: PersistedEnvelope = {
    state,
    clockGuard,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  await backend.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

/** Load and migrate persisted state. Returns null if nothing stored. */
export async function loadPersistedState(): Promise<PersistedEnvelope | null> {
  for (let version = CURRENT_SCHEMA_VERSION; version >= 1; version -= 1) {
    const raw = await backend.getItem(storageKey(version));
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as PersistedEnvelope;
      const migrated = migrateEnvelope(parsed);
      if (version !== CURRENT_SCHEMA_VERSION) {
        await backend.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      // Try an older envelope before treating storage as empty.
    }
  }
  return null;
}

/** Wipe persisted state. */
export async function clearPersistedState(): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  await Promise.all(
    Array.from({ length: CURRENT_SCHEMA_VERSION }, (_, index) =>
      backend.removeItem(storageKey(index + 1)),
    ),
  );
}

/**
 * Migration hook keyed on schemaVersion. Add cases as the schema evolves.
 * Returns the envelope brought forward to CURRENT_SCHEMA_VERSION.
 */
function migrateEnvelope(envelope: PersistedEnvelope): PersistedEnvelope {
  let current = envelope;
  if (current.schemaVersion < 2) {
    current = {
      ...current,
      state: {
        ...current.state,
        devOffsetMs: 0,
        schemaVersion: 2,
      },
      schemaVersion: 2,
    };
  }
  if (current.schemaVersion < 3) {
    const legacyJourney = current.state.journey;
    const seed = hashSeed(
      Math.floor(legacyJourney.legStartedAt),
      legacyJourney.dayIndex + legacyJourney.waymarkIndex + 1,
    );
    const biome = BIOME_IDS[
      ((legacyJourney.waymarkIndex % BIOME_IDS.length) + BIOME_IDS.length) % BIOME_IDS.length
    ];
    const place = placeFromSeed(seed, { currentBiome: biome });
    current = {
      ...current,
      state: {
        ...current.state,
        journey: {
          ...legacyJourney,
          seed,
          biome: place.biome,
          previousBiome: place.biome,
          place,
          arrivalsSinceRare: place.isRare ? 0 : 1,
        },
        raresFound: [],
        schemaVersion: 3,
      },
      schemaVersion: 3,
    };
  }
  if (current.schemaVersion < 4) {
    const place = current.state.journey.place;
    const archetype = ARCHETYPES.find((entry) => entry.id === place.archetypeId);
    const safePlaceName = authoredPlaceName(place.name, archetype?.noun ?? 'Waymark');
    current = {
      ...current,
      state: {
        ...current.state,
        journey: {
          ...current.state.journey,
          place: {
            ...place,
            name: safePlaceName,
            departText: authoredCopy(place.departText),
          },
        },
        chronicle: current.state.chronicle.map(sanitizeChronicleEntry),
        settings: {
          ...current.state.settings,
          // v1-v3 asked on launch. Preserve that fact so an upgrader is not
          // prompted a second time; fresh v4 installs use the contextual flow.
          arrivalPermissionAsked: true,
        },
        schemaVersion: 4,
      },
      schemaVersion: 4,
    };
  }
  if (current.schemaVersion < 5) {
    current = {
      ...current,
      state: {
        ...current.state,
        pendingCurioIds: [],
        schemaVersion: 5,
      },
      schemaVersion: 5,
    };
  }
  current = {
    ...current,
    state: { ...current.state, schemaVersion: CURRENT_SCHEMA_VERSION },
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  return current;
}

function sanitizeChronicleEntry(entry: ChronicleEntry): ChronicleEntry {
  const archetypeId = entry.bucketKey?.split(':')[1];
  const archetype = ARCHETYPES.find((candidate) => candidate.id === archetypeId);
  const originalPlaceName = entry.placeName;
  const placeName = originalPlaceName
    ? authoredPlaceName(originalPlaceName, archetype?.noun ?? 'Waymark')
    : originalPlaceName;
  const replacePendingPlace = (text: string): string => {
    if (!originalPlaceName || !isPendingCopy(originalPlaceName)) return text;
    return text.split(originalPlaceName).join(placeName ?? 'Waymark');
  };

  return {
    ...entry,
    ...(originalPlaceName ? { placeName } : {}),
    openerText: replacePendingPlace(entry.openerText),
    answerText: entry.answerText.replace(/TODO:\s*copy|Placeholder reading\.?/gi, '').trim(),
    departText: authoredCopy(entry.departText),
  };
}
