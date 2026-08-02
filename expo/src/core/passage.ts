import { ordinal } from './format';

export const LENS_MARKER = '{{Q}}';
export const CARD_MARKER = '{{C}}';

export interface PassageTokens {
  day: number;
  place: string;
  epigraph: string;
}

export interface AssembledPassage {
  openerText: string;
  answerText: string;
}

/** Assemble and mark a Chronicle passage before it is frozen into state. */
export function assemblePassage(
  openerTemplate: string,
  answerTemplate: string,
  tokens: PassageTokens,
): AssembledPassage {
  const openerText = openerTemplate
    .replace('{day}', ordinal(tokens.day))
    .replace('{place}', tokens.place)
    .replace('{q}', LENS_MARKER);
  const answerText = answerTemplate
    .replace('{card}', CARD_MARKER)
    .replace('{epi}', tokens.epigraph);

  return { openerText, answerText };
}

export type PassageSegment =
  | { kind: 'text'; text: string }
  | { kind: 'lens'; text: string }
  | { kind: 'card'; text: string };

/** Expand persisted marker positions into renderable text and chip segments. */
export function passageSegments(
  text: string,
  lensLabel: string,
  cardName: string,
): PassageSegment[] {
  return text
    .split(/(\{\{Q\}\}|\{\{C\}\})/g)
    .filter(Boolean)
    .map((part) => {
      if (part === LENS_MARKER) return { kind: 'lens' as const, text: lensLabel };
      if (part === CARD_MARKER) return { kind: 'card' as const, text: cardName };
      return { kind: 'text' as const, text: part };
    });
}
