/**
 * Cards. Authored content migrated from the prototype (reference/).
 * Voice is canonical — see docs/06-VISUAL-LANGUAGE.md. Do not rewrite.
 *
 * TODO(owner): each card needs `aspect` — the AspectId it contributes +1 to
 * under the Mirror model (docs/02-STATE-MACHINE.md). The prototype predates
 * the Mirror, so this data does not exist and must not be guessed.
 */

import type { CardEntry } from '@/src/content/types';

export const CARDS: CardEntry[] = [
  {
    id: 'the_sun',
    name: 'THE SUN',
    numeral: 'XIX',
    accentHex: '#f2c14e',
    epigraph: 'what is asked plainly is answered plainly',
    // aspect: TODO(owner)
    readings: {
      lens_love: 'What you asked about wants light, not analysis. The Sun says the thing you\'re overthinking is simpler than you\'re letting it be. Say the warm thing today.',
      lens_work: 'Clarity arrives on its own schedule, and today it\'s early. The Sun favors the direct move — the email sent plainly, the ask made out loud.',
      lens_decision: 'The Sun doesn\'t weigh options; it burns off fog. The choice you already know is right will feel obvious by afternoon. Trust the first answer.',
      lens_self: 'You\'ve been rationing your own brightness. The Sun asks what you\'d do today if you assumed it would go well.',
      lens_open: 'A day that rewards showing up undisguised. Whatever finds you in the light is meant to.',
    },
  },
  {
    id: 'the_moon',
    name: 'THE MOON',
    numeral: 'XVIII',
    accentHex: '#9db4e8',
    epigraph: 'trust what is felt, not what is said',
    // aspect: TODO(owner)
    readings: {
      lens_love: 'Something unspoken is doing the talking. The Moon says the mood you\'re sensing is real, but your story about it may not be. Ask instead of assuming.',
      lens_work: 'Not everything on your desk is what it appears to be today. The Moon counsels reading twice before signing once.',
      lens_decision: 'This is not a deciding day; it\'s a listening day. The Moon hides the path on purpose so you\'ll stop and hear what you actually want.',
      lens_self: 'The feeling you can\'t name is still information. Let it stay unnamed a little longer and watch what it does.',
      lens_open: 'Walk carefully and take notes. What confuses you today will explain itself within three days.',
    },
  },
  {
    id: 'the_tower',
    name: 'THE TOWER',
    numeral: 'XVI',
    accentHex: '#d95f6e',
    epigraph: 'what falls was already hollow',
    // aspect: TODO(owner)
    readings: {
      lens_love: 'A structure you\'ve been maintaining out of habit may shake today. The Tower isn\'t cruel — it only takes what was already hollow. Notice what you don\'t miss.',
      lens_work: 'If a plan breaks today, let it break clean. The Tower clears ground faster than you ever would voluntarily, and something truer gets built on it.',
      lens_decision: 'Stop reinforcing the option you\'ve already outgrown. The Tower says the disruption you fear is the answer arriving.',
      lens_self: 'The identity that cracked recently was a scaffold, not the building. You are what\'s still standing.',
      lens_open: 'Expect one jolt. Meet it standing, and by night you\'ll call it a favor.',
    },
  },
  {
    id: 'the_star',
    name: 'THE STAR',
    numeral: 'XVII',
    accentHex: '#7ee8d2',
    epigraph: 'repair is already underway',
    // aspect: TODO(owner)
    readings: {
      lens_love: 'After whatever the last stretch was, this is the quiet after. The Star says repair is already underway — your only job is not to reopen the wound to check on it.',
      lens_work: 'Play the long game today. The Star rewards the unglamorous consistent thing over the dramatic move.',
      lens_decision: 'Choose the option that still sounds good in five years, not five days. The Star sees far and asks you to.',
      lens_self: 'Refill before you pour. Today, rest counts as progress and you\'re allowed to log it that way.',
      lens_open: 'A small good omen crosses your path today. You\'ll know it when you see it. Keep it to yourself.',
    },
  },
  {
    id: 'the_hermit',
    name: 'THE HERMIT',
    numeral: 'IX',
    accentHex: '#e8b46e',
    epigraph: 'the lantern lights one step, and that is enough',
    // aspect: TODO(owner)
    readings: {
      lens_love: 'Solitude today isn\'t distance — it\'s focus. The Hermit says the connection you\'re tending grows best if you also tend yourself. Take the walk alone.',
      lens_work: 'The answer isn\'t in another meeting. The Hermit hands you a lantern and points at deep work. Close the door for one honest hour.',
      lens_decision: 'Nobody else\'s opinion will settle this, and collecting more of them is a stall. The Hermit says you already have the data. Sit with it.',
      lens_self: 'You\'ve been performing okay-ness. Tonight, drop the performance for one hour and see what\'s actually there.',
      lens_open: 'A quiet day by design. What you find in the silence is the whole reading.',
    },
  },
  {
    id: 'wheel_of_fortune',
    name: 'WHEEL OF FORTUNE',
    numeral: 'X',
    accentHex: '#c58ae8',
    epigraph: 'the turn favors open hands',
    // aspect: TODO(owner)
    readings: {
      lens_love: 'The dynamic is turning on its own — you don\'t need to push it. The Wheel says let the next move come to you today, and notice who reaches out.',
      lens_work: 'Luck favors the person already in motion. The Wheel spins for everyone; only some have their hands open when it stops.',
      lens_decision: 'Timing is the hidden variable in your question. The Wheel suggests the choice matters less than choosing this week rather than next month.',
      lens_self: 'The season you\'re in is temporary in both directions. Hold the good loosely and the hard even looser.',
      lens_open: 'Something outside your control shifts in your favor today. Say yes quickly.',
    },
  },
];

export const DEFAULT_CARD_ID = CARDS[0].id;

export function getCard(id: string): CardEntry | undefined {
  return CARDS.find((c) => c.id === id);
}

export function pickCardForPull(): CardEntry {
  return CARDS[Math.floor(Math.random() * CARDS.length)];
}
