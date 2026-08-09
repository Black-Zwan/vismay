# 02 · State Machine

**This document is authoritative.** Where the code disagrees, the code is wrong. `src/core/leg.ts` and `src/core/mirror.ts` currently disagree in specific ways documented in `00-STATE-OF-PLAY.md`; rewrite both from this spec rather than patching them.

---

## The loop

> Pull a card → the world answers → walk on → arrive somewhere new → your story gets longer.

Pulls are gated by **arrival at the next waymark**, not by calendar date. The road is the timer. There is no midnight reset and no streak.

## Phases

```
traveling → arrive → question → draw → reveal → reading → walk → (arrive | traveling)
```

| Phase | Meaning | Exit |
|---|---|---|
| `traveling` | Walking a leg. No pull available. | `tick()` credits an arrival |
| `arrive` | At a waymark, pull available | user begins the pull |
| `question` | Choosing a lens | lens chosen |
| `draw` | Face-down deck on screen | user taps |
| `reveal` | Card turning, world tinting | animation completes |
| `reading` | Passage shown | user dismisses |
| `walk` | Departure animation | `closePull()` |
| `done` | Closing summary panel | `closePull()` |

`traveling` is the resting state. A player who opens the app mid-leg lands here and **must never see an empty screen** — they get the world under the current daypart, the countdown, cairns on this leg, and possibly a curio found.

---

## Leg timing

```ts
FREE_LEG_MS  = 22 * 60 * 60 * 1000   // ~1 arrival/day
PLUS_LEG_MS  =  7 * 60 * 60 * 1000   // ~3-4 arrivals/day
DEV_LEG_MS   = 20 * 1000             // dev panel only
MAX_BANKED   = 5
```

```
legDurationMs(isPlus, devFastLegs) = devFastLegs ? DEV : isPlus ? PLUS : FREE
arrivalAt = legStartedAt + legDurationMs
walkProgress = clamp01((now - legStartedAt) / legDurationMs)
```

These durations are **first guesses** and the single most important tuning knob in the product. Too long and the app feels withholding; too short and the ritual cheapens. The dev panel's fast-legs mode exists precisely so they can be felt on a device.

---

## Crediting arrivals

Called on app open and on foreground, via `tick()`.

**The rule the current code gets wrong:** when a leg completes, the next leg starts at **the moment the previous one finished**, not at `now`. Overshoot carries forward. Otherwise a player gone a week accrues exactly one arrival instead of five, and the entire absence-forgiveness design silently does not exist.

```
creditArrivals(journey, now, devFastLegs):
    newlyBanked = 0

    while now >= journey.arrivalAt and journey.bankedArrivals < MAX_BANKED:
        journey.bankedArrivals += 1
        newlyBanked += 1
        journey.legStartedAt   = journey.arrivalAt          # ← chain, do not reset to now
        journey.legDurationMs  = legDurationMs(journey.isPlus, devFastLegs)
        journey.arrivalAt      = journey.legStartedAt + journey.legDurationMs

    if journey.bankedArrivals >= MAX_BANKED:
        # cap reached: stop accruing, restart the current leg from now
        journey.legStartedAt  = now
        journey.legDurationMs = legDurationMs(journey.isPlus, devFastLegs)
        journey.arrivalAt     = now + journey.legDurationMs

    return journey, newlyBanked
```

Three details that matter:

1. **`devFastLegs` must be threaded through.** Hardcoding `false` here makes banking untestable from the dev panel.
2. **`dayIndex` does not change here.** It advances when an arrival is *claimed* (a pull completes), not when it is credited. Otherwise the day counter drifts away from the Chronicle.
3. **`newlyBanked > 1` triggers the return line** — *"You walked far while away."*

### Banking rules

- Unclaimed arrivals stack to **five**, then stop accruing.
- Absence banks instead of breaking. No streak, no repair purchase, no guilt.
- The cap exists so a return session does not become pull-spam.

### The pacing rule

**Banked arrivals never fire back-to-back.** After a pull completes, always play the walk animation, *then* present the next arrival. Each pull gets the complete ceremony.

The ordinary departure handoff lasts about **3.1 seconds** before settling into the real-time leg. If another arrival remains banked, use a longer **4.5-second compressed approach** to the already-generated next waymark. The destination must be named during that transition. A blink-length delay is not a journey separator.

> Four pulls that feel ceremonial is fine; four pulls that feel like opening packs is brand death.

The current `closePull` implements this correctly. Do not simplify it.

### Clock guard

Store `lastSeenTimestamp` and a `monotonicCounter`. Use them to detect a clock rolled backward or jumped absurdly forward, and to bound how many arrivals a single `tick()` may credit.

**Do not punish the user.** Worst case, someone who rolls their clock walks faster. Nothing of value leaks and nothing is worth an adversarial design here. The guard is currently a no-op with unused parameters and a docstring that claims otherwise — either implement it or delete the lie.

---

## Completing a pull

```
closePull():
    require phase in (walk, done)
    journey.bankedArrivals -= 1                    # claim it
    journey.dayIndex       += 1                    # the day advances HERE
    journey.waymarkIndex    = nextWaymarkIndex(...)
    journey.legStartedAt    = now                  # the pull blesses the road
    journey.legDurationMs   = legDurationMs(...)
    journey.arrivalAt       = legStartedAt + legDurationMs
    phase = bankedArrivals > 0 ? 'arrive' : 'traveling'
    reschedule notifications
    persist
```

Also on pull completion: append the `ChronicleEntry`, score the Mirror, append to `recentPulls` and `lensHistory`, and (once built) fire the anonymous trace insert.

---

## The Mirror

**You never choose a stat.** Six aspects: Tenderness, Resolve, Craft, Sight, Solitude, Fortune.

### Scoring — the correct model

```
primary aspect of the lens   +2
secondary aspect of the lens +1
aspect associated with the card that answered  +1
```

Unbounded counters. **No 0–100 range, no clamping.** The current implementation uses +5/+2 with a 100 ceiling and no card contribution; that is wrong on all three counts.

Asking about Love builds Tenderness *and* Sight, because noticing is part of caring. The card contribution is what makes the same question grow you differently depending on what the road says — it is the mechanism, not a detail.

Occasionally the road marks you unprompted. Rare, undisclosed.

**Weights are never shown in-app.** No meter, no multiplier, no tooltip. The player learns wordlessly or not at all.

### Titles

Deepen at **10 / 26 / 52** in each aspect. Not 25/50/75.

### Seeding

At onboarding, the birth sign's element seeds **+3, hidden**, into one aspect:

| Element | Aspect |
|---|---|
| Fire | Resolve |
| Earth | Craft |
| Air | Sight |
| Water | Tenderness |

All aspects otherwise start at **0**. The store currently seeds every aspect at 25; fix that. Two players with identical pulls must diverge from day zero.

### Curios are not threshold rewards

The scaffold ties curios to aspect thresholds. That is wrong. **Curios are found on the road** — mostly while the app is closed — on a rarity roll, and live in the Satchel pocket of the Mirror. They feed nothing.

> XP demands a level, a level demands a payoff, and any payoff strong enough to matter breaks "no stats you assign." A shelf that fills is its own reward.

Rough tuning: common every ~1.5 blessed days, uncommon weekly, rare fortnightly.

---

## Dayparts

Six, from the device clock: `dawn` `morning` `noon` `afternoon` `dusk` `night`. Boundaries are in `core/time.ts` and are correct.

A card pull **tints** the daypart palette rather than replacing it. The sky belongs to the clock; the card colors the light.

The dev override singleton in `time.ts` is fine for now but is module-level mutable state — if daypart forcing ever needs to survive a reload, move it into the store.

---

## Notifications

All local. Never remote.

| Trigger | Copy | When |
|---|---|---|
| Arrival | *"You've arrived at the Lantern Tree. The deck waits."* | scheduled at leg start for `arrivalAt` |
| Weekly | The Week's Passage | Sunday |

Reschedule whenever `arrivalAt` changes or settings change. Cancel on `isPlus` change, since leg duration shifts.

Tone is invitational, never a nag. It is news from the road, not a reminder from an app. Each type independently toggleable.

---

## Invariants

Worth asserting in tests:

- `0 <= bankedArrivals <= 5`
- `arrivalAt == legStartedAt + legDurationMs`, always
- `0 <= walkProgress <= 1`
- `phase == 'arrive'` implies `bankedArrivals > 0`
- `chronicle.length` equals the number of completed pulls
- A pull is only possible from `arrive`
- Crediting is idempotent: two `tick()` calls with the same `now` credit once

`core/leg.ts` and `core/mirror.ts` are pure functions over plain data. There is no reason not to test them, and the banking bug would have been caught by a single test that advances the clock three legs.
