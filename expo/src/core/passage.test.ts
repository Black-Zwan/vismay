import { describe, expect, it } from 'vitest';

import {
  CARD_MARKER,
  LENS_MARKER,
  assemblePassage,
  passageSegments,
} from './passage';

describe('assemblePassage', () => {
  it('fills authored tokens and preserves inline chip positions as markers', () => {
    const result = assemblePassage(
      'On the {day} day, the wanderer came to {place} and asked of {q}.',
      'The deck answered with {card} — "{epi}."',
      {
        day: 1,
        place: 'the Lantern Tree',
        epigraph: 'repair is already underway',
      },
    );

    expect(result.openerText).toBe(
      `On the 1st day, the wanderer came to the Lantern Tree and asked of ${LENS_MARKER}.`,
    );
    expect(result.answerText).toBe(
      `The deck answered with ${CARD_MARKER} — "repair is already underway."`,
    );
  });
});

describe('passageSegments', () => {
  it('turns persisted markers into lens and card segments', () => {
    expect(
      passageSegments(`Asked of ${LENS_MARKER}. Drew ${CARD_MARKER}.`, '♥ LOVE', 'THE STAR'),
    ).toEqual([
      { kind: 'text', text: 'Asked of ' },
      { kind: 'lens', text: '♥ LOVE' },
      { kind: 'text', text: '. Drew ' },
      { kind: 'card', text: 'THE STAR' },
      { kind: 'text', text: '.' },
    ]);
  });
});
