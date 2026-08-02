# 07 · Out of Scope

Most absences in this product are decisions, not oversights. This document exists because a helpful agent's instinct on seeing a daily-habit app with no streak counter is to add one, and that would break the thing the product is for.

**If a feature is on this list, do not build it. If you think it belongs anyway, say so and stop.**

## Never — these are the product

| Not building | Why |
|---|---|
| **Runtime LLM calls of any kind** | The entire differentiation is that this app doesn't do that. Every competitor is racing toward AI readings and converging on the same product. All readings are static and ship in the binary. |
| **Streaks** | Absence banks instead of breaking. A lapsed player returns to a wanderer waiting with pulls saved up. There is no counter to break and nothing to feel guilty about. |
| **Levels, XP, or any progression bar** | XP demands a level, a level demands a payoff, and any payoff strong enough to matter breaks "no stats you assign." |
| **Stats the player assigns** | The Mirror grows from what you ask and what the road answers. You never choose. |
| **Visible weights, meters or multipliers** | The player learns the mechanic wordlessly or not at all. No tooltip ever explains that pulling speeds the road. |
| **Achievements, badges, trophies** | See the brand test. |
| **Confetti, celebration animations, bounce** | Everything rises and settles. |
| **Leaderboards, rankings, comparison to other users** | |
| **A social feed, comments, replies, reactions** | The cairns are ambient evidence of other people, not a message surface. Nothing a player does composes a message. |
| **User accounts, login, profiles** | No auth anywhere. No user table. No PII. |
| **Identity continuity between players** | A stranger can never be followed, found, or recognized twice. The moment two players can identify each other, this becomes a social platform with moderation obligations. Hard architectural line. |
| **Ads** | |
| **Consumable currencies, streak repair, pay-to-skip-a-walk** | Nothing that monetizes anxiety. Plus makes the road faster and richer; it never un-sticks anyone, because no one is ever stuck. |
| **Free text from users, anywhere** | The trace payload is six integers. That is the whole moderation strategy. |
| **Health, medical, or fortune-telling claims** | Brand position and App Review requirement simultaneously. |

## Not yet — banked, in intended order

Real features, deliberately deferred. Do not start any of them without being asked.

1. **The coincidence engine** — your horoscope says watch for a Capricorn, and a cairn on today's leg carries one. Free to build once traces exist. First post-launch update.
2. **The offering economy** — spending curios at shrines to feed the Mirror and leave traces for strangers, fusing curios with cairns. Genuinely good, explicitly banked. At launch, at most *leave it / keep it* with no systemic effect beyond a Chronicle line.
3. **Aspect Trials**
4. **Constellation collecting**
5. **Minor Arcana** — launch is the 22-card Major Arcana at full lens depth
6. **Reversed cards**
7. **Fellow Travelers** — add-by-code ambient presence. Waits for proven retention.
8. **Seasonal reskins** — the live-ops lever. Art only, never systems.
9. **Weekly share ("The Week's Passage")** — specced, not built
10. **Journal export / "Year on the Road"** — a Plus feature, post-launch

## Not now — deferred on technical grounds

Blocked by the Expo Go ceiling. Each is already isolated behind an interface. See `01-ARCHITECTURE.md`.

- **react-native-skia** — the real world renderer. Phase 2 spike.
- **MMKV** — behind `StorageBackend`.
- **RevenueCat** — `purchases.ts` returns `false`.
- **iCloud key-value mirror.**
- **On-device AI** — explicitly deferred, and note it is still bound by the never-list above.

## Judgment calls

Things that are neither forbidden nor scheduled. Ask before building:

- Sound design and haptics beyond what exists
- Accessibility work beyond reduced-motion and reasonable contrast — worth doing, not yet specced
- Localization — the voice is the product and translating it well is a real project
- Analytics of any kind — no decision has been made, and shipping one silently would be wrong
- Widgets, Live Activities, watch app

## The general rule

This product is defined more by what it refuses than by what it includes. A daily ritual app with no streak, no levels, no feed and no AI is an unusual shape, and every individual addition would seem reasonable in isolation. That is exactly why the list exists.

When something looks missing, check here first. When in doubt, ask.
