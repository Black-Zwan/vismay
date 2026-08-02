# 08 · Prototype Migration

## What `reference/` is

A single-file React **web** app, ~2,400 lines plus embedded base64 art. It is where the visual identity, the world rendering, the sprite pipeline, the loop timing and the first authored content were worked out. It runs in a browser. It does not run here.

**It is a specification you can execute, not a codebase to port.** Roughly 70% of it is HTML canvas and positioned `<div>`s: 7 `getContext` calls, 135 divs, 13 `@keyframes` blocks, 5 `document.createElement`. None of that survives contact with React Native.

Its value transfers in four separable pieces, in descending order of how cheaply they move.

---

## Where it lives

```
/reference/
  wonder-v6.jsx              the prototype
  wonder-sprite-engine.jsx   sprite QA harness
  README.md                  what to read it for
/expo/                       the application
```

**At the repo root, outside `expo/`.** Metro crawls everything under the Expo project root; keeping the prototype a sibling means it can never be bundled, type-checked, or accidentally imported. Nothing in `expo/` may import from `reference/` — not even types. Copy what you need.

Commit it read-only and leave it. It is a historical artifact that happens to be executable.

---

## Piece 1 — Content *(highest value, do first)*

Real authored prose in the owner's voice, currently stranded. This is transcription, not generation.

| From the prototype | To |
|---|---|
| `CARDS` — 6 cards: id, name, numeral, accent, epigraph, 5 readings each | `src/content/cards.ts` |
| `QUESTIONS` — 5 lenses with glyphs | `src/content/lenses.ts` |
| `LANDMARKS` — 12 waymarks with departure lines | `src/content/waymarks.ts` |
| `OPENERS` / `ANSWERS` — Chronicle passage templates | new `src/content/passages.ts` |

Three shape changes on the way in:

1. **`CardEntry` needs `epigraph`** (the line under the name — *"what falls was already hollow"*). The prototype has it; the type does not. Add the field.
2. **`CardEntry` needs `aspect: AspectId`** — the aspect each card contributes +1 to under the correct Mirror model. The prototype predates the Mirror, so **this data does not exist**. Leave it as an explicit TODO per card for the owner to assign. Do not guess.
3. **`LensEntry` needs `primaryAspect` / `secondaryAspect`.** The prototype's five lenses (love, work, decision, self, open) have no aspect mapping. Same rule — TODO, owner assigns. The design doc gives one worked example: Love → Tenderness primary, Sight secondary.

Reading keys are currently the bare lens ids (`love`, `work`); the scaffold uses `lens_work`. Pick one convention and apply it everywhere — these ids are persisted inside Chronicle entries and become permanent once shipped.

Card ids in the prototype are `sun`, `moon`, `tower`, `star`, `hermit`. Prefer the fuller `the_sun` form before anything ships, for the same reason.

---

## Piece 2 — Pure logic *(lift verbatim, do not rewrite)*

Pure functions with no DOM dependency. Copy them into `src/core/` as they are. Rewriting them introduces bugs into code that is already correct.

| From | To | What |
|---|---|---|
| `BAYER` | `core/dither.ts` | 8×8 ordered-dither matrix, pre-divided by 64 |
| `hx` `mix` `lift` `sink` `ramp` `shadeCss` | `core/color.ts` | color math |
| `hash2` `smoothT` `vnoise` | `core/noise.ts` | value noise |
| `accentRamp` `sRgb2hsl` `sHsl2rgb` | `core/color.ts` | accent tint ramp derivation |
| `DAYPARTS` | `content/dayparts.ts` | six sky ramps, orb positions, star density |
| `ordinal` `pad2` | `core/format.ts` | |

`core/time.ts` already has the daypart *boundaries* and they are correct. What is missing is the **palette data** — three sky stops, orb position, orb color and star strength per daypart. That belongs in content, not core.

Everything here is testable without a device.

---

## Piece 3 — Assets *(extract, don't carry)*

Two sprite sheets live in the prototype as ~80KB base64 PNG string literals.

Decode them to real files:

```
assets/sprites/rowan_walk.png
assets/sprites/lyra_walk.png
```

Do not carry data URIs in source. They bloat the bundle, defeat image caching, and make diffs unreadable.

While decoding, **derive the accent-mask strips** — see `04-RENDER-AND-SPRITES.md`. The three reserved accent hexes make this mechanical, and the mask-pair approach is what makes runtime tinting work in React Native at all.

Note: the prototype's `SHEETS` map keys the first sheet as `aldric`, but the design doc says the two finished characters are **Rowan and Lyra**. Verify which sprite is actually which before naming files. This is exactly the kind of thing that gets locked in wrong and stays wrong.

---

## Piece 4 — Specifications *(read, then implement fresh)*

Do not port these. Read them, understand what they do, write React Native equivalents.

| In the prototype | What it specifies | Blocked on |
|---|---|---|
| `WorldCanvas` | sky ramp, dither, three-strip parallax, orb, stars | Skia spike |
| `LandmarkArt` | 12 waymark set-pieces, ~270 lines of positioned divs | Skia spike |
| `DitherGlow` | the radial bloom on reveal | Skia spike |
| `makeShareCard` | share card composition and layout | Skia or view-shot |
| `EMBLEMS` / `drawEmblem` | procedural card emblems — path data, ports to `react-native-svg` | nothing, can do now |
| `SpriteWanderer` / `getTinted` | frame stepping and accent tinting | superseded by mask pairs |
| main component JSX | screen composition and ceremony pacing | nothing, useful reference now |

The parallax speeds (0.28× / 0.85× / 1.5×) and the accent-mask area percentages (Rowan 6.2%, Lyra 7.2%) are marked *(verify)* in the design doc. They are checkable here.

---

## What not to do

- **Do not run a JSX-to-RN conversion** over the file. The output will be a WebView-shaped mess or hallucinated canvas shims, and it will be thrown away.
- **Do not import anything from `reference/`.** Copy.
- **Do not treat the prototype's structure as the app's structure.** It is one 2,400-line component because it was a prototype. The repo's layering is deliberate and better.
- **Do not port the prototype's state.** The scaffold's store is correct and typed; the prototype has no persistence at all.
- **Do not resurrect `wander-iso.jsx`** if it surfaces. It is v2, isometric, and predates every art decision.

---

## Suggested order

1. Commit `reference/` at the repo root with a README. Confirm `npx expo start` is unaffected.
2. Migrate content (Piece 1). The app immediately stops saying "Card One."
3. Lift pure logic (Piece 2) with tests. Cheap, safe, unblocks the renderer later.
4. Extract sprites and derive masks (Piece 3).
5. Port the emblems to SVG — the only Piece 4 item not blocked on Skia.
6. Everything else waits on the development build.

Steps 1–5 all run in Expo Go.
