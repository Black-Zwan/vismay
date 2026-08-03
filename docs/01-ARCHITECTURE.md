# 01 · Architecture

## Stack

| | |
|---|---|
| Runtime | Expo SDK 54, React Native 0.81.5, React 19.1 |
| Language | TypeScript, `strict: true` |
| Navigation | Expo Router 6 (file-based) |
| State | Zustand 5 |
| Storage | AsyncStorage 2.2 |
| Notifications | expo-notifications (local only) |
| Package manager | bun (`bun.lock` committed); npm works |
| Path alias | `@/*` → `expo/*` |

Bundle ID `com.blackzwanlabs.vismay` on both platforms. Slug and scheme `vismay`.

## Layout

```
expo/
  app/                          Expo Router. Screens only — no business logic.
    _layout.tsx                 root stack, font loading, store hydration
    index.tsx                   gate: onboarding vs journey
    onboarding/
      character.tsx             pick 1 of 7
      sign.tsx                  pick 1 of 12
    (journey)/
      _layout.tsx               tabs
      road.tsx                  home — world, countdown, and in-place pull ritual
      chronicle/index.tsx       passage list
      chronicle/[entryId].tsx   single passage
      mirror.tsx                aspects + satchel
      settings.tsx              toggles + dev panel
  src/
    core/                       PURE. No React, no RN, no I/O.
      leg.ts                    walk-leg and arrival math
      time.ts                   daypart from clock
      mirror.ts                 aspect scoring
      ids.ts                    id generation
    content/                    static data tables + their types
    state/
      types.ts                  the canonical shapes
      store.ts                  Zustand store, all actions
      persistence.ts            AsyncStorage behind an interface
    render/
      WorldView/                the render seam
    services/                   platform edges
      notifications.ts
      traces.ts                 stub, unimported
      purchases.ts              stub, unimported
    ui/                         primitives + design tokens
  assets/
    fonts/  sprites/  world/
```

## The layer rule

Dependencies point downward only:

```
app/        →  state/  →  core/
                  ↓         ↑
             services/   content/
                  ↓
             render/
```

- **`core/` imports nothing but types.** Pure functions over plain data. If you need `Date.now()`, take a timestamp as a parameter instead.
- **`content/` is data.** No logic beyond simple lookups (`getCard`, `waymarkAt`).
- **`state/` orchestrates.** It calls `core/` for decisions, `content/` for data, `services/` for effects. It is the only place all three meet.
- **`app/` renders.** Screens read the store and call actions. No math, no timers, no direct storage access.
- **`services/` wraps platform edges.** Everything that touches the OS, the network, or a vendor SDK lives here and is swappable.

Violating this is the main way the project gets hard to change. If a screen is doing arithmetic on timestamps, that arithmetic belongs in `core/`.

## The Expo Go ceiling

The project currently runs in Expo Go, which cannot load third-party native modules. **Do not add one without asking.**

| Deferred | Interim | Lands when |
|---|---|---|
| react-native-skia | `WorldView` placeholder | Phase 2 render spike |
| react-native-mmkv | AsyncStorage behind `StorageBackend` | any dev build |
| RevenueCat | `purchases.ts` stub returning `false` | before TestFlight |
| iCloud KV mirror | local only | any dev build |

Every one of these is already isolated behind an interface, so each is a swap rather than a rewrite. That isolation is the point — preserve it.

Reanimated and Gesture Handler are in Expo Go and are fine to use.

## Persistence

One key: `vismay_state_v{schemaVersion}`. One envelope:

```ts
interface PersistedEnvelope {
  state: AppState;
  clockGuard: ClockGuard;
  schemaVersion: number;
}
```

Writes are debounced 400ms; there is a `flushPersistedState` for backgrounding. The `StorageBackend` interface exists so MMKV or an encrypted store can be dropped in later — use `setStorageBackend`, do not import AsyncStorage anywhere else.

**Migrations.** Bump `CURRENT_SCHEMA_VERSION` and add a migration in `persistence.ts` when `AppState` changes shape. Never silently discard a user's Chronicle — that is the one piece of data in this app that is genuinely irreplaceable to them.

## Dependencies worth knowing

Present and used: `expo-notifications`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-haptics`, `react-native-svg`, `zustand`, AsyncStorage.

Present and unused, carried from scaffolding: `@tanstack/react-query`, `expo-web-browser`, `expo-symbols`, `expo-blur`, `lucide-react-native`, `@rork-ai/toolkit-sdk`. **Leave `@rork-ai/toolkit-sdk` alone** — removing it may break the owner's Rork preview. The others can go when someone is confident nothing imports them.

`react-native-svg` is worth keeping: the card emblems in `reference/` are path data and port to SVG directly.

## Build and release

Not configured yet. `eas.json`, App Store Connect and RevenueCat are a later pass, run through Rork because the owner does not want to hand-manage that plumbing. Do not create `eas.json` speculatively.

## Sync model

Rork commits to `main` automatically when the owner edits in the web tool. You clone, work, push to `main`. Pull first, keep diffs tight, never rewrite history.
