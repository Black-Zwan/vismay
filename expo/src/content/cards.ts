/**
 * Tarot-style cards. Placeholder entries with generic readings per lens.
 * Replace all content freely.
 */

import type { CardEntry } from '@/src/content/types';

export const CARDS: CardEntry[] = [
  {
    id: 'card_one',
    name: 'Card One',
    numeral: 'I',
    accentHex: '#6B8E9B',
    readings: {
      lens_work: 'Placeholder reading for Card One under Work.',
      lens_love: 'Placeholder reading for Card One under Love.',
      lens_self: 'Placeholder reading for Card One under Self.',
    },
  },
  {
    id: 'card_two',
    name: 'Card Two',
    numeral: 'II',
    accentHex: '#9B7B6B',
    readings: {
      lens_work: 'Placeholder reading for Card Two under Work.',
      lens_love: 'Placeholder reading for Card Two under Love.',
      lens_self: 'Placeholder reading for Card Two under Self.',
    },
  },
  {
    id: 'card_three',
    name: 'Card Three',
    numeral: 'III',
    accentHex: '#7B9B6B',
    readings: {
      lens_work: 'Placeholder reading for Card Three under Work.',
      lens_love: 'Placeholder reading for Card Three under Love.',
      lens_self: 'Placeholder reading for Card Three under Self.',
    },
  },
];

export const DECK_SIZE = CARDS.length;

export function getCard(id: string): CardEntry | undefined {
  return CARDS.find((c) => c.id === id);
}

/**
 * Pick a card for a pull using a deterministic seed from dayIndex + waymarkIndex.
 * This keeps the "card you would have drawn" stable if the user backgrounds the app,
 * while still varying across days. Pure function.
 */
export function pickCardForPull(seed: number): CardEntry {
  const idx = Math.abs(seed) % CARDS.length;
  return CARDS[idx];
}
