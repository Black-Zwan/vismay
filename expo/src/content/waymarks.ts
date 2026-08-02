/**
 * Waymarks — the twelve landmarks along the road, in order.
 * Departure lines are authored content. Do not rewrite.
 *
 * TODO(owner): each waymark also wants arriveText and rareText[2]
 * per docs/03-DATA-CONTRACTS.md. Only departText exists so far.
 */

import type { WaymarkEntry } from '@/src/content/types';

export const WAYMARKS: WaymarkEntry[] = [
  {
    id: 'ashen_pines',
    name: 'the Ashen Pines',
    departText: 'The pines thinned behind them, needles gone grey with old smoke.',
  },
  {
    id: 'leaning_shrine',
    name: 'the Leaning Shrine',
    departText: 'They left a coin at the shrine\'s crooked altar, as travelers do.',
  },
  {
    id: 'grey_river_crossing',
    name: 'the Grey River crossing',
    departText: 'The ferryman took no payment, only a long look at the card they carried.',
  },
  {
    id: 'standing_stones',
    name: 'the Standing Stones',
    departText: 'The stones hummed low as they passed, the way stones remember.',
  },
  {
    id: 'lantern_tree',
    name: 'the Lantern Tree',
    departText: 'A hundred small flames swayed in the branches, none of them warm.',
  },
  {
    id: 'high_church',
    name: 'the High Church',
    departText: 'The rose window burned with colors that exist nowhere else. No one sang inside. And yet.',
  },
  {
    id: 'hollow_gate',
    name: 'the Hollow Gate',
    departText: 'The gate stood open. It is always open. That is the unsettling part.',
  },
  {
    id: 'sunken_bell',
    name: 'the Sunken Bell',
    departText: 'They did not ring it. Some bells are buried facing down for a reason.',
  },
  {
    id: 'weeping_willow',
    name: 'the Weeping Willow',
    departText: 'The willow\'s long fronds brushed their shoulder, the way one says goodbye without words.',
  },
  {
    id: 'goblin_camp',
    name: 'the Goblin Camp',
    departText: 'The camp was empty but the fire was warm. Goblins are never far from a warm fire.',
  },
  {
    id: 'old_watchtower',
    name: 'the Old Watchtower',
    departText: 'No one watched from the tower. That is not the same as no one being there.',
  },
  {
    id: 'mushroom_hollow',
    name: 'the Mushroom Hollow',
    departText: 'The spores lit their footprints faintly for a mile after.',
  },
];

export const N_WAYMARKS = WAYMARKS.length;

export function waymarkAt(index: number): WaymarkEntry {
  return WAYMARKS[((index % N_WAYMARKS) + N_WAYMARKS) % N_WAYMARKS];
}

export function getWaymark(id: string): WaymarkEntry | undefined {
  return WAYMARKS.find((w) => w.id === id);
}

export function nextWaymarkIndex(index: number): number {
  return (index + 1) % N_WAYMARKS;
}
