/**
 * Shared content type definitions. No platform imports.
 * These describe the shape of the replaceable content tables.
 */

import type { AspectId } from '@/src/state/types';

/** A tarot-style card with per-lens readings. */
export interface CardEntry {
  id: string;
  name: string;
  numeral: string;
  accentHex: string;
  epigraph: string;
  /** TODO(owner): aspect this card contributes to in the Mirror. */
  aspect?: AspectId;
  /** Map of lensId -> reading text. */
  readings: Record<string, string>;
}

/** A topic / lens the user picks before drawing. */
export interface LensEntry {
  id: string;
  label: string;
  glyph: string;
  /** Mirror growth supplied by the owner-authored lens table. */
  primaryAspect?: AspectId;
  secondaryAspect?: AspectId;
}

/** A landmark along the road. */
export interface WaymarkEntry {
  id: string;
  name: string;
  /** Short text shown as the character departs toward the next landmark. */
  departText: string;
}

/** A zodiac sign. */
export interface SignEntry {
  id: string;
  name: string;
  glyph: string;
  dates: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
}

/** Display metadata for an aspect. */
export interface AspectEntry {
  id: AspectId;
  name: string;
  /** Owner-authored titles at the 10 / 26 / 52 thresholds. */
  titles?: readonly [string, string, string];
}

/** A collectible curio unlocked via aspect thresholds. */
export interface CurioEntry {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

/** A playable character. */
export interface CharacterEntry {
  id: string;
  name: string;
  /** Short description shown on the pick screen. */
  blurb: string;
  /** Accent color hex for the character's road presence. */
  accentHex: string;
}
