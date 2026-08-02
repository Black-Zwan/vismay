/**
 * Landmarks along the road. Placeholder entries.
 * The character cycles through these; waymarkIndex increments mod length.
 */

import type { WaymarkEntry } from '@/src/content/types';

export const WAYMARKS: WaymarkEntry[] = [
  {
    id: 'waymark_one',
    name: 'First Waymark',
    departText: 'Placeholder departure text for First Waymark.',
  },
  {
    id: 'waymark_two',
    name: 'Second Waymark',
    departText: 'Placeholder departure text for Second Waymark.',
  },
  {
    id: 'waymark_three',
    name: 'Third Waymark',
    departText: 'Placeholder departure text for Third Waymark.',
  },
];

export function getWaymark(id: string): WaymarkEntry | undefined {
  return WAYMARKS.find((w) => w.id === id);
}

/** Index of the current waymark, safely wrapped. */
export function waymarkAt(index: number): WaymarkEntry {
  const i = ((index % WAYMARKS.length) + WAYMARKS.length) % WAYMARKS.length;
  return WAYMARKS[i];
}

/** Index of the next waymark after the given one. */
export function nextWaymarkIndex(index: number): number {
  return (index + 1) % WAYMARKS.length;
}
