# 05 · Supabase (Traces)

## Seeded-world cairn seam

Work Order 5 defines the shared-world bucket shape below. Work Order 8 connects the `trace` kind. `bucket_key` is resolved and stored at write time; it is never regenerated from a seed during a read.

```sql
create table cairns (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  kind text not null,
  payload jsonb,
  created_at timestamptz default now()
);
create index on cairns (bucket_key, created_at desc);
```

The reconciled schema keeps WO5's literal bucket routing and stores WO8's exact six-integer tuple in `payload`. The complete executable migration, including RLS, lives at `expo/supabase/migrations/202608030001_traces.sql`.

## What it's for

Wayside cairns — anonymous traces of other players along a walk leg.

> *A cairn, recently stacked.*
> *Four hours ago, a Capricorn passed this way. They asked of love, and the road answered with The Moon.*

Tap to read, dismiss. No reply, no rating, no identity. This is the entire social surface at launch.

## Scope

One table. No auth, no user table, no storage buckets, no realtime, no edge functions. If a task seems to need any of those, it is out of scope — check with the owner.

```sql
insert into cairns (bucket_key, kind, payload)
values (
  'pinelands:shrine:3',
  'trace',
  '{"leg_id":3,"day_index":4,"hour_bucket":19,"sign":9,"lens":0,"card":1}'::jsonb
);
```

Every field is an enum index. **The database can only ever contain combinations of things we wrote.** No free text exists anywhere in the payload, so there is nothing to moderate and nothing off-brand can ever appear on the road. The reading prose never leaves the device — the lens is shared, the writing is private, permanently.

## RLS

The anon key is public by design. **The insert policy is the only security boundary**, so it has to be exactly right.

```sql
alter table cairns enable row level security;

create policy cairns_anon_trace_insert on cairns
  for insert to anon
  with check (
    kind = 'trace' and
    bucket_key ~ '^[a-z0-9_-]+:[a-z0-9_-]+:[0-9]+$' and
    is_valid_trace_payload(payload)
  );

create policy cairns_anon_trace_select on cairns
  for select to anon
  using (
    kind = 'trace' and
    created_at > now() - interval '48 hours' and
    is_valid_trace_payload(payload)
  );
```

**No update policy. No delete policy.** Their absence is the protection — do not add them "for completeness."

## Client

`src/services/traces.ts`. Plain REST with the anon key from an environment variable. Two functions:

```ts
writeTrace(bucketKey: string, payload: TracePayload): Promise<void>
readRecentTraces(bucketKey: string): Promise<TraceObservation[]> // limit 12
```

- One insert per completed pull, fire-and-forget
- One select per walk-leg start, cached for the session
- **Both must fail silently and return empty on any error.** No loading state, no error banner, no retry, no toast
- Configure with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Without both values, the network path remains off and the procedural floor is the complete experience.

The app has zero hard network dependencies. A failed fetch is indistinguishable from a quiet night on the road, and that is the design.

## The procedural floor

Whenever real trace density is low — launch week, quiet regions, offline, backend down — deterministic procedural traces fill in.

**Procedural traces are always dated old** (*"days ago," "some time past"*). Fresh traces (*"four hours ago"*) are always real. Two consequences, both load-bearing:

1. The road never feels dead and never exposes a network failure.
2. **Privacy through ambiguity.** At small scale a specific trace could conceivably identify a player who posts publicly. Because procedural traces are blended in, no individual cairn is ever provably a real person. The fiction provides the anonymity set.

This is not a nicety. Build the procedural floor *before* wiring the network, and the network becomes an enhancement rather than a dependency.

## Rules of the trail

- **Density cap: 2–3 cairns per leg.** Bias toward interesting combinations — Tower pulls, sign-matches with the player's own sign. Surplus real data is silently dropped. Scarcity is what makes tapping one feel like finding something.
- **Fuzzy time only.** Hour-resolution buckets in the payload; prose out — *recently, in the night, two days past, four hours ago*. Never clock times.
- **No counts as metrics.** *"Travelers passed in the night,"* never "3 users were here."
- **No live presence. No identity continuity.** A stranger can never be followed, found, or recognized twice.

That last one is a hard architectural line. The moment two players can identify each other, this becomes a social platform with moderation obligations, an abuse surface, and a legal posture. As long as traces are anonymous tuples rendered as prose, it is weather.

## Operations

Free tier suffices to tens of thousands of DAU at this workload. Note the free tier pauses inactive projects during development — move to Pro (~$25/mo) near launch.

No dashboards to watch, no moderation queue, no support burden. That is the point.

## Post-launch: the coincidence engine

The morning horoscope says *watch for a Capricorn today*; a cairn on today's leg carries a Capricorn's trace. The app notices: *"The road keeps its appointments."*

A string comparison, and the screenshot moment of the whole system. Free to build once traces exist. Banked for the first content update.
