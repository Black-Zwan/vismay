/**
 * Persistence layer. Wraps AsyncStorage behind a small interface so the
 * storage backend can be swapped later without touching the store.
 *
 * Persists the whole AppState under a single versioned key, debounced.
 * Restored on launch with a migration hook keyed on schemaVersion.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, PersistedEnvelope, ClockGuard } from '@/src/state/types';

/** Current schema version. Bump when AppState shape changes. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Storage key (versioned). */
const STORAGE_KEY = `wonder_state_v${CURRENT_SCHEMA_VERSION}`;

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
  const raw = await backend.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedEnvelope;
    return migrateEnvelope(parsed);
  } catch {
    return null;
  }
}

/** Wipe persisted state. */
export async function clearPersistedState(): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  await backend.removeItem(STORAGE_KEY);
}

/**
 * Migration hook keyed on schemaVersion. Add cases as the schema evolves.
 * Returns the envelope brought forward to CURRENT_SCHEMA_VERSION.
 */
function migrateEnvelope(envelope: PersistedEnvelope): PersistedEnvelope {
  let current = envelope;
  // Example future migration:
  // if (current.schemaVersion < 2) {
  //   current = migrateV1ToV2(current);
  // }
  current = { ...current, schemaVersion: CURRENT_SCHEMA_VERSION };
  return current;
}
