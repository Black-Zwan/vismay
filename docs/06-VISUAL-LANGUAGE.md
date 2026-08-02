# 06 · Visual Language & Voice

Read this before writing any UI or any user-facing string.

## The brand test

> If a screen would look at home in a wellness app with a streak counter and a confetti burst, it is wrong.

Apply it to everything. It settles most arguments faster than a style guide does.

## Voice — three rules

**1. Second person, present tense, quiet.** The app talks to one person in a room at night.

**2. Observation over instruction.** *"You've been rationing your own brightness"* — not *"be more confident."* The reading names something true; it does not assign homework.

**3. No claims.** Readings are reflective prompts. Nothing predicts, diagnoses, or promises. This is simultaneously a brand position and an App Review requirement — health or fortune-telling claims put the listing at risk.

### Canonical register

Write new copy to match these:

- Card epigraph — *"what falls was already hollow"*
- Reading — *"A structure you've been maintaining out of habit may shake today. The Tower isn't cruel — it only takes what was already hollow. Notice what you don't miss."*
- Waymark departure — *"The gate stood open. It is always open. That is the unsettling part."*
- System line — *"You do not choose what grows."*
- Arrival notification — *"You've arrived at the Lantern Tree. The deck waits."*
- Cairn trace — *"Four hours ago, a Capricorn passed this way. They asked of love, and the road answered with The Moon."*
- Curio find — *"In the night, the wanderer found a river-smoothed coin."*
- Return after absence — *"You walked far while away."*

### What the voice never does

- Exclamation points. Emoji in body copy.
- "Amazing." "Journey" as a self-help noun.
- Streak guilt, or any framing of missed days as failure.
- Second-guessing the reader.
- **Explaining the mechanic while performing it.** The player learns wordlessly that pulling makes the road move faster. No meter, no multiplier, no tooltip ever says so.
- **Framing strangers as metrics.** *"Travelers passed in the night,"* never "3 users were here."

### For agents

**Do not write content.** Readings, departure lines, curio descriptions, horoscope templates and notification copy are authored by the owner. If a string is missing, leave `TODO: copy` rather than approximating. Plausible-sounding placeholder prose is worse than an obvious gap, because it survives into shipping.

System labels ("Settings," "Chronicle") are fine to write.

## Typography

Serif throughout. Small-caps for system labels and headers. Wide letter-spacing on all-caps UI text. Roman numerals for cards, Arabic for days.

**The serif must be bundled, and currently is not.** The prototype's stack — Iowan Old Style, Palatino Linotype, Book Antiqua — is effectively iOS-only and falls back to generic sans on Android. Load a real face through `expo-font` into `assets/fonts/`.

Candidates worth trying: EB Garamond, Cormorant Garamond, Spectral, Crimson Pro. Owner picks. Until then the app cannot be fairly judged on Android.

## Color

```
background       #0a0812   near-black plum
body text        #cfc6e8   muted lavender
system text      #5c4f80   dim violet
accent           the day's card accentHex — the ONLY saturated color on screen
```

The current `src/ui/tokens.ts` is a light-mode placeholder from scaffolding. Replace it.

**All saturated color in the UI comes from the day's card.** Nothing else is bright. When in doubt, take saturation out.

The world's palette is separate: dayparts own the sky, and the card **tints** it rather than replacing it — roughly a 45% mix. The sky belongs to the clock; the card colors the light.

## Motion

Everything rises and settles. **Nothing bounces, nothing snaps, nothing celebrates.**

The reveal is the signature moment and the screenshot that markets the app: the card turns, a radial bloom, the world tint shifts, zoom on tap. It earns its time. Everything else gets out of the way.

Honor reduced-motion everywhere.

## Screens

**Onboarding** — pick your wanderer, pick your birth sign, straight into the first pull. No menu, no tutorial, no explanation. The first card should be turning within ninety seconds of install.

**The road (home)** — the world under the current daypart, place name, day count. Either a pull waiting or a countdown to arrival. **Never empty.** A player who opens mid-leg gets the world, the sky, the countdown, cairns on this leg, and sometimes a find. The app never says "nothing for you here."

**The pull** — lens → draw → reveal → read → close. The closing panel runs *day → card → departure line → horoscope → the watch-for → arrival countdown*.

**The Chronicle** — a continuous story, not a card grid. Passages with inline tappable chips for the lens and the card.

**The Mirror** — six aspects, the Record, the Satchel. Numbers appear; **weights and thresholds never do.**

## Store listing

Name: **Vismay** (विस्मय — *wonder*). Pronounced VISS-may, and that belongs in the first line of the description along with the meaning.

The name carries no semantic load in English, so the subtitle does the explaining: *"One card a day. A road that never ends."*

Screenshot line: a card blazing over a beautiful place, captioned *"One card a day. See how far the road goes."* If a feature does not make that screenshot better, it is not launch scope.
