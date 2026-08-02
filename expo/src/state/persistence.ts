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
export const CURRENT_SCHEMA_VERSION = 2;

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
  current = {
    ...current,
    state: { ...current.state, schemaVersion: CURRENT_SCHEMA_VERSION },
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  return current;
}
