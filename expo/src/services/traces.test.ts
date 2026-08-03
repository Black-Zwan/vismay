import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearTraceSessionCache,
  readRecentTraces,
  setTraceFetchImplementation,
  setTraceNetworkEnabled,
  writeTrace,
} from './traces';

const payload = {
  leg_id: 3,
  day_index: 4,
  hour_bucket: 19,
  sign: 9,
  lens: 0,
  card: 1,
};

describe('trace REST boundary', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    setTraceNetworkEnabled(true);
    clearTraceSessionCache();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    setTraceNetworkEnabled(true);
    setTraceFetchImplementation(fetch);
  });

  it('writes only the six enum integers plus database routing fields', async () => {
    let body: Record<string, unknown> | undefined;
    setTraceFetchImplementation(async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(null, { status: 201 });
    });
    await writeTrace('pinelands:shrine:3', payload);
    expect(body).toEqual({
      bucket_key: 'pinelands:shrine:3',
      kind: 'trace',
      payload,
    });
    expect(Object.keys(body?.payload as object).sort()).toEqual(
      ['card', 'day_index', 'hour_bucket', 'leg_id', 'lens', 'sign'],
    );
  });

  it('performs one read per literal bucket and caches it for the session', async () => {
    let calls = 0;
    setTraceFetchImplementation(async () => {
      calls += 1;
      return Response.json([{
        bucket_key: 'pinelands:shrine:3',
        kind: 'trace',
        payload,
        created_at: new Date().toISOString(),
      }]);
    });
    expect(await readRecentTraces('pinelands:shrine:3')).toHaveLength(1);
    expect(await readRecentTraces('pinelands:shrine:3')).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it('returns an empty road without making a request when network is disabled', async () => {
    let called = false;
    setTraceFetchImplementation(async () => {
      called = true;
      return Response.json([]);
    });
    setTraceNetworkEnabled(false);
    expect(await readRecentTraces('pinelands:shrine:3')).toEqual([]);
    expect(called).toBe(false);
  });

  it('caches a failed read as a quiet leg instead of retrying live', async () => {
    let calls = 0;
    setTraceFetchImplementation(async () => {
      calls += 1;
      throw new Error('offline');
    });
    expect(await readRecentTraces('pinelands:shrine:3')).toEqual([]);
    expect(await readRecentTraces('pinelands:shrine:3')).toEqual([]);
    expect(calls).toBe(1);
  });
});
