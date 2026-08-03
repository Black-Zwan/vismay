# 04 · Rendering & Sprites

## The seam

`src/render/WorldView/` is the only place that knows how the world draws. Everything outside it passes props and reads nothing back.

```ts
interface WorldViewProps {
  daypart: Daypart;
  seed: number;
  biome: BiomeId;
  walkProgress: number;   // 0..1
  characterId: string;
  accentHex: string;      // the day's card accent
}
```

`seed` fixes ridge and prop layout for the complete leg. `biome` changes at mid-leg and its ground/path/prop palette eases independently of the daypart sky.

The current implementation is a colored `View` with the landmark name and a moving dot. That is correct for now. **The implementation is temporary; the interface is not.** If you find yourself wanting to add a prop, ask whether the caller should really know that.

This seam exists because the real renderer needs react-native-skia, which cannot load in Expo Go. Everything else in the app ships and iterates while the render question stays open.

## World art — the target

A painterly side-on world with three-depth parallax, drawn procedurally and dithered. Working reference implementation is in `reference/` (`WorldCanvas`, `LandmarkArt`, `DitherGlow`) — HTML canvas, runs in a browser, does not run here. Read it as a specification.

**Technique.** An 8×8 Bayer ordered-dither matrix over value-noise gradients. Skies, ground, water and glow ramp through limited palettes and dither, producing a cross-hatched grain that reads as hand-made rather than as filtered pixel art. Characters and props composite over that, so silhouettes stay crisp against textured ground.

**Parallax.** Three ridge depths scroll at 0.00008 / 0.00014 / 0.00022 — a 1 : 1.75 : 2.75 ratio — driven by one animation loop. Ground scrolls at 0.0016, path stones at 0.0017, and foreground at 0.0028.

**Dayparts.** Six sky ramps, each three stops, with sun/moon position, orb color and star density. A card pull **tints** the daypart palette rather than replacing it — roughly a 45% mix toward the card's sky. The sky belongs to the clock; the card colors the light.

**North star:** illustrated storybook meets *Journey*. Limited palettes, strong silhouette, one light source, generous negative space.

### What ports directly

These are pure functions in `reference/` with no DOM dependency. Lift them into `src/core/` verbatim rather than rewriting:

- the `BAYER` 8×8 matrix
- `hx` / `mix` / `lift` / `sink` / `ramp` color math
- `hash2` / `vnoise` / `smoothT` value noise
- the `DAYPARTS` table
- `accentRamp` / `sRgb2hsl` / `sHsl2rgb`

### The Phase 2 spike

Bayer dither plus three-strip parallax at 60fps in react-native-skia on a mid-tier Android device. Highest technical risk in the project. Needs a development build. Until it resolves, `WorldView` stays on its placeholder and nothing else is blocked.

If Skia proves too slow, the fallback is pre-baking strips as PNG assets and tinting at runtime — worse, but shippable.

## Sprites

### The contract

```
cell        128 × 176 px
anchor      (64, 172)          feet on baseline
body target 124 px tall
facing      screen-right
palette     ≤ 12 colors
portrait    128 × 144, bust crop from mid-chest
```

Frame count is **inferred from sheet width** (`width / 128`), so 4-, 8- and 24-frame animations work with no code change.

Animations: `idle` 3 frames @ 3fps, `walk` 4 frames @ 8fps, `vigil` 4 frames @ 6fps.

### Accent tinting — the change from the prototype

Each character has exactly **one saturated accent region** — Rowan's scarf, Lyra's star hem. The day's card accent recolors that region at runtime, so pulling The Star turns Lyra's hem teal while the rest of her stays as painted. This is the mechanic that makes cosmetics sell.

The prototype does this with per-pixel `ImageData` surgery on canvas. **There is no runtime equivalent in React Native without Skia.**

**Use base + accent-mask pairs instead.** Because the sprite spec reserves three accent hexes (`#f0d69a` highlight, `#c9a227` midtone, `#7a5f14` shadow), a mask strip can be derived automatically from any existing sheet. Ship two strips per animation, stack them, and tint the mask layer with React Native's native `tintColor` on `Image`.

This works in Expo Go, needs no per-pixel work, and survives the Skia decision either way. It supersedes the prototype's "no mask strips" line — that rule was written for a canvas renderer that no longer applies.

### Delivery pipeline

Sheet arrives → threshold the ink → close → drop stray components (so label text does not come along) → normalize every frame to a shared baseline and eye line → derive the accent mask from the reserved hexes → encode → wire.

**Keying is inverted for the anime sheets.** They sit on a light ground, not black. Use near-white pixel detection, not hole-filling.

A QA harness exists in `reference/wonder-sprite-engine.jsx` — it validates a delivered strip against the spec and reports pass/fail per frame. Web code, but the validation logic is worth porting.

### Current roster

| Character | Class | Accent region | Art |
|---|---|---|---|
| Rowan | the wanderer | scarf | real, 4-frame walk |
| Lyra | the enchantress | star hem | real, 4-frame walk |
| Wren | the wayfarer | strap | — |
| Ser Aldric | the paladin | tabard | — |
| Brother Osric | the monk | beads | — |
| Thorn | the ranger | fletching | — |
| Finch | the bard | lute inlay | — |

Neither real sheet is in this repo yet; both exist as base64 in `reference/`. Extract them to `assets/sprites/` as PNGs rather than carrying data URIs in source.

**Known issue.** Lyra's walk frames are wide (88–96px against Rowan's 74–83) because of the robe sweep and orb, so she reads slightly larger on the road. Fix by normalizing on width rather than height.

**Unused animation already in hand.** Each real sheet includes an alternate idle and a 4-frame secondary action — Lyra's casting, Rowan's look-around. Obvious homes: Lyra casts while the card flips; Rowan looks around on arrival.

**Facing.** Per-character `flip` flag. Real art walks screen-right (`flip: false`); legacy placeholders need mirroring.

### Generating the remaining five

The style block in the design doc §4b is **canonical and must be pasted verbatim**. Two grimdark passes were already rejected; a third would be a process failure, not an art failure.

Process rules, in short: one character per generation, never a grid. Facing screen-right, stated every time. Transparent background. **Chain every generation to Lyra as the reference** so proportions, eye line, dither density and palette temperature stay locked. 128 × 176, preserve aspect ratio absolutely — if the figure does not fit, redraw it smaller, never compress.

## Card art

Card faces are **full illustrated art**, dithered, each carrying its own frame, numeral, corner marks and title. Nothing is overlaid at runtime except a thin accent border, a glow, and a foil sheen sweep.

Eight illustrated faces were produced in an earlier build and **the source is missing** — see `00-STATE-OF-PLAY.md`. The Wheel is deliberately left procedural as the visible fallback path, so degraded rendering can be compared side by side. Keep it that way.

The procedural emblems in `reference/` (`EMBLEMS`, `drawEmblem`) are path data and port cleanly to `react-native-svg`. They are the fallback, not the target.

## Share cards

Any Chronicle passage renders on demand into a dithered, framed image with download / share sheet / copy-text. This is the growth engine, so it is worth doing properly.

The canvas implementation in `reference/` (`makeShareCard`) is the specification: day, place, card emblem, passage, reading, framed and dithered. Porting needs either Skia or `react-native-view-shot`. Generation is async and must never block the close panel.
