/**
 * Chronicle passage templates.
 *
 * A passage is assembled at write time and FROZEN into the ChronicleEntry.
 * Never re-derive a passage from templates on read — a passage the player
 * has already read must never change. See docs/03-DATA-CONTRACTS.md.
 *
 * Tokens: {day} ordinal · {place} waymark name · {q} lens label
 *         {card} card name · {epi} card epigraph
 *
 * Launch target is ~12 of each; these are the prototype set.
 */

export const OPENERS: string[] = [
  'On the {day} day, the wanderer came to {place} and asked of {q}.',
  'The road delivered them to {place} on the {day} day, where they knelt and asked of {q}.',
  'At {place}, beneath a strange sky, the wanderer drew breath and asked of {q}.',
  'The {day} day found them at {place}. The question they carried was one of {q}.',
];

export const ANSWERS: string[] = [
  'The deck answered with {card} — "{epi}."',
  'From the deck rose {card}, whispering that {epi}.',
  '{card} turned its face to them: {epi}.',
  'The card that came was {card}, and its counsel was this — {epi}.',
];
