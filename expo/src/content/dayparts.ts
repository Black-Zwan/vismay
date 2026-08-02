import type { Daypart } from '@/src/core/time';

export interface DaypartPalette {
  label: Daypart;
  sky: [string, string, string];
  orb: [number, number];
  orbC: string;
  stars: number;
}

/** Sky palettes lifted from the reference prototype. */
export const DAYPARTS: Record<Daypart, DaypartPalette> = {
  dawn: {
    label: 'dawn',
    sky: ['#2a2145', '#8a4a5c', '#e8a87a'],
    orb: [0.82, 0.42],
    orbC: '#f2b56a',
    stars: 0.25,
  },
  morning: {
    label: 'morning',
    sky: ['#3a5c8a', '#6a8ab5', '#c8d8e8'],
    orb: [0.74, 0.24],
    orbC: '#ffe9b5',
    stars: 0,
  },
  noon: {
    label: 'noon',
    sky: ['#4a7ab5', '#7aa8d9', '#d8e8f2'],
    orb: [0.5, 0.07],
    orbC: '#fff6d8',
    stars: 0,
  },
  afternoon: {
    label: 'afternoon',
    sky: ['#3d6899', '#8a8ab5', '#e8c89a'],
    orb: [0.3, 0.2],
    orbC: '#ffd98a',
    stars: 0,
  },
  dusk: {
    label: 'dusk',
    sky: ['#2a1a3e', '#6e3a5c', '#e8875a'],
    orb: [0.16, 0.4],
    orbC: '#f2915c',
    stars: 0.35,
  },
  night: {
    label: 'night',
    sky: ['#0c0f24', '#1d2445', '#2e3a66'],
    orb: [0.68, 0.13],
    orbC: '#dfe2f2',
    stars: 1,
  },
};
