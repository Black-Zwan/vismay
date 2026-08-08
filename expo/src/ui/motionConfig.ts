export type MotionPreference = 'full' | 'reduced';

export const motion = {
  rise: 500,
  float: 2_800,
  glowPulse: 2_600,
  modal: 320,
  crossfade: 240,
  revealDelay: 650,
  revealFlip: 900,
} as const;

export function resolveMotionDuration(preference: MotionPreference, duration: number): number {
  return preference === 'reduced' ? 0 : duration;
}
