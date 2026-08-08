import type { Phase } from '@/src/state/types';

export type JourneyChromeMode = 'travel' | 'ritual';

const RITUAL_PHASES = new Set<Phase>(['question', 'draw', 'reveal', 'reading', 'done', 'walk']);

export function journeyChromeMode(phase: Phase): JourneyChromeMode {
  return RITUAL_PHASES.has(phase) ? 'ritual' : 'travel';
}

export function journeyTabsVisible(phase: Phase): boolean {
  return journeyChromeMode(phase) === 'travel';
}
