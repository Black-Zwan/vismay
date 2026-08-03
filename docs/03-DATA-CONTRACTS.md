# 03 · Data Contracts

Types in `src/state/types.ts` and `src/content/types.ts` are canonical and currently correct. Changing either is a schema migration — see the bottom of this doc.

## State

```ts
type Phase =
  | 'traveling' | 'arrive' | 'question'
  | 'draw' | 'reveal' | 'reading' | 'walk' | 'done';

interface JourneyState {
  characterId: string;
  signId: string;
  dayIndex: number;
  waymarkIndex: number;
  legStartedAt: number;      // epoch ms
  legDurationMs: number;
  arrivalAt: number;         // epoch ms — always legStartedAt + legDurationMs
  bankedArrivals: number;    // 0..5
  stepsWalked: number;
  isPlus: boolean;
  seed: number;                // uint32 rolled once at departure
  biome: BiomeId;              // destination biome
  previousBiome: BiomeId;      // held until the mid-leg transition
  place: WorldPlace;           // resolved and frozen for this leg
  arrivalsSinceRare: number;   // soft-pity input
}

interface ChronicleEntry {
  id: string;
  dayIndex: number;
  waymarkId: string;
  cardId: string;
  lensId: string;
  openerText: string;        // assembled at write time, never re-derived
  answerText: string;
  departText: string;
  curioIds: string[];
  createdAt: number;
  placeName?: string;          // generated entries freeze the resolved name
  bucketKey?: string;          // generated entries freeze biome:archetype
}

type AspectId = 'tenderness' | 'resolve' | 'craft' | 'sight' | 'solitude' | 'fortune';

interface MirrorState {
  aspects: Record<AspectId, number>;   // unbounded counters, start at 0
  satchel: string[];                   // curio ids
  lensHistory: string[];
  recentPulls: { cardId: string; lensId: string; at: number }[];
}

interface Settings {
  notifyArrival: boolean;
  notifyWeekly: boolean;
  devMode: boolean;
}

interface AppState {
  phase: Phase;
  onboarded: boolean;
  journey: JourneyState;
  chronicle: ChronicleEntry[];
  mirror: MirrorState;
  raresFound: string[];        // first-found rare ids; repeats do not append
  settings: Settings;
  schemaVersion: number;
}
```

**Why `ChronicleEntry` stores assembled prose rather than template references:** a passage the player has read must never change. If templates are edited in a later release, old entries have to read exactly as they did the day they were written. Store the text.

**`recentPulls`** is capped at ten by the Mirror's Record display. Trim on write.

## Content

Static tables under `src/content/`. All authored by the owner. Agents may add rows only when explicitly asked, and must not invent prose.

```ts
interface CardEntry {
  id: string;                          // 'the_sun'
  name: string;                        // 'THE SUN'
  numeral: string;                     // 'XIX'
  accentHex: string;                   // drives world tint + accent mask
  readings: Record<string, string>;    // lensId -> 3-4 sentences
}

interface LensEntry {
  id: string;
  label: string;
  primaryAspect: AspectId;             // +2
  secondaryAspect: AspectId;           // +1
}

interface WaymarkEntry {
  id: string;
  name: string;                        // 'the Sunken Bell' — lowercase article is deliberate
  departText: string;
}

interface SignEntry {
  id: string;
  name: string;
  glyph: string;
  dates: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';   // seeds +3 hidden
}

interface CurioEntry {
  id: string;
  name: string;
  description: string;                 // one line
  rarity: 'common' | 'uncommon' | 'rare';
}

interface CharacterEntry {
  id: string;
  name: string;
  blurb: string;                       // 'the wanderer'
  accentHex: string;
}
```

### Fields the current types are missing

Add when the relevant feature is built, each a schema bump:

- `CardEntry.epigraph` — the short line under the card name (*"what falls was already hollow"*). Used in Chronicle passages.
- `CardEntry.aspect: AspectId` — the aspect the card contributes +1 to. Required by the correct Mirror model.
- `WaymarkEntry.arriveText` and `WaymarkEntry.rareText: string[]` — each waymark carries an arrival line, a departure line, and two rare lines.
- `CharacterEntry.flip: boolean` — per-character sprite facing. New anime art walks screen-right (`false`); legacy art needs mirroring.

### Target volumes at launch

| Table | Now | Launch |
|---|---|---|
| Cards | 6 placeholder | 22 (Major Arcana) |
| Lenses | 5 | 18 |
| Readings | ~30 | ~396 (22 × 18) |
| Waymarks | 12 | 12, target 26 |
| Curios | placeholder | ~25 |
| Characters | 7 named | 7, two with real art |

## Chronicle passages

A passage is assembled at write time from rotating templates and frozen into the entry.

```
DAY 141 · THE SUNKEN BELL
On the 141st day, the wanderer came to the Sunken Bell and asked of [♥ LOVE].
The deck answered with [✦ THE STAR] — "repair is already underway."
They did not ring it. Some bells are buried facing down for a reason.
```

Structure: `opener` (day, place, lens) → `answer` (card, epigraph) → `depart` (the waymark's line).

Templates use `{day}` `{place}` `{q}` `{card}` `{epi}`. The lens and card render as **inline tappable chips**; tapping the card chip reopens that day's art and full reading. Store chip positions as markers in the text, not as separate fields.

Passages also absorb legs walked, rare cairns read, and curios found.

## Traces

The only thing that ever leaves the device. Six integers.

```ts
interface TracePayload {
  leg_id: number;
  day_index: number;
  hour_bucket: number;   // 0-23
  sign: number;          // 0-11
  lens: number;          // 0-17
  card: number;          // 0-77
}
```

Every field is an enum index. **No free text exists anywhere in this payload**, which is the entire moderation strategy — the database can only ever contain combinations of things we wrote. The reading prose never leaves the device. See `05-SUPABASE.md`.

## Migrations

`AppState` changing shape means bumping `CURRENT_SCHEMA_VERSION` in `persistence.ts` and adding a migration step.

**The Chronicle is irreplaceable to the user.** Everything else can be regenerated; a hundred and forty-one days of their own story cannot. Migrations must preserve it or fail loudly — never silently discard.

Content tables are not migrated; they ship with the binary. But card and lens **ids are persisted inside Chronicle entries**, so ids are permanent once shipped. Rename a card id and you orphan every passage that referenced it. Add, never rename.
