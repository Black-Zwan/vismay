import {
  isTracePayload,
  type TraceObservation,
  type TracePayload,
} from '@/src/core/traces';

interface TraceRow {
  bucket_key: string;
  kind: 'trace';
  payload: unknown;
  created_at: string;
}

type FetchLike = typeof fetch;

const cache = new Map<string, TraceObservation[]>();
let networkEnabled = true;
let fetchImplementation: FetchLike = fetch;

function configuration(): { url: string; key: string } | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function writeTrace(bucketKey: string, payload: TracePayload): Promise<void> {
  const config = configuration();
  if (!networkEnabled || !config || !validBucketKey(bucketKey) || !isTracePayload(payload)) return;
  try {
    const response = await fetchImplementation(`${config.url}/rest/v1/cairns`, {
      method: 'POST',
      headers: headers(config.key, true),
      body: JSON.stringify({ bucket_key: bucketKey, kind: 'trace', payload }),
    });
    if (!response.ok) return;
    cache.delete(bucketKey);
  } catch {
    // A network failure is a quiet road. Never surface it to the player.
  }
}

/** One cached read per literal leg bucket, never a subscription. */
export async function readRecentTraces(bucketKey: string): Promise<TraceObservation[]> {
  const cached = cache.get(bucketKey);
  if (cached) return cached;
  const config = configuration();
  if (!networkEnabled || !config || !validBucketKey(bucketKey)) return [];

  const since = new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString();
  const query = new URLSearchParams({
    select: 'bucket_key,kind,payload,created_at',
    bucket_key: `eq.${bucketKey}`,
    kind: 'eq.trace',
    created_at: `gte.${since}`,
    order: 'created_at.desc',
    limit: '12',
  });
  try {
    const response = await fetchImplementation(`${config.url}/rest/v1/cairns?${query}`, {
      headers: headers(config.key, false),
    });
    if (!response.ok) {
      cache.set(bucketKey, []);
      return [];
    }
    const rows = await response.json() as TraceRow[];
    const observations = rows.flatMap((row): TraceObservation[] => {
      const createdAt = Date.parse(row.created_at);
      return row.kind === 'trace'
        && row.bucket_key === bucketKey
        && isTracePayload(row.payload)
        && Number.isFinite(createdAt)
        ? [{ payload: row.payload, createdAt, source: 'real' }]
        : [];
    });
    cache.set(bucketKey, observations);
    return observations;
  } catch {
    cache.set(bucketKey, []);
    return [];
  }
}

export function setTraceNetworkEnabled(enabled: boolean): void {
  networkEnabled = enabled;
  cache.clear();
}

export function isTraceNetworkEnabled(): boolean {
  return networkEnabled;
}

export function clearTraceSessionCache(): void {
  cache.clear();
}

/** Test seam; production always uses the platform fetch implementation. */
export function setTraceFetchImplementation(implementation: FetchLike): void {
  fetchImplementation = implementation;
  cache.clear();
}

function headers(key: string, write: boolean): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    ...(write ? { 'Content-Type': 'application/json', Prefer: 'return=minimal' } : {}),
  };
}

function validBucketKey(value: string): boolean {
  return /^[a-z0-9_-]+:[a-z0-9_-]+:\d+$/.test(value);
}
