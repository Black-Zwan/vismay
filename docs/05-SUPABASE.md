# 05 · Supabase (Traces)

**Not built yet, and deliberately so.** The app must be complete and shippable without it. Build this only after the core loop stands alone.

## What it's for

Wayside cairns — anonymous traces of other players along a walk leg.

> *A cairn, recently stacked.*
> *Four hours ago, a Capricorn passed this way. They asked of love, and the road answered with The Moon.*

Tap to read, dismiss. No reply, no rating, no identity. This is the entire social surface at launch.

## Scope

One table. No auth, no user table, no storage buckets, no realtime, no edge functions. If a task seems to need any of those, it is out of scope — check with the owner.

```sql
create table traces (
  id          bigint generated always as identity primary key,
  leg_id      int         not null,
  day_index   int         not null,
  hour_bucket smallint    not null,
  sign        smallint    not null,
  lens        smallint    not null,
  card        smallint    not null,
  created_at  timestamptz not null default now()
);

create index traces_leg_recent on traces (leg_id, created_at desc);
```

Every field is an enum index. **The database can only ever contain combinations of things we wrote.** No free text exists anywhere in the payload, so there is nothing to moderate and nothing off-brand can ever appear on the road. The reading prose never leaves the device — the lens is shared, the writing is private, permanently.

## RLS

The anon key is public by design. **The insert policy is the only security boundary**, so it has to be exactly right.

```sql
alter table traces enable row level security;

create policy traces_anon_insert on traces
  for insert to anon
  with check (
    leg_id      >= 0  and leg_id      < 10000 and
    day_index   >= 0  and day_index   < 100000 and
    hour_bucket >= 0  and hour_bucket < 24 and
    sign        >= 0  and sign        < 12 and
    lens        >= 0  and lens        < 18 and
    card        >= 0  and card        < 78
  );

create policy traces_anon_recent_select on traces
  for select to anon
  using (created_at > now() - interval '48 hours');
```

**No update policy. No delete policy.** Their absence is the protection — do not add them "for completeness."

## Client

`src/services/traces.ts`. Plain REST with the anon key from an environment variable. Two functions:

```ts
insertTrace(payload: TracePayload): Promise<void>
fetchRecentTraces(legId: number): Promise<TracePayload[]>   // limit 12
```

- One insert per completed pull, fire-and-forget
- One select per walk-leg start, cached for the session
- **Both must fail silently and return empty on any error.** No loading state, no error banner, no retry, no toast

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
