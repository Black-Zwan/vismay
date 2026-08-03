# 00 · State of Play

*Updated August 2026. Read this first.*

## Where we are

The project has a real Expo application, scaffolded by the Rork agent and synced to `Black-Zwan/vismay`. It launches in Expo Go, navigates, persists, and schedules notifications. It contains no real content and no real art.

Before this repo existed, the product was prototyped as a single-file React web app (`reference/`). That prototype is where the visual identity, the world rendering, the sprite pipeline and the loop timing were worked out. **It is not the codebase.** Roughly 70% of it is HTML canvas and positioned `<div>`s. Treat it as a specification you can read and run in a browser, never as something to port line by line.

## What exists and works

- **Navigation** — Expo Router, onboarding → journey tabs; the pull ritual renders in place on Road
- **State** — Zustand store, types exactly as specified, no drift
- **Persistence** — single versioned AsyncStorage key, 400ms debounce, swappable `StorageBackend` interface, schema v3 migration preserving Chronicle and adding seeded legs / rare collection.
- **Notifications** — local scheduling at `arrivalAt`, cancel/reschedule on state change, settings toggles honored
- **Dev panel** — force arrival, fast legs (20s), force daypart, reset state
- **Render seam** — `WorldView` is properly isolated behind a props interface
- **Content tables** — correct shapes, placeholder rows

## What is known-wrong

These are the first things to fix. All are in pure TypeScript with no React involved.

### `src/core/leg.ts` — banking is dead

`creditArrivals` calls `startNextLeg(updated, now, false)` inside its `while` loop. `startNextLeg` sets `legStartedAt = now`, so the recomputed `arrivalAt` is always in the future and `isLegComplete` immediately returns false. **The loop can never run more than once.**

Effects:
- A player gone a week returns to exactly one pull, not five
- The cap of five is unreachable
- *"You walked far while away"* can never fire
- The absence-forgiveness mechanic — the thing chosen instead of streaks — does not exist

Also in the same file:
- `devFastLegs` is hardcoded `false` inside `creditArrivals`, so credited legs use the 22-hour duration even in fast mode. Combined with the above, banking cannot be tested from the dev panel at all.
- The clock guard is a no-op. Both parameters are underscore-prefixed and unused, while the docstring above describes an implementation that is not there.
- `dayIndex` increments at credit time rather than claim time, so unclaimed arrivals push the day counter out of sync with Chronicle entries.

**Correct behavior is specified in `02-STATE-MACHINE.md`.** Rewrite the file from that spec rather than patching it.

### `src/core/mirror.ts` — wrong model entirely

The scaffold implemented 0–100 bounded scores with +5/+2 shifts and thresholds at 25/50/75 that unlock curios. The actual design is unbounded counters with +2 primary / +1 secondary / +1 from the card, titles at 10/26/52, and curios found on the road rather than unlocked by thresholds.

**Correct model is in `02-STATE-MACHINE.md`.** Also rewrite from spec.

### `store.ts` — Mirror seeding

Aspects initialize to 25 each. They should initialize to 0, with a hidden +3 seeded into one aspect by the birth sign's element (fire→resolve, earth→craft, air→sight, water→tenderness).

### What the scaffold got right

`closePull` correctly implements the no-back-to-back pacing rule — it consumes the arrival, advances the waymark, plays the walk, and only then returns to `arrive` if more are banked. Do not "simplify" this.

## What does not exist yet

| Feature | Status |
|---|---|
| The Sky (birth signs, horoscopes, watch-for) | Types exist, no logic, no content |
| The Mirror UI | Screen exists, renders placeholder numbers |
| The Chronicle passage assembler | Entries persist; template assembly unwritten |
| Illustrated card faces | None. Eight were produced in an earlier build and the source is missing. |
| Character sprites | None in the repo. Two exist as base64 in `reference/`. |
| The seeded world | Deterministic five-biome WebGL renderer, persisted leg seed, prop layout, rarity and offline cairn seam. Authored place adjectives and rare copy remain TODO. |
| Cairns / traces | Client stub only, unimported. Deliberate. |
| Curios | Types and placeholder rows only |
| Purchases | Stub only. `isPlus` is a plain boolean nothing sets. |
| Share cards | Not started. Canvas implementation in `reference/` is the spec. |
| Bundled serif font | **Not done, and it matters.** See `06-VISUAL-LANGUAGE.md`. |

## Content status

The single largest piece of remaining work is writing, not code.

Three columns, and the distinction matters. **In repo** is what is checked in. **In `reference/`** is authored content that exists in the prototype and has not been migrated yet — real prose in the owner's voice, not placeholder.

| | In repo | In `reference/` | Need at launch |
|---|---|---|---|
| Cards | 3 generic placeholders | 6, with epigraphs and accents | 22 (Major Arcana) |
| Lenses | 3 generic placeholders | 5, with glyphs | 18 |
| Readings | 9 placeholder strings | 30 authored | ~396 |
| Waymarks | 3 generic placeholders | 12, with departure lines | 12 at launch, 26 target |
| Chronicle templates | none | 5 opener/answer | ~12 |
| Signs | 12 real | — | 12 |
| Characters | 7 named | 7 named, 2 with art | 7 |
| Curios | 3 placeholders | none | ~25 |

**Migrating the `reference/` column is a task, not a rewrite** — it is transcription of existing prose into the current content types. See `08-PROTOTYPE-MIGRATION.md`.

Readings beyond those 30 are authored by the owner. Do not generate them.

## Suggested order of work

1. **Rewrite `core/leg.ts` from spec.** Everything else depends on the loop being correct.
2. **Rewrite `core/mirror.ts` from spec** and fix the store's seeding.
3. **Add unit tests for both.** They are pure functions; there is no excuse not to. Especially: multi-arrival crediting, cap behavior, and the fast-legs path.
4. **Wire the Sky** — sign selection already persists; add element seeding, the daily horoscope slot and the watch-for line, with placeholder copy.
5. **Build the Chronicle passage assembler** against the template format in `03-DATA-CONTRACTS.md`.
6. **Bundle the serif** and apply the real palette from `06-VISUAL-LANGUAGE.md`. The app is currently light-mode plain text; it should be near-black plum.
7. **Then** the render spike, which needs a development build and is the highest-risk item in the project.

Steps 1–6 all run in Expo Go. Step 7 does not.

## Open questions for the owner

- Does a V5 "Painted Deck" source file exist anywhere? It holds eight illustrated card faces and the original Mirror/Sky implementation. If it is genuinely gone, Phase 1 grows.
- Walk-leg durations (free ~22h, Plus ~7h) are first guesses and can only be tuned by feel on a device.
- Trademark clearance for "Vismay" in classes 9 and 41 is outstanding.
