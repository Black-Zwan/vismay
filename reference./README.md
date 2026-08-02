# reference/

**Read-only. Nothing in `expo/` may import from this folder.**

## What this is

The original Vismay prototype — a single-file React **web** app where the visual identity, world rendering, sprite pipeline, loop timing and first authored content were worked out.

It runs in a browser. It does not run in React Native. Roughly 70% of it is HTML canvas and positioned `<div>`s.

Treat it as **a specification you can execute**, not as code to port.

## Files

| File | What |
|---|---|
| `wonder-v6.jsx` | The prototype. ~2,400 lines plus embedded base64 sprite art. Despite the name, its header reads "Art Update V4" and its export is `WonderArtUpdateV4` — it is the V4 branch with the sprite engine and the arrival loop grafted on. |
| `wonder-sprite-engine.jsx` | Sprite delivery QA harness. Validates a delivered strip against the 128×176 spec and reports pass/fail per frame. |

Named for the project's previous working title, WONDER. Left as-is deliberately — renaming a historical artifact only breaks references to it.

## What it contains

Six dayparts with full sky palettes · twelve waymark set-pieces · three-strip parallax · Bayer dithering · two real anime-pixel sprite sheets with runtime accent tinting · canvas share-card generation · a working arrival-gated loop with banking · 30 authored readings, 6 card epigraphs, 12 departure lines.

## What it does not contain

The Mirror · the Sky, birth signs or horoscopes · illustrated card faces · eighteen lenses · cairns · curios · persistence of any kind.

An earlier build ("V5 — The Painted Deck") had the Mirror, the Sky and eight illustrated card faces. **That source is missing.** If it turns up, it matters.

## How to use it

Read `docs/08-PROTOTYPE-MIGRATION.md` before extracting anything. It says what to lift verbatim, what to transcribe, what to re-implement fresh, and what to leave alone.

To run it: drop the component into any React web sandbox. It needs no props.

## Why it's outside `expo/`

Metro crawls everything under the Expo project root. Keeping the prototype a sibling of `expo/` rather than a child means it can never be bundled, type-checked, or accidentally imported.
