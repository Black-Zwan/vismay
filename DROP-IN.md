# Drop-in instructions

Unzip / copy this tree over the root of your `vismay` clone. It adds files and overwrites four content files; it touches nothing else.

## What lands where

```
AGENTS.md                          new — agent house rules, read automatically
docs/00 … 08                       new — nine specifications
reference/wonder-v6.jsx            new — the prototype (286 KB)
reference/wonder-sprite-engine.jsx new — sprite QA harness
reference/README.md                new — what the folder is for
expo/src/content/cards.ts          OVERWRITES the 3 placeholder rows
expo/src/content/lenses.ts         OVERWRITES
expo/src/content/waymarks.ts       OVERWRITES
expo/src/content/passages.ts       new
```

`reference/` sits at the repo root, a sibling of `expo/`, so Metro never crawls it.

## Commands

```bash
cd /path/to/vismay
git pull                                   # Rork may have committed since

# copy this tree in, then:
git add AGENTS.md docs reference expo/src/content
git status                                 # confirm nothing unexpected
git commit -m "Add specifications, prototype reference, and migrated content"
git push
```

## It will not compile yet — this is expected

`cards.ts` and `lenses.ts` use two fields the types don't have. Before or immediately after committing, add them in `expo/src/content/types.ts`:

```ts
export interface CardEntry {
  // ...existing
  epigraph: string;              // "what falls was already hollow"
  aspect?: AspectId;             // TODO(owner) — Mirror +1 contribution
}

export interface LensEntry {
  // ...existing
  glyph: string;                 // '♥'
  primaryAspect?: AspectId;      // TODO(owner) — was required, now optional
  secondaryAspect?: AspectId;    // TODO(owner)
}
```

`primaryAspect` and `secondaryAspect` are currently **required** and the migrated lenses don't have them, because that mapping has never been decided. Making them optional is the honest interim; tighten them back to required once you've assigned all five.

## Then check

```bash
cd expo && npx tsc --noEmit && npx expo start
```

The road screen should name real waymarks and the deck should hold six real cards.

## What's still owed to you

Three `TODO(owner)` sets, all decisions only you can make:

1. **Card → aspect.** Six cards, which aspect each contributes +1 to.
2. **Lens → primary (+2) / secondary (+1) aspect.** Five lenses. Worked example from the design doc: Love → Tenderness primary, Sight secondary.
3. **Waymark `arriveText` and two `rareText` lines.** Twelve waymarks; only `departText` exists.

## Note on Rork

Rork syncs the same branch. `reference/` and `docs/` are outside `expo/`, so its build is unaffected — but it will see the files. That's fine and arguably useful.
