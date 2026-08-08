# 00 · State of Play

*Updated August 2026. Read this first.*

## Where we are

Vismay is a working Expo Go application with the Phase 1 ritual loop and the first Phase 2 systems in place. A player can complete onboarding, draw and read a card, close the day through the Sky, travel in real time, receive an arrival notification, and return for the next pull. The Chronicle, Mirror, Satchel, seeded world, traces, curios, rare scenes, and development controls are wired into that loop.

The earlier single-file web prototype remains in `reference/`. It is a visual and behavioral specification only: read it when a migration task calls for it, but never import from it or edit it.

## What exists and works

- **Core loop** — onboarding → arrival → question → draw → reveal → reading → Sky → departure → real-time travel → arrival, including banked arrivals.
- **State and persistence** — Zustand orchestration, versioned AsyncStorage persistence, clock guard, pure core rules, and migrations that preserve Chronicle history.
- **Notifications** — local arrival scheduling, rescheduling on leg changes, cancellation on reset, and permission requested in context after the first departure.
- **Seeded world** — deterministic biomes, archetypes, places, scenes, parallax props, progress-driven landmarks, rare locations, and character sprites behind the `WorldView` seam.
- **Chronicle** — frozen assembled passages, card references, curios, contextual share, and continuous prose presentation.
- **Mirror and Sky** — six unbounded aspects, sign seeding, titles, lens history, recent pulls, Satchel, horoscope, and watch-for sign.
- **Traces and curios** — anonymous enum-only trace payloads with a deterministic procedural floor, cairns, offline behavior, rarity-tiered curio finds, and Chronicle/Satchel integration.
- **Presentation** — bundled Spectral fonts, semantic typography, adaptive ritual chrome, reusable core `Animated` motion, reduced-motion behavior, procedural SVG card faces, and subtle haptics.
- **Development console** — development-only floating launcher and grouped bottom sheet for time, leg, world, player, traces, network, and destructive test controls.

## Current delivery state

The app remains deliberately compatible with Expo Go. It uses React Native's core `Animated`; Reanimated is not installed. The render seam is preserved, and no player-facing screen imports renderer implementation details.

Presentation work has brought the native app substantially closer to the prototype while retaining responsive phone layouts, safe areas, scroll behavior, and permanent navigation during travel only. Tabs hide for the active ritual and return after departure.

The core automated suite covers state transitions, leg banking, Mirror growth, seeded generation, traces, persistence migrations, presentation policy, card artwork fallback, and developer-control grouping. Run all checks from `expo/`:

```bash
npx tsc --noEmit
npm run lint
npm run test
```

## Known limitations and remaining work

The critical path is still authored content and commissioned art, not another application system.

- The launch deck requires all 22 Major Arcana at full lens depth; missing readings must be supplied by the owner rather than generated.
- Procedural card emblems are intentionally replaceable placeholders for commissioned card art.
- The remaining character sheets, biome props, landmark silhouettes, curio icons, and rare-scene art belong to the content/art track.
- Horoscope, world, curio, and title tables must be reviewed for authored completeness before release. Never replace missing copy with generated flavor text.
- Free and Plus leg durations remain tuning values that need real-device, real-schedule testing.
- Supabase traces must be configured and tested against the production project; the procedural floor must continue to make offline and low-density operation indistinguishable.
- Purchases and the Blessed Road paywall remain outside the current Expo Go implementation.
- Share-card export needs final platform QA.

## What not to add

The product still has no streaks, XP, levels, achievements, leaderboards, social feed, free text, runtime LLM calls, or assignable stats. Check `07-OUT-OF-SCOPE.md` before treating an absence as unfinished work.

## Next recommended milestone

Move to real-device pacing and release-readiness work while the writing and art tracks continue in parallel:

1. Verify the full ritual and arrival notification on iOS and Android Expo Go.
2. Test offline/online trace behavior with the configured Supabase project.
3. Audit every player-visible content table for placeholders and missing authored rows.
4. Complete the 22-card content and artwork floor.
5. Begin TestFlight/device pacing sessions, with walk-leg duration as the primary tuning knob.

Do not expand the feature surface before this release floor is credible.
