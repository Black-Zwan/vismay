# AGENTS.md

Instructions for any AI agent working in this repository. Read this before touching code.

## What this is

**Vismay** — a daily tarot ritual inside an illustrated journey. Draw one card a day, ask it a question through a lens, receive a written reading, and watch a wanderer walk in real time toward the next waymark. Arrival unlocks the next pull. Every day is written into a Chronicle that becomes the reason not to delete the app.

Built by one person under the Black Zwan Labs label. There is no team, no ticketing system, and no code review other than the owner reading your diff.

## Where things live

```
/                    rork.json — Rork project manifest, do not edit
/expo/               the entire application. All paths below are relative to here.
/docs/               specifications. Authoritative when they disagree with code.
/reference/          the original web prototype. Read-only. Never import from it.
```

**Everything is under `expo/`.** This is a Rork convention, not a mistake. `expo/package.json`, `expo/app/`, `expo/src/`.

## Read these before you start

| Doc | When |
|---|---|
| `docs/00-STATE-OF-PLAY.md` | Always. Current status, known-wrong code, what's next. |
| `docs/01-ARCHITECTURE.md` | Before adding a dependency or a module. |
| `docs/02-STATE-MACHINE.md` | Before touching `src/core/` or `src/state/`. |
| `docs/03-DATA-CONTRACTS.md` | Before changing any type or content table. |
| `docs/04-RENDER-AND-SPRITES.md` | Before touching `src/render/` or any art. |
| `docs/05-SUPABASE.md` | Only when building the traces feature. |
| `docs/06-VISUAL-LANGUAGE.md` | Before writing UI or any user-facing string. |
| `docs/07-OUT-OF-SCOPE.md` | Before adding any feature. Non-negotiable. |
| `docs/08-PROTOTYPE-MIGRATION.md` | Before touching `reference/` or migrating anything out of it. |

## Hard rules

**1. This project runs in Expo Go.** Do not add a dependency that requires a native build without asking first. No Skia, no MMKV, no RevenueCat, no Reanimated-native-only APIs, no Firebase. If a task genuinely needs one, say so and stop.

**2. `src/core/` is pure.** No React, no react-native, no expo, no I/O. Pure functions over plain data. This is deliberate — it is the layer that is easiest to reason about, test, and rewrite. Keep it that way.

**3. Do not invent content.** Card readings, waymark departure lines, curio descriptions, horoscope templates and notification copy are authored by the owner in a specific voice. If content is missing, leave a clearly-marked placeholder. Do not write flavor text. Do not generate tarot interpretations. This is the single most common way an agent damages this project.

**4. Never call an LLM at runtime.** The product's entire differentiation is that it does not. All readings are static and ship in the binary. There is no exception to this.

**5. Do not "improve" the design.** If something looks like a missing feature, check `docs/07-OUT-OF-SCOPE.md` first — most absences are decisions. No streaks, no levels, no XP, no leaderboards, no social feed, no achievements, no confetti.

**6. Preserve the render seam.** Nothing outside `src/render/WorldView/` may know how the world draws. The placeholder implementation is temporary; the interface is not.

**7. Do not touch `reference/`.** It is a historical artifact kept for its specifications and data. It is web code and does not run here.

## Working style

The owner reacts to working code, not descriptions. Prefer a small running change over a long proposal. When output misses the bar, say so plainly — the correct response to a bad pass is a reset, not a defense.

When you find something wrong that is outside your current task, note it rather than fixing it silently.

## Getting it running

```bash
cd expo
npm install          # bun works too; bun.lock is committed
npx expo start       # or: npm run dev
```

The `start` script is Rork's own CLI and requires their toolchain. Use `dev` locally.

## Sync model

The owner edits in Rork's web tool; Rork commits to `main` automatically. You clone, work, push. Both directions are live on the same branch.

**Consequences:** pull before you start, keep changes tight, and never rewrite history. Rork does not know about your branches.
